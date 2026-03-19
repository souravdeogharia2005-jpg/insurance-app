import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateInsurance } from '../utils/emr';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Shield, User, Scale, Activity, Heart, Info, 
    ChevronRight, ChevronLeft, CheckCircle2, 
    AlertTriangle, Download, TrendingUp, Laptop, 
    Plane, Car, Anchor, Factory, HardHat
} from 'lucide-react';
import { jsPDF } from "jspdf";

const DISEASES = [
    { id: 'thyroid', label: 'Thyroid', icon: '🦋' },
    { id: 'asthma', label: 'Asthma', icon: '🫁' },
    { id: 'hypertension', label: 'Hypertension', icon: '🫀' },
    { id: 'diabetes', label: 'Diabetes', icon: '🩸' },
    { id: 'gut_disorder', label: 'Gut Disorder', icon: '🔬' }
];

const OCCUPATIONS = [
    { id: 'normal', label: 'Normal (Desk Job)', icon: Laptop },
    { id: 'athlete', label: 'Athlete', icon: Activity },
    { id: 'pilot', label: 'Pilot', icon: Plane },
    { id: 'driver', label: 'Driver', icon: Car },
    { id: 'merchant_navy', label: 'Merchant Navy', icon: Anchor },
    { id: 'oil_industry', label: 'Oil/Gas Industry', icon: Factory },
    { id: 'hazardous', label: 'Hazardous (Mining/Industrial)', icon: HardHat },
];

