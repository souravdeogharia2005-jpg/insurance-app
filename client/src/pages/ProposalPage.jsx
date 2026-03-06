import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { createProposal } from '../utils/api';
import { calculateEMR, getRiskClass, calculatePremium } from '../utils/emr';
import { motion } from 'framer-motion';
import { User, Users, HeartPulse, Wine, Briefcase, Wallet, Shield, FileText, ArrowLeft, ArrowRight, CheckCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const STEPS = [
    { icon: <User size={24} />, label: 'Personal' }, { icon: <Users size={24} />, label: 'Family' },
    { icon: <HeartPulse size={24} />, label: 'Health' }, { icon: <Wine size={24} />, label: 'Lifestyle' },
    { icon: <Briefcase size={24} />, label: 'Occupation' }, { icon: <Wallet size={24} />, label: 'Financial' },
    { icon: <Shield size={24} />, label: 'Coverage' }, { icon: <FileText size={24} />, label: 'Summary' },
];

export default function ProposalPage() {
    const { t, fc } = useApp();
    const navigate = useNavigate();
    const [step, setStep] = useState(() => {
        const saved = localStorage.getItem('proposal_step');
        return saved ? parseInt(saved, 10) : 0;
    });
    const [submitted, setSubmitted] = useState(null);
    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem('proposal_form');
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { console.error(e); }
        }
        return {
            firstName: '', middleName: '', lastName: '', gender: '', dob: '', age: 0, residence: '', profession: '', height: '', weight: '', bmi: 0,
            fatherStatus: '', motherStatus: '', conditions: [], severities: {},
            smoking: 'never', alcohol: 'never', tobacco: 'never', occupation: 'desk_job',
            income: '', incomeSource: 'salaried', lifeCover: 0, cirCover: 0, accidentCover: 0,
        };
    });

    useEffect(() => {
        if (!submitted) {
            localStorage.setItem('proposal_form', JSON.stringify(form));
            localStorage.setItem('proposal_step', step.toString());
        }
    }, [form, step, submitted]);
    const up = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
    const updateDOB = (v) => { up('dob', v); if (v) { const b = new Date(v), td = new Date(); let a = td.getFullYear() - b.getFullYear(); if (td.getMonth() < b.getMonth() || (td.getMonth() === b.getMonth() && td.getDate() < b.getDate())) a--; up('age', a); } };
    const updateBMI = (key, val) => { const f = { ...form, [key]: val }; if (f.height > 0 && f.weight > 0) f.bmi = f.weight / ((f.height / 100) ** 2); setForm(f); };
    const toggleCondition = (id) => { const has = form.conditions.includes(id); const conditions = has ? form.conditions.filter(c => c !== id) : [...form.conditions, id]; const severities = { ...form.severities }; if (has) delete severities[id]; else severities[id] = 1; setForm({ ...form, conditions, severities }); };
    const emr = calculateEMR(form); const rc = getRiskClass(emr.totalEMR); const prem = calculatePremium(form, emr.totalEMR);

    const handleSubmit = async () => {
        const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');
        const proposal = { ...form, name: fullName, emrScore: emr.totalEMR, emrBreakdown: emr.breakdown, riskClass: rc.class, premium: prem, status: 'pending', source: 'manual' };
        const saved = await createProposal(proposal);
        setSubmitted(saved);
        localStorage.removeItem('proposal_form');
        localStorage.removeItem('proposal_step');
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        const f = form;

        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235); // primary blue
        doc.text("AegisAI Insurance Proposal", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Proposal ID: ${submitted.id} | Date: ${new Date().toLocaleDateString()}`, 14, 30);

        doc.autoTable({
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            body: [
                [{ content: 'Personal Details', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
                ['Name', `${f.firstName} ${f.middleName} ${f.lastName}`.trim()],
                ['Gender', f.gender], ['Date of Birth', f.dob], ['Age', f.age],
                ['Residence', f.residence || 'N/A'], ['Profession', f.profession || 'N/A'],
                ['Height / Weight / BMI', `${f.height}cm / ${f.weight}kg / ${f.bmi?.toFixed(1)}`],
                [{ content: 'Family History', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
                ['Father Status', f.fatherStatus], ['Mother Status', f.motherStatus],
                [{ content: 'Health & Lifestyle', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
                ['Health Conditions', f.conditions.length > 0 ? f.conditions.join(', ') : 'None reported'],
                ['Smoking / Alcohol / Tobacco', `${f.smoking} / ${f.alcohol} / ${f.tobacco}`],
                [{ content: 'Financial & Coverage', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
                ['Occupation Risk', f.occupation], ['Annual Income', f.income ? fc(f.income) : 'N/A'],
                ['Life Cover', fc(f.lifeCover)], ['Critical Illness Cover', fc(f.cirCover)], ['Accident Cover', fc(f.accidentCover)],
                [{ content: 'Final Assessment', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [34, 197, 94], textColor: 255 } }],
                ['EMR Score', emr.totalEMR],
                ['Risk Class', rc.class],
                ['Calculated Premium', fc(prem.total)]
            ]
        });

        doc.save(`AegisAI_Proposal_${submitted.id}.pdf`);
    };

    if (submitted) {
        return (
            <motion.div className="result-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="result-icon"><CheckCircle size={56} /></div>
                <h1>Proposal Submitted!</h1><p>ID: <strong>{submitted.id}</strong></p>
                <div className="card result-card">
                    <div className="result-grid">
                        <div className="emr-circle" style={{ borderColor: rc.color }}><span className="emr-val">{emr.totalEMR}</span><span className="emr-lbl">EMR</span></div>
                        <div><div className="badge" style={{ background: rc.color + '20', color: rc.color }}>{rc.class}</div><p className="total-premium">{fc(prem.total)}</p><p className="text-muted">Annual Premium</p></div>
                    </div>
                </div>
                <div className="result-btns">
                    <button className="btn btn-primary" onClick={downloadPDF}><Download size={18} /> {t('downloadPDF') || "Download PDF"}</button>
                    <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>{t('dashboard')}</button>
                    <button className="btn btn-secondary" onClick={() => { setSubmitted(null); setStep(0); setForm({ firstName: '', middleName: '', lastName: '', gender: '', dob: '', age: 0, residence: '', profession: '', height: '', weight: '', bmi: 0, fatherStatus: '', motherStatus: '', conditions: [], severities: {}, smoking: 'never', alcohol: 'never', tobacco: 'never', occupation: 'desk_job', income: '', incomeSource: 'salaried', lifeCover: 0, cirCover: 0, accidentCover: 0 }); }}>{t('newProposal')}</button>
                </div>
            </motion.div>
        );
    }

    const RadioGroup = ({ field, options }) => (
        <div className="radio-group">{options.map(o => (
            <label key={o.value} className={`radio-option ${form[field] === o.value ? 'selected' : ''}`} onClick={() => up(field, o.value)}>
                <span>{o.label}</span>{o.emr !== undefined && <span className={`badge ${o.emr === 0 ? 'badge-green' : 'badge-yellow'}`}>{o.emr > 0 ? '+' : ''}{o.emr}</span>}
            </label>
        ))}</div>
    );

    const renderStep = () => {
        switch (step) {
            case 0: return (<div><h3 className="step-title"><User size={18} className="accent" /> {t('personalDetails')}</h3><div><div className="grid-3 mb-4"><div className="form-group"><label>First Name *</label><input className="form-input" placeholder="First Name" value={form.firstName} onChange={e => up('firstName', e.target.value)} /></div><div className="form-group"><label>Middle Name</label><input className="form-input" placeholder="Middle Name" value={form.middleName} onChange={e => up('middleName', e.target.value)} /></div><div className="form-group"><label>Last Name *</label><input className="form-input" placeholder="Last Name" value={form.lastName} onChange={e => up('lastName', e.target.value)} /></div></div><div className="grid-2"><div className="form-group"><label>{t('gender')} *</label><RadioGroup field="gender" options={[{ value: 'male', label: t('male') }, { value: 'female', label: t('female') }, { value: 'other', label: t('other') }]} /></div><div className="form-group"><label>{t('dob')} *</label><input type="date" className="form-input" value={form.dob} onChange={e => updateDOB(e.target.value)} /></div><div className="form-group"><label>{t('age')}</label><input className="form-input" value={form.age || ''} readOnly style={{ opacity: 0.6 }} /></div><div className="form-group"><label>{t('residence')}</label><select className="form-select" value={form.residence} onChange={e => up('residence', e.target.value)}><option value="">Select...</option>{['Urban', 'Semi-Urban', 'Rural'].map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}</select></div><div className="form-group"><label>{t('profession')}</label><select className="form-select" value={form.profession} onChange={e => up('profession', e.target.value)}><option value="">Select...</option>{['Salaried', 'Self-Employed', 'Business', 'Professional', 'Student', 'Retired'].map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}</select></div><div className="form-group"><label>{t('height')}</label><input type="number" className="form-input" placeholder="170" value={form.height} onChange={e => updateBMI('height', +e.target.value)} /></div><div className="form-group"><label>{t('weight')}</label><input type="number" className="form-input" placeholder="70" value={form.weight} onChange={e => updateBMI('weight', +e.target.value)} /></div></div></div>{form.bmi > 0 && <div className="bmi-display">BMI: <strong>{form.bmi.toFixed(1)}</strong></div>}</div>);
            case 1: return (<div><h3 className="step-title"><Users size={18} className="accent" /> {t('familyHistory')}</h3>{['fatherStatus', 'motherStatus'].map(f => <div key={f} className="form-group"><label>{f === 'fatherStatus' ? "Father's Status" : "Mother's Status"}</label><RadioGroup field={f} options={[{ value: 'alive_healthy', label: 'Alive & Healthy', emr: 0 }, { value: 'minor_issues', label: 'Minor Issues', emr: 10 }, { value: 'major_issues', label: 'Major Issues', emr: 25 }, { value: 'deceased_before_60', label: 'Deceased (<60)', emr: 50 }, { value: 'deceased_after_60', label: 'Deceased (>60)', emr: 25 }]} /></div>)}</div>);
            case 2: { const conds = [{ id: 'diabetes', label: 'Diabetes' }, { id: 'hypertension', label: 'Hypertension' }, { id: 'heart_disease', label: 'Heart Disease' }, { id: 'respiratory', label: 'Respiratory' }, { id: 'cancer', label: 'Cancer' }, { id: 'liver', label: 'Liver Disease' }, { id: 'kidney', label: 'Kidney Disease' }, { id: 'neurological', label: 'Neurological' }]; return (<div><h3 className="step-title"><HeartPulse size={18} className="accent" /> {t('healthConditions')}</h3><div className="grid-2">{conds.map(c => (<label key={c.id} className={`checkbox-option ${form.conditions.includes(c.id) ? 'selected' : ''}`} onClick={() => toggleCondition(c.id)}><input type="checkbox" checked={form.conditions.includes(c.id)} readOnly /> {c.label}</label>))}</div>{form.conditions.map(c => (<div key={c} className="severity-slider"><span>{conds.find(x => x.id === c)?.label}: <strong>{['Mild', 'Moderate', 'Severe', 'Critical'][(form.severities[c] || 1) - 1]}</strong></span><input type="range" min="1" max="4" value={form.severities[c] || 1} onChange={e => setForm({ ...form, severities: { ...form.severities, [c]: +e.target.value } })} /></div>))}</div>); }
            case 3: return (<div><h3 className="step-title"><Wine size={18} className="accent" /> {t('lifestyle')}</h3><div className="form-group"><label>Smoking</label><RadioGroup field="smoking" options={[{ value: 'never', label: 'Never', emr: 0 }, { value: 'former', label: 'Former', emr: 15 }, { value: 'occasional', label: 'Occasional', emr: 25 }, { value: 'regular', label: 'Regular', emr: 40 }]} /></div><div className="form-group"><label>Alcohol</label><RadioGroup field="alcohol" options={[{ value: 'never', label: 'Never', emr: 0 }, { value: 'social', label: 'Social', emr: 5 }, { value: 'moderate', label: 'Moderate', emr: 15 }, { value: 'heavy', label: 'Heavy', emr: 30 }]} /></div><div className="form-group"><label>Tobacco</label><RadioGroup field="tobacco" options={[{ value: 'never', label: 'Never', emr: 0 }, { value: 'occasional', label: 'Occasional', emr: 15 }, { value: 'regular', label: 'Regular', emr: 30 }]} /></div></div>);
            case 4: return (<div><h3 className="step-title"><Briefcase size={18} className="accent" /> {t('occupationRisk')}</h3><RadioGroup field="occupation" options={[{ value: 'desk_job', label: 'Office / Desk Job', emr: 0 }, { value: 'light_manual', label: 'Light Manual', emr: 5 }, { value: 'moderate_physical', label: 'Moderate Physical', emr: 10 }, { value: 'heavy_manual', label: 'Heavy Manual', emr: 20 }, { value: 'hazardous', label: 'Hazardous', emr: 30 }, { value: 'extreme_risk', label: 'Extreme Risk', emr: 50 }]} /></div>);
            case 5: { const max = (parseFloat(form.income) || 0) * 15; return (<div><h3 className="step-title"><Wallet size={18} className="accent" /> {t('financial')}</h3><div className="grid-2"><div className="form-group"><label>{t('annualIncome')}</label><input type="number" className="form-input" placeholder="1000000" value={form.income} onChange={e => up('income', e.target.value)} /></div><div className="form-group"><label>{t('incomeSource')}</label><select className="form-select" value={form.incomeSource} onChange={e => up('incomeSource', e.target.value)}>{['Salaried', 'Self-Employed', 'Business', 'Professional'].map(s => <option key={s} value={s.toLowerCase().replace(/ /g, '_')}>{s}</option>)}</select></div></div>{max > 0 && <div className="max-cover-box"><p className="max-cover-val">{fc(max)}</p><p className="text-muted">15× Annual Income</p></div>}</div>); }
            case 6: { const max = Math.max((parseFloat(form.income) || 0) * 15, 10000000); return (<div><h3 className="step-title"><Shield size={18} className="accent" /> {t('coverage')}</h3>{[{ field: 'lifeCover', label: t('lifeCover'), max, c: 'var(--accent)' }, { field: 'cirCover', label: t('cirCover'), max: 5000000, c: 'var(--purple)' }, { field: 'accidentCover', label: t('accidentCover'), max: 1000000, c: 'var(--green)' }].map(s => (<div key={s.field} className="slider-group"><div className="slider-header"><span>{s.label}</span><span style={{ color: s.c, fontWeight: 700 }}>{fc(form[s.field])}</span></div><input type="range" className="range-slider" min="0" max={s.max} step="100000" value={form[s.field]} onChange={e => up(s.field, +e.target.value)} /></div>))}</div>); }
            case 7: return (<div><h3 className="step-title"><FileText size={18} className="accent" /> {t('proposalSummary')}</h3><div className="summary-top"><div className="emr-circle" style={{ borderColor: rc.color }}><span className="emr-val">{emr.totalEMR}</span><span className="emr-lbl">EMR</span></div><div><div className="badge" style={{ background: rc.color + '20', color: rc.color }}>{rc.class}</div><p className="rc-label">{rc.label}</p><p className="total-premium">{fc(prem.total)}</p><p className="text-muted">Annual Premium</p></div></div><h4 className="sub-title">{t('emrBreakdown')}</h4>{Object.entries(emr.breakdown).map(([k, v]) => (<div key={k} className="emr-bar"><span className="emr-bar-label">{k}</span><div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: Math.min(v / 2, 100) + '%' }} /></div><span className="emr-bar-val">{v}</span></div>))}<h4 className="sub-title">{t('premiumBreakdown')}</h4><div className="grid-3 premium-grid">{[{ l: t('lifeCover'), v: prem.life, c: 'var(--accent)' }, { l: t('cirCover'), v: prem.cir, c: 'var(--purple)' }, { l: t('accidentCover'), v: prem.accident, c: 'var(--green)' }].map((p, i) => (<div key={i} className="premium-box"><p className="text-muted">{p.l}</p><p className="premium-val" style={{ color: p.c }}>{fc(p.v)}</p></div>))}</div></div>);
            default: return null;
        }
    };

    return (
        <div className="proposal-page">
            <div className="page-header relative">
                <h1>{t('newProposal')}</h1>
                <p>Complete all steps for your personalized premium</p>

                <div className="absolute top-2 right-4 text-right">
                    <p className="text-sm font-bold text-primary dark:text-blue-400">Step {step + 1} of {STEPS.length}</p>
                    <p className="text-xs text-slate-500 font-medium">({Math.round((step / (STEPS.length - 1)) * 100)}% Complete)</p>
                </div>
            </div>

            <div className="card stepper-card">
                <div className="stepper">
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="step-item text-center">
                                <motion.div
                                    className={`step-circle relative transition-all duration-300 flex items-center justify-center cursor-pointer ${i === step ? 'active border-primary bg-primary/10 text-primary scale-110 shadow-lg shadow-primary/20' : i < step ? 'done border-[#22c55e] bg-[#22c55e] text-white' : 'border-slate-300 text-slate-400 bg-white dark:bg-slate-800 dark:border-slate-700'}`}
                                    onClick={() => i < step && setStep(i)}
                                    layout
                                >
                                    {i < step ? (
                                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, type: "spring" }}>
                                            <CheckCircle size={20} strokeWidth={3} />
                                        </motion.div>
                                    ) : (
                                        s.icon
                                    )}
                                </motion.div>
                                <span className={`step-label mt-2 text-[10px] sm:text-xs font-bold transition-all duration-300 ${i === step ? 'text-primary' : i < step ? 'text-[#22c55e]' : 'text-slate-400'}`}>{s.label}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`step-connector h-1 w-8 sm:w-16 mx-2 sm:mx-4 rounded-full transition-all duration-500 ${i < step ? 'bg-[#22c55e]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <motion.div className="card step-card" key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                {renderStep()}
            </motion.div>
            <div className="step-nav">
                <button className="btn btn-secondary" onClick={() => setStep(step - 1)} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}><ArrowLeft size={16} /> {t('previous')}</button>
                {step < STEPS.length - 1 ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>{t('next')} <ArrowRight size={16} /></button> : <button className="btn btn-success btn-lg" onClick={handleSubmit}><CheckCircle size={18} /> {t('submitProposal')}</button>}
            </div>
        </div>
    );
}
