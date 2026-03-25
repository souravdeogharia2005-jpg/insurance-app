import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateInsurance } from '../utils/emr';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
    Shield, User, Activity, Heart,
    ChevronRight, ChevronLeft, CheckCircle2,
    AlertTriangle, Download, TrendingUp, Laptop,
    Plane, Car, Anchor, Factory, HardHat, Save
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
    { id: 'normal',        label: 'Normal (Desk Job)',             icon: Laptop },
    { id: 'athlete',       label: 'Professional Athlete',          icon: Activity },
    { id: 'pilot',         label: 'Pilot / Air Crew',              icon: Plane },
    { id: 'driver',        label: 'Driver (Public Carrier)',        icon: Car },
    { id: 'merchant_navy', label: 'Merchant Navy',                 icon: Anchor },
    { id: 'oil_gas',       label: 'Oil & Gas Worker',              icon: Factory },
    { id: 'hazardous',     label: 'Hazardous (Mining/Industrial)', icon: HardHat },
];

// ── Circular SVG Gauge (matches the HTML mockup exactly) ──────────────────────
function Gauge({ emr, color, trackColor = '#1e293b', textColor = 'text-white', size = 128 }) {
    const r = 56;
    const circ = 2 * Math.PI * r;           // ≈ 351.86
    const pct = emr > 0 ? Math.min(emr, 200) / 200 : 0;
    const dashOffset = circ - pct * circ;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={r} fill="transparent" stroke={trackColor} strokeWidth="8" />
                <circle cx="64" cy="64" r={r} fill="transparent"
                    stroke={emr === 0 ? trackColor : color}
                    strokeWidth="8"
                    strokeDasharray={`${circ.toFixed(2)}`}
                    strokeDashoffset={emr === 0 ? circ.toFixed(2) : dashOffset.toFixed(2)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.4s ease' }}
                />
            </svg>
            <div className="relative z-10 text-center">
                <span className={`block text-3xl md:text-4xl font-extrabold ${textColor}`}>{emr}</span>
                <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-tighter">EMR PTS</span>
            </div>
        </div>
    );
}

