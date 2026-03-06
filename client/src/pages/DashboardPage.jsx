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
        <div className="pt-16">
            {/* Desktop Dashboard */}
            <div className="hidden md:block">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-deep dark:text-white tracking-tight">Recommendation Engine</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Personalized policy analytics based on AI risk profiling.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => navigate('/proposal')} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                            <span className="material-symbols-outlined text-lg">add_circle</span> {t('newProposal')}
                        </button>
                        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                            <span className="material-symbols-outlined text-lg">admin_panel_settings</span> {t('admin')}
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* Stats */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-gradient-to-r from-primary to-secondary px-6 py-2">
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">verified</span> AegisAI Dashboard Overview
                                </p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-4 gap-4">
                                    {[
                                        { label: t('totalProposals'), value: proposals.length, icon: 'description', color: 'text-primary', bg: 'bg-primary/10' },
                                        { label: t('approvalRate'), value: approvalRate + '%', icon: 'check_circle', color: 'text-accent', bg: 'bg-accent/10' },
                                        { label: t('avgEMR'), value: avgEMR, icon: 'monitor_heart', color: 'text-secondary', bg: 'bg-secondary/10' },
                                        { label: t('totalPremium'), value: fc(totalPremium), icon: 'payments', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`${s.bg} ${s.color} w-8 h-8 rounded-lg flex items-center justify-center`}>
                                                    <span className="material-symbols-outlined text-lg">{s.icon}</span>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-400 uppercase">{s.label}</p>
                                            </div>
                                            <p className="text-2xl font-black text-deep dark:text-white">{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Analytics Charts */}
                        {proposals.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                                    <h3 className="font-bold text-deep dark:text-white text-sm mb-4">Risk Class Distribution</h3>
                                    <div className="h-64 w-full text-xs">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                                    <h3 className="font-bold text-deep dark:text-white text-sm mb-4">Proposal Statuses</h3>
                                    <div className="h-64 w-full text-xs flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                    {statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Info Banner for Edits */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-xl mb-6 flex items-start gap-3 shadow-sm">
                            <span className="material-symbols-outlined text-blue-500 mt-0.5">info</span>
                            <div>
                                <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Need to update a proposal?</h4>
                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                    To ensure data integrity, submitted proposals cannot be directly edited. If you need to make changes to your existing proposals, please email our support team at <a href="mailto:porschegt651@gmail.com" className="font-bold underline">porschegt651@gmail.com</a>.
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-4">
                                <h3 className="font-bold text-deep dark:text-white">All Proposals</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">Filter:</span>
                                    <select
                                        className="form-select border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs py-1.5 px-3 rounded-lg font-semibold text-slate-700 dark:text-slate-300 outline-none w-auto min-w-[120px]"
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                    >
                                        <option value="all">{t('allStatus')}</option>
                                        <option value="pending">{t('pending')}</option>
                                        <option value="approved">{t('approved')}</option>
                                        <option value="rejected">{t('rejected')}</option>
                                        <option value="under_review">{t('underReview')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead><tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">ID</th>
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">Name</th>
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">EMR</th>
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">Risk</th>
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">Premium</th>
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">Status</th>
                                        <th className="px-6 py-3 font-bold text-slate-400 uppercase text-[10px]">Date</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredProposals.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">{t('noProposals')}</td></tr>}
                                        {filteredProposals.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs">{p.id}</td>
                                                <td className="px-6 py-4 font-bold text-deep dark:text-white"><span className="opacity-60">{p.name || '—'}</span></td>
                                                <td className="px-6 py-4"><span className={`font-black ${emrColor(p.emrScore)}`}>{p.emrScore || '—'}</span></td>
                                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-black ${p.riskClass?.includes('IV') || p.riskClass?.includes('V') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : p.riskClass === 'Class III' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-accent/10 text-accent'}`}>{p.riskClass || '—'}</span></td>
                                                <td className="px-6 py-4 font-bold text-deep dark:text-white"><span className={user?.role === 'admin' ? '' : 'select-none transition-all cursor-not-allowed'} style={user?.role === 'admin' ? {} : { filter: 'blur(6px)' }} title={user?.role === 'admin' ? '' : 'Premium hidden'}>{p.premium ? fc(p.premium.total) : '—'}</span></td>
                                                <td className="px-6 py-4"><span className={`px-2 py-1 ${statusColor(p.status)} rounded text-[10px] font-black`}>{fmtStatus(p.status)}</span></td>
                                                <td className="px-6 py-4 text-slate-400">{fd(p.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {/* Right Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-sm font-black text-deep dark:text-white uppercase tracking-wider mb-6">User Risk Profile</h3>
                            <div className="relative aspect-square flex items-center justify-center">
                                <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full flex items-center justify-center">
                                    <div className="w-48 h-48 bg-primary/10 dark:bg-primary/15 rounded-full flex items-center justify-center"><div className="w-24 h-24 bg-primary/20 dark:bg-primary/25 rounded-full" /></div>
                                </div>
                                <svg className="w-full h-full relative z-10 opacity-80" viewBox="0 0 100 100">
                                    <polygon fill="none" stroke="currentColor" strokeWidth="0.5" points="50,10 90,40 75,90 25,90 10,40" className="text-slate-300 dark:text-slate-700" />
                                    <polygon fill="none" stroke="currentColor" strokeWidth="0.5" points="50,30 70,45 65,70 35,70 30,45" className="text-slate-300 dark:text-slate-700" />
                                    <polygon fill="currentColor" points="50,15 85,38 70,85 40,80 20,42" className="text-primary/30" />
                                    <text x="50" y="8" textAnchor="middle" fontSize="4" className="fill-slate-500 font-bold">HEALTH</text>
                                    <text x="94" y="42" textAnchor="start" fontSize="4" className="fill-slate-500 font-bold">FINANCE</text>
                                    <text x="78" y="96" textAnchor="middle" fontSize="4" className="fill-slate-500 font-bold">LIFESTYLE</text>
                                    <text x="22" y="96" textAnchor="middle" fontSize="4" className="fill-slate-500 font-bold">TRAVEL</text>
                                    <text x="6" y="42" textAnchor="end" fontSize="4" className="fill-slate-500 font-bold">PROPERTY</text>
                                </svg>
                            </div>
                            <div className="mt-6 space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Overall Risk Level</span>
                                    <span className={`font-bold ${avgEMR <= 110 ? 'text-accent' : avgEMR <= 130 ? 'text-amber-600' : 'text-red-600'}`}>{avgEMR <= 110 ? 'LOW' : avgEMR <= 130 ? 'MODERATE' : 'HIGH'}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${avgEMR <= 110 ? 'bg-accent' : avgEMR <= 130 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: Math.min(avgEMR, 200) / 2 + '%' }} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                            <h3 className="text-sm font-black text-deep dark:text-white uppercase tracking-wider mb-6">{t('riskDistribution')}</h3>
                            <div className="h-48 flex items-end justify-between gap-2 px-2">
                                {['Class I', 'Class II', 'Class III', 'Class IV', 'Class V'].map(cls => {
                                    const count = riskCounts[cls] || 0;
                                    const maxCount = Math.max(...Object.values(riskCounts), 1);
                                    const height = count > 0 ? Math.max((count / maxCount) * 100, 10) : 5;
                                    const isHighest = count === maxCount && count > 0;
                                    return (
                                        <div key={cls} className="flex-1 flex flex-col items-center gap-2 group">
                                            <span className="text-[10px] font-bold text-slate-500">{count}</span>
                                            <div className={`w-full ${isHighest ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-primary/20'} rounded-t transition-all`} style={{ height: height + '%' }} />
                                            <span className={`text-[9px] ${isHighest ? 'font-black text-primary' : 'font-bold text-slate-400'}`}>{cls.replace('Class ', '')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-xl p-6 border border-primary/10 dark:border-primary/20">
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined text-primary mt-1">lightbulb</span>
                                <div>
                                    <p className="text-sm font-bold text-deep dark:text-white">AI Insight</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                        {proposals.length > 0 ? `Based on ${proposals.length} proposals, your average EMR is ${avgEMR}. ${avgEMR <= 110 ? 'Great risk profile! Most proposals qualify for standard rates.' : 'Consider reviewing lifestyle factors to reduce premiums.'}` : 'Create your first proposal to get personalized AI insights.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Dashboard */}
            <div className="md:hidden pb-24">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                            <span className="material-symbols-outlined text-primary">person</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">Welcome back,</p>
                            <h1 className="text-lg font-bold leading-none text-deep dark:text-white">{user?.name?.split(' ')[0] || 'User'}</h1>
                        </div>
                    </div>
                    <button className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white dark:border-deep" />
                    </button>
                </div>
                <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-3xl p-6 shadow-xl relative overflow-hidden mb-6">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-white/70 text-sm font-medium">Overall AI Risk Score</h3>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold">{avgEMR}</span>
                                <span className="text-accent text-sm font-bold leading-none">EMR</span>
                            </div>
                            <p className="text-white/50 text-xs mt-2">Status: <span className={avgEMR <= 110 ? 'text-accent' : avgEMR <= 130 ? 'text-amber-400' : 'text-red-400'}>{avgEMR <= 110 ? 'Low Risk' : avgEMR <= 130 ? 'Moderate' : 'High Risk'}</span></p>
                        </div>
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="stroke-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
                                <path className="stroke-accent" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeDasharray={`${Math.min(avgEMR / 2, 100)}, 100`} strokeLinecap="round" strokeWidth="3" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center"><span className="material-symbols-outlined text-accent text-3xl">verified_user</span></div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/20 blur-3xl rounded-full" />
                </div>
                <h2 className="text-base font-bold mb-4 text-deep dark:text-white">Quick Actions</h2>
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { icon: 'add_moderator', label: t('newProposal'), to: '/proposal' },
                        { icon: 'document_scanner', label: t('scan'), to: '/scan' },
                        { icon: 'admin_panel_settings', label: t('admin'), to: '/admin' },
                        { icon: 'psychology', label: 'AI Advice', to: '/dashboard' },
                    ].map((a, i) => (
                        <button key={i} onClick={() => navigate(a.to)} className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">{a.icon}</span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{a.label}</span>
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                        { label: t('totalProposals'), value: proposals.length, icon: 'description', color: 'text-primary', bg: 'bg-primary/10' },
                        { label: t('approvalRate'), value: approvalRate + '%', icon: 'check_circle', color: 'text-accent', bg: 'bg-accent/10' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className={`${s.bg} ${s.color} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}><span className="material-symbols-outlined text-lg">{s.icon}</span></div>
                            <p className="text-2xl font-black text-deep dark:text-white">{s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-base font-bold text-deep dark:text-white">All Proposals</h2>
                    <select
                        className="form-select border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs py-1.5 px-3 rounded-lg font-semibold text-slate-700 dark:text-slate-300 outline-none w-auto"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="all">{t('allStatus')}</option>
                        <option value="pending">{t('pending')}</option>
                        <option value="approved">{t('approved')}</option>
                        <option value="rejected">{t('rejected')}</option>
                        <option value="under_review">{t('underReview')}</option>
                    </select>
                </div>
                <div className="space-y-4 mb-6">
                    {filteredProposals.length === 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                            <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">folder_open</span>
                            <p className="text-slate-500 text-sm">{t('noProposals')}</p>
                            <button onClick={() => navigate('/proposal')} className="mt-3 text-sm font-bold text-primary">{t('newProposal')}</button>
                        </div>
                    )}
                    {filteredProposals.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><span className="material-symbols-outlined">shield</span></div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-deep dark:text-white text-sm">{p.name || p.id}</h4>
                                    <span className={`px-2 py-0.5 ${statusColor(p.status)} text-[10px] font-bold rounded-full uppercase`}>{fmtStatus(p.status)}</span>
                                </div>
                                <p className="text-slate-500 text-xs mt-0.5">Premium: <span className={`font-semibold text-deep dark:text-white ${user?.role === 'admin' ? '' : 'select-none transition-all cursor-not-allowed'}`} style={user?.role === 'admin' ? {} : { filter: 'blur(6px)' }} title={user?.role === 'admin' ? '' : 'Premium hidden'}>{p.premium ? fc(p.premium.total) : '—'}</span></p>
                                <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${p.emrScore <= 110 ? 'bg-accent' : p.emrScore <= 130 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: Math.min(p.emrScore || 50, 200) / 2 + '%' }} />
                                </div>
                                <div className="flex justify-between mt-1.5">
                                    <p className="text-[10px] text-slate-400">EMR: {p.emrScore || '—'}</p>
                                    <p className="text-[10px] text-slate-400">{p.riskClass || '—'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
