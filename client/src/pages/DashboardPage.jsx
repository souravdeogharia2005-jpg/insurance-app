import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAdminProposals } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, Zap, TrendingUp, ShieldAlert } from 'lucide-react';
import SplitText from '../components/SplitText';

export default function DashboardPage() {
    const { t, fc, fd } = useApp();
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { getAdminProposals().then(p => { setProposals(p); setLoading(false); }).catch(() => setLoading(false)); }, []);

    if (loading) return <div className="w-full h-full min-h-[60vh] flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" /></div>;

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

    // Generate Smart Alerts based on top EMR cases
    const highRiskProposals = proposals.filter(p => (p.emrScore || 0) >= 150).sort((a,b) => b.emrScore - a.emrScore).slice(0, 3);
    const smokingCases = proposals.filter(p => parseInt(p.smoking||0) >= 2);

    return (
        <div className="bg-[#F8FAFC] w-full">
            {/* Desktop Dashboard */}
            <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{color:'#1E3A8A'}}>
                            <SplitText
                                text={t('dashboard') === 'Dashboard' ? 'Recommendation Engine' : t('dashboard')}
                                delay={35}
                                duration={0.55}
                                from={{ opacity: 0, y: 28 }}
                                to={{ opacity: 1, y: 0 }}
                                splitType="chars"
                                tag="span"
                            />
                        </h1>
                        <p className="mt-1 font-medium" style={{color:'#475569'}}>{t('avgEMR') ? t('aiPlatform') || 'Personalized policy analytics based on AI risk profiling.' : 'Personalized policy analytics based on AI risk profiling.'}</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => navigate('/proposal')} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all text-slate-700">
                            <span className="material-symbols-outlined text-lg">add_circle</span> {t('newProposal')}
                        </button>
                        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">
                            <span className="material-symbols-outlined text-lg">admin_panel_settings</span> {t('admin')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* Stats */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-900 px-6 py-3">
                                <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">verified</span> AegisAI Dashboard Overview
                                </p>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-4 gap-6">
                                    {[
                                        { label: t('totalProposals'), value: proposals.length, icon: 'description', color: 'text-blue-600', bg: 'bg-blue-50' },
                                        { label: t('approvalRate'), value: approvalRate + '%', icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                        { label: t('avgEMR'), value: avgEMR, icon: 'monitor_heart', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                        { label: t('totalPremium'), value: fc(totalPremium), icon: 'payments', color: 'text-purple-600', bg: 'bg-purple-50' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`${s.bg} ${s.color} w-9 h-9 rounded-xl flex items-center justify-center`}>
                                                    <span className="material-symbols-outlined text-xl">{s.icon}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                                            </div>
                                            <p className="text-2xl font-black text-slate-900">{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Analytics Charts */}
                        {proposals.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <h3 className="font-bold text-slate-900 text-sm mb-6 uppercase tracking-wider">Risk Class Distribution</h3>
                                    <div className="h-64 w-full text-xs">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 600 }} />
                                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }} />
                                                <Bar dataKey="value" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <h3 className="font-bold text-slate-900 text-sm mb-6 uppercase tracking-wider">Proposal Statuses</h3>
                                    <div className="h-64 w-full text-xs flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                                                    {statusData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Smart Alerts Panel ── */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-red-500/5 px-6 py-4 border-b border-red-500/10 flex items-center justify-between">
                                <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
                                    <Zap size={16} className="text-red-500" /> 
                                    AegisAI Smart Insights
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-1 bg-red-100 text-red-600 rounded-md uppercase tracking-wider">Requires Attention</span>
                            </div>
                            <div className="p-6 divide-y divide-slate-100">
                                {highRiskProposals.length > 0 ? (
                                    highRiskProposals.map((p, i) => (
                                        <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mt-1 flex-shrink-0">
                                                <AlertTriangle size={14} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">Critical Risk Class Detected ({p.riskClass})</h4>
                                                <p className="text-slate-500 text-xs mt-0.5">Proposal <span className="font-semibold text-slate-700">{p.id}</span> ({p.name}) has an exceptionally high EMR of {p.emrScore}. Manual underwriting review strongly recommended.</p>
                                                <button onClick={() => navigate('/admin')} className="text-xs font-bold text-blue-600 mt-2 hover:underline">Review Case →</button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-4 text-center text-sm text-slate-500">No critical risk alerts at this time.</div>
                                )}
                                
                                {smokingCases.length > 0 && (
                                    <div className="py-3 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mt-1 flex-shrink-0">
                                            <TrendingUp size={14} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">Trend Alert: High Smoking Rates</h4>
                                            <p className="text-slate-500 text-xs mt-0.5">Detected {smokingCases.length} recent applicants with heavy tobacco usage. Consider adjusting baseline rates for this demographic.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Banner for Edits */}
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-start gap-4 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <span className="material-symbols-outlined">info</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-indigo-900 text-sm">Need to update a proposal?</h4>
                                <p className="text-sm text-indigo-700/80 mt-1 leading-relaxed">
                                    To ensure data integrity, submitted proposals cannot be directly edited. If you need to make changes to your existing proposals, please email our support team at <a href="mailto:porschegt651@gmail.com" className="font-bold underline hover:text-indigo-900 transition-colors">porschegt651@gmail.com</a>.
                                </p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
                                <h3 className="font-extrabold text-slate-900">All Proposals</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
                                    <select
                                        className="form-select border-slate-200 bg-slate-50 text-xs py-2 px-4 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all cursor-pointer"
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
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">ID</th>
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Name</th>
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">EMR</th>
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Risk</th>
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Premium</th>
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Status</th>
                                            <th className="px-8 py-4 font-bold text-slate-400 uppercase text-[10px] tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredProposals.length === 0 && <tr><td colSpan={7} className="px-8 py-16 text-center text-slate-400 font-medium">{t('noProposals')}</td></tr>}
                                        {filteredProposals.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5 font-mono text-[10px] text-slate-400">#{p.id.slice(-6)}</td>
                                                <td className="px-8 py-5 font-bold text-slate-900">{p.name || '—'}</td>
                                                <td className="px-8 py-5"><span className={`font-black ${emrColor(p.emrScore)}`}>{p.emrScore || '—'}</span></td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${p.riskClass?.includes('IV') || p.riskClass?.includes('V') ? 'bg-red-50 text-red-600' : p.riskClass === 'Class III' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {p.riskClass || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 font-black text-slate-900">
                                                    <span className={user?.role === 'admin' ? '' : 'select-none transition-all cursor-not-allowed'} style={user?.role === 'admin' ? {} : { filter: 'blur(8px)' }}>
                                                        {p.premium ? fc(p.premium.total) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full tracking-wider uppercase ${statusColor(p.status)}`}>
                                                        {fmtStatus(p.status)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-slate-400 font-medium">{fd(p.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">User Risk Profile</h3>
                            <div className="relative aspect-square flex items-center justify-center mb-8">
                                <div className="absolute inset-0 bg-slate-50 rounded-full flex items-center justify-center">
                                    <div className="w-48 h-48 bg-slate-100 rounded-full flex items-center justify-center">
                                        <div className="w-24 h-24 bg-white shadow-inner rounded-full" />
                                    </div>
                                </div>
                                <svg className="w-full h-full relative z-10 opacity-80" viewBox="0 0 100 100">
                                    <polygon fill="none" stroke="#e2e8f0" strokeWidth="0.5" points="50,10 90,40 75,90 25,90 10,40" />
                                    <polygon fill="none" stroke="#e2e8f0" strokeWidth="0.5" points="50,30 70,45 65,70 35,70 30,45" />
                                    <polygon fill="rgba(15, 23, 42, 0.15)" stroke="#0F172A" strokeWidth="1" points="50,15 85,38 70,85 40,80 20,42" />
                                    <text x="50" y="8" textAnchor="middle" fontSize="4" className="fill-slate-400 font-bold uppercase tracking-widest">HEALTH</text>
                                    <text x="94" y="42" textAnchor="start" fontSize="4" className="fill-slate-400 font-bold uppercase tracking-widest">FINANCE</text>
                                    <text x="78" y="96" textAnchor="middle" fontSize="4" className="fill-slate-400 font-bold uppercase tracking-widest">LIFESTYLE</text>
                                    <text x="22" y="96" textAnchor="middle" fontSize="4" className="fill-slate-400 font-bold uppercase tracking-widest">TRAVEL</text>
                                    <text x="6" y="42" textAnchor="end" fontSize="4" className="fill-slate-400 font-bold uppercase tracking-widest">PROPERTY</text>
                                </svg>
                            </div>
                            <div className="space-y-5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Risk Level</span>
                                    <span className={`text-xs font-black tracking-widest px-3 py-1 rounded-full ${avgEMR <= 110 ? 'bg-emerald-50 text-emerald-600' : avgEMR <= 130 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                        {avgEMR <= 110 ? 'LOW' : avgEMR <= 130 ? 'MODERATE' : 'HIGH'}
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${avgEMR <= 110 ? 'bg-emerald-500' : avgEMR <= 130 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: Math.min(avgEMR, 200) / 2 + '%' }} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">{t('riskDistribution')}</h3>
                            <div className="h-48 flex items-end justify-between gap-3 px-2">
                                {['Class I', 'Class II', 'Class III', 'Class IV', 'Class V'].map(cls => {
                                    const count = riskCounts[cls] || 0;
                                    const maxCount = Math.max(...Object.values(riskCounts), 1);
                                    const height = count > 0 ? Math.max((count / maxCount) * 100, 10) : 5;
                                    const isHighest = count === maxCount && count > 0;
                                    return (
                                        <div key={cls} className="flex-1 flex flex-col items-center gap-3 group">
                                            <span className="text-[10px] font-bold text-slate-400">{count}</span>
                                            <div className={`w-full ${isHighest ? 'bg-slate-900 shadow-lg shadow-slate-100' : 'bg-slate-100 group-hover:bg-slate-200'} rounded-2xl transition-all duration-500`} style={{ height: height + '%' }} />
                                            <span className={`text-[9px] uppercase tracking-tighter ${isHighest ? 'font-black text-slate-900' : 'font-bold text-slate-400'}`}>{cls.replace('Class ', '')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -tr-10 group-hover:scale-150 transition-transform duration-1000" />
                            <div className="relative z-10 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-xl">lightbulb</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white tracking-wide">AI Insight</p>
                                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-medium">
                                        {proposals.length > 0 ? `Based on ${proposals.length} proposals, your average EMR is ${avgEMR}. ${avgEMR <= 110 ? 'Exceptional risk profile! Most proposals qualify for standard preferred rates.' : 'Consider reviewing certain lifestyle factors to further optimize your premium.'}` : 'Generate your first proposal to unlock personalized AI risk insights.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Dashboard */}
            <div className="md:hidden pb-24 px-4 pt-6 bg-[#F8FAFC] w-full">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
                            <span className="material-symbols-outlined text-slate-900 font-bold">person</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dashboard</p>
                            <h1 className="text-xl font-black text-slate-900 leading-none">{user?.name?.split(' ')[0] || 'User'}</h1>
                        </div>
                    </div>
                    <button className="relative w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    </button>
                </div>

                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden mb-8">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">AegisAI Risk Assessment</p>
                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-5xl font-black">{avgEMR}</span>
                            <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">EMR Score</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${avgEMR <= 110 ? 'bg-emerald-400' : avgEMR <= 130 ? 'bg-amber-400' : 'bg-red-400'} animate-pulse`} />
                            <span className={`text-[11px] font-black uppercase tracking-widest ${avgEMR <= 110 ? 'text-emerald-400' : avgEMR <= 130 ? 'text-amber-400' : 'text-red-400'}`}>
                                {avgEMR <= 110 ? 'Low Risk Profile' : avgEMR <= 130 ? 'Moderate Risk' : 'High Risk Alert'}
                            </span>
                        </div>
                    </div>
                    <div className="absolute right-[-10%] top-[-10%] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
                </div>

                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-6">Service Hub</h2>
                <div className="grid grid-cols-4 gap-4 mb-10">
                    {[
                        { icon: 'add_moderator', label: 'Proposal', to: '/proposal' },
                        { icon: 'document_scanner', label: 'Scan', to: '/scan' },
                        { icon: 'admin_panel_settings', label: 'Admin', to: '/admin' },
                        { icon: 'psychology', label: 'Advice', to: '/dashboard' },
                    ].map((a, i) => (
                        <button key={i} onClick={() => navigate(a.to)} className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-900 group active:scale-90 transition-all">
                                <span className="material-symbols-outlined font-medium text-2xl">{a.icon}</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{a.label}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                    {[
                        { label: 'Proposals', value: proposals.length, icon: 'description', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Approval', value: approvalRate + '%', icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-active:scale-95`}><span className="material-symbols-outlined text-xl">{s.icon}</span></div>
                            <p className="text-2xl font-black text-slate-900">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-6 px-1">
                    <h2 className="text-lg font-black text-slate-900">Recent Activity</h2>
                    <select
                        className="bg-transparent border-none text-[10px] font-black text-indigo-600 uppercase tracking-[0.15em] outline-none cursor-pointer"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="all">View All</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                    </select>
                </div>

                <div className="space-y-4">
                    {filteredProposals.length === 0 && (
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-dashed border-slate-200 text-center">
                            <span className="material-symbols-outlined text-slate-200 text-5xl mb-4">folder_open</span>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('noProposals')}</p>
                            <button onClick={() => navigate('/proposal')} className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] underline decoration-2 underline-offset-4">{t('newProposal')}</button>
                        </div>
                    )}
                    {filteredProposals.map(p => (
                        <div key={p.id} className="bg-white p-5 rounded-[2.25rem] shadow-sm border border-slate-100 flex gap-5 active:scale-[0.98] transition-all">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <span className="material-symbols-outlined text-2xl">shield</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className="font-extrabold text-slate-900 text-sm truncate">{p.name || 'Anonymous Applicant'}</h4>
                                    <span className={`px-2.5 py-1 ${statusColor(p.status)} text-[8px] font-black rounded-full uppercase tracking-widest whitespace-nowrap`}>
                                        {fmtStatus(p.status).split(' ')[0]}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mt-1">Premium: <span className={`font-black text-slate-900 ${user?.role === 'admin' ? '' : 'select-none transition-all'}`} style={user?.role === 'admin' ? {} : { filter: 'blur(6px)' }}>{p.premium ? fc(p.premium.total) : '—'}</span></p>
                                <div className="mt-4 w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100/50">
                                    <div className={`h-full rounded-full transition-all duration-700 ${p.emrScore <= 110 ? 'bg-emerald-500' : p.emrScore <= 130 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: Math.min(p.emrScore || 50, 200) / 2 + '%' }} />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <p className="text-[9px] font-black text-slate-400 tracking-wider">EMR: {p.emrScore || '—'}</p>
                                    <p className="text-[9px] font-black text-slate-400 tracking-wider">{p.riskClass?.replace('Class ', '') || '—'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
