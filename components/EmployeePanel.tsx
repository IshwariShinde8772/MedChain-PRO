
import React, { useState, useMemo } from 'react';
import { Patient, AppState } from '../types';
import { getMedicationSuggestions } from '../services/geminiService';

interface EmployeePanelProps {
  state: AppState;
  onCreateRequest: (patientId: string, patientName: string, items: { medicineId: string, medicineName: string, quantity: number }[]) => void;
  onAddPatient: (patient: Omit<Patient, 'id' | 'medicationHistory'>) => void;
}

const EmployeePanel: React.FC<EmployeePanelProps> = ({ state, onCreateRequest, onAddPatient }) => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [basket, setBasket] = useState<{ medicineId: string, quantity: number, medicineName: string }[]>([]);
  const [medicineId, setMedicineId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [state.patients, searchQuery]);

  const fetchAiSuggestions = async () => {
    if (!selectedPatient) return;
    setIsAiSuggesting(true);
    const historyText = selectedPatient.medicationHistory.map(m => m.medicineName).join(", ") || "None";
    const suggestions = await getMedicationSuggestions(selectedPatient.diagnosis, historyText);
    setAiSuggestions(suggestions);
    setIsAiSuggesting(false);
  };

  const addToBasket = () => {
    if (!medicineId) return;
    const medicine = state.inventory.find(i => i.id === medicineId);
    if (!medicine) return;
    const existingIdx = basket.findIndex(item => item.medicineId === medicineId);
    if (existingIdx > -1) {
      const newBasket = [...basket];
      newBasket[existingIdx].quantity += quantity;
      setBasket(newBasket);
    } else {
      setBasket([...basket, { medicineId, quantity, medicineName: medicine.name }]);
    }
    setMedicineId('');
    setQuantity(1);
  };

  return (
    <div className="p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in bg-white font-sans">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Ward Management</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Real-time Patient Dossiers</p>
        </div>
        <div className="relative">
           <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
           <input type="text" placeholder="Search census..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-72 font-medium" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(p => (
          <div key={p.id} onClick={() => { setSelectedPatient(p); setAiSuggestions([]); setBasket([]); }} className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-50 transition-all cursor-pointer group shadow-sm">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <h3 className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Localization: Bed {p.bedNumber}</p>
               </div>
               <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg uppercase tracking-widest">{p.age}Y Node</span>
            </div>
            <div className="space-y-4">
               <div className="flex items-center text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <i className="fas fa-stethoscope w-6 text-indigo-400"></i>
                  <span className="font-bold italic">{p.diagnosis}</span>
               </div>
               <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protocol Integrity</span>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg uppercase">{p.medicationHistory.length} Cycles</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100 max-h-[90vh] transform animate-in zoom-in-95">
              <div className="w-full md:w-3/5 p-12 space-y-10 overflow-y-auto custom-scrollbar">
                 <header className="flex justify-between items-start">
                    <div className="space-y-1">
                       <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedPatient.name}</h2>
                       <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Intake: {selectedPatient.id} • Diagnosis Cluster: {selectedPatient.diagnosis}</p>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times-circle text-2xl"></i></button>
                 </header>

                 {/* Assistive AI Section */}
                 <div className="bg-indigo-600 p-8 rounded-3xl text-white space-y-6 shadow-xl shadow-indigo-100">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Neural Clinical Advisor</h5>
                       </div>
                       <button 
                         onClick={fetchAiSuggestions} 
                         disabled={isAiSuggesting} 
                         className="text-[10px] font-black text-indigo-600 bg-white px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
                       >
                          {isAiSuggesting ? 'Inference Processing...' : 'Synthesize Proposal'}
                       </button>
                    </div>
                    <div className="space-y-3 min-h-[40px]">
                       {aiSuggestions.map((s, i) => (
                         <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/20 text-xs font-bold text-white flex items-center gap-4 animate-in slide-in-from-left-2">
                            <i className="fas fa-microchip text-indigo-300"></i> {s}
                         </div>
                       ))}
                       {!isAiSuggesting && aiSuggestions.length === 0 && (
                         <p className="text-xs text-indigo-200 font-medium italic opacity-70">Awaiting AI inference triggers based on patient telemetry...</p>
                       )}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-prescription-bottle-medical"></i> Clinical Requisition Node
                    </h4>
                    <div className="flex gap-3">
                       <select value={medicineId} onChange={(e) => setMedicineId(e.target.value)} className="flex-grow bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100">
                          <option value="">Select Protocol Resource...</option>
                          {state.inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stockLevel})</option>)}
                       </select>
                       <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-24 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
                       <button onClick={addToBasket} className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">+</button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                       {basket.map((b, i) => (
                         <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold">
                            <span className="text-slate-700">{b.medicineName} <span className="text-indigo-600">x{b.quantity}</span></span>
                            <button onClick={() => setBasket(basket.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600"><i className="fas fa-trash-alt"></i></button>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="pt-6">
                    <button 
                      onClick={() => { onCreateRequest(selectedPatient.id, selectedPatient.name, basket); setSelectedPatient(null); }} 
                      disabled={basket.length === 0} 
                      className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-30"
                    >
                       Broadcast Requisition to Pharmacy
                    </button>
                 </div>
              </div>

              {/* History Sidebar */}
              <div className="w-full md:w-2/5 bg-slate-50 p-12 border-l border-slate-100 overflow-y-auto custom-scrollbar">
                 <div className="flex items-center gap-3 mb-8">
                   <i className="fas fa-history text-slate-300"></i>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Node Log History</h4>
                 </div>
                 <div className="space-y-4">
                    {selectedPatient.medicationHistory.slice().reverse().map((log, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm animate-in slide-in-from-right-2">
                         <p className="text-sm font-black text-slate-800">{log.medicineName}</p>
                         <div className="flex justify-between items-center mt-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            <span className="bg-slate-50 px-2 py-1 rounded">{new Date(log.timestamp).toLocaleDateString()}</span>
                            <span className="text-emerald-500">{log.quantity} Units</span>
                         </div>
                         <p className="text-[9px] text-slate-300 font-bold uppercase mt-3 italic">Auth: {log.administeredBy}</p>
                      </div>
                    ))}
                    {selectedPatient.medicationHistory.length === 0 && (
                      <div className="text-center py-20">
                        <i className="fas fa-folder-open text-slate-200 text-3xl mb-4"></i>
                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Inert Protocol History</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePanel;
