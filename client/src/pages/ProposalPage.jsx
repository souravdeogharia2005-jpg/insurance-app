import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateInsurance } from '../utils/emr';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, BrainCircuit, Activity, Heart, User, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, TrendingUp, Info } from 'lucide-react';

const STEPS = [
    { id: 'info',     title: 'Personal',  icon: User },
    { id: 'family',   title: 'Family',    icon: Heart },
    { id: 'health',   title: 'Medical',   icon: Activity },
    { id: 'lifestyle', title: 'Lifestyle', icon: BrainCircuit },
    { id: 'coverage', title: 'Coverage',  icon: Shield },
];

// ✅ CORRECT: Only the 5 conditions from the real proposal form with correct severity labels
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

    // Auto-compute BMI from height & weight
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
        return 0; // never
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
            gut_disorder: form.conditions.includes('gut_disorder') ? (form.severities['gut_disorder'] || 1) : 0,
        },
        habits: {
            smoking: mapHabit(form.smoking),
            alcohol: mapHabit(form.alcohol),
            tobacco: mapHabit(form.tobacco)
        },
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
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-900 p-10 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Proposal Secured!</h2>
                    <p className="text-slate-500 mb-2 text-lg">ID: <span className="font-bold text-primary">{submittedId}</span></p>

                    {/* Final Result Card */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 mb-6 text-left space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-slate-500">EMR Score</span><span className="font-black text-slate-900 dark:text-white">{calcResult.emr}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Life Class</span><span className="font-bold" style={{ color: calcResult.color }}>Class {calcResult.lifeClass} (Factor {calcResult.lifeFactor})</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Health Class</span><span className="font-bold text-indigo-500">Class {calcResult.healthClass} (Factor {calcResult.healthFactor})</span></div>
                        <hr className="border-slate-200 dark:border-slate-700" />
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Life Premium</span><span className="font-bold">{fc(calcResult.lifePremium)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">CIR Premium</span><span className="font-bold">{fc(calcResult.cirPremium)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-500">Accident Premium</span><span className="font-bold">{fc(calcResult.accPremium)}</span></div>
                        <div className="flex justify-between font-black text-base border-t border-slate-200 dark:border-slate-700 pt-2"><span>Total Annual</span><span className="text-primary">{fc(calcResult.total)}</span></div>
                    </div>

                    <div className="space-y-3">
                        <button onClick={() => window.print()} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">Download Report (PDF)</button>
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
                                );
                            })}
                        </div>

                        <div className="p-8 md:p-12 flex-1">
                            <AnimatePresence mode="wait">
                                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

                                    {/* Step 0: Personal */}
                                    {step === 0 && (
                                        <div className="space-y-8">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="form-group">
                                                    <label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300"><User size={14} /> Full Name</label>
                                                    <input placeholder="e.g. Sourav Deogharia" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Age (years)</label>
                                                    <input type="number" placeholder="e.g. 30" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Gender</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none cursor-pointer" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Profession</label>
                                                    <input placeholder="e.g. Software Engineer" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Height (cm)</label>
                                                    <input type="number" placeholder="e.g. 175" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
                                                </div>
                                                <div className="form-group">
                                                    <label className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-700 dark:text-slate-300">Weight (kg)</label>
                                                    <input type="number" placeholder="e.g. 72" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                                                </div>
                                            </div>
                                            {/* BMI Display */}
                                            {form.bmi > 0 && (
                                                <div className={`flex items-center gap-3 p-4 rounded-xl ${parseFloat(form.bmi) > 28 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                                                    <span className="text-2xl">{parseFloat(form.bmi) > 30 ? '⚠️' : '✅'}</span>
                                                    <div>
                                                        <p className="font-bold text-slate-900">BMI: {form.bmi}</p>
                                                        <p className="text-xs text-slate-500">EMR addition: +{form.bmi < 18 ? 10 : form.bmi <= 23 ? 0 : form.bmi <= 28 ? 5 : form.bmi <= 33 ? 10 : 15}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 1: Family History */}
                                    {step === 1 && (
                                        <div className="space-y-6">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Parents Health Status</p>
                                            <div className="space-y-3">
                                                {[
                                                    { v: 'both_above_65',    label: 'Both parents surviving (age > 65)', emr: -10, icon: '✅' },
                                                    { v: 'one_above_65',     label: 'Only one surviving (age > 65)',     emr: -5,  icon: '🟡' },
                                                    { v: 'both_below_65',   label: 'Both died (age < 65)',              emr: +10, icon: '🔴' },
                                                ].map(opt => (
                                                    <button key={opt.v} onClick={() => setForm({ ...form, parentStatus: opt.v })}
                                                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${form.parentStatus === opt.v ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">{opt.icon}</span>
                                                            <span className="font-semibold text-sm">{opt.label}</span>
                                                        </div>
                                                        <span className={`text-xs font-black px-2 py-1 rounded-full ${opt.emr < 0 ? 'bg-green-100 text-green-700' : opt.emr > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            EMR {opt.emr > 0 ? '+' : ''}{opt.emr}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Medical */}
                                    {step === 2 && (
                                        <div className="space-y-8">
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Select applicable health conditions</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                                {CONDITIONS.map(c => (
                                                    <button key={c.id} onClick={() => toggleCondition(c.id)}
                                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${form.conditions.includes(c.id) ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                        <span className="text-2xl">{c.icon}</span>
                                                        <span className="text-xs font-bold text-center leading-tight">{c.label}</span>
                                                        <span className="text-[9px] text-slate-400">up to +{c.emrPts[3]} EMR</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Severity selectors */}
                                            {form.conditions.map(id => {
                                                const cond = CONDITIONS.find(c => c.id === id);
                                                if (!cond) return null;
                                                const sev = form.severities[id] || 1;
                                                return (
                                                    <div key={id} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="font-bold text-slate-900 dark:text-white">{cond.icon} {cond.label}</h4>
                                                            <span className="text-xs font-black text-primary px-3 py-1 bg-primary/10 rounded-full">+{cond.emrPts[sev - 1]} EMR</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            {SEVERITY_LABELS.map(s => (
                                                                <button key={s.level} onClick={() => handleSeverity(id, s.level)}
                                                                    className={`text-xs p-2.5 rounded-xl border text-center transition-all font-semibold ${sev === s.level ? 'bg-primary text-white border-primary' : 'border-slate-200 dark:border-slate-700 hover:border-primary text-slate-600 dark:text-slate-400'}`}>
                                                                    Level {s.level}<br/>
                                                                    <span className="font-normal opacity-75">{s.label.split('(')[0]}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Co-morbidity hint */}
                                            {form.conditions.length >= 2 && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                                                    <span>⚠️</span>
                                                    <p className="text-xs text-amber-800 font-semibold">
                                                        Co-morbidity bonus applied: +{form.conditions.length >= 3 ? 40 : 20} EMR
                                                        ({form.conditions.length >= 3 ? '3+ diseases' : '2 diseases detected'})
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Step 3: Lifestyle */}
                                    {step === 3 && (
                                        <div className="space-y-8">
                                            <div className="grid md:grid-cols-3 gap-6">
                                                <div className="form-group">
                                                    <label className="text-sm font-bold text-slate-500 mb-3 block">🚬 Smoking</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.smoking} onChange={e => setForm({ ...form, smoking: e.target.value })}>
                                                        <option value="never">Never (+0)</option>
                                                        <option value="occasional">Occasionally (+5)</option>
                                                        <option value="moderate">Regular moderate (+10)</option>
                                                        <option value="heavy">Regular high dose (+15)</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="text-sm font-bold text-slate-500 mb-3 block">🍺 Alcohol</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.alcohol} onChange={e => setForm({ ...form, alcohol: e.target.value })}>
                                                        <option value="never">Never (+0)</option>
                                                        <option value="occasional">Occasionally (+5)</option>
                                                        <option value="moderate">Regular moderate (+10)</option>
                                                        <option value="heavy">Regular high dose (+15)</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label className="text-sm font-bold text-slate-500 mb-3 block">🍂 Tobacco</label>
                                                    <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.tobacco} onChange={e => setForm({ ...form, tobacco: e.target.value })}>
                                                        <option value="never">Never (+0)</option>
                                                        <option value="occasional">Occasionally (+5)</option>
                                                        <option value="moderate">Regular moderate (+10)</option>
                                                        <option value="heavy">Regular high dose (+15)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Habit combo bonus */}
                                            {(() => {
                                                const hCount = ['smoking', 'alcohol', 'tobacco'].filter(h => form[h] !== 'never').length;
                                                if (hCount < 2) return null;
                                                return (
                                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                                        <span>⚠️</span>
                                                        <p className="text-xs text-red-800 font-semibold">
                                                            Risky habit combination bonus: +{hCount >= 3 ? 40 : 20} EMR ({hCount} habits detected)
                                                        </p>
                                                    </div>
                                                );
                                            })()}

                                            <div className="form-group">
                                                <label className="text-sm font-bold text-slate-500 mb-3 block">💼 Occupation Risk</label>
                                                <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-4 font-bold outline-none" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })}>
                                                    <option value="desk_job">Desk Job / Office / IT (+0)</option>
                                                    <option value="light_manual">Light Manual Work (+0)</option>
                                                    <option value="moderate_physical">Driver / Public Carrier (+2)</option>
                                                    <option value="heavy_manual">Heavy Manual (+2)</option>
                                                    <option value="merchant_navy">Merchant Navy (+3)</option>
                                                    <option value="oil_industry">Oil & Gas / Onshore (+3)</option>
                                                    <option value="hazardous">Hazardous (Mining, etc.) (+3)</option>
                                                    <option value="athlete">Professional Athlete (+2)</option>
                                                    <option value="pilot">Commercial Pilot (+6)</option>
                                                    <option value="extreme_risk">Extreme Risk (+6)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 4: Coverage */}
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
                                                        <div className="flex justify-between mb-4 font-bold"><span className="text-slate-700 dark:text-slate-300">Critical Illness Rider (CIR)</span><span className="text-primary">{fc(form.cirCover)}</span></div>
                                                        <input type="range" min="0" max="20000000" step="100000" value={form.cirCover} onChange={e => setForm({ ...form, cirCover: parseInt(e.target.value) })} className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between mb-4 font-bold"><span className="text-slate-700 dark:text-slate-300">Accident Cover</span><span className="text-primary">{fc(form.accidentCover)}</span></div>
                                                        <input type="range" min="0" max="20000000" step="100000" value={form.accidentCover} onChange={e => setForm({ ...form, accidentCover: parseInt(e.target.value) })} className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
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
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><div className="w-2 h-2 bg-primary animate-pulse rounded-full" /> Live Risk Scoring</h3>

                        {/* EMR Gauge */}
                        <div className="flex flex-col items-center gap-4 mb-8">
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="80" cy="80" r="70" className="stroke-slate-800" strokeWidth="12" fill="none" />
                                    <circle cx="80" cy="80" r="70" className="transition-all duration-1000 ease-out" stroke={calcResult.color} strokeWidth="12"
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - (440 * Math.min(calcResult.emr, 200) / 200)}
                                        strokeLinecap="round" fill="none" />
                                </svg>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-4xl font-black">{calcResult.emr}</span>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">EMR Score</span>
                                </div>
                            </div>
                        </div>

                        {/* EMR Breakdown */}
                        <div className="space-y-2 mb-6 bg-white/5 rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">EMR Breakdown</p>
                            {[
                                { label: 'BMI',         val: calcResult.breakdown.bmi,        color: '#60a5fa' },
                                { label: 'Family',       val: calcResult.breakdown.family,     color: '#a78bfa' },
                                { label: 'Health',       val: calcResult.breakdown.health,     color: '#f87171' },
                                { label: 'Co-morbidity', val: calcResult.breakdown.comorbidity, color: '#f59e0b' },
                                { label: 'Lifestyle',    val: calcResult.breakdown.lifestyle,  color: '#fb923c' },
                                { label: 'Habit Combo',  val: calcResult.breakdown.habitCombo, color: '#ef4444' },
                            ].map(item => (
                                item.val !== 0 && (
                                    <div key={item.label} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">{item.label}</span>
                                        <span className="font-bold" style={{ color: item.color }}>{item.val > 0 ? '+' : ''}{item.val}</span>
                                    </div>
                                )
                            ))}
                        </div>

                        {/* Class & Factor */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ backgroundColor: calcResult.color + '20', color: calcResult.color }}><Shield size={16} /></div>
                                    <span className="font-bold text-sm">Life Class / Factor</span>
                                </div>
                                <span className="font-black text-sm" style={{ color: calcResult.color }}>
                                    Class {calcResult.lifeClass} / ×{calcResult.lifeFactor}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/20"><Heart size={16} className="text-indigo-400" /></div>
                                    <span className="font-bold text-sm">Health Class / Factor</span>
                                </div>
                                <span className="font-black text-sm text-indigo-400">
                                    Class {calcResult.healthClass} / ×{calcResult.healthFactor}
                                </span>
                            </div>
                        </div>

                        {/* Premium Breakdown */}
                        <div className="pt-6 border-t border-white/10">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Premium Breakdown</p>
                            <div className="space-y-2 mb-4">
                                {calcResult.lifePremium > 0    && <div className="flex justify-between text-sm"><span className="text-slate-400">Life</span><span className="font-bold">{fc(calcResult.lifePremium)}</span></div>}
                                {calcResult.cirPremium > 0     && <div className="flex justify-between text-sm"><span className="text-slate-400">CIR</span><span className="font-bold">{fc(calcResult.cirPremium)}</span></div>}
                                {calcResult.accPremium > 0 && <div className="flex justify-between text-sm"><span className="text-slate-400">Accident</span><span className="font-bold">{fc(calcResult.accPremium)}</span></div>}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-primary">{fc(calcResult.total)}</span>
                                <span className="text-sm font-bold text-slate-500">/ year</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] shadow-lg">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-primary" /> AI Insights</h4>
                        <div className="space-y-3">
                            {parseInt(form.age) > 45 && <p className="text-sm text-slate-500 flex gap-2"><Info size={16} className="shrink-0 text-amber-500" /> Age {form.age} → higher rate band applies.</p>}
                            {form.conditions.length >= 2 && <p className="text-sm text-slate-500 flex gap-2"><AlertCircle size={16} className="shrink-0 text-red-500" /> Co-morbidity: +{form.conditions.length >= 3 ? 40 : 20} EMR for {form.conditions.length} conditions.</p>}
                            {calcResult.breakdown.habitCombo > 0 && <p className="text-sm text-slate-500 flex gap-2"><AlertCircle size={16} className="shrink-0 text-yellow-500" /> Reducing one habit could save ~{fc(Math.round(calcResult.total * 0.08))} annually.</p>}
                            {form.conditions.length === 0 && calcResult.emr <= 35 && <p className="text-sm text-slate-500 flex gap-2"><CheckCircle2 size={16} className="shrink-0 text-green-500" /> Excellent health profile — Class I rate applies.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
