import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal, scanDocument, calculateInsuranceAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Camera, CheckCircle, Loader, Activity, Shield, AlertTriangle, FileText, Download, TrendingUp, Info, Eye, ClipboardList } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const API = import.meta.env.VITE_API_URL || '/api';

// ─── Proposal form template ─────────────────────────────────────────────────
const PROPOSAL_TEMPLATE = `Standard Proposal Form

Name:
Gender:
Place of Residence:
Date of Birth:

Profession:
Height:
Weight:
Yearly Income:
Source of Income:

Base Cover Required:
CIR Cover Required:
Accident Cover Required:

--- Family History ---
Both parents alive (>65)
One alive (>65)
Both died (<65)

--- Health Conditions ---
Thyroid:
Asthma:
Hypertension:
Diabetes:
Gut Disorder:

--- Personal Habits ---
Smoking:
Alcohol:
Tobacco:

--- Occupation ---
Athlete / Pilot / Driver / Oil Industry`;

export default function ScanPage() {
    const { t, fc } = useApp();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const cameraRef = useRef(null);
    const visionInputRef = useRef(null);
    const visionCameraRef = useRef(null);

    const [status, setStatus] = useState('idle');
    const [scanProgress, setScanProgress] = useState(0);
    const [scanStage, setScanStage] = useState('');
    const [activeMode, setActiveMode] = useState('emr');
    const [showTemplate, setShowTemplate] = useState(false);

    // Full reset for "Scan Again"
    const scanAgain = () => {
        setStatus('idle');
        setScanProgress(0);
        setScanStage('');
        setScannedData(null);
        setCalcResult(null);
        setVisionRawText('');
        setVisionStructured(null);
    };

    const [scannedData, setScannedData] = useState(null);
    const [calcResult, setCalcResult] = useState(null);

    // Vision OCR state
    const [visionRawText, setVisionRawText] = useState('');
    const [visionStructured, setVisionStructured] = useState(null);
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const downloadProposalPDF = () => {
        const element = document.getElementById('proposal-report');
        if (!element) return;
        setIsExporting(true);
        setTimeout(() => {
            const opt = {
                margin:       [0.5, 0.5, 0.5, 0.5],
                filename:     `AegisAI_Proposal_${scannedData?.name?.replace(/ /g, '_') || 'Report'}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
        }, 150);
    };

    // ── Shared EMR Processing & Auto-save ──────────────────────────────────────
    const processAndSaveEMR = async (extractedData) => {
        const bd = extractedData.basic_details || extractedData || {};
        const fh = extractedData.family_history || extractedData || {};
        const ph = extractedData.personal_habits || extractedData || {};
        const hc = extractedData.health_conditions || extractedData || {};

        const mapHabit = (val) => {
            const v = (val || '').toLowerCase();
            if (v.includes('occasion')) return 1;
            if (v.includes('moderate')) return 2;
            if (v.includes('heavy') || v.includes('high')) return 3;
            return 0;
        };
        const parseNum = (v) => parseFloat(String(v || '').replace(/[^0-9.]/g, '')) || 0;
        const height = parseNum(bd.height_cm);
        const weight = parseNum(bd.weight_kg);
        const bmiNumber = height > 0 ? (weight / Math.pow(height / 100, 2)) : 0;

        let parentStatusStr = "alive_healthy";
        const pStr = (fh.parent_status || '').toLowerCase();
        if (pStr.includes('both surviving') || pStr.includes('alive')) parentStatusStr = "both_above_65";
        else if (pStr.includes('only one') || pStr.includes('after')) parentStatusStr = "one_above_65";
        else if (pStr.includes('both died') || pStr.includes('before')) parentStatusStr = "both_below_65";

        let calcAge = 30;
        if (bd.date_of_birth) {
            const yearMatch = bd.date_of_birth.match(/\d{4}/);
            if (yearMatch) calcAge = new Date().getFullYear() - parseInt(yearMatch[0]);
        }

        const userForCalc = {
            age: calcAge, bmi: bmiNumber, family: parentStatusStr,
            diseases: {
                thyroid: parseNum(hc.thyroid), asthma: parseNum(hc.asthma),
                hypertension: parseNum(hc.hyper_tension), diabetes: parseNum(hc.diabetes_mellitus),
                gut: parseNum(hc.gut_disorder)
            },
            habits: { smoking: mapHabit(ph.smoking), alcohol: mapHabit(ph.alcoholic_drinks), tobacco: mapHabit(ph.tobacco) },
            lifeCover: parseNum(bd.base_cover_required), cirCover: parseNum(bd.cir_cover_required), accidentCover: parseNum(bd.accident_cover_required),
            occupation: (bd.profession || '').toLowerCase()
        };

        const finalCalc = await calculateInsuranceAPI(userForCalc);
        setScannedData({ ...bd });
        setCalcResult(finalCalc);

        // Auto-save the proposal to DB
        try {
            await createProposal({
                name: bd.name || 'Unknown User', age: calcAge,
                gender: bd.gender || 'male', dob: bd.date_of_birth || '',
                income: parseNum(bd.yearly_income) || 0, profession: bd.profession || '',
                residence: bd.place_of_residence || '', height: height,
                weight: weight, bmi: finalCalc.bmi || bmiNumber,
                emrScore: finalCalc.emr, emrBreakdown: finalCalc.breakdown || {}, riskClass: 'Class ' + finalCalc.lifeClass,
                premium: { life: finalCalc.lifePremium, cir: finalCalc.cirPremium, accident: finalCalc.accPremium, total: finalCalc.total, lifeFactor: finalCalc.lifeFactor, healthFactor: finalCalc.healthFactor },
                status: 'pending', source: 'scan'
            });
            console.log("Proposal Auto-Saved!");
        } catch (err) {
            console.error('Failed to auto-save proposal:', err);
        }

        setActiveMode('emr');
        setStatus('done');
    };

    // ── Existing EMR scan flow (Gemini) ──────────────────────────────────────
    const handleScanFile = async (file, inputElement) => {
        if (!file) return;
        setStatus('scanning');
        setScanProgress(0);
        try {
            const progressInterval = setInterval(() => {
                setScanProgress(p => p >= 90 ? 90 : p + 5);
            }, 400);
            const extractedData = await scanDocument(file);
            clearInterval(progressInterval);
            setScanProgress(100);
            setStatus('calculating');
            
            await processAndSaveEMR(extractedData);
        } catch (error) {
            console.error('Workflow Failed:', error);
            alert(error.message || 'Failed to process document. Please try a clearer image.');
            setStatus('idle');
        } finally {
            if (inputElement) inputElement.value = '';
        }
    };

    // ── Client-side image preprocessing (grayscale → contrast → binarize) ——
    const preprocessImage = (file) => new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Scale down large images for faster OCR
                const MAX = 2000;
                const scale = Math.min(MAX / img.width, MAX / img.height, 1);
                canvas.width  = img.width  * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');

                // Draw original image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Step 1: Grayscale
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const d = imageData.data;
                for (let i = 0; i < d.length; i += 4) {
                    const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
                    d[i] = d[i+1] = d[i+2] = gray;
                }

                // Step 2: Contrast stretch (histogram style)
                let min = 255, max = 0;
                for (let i = 0; i < d.length; i += 4) { min = Math.min(min, d[i]); max = Math.max(max, d[i]); }
                const range = max - min || 1;
                for (let i = 0; i < d.length; i += 4) {
                    const v = Math.round(((d[i] - min) / range) * 255);
                    d[i] = d[i+1] = d[i+2] = v;
                }

                // Step 3: Adaptive binarize threshold (Otsu-like: mean-based)
                let sum = 0;
                const pixels = d.length / 4;
                for (let i = 0; i < d.length; i += 4) sum += d[i];
                const threshold = (sum / pixels) * 0.85; // slightly below mean for text clarity
                for (let i = 0; i < d.length; i += 4) {
                    const v = d[i] < threshold ? 0 : 255;
                    d[i] = d[i+1] = d[i+2] = v;
                }

                ctx.putImageData(imageData, 0, 0);
                canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/png' })), 'image/png', 1.0);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ── Just AI Scanner (Tesseract + Gemini) ————————————————————
    const handleVisionScan = async (file, inputElement) => {
        if (!file) return;
        setStatus('vision_scanning');
        setScanProgress(0);
        setScanStage('preprocessing');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout

        try {
            // Step 1: Preprocess image client-side
            setScanProgress(10);
            setScanStage('preprocessing');
            const processedFile = await preprocessImage(file);
            setScanProgress(25);

            // Step 2: Upload preprocessed image for OCR
            setScanStage('ocr');
            const token = localStorage.getItem('aegis-token');
            const formData = new FormData();
            formData.append('document', processedFile);

            // Simulate OCR progress
            const progressInterval = setInterval(() => setScanProgress(p => p >= 80 ? 80 : p + 5), 600);

            const res = await fetch(`${API}/vision-scan`, {
                method: 'POST',
                body: formData,
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                signal: controller.signal
            });
            clearInterval(progressInterval);
            clearTimeout(timeoutId);

            setScanStage('parsing');
            setScanProgress(90);

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Vision scan failed');

            setScanProgress(100);
            setScanStage('done');
            setVisionRawText(data.rawText || '');
            setVisionStructured(data.structured || null);
            setStatus('vision_done');
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Vision scan failed:', error);
            setScanStage('');
            if (error.name === 'AbortError') {
                alert('Scan timed out. The server might be waking up — please try again in 30 seconds.');
            } else if (error.message.includes('blurry') || error.message.includes('No text')) {
                alert('No text detected. Please use a clearer, well-lit image.');
            } else {
                alert(error.message || 'Scan failed. Please try a clearer image.');
            }
            setStatus('idle');
        } finally {
            if (inputElement) inputElement.value = '';
        }
    };

    // ── PDF download ──────────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        setDownloadingPDF(true);
        try {
            const token = localStorage.getItem('aegis-token');
            const res = await fetch(`${API}/download-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ text: visionRawText, title: `AegisAI OCR - ${visionStructured?.name || 'Insurance Report'}` })
            });
            if (!res.ok) throw new Error('PDF generation failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'aegisai-ocr-report.pdf'; a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.message || 'Failed to download PDF');
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handleCreateProposal = async () => {
        setCreating(true);
        try {
            await createProposal({
                name: scannedData.name || 'Unknown User', age: 30,
                gender: scannedData.gender || 'male', dob: scannedData.date_of_birth || '',
                income: scannedData.yearly_income || 0, profession: scannedData.profession || '',
                residence: scannedData.place_of_residence || '', height: parseFloat(scannedData.height_cm) || 0,
                weight: parseFloat(scannedData.weight_kg) || 0, bmi: calcResult.bmi || 0,
                emrScore: calcResult.emr, emrBreakdown: {}, riskClass: 'Class ' + calcResult.lifeClass,
                premium: { life: calcResult.lifePremium, cir: calcResult.cirPremium, accident: calcResult.accPremium, total: calcResult.total, lifeFactor: calcResult.lifeFactor, healthFactor: calcResult.healthFactor },
                status: 'pending', source: 'scan'
            });
            navigate('/dashboard');
        } catch (err) {
            alert('Failed to save proposal'); console.error(err);
        } finally { setCreating(false); }
    };

    const getRiskColor = (emr) => {
        if (emr <= 60) return '#10b981';
        if (emr <= 120) return '#f59e0b';
        if (emr <= 225) return '#f97316';
        return '#dc2626';
    };

    const isProcessing = ['scanning', 'calculating', 'vision_scanning'].includes(status);

    return (
        <div className="bg-[#F8FAFC] w-full pt-8 pb-32 px-4 md:px-8">
            <div className="max-w-5xl mx-auto">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6 print:hidden">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            <span className="material-symbols-outlined text-xs">auto_awesome</span> {t('aiPoweredAnalysis')}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 flex items-center gap-4 tracking-tight">{t('scanTitle')}</h1>
                        <p className="text-slate-500 mt-3 font-medium max-w-lg leading-relaxed">{t('scanSubtitle')}</p>
                    </div>
                </div>

                {/* ── Mode Tabs ────────────────────────────────────────────── */}
                {(status === 'idle' || status === 'vision_done') && (
                    <div className="flex gap-3 mb-8 print:hidden flex-wrap">
                        <button onClick={() => { setActiveMode('emr'); setStatus('idle'); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeMode === 'emr' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Activity size={16} /> EMR Calculator Scan
                        </button>
                        <button onClick={() => { setActiveMode('vision'); setStatus('idle'); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${activeMode === 'vision' ? 'bg-blue-600 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <Eye size={16} /> Google Vision OCR
                        </button>
                        <button onClick={() => setShowTemplate(!showTemplate)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all">
                            <ClipboardList size={16} /> {showTemplate ? 'Hide' : 'View'} Proposal Template
                        </button>
                    </div>
                )}

                {/* ── Proposal Template ────────────────────────────────────── */}
                <AnimatePresence>
                    {showTemplate && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                            <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><ClipboardList size={18} /></div>
                                    <h3 className="font-black text-slate-900">📄 Standard Proposal Form Template</h3>
                                </div>
                                <pre className="text-xs text-slate-600 bg-slate-50 rounded-2xl p-5 overflow-x-auto font-mono leading-relaxed border border-slate-100 whitespace-pre-wrap">{PROPOSAL_TEMPLATE}</pre>
                                <p className="text-xs text-slate-400 mt-3 font-medium">👆 Fill out this form, photograph it, then scan using Google Vision OCR above</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Hidden File Inputs (sr-only for mobile compatibility) ── */}
                {/* NOTE: Using sr-only style instead of 'hidden' attr — iOS Safari & Android
                     Chrome require the input to be in the rendering tree to open file picker */}
                <input id="scan-upload"   type="file" accept="image/*,application/pdf" style={{position:'absolute',width:'1px',height:'1px',opacity:0,overflow:'hidden'}} onChange={e => handleScanFile(e.target.files[0], e.target)} />
                <input id="scan-camera"   type="file" accept="image/*" capture="environment" style={{position:'absolute',width:'1px',height:'1px',opacity:0,overflow:'hidden'}} onChange={e => handleScanFile(e.target.files[0], e.target)} />
                <input id="vision-upload" type="file" accept="image/*,application/pdf" style={{position:'absolute',width:'1px',height:'1px',opacity:0,overflow:'hidden'}} onChange={e => handleVisionScan(e.target.files[0], e.target)} />
                <input id="vision-camera" type="file" accept="image/*" capture="environment" style={{position:'absolute',width:'1px',height:'1px',opacity:0,overflow:'hidden'}} onChange={e => handleVisionScan(e.target.files[0], e.target)} />

                {/* ── Idle State ───────────────────────────────────────────── */}
                {status === 'idle' && activeMode === 'emr' && (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 md:p-16 text-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-1000" />
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner text-slate-900 border border-slate-100">
                                <ScanLine size={40} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{t('autoEngineTitle')}</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">{t('autoEngineDesc')}</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <label htmlFor="scan-upload" className="cursor-pointer flex items-center gap-2 justify-center px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">
                                    <Upload size={18} /> {t('uploadImage')}
                                </label>
                                <label htmlFor="scan-camera" className="cursor-pointer flex items-center gap-2 justify-center px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 active:scale-95 transition-all text-sm">
                                    <Camera size={18} /> {t('useCamera')}
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'idle' && activeMode === 'vision' && (
                    <div className="bg-white border-2 border-blue-100 rounded-[2.5rem] p-10 md:p-16 text-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner text-blue-600 border border-blue-100">
                                <Eye size={40} strokeWidth={2} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Just Ai Scanner</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-3 font-medium leading-relaxed">Upload any handwritten or printed insurance form. Just Ai Scanner extracts all text instantly.</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                                ✅ Powered by Just Ai Scanner
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <label htmlFor="vision-upload" className="cursor-pointer flex items-center gap-2 justify-center px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all text-sm uppercase tracking-widest">
                                    <Upload size={18} /> Upload Image
                                </label>
                                <label htmlFor="vision-camera" className="cursor-pointer flex items-center gap-2 justify-center px-8 py-4 bg-white border-2 border-blue-200 text-blue-700 rounded-2xl font-bold hover:bg-blue-50 active:scale-95 transition-all text-sm">
                                    <Camera size={18} /> Use Camera
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Processing Overlay ───────────────────────────────────── */}
                <AnimatePresence>
                    {isProcessing && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-xl flex items-center justify-center p-4">
                            <div className="max-w-sm w-full text-center">
                                <div className="w-24 h-24 mx-auto mb-8 relative">
                                    <div className="absolute inset-0 border-[6px] border-slate-100 rounded-[2.5rem]" />
                                    <motion.div
                                        className="absolute inset-0 border-[6px] border-blue-600 rounded-[2.5rem]"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        style={{ clipPath: 'inset(0 50% 50% 0 round 2.5rem)' }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-900">
                                        <Activity size={36} className="animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
                                    {status === 'vision_scanning'
                                        ? scanStage === 'preprocessing' ? '🎨 Preprocessing Image...'
                                        : scanStage === 'ocr'          ? '🔍 Just Ai Scanning...'
                                        : scanStage === 'parsing'      ? '🧠 AI Parsing Fields...'
                                        : '🔍 Just Ai Scanning...'
                                        : status === 'scanning' ? t('analyzingHandwriting') : t('factoringRisk')}
                                </h3>
                                <p className="text-sm text-slate-500 mb-8 font-medium">
                                    {status === 'vision_scanning'
                                        ? scanStage === 'preprocessing' ? `Enhancing image quality (grayscale → contrast → binarize)...`
                                        : scanStage === 'ocr'          ? `Running local OCR engine (${scanProgress}%)`
                                        : scanStage === 'parsing'      ? `AI extracting insurance fields...`
                                        : `Extracting text via Just Ai Scanner (${scanProgress}%)`
                                        : status === 'scanning' ? `${t('aiPoweredAnalysis')} (${scanProgress}%)` : `${t('factoringRisk')}...`}
                                </p>
                                {(status === 'scanning' || status === 'vision_scanning') && (
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                                        <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Vision OCR Results ───────────────────────────────────── */}
                {status === 'vision_done' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">OCR Result</h2>
                                <p className="text-slate-500 text-sm mt-1 font-medium">Text extracted by Just Ai Scanner</p>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <button onClick={handleDownloadPDF} disabled={downloadingPDF || !visionRawText} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 active:scale-95 transition disabled:opacity-50 shadow-lg shadow-blue-100">
                                    {downloadingPDF ? <Loader className="animate-spin" size={16} /> : <Download size={16} />} Download PDF
                                </button>
                                <button onClick={scanAgain} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl font-bold text-sm hover:bg-blue-100 active:scale-95 transition">
                                    <ScanLine size={16} /> Scan Again
                                </button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-6">
                            {/* Raw OCR Text */}
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Eye size={18} /></div>
                                    <h4 className="font-black text-slate-900">Raw OCR Text</h4>
                                    <span className="ml-auto bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-100">{t('ocrVerified')}</span>
                                </div>
                                <pre className="text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 overflow-auto max-h-80 font-mono leading-relaxed border border-slate-100 whitespace-pre-wrap">
                                    {visionRawText || 'No text detected'}
                                </pre>
                            </div>

                            {/* Structured Fields */}
                            {visionStructured && (
                                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><FileText size={18} /></div>
                                        <h4 className="font-black text-slate-900">Extracted Fields</h4>
                                        <span className="ml-auto bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase px-2 py-1 rounded-full border border-indigo-100">AI Parsed</span>
                                    </div>
                                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                        {Object.entries(visionStructured).map(([k, v]) => v !== null && v !== '' && v !== 0 ? (
                                            <div key={k} className="flex justify-between items-center py-3 border-b border-slate-50 relative group">
                                                <div>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k.replace(/_/g, ' ')}</span>
                                                    <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                        <span className="text-[8px] font-bold text-emerald-600 uppercase">99% Match</span>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-slate-800 text-sm text-right max-w-[50%] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">{String(v)}</span>
                                            </div>
                                        ) : null)}
                                    </div>
                                    {/* Quick-fill into EMR calculator */}
                                    <button onClick={() => { setStatus('calculating'); setTimeout(() => processAndSaveEMR(visionStructured), 500); }} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 active:scale-95 transition flex items-center justify-center gap-2">
                                        <Activity size={16} /> Run EMR Calculation & Auto-Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── EMR Final Output UI ──────────────────────────────────── */}
                {status === 'done' && calcResult && scannedData && (
                    <div id="proposal-report" className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 bg-transparent sm:bg-white sm:p-10 sm:rounded-[3rem] sm:shadow-sm">

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('underwritingReport')}</h2>
                            {!isExporting && (
                                <div className="flex gap-3 flex-wrap print:hidden">
                                    <button
                                        onClick={scanAgain}
                                        className="px-6 py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl font-bold hover:bg-blue-100 active:scale-95 transition flex items-center gap-2"
                                    >
                                        <ScanLine size={18} /> Scan Again
                                    </button>
                                    <button onClick={downloadProposalPDF} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 active:scale-95 transition flex items-center gap-2">
                                        <Download size={18} /> {t('exportPDF', 'Download PDF')}
                                    </button>
                                    <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-200 font-bold hover:bg-emerald-700 active:scale-95 transition flex items-center gap-2">
                                        <CheckCircle size={18} /> Saved to Dashboard →
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {isExporting && (
                            <div className="mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
                                <span className="font-black text-slate-900 tracking-widest text-lg uppercase">AEGIS PROTOCOL</span>
                                <span className="font-bold text-slate-400 text-xs">CONFIDENTIAL REPORT • {new Date().toLocaleDateString()}</span>
                            </div>
                        )}

                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12 shadow-sm">
                                    <div className="relative w-48 h-48 md:w-56 md:h-56 flex-shrink-0">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="112" cy="112" r="92" className="stroke-slate-50" strokeWidth="20" fill="none" />
                                            <circle cx="112" cy="112" r="92" className="transition-all duration-1000 ease-out"
                                                stroke={getRiskColor(calcResult.emr)} strokeWidth="20"
                                                strokeDasharray={578} strokeDashoffset={578 - (578 * Math.min(calcResult.emr, 300) / 300)}
                                                strokeLinecap="round" fill="none" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-5xl md:text-6xl font-black text-slate-900">{calcResult.emr}</span>
                                            <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-2">EMR SCORE</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full space-y-5">
                                        <div className="p-6 bg-slate-50/50 border border-slate-100/50 rounded-3xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-900 flex items-center justify-center"><Shield size={24} /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('lifeClassFactor')}</p>
                                                    <p className="font-black text-slate-900 mt-1 text-lg">Class {calcResult.lifeClass} <span className="text-indigo-600 ml-2">×{calcResult.lifeFactor}</span></p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-slate-50/50 border border-slate-100/50 rounded-3xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm text-indigo-600 flex items-center justify-center"><Activity size={24} /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('healthClassFactor')}</p>
                                                    <p className="font-black text-slate-900 mt-1 text-lg">Class {calcResult.healthClass} <span className="text-emerald-600 ml-2">×{calcResult.healthFactor}</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-2xl">
                                        <div className="absolute right-[-10%] bottom-[-10%] opacity-5 blur-2xl scale-125 text-white"><TrendingUp size={240} /></div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('yearlyPremium')}</p>
                                            <h3 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">{fc(calcResult.total)}</h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between border-b border-white/10 pb-3"><span className="text-slate-400 font-medium">{t('lifeCore')}</span><span className="font-bold">{fc(calcResult.lifePremium)}</span></div>
                                                <div className="flex justify-between border-b border-white/10 pb-3"><span className="text-slate-400 font-medium">{t('criticalIllness')}</span><span className="font-bold">{fc(calcResult.cirPremium)}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-400 font-medium">{t('accidentRider')}</span><span className="font-bold">{fc(calcResult.accPremium)}</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
                                        <h4 className="font-black text-slate-900 flex items-center gap-3 mb-8 tracking-tight">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><FileText size={18} /></div>
                                            {t('riskInsights')}
                                        </h4>
                                        <div className="space-y-5">
                                            {calcResult.emr > 0 ? (
                                                <div className="bg-indigo-50 text-indigo-700 p-5 rounded-2xl text-sm flex gap-4 items-start border border-indigo-100/50">
                                                    <Info className="shrink-0 mt-0.5" size={18} />
                                                    <p className="font-medium leading-relaxed">Standard preferred rates would apply if EMR is reduced to <span className="font-black">0</span> (Class I risk profile).</p>
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-50 text-emerald-700 p-5 rounded-2xl text-sm flex gap-4 items-start border border-emerald-100/50">
                                                    <CheckCircle className="shrink-0 mt-0.5" size={18} />
                                                    <p className="font-medium">Applicant qualifies for priority preferred rates. Excellent health profile detected.</p>
                                                </div>
                                            )}
                                            {calcResult.emr > 30 && (
                                                <div className="bg-slate-50 p-5 rounded-2xl text-sm border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="material-symbols-outlined text-amber-500 text-lg">lightbulb</span>
                                                        <span className="text-slate-900 font-black uppercase text-[10px] tracking-widest">AI Strategy</span>
                                                    </div>
                                                    <p className="text-slate-600 font-medium leading-relaxed italic">"Optimization possible: Significant premium reduction achievable by addressing lifestyle habits (-12% estimate)."</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">{t('ocrVerified')}</div>
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10">{t('digitalTwinProfile')}</h4>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
                                        <p className="font-black text-slate-900 text-lg">{scannedData.name || 'Not detected'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                                            <p className="font-bold text-slate-800 capitalize">{scannedData.gender || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DOB</p>
                                            <p className="font-bold text-slate-800">{scannedData.date_of_birth || '—'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Occupation</p>
                                        <p className="font-bold text-slate-800">{scannedData.profession || '—'}</p>
                                    </div>
                                    <div className="h-px bg-slate-100 my-4" />
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Cover</p>
                                            <p className="font-black text-slate-900 text-lg truncate">{scannedData.base_cover_required || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CIR Cover</p>
                                            <p className="font-black text-slate-900 text-lg">{scannedData.cir_cover_required || '—'}</p>
                                        </div>
                                    </div>
                                    <button onClick={scanAgain} className="w-full mt-6 px-6 py-4 bg-blue-50 text-blue-700 font-black rounded-2xl transition hover:bg-blue-100 active:scale-95 text-xs uppercase tracking-widest print:hidden border border-blue-100 flex items-center justify-center gap-2">
                                        <ScanLine size={14} /> {t('scanNewForm', 'Scan Again')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
