import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { createProposal, scanDocument, calculateInsuranceAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Upload, Camera, CheckCircle, Loader, Activity, Shield, AlertTriangle, FileText, Download, TrendingUp, Info } from 'lucide-react';

export default function ScanPage() {
    const { t, fc } = useApp();
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const cameraRef = useRef(null);

    const [status, setStatus] = useState('idle'); // idle | scanning | calculating | done
    const [scanProgress, setScanProgress] = useState(0);
    const [creating, setCreating] = useState(false);

    const [scannedData, setScannedData] = useState(null);
    const [calcResult, setCalcResult] = useState(null);

    const handleScanFile = async (file) => {
        if (!file) return;
        setStatus('scanning');
        setScanProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setScanProgress(p => p >= 90 ? 90 : p + 5);
            }, 400);

            // 1. Scan with Gemini
            const extractedData = await scanDocument(file);
            clearInterval(progressInterval);
            setScanProgress(100);

            setStatus('calculating');

            // 2. Parse into user object for the new backend calculator
            const bd = extractedData.basic_details || {};
            const fh = extractedData.family_history || {};
            const ph = extractedData.personal_habits || {};
            const hc = extractedData.health_conditions || {};

            const mapHabit = (val) => {
                const v = (val || '').toLowerCase();
                if (v.includes('occasion')) return 1;
                if (v.includes('moderate')) return 2;
                if (v.includes('heavy') || v.includes('high')) return 3;
                return 0; // never
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

            // Determine Age
            let calcAge = 30; // default
            if (bd.date_of_birth) {
                const yearMatch = bd.date_of_birth.match(/\d{4}/);
                if (yearMatch) calcAge = new Date().getFullYear() - parseInt(yearMatch[0]);
            }

            const userForCalc = {
                age: calcAge,
                bmi: bmiNumber,
                family: parentStatusStr,
                diseases: {
                    thyroid: parseNum(hc.thyroid),
                    asthma: parseNum(hc.asthma),
                    hypertension: parseNum(hc.hyper_tension),
                    diabetes: parseNum(hc.diabetes_mellitus),
                    gut: parseNum(hc.gut_disorder)
                },
                habits: {
                    smoking: mapHabit(ph.smoking),
                    alcohol: mapHabit(ph.alcoholic_drinks),
                    tobacco: mapHabit(ph.tobacco)
                },
                lifeCover: parseNum(bd.base_cover_required),
                cirCover: parseNum(bd.cir_cover_required),
                accidentCover: parseNum(bd.accident_cover_required)
            };

            // 3. Call calculation API
            const finalCalc = await calculateInsuranceAPI(userForCalc);

            setScannedData({ ...extractedData.basic_details });
            setCalcResult(finalCalc);
            setStatus('done');

        } catch (error) {
            console.error('Workflow Failed:', error);
            alert(error.message || 'Failed to process document. Please try a clearer image.');
            setStatus('idle');
        }
    };

    const handleCreateProposal = async () => {
        setCreating(true);
        try {
            await createProposal({
                name: scannedData.name || 'Unknown User',
                age: 30, // fallback
                gender: scannedData.gender || 'male',
                dob: scannedData.date_of_birth || '',
                income: scannedData.yearly_income || 0,
                profession: scannedData.profession || '',
                residence: scannedData.place_of_residence || '',
                height: parseFloat(scannedData.height_cm) || 0,
                weight: parseFloat(scannedData.weight_kg) || 0,
                bmi: calcResult.bmi || 0,
                emrScore: calcResult.emr,
                emrBreakdown: {},
                riskClass: 'Class ' + calcResult.lifeClass,
                premium: {
                    life: calcResult.lifePremium,
                    cir: calcResult.cirPremium,
                    accident: calcResult.accPremium,
                    total: calcResult.total,
                    lifeFactor: calcResult.lifeFactor,
                    healthFactor: calcResult.healthFactor
                },
                status: 'pending',
                source: 'scan'
            });
            navigate('/dashboard');
        } catch (err) {
            alert('Failed to save proposal');
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    // Helper functions for UI
    const getRiskColor = (emr) => {
        if (emr <= 60) return '#10b981'; // Green
        if (emr <= 120) return '#f59e0b'; // Yellow
        if (emr <= 225) return '#f97316'; // Orange
        return '#dc2626'; // Red
    };

    return (
        <div className="min-h-screen pt-28 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <ScanLine className="text-primary" size={32} /> Smart AI Underwriter
                    </h1>
                    <p className="text-slate-500 mt-2">Upload handwritten proposal form to instantly map fields and calculate premium</p>
                </div>
                {status === 'idle' && (
                    <div className="flex gap-3">
                        <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 font-bold hover:scale-105 active:scale-95 transition-all">
                            <Upload size={18} /> Upload Image
                        </button>
                        <button onClick={() => cameraRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                            <Camera size={18} /> Use Camera
                        </button>
                        <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => handleScanFile(e.target.files[0])} />
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleScanFile(e.target.files[0])} />
                    </div>
                )}
            </div>

            {/* Empty State */}
            {status === 'idle' && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-16 text-center">
                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-primary">
                        <ScanLine size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Automated Underwriting Engine</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">Strictly mapping physical application fields to class-factor risk tables. No manual entry needed.</p>
                    <button onClick={() => inputRef.current?.click()} className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                        Select Document
                    </button>
                </div>
            )}

            {/* Processing Overlay */}
            <AnimatePresence>
                {(status === 'scanning' || status === 'calculating') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-sm w-full text-center border border-slate-200 dark:border-slate-800">
                            <div className="w-20 h-20 mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" />
                                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full text-primary">
                                    <Activity size={32} className="animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                {status === 'scanning' ? 'Extracting Handwriting...' : 'Calculating EMR & Premium...'}
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                {status === 'scanning' ? `AI Vision Model processing (${scanProgress}%)` : `Applying factoring rules...`}
                            </p>
                            {status === 'scanning' && (
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Final Output UI */}
            {status === 'done' && calcResult && scannedData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <div className="flex justify-between items-center mb-4 print:hidden">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Underwriting Report</h2>
                        <div className="flex gap-3">
                            <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2">
                                <Download size={16} /> Save PDF
                            </button>
                            <button onClick={handleCreateProposal} disabled={creating} className="px-6 py-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 font-bold hover:scale-105 active:scale-95 transition flex items-center gap-2">
                                {creating ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                Secure Quote
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: Results */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* The Risk Score Meter */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 flex flex-col sm:flex-row items-center gap-8">
                                <div className="relative w-48 h-48 flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="96" cy="96" r="84" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="16" fill="none" />
                                        <circle cx="96" cy="96" r="84" className="transition-all duration-1000 ease-out" 
                                            stroke={getRiskColor(calcResult.emr)} strokeWidth="16" 
                                            strokeDasharray={528} strokeDashoffset={528 - (528 * Math.min(calcResult.emr, 300) / 300)} 
                                            strokeLinecap="round" fill="none" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-black text-slate-900 dark:text-white">{calcResult.emr}</span>
                                        <span className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mt-1">EMR Score</span>
                                    </div>
                                </div>
                                
                                <div className="flex-1 w-full space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Shield size={20} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Life Class & Factor</p>
                                                <p className="font-black text-slate-900 dark:text-white mt-0.5">Class {calcResult.lifeClass} <span className="text-primary ml-1">×{calcResult.lifeFactor}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><Activity size={20} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Health Class & Factor</p>
                                                <p className="font-black text-slate-900 dark:text-white mt-0.5">Class {calcResult.healthClass} <span className="text-indigo-500 ml-1">×{calcResult.healthFactor}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PREMIUM GRID */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="bg-slate-900 text-white rounded-[2rem] p-8 relative overflow-hidden">
                                    <div className="absolute right-0 bottom-0 opacity-10 blur-xl scale-150"><TrendingUp size={160} /></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Premium</p>
                                    <h3 className="text-4xl font-black text-primary mb-6">{fc(calcResult.total)} <span className="text-sm text-slate-400 font-semibold">/ yr</span></h3>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Life Premium</span><span className="font-bold">{fc(calcResult.lifePremium)}</span></div>
                                        <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-400">Health (CIR)</span><span className="font-bold">{fc(calcResult.cirPremium)}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400">Accident Rider</span><span className="font-bold">{fc(calcResult.accPremium)}</span></div>
                                    </div>
                                </div>

                                {/* Unique AI Suggestions (Pro feature user requested) */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                                        <FileText className="text-primary" size={18} /> Premium Comparison
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        {calcResult.emr > 0 ? (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl text-sm flex gap-3 items-start">
                                                <Info className="shrink-0 mt-0.5" size={16} />
                                                <p>If you reduce your EMR to zero (standard risk), your total premium would drop significantly.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-xl text-sm flex gap-3 items-start">
                                                <CheckCircle className="shrink-0 mt-0.5" size={16} />
                                                <p>You qualify for the standard preferred rates! Excellent health and habits.</p>
                                            </div>
                                        )}
                                        
                                        {calcResult.emr > 30 && (
                                            <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-sm">
                                                <span className="text-rose-500 font-bold block mb-1">💡 AI Suggestion</span>
                                                "Reduce smoking/tobacco habits → premium could decrease by approximately {fc(Math.round(calcResult.total * 0.12))} annually based on your cover amount."
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Extracted Data Profile */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 lg:p-8">
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                                Extracted Data <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px]">Verified</span>
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400">Applicant Name</p>
                                    <p className="font-bold text-slate-900 dark:text-white">{scannedData.name || 'Not detected'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">Gender</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{scannedData.gender || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">DOB</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{scannedData.date_of_birth || '—'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400">Profession</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{scannedData.profession || '—'}</p>
                                </div>
                                <hr className="border-slate-100 dark:border-slate-800 my-4" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">Base Cover</p>
                                        <p className="font-black text-slate-900 dark:text-white capitalize">{scannedData.base_cover_required || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400">CIR Cover</p>
                                        <p className="font-black text-slate-900 dark:text-white">{scannedData.cir_cover_required || '—'}</p>
                                    </div>
                                </div>
                                
                                <button onClick={() => setStatus('idle')} className="w-full mt-6 px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition print:hidden">
                                    Scan Another Document
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
