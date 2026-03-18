import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAdminProposals } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function DashboardPage() {
    const { t, fc, fd } = useApp();
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { getAdminProposals().then(p => { setProposals(p); setLoading(false); }).catch(() => setLoading(false)); }, []);

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" /></div>;

    const approved = proposals.filter(p => p.status === 'approved').length;
    const approvalRate = proposals.length ? Math.round((approved / proposals.length) * 100) : 0;
    const avgEMR = proposals.length ? Math.round(proposals.reduce((s, p) => s + (p.emrScore || 100), 0) / proposals.length) : 100;
    const totalPremium = proposals.reduce((s, p) => s + ((p.premium?.total) || 0), 0);
    const fmtStatus = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
    const statusColor = (s) => ({ approved: 'bg-accent/10 text-accent', pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', under_review: 'bg-primary/10 text-primary' }[s] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400');
    const emrColor = (e) => { if (!e) return ''; if (e <= 110) return 'text-accent'; if (e <= 130) return 'text-amber-600'; return 'text-red-600'; };
    const riskCounts = {};
    const statusCounts = {};
    proposals.forEach(p => {
        if (p.riskClass) riskCounts[p.riskClass] = (riskCounts[p.riskClass] || 0) + 1;
        if (p.status) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    const riskData = Object.entries(riskCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name: fmtStatus(name), value }));
    const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

    const filteredProposals = proposals.filter(p => filter === 'all' || p.status === filter);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            <div className="max-w-7xl mx-auto px-5 py-8 space-y-10">
                {/* Desktop Dashboard */}
                <div className="hidden md:block space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Recommendation Engine</h1>
                            <p className="text-slate-400 text-sm font-bold">Personalized policy analytics based on AI risk profiling.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => navigate('/proposal')} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                                <span className="material-symbols-outlined text-[20px]">add_circle</span> {t('newProposal')}
                            </button>
                            <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-black transition-all">
                                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span> {t('admin')}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                            {/* Stats */}
                            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="bg-slate-900 px-8 py-3 flex items-center justify-between">
                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.25em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xs text-blue-400">verified</span> AegisAI System Monitor
                                    </p>
                                    <span className="text-[10px] font-black text-white/30 tracking-widest">STABLE v5.0</span>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-4 gap-6">
                                        {[
                                            { label: t('totalProposals'), value: proposals.length, icon: 'description', color: 'text-blue-600', bg: 'bg-blue-50' },
                                            { label: t('approvalRate'), value: approvalRate + '%', icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                            { label: t('avgEMR'), value: avgEMR, icon: 'monitor_heart', color: 'text-amber-600', bg: 'bg-amber-50' },
                                            { label: t('totalPremium'), value: fc(totalPremium), icon: 'payments', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                        ].map((s, i) => (
                                            <div key={i} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-50">
                                                <div className="flex items-center gap-2.5 mb-3">
                                                    <div className={`${s.bg} ${s.color} w-9 h-9 rounded-xl flex items-center justify-center`}>
                                                        <span className="material-symbols-outlined text-[18px] font-bold">{s.icon}</span>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{s.label}</p>
                                                </div>
                                                <p className="text-xl font-black text-slate-900">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Analytics Charts */}
                            {proposals.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8">
                                        <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-6">Risk Distribution</h3>
                                        <div className="h-64 w-full text-xs">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 700, fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 700, fontSize: 10 }} />
                                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 800 }} />
                                                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8 flex flex-col items-center">
                                        <h3 className="w-full text-left font-black text-slate-900 text-xs uppercase tracking-widest mb-6">Status Breakdown</h3>
                                        <div className="h-64 w-full text-xs">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" label={({ name, percent }) => `${name}`}>
                                                        {statusData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 800 }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                    <h3 className="font-extrabold text-slate-900 tracking-tight text-lg">Comprehensive History</h3>
                                    <select
                                        className="bg-white border border-slate-100 text-[10px] font-black py-2 px-4 rounded-xl uppercase tracking-widest outline-none cursor-pointer text-slate-500 hover:text-slate-900 transition-all shadow-sm"
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                    >
                                        <option value="all">ALL ENTRIES</option>
                                        <option value="pending">PENDING</option>
                                        <option value="approved">APPROVED</option>
                                        <option value="under_review">REVIEW</option>
                                    </select>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead><tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            <th className="px-8 py-4">Index</th>
                                            <th className="px-6 py-4">Submission</th>
                                            <th className="px-6 py-4 text-center">EMR</th>
                                            <th className="px-6 py-4 text-center">Risk Class</th>
                                            <th className="px-6 py-4 text-right">Premium</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredProposals.length === 0 && <tr><td colSpan={6} className="px-8 py-16 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No records indexed</td></tr>}
                                            {filteredProposals.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-5 font-bold text-slate-300 text-[10px]">{p.id.slice(0, 8)}...</td>
                                                    <td className="px-6 py-5">
                                                        <p className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.name || 'Anonymous'}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{fd(p.createdAt)}</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-center"><span className={`font-black text-base ${emrColor(p.emrScore)}`}>{p.emrScore || '—'}</span></td>
                                                    <td className="px-6 py-5 text-center"><span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${p.riskClass?.includes('IV') ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{p.riskClass || '—'}</span></td>
                                                    <td className="px-6 py-5 text-right font-black text-slate-900">{p.premium ? fc(p.premium.total) : '—'}</td>
                                                    <td className="px-6 py-5 text-center"><span className={`px-3 py-1.5 ${statusColor(p.status)} rounded-xl text-[9px] font-black uppercase tracking-widest`}>{fmtStatus(p.status)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-8">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8">AI Bio-Risk Profiler</h3>
                                <div className="relative aspect-square flex items-center justify-center mb-8">
                                    <div className="absolute inset-0 bg-blue-50/50 rounded-full flex items-center justify-center">
                                        <div className="w-48 h-48 bg-blue-100/50 rounded-full flex items-center justify-center"><div className="w-24 h-24 bg-blue-200/50 rounded-full" /></div>
                                    </div>
                                    <svg className="w-full h-full relative z-10 opacity-60" viewBox="0 0 100 100">
                                        <polygon fill="none" stroke="#cbd5e1" strokeWidth="0.5" points="50,10 90,40 75,90 25,90 10,40" />
                                        <polygon fill="none" stroke="#cbd5e1" strokeWidth="0.5" points="50,30 70,45 65,70 35,70 30,45" />
                                        <polygon fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="1" points="50,15 85,38 70,85 40,80 20,42" />
                                        <text x="50" y="8" textAnchor="middle" fontSize="3" className="fill-slate-400 font-black uppercase">MEDICAL</text>
                                        <text x="94" y="42" textAnchor="start" fontSize="3" className="fill-slate-400 font-black uppercase">FINANCE</text>
                                        <text x="78" y="96" textAnchor="middle" fontSize="3" className="fill-slate-400 font-black uppercase">HABITS</text>
                                        <text x="22" y="96" textAnchor="middle" fontSize="3" className="fill-slate-400 font-black uppercase">LIFESTYLE</text>
                                        <text x="6" y="42" textAnchor="end" fontSize="3" className="fill-slate-400 font-black uppercase">HISTORY</text>
                                    </svg>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Risk</span>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${avgEMR <= 110 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {avgEMR <= 110 ? 'Standard' : 'Elevated'}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden p-1 border border-slate-100">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${avgEMR <= 110 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: Math.min(avgEMR/2, 100) + '%' }} />
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Aegis AI Summary</p>
                                        <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
                                            {proposals.length > 0 ? `Detected ${proposals.length} signatures with an average EMR of ${avgEMR}. Core risk is within acceptable parameters.` : 'Awaiting data ingestion for profile analysis.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Dashboard */}
                <div className="md:hidden space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                <span className="material-symbols-outlined">person</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Operator</p>
                                <h1 className="text-xl font-extrabold text-slate-900 leading-none mt-1">{user?.name?.split(' ')[0] || 'Aegis Admin'}</h1>
                            </div>
                        </div>
                        <button className="w-11 h-11 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
                        </button>
                    </div>

                    <div className="bg-slate-900 text-white rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="space-y-1">
                                <h3 className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Bio-Risk Index</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black tracking-tighter">{avgEMR}</span>
                                    <span className="text-blue-400 text-xs font-black uppercase tracking-widest">EMR SCORE</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg">
                                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Status</p>
                                    <p className={`text-xs font-black uppercase ${avgEMR <= 110 ? 'text-emerald-400' : 'text-blue-400'}`}>{avgEMR <= 110 ? 'Standard Class' : 'Preferred Plus'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Protocols</h2>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { icon: 'add_moderator', label: 'New', to: '/proposal', bg: 'bg-emerald-50', c: 'text-emerald-600' },
                                { icon: 'document_scanner', label: 'Scan', to: '/scan', bg: 'bg-blue-50', c: 'text-blue-600' },
                                { icon: 'admin_panel_settings', label: 'Admin', to: '/admin', bg: 'bg-slate-100', c: 'text-slate-900' },
                                { icon: 'psychology', label: 'AI', to: '/dashboard', bg: 'bg-indigo-50', c: 'text-indigo-600' },
                            ].map((a, i) => (
                                <button key={i} onClick={() => navigate(a.to)} className="flex flex-col items-center gap-3 active:scale-95 transition-all">
                                    <div className={`${a.bg} ${a.c} w-16 h-16 rounded-[24px] shadow-sm flex items-center justify-center`}>
                                        <span className="material-symbols-outlined text-[24px] font-bold">{a.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Latest Records</h2>
                            <button className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">View All</button>
                        </div>
                        <div className="space-y-4">
                            {filteredProposals.slice(0, 3).map(p => (
                                <div key={p.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 flex gap-4 active:bg-slate-50 transition-colors">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <span className="material-symbols-outlined">shield</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-exrabold text-slate-900 text-sm tracking-tight">{p.name || 'Anonymous Submission'}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold">{fd(p.createdAt)}</p>
                                            </div>
                                            <span className={`px-3 py-1 ${statusColor(p.status)} text-[9px] font-black rounded-xl uppercase tracking-widest`}>{fmtStatus(p.status)}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-black text-slate-900 tracking-tight">{p.emrScore}</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">EMR</span>
                                            </div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{p.riskClass}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
