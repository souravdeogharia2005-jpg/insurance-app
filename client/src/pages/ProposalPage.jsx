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
            <div className="flex flex-col-reverse lg:flex-row gap-8">

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

                                    {step === 0 && (
                                        <div className="space-y-6">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                    <User size={20} />
                                                </div>
                                                <input 
                                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800"
                                                    placeholder="Full Name (eg: Shreya Deogharia)" 
                                                    type="text" 
                                                    value={form.name} 
                                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                        <Activity size={20} />
                                                    </div>
                                                    <input 
                                                        className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400" 
                                                        placeholder="Age" 
                                                        type="number" 
                                                        value={form.age} 
                                                        onChange={e => setForm({ ...form, age: e.target.value })}
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                        <User size={20} className="opacity-50" />
                                                    </div>
                                                    <select 
                                                        className="block w-full pl-12 pr-10 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
                                                        value={form.gender}
                                                        onChange={e => setForm({ ...form, gender: e.target.value })}
                                                    >
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                    <BrainCircuit size={20} />
                                                </div>
                                                <input 
                                                    className="block w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400" 
                                                    placeholder="Profession (eg: Software Engineer)" 
                                                    type="text" 
                                                    value={form.profession} 
                                                    onChange={e => setForm({ ...form, profession: e.target.value })}
                                                />
                                            </div>

                                            <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.15em] mb-4 pl-1">Physical Metrics</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-500 ml-1">Height (cm)</label>
                                                        <input 
                                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all" 
                                                            placeholder="175" 
                                                            type="number"
                                                            value={form.height}
                                                            onChange={e => setForm({ ...form, height: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-500 ml-1">Weight (kg)</label>
                                                        <input 
                                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all" 
                                                            placeholder="72" 
                                                            type="number"
                                                            value={form.weight}
                                                            onChange={e => setForm({ ...form, weight: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

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
                                                    <option value="moderate_physical">Driver / Public Carrier (+15)</option>
                                                    <option value="heavy_manual">Heavy Manual (+15)</option>
                                                    <option value="merchant_navy">Merchant Navy (+15)</option>
                                                    <option value="oil_industry">Oil & Gas / Onshore (+15)</option>
                                                    <option value="hazardous">Hazardous (Mining, etc.) (+15)</option>
                                                    <option value="athlete">Professional Athlete (+15)</option>
                                                    <option value="pilot">Commercial Pilot (+30)</option>
                                                    <option value="extreme_risk">Extreme Risk (+30)</option>
                                                </select>
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

                <div className="lg:w-[380px] space-y-6">
                    <section className="bg-[#0F172A] rounded-[32px] p-6 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden border border-white/5">
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl"></div>
                        <div className="flex items-center justify-between mb-6 relative">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <h2 className="text-xs font-bold tracking-wider uppercase opacity-80">Live Risk Scoring</h2>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center justify-center py-4 relative">
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle className="text-slate-700/50" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="6"></circle>
                                    <circle cx="50" cy="50" fill="transparent" r="42" stroke={calcResult.color} strokeDasharray="264" strokeDashoffset="66" strokeLinecap="round" strokeWidth="10" filter={`drop-shadow(0 0 8px ${calcResult.color})`} opacity={0.2}></circle>
                                    <circle cx="50" cy="50" fill="transparent" r="42" stroke={calcResult.color} strokeDasharray="264" strokeDashoffset={264 - (264 * Math.min(calcResult.emr, 200) / 200)} strokeLinecap="round" strokeWidth="6" className="transition-all duration-1000 ease-out" filter={`drop-shadow(0 0 6px ${calcResult.color}80)`}></circle>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <div className="flex items-start">
                                        <span className="text-5xl font-extrabold tracking-tighter" style={{ color: calcResult.color }}>{calcResult.emr}</span>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-50 mt-1">EMR SCORE</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 space-y-2 border border-white/5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Life Factor</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">Class {calcResult.lifeClass}</span>
                                    <span className="text-emerald-400 text-xs font-black">×{calcResult.lifeFactor}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 space-y-2 border border-white/5">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Health Factor</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white">{calcResult.healthClass}</span>
                                    <span className="text-blue-400 text-xs font-black">×{calcResult.healthFactor}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-6 border border-white/5 mt-6">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Final Premium breakdown</p>
                            <div className="space-y-3 mb-6">
                                {calcResult.lifePremium > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Life Protection</span>
                                        <span className="font-bold text-white">{fc(calcResult.lifePremium)}</span>
                                    </div>
                                )}
                                {calcResult.cirPremium > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Critical Illness</span>
                                        <span className="font-bold text-white">{fc(calcResult.cirPremium)}</span>
                                    </div>
                                )}
                                {calcResult.accPremium > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">Accident Benefit</span>
                                        <span className="font-bold text-white">{fc(calcResult.accPremium)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-1 border-t border-white/10 pt-4 mt-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-blue-400">{fc(calcResult.total)}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">/ annually</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] shadow-lg">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><TrendingUp size={16} className="text-blue-500" /> AI Insights</h4>
                        <div className="space-y-3">
                            {parseInt(form.age) > 45 && <p className="text-xs text-slate-500 flex gap-2"><Info size={14} className="shrink-0 text-amber-500" /> Age {form.age} → higher rate band applies.</p>}
                            {form.conditions.length >= 2 && <p className="text-xs text-slate-500 flex gap-2"><AlertCircle size={14} className="shrink-0 text-red-500" /> Co-morbidity: +{form.conditions.length >= 3 ? 40 : 20} EMR loading.</p>}
                            {calcResult.breakdown.habitCombo > 0 && <p className="text-xs text-slate-500 flex gap-2"><AlertCircle size={14} className="shrink-0 text-yellow-500" /> Save ~{fc(Math.round(calcResult.total * 0.08))} by reducing habit combo.</p>}
                            {calcResult.emr <= 20 && <p className="text-xs text-slate-500 flex gap-2"><CheckCircle2 size={14} className="shrink-0 text-green-500" /> Ideal profile — standard rates applied.</p>}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
