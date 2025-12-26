
export interface InventoryItem {
  id: string;
  name: string;
  batchID: string;
  stockLevel: number;
  criticalThreshold: number;
  expiryDate: string;
  costPerUnit: number;
  location: 'Central Pharmacy' | 'Ward Floor' | 'Emergency Depot';
  lastUsedDate: string;
  category: 'Tablet' | 'Vial' | 'Syringe' | 'Infusion';
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  performanceRating: number;
}

export interface PurchaseOrder {
  id: string;
  itemName: string;
  quantity: number;
  vendorName: string;
  status: 'Awaiting Authorization' | 'Authorized' | 'Pending' | 'Received' | 'Cancelled';
  orderDate: string;
  cost: number;
  priority: 'High' | 'Medium' | 'Low';
  requestedBy: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Nurse' | 'Pharmacist' | 'Admin' | 'Receptionist';
  shift: 'Day' | 'Night' | 'Evening';
  status: 'On Duty' | 'Off Duty';
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  status: 'On Leave' | 'On Duty' | 'In Surgery';
  patientLoad: number;
}

export interface MedicationLog {
  medicineName: string;
  quantity: number;
  timestamp: string;
  administeredBy: string;
}

export interface MedicationRequest {
  id: string;
  patientId: string;
  patientName: string;
  items: {
    medicineId: string;
    medicineName: string;
    quantity: number;
  }[];
  requestedAt: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED' | 'FLAGGED' | 'EMERGENCY_STOCKOUT';
  isOverride?: boolean;
}

export interface BillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Bill {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  date: string;
  items: BillItem[];
  subtotal: number;
  gst: number;
  grandTotal: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  assignedDoctorID: string;
  diagnosis: string;
  bedNumber: string;
  medicationHistory: MedicationLog[];
}

export type UserRole = 'ADMIN' | 'PHARMACIST' | 'RECEPTIONIST' | 'GUEST';

export interface AppState {
  inventory: InventoryItem[];
  patients: Patient[];
  doctors: Doctor[];
  staff: StaffMember[];
  vendors: Vendor[];
  orders: PurchaseOrder[];
  requests: MedicationRequest[];
  bills: Bill[];
  role: UserRole;
  accessLogs: { user: string; time: string; action: string }[];
}