export default function ProposalPage() {
    const { t, fc, user: authUser } = useApp();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submittedId, setSubmittedId] = useState(null);
    const [metricsConfirmed, setMetricsConfirmed] = useState(false);
    const headingRef = useRef(null);
    const formRef = useRef(null);
    const sideRef = useRef(null);

    const [form, setForm] = useState({
        name: '', gender: 'male', dob: '', age: '',
        residence: 'urban', occupation: 'normal',
        income: 500000, incomeSource: 'Salary',
        height: '', weight: '', bmi: '',
        parentStatus: 'both_below_65',
        diseases: {},
        smoking: 0, alcohol: 0, tobacco: 0,
        lifeCover: 10000000, cirCover: 5000000, accCover: 5000000,
    });

    // ── GSAP entrance on step change ─────────────────────────────────────────
    useEffect(() => {
        const els = [headingRef.current, formRef.current, sideRef.current].filter(Boolean);
        gsap.fromTo(els,
            { y: 28, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65, stagger: 0.12, ease: 'power3.out' }
        );
    }, [step]);

    // ── Auto-calculate Age ────────────────────────────────────────────────────
    useEffect(() => {
        if (!form.dob) return;
        const birth = new Date(form.dob);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        setForm(prev => ({ ...prev, age: age > 0 ? age : '' }));
    }, [form.dob]);

    // ── Auto-calculate BMI ────────────────────────────────────────────────────
    useEffect(() => {
        if (!form.height || !form.weight) return;
        const hm = parseFloat(form.height) / 100;
        if (hm <= 0) return;
        const bmi = parseFloat(form.weight) / (hm * hm);
        setForm(prev => ({ ...prev, bmi: bmi.toFixed(1) }));
    }, [form.height, form.weight]);

    // ── Live calc — only runs when user actually has data ─────────────────────
    const hasAnyData = !!(form.bmi || form.dob || Object.keys(form.diseases).length > 0
        || form.smoking > 0 || form.alcohol > 0 || form.tobacco > 0);

    const live = hasAnyData ? calculateInsurance(form)
        : { emr: 0, lifeClass: '—', lifeFactor: 1, color: '#10b981', total: 0, lifePremium: 0, cirPremium: 0, accPremium: 0, breakdown: { bmi: 0, family: 0, health: 0, comorbidity: 0, lifestyle: 0, habitCombo: 0 } };

    // ── Cover Validation ──────────────────────────────────────────────────────
    const eligibilityWarning = () => {
        const age = parseInt(form.age), income = parseFloat(form.income), cover = parseFloat(form.lifeCover);
        if (!age || !income || !cover) return null;
        const mult = age <= 35 ? 25 : age <= 45 ? 20 : age <= 55 ? 15 : 10;
        return cover > income * mult ? `Cover exceeds eligibility (max ${mult}× income)` : null;
    };

    const handleDiseaseToggle = (id) => {
        const d = { ...form.diseases };
        if (d[id]) delete d[id]; else d[id] = 1;
        setForm({ ...form, diseases: d });
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = hasAnyData ? live : calculateInsurance(form);
            const payload = {
                ...form,
                emrScore: res.emr,
                emrBreakdown: res.breakdown,
                riskClass: 'Class ' + res.lifeClass,
                premium: { life: res.lifePremium, cir: res.cirPremium, accident: res.accPremium, total: res.total, lifeFactor: res.lifeFactor },
                source: 'manual'
            };
            const saved = await createProposal(payload);
            setSubmittedId(saved.id);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setLoading(false); }
    };

    // ── PDF ───────────────────────────────────────────────────────────────────
    const generatePDF = () => {
        const res = hasAnyData ? live : calculateInsurance(form);
        const doc = new jsPDF();
        const W = doc.internal.pageSize.getWidth();
        const blue = [37, 99, 235], green = [34, 197, 94], dark = [15, 23, 42], light = [240, 247, 255];
        doc.setFillColor(...blue); doc.rect(0, 0, W, 36, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text('AegisAI — Underwriting Report', 14, 18);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - 14, 28, { align: 'right' });
        doc.setFillColor(...green); doc.rect(0, 36, W, 3, 'F');
        let y = 48;
        const sH = (t) => {
            doc.setFillColor(...light); doc.rect(14, y - 5, W - 28, 10, 'F');
            doc.setDrawColor(...blue); doc.setLineWidth(0.5); doc.rect(14, y - 5, W - 28, 10, 'S');
            doc.setTextColor(...blue); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text(t.toUpperCase(), 18, y + 1); y += 12;
        };
        const row = (label, val) => {
            doc.setTextColor(...dark); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
            doc.text(label, 18, y); doc.setFont('helvetica', 'bold');
            doc.text(String(val), W - 14, y, { align: 'right' });
            doc.setDrawColor(200, 220, 255); doc.setLineWidth(0.2); doc.line(18, y + 2, W - 18, y + 2);
            y += 9;
        };
        sH('Proposer Details');
        row('Full Name', form.name || '—'); row('Age / DOB', `${form.age} yrs (${form.dob || '—'})`);
        row('BMI', form.bmi || '—'); sH('EMR Breakdown');
        row('Total EMR Score', res.emr); row('Risk Class', 'Class ' + res.lifeClass);
        sH('Premium'); row('Life + Accident', fc(res.lifePremium)); row('CIR', fc(res.cirPremium));
        row('Total Annual', fc(res.total));
        doc.save(`AegisAI_${(form.name || 'Report').replace(/\s+/g, '_')}.pdf`);
    };

    // ── Success screen ────────────────────────────────────────────────────────
    if (submittedId) return (
        <div className="flex flex-col items-center justify-center p-6 py-12" style={{ background: 'linear-gradient(160deg,#f0f7ff,#f8fbff)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="p-10 rounded-[2.5rem] shadow-2xl text-center max-w-lg w-full bg-white border border-blue-100">
                <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-xl" style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}>
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Policy Finalized</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest mb-10 text-xs">Aegis Vault ID: {submittedId}</p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">EMR Class</p>
                        <p className="text-xl font-black" style={{ color: live.color }}>Class {live.lifeClass}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Yearly Total</p>
                        <p className="text-xl font-black text-slate-900">{fc(live.total)}</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <button onClick={generatePDF} className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-black hover:bg-slate-200 flex items-center justify-center gap-2 transition">
                        <Download size={20} /> Download Report
                    </button>
                    <button onClick={() => window.location.href = '/dashboard'} className="w-full bg-[#0d122b] text-white py-4 rounded-2xl font-black hover:opacity-90 transition shadow-xl">
                        Go to Dashboard
                    </button>
                </div>
            </motion.div>
        </div>
    );

    const STEPS = ['Personal & Body', 'Family & Health', 'Lifestyle & Job', 'Insurance Cover'];
    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const prev = () => setStep(s => Math.max(s - 1, 0));

    return (
        <div className="w-full pt-8 pb-16 px-4 md:px-6" style={{ background: '#f0f7ff' }}>
            <div className="max-w-7xl mx-auto">

                {/* ── Page Heading ── */}
                <div ref={headingRef} className="mb-10">
                    <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black tracking-widest uppercase border border-blue-200 mb-4">
                        Underwriting v5.0
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-4xl font-extrabold text-[#0d122b] mb-2 tracking-tight">Smart Quote Assessment</h2>
                            <p className="text-gray-500 font-medium">Providing clear, accurate risk insights for your customer.</p>
                        </div>
                        {/* Progress pills */}
                        <div className="flex space-x-2">
                            {STEPS.map((_, i) => (
                                <div key={i} className="h-2 rounded-full transition-all duration-500"
                                    style={{ width: i === step ? 40 : 28, background: i <= step ? '#2563eb' : '#bfdbfe' }} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 12-Col Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* ═══════════ LEFT — Form ═══════════ */}
                    <section ref={formRef} className="lg:col-span-7">
                        <AnimatePresence mode="wait">
                            <motion.div key={step}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-[40px] p-8 md:p-10 h-full border border-gray-100"
                                style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,.08)' }}>

                                {/* ─ STEP 1: Personal & Body ─ */}
                                {step === 0 && (
                                    <div className="space-y-8">
                                        <div className="flex items-center space-x-5 mb-2">
                                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><User size={28} /></div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-[#0d122b]">Basic & Body Details</h3>
                                                <p className="text-sm text-gray-400 font-medium">Essential demographics and physical profile</p>
                                            </div>
                                        </div>

                                        {/* Full Name */}
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Full Name</label>
                                            <input className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-5 text-gray-700 font-bold placeholder-gray-400 text-lg transition-all outline-none"
                                                placeholder="Proposer Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                        </div>

                                        {/* Gender & DOB */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Gender</label>
                                                <select className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 text-gray-700 font-bold appearance-none text-lg transition-all outline-none cursor-pointer"
                                                    value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Date of Birth</label>
                                                <input type="date" className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 text-gray-700 font-bold text-lg transition-all outline-none"
                                                    value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Height / Weight / BMI */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Height (CM)</label>
                                                <input type="number" className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 text-gray-700 font-bold text-lg transition-all outline-none"
                                                    placeholder="175" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Weight (KG)</label>
                                                <input type="number" className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 text-gray-700 font-bold text-lg transition-all outline-none"
                                                    placeholder="70" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] px-1">Auto BMI Score</label>
                                                <div className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-5 text-blue-600 font-extrabold text-center text-xl">
                                                    {form.bmi || '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Residence + Income Source */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Residence</label>
                                                <select className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 text-gray-700 font-bold transition-all outline-none"
                                                    value={form.residence} onChange={e => setForm({ ...form, residence: e.target.value })}>
                                                    <option value="urban">Urban</option>
                                                    <option value="rural">Rural</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Source of Income</label>
                                                <input className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-blue-500 rounded-2xl p-5 text-gray-700 font-bold transition-all outline-none"
                                                    placeholder="e.g. Salary" value={form.incomeSource} onChange={e => setForm({ ...form, incomeSource: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Confirmation checkbox */}
                                        <div className="pt-2">
                                            <label className="flex items-center space-x-3 cursor-pointer group">
                                                <input type="checkbox" checked={metricsConfirmed} onChange={e => setMetricsConfirmed(e.target.checked)}
                                                    className="w-6 h-6 rounded-lg text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer" />
                                                <span className="text-sm font-semibold text-gray-600 group-hover:text-blue-600 transition-colors">
                                                    I confirm the body metrics are verified by official documentation.
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* ─ STEP 2: Family & Health ─ */}
                                {step === 1 && (
                                    <div className="space-y-8">
                                        <div className="flex items-center space-x-5 mb-2">
                                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Heart size={28} /></div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-[#0d122b]">Family & Health History</h3>
                                                <p className="text-sm text-gray-400 font-medium">Hereditary factors & medical conditions</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Parent Health Status</label>
                                            <div className="grid gap-3">
                                                {[
                                                    { id: 'both_above_65', label: 'Both parents alive (> 65)', emr: '−10', badgeCls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                                    { id: 'one_above_65',  label: 'Only one parent alive (> 65)', emr: '−5', badgeCls: 'bg-blue-50 border-blue-200 text-blue-700' },
                                                    { id: 'both_below_65', label: 'Both parents died (< 65)', emr: '+10', badgeCls: 'bg-red-50 border-red-200 text-red-700' },
                                                ].map(opt => (
                                                    <button key={opt.id} onClick={() => setForm({ ...form, parentStatus: opt.id })}
                                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 font-bold text-sm transition-all ${form.parentStatus === opt.id ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-[#f8fafc] border-transparent text-gray-500 hover:border-blue-200'}`}>
                                                        <span>{opt.label}</span>
                                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${opt.badgeCls}`}>{opt.emr} EMR</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic px-1">Note: Ignore accidental death</p>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Medical Conditions</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {DISEASES.map(d => (
                                                    <button key={d.id} onClick={() => handleDiseaseToggle(d.id)}
                                                        className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all gap-2 ${form.diseases[d.id] ? 'bg-blue-50 border-blue-500' : 'bg-[#f8fafc] border-transparent grayscale hover:border-blue-200 hover:grayscale-0'}`}>
                                                        <span className="text-2xl">{d.icon}</span>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{d.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {Object.keys(form.diseases).length > 0 && (
                                                <div className="space-y-3 mt-2">
                                                    {Object.keys(form.diseases).map(id => {
                                                        const d = DISEASES.find(x => x.id === id);
                                                        return (
                                                            <div key={id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f8fafc] p-5 rounded-2xl border border-blue-100">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xl">{d?.icon}</span>
                                                                    <span className="font-black text-slate-800 text-xs uppercase tracking-widest">{d?.label} — Severity</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    {[1, 2, 3, 4].map(l => (
                                                                        <button key={l} onClick={() => setForm({ ...form, diseases: { ...form.diseases, [id]: l } })}
                                                                            className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${form.diseases[id] === l ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border border-slate-200 hover:text-blue-600'}`}>L{l}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ─ STEP 3: Lifestyle & Occupation ─ */}
                                {step === 2 && (
                                    <div className="space-y-8">
                                        <div className="flex items-center space-x-5 mb-2">
                                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Activity size={28} /></div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-[#0d122b]">Lifestyle & Occupation</h3>
                                                <p className="text-sm text-gray-400 font-medium">Habits, risk profile, and occupation</p>
                                            </div>
                                        </div>
                                        <div className="space-y-6">
                                            {['smoking', 'alcohol', 'tobacco'].map(h => (
                                                <div key={h} className="space-y-3">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{h}</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[{ v: 0, l: 'Never' }, { v: 1, l: 'Occas.' }, { v: 2, l: 'Moderate' }, { v: 3, l: 'Heavy' }].map(opt => (
                                                            <button key={opt.v} onClick={() => setForm({ ...form, [h]: opt.v })}
                                                                className={`py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${form[h] === opt.v ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-[#f8fafc] text-gray-400 hover:bg-blue-50'}`}>
                                                                {opt.l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Occupational Risk</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {OCCUPATIONS.map(occ => (
                                                    <button key={occ.id} onClick={() => setForm({ ...form, occupation: occ.id })}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${form.occupation === occ.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-[#f8fafc] border-transparent text-gray-500 hover:border-blue-200'}`}>
                                                        <occ.icon size={20} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{occ.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ─ STEP 4: Financial ─ */}
                                {step === 3 && (
                                    <div className="space-y-8">
                                        <div className="flex items-center space-x-5 mb-2">
                                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><TrendingUp size={28} /></div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-[#0d122b]">Financial Requirements</h3>
                                                <p className="text-sm text-gray-400 font-medium">Income, sum assured & cover amounts</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between px-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Annual Income (INR)</label>
                                                <span className="text-sm font-black text-blue-600">{fc(form.income)}</span>
                                            </div>
                                            <input type="range" min="100000" max="10000000" step="50000" value={form.income}
                                                onChange={e => setForm({ ...form, income: e.target.value })}
                                                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600 bg-blue-100" />
                                        </div>
                                        {[{ id: 'lifeCover', label: 'Life Cover Required' }, { id: 'cirCover', label: 'CIR Cover Required' }, { id: 'accCover', label: 'Accident Rider' }].map(c => (
                                            <div key={c.id} className="space-y-3">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{c.label}</label>
                                                <input type="number" className={`w-full bg-[#f8fafc] border-2 rounded-2xl p-5 text-gray-700 font-bold text-lg transition-all outline-none ${c.id === 'lifeCover' && eligibilityWarning() ? 'border-amber-400 bg-amber-50' : 'border-transparent focus:border-blue-500'}`}
                                                    value={form[c.id]} onChange={e => setForm({ ...form, [c.id]: e.target.value })} />
                                            </div>
                                        ))}
                                        {eligibilityWarning() && (
                                            <div className="flex gap-4 p-5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700 text-sm font-bold">
                                                <AlertTriangle size={20} className="shrink-0" />{eligibilityWarning()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </section>

                    {/* ═══════════ RIGHT — Risk Engine Cards ═══════════ */}
                    <aside ref={sideRef} className="lg:col-span-5 flex flex-col space-y-8">

                        {/* ── Card 1: Primary — dark navy ── */}
                        <div className="bg-gradient-to-br from-[#0d122b] to-[#1e293b] rounded-[40px] p-8 text-white relative overflow-hidden"
                            style={{ boxShadow: '0 25px 50px -12px rgba(13,18,43,.45)' }}>
                            {/* Decorative ring */}
                            <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
                                <svg width="220" height="220" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 2a10 10 0 0110 10" strokeWidth="2" />
                                </svg>
                            </div>

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Live Risk Engine</h4>
                                    <p className="text-xs text-slate-400 font-bold uppercase">Primary Insured</p>
                                </div>
                                <div className="flex items-center space-x-2 bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/30">
                                    <span className={`w-1.5 h-1.5 rounded-full ${hasAnyData ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                        {hasAnyData ? 'Active Scan' : 'Awaiting Data'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-8">
                                <Gauge emr={live.emr} color={live.color} trackColor="#1e293b" textColor="text-white" size={128} />
                                <div className="space-y-6 text-right">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Risk Class</p>
                                        {hasAnyData
                                            ? <p className="text-3xl font-extrabold" style={{ color: live.color }}>{live.lifeClass}</p>
                                            : <div className="h-6 w-3 bg-emerald-500 inline-block rounded-full" style={{ boxShadow: '0 0 15px rgba(16,185,129,.5)' }} />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Premium Loading</p>
                                        <span className="text-2xl font-black text-blue-400">×{live.lifeFactor}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-700/50">
                                {[
                                    ['BMI Impact', live.breakdown.bmi],
                                    ['Disease Add-on', live.breakdown.health],
                                    ['Co-morbidity Factor', live.breakdown.comorbidity],
                                    ['Habit Loading', live.breakdown.lifestyle],
                                    ['Family History', live.breakdown.family],
                                ].map(([label, val]) => (
                                    <div key={label} className="flex justify-between items-center group cursor-default">
                                        <span className="text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">{label}</span>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${val > 10 ? 'text-red-400 bg-red-500/10 border-red-700/30' : 'text-white bg-slate-800/80 border-slate-700'}`}>
                                            {val >= 0 ? '+' : ''}{val}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Card 2: Secondary — white / light (Live Premium) ── */}
                        <div className="bg-gradient-to-br from-white to-[#f8fafc] border border-slate-200 rounded-[40px] p-8 relative overflow-hidden"
                            style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,.08)' }}>
                            <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
                                <svg width="220" height="220" fill="none" stroke="#2563eb" strokeWidth="1" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 2a10 10 0 0110 10" strokeWidth="2" />
                                </svg>
                            </div>

                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Live Premium Engine</h4>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Spouse / Dependent</p>
                                </div>
                                <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border ${hasAnyData ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${hasAnyData ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${hasAnyData ? 'text-blue-600' : 'text-gray-500'}`}>
                                        {hasAnyData ? 'Computing' : 'Pending Sync'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-8">
                                <Gauge emr={live.emr} color="#2563eb" trackColor="#f1f5f9" textColor="text-blue-700" size={128} />
                                <div className="space-y-6 text-right">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Risk Class</p>
                                        {hasAnyData ? (
                                            <div className="flex space-x-1 justify-end">
                                                {live.lifeClass !== '—' && Array.from({ length: Math.min(parseInt(live.lifeClass) || 1, 5) }).map((_, i) => (
                                                    <div key={i} className={`h-6 w-3 rounded-full shadow-sm`} style={{ background: i === 0 ? '#2563eb' : '#93c5fd' }} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex space-x-1 justify-end">
                                                <div className="h-6 w-3 bg-gray-300 rounded-full" /><div className="h-6 w-3 bg-gray-200 rounded-full" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Annual</p>
                                        <span className="text-xl font-black text-blue-600">{hasAnyData ? fc(live.total) : '—'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-100">
                                {[
                                    ['BMI Impact', live.breakdown.bmi, 'text-red-600 bg-red-50 border-red-100'],
                                    ['Disease Add-on', live.breakdown.health, 'text-blue-600 bg-blue-50 border-blue-100'],
                                    ['Lifestyle', live.breakdown.lifestyle, 'text-blue-600 bg-blue-50 border-blue-100'],
                                ].map(([label, val, cls]) => (
                                    <div key={label} className="flex justify-between items-center group cursor-default">
                                        <span className="text-sm font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">{label}</span>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${hasAnyData && val > 0 ? cls : 'text-gray-400 bg-gray-50 border-gray-100'}`}>
                                            {hasAnyData ? `+${val}` : '+0'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* ── Action Buttons (matching HTML mockup exactly) ── */}
                <div className="flex flex-col sm:flex-row items-center justify-between mt-12 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 gap-4"
                    style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,.08)' }}>
                    <button onClick={prev} disabled={step === 0}
                        className="flex items-center space-x-3 text-gray-500 font-bold hover:text-blue-600 transition-all group disabled:opacity-30">
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Quote</span>
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button className="px-8 py-4 bg-white border-2 border-blue-50 text-blue-600 rounded-2xl font-extrabold hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Save size={18}/> Save Draft
                        </button>
                        {step < STEPS.length - 1 ? (
                            <button onClick={next}
                                className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-extrabold hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center gap-2"
                                style={{ boxShadow: '0 20px 25px -5px rgba(37,99,235,.15),0 10px 10px -5px rgba(37,99,235,.1)' }}>
                                Continue Assessment <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading || !!eligibilityWarning()}
                                className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-extrabold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ boxShadow: '0 20px 25px -5px rgba(37,99,235,.15)' }}>
                                {loading ? <Activity className="animate-spin" size={18} /> : <Shield size={18} />}
                                Submit for Underwriting
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-14 border-t border-blue-100/50 pt-8">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                        © 2025 AegisAI Intelligent Systems — Secure Cloud Processing Protocol
                    </p>
                </div>

            </div>
        </div>
    );
}
