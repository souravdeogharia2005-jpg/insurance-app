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
        <div className="bg-[#F8FAFC] min-h-screen pt-28 pb-32 px-4 md:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6 print:hidden">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            <span className="material-symbols-outlined text-xs">auto_awesome</span> {t('aiPoweredAnalysis')}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
                            {t('scanTitle')}
                        </h1>
                        <p className="text-slate-500 mt-3 font-medium max-w-lg leading-relaxed">{t('scanSubtitle')}</p>
                    </div>
                    {status === 'idle' && (
                        <div className="flex gap-3">
                            <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200 font-bold hover:bg-slate-800 active:scale-95 transition-all text-sm">
                                <Upload size={18} /> {t('uploadImage')}
                            </button>
                            <button onClick={() => cameraRef.current?.click()} className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 active:scale-95 transition-all text-sm shadow-sm">
                                <Camera size={18} /> {t('useCamera')}
                            </button>
                            <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => handleScanFile(e.target.files[0])} />
                            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleScanFile(e.target.files[0])} />
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {status === 'idle' && (
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-16 text-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-1000" />
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner text-slate-900 border border-slate-100">
                                <ScanLine size={40} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{t('autoEngineTitle')}</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">{t('autoEngineDesc')}</p>
                            <button onClick={() => inputRef.current?.click()} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">
                                {t('startScanning')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Processing Overlay */}
                <AnimatePresence>
                    {(status === 'scanning' || status === 'calculating') && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-white/80 backdrop-blur-xl flex items-center justify-center p-4">
                            <div className="max-w-sm w-full text-center">
                                <div className="w-24 h-24 mx-auto mb-8 relative">
                                    <div className="absolute inset-0 border-[6px] border-slate-100 rounded-[2.5rem]" />
                                    <motion.div 
                                        className="absolute inset-0 border-[6px] border-slate-900 rounded-[2.5rem]"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        style={{ clipPath: 'inset(0 0 0 0 round 2.5rem)' }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-900">
                                        <Activity size={36} className="animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
                                    {status === 'scanning' ? t('analyzingHandwriting') : t('factoringRisk')}
                                </h3>
                                <p className="text-sm text-slate-500 mb-8 font-medium">
                                    {status === 'scanning' ? `${t('aiPoweredAnalysis')} (${scanProgress}%)` : `${t('factoringRisk')}...`}
                                </p>
                                {status === 'scanning' && (
                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50">
                                        <div className="bg-slate-900 h-full rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Final Output UI */}
                {status === 'done' && calcResult && scannedData && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-4 print:hidden">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('underwritingReport')}</h2>
                            <div className="flex gap-4">
                                <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 active:scale-95 transition flex items-center gap-2 shadow-sm">
                                    <Download size={18} /> {t('exportPDF')}
                                </button>
                                <button onClick={handleCreateProposal} disabled={creating} className="px-8 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-200 font-bold hover:bg-slate-800 active:scale-95 transition flex items-center gap-2">
                                    {creating ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                    {t('finalizeQuote')}
                                </button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            
                            {/* LEFT COLUMN: Results */}
                            <div className="lg:col-span-2 space-y-8">
                                
                                {/* The Risk Score Meter */}
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-12 shadow-sm">
                                    <div className="relative w-56 h-56 flex-shrink-0">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="112" cy="112" r="92" className="stroke-slate-50" strokeWidth="20" fill="none" />
                                            <circle cx="112" cy="112" r="92" className="transition-all duration-1000 ease-out" 
                                                stroke={getRiskColor(calcResult.emr)} strokeWidth="20" 
                                                strokeDasharray={578} strokeDashoffset={578 - (578 * Math.min(calcResult.emr, 300) / 300)} 
                                                strokeLinecap="round" fill="none" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-6xl font-black text-slate-900">{calcResult.emr}</span>
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

                                {/* PREMIUM GRID */}
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl">
                                        <div className="absolute right-[-10%] bottom-[-10%] opacity-5 blur-2xl scale-125 text-white"><TrendingUp size={240} /></div>
                                        <div className="relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{t('yearlyPremium')}</p>
                                            <h3 className="text-5xl font-black text-white mb-8 tracking-tight">{fc(calcResult.total)}</h3>
                                            
                                            <div className="space-y-4">
                                                <div className="flex justify-between border-b border-white/10 pb-3"><span className="text-slate-400 font-medium">{t('lifeCore')}</span><span className="font-bold">{fc(calcResult.lifePremium)}</span></div>
                                                <div className="flex justify-between border-b border-white/10 pb-3"><span className="text-slate-400 font-medium">{t('criticalIllness')}</span><span className="font-bold">{fc(calcResult.cirPremium)}</span></div>
                                                <div className="flex justify-between"><span className="text-slate-400 font-medium">{t('accidentRider')}</span><span className="font-bold">{fc(calcResult.accPremium)}</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
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
                                                    <p className="text-slate-600 font-medium leading-relaxed italic">
                                                        "Optimization possible: Significant premium reduction achievable by addressing lifestyle habits (-12% estimate)."
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Extracted Data Profile */}
                            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">{t('ocrVerified')}</div>
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10">
                                    {t('digitalTwinProfile')}
                                </h4>
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
                                    
                                    <button onClick={() => setStatus('idle')} className="w-full mt-10 px-6 py-4 bg-slate-50 text-slate-500 font-black rounded-2xl transition hover:bg-slate-100 active:scale-95 text-xs uppercase tracking-widest print:hidden border border-slate-100">
                                        {t('scanNewForm')}
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
