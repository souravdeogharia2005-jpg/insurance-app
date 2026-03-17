import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateEMR, getRiskClass, calculatePremium } from '../utils/emr';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Camera, FileText, CheckCircle, Loader, Edit2, Save, AlertTriangle, IndianRupee, Shield, Activity, Heart } from 'lucide-react';
import Tesseract from 'tesseract.js';

// ── Smart OCR parser for the AegisAI Proposal Form ──
function parseProposalForm(rawText) {
    const text = rawText.replace(/\r/g, '');
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const lowerLines = lines.map(l => l.toLowerCase());

    const data = {
        name: '', age: '', gender: '', dob: '', residence: '',
        profession: '', height: '', weight: '', bmi: '',
        income: '', incomeSource: '',
        lifeCover: 0, cirCover: 0, accidentCover: 0,
        fatherStatus: 'alive_healthy', motherStatus: 'alive_healthy',
        conditions: [], severities: {},
        smoking: 'never', alcohol: 'never', tobacco: 'never',
        occupation: 'desk_job',
    };

    // ── Helper: extract value after a label on the same line ──
    const extractAfterLabel = (label) => {
        for (let i = 0; i < lines.length; i++) {
            const low = lowerLines[i];
            if (low.includes(label.toLowerCase())) {
                // Try "Label: Value" or "Label  Value" format
                const colonIdx = lines[i].indexOf(':');
                if (colonIdx !== -1) {
                    const val = lines[i].substring(colonIdx + 1).trim();
                    if (val.length > 0) return val;
                }
                // Try tab/space separated: take everything after the label
                const labelIdx = low.indexOf(label.toLowerCase());
                const afterLabel = lines[i].substring(labelIdx + label.length).trim();
                if (afterLabel.length > 1 && afterLabel !== '|' && !afterLabel.startsWith('(')) return afterLabel;
                // Try next line
                if (i + 1 < lines.length && lines[i + 1].length > 1 && !lines[i + 1].toLowerCase().includes('gender') && !lines[i + 1].toLowerCase().includes('place')) {
                    return lines[i + 1].trim();
                }
            }
        }
        return '';
    };

    // Name
    const rawName = extractAfterLabel('Name');
    if (rawName) {
        data.name = rawName.replace(/[^a-zA-Z\s.]/g, '').trim()
            .split(' ').filter(w => w.length > 0)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    // Gender
    const rawGender = extractAfterLabel('Gender');
    if (rawGender) {
        const g = rawGender.toLowerCase();
        if (g.includes('female') || g.includes('f')) data.gender = 'female';
        else if (g.includes('male') || g.includes('m')) data.gender = 'male';
        else data.gender = 'other';
    }

    // Place of Residence
    const rawRes = extractAfterLabel('Place of Residence') || extractAfterLabel('Residence');
    if (rawRes) {
        const r = rawRes.toLowerCase();
        if (r.includes('urban') || r.includes('city') || r.includes('metro')) data.residence = 'urban';
        else if (r.includes('rural') || r.includes('village')) data.residence = 'rural';
        else data.residence = rawRes.replace(/[^a-zA-Z\s]/g, '').trim();
    }

    // Date of Birth
    const rawDob = extractAfterLabel('Date of Birth') || extractAfterLabel('DOB');
    if (rawDob) {
        const m = rawDob.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
        if (m) {
            const year = m[3].length === 2 ? '20' + m[3] : m[3];
            data.dob = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
            // Calculate age
            const birthDate = new Date(data.dob);
            const today = new Date();
            data.age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
        }
    }

    // Direct age extraction if DOB didn't yield one
    if (!data.age) {
        const rawAge = extractAfterLabel('Age');
        if (rawAge) {
            const ageNum = rawAge.match(/(\d+)/);
            if (ageNum) data.age = parseInt(ageNum[1], 10);
        }
    }

    // Profession
    const rawProf = extractAfterLabel('Profession');
    if (rawProf) data.profession = rawProf.replace(/[^a-zA-Z\s]/g, '').trim();

    // Height (cm)
    const rawHeight = extractAfterLabel('Height');
    if (rawHeight) {
        const h = rawHeight.match(/(\d+)/);
        if (h) data.height = parseInt(h[1], 10);
    }

    // Weight (kg)
    const rawWeight = extractAfterLabel('Weight');
    if (rawWeight) {
        const w = rawWeight.match(/(\d+)/);
        if (w) data.weight = parseInt(w[1], 10);
    }

    // BMI
    if (data.height && data.weight) {
        const hm = data.height / 100;
        data.bmi = parseFloat((data.weight / (hm * hm)).toFixed(1));
    }

    // Yearly Income
    const rawIncome = extractAfterLabel('Yearly Income') || extractAfterLabel('Income') || extractAfterLabel('Annual Income');
    if (rawIncome) {
        const inc = rawIncome.replace(/[^0-9]/g, '');
        if (inc) data.income = inc;
    }

    // Source of Income
    const rawSrc = extractAfterLabel('Source of Income') || extractAfterLabel('Income Source');
    if (rawSrc) data.incomeSource = rawSrc.replace(/[^a-zA-Z\s]/g, '').trim();

    // Cover amounts
    const rawBase = extractAfterLabel('Base cover') || extractAfterLabel('Life Cover') || extractAfterLabel('Base Cover Required');
    if (rawBase) { const v = rawBase.replace(/[^0-9]/g, ''); if (v) data.lifeCover = parseInt(v, 10); }

    const rawCir = extractAfterLabel('CIR cover') || extractAfterLabel('Critical Illness') || extractAfterLabel('CIR Cover Required');
    if (rawCir) { const v = rawCir.replace(/[^0-9]/g, ''); if (v) data.cirCover = parseInt(v, 10); }

    const rawAcc = extractAfterLabel('Accident cover') || extractAfterLabel('Accident Cover Required');
    if (rawAcc) { const v = rawAcc.replace(/[^0-9]/g, ''); if (v) data.accidentCover = parseInt(v, 10); }

    // ── Health Conditions ──
    const conditionMap = {
        'thyroid': 'respiratory', 'asthma': 'respiratory',
        'hyper tension': 'hypertension', 'hypertension': 'hypertension',
        'diabetes': 'diabetes', 'diabetes mellitus': 'diabetes',
        'gut disorder': 'liver', 'heart': 'heart_disease',
        'cancer': 'cancer', 'kidney': 'kidney', 'neurological': 'neurological',
    };

    for (const [keyword, condition] of Object.entries(conditionMap)) {
        for (let i = 0; i < lowerLines.length; i++) {
            if (lowerLines[i].includes(keyword)) {
                // Check if there's a tick/mark/x/severity on the same line after the condition name
                const afterKeyword = lowerLines[i].substring(lowerLines[i].indexOf(keyword) + keyword.length);
                const hasMark = /[x✓✔√1-4]/.test(afterKeyword) || afterKeyword.includes('yes') || afterKeyword.includes('level');
                if (hasMark && !data.conditions.includes(condition)) {
                    data.conditions.push(condition);
                    // Try to detect severity level (1-4)
                    const sevMatch = afterKeyword.match(/[1-4]/);
                    if (sevMatch) data.severities[condition] = parseInt(sevMatch[0], 10);
                    else data.severities[condition] = 1;
                }
            }
        }
    }

    // ── Personal Habits ──
    const habitMap = { 'smoking': 'smoking', 'alcoholic': 'alcohol', 'alcohol': 'alcohol', 'tobacco': 'tobacco' };
    const frequencyMap = { 'occasionally': 'occasional', 'regular': 'regular', 'moderate': 'moderate', 'high': 'heavy', 'never': 'never', 'social': 'social' };

    for (const [keyword, field] of Object.entries(habitMap)) {
        for (let i = 0; i < lowerLines.length; i++) {
            if (lowerLines[i].includes(keyword) && !lowerLines[i].includes('consumption') && !lowerLines[i].includes('please tick')) {
                const lineAfter = lowerLines[i].substring(lowerLines[i].indexOf(keyword) + keyword.length);
                for (const [freq, val] of Object.entries(frequencyMap)) {
                    if (lineAfter.includes(freq)) { data[field] = val; break; }
                }
                // Also check next line
                if (i + 1 < lowerLines.length) {
                    for (const [freq, val] of Object.entries(frequencyMap)) {
                        if (lowerLines[i + 1].includes(freq)) { data[field] = val; break; }
                    }
                }
            }
        }
    }

    // ── Family History ──
    for (let i = 0; i < lowerLines.length; i++) {
        if (lowerLines[i].includes('survival') || lowerLines[i].includes('parent')) {
            const lineText = lowerLines[i] + ' ' + (lowerLines[i + 1] || '');
            if (lineText.includes('both died') || lineText.includes('died < 65') || lineText.includes('died before')) {
                data.fatherStatus = 'deceased_before_60';
                data.motherStatus = 'deceased_before_60';
            } else if (lineText.includes('one surviving')) {
                data.fatherStatus = 'alive_healthy';
                data.motherStatus = 'deceased_after_60';
            } else if (lineText.includes('both surviving') || lineText.includes('both alive')) {
                data.fatherStatus = 'alive_healthy';
                data.motherStatus = 'alive_healthy';
            }
        }
    }

    // ── Occupation mapping ──
    if (data.profession) {
        const p = data.profession.toLowerCase();
        if (p.includes('desk') || p.includes('office') || p.includes('it') || p.includes('software') || p.includes('salaried') || p.includes('teacher') || p.includes('doctor')) {
            data.occupation = 'desk_job';
        } else if (p.includes('driver') || p.includes('factory') || p.includes('construction') || p.includes('mining')) {
            data.occupation = 'heavy_manual';
        } else if (p.includes('farmer') || p.includes('labour') || p.includes('labor')) {
            data.occupation = 'moderate_physical';
        } else {
            data.occupation = 'light_manual';
        }
    }

    return data;
}


export default function ScanPage() {
    const { t, fc } = useApp();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const cameraRef = useRef(null);
    const [stage, setStage] = useState('upload'); // upload | processing | done
    const [extracted, setExtracted] = useState(null);
    const [editing, setEditing] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [rawOcrText, setRawOcrText] = useState('');
    const [premiumData, setPremiumData] = useState(null);
    const [riskData, setRiskData] = useState(null);
    const [emrData, setEmrData] = useState(null);
    const [creating, setCreating] = useState(false);

    const recalcPremium = (d) => {
        const emr = calculateEMR({
            fatherStatus: d.fatherStatus || 'alive_healthy',
            motherStatus: d.motherStatus || 'alive_healthy',
            conditions: d.conditions || [],
            severities: d.severities || {},
            smoking: d.smoking || 'never',
            alcohol: d.alcohol || 'never',
            tobacco: d.tobacco || 'never',
            occupation: d.occupation || 'desk_job',
        });
        const rc = getRiskClass(emr.totalEMR);
        const prem = calculatePremium({
            lifeCover: parseFloat(d.lifeCover) || 0,
            cirCover: parseFloat(d.cirCover) || 0,
            accidentCover: parseFloat(d.accidentCover) || 0,
        }, emr.totalEMR);
        setEmrData(emr);
        setRiskData(rc);
        setPremiumData(prem);
    };

    const handleFile = async (file) => {
        if (!file) return;
        setStage('processing');
        setScanProgress(0);

        try {
            const result = await Tesseract.recognize(file, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setScanProgress(Math.floor(m.progress * 100));
                    }
                }
            });
            const ocrText = result.data.text;
            setRawOcrText(ocrText);
            console.log('📄 RAW OCR TEXT:\n', ocrText);

            const d = parseProposalForm(ocrText);
            setExtracted(d);
            recalcPremium(d);
            setStage('done');
        } catch (error) {
            console.error("OCR Failed:", error);
            setStage('upload');
            alert('OCR scanning failed. Please try again with a clearer image.');
        }
    };

    const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
    const handleDragOver = (e) => { e.preventDefault(); };

    const updateField = (field, value) => {
        const updated = { ...extracted, [field]: value };
        // Recalculate BMI if height or weight changed
        if ((field === 'height' || field === 'weight') && updated.height && updated.weight) {
            const hm = parseFloat(updated.height) / 100;
            if (hm > 0) updated.bmi = parseFloat((parseFloat(updated.weight) / (hm * hm)).toFixed(1));
        }
        setExtracted(updated);
        recalcPremium(updated);
    };

    const handleCreate = async () => {
        if (!extracted) return;
        setCreating(true);
        try {
            const d = extracted;
            const emr = calculateEMR({
                fatherStatus: d.fatherStatus || 'alive_healthy',
                motherStatus: d.motherStatus || 'alive_healthy',
                conditions: d.conditions || [],
                severities: d.severities || {},
                smoking: d.smoking || 'never',
                alcohol: d.alcohol || 'never',
                tobacco: d.tobacco || 'never',
                occupation: d.occupation || 'desk_job',
            });
            const rc = getRiskClass(emr.totalEMR);
            const prem = calculatePremium({
                lifeCover: parseFloat(d.lifeCover) || 0,
                cirCover: parseFloat(d.cirCover) || 0,
                accidentCover: parseFloat(d.accidentCover) || 0,
            }, emr.totalEMR);

            await createProposal({
                ...d,
                emrScore: emr.totalEMR,
                emrBreakdown: emr.breakdown,
                riskClass: rc.class,
                premium: prem,
                status: 'pending',
                source: 'scan',
            });
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to create proposal:', err);
            alert('Failed to create proposal. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const Field = ({ label, field, type = 'text', icon }) => (
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium min-w-[100px]">
                {icon && <span className="text-primary">{icon}</span>}
                {label}
            </div>
            {editing ? (
                <input
                    type={type}
                    className="flex-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    value={extracted[field] ?? ''}
                    onChange={e => updateField(field, type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                />
            ) : (
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {String(extracted[field] || '—')}
                </span>
            )}
        </div>
    );

    const SelectField = ({ label, field, options }) => (
        <div className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl gap-3">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium min-w-[100px]">{label}</span>
            {editing ? (
                <select
                    className="flex-1 text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                    value={extracted[field] ?? ''}
                    onChange={e => updateField(field, e.target.value)}
                >
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            ) : (
                <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                    {(options.find(([v]) => v === extracted[field])?.[1]) || extracted[field] || '—'}
                </span>
            )}
        </div>
    );

    return (
        <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{t('scan')}</h1>
                <p className="text-slate-500 mt-2">{t('scanInsDoc')}</p>
            </div>

            <AnimatePresence mode="wait">
                {/* ── UPLOAD STAGE ── */}
                {stage === 'upload' && (
                    <motion.div key="upload"
                        className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-12 text-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors"
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        onDrop={handleDrop} onDragOver={handleDragOver}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                            <ScanLine size={40} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('dragDrop')}</h3>
                        <p className="text-slate-500 mb-8">Supports JPG, PNG — Scan your AegisAI Proposal Form</p>
                        <div className="flex gap-4 justify-center">
                            <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                                <Upload size={18} /> {t('uploadDoc')}
                            </button>
                            <button className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                onClick={e => { e.stopPropagation(); cameraRef.current?.click(); }}>
                                <Camera size={18} /> {t('takePhoto')}
                            </button>
                        </div>
                        <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={e => handleFile(e.target.files[0])} />
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleFile(e.target.files[0])} />
                    </motion.div>
                )}

                {/* ── PROCESSING STAGE ── */}
                {stage === 'processing' && (
                    <motion.div key="processing"
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader size={36} className="text-primary animate-spin" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">AI Processing Document...</h3>
                        <p className="text-slate-500 mb-6">Extracting data with OCR and AI analysis ({scanProgress}%)</p>
                        <div className="max-w-sm mx-auto">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-6 overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-blue-400 h-3 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                            </div>
                            <div className="space-y-3">
                                {['Text Detection', 'Field Extraction', 'Premium Calculation'].map((s, i) => (
                                    <div key={s} className={`flex items-center gap-3 text-sm transition-all ${scanProgress > (i * 30) ? 'text-primary font-semibold' : 'text-slate-400'}`}>
                                        <CheckCircle size={16} className={scanProgress > (i * 30) ? 'text-green-500' : 'text-slate-300'} />
                                        {s}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── RESULTS STAGE ── */}
                {stage === 'done' && extracted && (
                    <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

                        {/* Header */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                    <FileText size={20} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Extracted Proposal Data</h3>
                                    <p className="text-xs text-slate-500">Review and edit fields before creating proposal</p>
                                </div>
                            </div>
                            <button
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${editing ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
                                onClick={() => setEditing(!editing)}
                            >
                                {editing ? <><Save size={16} /> Done</> : <><Edit2 size={16} /> Edit</>}
                            </button>
                        </div>

                        {/* Warning if no name extracted */}
                        {!extracted.name && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
                                <AlertTriangle size={20} className="text-amber-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Some fields may be empty</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400">OCR may not detect all handwritten/blank fields. Click "Edit" to fill them manually.</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personal Details */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Personal Details</h4>
                                <div className="space-y-2">
                                    <Field label="Name" field="name" />
                                    <Field label="Age" field="age" type="number" />
                                    <SelectField label="Gender" field="gender" options={[['male', 'Male'], ['female', 'Female'], ['other', 'Other']]} />
                                    <Field label="DOB" field="dob" />
                                    <Field label="Residence" field="residence" />
                                    <Field label="Profession" field="profession" />
                                </div>
                            </div>

                            {/* Physical Details */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Physical & Financial</h4>
                                <div className="space-y-2">
                                    <Field label="Height (cm)" field="height" type="number" />
                                    <Field label="Weight (kg)" field="weight" type="number" />
                                    <Field label="BMI" field="bmi" />
                                    <Field label="Income (₹)" field="income" type="number" />
                                    <Field label="Income Source" field="incomeSource" />
                                    <SelectField label="Occupation Risk" field="occupation" options={[
                                        ['desk_job', 'Desk Job'], ['light_manual', 'Light Manual'], ['moderate_physical', 'Moderate Physical'],
                                        ['heavy_manual', 'Heavy Manual'], ['hazardous', 'Hazardous'], ['extreme_risk', 'Extreme Risk']
                                    ]} />
                                </div>
                            </div>

                            {/* Coverage */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Coverage Selection</h4>
                                <div className="space-y-2">
                                    <Field label="Life Cover (₹)" field="lifeCover" type="number" />
                                    <Field label="CIR Cover (₹)" field="cirCover" type="number" />
                                    <Field label="Accident Cover (₹)" field="accidentCover" type="number" />
                                </div>
                            </div>

                            {/* Lifestyle & Health */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
                                <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Lifestyle & Health</h4>
                                <div className="space-y-2">
                                    <SelectField label="Smoking" field="smoking" options={[['never', 'Never'], ['former', 'Former'], ['occasional', 'Occasional'], ['regular', 'Regular']]} />
                                    <SelectField label="Alcohol" field="alcohol" options={[['never', 'Never'], ['social', 'Social'], ['moderate', 'Moderate'], ['heavy', 'Heavy']]} />
                                    <SelectField label="Tobacco" field="tobacco" options={[['never', 'Never'], ['occasional', 'Occasional'], ['regular', 'Regular']]} />
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-400 mb-2">Detected Conditions:</p>
                                        {extracted.conditions?.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {extracted.conditions.map(c => (
                                                    <span key={c} className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold capitalize">
                                                        {c.replace('_', ' ')} (Sev: {extracted.severities?.[c] || 1})
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ No conditions detected</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Premium & Risk Summary ── */}
                        {premiumData && riskData && emrData && (
                            <div className="bg-gradient-to-br from-primary/5 via-white to-blue-50 dark:from-primary/10 dark:via-slate-900 dark:to-slate-900 border border-primary/20 rounded-3xl p-6">
                                <h4 className="text-sm font-black uppercase tracking-wider text-primary mb-6 flex items-center gap-2">
                                    <Activity size={16} /> Insurance Assessment
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 mb-1 font-bold">EMR Score</p>
                                        <p className="text-2xl font-black text-slate-900 dark:text-white">{emrData.totalEMR}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 mb-1 font-bold">Risk Class</p>
                                        <p className="text-2xl font-black" style={{ color: riskData.color }}>{riskData.class}</p>
                                        <p className="text-xs" style={{ color: riskData.color }}>{riskData.label}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 mb-1 font-bold">Annual Premium</p>
                                        <p className="text-2xl font-black text-primary">{fc ? fc(premiumData.total) : `₹${premiumData.total.toLocaleString()}`}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 text-center border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 mb-1 font-bold">Monthly</p>
                                        <p className="text-2xl font-black text-green-600">{fc ? fc(Math.round(premiumData.total / 12)) : `₹${Math.round(premiumData.total / 12).toLocaleString()}`}</p>
                                    </div>
                                </div>

                                {/* EMR Breakdown */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                                    {[
                                        { label: 'Base', val: emrData.base, color: '#6b7280' },
                                        { label: 'Family', val: emrData.familyEMR, color: '#8b5cf6' },
                                        { label: 'Health', val: emrData.healthEMR, color: '#ef4444' },
                                        { label: 'Lifestyle', val: emrData.lifestyleEMR, color: '#f59e0b' },
                                        { label: 'Occupation', val: emrData.occupationEMR, color: '#10b981' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                            <p className="text-lg font-black mt-1" style={{ color: item.color }}>+{item.val}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Premium Breakdown */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Life</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{fc ? fc(premiumData.life) : `₹${premiumData.life.toLocaleString()}`}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">CIR</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{fc ? fc(premiumData.cir) : `₹${premiumData.cir.toLocaleString()}`}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Accident</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{fc ? fc(premiumData.accident) : `₹${premiumData.accident.toLocaleString()}`}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <><CheckCircle size={18} /> Create Proposal &amp; Save</>
                                )}
                            </button>
                            <button
                                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                onClick={() => { setStage('upload'); setExtracted(null); setPremiumData(null); setRiskData(null); setEmrData(null); }}
                            >
                                <ScanLine size={18} /> Rescan
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
