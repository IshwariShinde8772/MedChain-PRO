
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
  const prompt = `As a clinical AI assistant for doctors, suggest 2-3 standard medications or protocols for diagnosis: "${diagnosis}". 
  History context: ${history}. 
  ASSISTIVE ONLY. Return only a JSON array of strings (e.g., ["Metformin 500mg BID", "Dietary review"]). 
  Keep suggestions medically standard.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

export async function getInventoryForecast(inventory: InventoryItem[]) {
  const context = inventory.map(i => `${i.name}: Stock ${i.stockLevel}, Threshold ${i.criticalThreshold}`).join("; ");
  const prompt = `Based on hospital stock levels: ${context}. 
  Predict days until depletion and recommend restock quantities. 
  Return a JSON array of objects: { name: string, daysLeft: number, recommendation: string }. 
  Focus on low-stock items.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              daysLeft: { type: Type.NUMBER },
              recommendation: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

export async function processVoiceCommand(command: string, context: string) {
  const prompt = `Hospital Voice Assistant (Clinical Ward). Context: ${context}.
  User Command: "${command}". 
  Interpret the command. If data request, summarize accurately. If action request, describe the node update required.
  Be extremely concise (max 15 words). Speak as a professional clinical AI.`;
  
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
      model: 'gemini-3-flash-preview',
      contents: `Context: ${context}\n\nQuery: ${query}\n\nAlways use Indian Rupee (₹) for values.`,
      config: {
        systemInstruction: "You are an AI Hospital Operations Executive."
      }
    });
    return response.text || "Unable to retrieve node intelligence.";
  } catch (error) {
    return "Clinical intelligence connection error.";
  }
}