export default function ProposalPage() {
    const { t, fc, user: authUser } = useApp();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submittedId, setSubmittedId] = useState(null);

    const [form, setForm] = useState({
        // 1. Basic Details
        name: '', gender: 'male', dob: '', age: '', 
        residence: 'urban', occupation: 'normal', 
        income: 500000, incomeSource: 'Salary',
        
        // 2. Body Details
        height: '', weight: '', bmi: '',
        
        // 3. Family History
        parentStatus: 'both_below_65', // Default: parents died <65 (Wait, user said both parents alive <65 -> 0)
        
        // 4. Health Conditions
        diseases: {}, // { thyroid: 2, asthma: 1 }
        
        // 5. Personal Habits
        smoking: 0, alcohol: 0, tobacco: 0,
        
        // 6. Insurance Requirement
        lifeCover: 10000000, // 1 Cr default
        cirCover: 5000000,  // 50 L default
        accCover: 5000000,  // 50 L default
    });

    // Auto-calculate Age
    useEffect(() => {
        if (form.dob) {
            const birth = new Date(form.dob);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
            setForm(prev => ({ ...prev, age: age > 0 ? age : '' }));
        }
    }, [form.dob]);

    // Auto-calculate BMI
    useEffect(() => {
        if (form.height && form.weight) {
            const hm = parseFloat(form.height) / 100;
            const bmi = hm > 0 ? (parseFloat(form.weight) / (hm * hm)) : 0;
            setForm(prev => ({ ...prev, bmi: bmi.toFixed(1) }));
        }
    }, [form.height, form.weight]);

    const [calcResult, setCalcResult] = useState(calculateInsurance(form));

    useEffect(() => {
        setCalcResult(calculateInsurance(form));
    }, [form]);

    // Cover Validation
    const getEligibilityWarning = () => {
        const age = parseInt(form.age);
        const income = parseFloat(form.income);
        const cover = parseFloat(form.lifeCover);
        if (!age || !income || !cover) return null;

        let multiplier = 10;
        if (age <= 35) multiplier = 25;
        else if (age <= 45) multiplier = 20;
        else if (age <= 55) multiplier = 15;
        
        if (cover > income * multiplier) return `Requested cover exceeds eligibility (${multiplier}× income max)`;
        return null;
    };

    const handleDiseaseToggle = (id) => {
        const newDiseases = { ...form.diseases };
        if (newDiseases[id]) delete newDiseases[id];
        else newDiseases[id] = 1; // Default level 1
        setForm({ ...form, diseases: newDiseases });
    };

    const handleSeverity = (id, level) => {
        setForm({ ...form, diseases: { ...form.diseases, [id]: level } });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...form,
                emrScore: calcResult.emr,
                emrBreakdown: calcResult.breakdown,
                riskClass: 'Class ' + calcResult.lifeClass,
                premium: {
                    life: calcResult.lifePremium,
                    cir: calcResult.cirPremium,
                    accident: calcResult.accPremium,
                    total: calcResult.total,
                    lifeFactor: calcResult.lifeFactor,
                },
                source: 'manual'
            };
            const res = await createProposal(payload);
            setSubmittedId(res.id);
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text("AegisAI Underwriting Report", 20, 20);
        doc.setFontSize(12);
        doc.text(`Proposer Name: ${form.name}`, 20, 40);
        doc.text(`Age/Gender: ${form.age} / ${form.gender}`, 20, 48);
        doc.text(`Occupation: ${form.occupation}`, 20, 56);
        doc.text(`---------------------------------------`, 20, 64);
        doc.text(`EMR Score: ${calcResult.emr}`, 20, 72);
        doc.text(`Risk Class: ${calcResult.lifeClass}`, 20, 80);
        doc.text(`Total Yearly Premium: ${fc(calcResult.total)}`, 20, 88);
        doc.save(`${form.name}_Report.pdf`);
    };

    if (submittedId) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{background: 'linear-gradient(160deg, #F0F7FF, #F8FBFF)'}}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="p-10 rounded-[2.5rem] shadow-2xl text-center max-w-lg w-full"
                    style={{background:'white', border:'1.5px solid #BFDBFE'}}>
                    <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-xl" style={{background:'linear-gradient(135deg,#22C55E,#16A34A)'}}>
                        <CheckCircle2 size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Policy Finalized</h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest mb-10 text-xs">Aegis Vault ID: {submittedId}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">EMR Class</p>
                            <p className="text-xl font-black text-slate-900" style={{ color: calcResult.color }}>Class {calcResult.lifeClass}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Yearly Total</p>
                            <p className="text-xl font-black text-slate-900">{fc(calcResult.total)}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button onClick={generatePDF} className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black transition hover:bg-slate-200 flex items-center justify-center gap-2">
                            <Download size={20} /> Download report
                        </button>
                        <button onClick={() => window.location.href = '/dashboard'} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black transition hover:scale-[1.02] active:scale-95 shadow-xl">
                            Go to Dashboard
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const next = () => setStep(s => s + 1);
    const prev = () => setStep(s => s - 1);

    return (
        <div style={{background: 'linear-gradient(160deg, #F0F7FF 0%, #F8FBFF 100%)'}} className="min-h-screen pt-24 pb-32 px-4 md:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                
                {/* Header Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4" style={{background:'#EFF6FF', color:'#2563EB', border:'1px solid #BFDBFE'}}>
                            <Shield size={12} /> Underwriting V5.0
                        </div>
                        <h1 className="text-4xl font-black tracking-tight" style={{color:'#1E3A8A'}}>Smart Quote Assessment</h1>
                        <p className="mt-2 font-medium" style={{color:'#475569'}}>Providing clear, accurate risk insights for your customer.</p>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-2xl" style={{background:'white', border:'1.5px solid #BFDBFE'}}>
                        {Array(4).fill(0).map((_, i) => (
                            <div key={i} className={`h-2 rounded-full transition-all`} style={{width: step >= i ? '40px' : '24px', background: step >= i ? '#2563EB' : '#BFDBFE'}} />
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-5 gap-8">
                    {/* Main Form Area */}
                    <div className="lg:col-span-3 space-y-8">
                        <AnimatePresence mode="wait">
                            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="rounded-[2.5rem] p-8 md:p-10"
                                style={{background:'white', border:'1.5px solid #BFDBFE', boxShadow:'0 4px 24px rgba(37,99,235,.07)'}}>
                                
                                {/* STEP 1: PERSONAL & BODY */}
                                {step === 0 && (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'#EFF6FF', color:'#2563EB'}}><User size={24} /></div>
                                            <h3 className="text-xl font-black" style={{color:'#1E3A8A'}}>Basic & Body Details</h3>
                                        </div>
                                        
                                        <div className="grid gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                                <input className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black focus:ring-2 focus:ring-indigo-100 transition-all outline-none" placeholder="Proposer Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                                    <select className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black appearance-none outline-none" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2 text-right">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">DOB</label>
                                                    <input type="date" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black outline-none" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Height (cm)</label>
                                                    <input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black outline-none" placeholder="175" value={form.height} onChange={e => setForm({...form, height: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                                                    <input type="number" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black outline-none" placeholder="70" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Auto BMI</label>
                                                    <div className="w-full bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 text-sm font-black text-indigo-600 text-center">{form.bmi || '—'}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Residence</label>
                                                    <select className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black outline-none" value={form.residence} onChange={e => setForm({...form, residence: e.target.value})}>
                                                        <option value="urban">Urban</option>
                                                        <option value="rural">Rural</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source of Income</label>
                                                    <input className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black outline-none" placeholder="e.g. Salary" value={form.incomeSource} onChange={e => setForm({...form, incomeSource: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: FAMILY & HEALTH */}
                                {step === 1 && (
                                    <div className="space-y-10">
                                        <div>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'#EFF6FF', color:'#2563EB'}}><Heart size={24} /></div>
                                                <h3 className="text-xl font-black" style={{color:'#1E3A8A'}}>Family & Health History</h3>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Health Status</label>
                                                <div className="grid gap-3">
                                                    {[
                                                        { id: 'both_above_65', label: 'Both parents alive (> 65)' },
                                                        { id: 'one_above_65', label: 'Only one parent alive (> 65)' },
                                                        { id: 'both_below_65', label: 'Parents died (< 65) or Both Alive (<65)' },
                                                    ].map(opt => (
                                                        <button key={opt.id} onClick={() => setForm({...form, parentStatus: opt.id})} className={`p-4 rounded-2xl text-left border-2 transition-all font-bold text-sm`}
                                                        style={form.parentStatus === opt.id ? {background:'#EFF6FF', borderColor:'#2563EB', color:'#1E3A8A'} : {background:'#F8FBFF', borderColor:'#BFDBFE', color:'#475569'}}>
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400 italic mt-2 ml-1">Note: Ignore Accidental Death</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Medical Conditions</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {DISEASES.map(d => (
                                                    <button key={d.id} onClick={() => handleDiseaseToggle(d.id)} className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${form.diseases[d.id] ? 'bg-indigo-50 border-indigo-600' : 'bg-slate-50 border-transparent grayscale'}`}>
                                                        <span className="text-2xl">{d.icon}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{d.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="space-y-4">
                                                {Object.keys(form.diseases).map(id => {
                                                    const d = DISEASES.find(x => x.id === id);
                                                    return (
                                                        <div key={id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-left-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-2xl">{d.icon}</span>
                                                                <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{d.label} Severity</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {[1,2,3,4].map(l => (
                                                                    <button key={l} onClick={() => handleSeverity(id, l)} className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${form.diseases[id] === l ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-indigo-600 border border-slate-200'}`}>L{l}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: HABITS & OCCUPATION */}
                                {step === 2 && (
                                    <div className="space-y-10">
                                        <div>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Activity size={24} /></div>
                                                <h3 className="text-xl font-black text-slate-900">Lifestyle & Occupation</h3>
                                            </div>

                                            <div className="space-y-6">
                                                {['smoking', 'alcohol', 'tobacco'].map(h => (
                                                    <div key={h} className="space-y-3">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{h.replace('_', ' ')}</label>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[
                                                                { v: 0, l: 'Never' },
                                                                { v: 1, l: 'Occas.' },
                                                                { v: 2, l: 'Moderate' },
                                                                { v: 3, l: 'High' }
                                                            ].map(opt => (
                                                                <button key={opt.v} onClick={() => setForm({...form, [h]: opt.v})} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${form[h] === opt.v ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                                                    {opt.l}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Occupational Risk</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {OCCUPATIONS.map(occ => (
                                                    <button key={occ.id} onClick={() => setForm({...form, occupation: occ.id})} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${form.occupation === occ.id ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-500'}`}>
                                                        <occ.icon size={20} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{occ.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: INSURANCE & VALIDATION */}
                                {step === 3 && (
                                    <div className="space-y-10">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><TrendingUp size={24} /></div>
                                            <h3 className="text-xl font-black text-slate-900">Financial Requirements</h3>
                                        </div>

                                        <div className="grid gap-8">
                                            <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                                                <div className="flex justify-between items-center mb-4">
                                                    <label className="text-xs font-black text-indigo-900 uppercase tracking-widest">Annual Income (INR)</label>
                                                    <span className="text-xl font-black text-indigo-600">{fc(form.income)}</span>
                                                </div>
                                                <input type="range" min="100000" max="10000000" step="50000" value={form.income} onChange={e => setForm({...form, income: e.target.value})} className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                            </div>

                                            <div className="space-y-6">
                                                {[
                                                   { id: 'lifeCover', label: 'Life Cover Required', default: '100 Lakhs' },
                                                   { id: 'cirCover', label: 'CIR Cover Required', default: '50 Lakhs' },
                                                   { id: 'accCover', label: 'Accident Rider', default: '50 Lakhs' }
                                                ].map(c => (
                                                    <div key={c.id} className="space-y-2">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</label>
                                                            <span className="text-[10px] font-black text-indigo-400">Default: {c.default}</span>
                                                        </div>
                                                        <input type="number" className={`w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black outline-none ${c.id === 'lifeCover' && getEligibilityWarning() ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`} value={form[c.id]} onChange={e => setForm({...form, [c.id]: e.target.value})} />
                                                    </div>
                                                ))}
                                            </div>

                                            {getEligibilityWarning() && (
                                                <div className="flex gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700 text-xs font-bold animate-pulse">
                                                    <AlertTriangle className="shrink-0" />
                                                    <p>{getEligibilityWarning()}</p>
                                                </div>
                                            )}
                                        </div>

                                        <button onClick={handleSubmit} disabled={loading || getEligibilityWarning()} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black transition hover:bg-slate-800 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 active:scale-95 shadow-2xl">
                                            {loading ? <Activity className="animate-spin" /> : <Shield />} Submit for Underwriting
                                        </button>
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="mt-12 flex items-center justify-between gap-4 pt-8 border-t border-slate-100">
                                    {step > 0 && (
                                        <button onClick={prev} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest transition hover:bg-slate-100 flex items-center justify-center gap-2">
                                            <ChevronLeft size={16} /> Back
                                        </button>
                                    )}
                                    {step < 3 && (
                                        <button onClick={next} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100">
                                            Next Step <ChevronRight size={16} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Sidebar: Real-time Analysis */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 text-indigo-500 opacity-20"><BrainCircuit size={120} /></div>
                            
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8">Live Risk Engine</p>
                                
                                <div className="flex items-center gap-10 mb-10">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="64" cy="64" r="58" className="stroke-white/10" strokeWidth="10" fill="none" />
                                            <circle cx="64" cy="64" r="58" className="transition-all duration-1000 ease-out" 
                                                stroke={calcResult.color} strokeWidth="10" 
                                                strokeDasharray={364} strokeDashoffset={364 - (364 * Math.min(calcResult.emr, 200) / 200)} 
                                                strokeLinecap="round" fill="none" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black">{calcResult.emr}</span>
                                            <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">EMR pts</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Class</p>
                                            <p className="text-2xl font-black" style={{ color: calcResult.color }}>{calcResult.lifeClass}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Loading</p>
                                            <p className="text-2xl font-black text-indigo-400">×{calcResult.lifeFactor}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-white/5">
                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-40">BMI Impact</span><span>+{calcResult.breakdown.bmi}</span></div>
                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-40">Disease Addon</span><span>+{calcResult.breakdown.health}</span></div>
                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-40">Co-morbidity</span><span>+{calcResult.breakdown.comorbidity}</span></div>
                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-40">Habit Loading</span><span>+{calcResult.breakdown.lifestyle}</span></div>
                                    <div className="flex justify-between text-xs font-bold"><span className="opacity-40">Habit Combo</span><span>+{calcResult.breakdown.habitCombo}</span></div>
                                </div>

                                {/* Step-by-Step Audit */}
                                <div className="mt-8 space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Step-by-Step Audit</p>
                                    <div className="space-y-3 text-[10px] font-bold text-slate-400">
                                        <div className="flex gap-3"><span className="text-indigo-400">Step 1:</span> <span>BMI {form.bmi} → +{calcResult.breakdown.bmi} EMR</span></div>
                                        <div className="flex gap-3"><span className="text-indigo-400">Step 2:</span> <span>Family Hist → {calcResult.breakdown.family} EMR</span></div>
                                        <div className="flex gap-3"><span className="text-indigo-400">Step 3:</span> <span>Health Cond → +{calcResult.breakdown.health} EMR</span></div>
                                        <div className="flex gap-3"><span className="text-indigo-400">Step 4:</span> <span>Co-morbidity → +{calcResult.breakdown.comorbidity} EMR</span></div>
                                        <div className="flex gap-3"><span className="text-indigo-400">Step 5:</span> <span>Total EMR → {calcResult.emr} (Class {calcResult.lifeClass})</span></div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp size={16} className="text-indigo-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Smart Insight</span>
                                    </div>
                                    {calcResult.emr > 20 ? (
                                        <p className="text-[10px] font-medium leading-relaxed opacity-60">"Reducing BMI to 23 and quitting habits could lower your class from {calcResult.lifeClass} to I, saving approx ₹22,000/yr."</p>
                                    ) : (
                                        <p className="text-[10px] font-medium leading-relaxed opacity-60">"Excellent profile. Standard preferred rates apply. No extra loading required."</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center gap-2">
                                <Info size={16} className="text-indigo-600" /> Underwriting Guidelines
                            </h4>
                            <div className="space-y-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1" />
                                    <p>Severity L1-L4 must be defined for each selected disease.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1" />
                                    <p>Co-morbidity applies extra +40 if 3+ diseases exist.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1" />
                                    <p>High habit combinations trigger +40 multiplier penalty.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function BrainCircuit({ size }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 8.105 4 4 0 0 0 6.136 2.127A3.001 3.001 0 1 0 12 5Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 7 11"/><path d="M21.221 8.893a3 3 0 0 0-3.976-3.977"/><path d="M14 6.8V4"/><path d="M14.5 9h2.5"/><path d="M14 11.2V14"/><path d="M11.5 9h-2"/><path d="M18 10h1.5"/><path d="M18 12v-1.5"/><path d="M21 15v1.5"/><path d="M19.5 15H21"/><path d="M15 15h1.5"/><path d="M15 12v3"/></svg>
    )
}
