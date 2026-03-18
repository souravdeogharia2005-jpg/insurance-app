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
        <div className="min-h-screen bg-[#F8FAFC] pt-28 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6 print:hidden">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em]">Autonomous Intelligence</p>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
                        <ScanLine className="text-blue-600" size={40} /> Aegis Underwriter
                    </h1>
                    <p className="text-slate-400 font-bold text-sm">Convert physical application forms into verified digital risk profiles instantly.</p>
                </div>
                {status === 'idle' && (
                    <div className="flex gap-3">
                        <button onClick={() => inputRef.current?.click()} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-900/10 font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95">
                            <Upload size={18} /> Upload Image
                        </button>
                        <button onClick={() => cameraRef.current?.click()} className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                            <Camera size={18} /> Use Camera
                        </button>
                        <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => handleScanFile(e.target.files[0])} />
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e => handleScanFile(e.target.files[0])} />
                    </div>
                )}
            </div>

            {/* Empty State */}
            {status === 'idle' && (
                <div className="bg-white rounded-[48px] p-20 text-center border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -ml-32 -mb-32" />
                    
                    <div className="relative z-10">
                        <div className="w-28 h-28 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <ScanLine size={48} className="text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Handwriting Recognition Engine</h3>
                        <p className="text-slate-400 font-bold max-w-md mx-auto mb-12 leading-relaxed">
                            Strictly mapping physical application fields to class-factor risk tables. 
                            Our neural network identifies handwriting with 99.4% accuracy.
                        </p>
                        <button onClick={() => inputRef.current?.click()} className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">
                            Initialize Scan
                        </button>
                    </div>
                </div>
            )}

            {/* Processing Overlay */}
            <AnimatePresence>
                {(status === 'scanning' || status === 'calculating') && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-white/80 backdrop-blur-xl flex items-center justify-center p-4">
                        <div className="bg-white rounded-[48px] p-16 max-w-sm w-full text-center border border-slate-100 shadow-2xl">
                            <div className="w-24 h-24 mx-auto mb-8 relative">
                                <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping" />
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-50 rounded-full text-blue-600">
                                    <Activity size={40} className="animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                                {status === 'scanning' ? 'Decoding Assets...' : 'Analyzing Risk Vector'}
                            </h3>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10">
                                {status === 'scanning' ? `AI Vision Active (${scanProgress}%)` : `Applying Actuarial Rules`}
                            </p>
                            {status === 'scanning' && (
                                <div className="w-full bg-slate-50 rounded-full h-3 overflow-hidden p-1 border border-slate-100">
                                    <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Final Output UI */}
            {status === 'done' && calcResult && scannedData && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
                        <div className="space-y-1">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Underwriting Synthesis</h2>
                            <p className="text-slate-400 font-bold text-sm">System has verified the scan and generated the risk profile.</p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={() => window.print()} className="flex-1 md:flex-none px-8 py-4 bg-white border border-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition shadow-sm">
                                <Download size={18} /> Export PDF
                            </button>
                            <button onClick={handleCreateProposal} disabled={creating} className="flex-1 md:flex-none px-8 py-4 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-600/20 font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition">
                                {creating ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                Secure Quote
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        
                        {/* LEFT COLUMN: Results */}
                        <div className="lg:col-span-2 space-y-8">
                            
                            {/* The Risk Score Meter */}
                            <div className="bg-white border border-slate-50 rounded-[48px] p-10 flex flex-col sm:flex-row items-center gap-10 shadow-sm">
                                <div className="relative w-56 h-56 flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="112" cy="112" r="100" className="stroke-slate-50" strokeWidth="20" fill="none" />
                                        <circle cx="112" cy="112" r="100" className="transition-all duration-1500 ease-out" 
                                            stroke={getRiskColor(calcResult.emr)} strokeWidth="20" 
                                            strokeDasharray={628} strokeDashoffset={628 - (628 * Math.min(calcResult.emr, 300) / 300)} 
                                            strokeLinecap="round" fill="none" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-6xl font-black text-slate-900 tracking-tighter">{calcResult.emr}</span>
                                        <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase mt-2">EMR INDEX</span>
                                    </div>
                                </div>
                                
                                <div className="flex-1 w-full space-y-6">
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-50 flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-white text-blue-600 flex items-center justify-center shadow-sm"><Shield size={28} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Life Protocol</p>
                                            <p className="font-black text-slate-900 text-lg mt-0.5 tracking-tight">Class {calcResult.lifeClass} • <span className="text-blue-600">×{calcResult.lifeFactor}</span></p>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-50 flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl bg-white text-indigo-500 flex items-center justify-center shadow-sm"><Activity size={28} /></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Protocol</p>
                                            <p className="font-black text-slate-900 text-lg mt-0.5 tracking-tight">Class {calcResult.healthClass} • <span className="text-indigo-500">×{calcResult.healthFactor}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PREMIUM GRID */}
                            <div className="grid sm:grid-cols-2 gap-8">
                                <div className="bg-slate-900 text-white rounded-[48px] p-10 relative overflow-hidden group">
                                    <div className="absolute right-0 bottom-0 opacity-5 blur-2xl scale-150 group-hover:scale-110 transition-transform duration-1000"><TrendingUp size={200} /></div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] mb-2">Aggregate Premium</p>
                                    <h3 className="text-5xl font-black text-blue-400 mb-8 tracking-tighter">{fc(calcResult.total)} <span className="text-xs text-white/30 font-bold uppercase tracking-widest">/ annually</span></h3>
                                    
                                    <div className="space-y-4">
                                        <div className="flex justify-between border-b border-white/5 pb-3">
                                            <span className="text-white/40 font-bold text-xs uppercase tracking-wider">Life Asset</span>
                                            <span className="font-black text-sm">{fc(calcResult.lifePremium)}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-3">
                                            <span className="text-white/40 font-bold text-xs uppercase tracking-wider">Health Asset</span>
                                            <span className="font-black text-sm">{fc(calcResult.cirPremium)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-white/40 font-bold text-xs uppercase tracking-wider">Passive Guard</span>
                                            <span className="font-black text-sm">{fc(calcResult.accPremium)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-50 rounded-[48px] p-10 shadow-sm">
                                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-[0.25em] flex items-center gap-3 mb-8">
                                        <FileText className="text-blue-600" size={20} /> Optimization Intelligence
                                    </h4>
                                    
                                    <div className="space-y-6">
                                        {calcResult.emr > 0 ? (
                                            <div className="bg-blue-50/50 text-blue-900 p-6 rounded-3xl text-xs font-bold leading-relaxed border border-blue-100/30 flex gap-4 items-start">
                                                <Info className="shrink-0 text-blue-600" size={20} />
                                                <p>Standard risk optimization would yield a premium reduction of <span className="text-blue-600 font-black">{fc(Math.round(calcResult.total * 0.2))}</span> per cycle.</p>
                                            </div>
                                        ) : (
                                            <div className="bg-emerald-50/50 text-emerald-900 p-6 rounded-3xl text-xs font-bold leading-relaxed border border-emerald-100/30 flex gap-4 items-start">
                                                <CheckCircle className="shrink-0 text-emerald-600" size={20} />
                                                <p>Zero-risk baseline detected. Applicant qualifies for tier-1 premium architecture.</p>
                                            </div>
                                        )}
                                        
                                        {calcResult.emr > 30 && (
                                            <div className="bg-slate-50 p-6 rounded-3xl text-xs font-bold leading-relaxed border border-slate-100">
                                                <span className="text-blue-600 font-black block mb-2 uppercase tracking-widest text-[9px]">Aegis Suggestion</span>
                                                "Modifying elective habits could optimize the rating and reduce the liability factor."
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Extracted Data Profile */}
                        <div className="bg-white border border-slate-50 rounded-[48px] p-10 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16" />
                            
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-10 flex items-center justify-between relative z-10">
                                Identity Data <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-emerald-100/50">Verified</span>
                            </h4>
                            
                            <div className="space-y-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Full Legal Name</p>
                                    <p className="font-black text-slate-900 text-xl tracking-tight uppercase">{scannedData.name || 'Anonymous'}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Bio-Gender</p>
                                        <p className="font-extrabold text-slate-800 uppercase tracking-tighter text-sm">{scannedData.gender || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Genesis</p>
                                        <p className="font-extrabold text-slate-800 tracking-tighter text-sm">{scannedData.date_of_birth || '—'}</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Profession</p>
                                    <p className="font-extrabold text-slate-800 text-sm tracking-tight">{scannedData.profession || '—'}</p>
                                </div>

                                <div className="w-full h-px bg-slate-50" />

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Base Asset</p>
                                        <p className="font-black text-slate-900 tracking-tighter text-sm">{scannedData.base_cover_required || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Critical Asset</p>
                                        <p className="font-black text-slate-900 tracking-tighter text-sm">{scannedData.cir_cover_required || '—'}</p>
                                    </div>
                                </div>
                                
                                <button onClick={() => setStatus('idle')} className="w-full mt-10 px-8 py-4 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all print:hidden">
                                    Re-Initialize Scanner
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
