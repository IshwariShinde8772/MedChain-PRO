
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
  const [isSyncing, setIsSyncing] = useState(false);

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
    const totalInventoryValue = state.inventory.reduce((acc, i) => acc + (i.stockLevel * i.costPerUnit), 0);
    const onDutyStaff = state.staff.filter(s => s.status === 'On Duty');

    const pendingReqs = state.requests.filter(r => r.status === 'PENDING');
    const requirements: Record<string, number> = {};
    pendingReqs.forEach(req => req.items.forEach(ri => requirements[ri.medicineId] = (requirements[ri.medicineId] || 0) + ri.quantity));
    const deficits = Object.entries(requirements).map(([id, needed]) => {
      const inv = state.inventory.find(i => i.id === id);
      return { id, name: inv?.name || 'Unknown', deficit: Math.max(0, needed - (inv?.stockLevel || 0)) };
    }).filter(d => d.deficit > 0);

    return { lowStock, expiringSoon, totalInventoryValue, onDutyStaff, deficits, pendingPOs: state.orders.filter(o => o.status === 'Awaiting Authorization') };
  }, [state]);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const handleAddSubmit = (type: string) => {
    if (type === 'medicine') onAddMedicine(medicineForm);
    else if (type === 'staff') onAddStaff(staffForm);
    else if (type === 'doctor') onAddDoctor(doctorForm);
    else if (type === 'vendor') onAddVendor(vendorForm);
    setIsModalOpen(null);
    // Reset forms logic omitted for brevity as per instructions, but assuming provided in previous snippets
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    const currentInput = chatInput;
    setChatInput('');
    setIsChatLoading(true);
    const aiResp = await askAdminQuery(currentInput, `Assets: ₹${analytics.totalInventoryValue}, Deficits: ${analytics.deficits.length}`);
    setChatMessages(prev => [...prev, { role: 'ai', text: aiResp }]);
    setIsChatLoading(false);
  };

  const NavItem = ({ id, icon, label, badge }: { id: string, icon: string, label: string, badge?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      <div className="flex items-center">
        <i className={`fas ${icon} w-5 mr-3 text-sm ${activeTab === id ? 'text-white' : 'text-slate-400'}`}></i>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {badge ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">{badge}</span> : null}
    </button>
  );

  const FormModal = ({ title, children, onSubmit }: { title: string, children: React.ReactNode, onSubmit: () => void }) => (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-12 space-y-8 transform animate-in zoom-in-95">
        <header className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{title}</h2>
          <button onClick={() => setIsModalOpen(null)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times-circle text-2xl"></i></button>
        </header>
        <div className="grid grid-cols-2 gap-6">{children}</div>
        <button onClick={onSubmit} className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-widest shadow-2xl hover:bg-black transition-all">Integrate Resource Node</button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-slate-50 min-h-[calc(100vh-64px)] font-sans">
      <aside className="w-72 bg-white border-r border-slate-200 p-6 space-y-8 sticky top-[64px] h-[calc(100vh-64px)] overflow-y-auto">
        <div>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Facility Health</h2>
          <nav className="space-y-1">
            <NavItem id="overview" icon="fa-th-large" label="Executive View" />
            <NavItem id="inventory" icon="fa-box-open" label="Stock & Inventory" badge={analytics.lowStock.length} />
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
          <div className="flex flex-col lg:flex-row min-h-[800px] bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in duration-700">
            <div className="lg:w-1/2 bg-slate-950 text-white p-16 relative flex flex-col justify-between">
              <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
              <header className="space-y-4 relative z-10">
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center"><i className="fas fa-microchip text-2xl"></i></div>
                <h2 className="text-4xl font-black tracking-tight leading-tight">MedChain <span className="text-indigo-400">Pro</span> <br/> Executive Command</h2>
              </header>
              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Active Patients</p>
                  <p className="text-2xl font-black">{state.patients.length}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Registry Value</p>
                  <p className="text-2xl font-black">₹{analytics.totalInventoryValue.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 p-16 space-y-12 overflow-y-auto">
              <header className="flex justify-between items-center"><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Facility Status</h3></header>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Stock Crises</p>
                  <span className="text-4xl font-black text-rose-600 tracking-tighter">{analytics.deficits.length}</span>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Personnel on Duty</p>
                  <span className="text-4xl font-black text-emerald-600 tracking-tighter">{analytics.onDutyStaff.length}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={handleSync} className={`flex-1 ${isSyncing ? 'bg-indigo-500' : 'bg-slate-900'} text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3`}>
                  {isSyncing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sync"></i>}
                  {isSyncing ? 'Synchronizing Node...' : 'Global Depot Sync'}
                </button>
                <button onClick={() => setIsAiChatOpen(true)} className="px-8 bg-indigo-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all"><i className="fas fa-sparkles mr-2"></i> AI Assistant</button>
              </div>
            </div>
          </div>
        )}

        {/* Form Modals for Registration */}
        {isModalOpen === 'medicine' && (
          <FormModal title="SKU Entry" onSubmit={() => handleAddSubmit('medicine')}>
            <div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medication Name</label><input value={medicineForm.name} onChange={e => setMedicineForm({...medicineForm, name: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</label><input type="number" value={medicineForm.stockLevel} onChange={e => setMedicineForm({...medicineForm, stockLevel: Number(e.target.value)})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Level</label><input type="number" value={medicineForm.criticalThreshold} onChange={e => setMedicineForm({...medicineForm, criticalThreshold: Number(e.target.value)})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black" /></div>
            <div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</label><input type="number" value={medicineForm.costPerUnit} onChange={e => setMedicineForm({...medicineForm, costPerUnit: Number(e.target.value)})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black" /></div>
          </FormModal>
        )}

        {isModalOpen === 'staff' && (
          <FormModal title="Staff Enrollment" onSubmit={() => handleAddSubmit('staff')}>
            <div className="col-span-2 space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label><input value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label><select value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value as any})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black"><option>Nurse</option><option>Pharmacist</option><option>Receptionist</option><option>Admin</option></select></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift</label><select value={staffForm.shift} onChange={e => setStaffForm({...staffForm, shift: e.target.value as any})} className="w-full bg-gray-50 border p-4 rounded-2xl text-xs font-black"><option>Day</option><option>Evening</option><option>Night</option></select></div>
          </FormModal>
        )}

        {/* Render Tab Contents (Summary) */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header className="flex justify-between items-center"><h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventory Depot</h1><button onClick={() => setIsModalOpen('medicine')} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest">+ Add Clinical SKU</button></header>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100"><tr><th className="px-8 py-6">Identifier</th><th className="px-8 py-6">Stock</th><th className="px-8 py-6">Status</th></tr></thead><tbody className="divide-y divide-slate-50">
                {state.inventory.map(i => (<tr key={i.id} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-6 font-bold">{i.name}</td><td className="px-8 py-6 font-black">{i.stockLevel}</td><td className="px-8 py-6"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase ${i.stockLevel < i.criticalThreshold ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{i.stockLevel < i.criticalThreshold ? 'Critical' : 'Healthy'}</span></td></tr>))}
              </tbody></table>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <header className="flex justify-between items-center"><h1 className="text-3xl font-black text-slate-900 tracking-tight">HR & Personnel</h1><button onClick={() => setIsModalOpen('staff')} className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest">+ Enroll Staff</button></header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {state.staff.map(s => (<div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all"><h4 className="font-black text-slate-900 text-lg">{s.name}</h4><p className="text-[10px] font-black text-slate-400 uppercase mt-2">{s.role} • {s.status}</p></div>))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Chat UI */}
      <div className="fixed bottom-10 right-10 z-[110] flex flex-col items-end">
        {isAiChatOpen && (
          <div className="w-96 h-[600px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 mb-6 flex flex-col overflow-hidden animate-in slide-in-from-bottom-12">
            <header className="bg-slate-900 px-10 py-8 text-white flex justify-between items-center">
              <span className="font-black text-[11px] uppercase tracking-[0.3em]">Command IQ</span>
              <button onClick={() => setIsAiChatOpen(false)}><i className="fas fa-times text-slate-400 hover:text-white"></i></button>
            </header>
            <div className="flex-grow p-10 overflow-y-auto space-y-8 bg-slate-50/50 custom-scrollbar">
              {chatMessages.map((m, i) => (<div key={i} className={`p-6 rounded-[2rem] shadow-sm leading-relaxed text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white ml-12 font-bold' : 'bg-white text-slate-800 mr-12 border border-slate-100 font-black'}`}>{m.text}</div>))}
              {isChatLoading && <div className="text-indigo-500 animate-pulse font-black text-[10px] uppercase px-2">Processing Node Intelligence...</div>}
            </div>
            <form onSubmit={handleChat} className="p-8 bg-white border-t border-slate-100 flex gap-4">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Enter operational query..." className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black outline-none" />
              <button type="submit" className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-indigo-700 transition-all"><i className="fas fa-arrow-up text-lg"></i></button>
            </form>
          </div>
        )}
        <button onClick={() => setIsAiChatOpen(!isAiChatOpen)} className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all active:scale-90 duration-500 ${isAiChatOpen ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
           <i className={`fas ${isAiChatOpen ? 'fa-times' : 'fa-sparkles'} text-3xl`}></i>
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
