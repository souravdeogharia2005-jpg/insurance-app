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
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-5 py-8 space-y-10">
                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Network Operational</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
                        <p className="text-slate-400 text-xs font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={loadData} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all text-slate-400">
                            <span className="material-symbols-outlined text-[22px]">refresh</span>
                        </button>
                        <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-slate-900/10 flex items-center gap-2 hover:bg-black transition-all">
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            <span className="text-xs uppercase tracking-widest">Export Analytics</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Underwritten', val: fc(stats.totalUnderwritten), icon: 'wallet', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Active Proposals', val: stats.activeProposals, icon: 'groups', color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Approval Rate', val: `${stats.approvalRate}%`, icon: 'verified_user', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Processing Time', val: `${stats.avgProcessingTime || 1.2}h`, icon: 'bolt', color: 'text-indigo-600', bg: 'bg-indigo-50' }
                    ].map((m, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} 
                            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                            <div className={`${m.bg} ${m.color} w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <span className="material-symbols-outlined text-[26px] font-bold">{m.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                                <p className="text-2xl font-black text-slate-900">{m.val}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Proposal Table */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-3">
                                        Recent Submissions
                                        <span className="bg-slate-50 text-slate-400 text-[10px] px-2.5 py-1 rounded-full font-black tracking-tighter">{filtered.length} RECORDS</span>
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input placeholder="Search records..." className="bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/5 focus:bg-white outline-none text-slate-900 placeholder:text-slate-400 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
                                        <span className="material-symbols-outlined absolute left-3.5 top-3 text-[18px] text-slate-300">search</span>
                                    </div>
                                    <select className="bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-[10px] font-black uppercase outline-none cursor-pointer text-slate-600 focus:bg-white transition-all appearance-none" value={filter} onChange={e => setFilter(e.target.value)}>
                                        <option value="all">ALL STATUS</option>
                                        <option value="pending">PENDING</option>
                                        <option value="approved">APPROVED</option>
                                        <option value="under_review">REVIEW</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-8 py-5">Profile</th>
                                            <th className="px-6 py-5 text-center">EMR / Risk</th>
                                            <th className="px-6 py-5 text-center">Premium</th>
                                            <th className="px-6 py-5 text-center">Status</th>
                                            <th className="px-8 py-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filtered.map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">{p.name?.[0] || 'A'}</div>
                                                        <div>
                                                            <p className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.name}</p>
                                                            <p className="text-[9px] text-slate-300 font-black tracking-widest uppercase mt-0.5">{p.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-black text-slate-900 text-sm">{p.emrScore}</span>
                                                        <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-tighter ${p.riskClass?.includes('IV') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{p.riskClass}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <p className="font-black text-slate-900 text-sm">{p.premium ? fc(p.premium.total) : '—'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">Annually</p>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <select value={p.status} onChange={e => changeStatus(p.id, e.target.value)} className={`text-[9px] font-black uppercase px-4 py-2.5 rounded-xl border border-transparent focus:border-blue-500 outline-none cursor-pointer transition-all ${p.status === 'approved' ? 'bg-emerald-500 text-white' : p.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                                                        <option value="pending">Pending</option>
                                                        <option value="approved">Approved</option>
                                                        <option value="under_review">Review</option>
                                                        <option value="rejected">Rejected</option>
                                                    </select>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setViewProp(p)} className="w-9 h-9 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all"><Eye size={16} /></button>
                                                        <button onClick={() => setDelProp(p.id)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
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
                        {/* Analytics Card */}
                        <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Growth Index</h4>
                            <h3 className="text-xl font-extrabold mb-10 tracking-tight">System Revenue</h3>

                            <div className="h-32 flex items-end justify-between gap-1.5 mb-8">
                                {(stats.revenueHistory || [20, 45, 30, 60, 40, 75, 55]).map((v, i) => (
                                    <div key={i} className="flex-1 group/bar relative">
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[9px] font-black px-2 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-all duration-200">+{v}%</div>
                                        <div className="w-full bg-white/10 group-hover/bar:bg-blue-500 transition-all rounded-t-lg" style={{ height: `${v}%` }} />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                            </div>
                        </div>

                        {/* Recent Alerts */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                            <h4 className="font-extrabold text-slate-900 mb-6 flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-600 text-[20px]">notifications</span>
                                System Alerts
                            </h4>
                            <div className="space-y-4">
                                {(stats.alerts && stats.alerts.length > 0) ? stats.alerts.map((alert, i) => (
                                    <div key={i} className={`flex gap-4 p-4 rounded-[24px] border transition-all ${alert.type === 'danger' ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                        <div className={alert.type === 'danger' ? 'text-red-500' : 'text-emerald-500'}>
                                            <span className="material-symbols-outlined text-[20px]">{alert.type === 'danger' ? 'error' : 'trending_up'}</span>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-tight ${alert.type === 'danger' ? 'text-red-700' : 'text-emerald-700'}`}>{alert.message}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{alert.desc}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 space-y-2">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                                            <span className="material-symbols-outlined text-[24px]">verified</span>
                                        </div>
                                        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">System parameters stable</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals Refactoring to Light Mode (Same JSX with light classes) */}
                <AnimatePresence>
                    {viewProp && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewProp(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[48px] shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] overflow-hidden relative z-10">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                            <span className="material-symbols-outlined font-bold text-[24px]">analytics</span>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Proposal Insights</h3>
                                            <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{viewProp.id}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setViewProp(null)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                                        <span className="material-symbols-outlined text-[20px] font-bold">close</span>
                                    </button>
                                </div>
                                <div className="p-10 overflow-y-auto max-h-[calc(90vh-180px)] space-y-8">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Insured Name</p>
                                            <input className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 font-extrabold text-slate-900 text-sm focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" value={viewProp.name} onChange={e => setViewProp({ ...viewProp, name: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EMR Index</p>
                                            <div className="w-full bg-slate-900 rounded-2xl px-5 py-3.5 flex items-center justify-between">
                                                <span className="font-black text-white text-lg">{viewProp.emrScore}</span>
                                                <span className="text-blue-400 font-black text-[10px] uppercase tracking-tighter">Live Score</span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Annual Premium Calculation</p>
                                            <div className="w-full bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-center justify-between">
                                                <span className="text-3xl font-black text-blue-600 tracking-tighter">{viewProp.premium ? fc(viewProp.premium.total) : '—'}</span>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-blue-400 uppercase">Class {viewProp.riskClass}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fd(viewProp.createdAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50 rounded-[32px] space-y-4 border border-slate-100/50">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px]">terminal</span>
                                            Internal Analytics Log
                                        </h4>
                                        <div className="space-y-3.5">
                                            {[
                                                { k: 'Risk Category', v: viewProp.riskClass, c: 'text-blue-600' },
                                                { k: 'Underwriting Engine', v: 'v5.0.4-premium', c: 'text-slate-900' },
                                                { k: 'System Status', v: 'VERIFIED', c: 'text-emerald-600' }
                                            ].map((log, i) => (
                                                <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                                                    <span className="text-slate-400">{log.k}</span>
                                                    <span className={log.c}>{log.v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex gap-4">
                                    <button onClick={() => setViewProp(null)} className="flex-1 py-4 rounded-[20px] font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Discard Changes</button>
                                    <button onClick={handleEditSave} className="flex-[1.5] bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-900/10 hover:bg-black transition-all">Update Proposal</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Delete Confirmation */}
                <AnimatePresence>
                    {delProp && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDelProp(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 max-w-xs w-full text-center relative z-10">
                                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner shadow-red-500/5">
                                    <span className="material-symbols-outlined text-[40px] font-bold">delete_forever</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Purge Record?</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed px-4">This action is irreversible. The policy data for <span className="text-slate-900">{delProp}</span> will be permanently deleted.</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={confirmDelete} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all">Confirm Deletion</button>
                                    <button onClick={() => setDelProp(null)} className="w-full py-4 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Dismiss</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
