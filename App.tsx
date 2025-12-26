
import React, { useState, useEffect } from 'react';
import { INITIAL_INVENTORY, INITIAL_DOCTORS, INITIAL_PATIENTS, INITIAL_STAFF, INITIAL_VENDORS, INITIAL_ORDERS, INITIAL_BILLS, INITIAL_REQUESTS } from './constants';
import { AppState, UserRole, Patient, MedicationRequest, PurchaseOrder, Bill, InventoryItem, StaffMember, Doctor, Vendor } from './types';
import AdminPanel from './components/AdminPanel';
import PharmacistPanel from './components/PharmacistPanel';
import ReceptionistPanel from './components/ReceptionistPanel';
import Toast from './components/Toast';
import { processVoiceCommand } from './services/geminiService';

const App = () => {
  const [state, setState] = useState<AppState>({
    inventory: INITIAL_INVENTORY,
    doctors: INITIAL_DOCTORS,
    patients: INITIAL_PATIENTS,
    staff: INITIAL_STAFF,
    vendors: INITIAL_VENDORS,
    orders: INITIAL_ORDERS,
    requests: INITIAL_REQUESTS,
    bills: INITIAL_BILLS,
    role: 'GUEST',
    accessLogs: [{ user: 'System', time: new Date().toLocaleTimeString(), action: 'AI Engine Initialized' }]
  });

  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success'|'error'|'warning'}[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceResp, setVoiceResp] = useState('');

  const addToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleVoiceAssistant = async () => {
    setIsVoiceActive(true);
    setVoiceResp("Synthesizing node telemetry...");
    const cmd = "Check inventory health.";
    addToast(`Voice Input: "${cmd}"`, "warning");
    const context = `Role: ${state.role}, Patients: ${state.patients.length}, Inventory: ${state.inventory.length}`;
    const resp = await processVoiceCommand(cmd, context);
    setVoiceResp(resp);
    setTimeout(() => {
      setIsVoiceActive(false);
      setVoiceResp("");
    }, 5000);
  };

  const handleAddMedicine = (newItem: Omit<InventoryItem, 'id' | 'lastUsedDate'>) => {
    setState(s => {
      const item: InventoryItem = { ...newItem, id: `M${s.inventory.length + 1}`, lastUsedDate: 'Just Added' };
      addToast(`Resource Added: ${item.name}`, "success");
      return { ...s, inventory: [...s.inventory, item] };
    });
  };

  const handleAddStaff = (newStaff: Omit<StaffMember, 'id'>) => {
    setState(s => {
      const staffMember: StaffMember = { ...newStaff, id: `S${s.staff.length + 1}` };
      addToast(`Staff Added: ${staffMember.name}`, "success");
      return { ...s, staff: [...s.staff, staffMember] };
    });
  };

  const handleAddDoctor = (newDoc: Omit<Doctor, 'id' | 'patientLoad'>) => {
    setState(s => {
      const doctor: Doctor = { ...newDoc, id: `D${s.doctors.length + 1}`, patientLoad: 0 };
      addToast(`Specialist Registered: ${doctor.name}`, "success");
      return { ...s, doctors: [...s.doctors, doctor] };
    });
  };

  const handleAddVendor = (newVendor: Omit<Vendor, 'id'>) => {
    setState(s => {
      const vendor: Vendor = { ...newVendor, id: `V${s.vendors.length + 1}` };
      addToast(`Partner Integrated: ${vendor.name}`, "success");
      return { ...s, vendors: [...s.vendors, vendor] };
    });
  };

  const handleCompleteRequest = (reqId: string, generatedBill: Bill | null, isEmergencyStockout: boolean) => {
    setState(s => {
      const req = s.requests.find(r => r.id === reqId);
      if (!req) return s;

      if (isEmergencyStockout) {
        addToast(`Critical Stockout Flagged for ${req.patientName}`, "error");
        return {
          ...s,
          requests: s.requests.map(r => r.id === reqId ? { ...r, status: 'EMERGENCY_STOCKOUT' } : r)
        };
      }

      const newInventory = s.inventory.map(inv => {
        const reqItem = req.items.find(ri => ri.medicineId === inv.id);
        if (reqItem) return { ...inv, stockLevel: inv.stockLevel - reqItem.quantity, lastUsedDate: new Date().toISOString() };
        return inv;
      });

      const newBills = generatedBill ? [generatedBill, ...s.bills] : s.bills;
      addToast(`Verified & Fulfilled: ${req.patientName}`, "success");
      
      return {
        ...s,
        inventory: newInventory,
        bills: newBills,
        requests: s.requests.map(r => r.id === reqId ? { ...r, status: 'COMPLETED' } : r)
      };
    });
  };

  const handleRequestPurchaseOrder = (itemName: string, quantity: number, vendorName: string, priority: 'High' | 'Medium' | 'Low', cost: number) => {
    setState(s => {
      const newOrder: PurchaseOrder = {
        id: `PO-${Date.now().toString().slice(-4)}`,
        itemName,
        quantity,
        vendorName,
        status: 'Awaiting Authorization',
        orderDate: new Date().toISOString().split('T')[0],
        cost,
        priority,
        requestedBy: 'Pharmacy Terminal'
      };
      addToast(`PO Request Sent to Admin: ${itemName}`, "warning");
      return { ...s, orders: [newOrder, ...s.orders] };
    });
  };

  const handleAuthorizeOrder = (orderId: string, action: 'authorize' | 'cancel') => {
    setState(s => {
      const newStatus = action === 'authorize' ? 'Authorized' : 'Cancelled';
      addToast(`Order ${newStatus}`, action === 'authorize' ? "success" : "error");
      return { ...s, orders: s.orders.map(o => o.id === orderId ? { ...o, status: action === 'authorize' ? 'Authorized' : 'Cancelled' } : o) };
    });
  };

  const handleDeleteBill = (billId: string) => {
    setState(s => {
      addToast(`Bill ${billId} removed from registry`, "warning");
      return { ...s, bills: s.bills.filter(b => b.id !== billId) };
    });
  };

  const handleAddPatient = (newPatient: Omit<Patient, 'id' | 'medicationHistory'>) => {
    setState(s => {
      const patient: Patient = { ...newPatient, id: `P${s.patients.length + 1}`, medicationHistory: [] };
      addToast(`Patient Intaked: ${patient.name}`, "success");
      return { ...s, patients: [...s.patients, patient] };
    });
  };

  const handleCreateRequest = (patientId: string, patientName: string, items: any[]) => {
    setState(s => {
      const req: MedicationRequest = { id: `REQ-${Date.now().toString().slice(-4)}`, patientId, patientName, items, requestedAt: new Date().toISOString(), status: 'PENDING' };
      addToast(`Request Sent to Pharmacy`, "warning");
      return { ...s, requests: [req, ...s.requests] };
    });
  };

  const LoginGateway = () => (
    <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
      {/* LEFT SIDE: Information & Branding */}
      <div className="md:w-1/2 bg-slate-950 p-16 relative flex flex-col justify-between overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 space-y-12">
          <header className="space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-900/40">
              <i className="fas fa-microchip text-white text-3xl"></i>
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight leading-tight">MedChain <span className="text-indigo-400">Pro</span></h1>
              <p className="text-slate-500 text-[12px] font-black uppercase tracking-[0.4em] mt-3">Integrated Neural Hub v4.2</p>
            </div>
          </header>

          <div className="space-y-10">
            <div className="space-y-4 max-w-md">
              <h2 className="text-2xl font-bold text-indigo-300">The Pulse of Clinical Efficiency</h2>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                Experience a high-fidelity hospital administration system. Seamlessly track critical inventory, manage complex patient trajectories, and optimize supply chain procurement with AI-driven insights.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {[
                { icon: 'fa-shield-halved', title: 'End-to-End Security', desc: 'Secure medical node authorization and TLS-encrypted clinical data flow.' },
                { icon: 'fa-brain', title: 'AI-Powered Insights', desc: 'Predictive inventory forecasting and real-time medical protocol suggestions.' },
                { icon: 'fa-network-wired', title: 'Unified Operations', desc: 'Synchronized communication between Pharmacy, Admin, and Front Desk.' }
              ].map((feature, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <i className={`fas ${feature.icon} text-indigo-400 text-xl`}></i>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-sm uppercase tracking-wide">{feature.title}</h4>
                    <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">System Status: Operational</p>
          <div className="flex gap-4">
            <i className="fab fa-github text-slate-700 hover:text-white transition-colors cursor-pointer"></i>
            <i className="fas fa-globe text-slate-700 hover:text-white transition-colors cursor-pointer"></i>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Access */}
      <div className="md:w-1/2 flex items-center justify-center p-12 bg-slate-50">
        <div className="w-full max-w-[440px] space-y-12">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Terminal</h2>
            <p className="text-slate-400 text-sm font-medium mt-2">Select your authorized node to proceed</p>
          </div>

          <div className="space-y-5">
            <button 
              onClick={() => setState(s => ({...s, role: 'ADMIN'}))} 
              className="w-full group bg-slate-900 text-white p-8 rounded-[2.5rem] flex items-center hover:bg-black transition-all duration-300 shadow-2xl shadow-slate-200 active:scale-[0.98]"
            >
              <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-500">
                <i className="fas fa-fingerprint text-indigo-400 text-2xl group-hover:text-white"></i>
              </div>
              <div className="text-left ml-6">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-400">Level 01 Access</span>
                <span className="text-xl font-black tracking-tight">Executive Command</span>
              </div>
              <i className="fas fa-chevron-right ml-auto text-slate-700 group-hover:text-white transition-colors"></i>
            </button>

            <div className="grid grid-cols-2 gap-5">
              <button 
                onClick={() => setState(s => ({...s, role: 'PHARMACIST'}))} 
                className="bg-white border border-slate-100 p-8 rounded-[2.5rem] flex flex-col items-center hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 group active:scale-[0.96]"
              >
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <i className="fas fa-pills text-indigo-600 text-2xl group-hover:text-white"></i>
                </div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">Pharmacy</span>
              </button>

              <button 
                onClick={() => setState(s => ({...s, role: 'RECEPTIONIST'}))} 
                className="bg-white border border-slate-100 p-8 rounded-[2.5rem] flex flex-col items-center hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 group active:scale-[0.96]"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <i className="fas fa-hospital-user text-blue-600 text-2xl group-hover:text-white"></i>
                </div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">Front Desk</span>
              </button>
            </div>
          </div>

          <div className="pt-10 flex items-center gap-6 justify-center md:justify-start">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Link: Active</span>
            </div>
            <div className="w-px h-4 bg-slate-200"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">v4.2 PRO EDITION</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
      {state.role === 'GUEST' ? <LoginGateway /> : (
        <div className="min-h-screen flex flex-col bg-white">
          <nav className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-40 flex justify-between items-center">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setState(s => ({...s, role: 'GUEST'}))}>
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><i className="fas fa-microchip text-xs"></i></div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">MedChain <span className="text-indigo-600">PRO</span></span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="px-4 py-1.5 bg-indigo-50 rounded-full text-[10px] font-bold uppercase tracking-widest text-indigo-600">{state.role} NODE ACTIVE</span>
              <button onClick={() => setState(s => ({...s, role: 'GUEST'}))} className="text-gray-300 hover:text-red-500 transition-colors"><i className="fas fa-power-off"></i></button>
            </div>
          </nav>
          
          <main className="flex-grow">
            {state.role === 'ADMIN' && (
              <AdminPanel 
                state={state} 
                onAuthorizeOrder={handleAuthorizeOrder} 
                onAddMedicine={handleAddMedicine} 
                onAddStaff={handleAddStaff} 
                onAddDoctor={handleAddDoctor} 
                onAddVendor={handleAddVendor} 
              />
            )}
            {state.role === 'PHARMACIST' && (
              <PharmacistPanel 
                state={state} 
                onComplete={handleCompleteRequest} 
                onRequestOrder={handleRequestPurchaseOrder} 
                onDeleteBill={handleDeleteBill} 
              />
            )}
            {state.role === 'RECEPTIONIST' && (
              <ReceptionistPanel 
                state={state} 
                onAdd={handleAddPatient} 
                onCreate={handleCreateRequest} 
              />
            )}
          </main>

          <div className="fixed bottom-8 left-8 z-50 flex items-center gap-4">
             <button onClick={handleVoiceAssistant} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-300 active:scale-90 ${isVoiceActive ? 'bg-rose-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                <i className={`fas ${isVoiceActive ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
             </button>
             {isVoiceActive && (
               <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-xl animate-in slide-in-from-left-4 max-w-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mb-1">Voice Assistant Active</p>
                  <p className="text-sm font-semibold text-gray-800">{voiceResp || "Processing..."}</p>
               </div>
             )}
          </div>
        </div>
      )}
    </>
  );
};

export default App;
