
import React, { useState, useMemo } from 'react';
import { AppState, InventoryItem, Bill, MedicationRequest } from '../types';
import { generateBillReceipt } from '../services/geminiService';

const PharmacistPanel = ({ 
  state, 
  onComplete, 
  onRequestOrder,
  onDeleteBill
}: { 
  state: AppState, 
  onComplete: (id: string, generatedBill: Bill | null, isEmergencyStockout: boolean) => void,
  onRequestOrder: (item: string, qty: number, vendor: string, priority: 'High' | 'Medium' | 'Low', cost: number) => void,
  onDeleteBill: (id: string) => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [billSearchTerm, setBillSearchTerm] = useState('');
  const [billFilter, setBillFilter] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [isBilling, setIsBilling] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPOModal, setIsPOModal] = useState<InventoryItem | null>(null);
  
  // PO Form state
  const [poQty, setPoQty] = useState(100);
  const [poVendor, setPoVendor] = useState(state.vendors[0]?.name || '');
  const [poPriority, setPoPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const filteredInventory = useMemo(() => {
    return state.inventory.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.inventory, searchTerm]);

  // Enhanced Bill Filtering for Monthly/Weekly/Yearly management
  const filteredBills = useMemo(() => {
    const now = new Date();
    return state.bills.filter(b => {
      const bDate = new Date(b.date);
      const matchesSearch = b.patientName.toLowerCase().includes(billSearchTerm.toLowerCase()) || 
                           b.id.toLowerCase().includes(billSearchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      if (billFilter === 'all') return true;

      const diffInDays = (now.getTime() - bDate.getTime()) / (1000 * 3600 * 24);
      if (billFilter === 'weekly') return diffInDays <= 7;
      if (billFilter === 'monthly') return diffInDays <= 30;
      if (billFilter === 'yearly') return diffInDays <= 365;
      return true;
    });
  }, [state.bills, billSearchTerm, billFilter]);

  // Comparison Feature: Required vs Available (The Gap Analysis)
  const stockGapData = useMemo(() => {
    const pendingReqs = state.requests.filter(r => r.status === 'PENDING');
    const requirements: Record<string, { name: string, needed: number, available: number, id: string }> = {};

    pendingReqs.forEach(req => {
      req.items.forEach(ri => {
        if (!requirements[ri.medicineId]) {
          const inv = state.inventory.find(i => i.id === ri.medicineId);
          requirements[ri.medicineId] = {
            id: ri.medicineId,
            name: ri.medicineName,
            needed: 0,
            available: inv ? inv.stockLevel : 0
          };
        }
        requirements[ri.medicineId].needed += ri.quantity;
      });
    });

    return Object.values(requirements).sort((a, b) => (b.needed - b.available) - (a.needed - a.available));
  }, [state.requests, state.inventory]);

  const handleFulfillRequest = async (reqId: string) => {
    const req = state.requests.find(r => r.id === reqId);
    if (!req) return;

    let isEmergency = false;
    const itemsForBill: any[] = [];
    
    req.items.forEach(ri => {
      const inv = state.inventory.find(i => i.id === ri.medicineId);
      if (!inv || inv.stockLevel < ri.quantity) {
        isEmergency = true;
      } else {
        itemsForBill.push({ medicineName: ri.medicineName, quantity: ri.quantity, unitPrice: inv.costPerUnit });
      }
    });

    if (isEmergency) {
      onComplete(reqId, null, true);
      return;
    }

    setIsBilling(true);
    const patient = state.patients.find(p => p.id === req.patientId);
    const doctor = state.doctors.find(d => d.id === patient?.assignedDoctorID);
    
    if (req && patient) {
      const bill = await generateBillReceipt(patient, doctor?.name || "Clinical Lead", itemsForBill);
      onComplete(reqId, bill, false);
    }
    setIsBilling(false);
  };

  const submitPO = () => {
    if (!isPOModal) return;
    const costEstimate = isPOModal.costPerUnit * poQty;
    onRequestOrder(isPOModal.name, poQty, poVendor, poPriority, costEstimate);
    setIsPOModal(null);
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in bg-white font-sans">
      {/* Header with Inventory Search */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Pharmacy <span className="text-indigo-600">Operations</span></h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Clinical Fulfillment & Settlelog System</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-indigo-500"></i>
          <input 
            type="text" 
            placeholder="Search depot inventory SKUs..." 
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold placeholder:text-slate-300" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </header>

      {/* EMERGENCY RED ZONE: Clinical Stock Alert Hub */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
          <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Clinical Alert Hub: Stock Gap Analysis</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stockGapData.map((gap, i) => {
            const isDeficit = gap.needed > gap.available;
            return (
              <div key={i} className={`p-6 rounded-[2rem] border transition-all duration-300 ${isDeficit ? 'bg-rose-600 text-white border-rose-700 shadow-xl shadow-rose-100 scale-[1.02]' : 'bg-white text-slate-900 border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                  <i className={`fas ${isDeficit ? 'fa-triangle-exclamation animate-bounce' : 'fa-circle-check text-emerald-500'} text-xl`}></i>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${isDeficit ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                    {isDeficit ? 'Deficit' : 'Optimal'}
                  </span>
                </div>
                <h4 className="font-black text-lg truncate mb-1">{gap.name}</h4>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-80">
                    <span>Clinical Need</span>
                    <span>{gap.needed} U</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-80">
                    <span>Live Stock</span>
                    <span>{gap.available} U</span>
                  </div>
                  {isDeficit && (
                    <div className="pt-4 border-t border-white/20 mt-4 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase">Shortage</span>
                      <span className="text-xl font-black">{gap.needed - gap.available}</span>
                    </div>
                  )}
                </div>
                {isDeficit && (
                  <button 
                    onClick={() => {
                      const inv = state.inventory.find(invItem => invItem.id === gap.id);
                      if (inv) setIsPOModal(inv);
                    }}
                    className="w-full mt-6 py-3 bg-white text-rose-600 rounded-2xl text-[10px] font-black uppercase hover:bg-rose-50 transition-colors shadow-lg"
                  >
                    Resolve Crisis
                  </button>
                )}
              </div>
            );
          })}
          {stockGapData.length === 0 && (
             <div className="col-span-full py-12 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                   <i className="fas fa-check-double text-xl"></i>
                </div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Depot Equilibrium: No active stock deficits detected</p>
             </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Fulfillment Column */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Incoming Prescription Requests */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-file-prescription text-indigo-500"></i> Active Fulfillment Queue
            </h3>
            <div className="grid gap-6">
              {state.requests.filter(r => r.status === 'PENDING').map(req => {
                const isLowStock = req.items.some(ri => {
                  const inv = state.inventory.find(i => i.id === ri.medicineId);
                  return !inv || inv.stockLevel < ri.quantity;
                });

                return (
                  <div key={req.id} className={`p-8 bg-white border rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between transition-all ${isLowStock ? 'border-rose-100 bg-rose-50/20' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100'}`}>
                    <div className="flex-grow w-full mb-6 md:mb-0">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isLowStock ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'}`}>
                          {isLowStock ? 'Emergency Stockout Alert' : 'Verification Pending'}
                        </span>
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{new Date(req.requestedAt).toLocaleTimeString()}</span>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight">{req.patientName}</h4>
                      <div className="flex flex-wrap gap-2 mt-6">
                        {req.items.map((ri, idx) => {
                          const inv = state.inventory.find(i => i.id === ri.medicineId);
                          const hasStock = inv && inv.stockLevel >= ri.quantity;
                          return (
                            <span key={idx} className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase border transition-colors ${hasStock ? 'bg-slate-50 text-slate-500 border-slate-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {ri.medicineName} <span className="opacity-50 mx-1">/</span> {ri.quantity} U
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleFulfillRequest(req.id)} 
                      disabled={isBilling} 
                      className={`w-full md:w-auto font-black px-10 py-5 rounded-[2rem] text-[10px] uppercase tracking-widest transition-all shadow-2xl ${isLowStock ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                    >
                      {isBilling ? 'Finalizing...' : (isLowStock ? 'Escalate to Admin' : 'Fulfill & Generate Bill')}
                    </button>
                  </div>
                );
              })}
              {state.requests.filter(r => r.status === 'PENDING').length === 0 && (
                <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                   <i className="fas fa-inbox text-slate-200 text-4xl mb-4"></i>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Clinical Requisition Queue is Empty</p>
                </div>
              )}
            </div>
          </div>

          {/* Depot Inventory Selection */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <i className="fas fa-boxes-stacked text-indigo-500"></i> Depot Inventory Registry
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInventory.map(i => (
                <div key={i.id} className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-sm flex justify-between items-center group hover:border-indigo-400 transition-all">
                   <div>
                     <p className="font-black text-slate-800 text-sm">{i.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {i.stockLevel} units <span className="opacity-30 mx-1">•</span> {i.location}
                     </p>
                   </div>
                   <button onClick={() => setIsPOModal(i)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${i.stockLevel < i.criticalThreshold ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                      <i className="fas fa-cart-plus text-xs"></i>
                   </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Settlelog Sidebar: Monthly/Weekly/Yearly Management */}
        <aside className="lg:col-span-4 bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col h-fit sticky top-24">
           <header className="mb-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Financial Intelligence Node</h3>
              
              <div className="space-y-4">
                 <div className="relative group">
                   <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] group-focus-within:text-indigo-500"></i>
                   <input 
                     type="text" 
                     placeholder="ID or Patient entity..." 
                     className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
                     value={billSearchTerm}
                     onChange={(e) => setBillSearchTerm(e.target.value)}
                   />
                 </div>
                 <div className="flex gap-2">
                    {(['all', 'weekly', 'monthly', 'yearly'] as const).map(f => (
                      <button 
                        key={f}
                        onClick={() => setBillFilter(f)}
                        className={`flex-1 text-[8px] font-black uppercase py-2.5 rounded-xl border transition-all tracking-widest ${billFilter === f ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                      >
                        {f}
                      </button>
                    ))}
                 </div>
              </div>
           </header>

           <div className="space-y-4 flex-grow overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
              {filteredBills.map(bill => (
                <div key={bill.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm relative group hover:border-indigo-600 hover:shadow-2xl transition-all cursor-pointer" onClick={() => setSelectedBill(bill)}>
                  <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">
                    <span>Node #{bill.id}</span>
                    <span>{bill.date}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800">{bill.patientName}</h4>
                  <p className="text-2xl font-black text-indigo-600 mt-4 font-mono tracking-tighter">₹{bill.grandTotal.toLocaleString()}</p>
                  
                  {/* Delete functionality integrated into sidebar list */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteBill(bill.id); }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-600 transition-all p-2 bg-rose-50 rounded-xl"
                  >
                    <i className="fas fa-trash-can text-[10px]"></i>
                  </button>
                </div>
              ))}
              {filteredBills.length === 0 && (
                <div className="text-center py-20 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">No Protocol Records Found</div>
              )}
           </div>

           <div className="pt-8 border-t border-slate-200 mt-8">
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregated Total</span>
                 <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">₹{filteredBills.reduce((acc, b) => acc + b.grandTotal, 0).toLocaleString()}</span>
              </div>
              <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">Syncing with clinical financials...</p>
           </div>
        </aside>
      </div>

      {/* PO Procurement Modal */}
      {isPOModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-8 border border-slate-100 transform animate-in zoom-in-95">
              <header className="flex justify-between items-center">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Requisition</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Partner Fulfillment Node</p>
                 </div>
                 <button onClick={() => setIsPOModal(null)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors">
                    <i className="fas fa-times text-sm"></i>
                 </button>
              </header>
              <div className="space-y-6">
                 <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-xs text-indigo-700 font-bold leading-relaxed">Initiating procurement protocol for <span className="font-black text-slate-900 underline decoration-indigo-300 decoration-2">{isPOModal.name}</span>.</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fulfillment Partner</label>
                    <select value={poVendor} onChange={e => setPoVendor(e.target.value)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100">
                       {state.vendors.map(v => <option key={v.id} value={v.name}>{v.name} (Efficiency: {v.performanceRating})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Quantity</label>
                       <input type="number" value={poQty} onChange={e => setPoQty(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority Protocol</label>
                       <select value={poPriority} onChange={e => setPoPriority(e.target.value as any)} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-indigo-100">
                          <option value="Low">Standard</option>
                          <option value="Medium">Urgent</option>
                          <option value="High">Critical</option>
                       </select>
                    </div>
                 </div>
                 <div className="p-6 bg-slate-900 rounded-3xl flex justify-between items-center shadow-xl shadow-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CapEx Estimator</span>
                    <span className="text-xl font-black text-white font-mono tracking-tighter">₹{(isPOModal.costPerUnit * poQty).toLocaleString()}</span>
                 </div>
              </div>
              <button onClick={submitPO} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">Authorize Procurement Request</button>
           </div>
        </div>
      )}

      {/* Bill Detailed Preview & Action Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-8 border border-slate-100 overflow-hidden relative transform animate-in zoom-in-95">
              <header className="border-b border-slate-100 pb-8 flex justify-between items-start">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Protocol Settlelog</h2>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                       <i className="fas fa-barcode"></i> Node Index: {selectedBill.id}
                    </p>
                 </div>
                 <button onClick={() => setSelectedBill(null)} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-colors">
                    <i className="fas fa-times text-sm"></i>
                 </button>
              </header>
              
              <div className="grid grid-cols-2 gap-8 text-[11px] font-black uppercase tracking-widest">
                 <div className="space-y-1">
                    <p className="text-slate-400">Patient Entity</p>
                    <p className="text-slate-900">{selectedBill.patientName}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-slate-400">Responsible Authority</p>
                    <p className="text-slate-900">{selectedBill.doctorName}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-slate-400">Statement Timestamp</p>
                    <p className="text-slate-900">{selectedBill.date}</p>
                 </div>
              </div>

              <div className="py-6 space-y-4">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] border-b border-slate-50 pb-4">Clinical Resource Breakdown</p>
                 <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedBill.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                         <span>{item.name} <span className="text-indigo-600">x{item.quantity}</span></span>
                         <span className="font-mono">₹{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="pt-8 border-t-4 border-slate-900 flex justify-between items-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Consolidated Settlement</span>
                 <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">₹{selectedBill.grandTotal.toLocaleString()}</span>
              </div>

              <div className="flex gap-4 pt-4">
                 <button 
                   onClick={() => { onDeleteBill(selectedBill.id); setSelectedBill(null); }} 
                   className="flex-1 bg-rose-50 text-rose-600 font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                 >
                    Void Statement
                 </button>
                 <button 
                   onClick={() => setSelectedBill(null)} 
                   className="flex-[2] bg-slate-900 text-white font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-black transition-all"
                 >
                    Acknowledge
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PharmacistPanel;
