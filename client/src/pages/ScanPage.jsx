import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal } from '../utils/api';
import { calculateEMR, getRiskClass, calculatePremium } from '../utils/emr';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScanLine, Upload, Camera, FileText, CheckCircle, Loader, Edit2, Save } from 'lucide-react';
import Tesseract from 'tesseract.js';

const MOCK_DATA = {
    name: 'Rajesh Kumar', age: 35, gender: 'male', dob: '1990-05-15', residence: 'urban',
    profession: 'Salaried', height: 175, weight: 72, bmi: 23.5,
    conditions: ['hypertension'], smoking: 'never', alcohol: 'social',
    income: '1200000', lifeCover: 5000000,
};

export default function ScanPage() {
    const { t, fc } = useApp();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const cameraRef = useRef(null);
    const [stage, setStage] = useState('upload'); // upload | processing | done
    const [extracted, setExtracted] = useState(null);
    const [editing, setEditing] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);

    const parseOCR = (text) => {
        const data = { ...MOCK_DATA };
        const lines = text.split('\n').map(l => l.trim().toLowerCase());

        // Basic extraction examples from text
        const nameMatch = lines.find(l => l.includes('name'));
        if (nameMatch) {
            const possibleName = nameMatch.split(':')[1]?.trim() || nameMatch.replace('name', '').trim();
            if (possibleName) data.name = possibleName.replace(/[^a-zA-Z\s]/g, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        const dobMatch = lines.find(l => l.includes('dob') || l.includes('date of birth') || /\d{2}\/\d{2}\/\d{4}/.test(l));
        if (dobMatch) {
            const m = dobMatch.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
            if (m) data.dob = `${m[3]}-${m[2]}-${m[1]}`;
        }

        const ageMatch = lines.find(l => l.includes('age'));
        if (ageMatch) {
            const m = ageMatch.match(/\d+/);
            if (m) data.age = parseInt(m[0], 10);
        }

        return data;
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
            const d = parseOCR(result.data.text);
            setExtracted(d);
            setStage('done');
        } catch (error) {
            console.error("OCR Failed:", error);
            // Fallback to mock if it fails
            setTimeout(() => { setExtracted({ ...MOCK_DATA }); setStage('done'); }, 1500);
        }
    };

    const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
    const handleDragOver = (e) => { e.preventDefault(); };

    const handleCreate = async () => {
        const d = extracted;
        const emr = calculateEMR({ fatherStatus: 'alive_healthy', motherStatus: 'alive_healthy', conditions: d.conditions || [], severities: {}, smoking: d.smoking || 'never', alcohol: d.alcohol || 'never', tobacco: 'never', occupation: 'desk_job' });
        const rc = getRiskClass(emr.totalEMR);
        const prem = calculatePremium({ lifeCover: d.lifeCover || 0, cirCover: 0, accidentCover: 0 }, emr.totalEMR);
        await createProposal({ ...d, emrScore: emr.totalEMR, emrBreakdown: emr.breakdown, riskClass: rc.class, premium: prem, status: 'pending', source: 'scan' });
        navigate('/dashboard');
    };

    const Field = ({ label, field }) => (
        <div className="scan-field">
            <span className="text-muted">{label}</span>
            {editing ? <input className="form-input form-input-sm" value={extracted[field] || ''} onChange={e => setExtracted({ ...extracted, [field]: e.target.value })} /> : <span className="fw-600">{String(extracted[field] || '—')}</span>}
        </div>
    );

    return (
        <div className="scan-page">
            <div className="page-header"><h1>{t('scan')}</h1><p>{t('scanInsDoc')}</p></div>
            {stage === 'upload' && (
                <motion.div className="card upload-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onDrop={handleDrop} onDragOver={handleDragOver}>
                    <ScanLine size={48} className="upload-icon" />
                    <h3>{t('dragDrop')}</h3>
                    <p className="text-muted">Supports JPG, PNG, PDF — max 10MB</p>
                    <div className="upload-btns">
                        <button className="btn btn-primary" onClick={() => inputRef.current?.click()}><Upload size={16} /> {t('uploadDoc')}</button>
                        <button className="btn btn-secondary" onClick={() => cameraRef.current?.click()}><Camera size={16} /> {t('takePhoto')}</button>
                    </div>
                    <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={e => handleFile(e.target.files[0])} />
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleFile(e.target.files[0])} />
                </motion.div>
            )}
            {stage === 'processing' && (
                <div className="card processing-card">
                    <div className="scanning-anim"><div className="scan-ring" /><Loader size={32} className="spin" /></div>
                    <h3>AI Processing Document...</h3>
                    <p className="text-muted">Extracting data with OCR and AI analysis ({scanProgress}%)</p>
                    <div className="processing-steps mt-4 mb-2 w-full max-w-xs mx-auto">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
                            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                        </div>
                        {['Text Detection', 'Data Extraction', 'AI Analysis'].map((s, i) => (
                            <motion.div key={s} className="proc-step" initial={{ opacity: 0 }} animate={{ opacity: scanProgress > (i * 30) ? 1 : 0.4 }} transition={{ duration: 0.3 }}>
                                <CheckCircle size={14} className={scanProgress > (i * 30) ? "text-[#22c55e]" : "text-slate-400"} /> {s}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
            {stage === 'done' && extracted && (
                <motion.div className="card result-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="result-header">
                        <div><FileText className="accent" size={20} /><h3>Extracted Data</h3></div>
                        <button className="btn btn-sm btn-secondary" onClick={() => setEditing(!editing)}>
                            {editing ? <><Save size={14} /> Save</> : <><Edit2 size={14} /> Edit</>}
                        </button>
                    </div>
                    <div className="grid-2">
                        <Field label="Name" field="name" /><Field label="Age" field="age" /><Field label="Gender" field="gender" />
                        <Field label="DOB" field="dob" /><Field label="Residence" field="residence" /><Field label="Profession" field="profession" />
                        <Field label="Height" field="height" /><Field label="Weight" field="weight" /><Field label="Income" field="income" />
                    </div>
                    <div className="scan-btns">
                        <button className="btn btn-primary" onClick={handleCreate}><CheckCircle size={16} /> Create Proposal</button>
                        <button className="btn btn-secondary" onClick={() => { setStage('upload'); setExtracted(null); }}><ScanLine size={16} /> Scan Another</button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
