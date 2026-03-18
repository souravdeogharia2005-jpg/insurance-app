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
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
                {/* Abstract Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[440px] relative z-10"
                >
                    <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl relative">
                        {/* Glow effect on top */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
                        
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-6 group transition-all">
                                <Shield className="text-blue-400 group-hover:scale-110 transition-transform" size={32} />
                            </div>
                            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Command Center</h2>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Restricted Access Area</p>
                            </div>
                        </div>

                        <form onSubmit={tryUnlock} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity Profile</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                        <Users size={20} />
                                    </div>
                                    <input 
                                        className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all text-sm font-medium" 
                                        placeholder="Admin Name"
                                        value={adminName}
                                        onChange={e => setAdminName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Access Passkey</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <input 
                                        type="password"
                                        className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all text-sm font-medium" 
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {passError && (
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20 shadow-lg shadow-red-500/5">
                                    <AlertCircle size={16} />
                                    <span className="text-xs font-bold">{passError}</span>
                                </motion.div>
                            )}

                            <button 
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4 group"
                            >
                                <span>Initialize Protocol</span>
                                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </button>
                        </form>
                    </div>

                    <p className="text-center mt-8 text-slate-600 text-[10px] font-medium uppercase tracking-[0.2em]">Secured by Aegis Protocol v4.0.5</p>
                </motion.div>
            </div>
        );
    }

    if (loading) return <div className="min-h-[80vh] flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-4 lg:py-6 space-y-10">

            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Network Live</span>
                        <span className="text-slate-400 text-xs font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Executive Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={loadData} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:bg-slate-50 transition-all text-slate-500"><Activity size={20} /></button>
                    <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2"><Download size={18} /> Export Analytics</button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Underwritten', val: fc(stats.totalUnderwritten), icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Active Proposals', val: stats.activeProposals, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Approval Rate', val: `${stats.approvalRate}%`, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Processing Time', val: `${stats.avgProcessingTime || 1.2}h`, icon: Activity, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
                ].map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-2xl flex items-center gap-5 group hover:border-white/10 transition-all">
                        <div className={`${m.bg} ${m.color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}><m.icon size={24} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{m.label}</p>
                            <p className="text-2xl font-black text-white">{m.val}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                {/* Proposal Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">Recent Submissions <span className="bg-white/5 text-slate-400 text-xs px-2 py-0.5 rounded-md font-bold">{filtered.length}</span></h3>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <input placeholder="Filter name or ID..." className="bg-white/5 border border-white/5 rounded-xl p-3 pl-10 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none text-white placeholder:text-slate-500" value={search} onChange={e => setSearch(e.target.value)} />
                                    <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                                </div>
                                <select className="bg-white/5 border border-white/5 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer text-white" value={filter} onChange={e => setFilter(e.target.value)}>
                                    <option className="bg-[#0F172A]" value="all">All</option>
                                    <option className="bg-[#0F172A]" value="pending">Pending</option>
                                    <option className="bg-[#0F172A]" value="approved">Approved</option>
                                    <option className="bg-[#0F172A]" value="under_review">Review</option>
                                </select>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        <th className="px-8 py-5">Profile</th>
                                        <th className="px-6 py-5">EMR / Risk</th>
                                        <th className="px-6 py-5">Premium</th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-slate-300">
                                    {filtered.map((p, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-xs">{p.name?.[0] || 'A'}</div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{p.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{p.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-white">{p.emrScore}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.riskClass?.includes('IV') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{p.riskClass}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-bold text-slate-300 text-sm">{p.premium ? fc(p.premium.total) : '—'}</td>
                                            <td className="px-6 py-5">
                                                <select value={p.status} onChange={e => changeStatus(p.id, e.target.value)} className={`text-[10px] font-black uppercase px-4 py-2 rounded-full border-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer ${p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                    <option className="bg-[#0F172A]" value="pending">Pending</option>
                                                    <option className="bg-[#0F172A]" value="approved">Approved</option>
                                                    <option className="bg-[#0F172A]" value="under_review">Review</option>
                                                    <option className="bg-[#0F172A]" value="rejected">Rejected</option>
                                                </select>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setViewProp(p)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><Eye size={16} /></button>
                                                    <button onClick={() => setDelProp(p.id)} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"><Trash2 size={16} /></button>
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

                    {/* Revenue Chart (Mock SVG) */}
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={100} /></div>
                        <h4 className="text-xs font-black uppercase tracking-[0.21em] text-primary mb-1">Growth Forecast</h4>
                        <h3 className="text-xl font-bold mb-10">Revenue Analytics</h3>

                        <div className="h-40 flex items-end justify-between gap-1 mb-6">
                            {(stats.revenueHistory || [20, 45, 30, 60, 40, 75, 55]).map((v, i) => (
                                <div key={i} className="flex-1 group relative">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">+{v}%</div>
                                    <div className="w-full bg-white/5 group-hover:bg-primary/40 transition-all rounded-t-lg" style={{ height: `${v}%` }} />
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
                            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                        </div>
                    </div>

                    {/* Quick Analytics / Alerts */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl">
                        <h4 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Bell size={18} className="text-primary" /> Active Alerts</h4>
                        <div className="space-y-6">
                            {(stats.alerts && stats.alerts.length > 0) ? stats.alerts.map((alert, i) => (
                                <div key={i} className={`flex gap-4 p-4 rounded-2xl border transition-all ${alert.type === 'danger' ? 'bg-red-500/5 border-red-500/10' : 'bg-green-500/5 border-green-500/10'}`}>
                                    <div className={alert.type === 'danger' ? 'text-red-500' : 'text-green-500'}>
                                        {alert.type === 'danger' ? <X size={18} /> : <TrendingUp size={18} />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${alert.type === 'danger' ? 'text-red-500' : 'text-green-500'}`}>{alert.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">{alert.desc}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 font-bold text-center py-4">No active system alerts.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* View/Edit Modal */}
            <AnimatePresence>
                {viewProp && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewProp(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-hidden relative z-10">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Proposal Insights</h3>
                                <button onClick={() => setViewProp(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500"><X size={24} /></button>
                            </div>
                            <div className="p-10 overflow-y-auto max-h-[calc(90vh-180px)] space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Insured Name</p><input className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 font-bold" value={viewProp.name} onChange={e => setViewProp({ ...viewProp, name: e.target.value })} /></div>
                                    <div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Policy ID</p><p className="font-mono text-primary font-black">{viewProp.id}</p></div>
                                    <div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">EMR Index</p><p className="text-2xl font-black text-slate-900 dark:text-white">{viewProp.emrScore}</p></div>
                                    <div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Calculated Premium</p><p className="text-2xl font-black text-primary">{viewProp.premium ? fc(viewProp.premium.total) : '—'}</p></div>
                                </div>

                                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">System Logs</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm"><span>Risk Category</span><span className="font-bold text-primary">{viewProp.riskClass}</span></div>
                                        <div className="flex justify-between text-sm"><span>Submission Date</span><span className="font-bold">{fd(viewProp.createdAt)}</span></div>
                                        <div className="flex justify-between text-sm"><span>Underwriting Engine</span><span className="font-bold">v4.0.2-stable</span></div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
                                <button onClick={() => setViewProp(null)} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Discard</button>
                                <button onClick={handleEditSave} className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Save Changes</button>
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
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full text-center relative z-10">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Delete Record?</h3>
                            <p className="text-slate-500 mb-8">This action is irreversible. The policy data for <span className="font-bold text-slate-900 dark:text-white">{delProp}</span> will be purged.</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={confirmDelete} className="w-full bg-red-500 text-white py-4 rounded-xl font-black shadow-xl shadow-red-500/20 active:scale-95 transition-all">Confirm Deletion</button>
                                <button onClick={() => setDelProp(null)} className="w-full py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Dismiss</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
