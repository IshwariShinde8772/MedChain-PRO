
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Patient, Bill } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateBillReceipt(patient: Patient, doctorName: string, items: {medicineName: string, quantity: number, unitPrice: number}[]) {
  const prompt = `
    Generate a professional hospital bill for patient ${patient.name} (ID: ${patient.id}).
    The doctor is ${doctorName}.
    The date is ${new Date().toLocaleDateString()}.
    Items prescribed: ${items.map(i => `${i.medicineName} (Qty: ${i.quantity}, Price: ${i.unitPrice})`).join(', ')}.
    Calculate the total in Indian Rupees (₹), add 18% GST, and return a structured JSON bill. 
    Ensure the ID is unique (e.g., INV-XXXXX).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bill: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                patientId: { type: Type.STRING },
                patientName: { type: Type.STRING },
                doctorName: { type: Type.STRING },
                date: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unitPrice: { type: Type.NUMBER },
                      total: { type: Type.NUMBER }
                    }
                  }
                },
                subtotal: { type: Type.NUMBER },
                gst: { type: Type.NUMBER },
                grandTotal: { type: Type.NUMBER }
              },
              required: ["id", "patientName", "items", "subtotal", "gst", "grandTotal"]
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result.bill as Bill;
  } catch (error) {
    console.error("Billing AI Error:", error);
    return null;
  }
}

export async function getMedicationSuggestions(diagnosis: string, history: string) {
  const prompt = `
    DIAGNOSIS: "${diagnosis}"
    PATIENT HISTORY: "${history}"
    
    As a clinical pharmacologist, provide a SYSTEMATIC medication protocol. 
    Categorize suggestions into:
    1. "First-line Treatment" (Standard of care)
    2. "Alternative/Secondary" (If first-line is not tolerated)
    3. "Supportive/Complication Management" (Addressing secondary symptoms of the diagnosis)

    STRICT RULE: Only suggest medications standard for "${diagnosis}". 
    Example: If diagnosis is "Diabetes", provide Insulin, Metformin, etc. DO NOT provide random pain killers or antibiotics unless they are part of a diabetic foot infection protocol.
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a Senior Medical Officer. Provide highly systematic, evidence-based medication protocols categorized by clinical priority.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Generic name and standard starting dose" },
              category: { type: Type.STRING, description: "First-line, Secondary, or Supportive" },
              reason: { type: Type.STRING, description: "Systematic clinical justification" }
            },
            required: ["name", "category", "reason"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Clinical AI Error:", e);
    return [];
  }
}

export async function processVoiceCommand(command: string, context: string) {
  const prompt = `Hospital Voice Assistant. Context: ${context}. User Command: "${command}". Summarize accurately or describe update needed. 15 words max.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Protocol misinterpreted.";
  } catch (e) {
    return "Voice node error.";
  }
}

export async function askAdminQuery(query: string, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context: ${context}\n\nQuery: ${query}`,
      config: {
        systemInstruction: "You are an AI Hospital Operations Executive. Provide systematic and data-driven answers."
      }
    });
    return response.text || "Unable to retrieve node intelligence.";
  } catch (error) {
    return "Clinical intelligence connection error.";
  }
}
