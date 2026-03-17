import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal, scanDocument } from '../utils/api';
import { calculateEMR, getRiskClass, calculatePremium } from '../utils/emr';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Camera, CheckCircle, Loader, Activity, Shield, AlertTriangle, FileText, ChevronRight, ChevronLeft } from 'lucide-react';

// ── The actual conditions & habits from the proposal form ──
const HEALTH_CONDITIONS = [
    { key: 'thyroid', label: 'Thyroid', mapped: 'respiratory' },
    { key: 'asthma', label: 'Asthma', mapped: 'respiratory' },
    { key: 'hypertension', label: 'Hypertension', mapped: 'hypertension' },
    { key: 'diabetes', label: 'Diabetes Mellitus', mapped: 'diabetes' },
    { key: 'gut_disorder', label: 'Gut Disorder', mapped: 'liver' },
];
const SEVERITY_LEVELS = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Level 1 – Borderline (no medicine)' },
    { value: 2, label: 'Level 2 – Basic medicines' },
    { value: 3, label: 'Level 3 – Middle dose medication' },
    { value: 4, label: 'Level 4 – Very high dose medication' },
];
const HABIT_OPTIONS = [
    { value: 'never', label: 'Never' },
    { value: 'occasional', label: 'Occasionally' },
    { value: 'moderate', label: 'Regular (moderate)' },
    { value: 'heavy', label: 'Regular (high dose)' },
];
const OCCUPATION_OPTIONS = [
    { value: 'desk_job', label: 'Desk Job / Office / IT / Teacher' },
    { value: 'light_manual', label: 'Light Manual Work' },
    { value: 'moderate_physical', label: 'Moderate Physical (Farmer, etc.)' },
    { value: 'heavy_manual', label: 'Heavy Manual (Construction, Driver)' },
    { value: 'hazardous', label: 'Hazardous (Mining, Oil & Gas)' },
    { value: 'extreme_risk', label: 'Extreme Risk (Pilot, Athlete, Navy)' },
];
const FAMILY_OPTIONS = [
    { value: 'alive_healthy', label: 'Both Surviving (age > 65)' },
    { value: 'deceased_after_60', label: 'Only One Surviving (age > 65)' },
    { value: 'deceased_before_60', label: 'Both Died (age < 65)' },
];

const INITIAL_FORM = {
    name: '', gender: 'male', residence: '', dob: '', profession: '',
    height: '', weight: '', income: '', incomeSource: '',
    lifeCover: '', cirCover: '', accidentCover: '',
    parentStatus: 'alive_healthy',
    thyroid: 0, asthma: 0, hypertension: 0, diabetes: 0, gut_disorder: 0,
    smoking: 'never', alcohol: 'never', tobacco: 'never',
    occupation: 'desk_job',
};

