
import React, { useState, useMemo } from 'react';
import { AppState, Patient } from '../types';

const ReceptionistPanel = ({ state, onAdd, onCreate }: { state: AppState, onAdd: (p: any) => void, onCreate: (pid: string, pname: string, items: any[]) => void }) => {
  const [isModal, setIsModal] = useState(false);
  const [isPrescribeModal, setIsPrescribeModal] = useState<null | Patient>(null);
  const [patient, setPatient] = useState({ name: '', age: '', doc: '', diag: '', bed: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Prescription state
  const [medId, setMedId] = useState('');
  const [qty, setQty] = useState(1);
  const [basket, setBasket] = useState<{medicineId: string, medicineName: string, quantity: number}[]>([]);

  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.patients, searchTerm]);

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

  const submitPrescription = () => {
    if (!isPrescribeModal) return;
    onCreate(isPrescribeModal.id, isPrescribeModal.name, basket);
    setIsPrescribeModal(null);
    setBasket([]);
  };

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
              <tr key={p.id} className="hover:bg-gray-50/50">
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
                <td className="px-6 py-5 text-right flex justify-end gap-3">
                   <button onClick={() => setIsPrescribeModal(p)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded uppercase tracking-widest">Prescribe</button>
                   <button className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Dossier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Prescribe Modal */}
      {isPrescribeModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 space-y-8">
              <header className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-gray-900">Issue Requisition: {isPrescribeModal.name}</h2>
                 <button onClick={() => setIsPrescribeModal(null)}><i className="fas fa-times text-gray-400"></i></button>
              </header>
              <div className="space-y-4">
                 <div className="flex gap-2">
                    <select value={medId} onChange={e => setMedId(e.target.value)} className="flex-grow bg-gray-50 border p-3 rounded-xl text-xs outline-none">
                       <option value="">Select Resource...</option>
                       {state.inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.stockLevel})</option>)}
                    </select>
                    <input type="number" value={qty} min="1" className="w-20 bg-gray-50 border p-3 rounded-xl text-xs outline-none" onChange={e => setQty(Number(e.target.value))} />
                    <button onClick={addToBasket} className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-xs font-bold">+</button>
                 </div>
                 <div className="space-y-2 max-h-40 overflow-y-auto">
                    {basket.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold">
                         <span>{item.medicineName} x{item.quantity}</span>
                         <button onClick={() => setBasket(basket.filter((_, idx) => idx !== i))} className="text-red-400"><i className="fas fa-trash"></i></button>
                      </div>
                    ))}
                 </div>
              </div>
              <button onClick={submitPrescription} disabled={basket.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-xs uppercase shadow-sm disabled:opacity-50">Send to Pharmacy Terminal</button>
           </div>
        </div>
      )}

      {isModal && (
        <div className="fixed inset-0 bg-gray-900/5 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
          <form onSubmit={handleCreatePatient} className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-10 space-y-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 text-center">Admission Intake</h2>
            <div className="space-y-4">
              <input required placeholder="Patient full name" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" onChange={e => setPatient({...patient, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Age" type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" onChange={e => setPatient({...patient, age: e.target.value})} />
                <input required placeholder="Bed #" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" onChange={e => setPatient({...patient, bed: e.target.value})} />
              </div>
              <select required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none" onChange={e => setPatient({...patient, doc: e.target.value})}>
                <option value="">Responsible Authority...</option>
                {state.doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <textarea required placeholder="Diagnosis" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm h-24 resize-none outline-none" onChange={e => setPatient({...patient, diag: e.target.value})} />
            </div>
            <div className="flex gap-4 pt-4">
               <button type="button" onClick={() => setIsModal(false)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-xs uppercase text-gray-500">Discard</button>
               <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-xs uppercase shadow-sm">Commit Intake</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ReceptionistPanel;
