
import { InventoryItem, Doctor, Patient, StaffMember, Vendor, PurchaseOrder, Bill, MedicationRequest } from './types';

// Assuming current date for logic is around 2024-03-22
export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Insulin Glargine', batchID: 'BT-001', stockLevel: 15, criticalThreshold: 50, expiryDate: '2024-12-15', costPerUnit: 1250.00, location: 'Central Pharmacy', lastUsedDate: '2024-03-20', category: 'Vial' },
  { id: '2', name: 'Paracetamol 500mg', batchID: 'BT-002', stockLevel: 500, criticalThreshold: 100, expiryDate: '2025-12-01', costPerUnit: 5.50, location: 'Ward Floor', lastUsedDate: '2024-03-21', category: 'Tablet' },
  { id: '3', name: 'Amoxicillin 250mg', batchID: 'BT-003', stockLevel: 25, criticalThreshold: 40, expiryDate: '2024-03-25', costPerUnit: 45.00, location: 'Central Pharmacy', lastUsedDate: '2024-03-15', category: 'Tablet' }, 
  { id: '4', name: 'Morphine Sulfate', batchID: 'BT-013', stockLevel: 12, criticalThreshold: 10, expiryDate: '2024-04-15', costPerUnit: 850.00, location: 'Emergency Depot', lastUsedDate: '2023-10-01', category: 'Infusion' },
  { id: '5', name: 'Salbutamol Inhaler', batchID: 'BT-005', stockLevel: 4, criticalThreshold: 20, expiryDate: '2024-08-25', costPerUnit: 320.00, location: 'Central Pharmacy', lastUsedDate: '2024-03-10', category: 'Infusion' },
  { id: '6', name: 'Adrenaline 1:1000', batchID: 'BT-099', stockLevel: 80, criticalThreshold: 20, expiryDate: '2025-01-01', costPerUnit: 150.00, location: 'Emergency Depot', lastUsedDate: '2024-02-01', category: 'Vial' },
  { id: '7', name: 'Diazepam 5mg', batchID: 'BT-104', stockLevel: 120, criticalThreshold: 50, expiryDate: '2025-08-20', costPerUnit: 12.00, location: 'Central Pharmacy', lastUsedDate: '2024-03-10', category: 'Tablet' },
  { id: '8', name: 'Heparin Sodium', batchID: 'BT-202', stockLevel: 30, criticalThreshold: 25, expiryDate: '2024-11-15', costPerUnit: 2100.00, location: 'Emergency Depot', lastUsedDate: '2024-03-01', category: 'Vial' },
];

export const INITIAL_STAFF: StaffMember[] = [
  { id: 'S1', name: 'Alice Wong', role: 'Nurse', shift: 'Day', status: 'On Duty' },
  { id: 'S2', name: 'Robert Vance', role: 'Pharmacist', shift: 'Day', status: 'On Duty' },
  { id: 'S3', name: 'Clara Oswald', role: 'Receptionist', shift: 'Evening', status: 'On Duty' },
  { id: 'S4', name: 'Marcus Aurelius', role: 'Admin', shift: 'Day', status: 'On Duty' },
  { id: 'S5', name: 'Sarah Connor', role: 'Nurse', shift: 'Night', status: 'On Duty' },
  { id: 'S6', name: 'James Holden', role: 'Pharmacist', shift: 'Evening', status: 'Off Duty' },
  { id: 'S7', name: 'Ellen Ripley', role: 'Nurse', shift: 'Day', status: 'On Duty' },
  { id: 'S8', name: 'Arthur Curry', role: 'Receptionist', shift: 'Night', status: 'Off Duty' },
];

export const INITIAL_VENDORS: Vendor[] = [
  { id: 'V1', name: 'Apex Pharma India', contact: '+91-9876543210', performanceRating: 4.8 },
  { id: 'V2', name: 'Global Bio-Med Supplies', contact: '+91-8888877777', performanceRating: 4.2 },
  { id: 'V3', name: 'Nexus Clinical Logistics', contact: '+91-7766554433', performanceRating: 4.5 },
];

export const INITIAL_ORDERS: PurchaseOrder[] = [
  { id: 'PO-900', itemName: 'Insulin Glargine', quantity: 200, vendorName: 'Apex Pharma India', status: 'Pending', orderDate: '2024-03-18', cost: 250000, priority: 'High', requestedBy: 'System' },
];

export const INITIAL_DOCTORS: Doctor[] = [
  { id: 'D1', name: 'Dr. Sarah Jenkins', specialization: 'Endocrinology', status: 'On Duty', patientLoad: 3 },
  { id: 'D2', name: 'Dr. Michael Chen', specialization: 'Cardiology', status: 'In Surgery', patientLoad: 5 },
  { id: 'D3', name: 'Dr. Elena Rodriguez', specialization: 'Pediatrics', status: 'On Leave', patientLoad: 2 },
  { id: 'D4', name: 'Dr. Gregory House', specialization: 'Diagnostics', status: 'On Duty', patientLoad: 1 },
  { id: 'D5', name: 'Dr. James Wilson', specialization: 'Oncology', status: 'On Duty', patientLoad: 4 },
];

export const INITIAL_PATIENTS: Patient[] = [
  { id: 'P1', name: 'John Doe', age: 45, assignedDoctorID: 'D1', diagnosis: 'Type 2 Diabetes', bedNumber: '101-A', medicationHistory: [{ medicineName: 'Metformin', quantity: 1, timestamp: '2024-03-21T08:00:00Z', administeredBy: 'Nurse Alice' }] },
  { id: 'P2', name: 'Jane Smith', age: 62, assignedDoctorID: 'D2', diagnosis: 'Hypertension', bedNumber: '204-B', medicationHistory: [] },
  { id: 'P3', name: 'Arthur Dent', age: 42, assignedDoctorID: 'D4', diagnosis: 'Space Sickness', bedNumber: '420-Z', medicationHistory: [] },
  { id: 'P4', name: 'Eleanor Rigby', age: 78, assignedDoctorID: 'D5', diagnosis: 'Osteoarthritis', bedNumber: '305-C', medicationHistory: [] },
  { id: 'P5', name: 'Burt Macklin', age: 34, assignedDoctorID: 'D2', diagnosis: 'Cardiac Arrhythmia', bedNumber: 'ICU-01', medicationHistory: [] },
  { id: 'P6', name: 'Leslie Knope', age: 40, assignedDoctorID: 'D1', diagnosis: 'Metabolic Syndrome', bedNumber: '202-A', medicationHistory: [] },
];

export const INITIAL_BILLS: Bill[] = [
  { id: 'BILL-001', patientId: 'P1', patientName: 'John Doe', doctorName: 'Dr. Sarah Jenkins', date: '2024-03-20', items: [{ name: 'Insulin', quantity: 1, unitPrice: 1250, total: 1250 }], subtotal: 1250, gst: 225, grandTotal: 1475 },
  { id: 'BILL-002', patientId: 'P2', patientName: 'Jane Smith', doctorName: 'Dr. Michael Chen', date: '2024-03-19', items: [{ name: 'Aspirin', quantity: 2, unitPrice: 10, total: 20 }], subtotal: 20, gst: 3.6, grandTotal: 23.6 },
];

export const INITIAL_REQUESTS: MedicationRequest[] = [
  { id: 'REQ-FLAG-01', patientId: 'P1', patientName: 'John Doe', items: [{ medicineId: '1', medicineName: 'Insulin', quantity: 50 }], requestedAt: '2024-03-22T09:00:00Z', status: 'FLAGGED', isOverride: true },
];