export default function ScanPage() {
    const { t, fc } = useApp();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const cameraRef = useRef(null);
    const canvasRef = useRef(null);

    const [mode, setMode] = useState('form'); // 'form' | 'scanning' | 'scanned'
    const [form, setForm] = useState({ ...INITIAL_FORM });
    const [step, setStep] = useState(0); // 0-4 form steps
    const [scanProgress, setScanProgress] = useState(0);
    const [creating, setCreating] = useState(false);
    const [ocrLog, setOcrLog] = useState('');

    // ── Derived calculations (auto-update on any form change) ──
    const age = (() => {
        if (!form.dob) return '';
        const b = new Date(form.dob);
        return Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    })();

    const bmi = (() => {
        if (!form.height || !form.weight) return '';
        const hm = parseFloat(form.height) / 100;
        return hm > 0 ? (parseFloat(form.weight) / (hm * hm)).toFixed(1) : '';
    })();

    const conditions = HEALTH_CONDITIONS.filter(c => form[c.key] > 0).map(c => c.mapped);
    const severities = {};
    HEALTH_CONDITIONS.forEach(c => { if (form[c.key] > 0) severities[c.mapped] = form[c.key]; });

    const emrResult = calculateEMR({
        fatherStatus: form.parentStatus, motherStatus: form.parentStatus,
        conditions, severities,
        smoking: form.smoking, alcohol: form.alcohol, tobacco: form.tobacco,
        occupation: form.occupation,
    });
    const riskResult = getRiskClass(emrResult.totalEMR);
    const premResult = calculatePremium({
        lifeCover: parseFloat(form.lifeCover) || 0,
        cirCover: parseFloat(form.cirCover) || 0,
        accidentCover: parseFloat(form.accidentCover) || 0,
    }, emrResult.totalEMR);

    const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    // ── Smart Scanner: Use Backend Gemini Vision API ──
    const handleScanFile = async (file) => {
        if (!file) return;
        setMode('scanning');
        setScanProgress(0);
        setOcrLog('');

        try {
            // Fake progress bar for better UX while waiting for Gemini
            const progressInterval = setInterval(() => {
                setScanProgress(p => p >= 90 ? 90 : p + 5);
            }, 500);

            // Call the backend Gemini Scanner
            const extractedData = await scanDocument(file);
            
            clearInterval(progressInterval);
            setScanProgress(100);
            console.log('✅ GEMINI EXTRACTED DATA:', extractedData);
            
            // Map the Gemini JSON schema to our React form state
            const updates = {};
            
            if (extractedData.basic_details) {
                const bd = extractedData.basic_details;
                if (bd.name) updates.name = bd.name;
                
                const gLow = (bd.gender || '').toLowerCase();
                if (gLow === 'male' || gLow === 'female' || gLow === 'other') updates.gender = gLow;
                
                if (bd.date_of_birth) updates.dob = bd.date_of_birth.replace(/\//g, '-');
                if (bd.place_of_residence) updates.residence = bd.place_of_residence;
                if (bd.profession) updates.profession = bd.profession;
                
                if (bd.height_cm) updates.height = bd.height_cm.toString();
                if (bd.weight_kg) updates.weight = bd.weight_kg.toString();
                
                if (bd.yearly_income) updates.income = bd.yearly_income.toString().replace(/[,\s₹]/g, '');
                
                if (bd.base_cover_required) updates.lifeCover = bd.base_cover_required.toString().replace(/[,\s₹]/g, '');
                if (bd.cir_cover_required) updates.cirCover = bd.cir_cover_required.toString().replace(/[,\s₹]/g, '');
                if (bd.accident_cover_required) updates.accidentCover = bd.accident_cover_required.toString().replace(/[,\s₹]/g, '');
            }

            if (extractedData.family_history && extractedData.family_history.parent_status) {
                const p = extractedData.family_history.parent_status.toLowerCase();
                if (p.includes('both surviving') || p.includes('alive')) updates.parentStatus = 'alive_healthy';
                else if (p.includes('only one') || p.includes('after')) updates.parentStatus = 'deceased_after_60';
                else if (p.includes('both died') || p.includes('before')) updates.parentStatus = 'deceased_before_60';
            }

            if (extractedData.health_conditions) {
                const hc = extractedData.health_conditions;
                if (hc.thyroid !== undefined && hc.thyroid !== null) updates.thyroid = Number(hc.thyroid);
                if (hc.asthma !== undefined && hc.asthma !== null) updates.asthma = Number(hc.asthma);
                if (hc.hyper_tension !== undefined && hc.hyper_tension !== null) updates.hypertension = Number(hc.hyper_tension);
                if (hc.diabetes_mellitus !== undefined && hc.diabetes_mellitus !== null) updates.diabetes = Number(hc.diabetes_mellitus);
                if (hc.gut_disorder !== undefined && hc.gut_disorder !== null) updates.gut_disorder = Number(hc.gut_disorder);
            }

            if (extractedData.personal_habits) {
                const mapHabit = (val) => {
                    const v = (val || '').toLowerCase();
                    if (v.includes('never') || !v || v === 'none') return 'never';
                    if (v.includes('occasion')) return 'occasional';
                    if (v.includes('moderate')) return 'moderate';
                    if (v.includes('heavy') || v.includes('high')) return 'heavy';
                    return 'never';
                };
                
                updates.smoking = mapHabit(extractedData.personal_habits.smoking);
                updates.alcohol = mapHabit(extractedData.personal_habits.alcoholic_drinks);
                updates.tobacco = mapHabit(extractedData.personal_habits.tobacco);
            }
            
            if (extractedData.occupation_risk) {
                const oc = extractedData.occupation_risk.toLowerCase();
                if (oc.includes('desk') || oc.includes('office')) updates.occupation = 'desk_job';
                else if (oc.includes('light')) updates.occupation = 'light_manual';
                else if (oc.includes('moderate') || oc.includes('public carrier')) updates.occupation = 'moderate_physical';
                else if (oc.includes('heavy')) updates.occupation = 'heavy_manual';
                else if (oc.includes('hazardous') || oc.includes('oil')) updates.occupation = 'hazardous';
                else if (oc.includes('extreme') || oc.includes('pilot') || oc.includes('navy')) updates.occupation = 'extreme_risk';
            }

            setForm(prev => ({ ...prev, ...updates }));
            setMode('scanned');

        } catch (error) {
            console.error('Scan Failed:', error);
            alert(error.message || 'Scan failed. Please try a clearer image or fill the form manually.');
            setMode('form');
        }
    };

    // ── Create proposal ──
    const handleCreate = async () => {
        if (!form.name) { alert('Please enter a name'); return; }
        setCreating(true);
        try {
            await createProposal({
                name: form.name, age: age || 0, gender: form.gender, dob: form.dob,
                residence: form.residence, profession: form.profession,
                height: parseFloat(form.height) || 0, weight: parseFloat(form.weight) || 0,
                bmi: parseFloat(bmi) || 0, income: form.income, incomeSource: form.incomeSource,
                conditions, severities,
                smoking: form.smoking, alcohol: form.alcohol, tobacco: form.tobacco,
                occupation: form.occupation,
                lifeCover: parseFloat(form.lifeCover) || 0,
                cirCover: parseFloat(form.cirCover) || 0,
                accidentCover: parseFloat(form.accidentCover) || 0,
                emrScore: emrResult.totalEMR,
                emrBreakdown: emrResult.breakdown,
                riskClass: riskResult.class,
                premium: premResult,
                status: 'pending',
                source: mode === 'scanned' ? 'scan' : 'manual',
            });
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            alert('Failed to create proposal. Please try again.');
        } finally { setCreating(false); }
    };

    const STEPS = [
        { title: '🧾 Basic Details', icon: '📋' },
        { title: '👨‍👩‍👧 Family & Health', icon: '🏥' },
        { title: '🚬 Habits & Occupation', icon: '💼' },
        { title: '💰 Coverage', icon: '🛡️' },
        { title: '📊 Review & Premium', icon: '✅' },
    ];

    return (
        <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 max-w-4xl mx-auto">
            <canvas ref={canvasRef} hidden />

            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Insurance Proposal</h1>
                    <p className="text-slate-500 mt-1">Fill the form or scan a physical proposal</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        <Upload size={16} /> Scan Form
                    </button>
                    <button onClick={() => cameraRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        <Camera size={16} /> Camera
                    </button>
                    <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => handleScanFile(e.target.files[0])} />
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleScanFile(e.target.files[0])} />
                </div>
            </div>

            {/* Scanning Overlay */}
            <AnimatePresence>
                {mode === 'scanning' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-sm w-full text-center border border-slate-200 dark:border-slate-800">
                            <div className="w-16 h-16 mx-auto mb-4 relative">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader size={32} className="text-primary animate-spin" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Scanning Document...</h3>
                            <p className="text-sm text-slate-500 mb-4">Extracting handwritten values ({scanProgress}%)</p>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scanned notification */}
            {mode === 'scanned' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Scan Complete — Please Review</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">OCR extracted what it could. Empty/incorrect fields are normal — edit them manually below. Premium updates in real-time as you type.</p>
                    </div>
                </motion.div>
            )}

            {/* Step Indicator */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {STEPS.map((s, i) => (
                    <button key={i} onClick={() => setStep(i)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${step === i ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span>{s.icon}</span> {s.title}
                    </button>
                ))}
            </div>

            {/* Form Content */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 mb-6">
                <AnimatePresence mode="wait">
                    {/* Step 0: Basic Details */}
                    {step === 0 && (
                        <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Full Name *" value={form.name} onChange={v => updateForm('name', v)} placeholder="e.g. Sourav Deogharia" />
                                <FormSelect label="Gender" value={form.gender} onChange={v => updateForm('gender', v)}
                                    options={[['male', 'Male'], ['female', 'Female'], ['other', 'Other']]} />
                                <FormInput label="Place of Residence" value={form.residence} onChange={v => updateForm('residence', v)} placeholder="e.g. Mumbai" />
                                <FormInput label="Date of Birth" value={form.dob} onChange={v => updateForm('dob', v)} type="date" />
                                <FormInput label="Profession" value={form.profession} onChange={v => updateForm('profession', v)} placeholder="e.g. Software Engineer" />
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Age (auto)</label>
                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white font-semibold">
                                        {age || '—'}
                                    </div>
                                </div>
                                <FormInput label="Height (cm)" value={form.height} onChange={v => updateForm('height', v)} type="number" placeholder="e.g. 175" />
                                <FormInput label="Weight (kg)" value={form.weight} onChange={v => updateForm('weight', v)} type="number" placeholder="e.g. 72" />
                                <FormInput label="Yearly Income (₹)" value={form.income} onChange={v => updateForm('income', v)} type="number" placeholder="e.g. 1200000" />
                                <FormInput label="Source of Income" value={form.incomeSource} onChange={v => updateForm('incomeSource', v)} placeholder="e.g. Salaried" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                                <span>BMI: <strong className="text-slate-700 dark:text-slate-200">{bmi || '—'}</strong></span>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 1: Family & Health */}
                    {step === 1 && (
                        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Family History</h4>
                                <FormSelect label="Parent Health Status" value={form.parentStatus} onChange={v => updateForm('parentStatus', v)}
                                    options={FAMILY_OPTIONS.map(o => [o.value, o.label])} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Health Conditions — Select Severity</h4>
                                <div className="space-y-3">
                                    {HEALTH_CONDITIONS.map(c => (
                                        <div key={c.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[130px]">{c.label}</span>
                                            <select value={form[c.key]} onChange={e => updateForm(c.key, parseInt(e.target.value))}
                                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-900 dark:text-white">
                                                {SEVERITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Habits & Occupation */}
                    {step === 2 && (
                        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Personal Habits</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormSelect label="🚬 Smoking" value={form.smoking} onChange={v => updateForm('smoking', v)}
                                        options={HABIT_OPTIONS.map(o => [o.value, o.label])} />
                                    <FormSelect label="🍺 Alcohol" value={form.alcohol} onChange={v => updateForm('alcohol', v)}
                                        options={HABIT_OPTIONS.map(o => [o.value, o.label])} />
                                    <FormSelect label="🍂 Tobacco" value={form.tobacco} onChange={v => updateForm('tobacco', v)}
                                        options={HABIT_OPTIONS.map(o => [o.value, o.label])} />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-3">Occupation Risk Category</h4>
                                <FormSelect label="Occupation Type" value={form.occupation} onChange={v => updateForm('occupation', v)}
                                    options={OCCUPATION_OPTIONS.map(o => [o.value, o.label])} />
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Coverage */}
                    {step === 3 && (
                        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-2">Coverage Selection</h4>
                            <FormInput label="Base / Life Cover (₹)" value={form.lifeCover} onChange={v => updateForm('lifeCover', v)} type="number" placeholder="e.g. 5000000" />
                            <FormInput label="CIR – Critical Illness Rider (₹)" value={form.cirCover} onChange={v => updateForm('cirCover', v)} type="number" placeholder="e.g. 1000000" />
                            <FormInput label="Accident Cover (₹)" value={form.accidentCover} onChange={v => updateForm('accidentCover', v)} type="number" placeholder="e.g. 2500000" />
                        </motion.div>
                    )}

                    {/* Step 4: Review & Premium */}
                    {step === 4 && (
                        <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <SummaryItem label="Name" value={form.name} />
                                <SummaryItem label="Age" value={age} />
                                <SummaryItem label="Gender" value={form.gender} />
                                <SummaryItem label="Residence" value={form.residence} />
                                <SummaryItem label="Profession" value={form.profession} />
                                <SummaryItem label="BMI" value={bmi} />
                                <SummaryItem label="Income" value={form.income ? `₹${parseInt(form.income).toLocaleString()}` : ''} />
                                <SummaryItem label="Smoking" value={form.smoking} />
                                <SummaryItem label="Alcohol" value={form.alcohol} />
                            </div>

                            {/* Conditions */}
                            {conditions.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Health Conditions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {HEALTH_CONDITIONS.filter(c => form[c.key] > 0).map(c => (
                                            <span key={c.key} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-xs font-bold">
                                                {c.label} (Severity {form[c.key]})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Premium Card */}
                            <div className="bg-gradient-to-br from-primary/5 via-white to-blue-50 dark:from-primary/10 dark:via-slate-900 dark:to-slate-800 border border-primary/20 rounded-2xl p-6">
                                <h4 className="text-sm font-black uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                                    <Activity size={16} /> Insurance Assessment
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                    <MetricCard label="EMR Score" value={emrResult.totalEMR} />
                                    <MetricCard label="Risk Class" value={riskResult.class} color={riskResult.color} sub={riskResult.label} />
                                    <MetricCard label="Annual Premium" value={fc ? fc(premResult.total) : `₹${premResult.total.toLocaleString()}`} color="#2563eb" />
                                    <MetricCard label="Monthly" value={fc ? fc(Math.round(premResult.total / 12)) : `₹${Math.round(premResult.total / 12).toLocaleString()}`} color="#16a34a" />
                                </div>

                                {/* EMR Breakdown */}
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                    {[
                                        { label: 'Base', val: emrResult.base, color: '#6b7280' },
                                        { label: 'Family', val: emrResult.familyEMR, color: '#8b5cf6' },
                                        { label: 'Health', val: emrResult.healthEMR, color: '#ef4444' },
                                        { label: 'Lifestyle', val: emrResult.lifestyleEMR, color: '#f59e0b' },
                                        { label: 'Occupation', val: emrResult.occupationEMR, color: '#10b981' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</p>
                                            <p className="text-sm font-black" style={{ color: item.color }}>+{item.val}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Premium Breakdown */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Life</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">₹{premResult.life.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">CIR</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">₹{premResult.cir.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-2 text-center">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Accident</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">₹{premResult.accident.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
                {step > 0 && (
                    <button onClick={() => setStep(step - 1)}
                        className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        <ChevronLeft size={18} /> Back
                    </button>
                )}
                <div className="flex-1" />
                {step < 4 ? (
                    <button onClick={() => setStep(step + 1)}
                        className="px-6 py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        Next <ChevronRight size={18} />
                    </button>
                ) : (
                    <button onClick={handleCreate} disabled={creating || !form.name}
                        className="px-8 py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                        {creating ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                        {creating ? 'Creating...' : 'Create Proposal'}
                    </button>
                )}
            </div>

            {/* Live Premium Footer */}
            {(parseFloat(form.lifeCover) > 0 || parseFloat(form.cirCover) > 0 || parseFloat(form.accidentCover) > 0) && step < 4 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-8 z-50 max-w-sm mx-auto lg:mx-0">
                    <div className="bg-white dark:bg-slate-900 border border-primary/20 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Live Premium</p>
                            <p className="text-xl font-black text-primary">₹{premResult.total.toLocaleString()}<span className="text-xs text-slate-400 font-normal">/yr</span></p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400">EMR {emrResult.totalEMR}</p>
                            <p className="text-sm font-bold" style={{ color: riskResult.color }}>{riskResult.class}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

// ── Reusable Components ──
function FormInput({ label, value, onChange, type = 'text', placeholder = '' }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-400" />
        </div>
    );
}
function FormSelect({ label, value, onChange, options }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
        </div>
    );
}
function SummaryItem({ label, value }) {
    return (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{String(value || '—')}</p>
        </div>
    );
}
function MetricCard({ label, value, color, sub }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1 font-bold">{label}</p>
            <p className="text-xl font-black" style={color ? { color } : {}}>{value}</p>
            {sub && <p className="text-[10px] mt-0.5" style={color ? { color } : {}}>{sub}</p>}
        </div>
    );
}
