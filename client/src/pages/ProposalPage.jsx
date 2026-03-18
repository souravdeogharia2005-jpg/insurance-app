import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateInsurance } from '../utils/emr';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BrainCircuit, Activity, Heart, User, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, TrendingUp, Info } from 'lucide-react';
import '../styles/MobileTheme.css';

const STEPS = [
    { id: 'personal', title: 'Personal', icon: 'person' },
    { id: 'family',   title: 'Family',   icon: 'group' },
    { id: 'medical',  title: 'Medical',  icon: 'medical_services' },
];

const CONDITIONS = [
    { id: 'thyroid',      label: 'Thyroid',        icon: '🦋', emrPts: [2.5, 5, 7.5, 10] },
    { id: 'asthma',       label: 'Asthma',          icon: '🫁', emrPts: [5, 7.5, 10, 12.5] },
    { id: 'hypertension', label: 'Hypertension',    icon: '🫀', emrPts: [5, 7.5, 10, 15] },
    { id: 'diabetes',     label: 'Diabetes Mellitus', icon: '🩸', emrPts: [10, 15, 20, 25] },
    { id: 'gut_disorder', label: 'Gut Disorder',    icon: '🔬', emrPts: [5, 10, 15, 20] },
];

const SEVERITY_LABELS = [
    { level: 1, label: 'Borderline (no medicine)' },
    { level: 2, label: 'Basic medicines' },
    { level: 3, label: 'Middle dose medication' },
    { level: 4, label: 'Very high dose medication' },
];

