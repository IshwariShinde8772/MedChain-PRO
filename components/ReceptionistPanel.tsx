
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Patient } from '../types';
import { getMedicationSuggestions } from '../services/geminiService';

const ReceptionistPanel = ({ state, onAdd, onCreate }: { state: AppState, onAdd: (p: any) => void, onCreate: (pid: string, pname: string, items: any[]) => void }) => {
  const [isModal, setIsModal] = useState(false);
  const [isPrescribeModal, setIsPrescribeModal] = useState<null | Patient>(null);
  const [patient, setPatient] = useState({ name: '', age: '', doc: '', diag: '', bed: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [medId, setMedId] = useState('');
  const [qty, setQty] = useState(1);
  const [basket, setBasket] = useState<{medicineId: string, medicineName: string, quantity: number}[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<{name: string, category: string, reason: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.patients, searchTerm]);

  useEffect(() => {
    if (isPrescribeModal) {
      handleFetchSuggestions(isPrescribeModal);
    } else {
      setAiSuggestions([]);
      setBasket([]);
    }
  }, [isPrescribeModal]);

  const handleFetchSuggestions = async (p: Patient) => {
    setIsAiLoading(true);
    const historyText = p.medicationHistory.map(m => m.medicineName).join(", ") || "No prior history.";
    const suggestions = await getMedicationSuggestions(p.diagnosis, historyText);
    setAiSuggestions(suggestions);
    setIsAiLoading(false);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name: patient.name, age: Number(patient.age), assignedDoctorID: patient.doc, diagnosis: patient.diag, bedNumber: patient.bed });
    setIsModal(false);
    setPatient({ name: '', age: '', doc: '', diag: '', bed: '' });
  };

  const addToBasket = () => {
    const med = state.inventory.find(i => i.id === medId);
    if (!med) return;
    setBasket([...basket, { medicineId: med.id, medicineName: med.name, quantity: qty }]);
    setMedId('');
    setQty(1);
  };

  const addSuggestedToBasket = (suggestedName: string) => {
    const matched = state.inventory.find(i => 
      suggestedName.toLowerCase().includes(i.name.toLowerCase()) ||
      i.name.toLowerCase().includes(suggestedName.toLowerCase())
    );
    if (matched) {
      setBasket([...basket, { medicineId: matched.id, medicineName: matched.name, quantity: 1 }]);
    } else {
      alert(`The protocol "${suggestedName}" is not currently in stock.`);
    }
  };

  const submitPrescription = () => {
    if (!isPrescribeModal) return;
    onCreate(isPrescribeModal.id, isPrescribeModal.name, basket);
    setIsPrescribeModal(null);
  };

  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, typeof aiSuggestions> = {};
    aiSuggestions.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [aiSuggestions]);

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in bg-white font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between">
           <p className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-80">Facility Census</p>
           <h3 className="text-2xl font-bold tracking-tight">{state.patients.length} Active Nodes</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Availability</p>
           <h3 className="text-2xl font-bold tracking-tight text-indigo-600">{50 - state.patients.length} Units Free</h3>
        </div>
        <button onClick={() => setIsModal(true)} className="bg-gray-900 hover:bg-black p-6 rounded-2xl text-white transition-all flex items-center justify-center gap-4">
           <i className="fas fa-plus text-indigo-400"></i>
           <span className="text-sm font-bold uppercase tracking-widest">New Intake</span>
        </button>
      </div>

      <header className="flex justify-between items-center border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Front Desk Registry</h1>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-1">Clinical Intake Control</p>
        </div>
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
          <input type="text" placeholder="Filter registry..." className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-300 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Patient Profile</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Authority</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredPatients.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5">
                   <p className="font-bold text-gray-900">{p.name}</p>
                   <p className="text-[10px] text-gray-400 font-bold uppercase">Bed {p.bedNumber}</p>
                </td>
                <td className="px-6 py-5">
                   <span className="text-xs font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded">{p.diagnosis}</span>
                </td>
                <td className="px-6 py-5 text-gray-500 font-medium">
                   {state.doctors.find(d => d.id === p.assignedDoctorID)?.name}
                </td>
                <td className="px-6 py-5 text-right">
                   <button onClick={() => setIsPrescribeModal(p)} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Prescribe</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {isPrescribeModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-8 space-y-6 overflow-hidden flex flex-col max-h-[95vh]">
              <header className="flex justify-between items-start border-b pb-4">
                 <div>
                    <h2 className="text-xl font-bold text-gray-900">Issue Requisition</h2>
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">
                       Patient: {isPrescribeModal.name} <span className="mx-2 opacity-30">|</span> 
                       Clinical Case: {isPrescribeModal.diagnosis}
                    </p>
                 </div>
                 <button onClick={() => setIsPrescribeModal(null)} className="text-gray-300 hover:text-gray-900 transition-transform hover:scale-110"><i className="fas fa-times-circle text-2xl"></i></button>
              </header>

              {/* SYSTEMATIC AI ADVISOR */}
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <i className="fas fa-brain text-indigo-600 text-sm"></i>
                      <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Systematic Protocol Advisor</h4>
                   </div>
                   {isAiLoading && <i className="fas fa-spinner fa-spin text-indigo-400 text-xs"></i>}
                </div>
                
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                   {Object.keys(groupedSuggestions).map(category => (
                     <div key={category} className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-l-2 border-indigo-200 pl-2">{category}</p>
                        <div className="flex flex-wrap gap-2">
                           {groupedSuggestions[category].map((s, idx) => (
                             <button 
                               key={idx} 
                               onClick={() => addSuggestedToBasket(s.name)}
                               className="bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 px-3 py-2 rounded-xl text-[10px] font-bold text-slate-700 transition-all shadow-sm active:scale-95 text-left group max-w-xs"
                             >
                               <p className="mb-1">{s.name}</p>
                               <p className="text-[8px] opacity-60 group-hover:opacity-100 font-medium leading-tight">{s.reason}</p>
                             </button>
                           ))}
                        </div>
                     </div>
                   ))}
                   {!isAiLoading && aiSuggestions.length === 0 && (
                     <p className="text-[10px] text-slate-300 italic py-4">Generating evidence-based protocols for this specific diagnosis...</p>
                   )}
                </div>
              </div>

              <div className="flex-grow overflow-y-auto space-y-6">
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Manual Node Selection</h4>
                    <div className="flex gap-2">
                        <select value={medId} onChange={e => setMedId(e.target.value)} className="flex-grow bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100">
                           <option value="">Select SKU from Registry...</option>
                           {state.inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.stockLevel} units)</option>)}
                        </select>
                        <input type="number" value={qty} min="1" className="w-20 bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-black outline-none" onChange={e => setQty(Number(e.target.value))} />
                        <button onClick={addToBasket} className="bg-indigo-600 text-white px-6 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">+</button>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Current Requisition Basket</h4>
                    <div className="space-y-2">
                        {basket.map((item, i) => (
                          <div key={i} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl text-xs font-bold animate-in slide-in-from-left-2">
                             <span>{item.medicineName} <span className="text-indigo-600">x{item.quantity}</span></span>
                             <button onClick={() => setBasket(basket.filter((_, idx) => idx !== i))} className="text-rose-300 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                          </div>
                        ))}
                        {basket.length === 0 && <p className="text-center py-6 text-[10px] text-gray-300 font-black uppercase">Fulfillment Required</p>}
                    </div>
                 </div>
              </div>

              <button 
                onClick={submitPrescription} 
                disabled={basket.length === 0} 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all disabled:opacity-50 active:scale-98"
              >
                Transmit to Pharmacy Dispatch
              </button>
           </div>
        </div>
      )}

      {isModal && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
          <form onSubmit={handleCreatePatient} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-10 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 text-center uppercase tracking-tight">Clinical Admission Node</h2>
            <div className="space-y-4">
              <input required placeholder="Full Legal Name" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-sm font-bold outline-none" onChange={e => setPatient({...patient, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Age" type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-sm font-bold outline-none" onChange={e => setPatient({...patient, age: e.target.value})} />
                <input required placeholder="Bed ID" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-sm font-bold outline-none" onChange={e => setPatient({...patient, bed: e.target.value})} />
              </div>
              <select required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-sm font-bold outline-none" onChange={e => setPatient({...patient, doc: e.target.value})}>
                <option value="">Responsible Specialist...</option>
                {state.doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
              </select>
              <textarea required placeholder="Clinical Diagnosis (e.g., Hypertension, Type 2 Diabetes)" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-sm h-24 resize-none font-bold outline-none" onChange={e => setPatient({...patient, diag: e.target.value})} />
            </div>
            <div className="flex gap-4 pt-4">
               <button type="button" onClick={() => setIsModal(false)} className="flex-1 bg-gray-100 py-4 rounded-2xl font-black text-[10px] uppercase text-gray-400">Cancel</button>
               <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100">Commit to Census</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPanel;
