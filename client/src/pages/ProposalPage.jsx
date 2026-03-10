import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateEMR, getRiskClass, calculatePremium } from '../utils/emr';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BrainCircuit, Activity, Heart, User, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, TrendingUp, Info } from 'lucide-react';

const STEPS = [
    { id: 'info', title: 'Personal', icon: User },
    { id: 'family', title: 'Family', icon: Heart },
    { id: 'health', title: 'Medical', icon: Activity },
    { id: 'lifestyle', title: 'Lifestyle', icon: BrainCircuit },
    { id: 'coverage', title: 'Coverage', icon: Shield }
];

const CONDITIONS = [
    { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
    { id: 'hypertension', label: 'Hypertension', icon: '🫀' },
    { id: 'heart_disease', label: 'Heart Disease', icon: '❤️' },
    { id: 'respiratory', label: 'Respiratory', icon: '🫁' },
    { id: 'cancer', label: 'Cancer', icon: '🎗️' },
    { id: 'liver', label: 'Liver Disease', icon: '🧪' },
    { id: 'kidney', label: 'Kidney Disease', icon: '💧' },
    { id: 'neurological', label: 'Neurological', icon: '🧠' }
];

export default function ProposalPage() {
    const { t, fc } = useApp();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submittedId, setSubmittedId] = useState(null);

    const [form, setForm] = useState({
        name: '', age: '', gender: 'male', dob: '', residence: 'urban', profession: '', incomeSource: '',
        fatherStatus: 'alive_healthy', motherStatus: 'alive_healthy',
        conditions: [], severities: {},
        smoking: 'never', alcohol: 'never', tobacco: 'never', occupation: 'desk_job',
        income: 500000, lifeCover: 1000000, cirCover: 500000, accidentCover: 1000000
    });

    const [emrData, setEmrData] = useState(calculateEMR(form));
    const [risk, setRisk] = useState(getRiskClass(emrData.totalEMR));
    const [premium, setPremium] = useState(calculatePremium(form, emrData.totalEMR));

    useEffect(() => {
        const e = calculateEMR(form);
        setEmrData(e);
        setRisk(getRiskClass(e.totalEMR));
        setPremium(calculatePremium(form, e.totalEMR));
    }, [form]);

    const toggleCondition = (id) => {
        const newConditions = form.conditions.includes(id) ? form.conditions.filter(c => c !== id) : [...form.conditions, id];
        setForm({ ...form, conditions: newConditions });
    };

    const handleSeverity = (id, val) => {
        setForm({ ...form, severities: { ...form.severities, [id]: parseInt(val) } });
    };

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = { ...form, emrScore: emrData.totalEMR, emrBreakdown: emrData.breakdown, riskClass: risk.class, premium };
            const res = await createProposal(payload);
            setSubmittedId(res.id);
        } catch (err) {
            alert('Submission failed');
        } finally {
            setLoading(false);
        }
    };

    if (submittedId) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Proposal Secured!</h2>
                    <p className="text-slate-500 mb-8 text-lg">Your policy recommendation is ready. ID: <span className="font-bold text-primary">{submittedId}</span></p>
                    <div className="space-y-3">
                        <button onClick={() => window.location.href = '/dashboard'} className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all">Go to Dashboard <ChevronRight size={18} /></button>
                        <button onClick={() => window.location.reload()} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-4 rounded-xl font-bold">New Assessment</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-4 lg:py-6">
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Main Content */}
                <div className="flex-1 space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <p className="text-primary font-bold text-xs uppercase tracking-[0.2em] mb-1">AI Underwriter v4.0</p>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Smart Quote Assessment</h1>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                            {STEPS.map((s, i) => (
                                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-primary scale-110 shadow-sm' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[500px] flex flex-col">

                        {/* Nav Steps */}
                        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20">
                            {STEPS.map((s, i) => {
                                const Icon = s.icon;
                                const active = i === step;
                                const done = i < step;
                                return (
                                    <button key={i} onClick={() => setStep(i)} className={`flex items-center gap-3 px-5 py-2.5 rounded-xl whitespace-nowrap transition-all ${active ? 'bg-white dark:bg-slate-800 shadow-md text-primary' : done ? 'text-green-500' : 'text-slate-400 opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-primary text-white' : done ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                            <Icon size={16} />
                                        </div>
                                        <span className="text-sm font-bold tracking-tight">{s.title}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="p-8 md:p-12 flex-1">
                            <AnimatePresence mode="wait">
                                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                                    {step === 0 && (
                                        <div className="space-y-8">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="form-group"><label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300"><User size={14} /> Full Name</label><input placeholder="e.g. John Doe" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                                <div className="form-group"><label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Age</label><input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                                                <div className="form-group"><label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Gender</label><select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></div>
                                                <div className="form-group"><label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Residence</label><select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer" value={form.residence} onChange={e => setForm({ ...form, residence: e.target.value })}><option value="urban">Urban</option><option value="semi-urban">Semi-Urban</option><option value="rural">Rural</option></select></div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 1 && (
                                        <div className="space-y-8">
                                            <div className="grid md:grid-cols-2 gap-10">
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">Father's Health Status</label>
                                                    <div className="space-y-3">
                                                        {['alive_healthy', 'minor_issues', 'major_issues', 'deceased_before_60', 'deceased_after_60'].map(v => (
                                                            <button key={v} onClick={() => setForm({ ...form, fatherStatus: v })} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.fatherStatus === v ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                                <span className="font-bold text-sm">{v.replace(/_/g, ' ').toUpperCase()}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">Mother's Health Status</label>
                                                    <div className="space-y-3">
                                                        {['alive_healthy', 'minor_issues', 'major_issues', 'deceased_before_60', 'deceased_after_60'].map(v => (
                                                            <button key={v} onClick={() => setForm({ ...form, motherStatus: v })} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.motherStatus === v ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                                <span className="font-bold text-sm">{v.replace(/_/g, ' ').toUpperCase()}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {CONDITIONS.map(c => (
                                                    <button key={c.id} onClick={() => toggleCondition(c.id)} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${form.conditions.includes(c.id) ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                        <span className="text-3xl">{c.icon}</span>
                                                        <span className="text-sm font-bold">{c.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {form.conditions.map(id => (
                                                <div key={id} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-bold text-slate-900 dark:text-white">Severity Level: {CONDITIONS.find(c => c.id === id).label}</h4>
                                                        <span className="text-xs font-black text-primary px-3 py-1 bg-primary/10 rounded-full">{form.severities[id] || 1}/5</span>
                                                    </div>
                                                    <input type="range" min="1" max="5" value={form.severities[id] || 1} onChange={e => handleSeverity(id, e.target.value)} className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest"><span>Early Stage</span><span>Chronic</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-8">
                                            <div className="grid md:grid-cols-3 gap-6">
                                                <div className="form-group">
                                                    <label className="text-sm font-bold text-slate-500 mb-3 block">Smoking Habit</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.smoking} onChange={e => setForm({ ...form, smoking: e.target.value })}><option value="never">Never</option><option value="former">Former</option><option value="occasional">Occasional</option><option value="regular">Regular</option></select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="text-sm font-bold text-slate-500 mb-3 block">Alcohol Intake</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.alcohol} onChange={e => setForm({ ...form, alcohol: e.target.value })}><option value="never">Never</option><option value="social">Social</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option></select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="text-sm font-bold text-slate-500 mb-3 block">Occupation Risk</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })}><option value="desk_job">Desk Job</option><option value="light_manual">Light Manual</option><option value="hazardous">Hazardous</option></select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {step === 4 && (
                                        <div className="space-y-8">
                                            <div className="bg-primary/5 p-8 rounded-2xl border border-primary/10">
                                                <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2"><Shield size={20} /> Coverage Portfolio</h3>
                                                <div className="space-y-10">
                                                    <div>
                                                        <div className="flex justify-between mb-4 font-bold"><span className="text-slate-700 dark:text-slate-300">Base Life Cover</span><span className="text-primary">{fc(form.lifeCover)}</span></div>
                                                        <input type="range" min="100000" max="50000000" step="100000" value={form.lifeCover} onChange={e => setForm({ ...form, lifeCover: parseInt(e.target.value) })} className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between mb-4 font-bold"><span className="text-slate-700 dark:text-slate-300">Critical Illness Rider</span><span className="text-primary">{fc(form.cirCover)}</span></div>
                                                        <input type="range" min="0" max="20000000" step="100000" value={form.cirCover} onChange={e => setForm({ ...form, cirCover: parseInt(e.target.value) })} className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex justify-between gap-4">
                            <button onClick={prev} className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'}`}><ChevronLeft size={18} /> Back</button>
                            {step < STEPS.length - 1 ? (
                                <button onClick={next} className="bg-primary text-white px-10 py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">Next Step <ChevronRight size={18} /></button>
                            ) : (
                                <button disabled={loading} onClick={handleSubmit} className="bg-green-500 text-white px-12 py-4 rounded-xl font-bold shadow-xl shadow-green-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                                    {loading ? 'Analyzing...' : 'Secure Proposal'} <CheckCircle2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Analysis */}
                <div className="lg:w-[380px] space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={100} /></div>
                        <h3 className="text-lg font-bold mb-8 flex items-center gap-2"><div className="w-2 h-2 bg-primary animate-pulse rounded-full" /> Live Risk Scoring</h3>

                        <div className="flex flex-col items-center gap-4 mb-10">
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="80" cy="80" r="70" className="stroke-slate-800" strokeWidth="12" fill="none" />
                                    <circle cx="80" cy="80" r="70" className="transition-all duration-1000 ease-out" stroke={risk.color} strokeWidth="12" strokeDasharray={440} strokeDashoffset={440 - (440 * Math.min(emrData.totalEMR, 300) / 300)} strokeLinecap="round" fill="none" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-4xl font-black">{emrData.totalEMR}</span>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">EMR Score</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg`} style={{ backgroundColor: risk.color + '20', color: risk.color }}><Shield size={16} /></div>
                                    <span className="font-bold text-sm">Target Risk Class</span>
                                </div>
                                <span className="font-black text-sm" style={{ color: risk.color }}>{risk.class}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-400">
                                <div className="flex items-center gap-3"><Heart size={16} /><span className="text-sm font-bold">Health Impacts</span></div>
                                <span className="text-sm font-black text-white">+{emrData.healthEMR}%</span>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Estimated Total Premium</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-primary">{fc(premium.total)}</span>
                                <span className="text-sm font-bold text-slate-500">/ year</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2rem] shadow-lg">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> AI Insights</h4>
                        <div className="space-y-4">
                            {form.age > 45 && <p className="text-sm text-slate-500 flex gap-2"><Info size={16} className="shrink-0 text-amber-500" /> Age factor adds <span className="text-amber-500 font-bold">5.2%</span> to premium.</p>}
                            {form.conditions.length > 2 && <p className="text-sm text-slate-500 flex gap-2"><AlertCircle size={16} className="shrink-0 text-red-500" /> Multiple conditions detected. High risk profile.</p>}
                            {form.conditions.length === 0 && <p className="text-sm text-slate-500 flex gap-2"><CheckCircle2 size={16} className="shrink-0 text-green-500" /> Clean health profile. Applying <span className="text-green-500 font-bold">15% discount</span>.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
