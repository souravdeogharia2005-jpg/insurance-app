import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAdminProposals, updateAdminProposal, deleteAdminProposal, getAdminStats } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, Trash2, Search, X, ChevronDown, Download, LockOpen, TrendingUp, Users, Activity, Wallet, MoreVertical, Filter, Bell, AlertCircle, ChevronRight } from 'lucide-react';

const ADMIN_PASSWORD = 'student123';
const ADMIN_NAME = 'SHREYA DEOGHARIA';

export default function AdminPage() {
    const { t, fc, fd } = useApp();
    const [unlocked, setUnlocked] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [password, setPassword] = useState('');
    const [passError, setPassError] = useState('');
    const [proposals, setProposals] = useState([]);
    const [stats, setStats] = useState({ totalUnderwritten: 0, activeProposals: 0, approvalRate: 0, avgProcessingTime: 0, revenueHistory: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [viewProp, setViewProp] = useState(null);
    const [delProp, setDelProp] = useState(null);

    useEffect(() => { if (unlocked) loadData(); }, [unlocked]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, s] = await Promise.all([getAdminProposals(), getAdminStats()]);
            setProposals(p);
            setStats(s);
        } catch (err) {
            console.error('Failed to load admin data', err);
        } finally {
            setLoading(false);
        }
    };

    const tryUnlock = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD && adminName.trim().toUpperCase() === ADMIN_NAME) {
            setUnlocked(true);
            setPassError('');
        } else {
            setPassError('Incorrect Name or Password');
        }
    };

    const changeStatus = async (id, status) => {
        await updateAdminProposal(id, { status }); loadData();
    };

    const confirmDelete = async () => {
        if (delProp) { await deleteAdminProposal(delProp); setDelProp(null); loadData(); }
    };

    const handleEditSave = async () => {
        if (viewProp) { await updateAdminProposal(viewProp.id, viewProp); setViewProp(null); loadData(); }
    };

    const exportAnalytics = () => {
        if (!proposals.length) return alert("No data to export");
        const headers = ["ID", "Name", "Gender", "Age", "BMI", "EMR Score", "Risk Class", "Total Premium", "Status", "Date"];
        const rows = proposals.map(p => [
            p.id, `"${p.name || ''}"`, p.gender || '', p.age || '', p.bmi || '', p.emrScore || '',
            p.riskClass || '', p.premium?.total || '', p.status || '', new Date(p.createdAt).toLocaleDateString()
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `AegisAI_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filtered = proposals.filter(p => {
        const matchSearch = !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.id || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || p.status === filter;
        return matchSearch && matchFilter;
    });

    if (!unlocked) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
                {/* Abstract Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 rounded-full blur-[120px]"></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[440px] relative z-10"
                >
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-12 shadow-2xl shadow-blue-500/10 relative">
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 mb-6 group transition-all">
                                <Shield className="text-blue-600 group-hover:scale-110 transition-transform" size={32} />
                            </div>
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Command Center</h2>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Restricted Access Area</p>
                            </div>
                        </div>

                        <form onSubmit={tryUnlock} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity Profile</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Users size={20} />
                                    </div>
                                    <input 
                                        className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all text-sm font-bold" 
                                        placeholder="Admin Name"
                                        value={adminName}
                                        onChange={e => setAdminName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Passkey</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <input 
                                        type="password"
                                        className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all text-sm font-bold" 
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {passError && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 shadow-lg shadow-red-500/5">
                                    <AlertCircle size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-tight">{passError}</span>
                                </motion.div>
                            )}

                            <button 
                                type="submit"
                                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4 group"
                            >
                                <span className="text-sm uppercase tracking-widest">Initialize Protocol</span>
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </button>
                        </form>
                    </div>

                    <p className="text-center mt-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Secured by Aegis Protocol v5.0 Master</p>
                </motion.div>
            </div>
        );
    }

    if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-jakarta">
            <div className="max-w-7xl mx-auto px-5 py-8 lg:py-12 space-y-10">

                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em]">System Live</span>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight">Executive Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={loadData} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-400"><Activity size={20} /></button>
                        <button onClick={exportAnalytics} className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-slate-950/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-wide"><Download size={18} /> Export Analytics</button>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Underwritten', val: fc(stats.totalUnderwritten), icon: 'payments', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Active Proposals', val: stats.activeProposals, icon: 'groups', color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Approval Rate', val: `${stats.approvalRate}%`, icon: 'verified_user', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Processing Time', val: `${stats.avgProcessingTime || 1.2}h`, icon: 'speed', color: 'text-indigo-600', bg: 'bg-indigo-50' }
                    ].map((m, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} 
                            className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm shadow-slate-200/50 flex items-center gap-6 group hover:border-blue-100 transition-all">
                            <div className={`${m.bg} ${m.color} w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <span className="material-symbols-outlined text-[28px] font-bold">{m.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{m.val}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8 pb-20">

                    {/* Proposal Table */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
                            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                                    Recent Proposals 
                                    <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider">{filtered.length} total</span>
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <input placeholder="Search records..." className="bg-slate-50 border-none rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all outline-none w-full md:w-64" value={search} onChange={e => setSearch(e.target.value)} />
                                        <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-[20px] text-slate-300 group-focus-within:text-blue-500 transition-colors">search</span>
                                    </div>
                                    <div className="relative">
                                        <select className="bg-slate-50 border-none rounded-2xl py-3.5 pl-4 pr-10 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none" value={filter} onChange={e => setFilter(e.target.value)}>
                                            <option value="all">Status: All</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="under_review">Review</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-3.5 text-[18px] text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-8 py-6">Insured Entity</th>
                                            <th className="px-6 py-6">Risk Profile</th>
                                            <th className="px-6 py-6 font-primary">Premium</th>
                                            <th className="px-6 py-6">Lifecycle</th>
                                            <th className="px-8 py-6 text-right">Admin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-slate-600">
                                        {filtered.map((p, i) => (
                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shadow-sm border border-blue-100">{p.name?.[0] || 'A'}</div>
                                                        <div>
                                                            <p className="font-extrabold text-slate-900 text-sm tracking-tight">{p.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {p.id.substring(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-950 text-base">{p.emrScore}</span>
                                                        <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${p.riskClass?.includes('IV') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.riskClass}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 font-black text-slate-900 text-sm tracking-tighter">{p.premium ? fc(p.premium.total) : '—'}</td>
                                                <td className="px-6 py-6">
                                                    <div className="relative inline-block">
                                                        <select value={p.status} onChange={e => changeStatus(p.id, e.target.value)} 
                                                            className={`text-[9px] font-black uppercase pl-3 pr-8 py-2 rounded-xl border-none outline-none cursor-pointer appearance-none shadow-sm transition-all
                                                            ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : p.status === 'pending' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'}`}>
                                                            <option value="pending">Pending</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="under_review">Review</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                        <span className="material-symbols-outlined absolute right-1.5 top-1.5 text-[14px] pointer-events-none opacity-50">unfold_more</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setViewProp(p)} className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-100 bg-transparent shadow-none"><Eye size={16} /></button>
                                                        <button onClick={() => setDelProp(p.id)} className="w-9 h-9 flex items-center justify-center hover:bg-red-50 text-red-400 rounded-xl transition-all border border-transparent hover:border-red-100 bg-transparent shadow-none"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Stats */}
                    <div className="space-y-8">

                        {/* Revenue Chart */}
                        <div className="bg-slate-950 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-[-20px] right-[-20px] w-48 h-48 bg-blue-600/10 rounded-full blur-3xl"></div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Portfolio Growth</h4>
                            <h3 className="text-xl font-extrabold mb-10 tracking-tight">Revenue Analytics</h3>

                            <div className="h-44 flex items-end justify-between gap-1.5 mb-8">
                                {(stats.revenueHistory || [20, 45, 30, 60, 40, 75, 55]).map((v, i) => (
                                    <div key={i} className="flex-1 group relative">
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">+{v}%</div>
                                        <div className="w-full bg-white/5 group-hover:bg-blue-500/50 transition-all rounded-t-xl" style={{ height: `${v}%` }} />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                                <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                            </div>
                        </div>

                        {/* Quick Analytics / Alerts */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm shadow-slate-200/50">
                            <h4 className="font-extrabold text-slate-900 mb-8 flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-600 font-bold">notifications_active</span>
                                System Alerts
                            </h4>
                            <div className="space-y-6">
                                {(stats.alerts && stats.alerts.length > 0) ? stats.alerts.map((alert, i) => (
                                    <div key={i} className={`flex gap-4 p-5 rounded-3xl border transition-all ${alert.type === 'danger' ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                        <div className={alert.type === 'danger' ? 'text-red-500' : 'text-emerald-500'}>
                                            <span className="material-symbols-outlined text-[22px] font-bold">{alert.type === 'danger' ? 'error' : 'trending_up'}</span>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-tight ${alert.type === 'danger' ? 'text-red-600' : 'text-emerald-600'}`}>{alert.message}</p>
                                            <p className="text-[10px] text-slate-500 mt-1 font-bold leading-relaxed">{alert.desc}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 space-y-3">
                                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                            <span className="material-symbols-outlined text-[28px]">verified</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">All Systems Nominal</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Modals Updated to Match Light Theme */}
                <AnimatePresence>
                    {viewProp && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewProp(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, y: 20, opacity: 0 }} className="bg-white rounded-[48px] shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden relative z-10">
                                <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Proposal Intelligence</p>
                                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Record Insights</h3>
                                    </div>
                                    <button onClick={() => setViewProp(null)} className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200 bg-transparent shadow-none"><X size={24} /></button>
                                </div>
                                <div className="p-10 overflow-y-auto max-h-[calc(90vh-200px)] space-y-10">
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Insured Entity</p>
                                            <input className="w-full bg-slate-50 border-none rounded-2xl p-4 font-extrabold text-slate-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" value={viewProp.name} onChange={e => setViewProp({ ...viewProp, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">System Hash ID</p>
                                            <div className="p-4 bg-slate-50 rounded-2xl font-mono text-blue-600 font-black text-sm">{viewProp.id}</div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current EMR Index</p>
                                            <p className="text-4xl font-black text-slate-950 tracking-tighter">{viewProp.emrScore}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Calculated Premium</p>
                                            <p className="text-4xl font-black text-blue-600 tracking-tighter">{viewProp.premium ? fc(viewProp.premium.total) : '—'}</p>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100/50 space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px]">terminal</span>
                                            Core Underwriting Logs
                                        </h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Risk Node</span><span className="font-black text-slate-900 text-sm">{viewProp.riskClass}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Input Timestamp</span><span className="font-black text-slate-900 text-sm">{fd(viewProp.createdAt)}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Engine Rev</span><span className="font-black text-slate-900 text-sm">v5.0.2 Stable</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] font-bold text-slate-400 uppercase">Auth Level</span><span className="font-black text-emerald-600 text-sm uppercase">Executive</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-4">
                                    <button onClick={() => setViewProp(null)} className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-all text-xs uppercase tracking-widest border-none bg-transparent">Cancel</button>
                                    <button onClick={handleEditSave} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-[0.15em]">Commit Changes</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {delProp && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDelProp(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 max-w-sm w-full text-center relative z-10">
                                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                                    <span className="material-symbols-outlined text-[40px] font-bold">delete_forever</span>
                                </div>
                                <h3 className="text-3xl font-extrabold text-slate-950 tracking-tight mb-3">Purge Record?</h3>
                                <p className="text-slate-500 font-bold text-sm mb-10 leading-relaxed px-4">This action is irreversible. The data for <span className="text-red-500">{delProp.substring(0, 12)}...</span> will be permanently erased.</p>
                                <div className="flex flex-col gap-4">
                                    <button onClick={confirmDelete} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-red-600/20 active:scale-95 transition-all text-xs uppercase tracking-widest">Confirm Purge</button>
                                    <button onClick={() => setDelProp(null)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest border-none bg-transparent">Abort Action</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