export default function ProposalPage() {
    const { t, fc } = useApp();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submittedId, setSubmittedId] = useState(null);

    const [form, setForm] = useState({
        name: '', age: '', gender: 'male', dob: '', residence: 'urban',
        profession: '', incomeSource: '', bmi: '',
        height: '', weight: '',
        parentStatus: 'both_above_65',
        conditions: [], severities: {},
        smoking: 'never', alcohol: 'never', tobacco: 'never',
        occupation: 'desk_job',
        income: 500000, lifeCover: 1000000, cirCover: 500000, accidentCover: 1000000
    });

    useEffect(() => {
        if (form.height && form.weight) {
            const hm = parseFloat(form.height) / 100;
            const bmi = hm > 0 ? (parseFloat(form.weight) / (hm * hm)) : 0;
            setForm(prev => ({ ...prev, bmi: bmi.toFixed(1) }));
        }
    }, [form.height, form.weight]);

    const mapHabit = (val) => {
        const v = (val || '').toLowerCase();
        if (v === 'social' || v === 'occasional' || v === 'former') return 1;
        if (v === 'moderate' || v === 'regular') return 2;
        if (v === 'heavy' || v === 'high') return 3;
        return 0;
    };

    const getUserForCalc = () => ({
        age: parseInt(form.age) || 30,
        bmi: parseFloat(form.bmi) || 0,
        family: form.parentStatus,
        diseases: {
            thyroid: form.conditions.includes('thyroid') ? (form.severities['thyroid'] || 1) : 0,
            asthma: form.conditions.includes('asthma') ? (form.severities['asthma'] || 1) : 0,
            hypertension: form.conditions.includes('hypertension') ? (form.severities['hypertension'] || 1) : 0,
            diabetes: form.conditions.includes('diabetes') ? (form.severities['diabetes'] || 1) : 0,
            gut: form.conditions.includes('gut_disorder') ? (form.severities['gut_disorder'] || 1) : 0,
        },
        habits: {
            smoking: mapHabit(form.smoking),
            alcohol: mapHabit(form.alcohol),
            tobacco: mapHabit(form.tobacco || 'never')
        },
        occupation: form.occupation || 'desk_job',
        lifeCover: parseFloat(form.lifeCover) || 0,
        cirCover: parseFloat(form.cirCover) || 0,
        accidentCover: parseFloat(form.accidentCover) || 0
    });

    const [calcResult, setCalcResult] = useState(calculateInsurance(getUserForCalc()));

    useEffect(() => {
        setCalcResult(calculateInsurance(getUserForCalc()));
    }, [form]);

    const toggleCondition = (id) => {
        const newConditions = form.conditions.includes(id)
            ? form.conditions.filter(c => c !== id)
            : [...form.conditions, id];
        const newSeverities = { ...form.severities };
        if (!newConditions.includes(id)) delete newSeverities[id];
        else if (!newSeverities[id]) newSeverities[id] = 1;
        setForm({ ...form, conditions: newConditions, severities: newSeverities });
    };

    const handleSeverity = (id, val) => {
        setForm({ ...form, severities: { ...form.severities, [id]: parseInt(val) } });
    };

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...form,
                bmi: parseFloat(form.bmi) || 0,
                emrScore: calcResult.emr,
                emrBreakdown: calcResult.breakdown,
                riskClass: 'Class ' + calcResult.lifeClass,
                premium: {
                    life: calcResult.lifePremium,
                    cir: calcResult.cirPremium,
                    accident: calcResult.accPremium,
                    total: calcResult.total,
                    lifeFactor: calcResult.lifeFactor,
                    healthFactor: calcResult.healthFactor,
                    lifeClass: calcResult.lifeClass,
                    healthClass: calcResult.healthClass
                },
                source: 'manual',
            };
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
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 pb-24">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-500/10 border border-slate-100 text-center max-w-sm w-full">
                    <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-emerald-500/30">
                        <span className="material-symbols-outlined text-[44px] font-bold">verified</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Proposal Secured</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">System ID: <span className="text-blue-600">{submittedId}</span></p>

                    <div className="bg-slate-50 rounded-3xl p-6 mb-8 text-left space-y-4 border border-slate-100/50">
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final EMR</span><span className="font-black text-slate-900 text-lg">{calcResult.emr}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Class</span><span className="px-3 py-1 bg-white rounded-lg font-black text-[10px] border border-slate-200" style={{ color: calcResult.color }}>Class {calcResult.lifeClass}</span></div>
                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loading Factor</span><span className="text-blue-600 font-black text-sm">×{calcResult.lifeFactor}</span></div>
                        <hr className="border-slate-200" />
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest"><span>Annual Premium</span><span className="text-slate-900 font-black text-xl">{fc(calcResult.total)}</span></div>
                    </div>

                    <div className="space-y-3">
                        <button onClick={() => window.location.href = '/dashboard'} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-extrabold shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all">
                            View Dashboard
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                        <button onClick={() => window.location.reload()} className="w-full py-4 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-none bg-transparent">New Assessment</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="font-jakarta min-h-screen pb-32 bg-[#F8FAFC]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5" onClick={() => window.location.href = '/'}>
                    <div className="w-9 h-9 bg-aegis-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="material-symbols-outlined text-white text-[22px] font-bold">shield_with_heart</span>
                    </div>
                    <span className="font-extrabold text-lg tracking-tight">AegisAI</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-9 h-9 p-0 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full transition-colors border-none bg-transparent">
                        <span className="material-symbols-outlined text-[22px]">settings</span>
                    </button>
                    <div className="w-9 h-9 bg-blue-50 border border-blue-100 text-aegis-blue rounded-full flex items-center justify-center font-bold text-xs">SD</div>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">
                {/* Title */}
                <section className="space-y-1">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-[0.2em]">Underwriter V4.0</p>
                        <div className="flex gap-1.5">
                            {STEPS.map((_, i) => (
                                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Smart Quote Assessment</h1>
                </section>

                {/* Form Progress Hub */}
                <section className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex px-2 py-2 gap-1 bg-slate-50/50">
                        {STEPS.map((s, i) => (
                            <button key={i} onClick={() => setStep(i)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all duration-200 border-none ${step === i ? 'bg-white tab-active text-blue-600' : 'text-slate-400'}`}>
                                <span className="material-symbols-outlined text-[18px] font-bold">{s.icon}</span>
                                <span className={`text-[10px] ${step === i ? 'font-extrabold' : 'font-bold'}`}>{s.title}</span>
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
                                
                                {step === 0 && (
                                    <div className="space-y-5">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 transition-colors group-focus-within:text-blue-500">
                                                <span className="material-symbols-outlined text-[20px]">badge</span>
                                            </div>
                                            <input className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none" placeholder="e.g. Sourav Deogharia" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                    <span className="material-symbols-outlined text-[20px]">cake</span>
                                                </div>
                                                <input className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Age" type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                    <span className="material-symbols-outlined text-[20px]">wc</span>
                                                </div>
                                                <select className="block w-full pl-12 pr-8 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 appearance-none outline-none" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300">
                                                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                <span className="material-symbols-outlined text-[20px]">work</span>
                                            </div>
                                            <input className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Profession" type="text" value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} />
                                        </div>

                                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] mb-4 pl-1">Physical Metrics</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-500 ml-1">Height (cm)</label>
                                                    <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" placeholder="175" type="number" value={form.height} onChange={e => setForm({...form, height: e.target.value})} />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-500 ml-1">Weight (kg)</label>
                                                    <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none" placeholder="72" type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Parent Health History</p>
                                        {[
                                            { v: 'both_above_65', label: 'Both parents (age > 65)', emr: -10, icon: 'verified' },
                                            { v: 'one_above_65', label: 'Only one (age > 65)', emr: -5, icon: 'clinical_notes' },
                                            { v: 'both_below_65', label: 'Both died (age < 65)', emr: +10, icon: 'error' },
                                        ].map(opt => (
                                            <button key={opt.v} onClick={() => setForm({ ...form, parentStatus: opt.v })}
                                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${form.parentStatus === opt.v ? 'border-blue-500 bg-blue-50/50 text-blue-600' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <span className={`material-symbols-outlined ${opt.emr <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{opt.icon}</span>
                                                    <span className="font-bold text-xs">{opt.label}</span>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${opt.emr < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {opt.emr > 0 ? '+' : ''}{opt.emr}pts
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Health Conditions</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {CONDITIONS.map(c => (
                                                    <button key={c.id} onClick={() => toggleCondition(c.id)}
                                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${form.conditions.includes(c.id) ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 bg-slate-50'}`}>
                                                        <span className="text-xl">{c.icon}</span>
                                                        <span className="text-[10px] font-bold text-center leading-tight">{c.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {form.conditions.length > 0 && (
                                            <div className="space-y-3 pt-2">
                                                <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest pl-1">Define Severity</p>
                                                {form.conditions.map(id => {
                                                    const cond = CONDITIONS.find(c => c.id === id);
                                                    const sev = form.severities[id] || 1;
                                                    return (
                                                        <div key={id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-black">{cond.label}</span>
                                                                <span className="text-[10px] font-black text-blue-600">+{cond.emrPts[sev-1]} EMR</span>
                                                            </div>
                                                            <div className="flex gap-1.5">
                                                                {[1,2,3,4].map(l => (
                                                                    <button key={l} onClick={() => handleSeverity(id, l)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border transition-all ${sev === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'}`}>L{l}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-2">
                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Life Habits</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Smoking</label>
                                                    <select className="w-full bg-slate-50 rounded-xl p-3 text-[10px] font-black outline-none border-none appearance-none" value={form.smoking} onChange={e => setForm({ ...form, smoking: e.target.value })}>
                                                        <option value="never">Never</option>
                                                        <option value="occasional">Occasional</option>
                                                        <option value="moderate">Moderate</option>
                                                        <option value="heavy">Heavy</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Alcohol</label>
                                                    <select className="w-full bg-slate-50 rounded-xl p-3 text-[10px] font-black outline-none border-none appearance-none" value={form.alcohol} onChange={e => setForm({ ...form, alcohol: e.target.value })}>
                                                        <option value="never">Never</option>
                                                        <option value="occasional">Occasional</option>
                                                        <option value="moderate">Moderate</option>
                                                        <option value="heavy">Heavy</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button disabled={loading} onClick={handleSubmit} className="w-full bg-slate-900 text-white font-extrabold py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                                                {loading ? 'Analyzing Data...' : 'Generate Quote'}
                                                {!loading && <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">bolt</span>}
                                            </button>
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation Actions for Tab 1 & 2 */}
                        {step < 2 && (
                            <div className="pt-4">
                                <button onClick={() => setStep(step + 1)} className="w-full bg-blue-600 text-white font-extrabold py-5 rounded-2xl shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                                    Next Step
                                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </button>
                                {step > 0 && (
                                    <button onClick={() => setStep(step - 1)} className="w-full mt-3 py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest border-none bg-transparent">Go Back</button>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* Score Hub */}
                <section className="bg-aegis-dark rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden drop-shadow-2xl">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <h2 className="text-[10px] font-bold tracking-wider uppercase opacity-80">Live Underwriting Score</h2>
                        </div>
                        <div className="text-[9px] font-black bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 uppercase tracking-widest">Aegis Core v4</div>
                    </div>

                    <div className="flex items-center justify-between gap-6">
                        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle className="text-slate-700/50" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="8"></circle>
                                <circle cx="50" cy="50" fill="transparent" r="42" stroke={calcResult.color} strokeDasharray="264" strokeDashoffset={264 - (264 * Math.min(calcResult.emr, 200) / 200)} strokeLinecap="round" strokeWidth="8" className="transition-all duration-1000 ease-out progress-glow"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black tracking-tight" style={{ color: calcResult.color }}>{calcResult.emr}</span>
                                <span className="text-[7px] font-bold uppercase opacity-50 tracking-tighter">EMR</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="glass-card rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400 text-lg">analytics</span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Live Analysis</span>
                                </div>
                                <span className="text-blue-400 font-black text-[10px]">{calcResult.lifeClass}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="glass-card rounded-xl p-2 px-3 text-center">
                                    <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Class</p>
                                    <p className="text-xs font-black text-white">{calcResult.lifeClass}</p>
                                </div>
                                <div className="glass-card rounded-xl p-2 px-3 text-center">
                                    <p className="text-[7px] font-bold text-slate-400 uppercase mb-1">Impact</p>
                                    <p className="text-xs font-black text-blue-400">×{calcResult.lifeFactor}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Floating Nav */}
            <div className="fixed bottom-6 inset-x-0 px-5 z-50">
                <nav className="bottom-nav-glass border border-slate-200/50 flex justify-around items-center pt-3 pb-4 px-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <button className="flex flex-col items-center gap-1 text-blue-600 transition-all border-none bg-transparent" onClick={() => window.location.href = '/'}>
                        <div className="p-1.5 rounded-xl bg-blue-50">
                            <span className="material-symbols-outlined text-[22px] font-bold">home</span>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase tracking-tighter">Home</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-slate-400 transition-all border-none bg-transparent" onClick={() => window.location.href = '/dashboard'}>
                        <div className="p-1.5">
                            <span className="material-symbols-outlined text-[22px]">grid_view</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">Dash</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 -mt-10 border-none bg-transparent" onClick={() => window.location.reload()}>
                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/30 ring-4 ring-white active:scale-95 transition-all">
                            <span className="material-symbols-outlined text-[28px] font-light">add</span>
                        </div>
                        <span className="text-[9px] font-extrabold text-slate-500 mt-1 uppercase tracking-tighter">New</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-slate-400 transition-all border-none bg-transparent" onClick={() => window.location.href = '/scan'}>
                        <div className="p-1.5">
                            <span className="material-symbols-outlined text-[22px]">search</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">Scan</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-slate-400 transition-all border-none bg-transparent" onClick={() => window.location.href = '/admin'}>
                        <div className="p-1.5">
                            <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">Admin</span>
                    </button>
                </nav>
            </div>
        </div>
    );
}
