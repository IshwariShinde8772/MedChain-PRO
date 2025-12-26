
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, InventoryItem, StaffMember, Doctor, Patient, Vendor, PurchaseOrder, Bill } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { askAdminQuery } from '../services/geminiService';

const AdminPanel = ({ 
  state, 
  onAuthorizeOrder, 
  onAddMedicine,
  onAddStaff,
  onAddDoctor,
  onAddVendor
}: { 
  state: AppState, 
  onAuthorizeOrder: (id: string, action: 'authorize' | 'cancel') => void,
  onAddMedicine: (item: Omit<InventoryItem, 'id' | 'lastUsedDate'>) => void,
  onAddStaff: (staff: Omit<StaffMember, 'id'>) => void,
  onAddDoctor: (doc: Omit<Doctor, 'id' | 'patientLoad'>) => void,
  onAddVendor: (vendor: Omit<Vendor, 'id'>) => void
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState<null | 'medicine' | 'doctor' | 'staff' | 'vendor'>(null);

  // Form States
  const [medicineForm, setMedicineForm] = useState({ name: '', batchID: '', stockLevel: 0, criticalThreshold: 10, expiryDate: '', costPerUnit: 0, location: 'Central Pharmacy' as any, category: 'Tablet' as any });
  const [staffForm, setStaffForm] = useState({ name: '', role: 'Nurse' as any, shift: 'Day' as any, status: 'On Duty' as any });
  const [doctorForm, setDoctorForm] = useState({ name: '', specialization: '', status: 'On Duty' as any });
  const [vendorForm, setVendorForm] = useState({ name: '', contact: '', performanceRating: 5 });

  const analytics = useMemo(() => {
    const now = new Date();
    const lowStock = state.inventory.filter(i => i.stockLevel < i.criticalThreshold);
    const expiringSoon = state.inventory.filter(i => {
      const expiry = new Date(i.expiryDate);
      const diff = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return diff > 0 && diff < 30;
    });
    const wastage = state.inventory.filter(i => new Date(i.expiryDate) < now);

    const pendingReqs = state.requests.filter(r => r.status === 'PENDING');
    const requirements: Record<string, number> = {};
    pendingReqs.forEach(req => {
      req.items.forEach(ri => {
        requirements[ri.medicineId] = (requirements[ri.medicineId] || 0) + ri.quantity;
      });
    });

    const deficits = Object.entries(requirements).map(([id, needed]) => {
      const inv = state.inventory.find(i => i.id === id);
      const available = inv?.stockLevel || 0;
      const deficit = Math.max(0, needed - available);
      const financialImpact = deficit * (inv?.costPerUnit || 0);
      return { id, name: inv?.name || 'Unknown Node', needed, available, deficit, financialImpact };
    }).filter(d => d.deficit > 0).sort((a, b) => b.financialImpact - a.financialImpact);

    const vendorMetrics = state.vendors.map(v => {
      const vendorOrders = state.orders.filter(o => o.vendorName === v.name);
      return { name: v.name, rating: v.performanceRating, orderCount: vendorOrders.length, totalValue: vendorOrders.reduce((acc, o) => acc + o.cost, 0) };
    });

    const totalInventoryValue = state.inventory.reduce((acc, i) => acc + (i.stockLevel * i.costPerUnit), 0);
    const lossValue = wastage.reduce((acc, i) => acc + (i.stockLevel * i.costPerUnit), 0);

    return {
      lowStock, expiringSoon, wastage, totalInventoryValue, 
      dailyConsumption: state.bills.filter(b => b.date === now.toISOString().split('T')[0]).reduce((acc, b) => acc + b.grandTotal, 0),
      lossValue, deficits, vendorMetrics,
      pendingPOs: state.orders.filter(o => o.status === 'Awaiting Authorization' || o.status === 'Pending'),
      onDutyStaff: state.staff.filter(s => s.status === 'On Duty')
    };
  }, [state]);

  const handleAddSubmit = (type: string) => {
    if (type === 'medicine') {
      onAddMedicine(medicineForm);
      setMedicineForm({ name: '', batchID: '', stockLevel: 0, criticalThreshold: 10, expiryDate: '', costPerUnit: 0, location: 'Central Pharmacy', category: 'Tablet' });
    } else if (type === 'staff') {
      onAddStaff(staffForm);
      setStaffForm({ name: '', role: 'Nurse', shift: 'Day', status: 'On Duty' });
    } else if (type === 'doctor') {
      onAddDoctor(doctorForm);
      setDoctorForm({ name: '', specialization: '', status: 'On Duty' });
    } else if (type === 'vendor') {
      onAddVendor(vendorForm);
      setVendorForm({ name: '', contact: '', performanceRating: 5 });
    }
    setIsModalOpen(null);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    const currentInput = chatInput;
    setChatInput('');
    setIsChatLoading(true);
    const context = `Rev: ₹${analytics.totalInventoryValue}, Deficits: ${analytics.deficits.length}, PendingOrders: ${analytics.pendingPOs.length}`;
    const aiResp = await askAdminQuery(currentInput, context);
    setChatMessages(prev => [...prev, { role: 'ai', text: aiResp }]);
    setIsChatLoading(false);
  };

  const NavItem = ({ id, icon, label, badge }: { id: string, icon: string, label: string, badge?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      <div className="flex items-center">
        <i className={`fas ${icon} w-5 mr-3 text-sm ${activeTab === id ? 'text-white' : 'text-slate-400'}`}></i>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {badge ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'}`}>{badge}</span> : null}
    </button>
  );

  const FormModal = ({ title, children, onSubmit }: { title: string, children: React.ReactNode, onSubmit: () => void }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-8 transform animate-in zoom-in-95">
        <header className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{title}</h2>
          <button onClick={() => setIsModalOpen(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times-circle text-2xl"></i></button>
        </header>
        <div className="grid grid-cols-2 gap-6">
          {children}
        </div>
        <button onClick={onSubmit} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all">Integrate Resource Node</button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-slate-50 min-h-[calc(100vh-64px)] font-sans">
      <aside className="w-72 bg-white border-r border-slate-200 p-6 space-y-8 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
        <div>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Facility Health</h2>
          <nav className="space-y-1">
            <NavItem id="overview" icon="fa-th-large" label="Executive View" />
            <NavItem id="inventory" icon="fa-box-open" label="Stock & Inventory" badge={analytics.lowStock.length + analytics.expiringSoon.length} />
            <NavItem id="procurement" icon="fa-truck-loading" label="Purchase & Vendors" badge={analytics.pendingPOs.length} />
          </nav>
        </div>
        <div>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Clinical Personnel</h2>
          <nav className="space-y-1">
            <NavItem id="staff" icon="fa-users-gear" label="Staff & HR" />
            <NavItem id="doctors" icon="fa-user-md" label="Medical Specialists" />
          </nav>
        </div>
        <div>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Unit Operations</h2>
          <nav className="space-y-1">
            <NavItem id="patients" icon="fa-hospital-user" label="Patient Census" />
            <NavItem id="financials" icon="fa-chart-line" label="Financial Control" />
          </nav>
        </div>
      </aside>

      <main className="flex-grow p-10 max-w-[1600px] mx-auto">
        {activeTab === 'overview' && (
          <div className="flex flex-col lg:flex-row min-h-[800px] bg-white rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden animate-in fade-in duration-700">
            <div className="lg:w-1/2 bg-slate-950 text-white p-16 relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
              <div className="relative z-10 space-y-12">
                <header className="space-y-4">
                  <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl"><i className="fas fa-microchip text-2xl"></i></div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">MedChain <span className="text-indigo-400">Pro</span> <br/> Facility Hub</h2>
                </header>
                <div className="space-y-8">
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">MedChain Pro integrated ecosystem maintains 99.9% protocol integrity across wards.</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Active Census</p>
                      <p className="text-2xl font-black">{state.patients.length} Nodes</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                      <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Asset Value</p>
                      <p className="text-2xl font-black">₹{analytics.totalInventoryValue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 p-16 space-y-12 overflow-y-auto custom-scrollbar">
              <header className="flex justify-between items-center">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Command Center</h3>
              </header>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Stock Deficits</p>
                  <span className="text-4xl font-black text-rose-600 tracking-tighter">{analytics.deficits.length}</span>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">On Duty Personnel</p>
                  <span className="text-4xl font-black text-emerald-600 tracking-tighter">{analytics.onDutyStaff.length}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('inventory')} className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95">Global Depot Sync</button>
                <button onClick={() => setIsAiChatOpen(true)} className="px-8 bg-indigo-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95"><i className="fas fa-sparkles mr-2"></i> AI Ask</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL FORMS: REGISTER PANEL & ADD SKU */}
        {isModalOpen === 'medicine' && (
          <FormModal title="Clinical SKU Registry" onSubmit={() => handleAddSubmit('medicine')}>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Name</label>
              <input value={medicineForm.name} onChange={e => setMedicineForm({...medicineForm, name: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" placeholder="e.g. Propofol 200mg" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch Identifier</label>
              <input value={medicineForm.batchID} onChange={e => setMedicineForm({...medicineForm, batchID: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" placeholder="B-XXXX" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost Per Unit</label>
              <input type="number" value={medicineForm.costPerUnit} onChange={e => setMedicineForm({...medicineForm, costPerUnit: Number(e.target.value)})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Level</label>
              <input type="number" value={medicineForm.stockLevel} onChange={e => setMedicineForm({...medicineForm, stockLevel: Number(e.target.value)})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Threshold</label>
              <input type="number" value={medicineForm.criticalThreshold} onChange={e => setMedicineForm({...medicineForm, criticalThreshold: Number(e.target.value)})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Timeline</label>
              <input type="date" value={medicineForm.expiryDate} onChange={e => setMedicineForm({...medicineForm, expiryDate: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
          </FormModal>
        )}

        {isModalOpen === 'staff' && (
          <FormModal title="Personnel Enrollment" onSubmit={() => handleAddSubmit('staff')}>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Legal Name</label>
              <input value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clinical Role</label>
              <select value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value as any})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black">
                <option>Nurse</option><option>Pharmacist</option><option>Receptionist</option><option>Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Shift</label>
              <select value={staffForm.shift} onChange={e => setStaffForm({...staffForm, shift: e.target.value as any})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black">
                <option>Day</option><option>Evening</option><option>Night</option>
              </select>
            </div>
          </FormModal>
        )}

        {isModalOpen === 'doctor' && (
          <FormModal title="Specialist Registry" onSubmit={() => handleAddSubmit('doctor')}>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor Name</label>
              <input value={doctorForm.name} onChange={e => setDoctorForm({...doctorForm, name: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" placeholder="Dr. " />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field of Specialization</label>
              <input value={doctorForm.specialization} onChange={e => setDoctorForm({...doctorForm, specialization: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
          </FormModal>
        )}

        {isModalOpen === 'vendor' && (
          <FormModal title="Partner Integration" onSubmit={() => handleAddSubmit('vendor')}>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Organization</label>
              <input value={vendorForm.name} onChange={e => setVendorForm({...vendorForm, name: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Protocol</label>
              <input value={vendorForm.contact} onChange={e => setVendorForm({...vendorForm, contact: e.target.value})} className="w-full bg-slate-50 border p-4 rounded-2xl text-xs font-black" placeholder="+91-" />
            </div>
          </FormModal>
        )}

        {/* TABS CONTENT WITH DATA ENHANCEMENTS */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header className="flex justify-between items-center">
              <div><h1 className="text-3xl font-black text-slate-900 tracking-tight">Resource Inventory</h1></div>
              <button onClick={() => setIsModalOpen('medicine')} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">+ Add Clinical SKU</button>
            </header>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                  <tr><th className="px-8 py-6">Clinical Identifier</th><th className="px-8 py-6">Operational Depot</th><th className="px-8 py-6">Stock Node</th><th className="px-8 py-6">Integrity Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {state.inventory.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-800">{i.name}</td>
                      <td className="px-8 py-6 font-medium text-slate-500">{i.location}</td>
                      <td className="px-8 py-6 font-black text-slate-900">{i.stockLevel}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${i.stockLevel < i.criticalThreshold ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {i.stockLevel < i.criticalThreshold ? 'Critical' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
           <div className="space-y-8 animate-in slide-in-from-right-4">
              <header className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Personnel Roster</h1>
                <button onClick={() => setIsModalOpen('staff')} className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700">+ Register Staff</button>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {state.staff.map(s => (
                  <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all">
                    <h4 className="font-black text-slate-900 text-lg">{s.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-2">{s.role} • Node {s.id}</p>
                    <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
                      <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-400">Shift</span><span className="text-indigo-600">{s.shift}</span></div>
                      <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-400">Status</span><span className={s.status === 'On Duty' ? 'text-emerald-500' : 'text-slate-400'}>{s.status}</span></div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
             <header><h1 className="text-3xl font-black text-slate-900 tracking-tight">Patient Census</h1></header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {state.patients.map(p => (
                 <div key={p.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-2xl transition-all group">
                   <h4 className="font-black text-slate-900 text-2xl tracking-tight">{p.name}</h4>
                   <p className="text-sm text-slate-500 font-bold mb-8 italic">{p.diagnosis}</p>
                   <div className="space-y-5 pt-8 border-t border-slate-50">
                      <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-400">Bed</span><span className="text-slate-900">{p.bedNumber}</span></div>
                      <div className="flex justify-between text-[10px] font-bold uppercase"><span className="text-slate-400">Med History</span><span className="text-emerald-600">{p.medicationHistory.length} Cycles</span></div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'doctors' && (
          <div className="space-y-8 animate-in slide-in-from-right-4">
            <header className="flex justify-between items-center">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medical Specialists</h1>
              <button onClick={() => setIsModalOpen('doctor')} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700">+ Add Specialist</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.doctors.map(d => (
                <div key={d.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><i className="fas fa-user-md text-2xl"></i></div>
                  <div>
                    <h4 className="font-black text-slate-900">{d.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase">{d.specialization}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* AI Intelligence Floating Terminal */}
      <div className="fixed bottom-10 right-10 z-[110] flex flex-col items-end">
        {isAiChatOpen && (
          <div className="w-96 h-[600px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-slate-100 mb-6 flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
            <header className="bg-slate-900 px-10 py-8 text-white flex justify-between items-center shadow-2xl">
              <span className="font-black text-[11px] uppercase tracking-[0.3em]">Facility Neural Node</span>
              <button onClick={() => setIsAiChatOpen(false)}><i className="fas fa-times text-slate-400 hover:text-white"></i></button>
            </header>
            <div className="flex-grow p-10 overflow-y-auto space-y-8 bg-slate-50/50 custom-scrollbar">
              {chatMessages.map((m, i) => (
                <div key={i} className={`p-6 rounded-[2rem] shadow-sm leading-relaxed text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white ml-12 font-bold shadow-indigo-100' : 'bg-white text-slate-800 mr-12 border border-slate-100 font-black'}`}>
                  {m.text}
                </div>
              ))}
              {isChatLoading && <div className="text-indigo-500 animate-pulse font-black text-[10px] uppercase tracking-widest px-2">Synthesizing Node IQ...</div>}
            </div>
            <form onSubmit={handleChat} className="p-8 bg-white border-t border-slate-100 flex gap-4">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Query operational data..." className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-indigo-50 placeholder:text-slate-300" />
              <button type="submit" className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all"><i className="fas fa-arrow-up text-lg"></i></button>
            </form>
          </div>
        )}
        <button onClick={() => setIsAiChatOpen(!isAiChatOpen)} className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all active:scale-90 duration-500 ${isAiChatOpen ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-400/50'}`}>
           <i className={`fas ${isAiChatOpen ? 'fa-times' : 'fa-sparkles'} text-3xl`}></i>
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
