import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ScanLine, Loader, CheckCircle, AlertTriangle, FileText, Activity,
         TrendingUp, Shield, Download, RefreshCw, ServerCrash, Zap } from 'lucide-react';

const SCANNER_URL = 'http://localhost:5050';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fc = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const EMR_COLOR = (s) => {
    if (s <= 110) return { text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Low Risk', ring: 'ring-emerald-300' };
    if (s <= 140) return { text: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Moderate', ring: 'ring-amber-300' };
    return            { text: 'text-red-600',         bg: 'bg-red-50',     label: 'High Risk', ring: 'ring-red-300' };
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScanPage() {
    const navigate = useNavigate();
    const [status, setStatus]         = useState('idle');   // idle | checking | scanning | done | error | offline
    const [result, setResult]         = useState(null);
    const [errorMsg, setErrorMsg]     = useState('');
    const [progress, setProgress]     = useState(0);
    const [dragOver, setDragOver]     = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const progressRef  = useRef(null);

    // ── Fake progress ticks during scan ──────────────────────────────────────
    const startProgress = () => {
        setProgress(5);
        progressRef.current = setInterval(() => {
            setProgress(p => p >= 90 ? 90 : p + Math.random() * 6);
        }, 800);
    };
    const stopProgress = (final = 100) => {
        clearInterval(progressRef.current);
        setProgress(final);
    };

    // ── Check if Python scanner is running ───────────────────────────────────
    const checkServer = async () => {
        try {
            const r = await fetch(`${SCANNER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
            return r.ok;
        } catch {
            return false;
        }
    };

    // ── Main scan handler ─────────────────────────────────────────────────────
    const handleFile = useCallback(async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please upload an image file (.jpg, .png, .webp)');
            setStatus('error');
            return;
        }

        // Preview
        setPreviewUrl(URL.createObjectURL(file));
        setStatus('checking');
        setResult(null);
        setErrorMsg('');

        const online = await checkServer();
        if (!online) {
            setStatus('offline');
            return;
        }

        setStatus('scanning');
        startProgress();

        try {
            const form = new FormData();
            form.append('image', file);

            const res = await fetch(`${SCANNER_URL}/api/scan`, {
                method: 'POST',
                body:   form,
                signal: AbortSignal.timeout(120_000),   // 2 min max
            });

            const data = await res.json();
            stopProgress(100);

            if (!res.ok) throw new Error(data.error || 'Scan failed');
            setResult(data);
            setStatus('done');
        } catch (err) {
            stopProgress(0);
            setErrorMsg(err.name === 'TimeoutError'
                ? 'Scan timed out. The image may be too large or OCR is still loading. Try again.'
                : err.message || 'Unexpected error during scan.');
            setStatus('error');
        }
    }, []);

    const onFileInput  = (e) => handleFile(e.target.files[0]);
    const onDrop       = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
    const onDragOver   = (e) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave  = () => setDragOver(false);
    const reset        = () => {
        setStatus('idle'); setResult(null); setErrorMsg('');
        setProgress(0);    setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#F8FAFC] py-10 px-4">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest mb-4">
                        <ScanLine size={13} /> Local AI Scanner
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Insurance Form Scanner
                    </h1>
                    <p className="mt-2 text-slate-500 font-medium text-sm max-w-lg mx-auto">
                        Drop a scanned proposal form. Our local AI extracts all fields, calculates EMR, and computes the premium — offline, instant, private.
                    </p>
                </div>

                {/* ── Upload Zone (idle / error) ── */}
                {(status === 'idle' || status === 'error') && (
                    <div
                        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-200
                            ${dragOver ? 'border-indigo-400 bg-indigo-50 scale-[1.01]' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'}`}
                    >
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
                        <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
                            <Upload size={32} className="text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Drop your form image here</h3>
                        <p className="text-slate-400 text-sm font-medium">JPG, PNG or WebP — handwritten or printed</p>
                        <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-colors">
                            <Upload size={15} /> Choose Image
                        </div>
                        {status === 'error' && (
                            <div className="mt-6 flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-left max-w-sm mx-auto">
                                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-red-700 text-sm font-medium">{errorMsg}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Offline notice ── */}
                {status === 'offline' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                            <ServerCrash size={36} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Scanner Not Running</h3>
                        <p className="text-slate-500 text-sm font-medium mb-6 max-w-sm mx-auto">
                            The local Python scanner isn't running. Start it with:
                        </p>
                        <div className="bg-slate-900 text-emerald-400 font-mono text-sm rounded-2xl p-5 text-left max-w-sm mx-auto mb-6">
                            <div className="text-slate-500 text-xs mb-1"># in insurance_scanner folder</div>
                            <div>pip install -r requirements.txt</div>
                            <div>python app.py</div>
                        </div>
                        <p className="text-slate-400 text-xs font-medium mb-6">
                            Then come back and try again. The scanner runs on <strong>http://localhost:5050</strong>
                        </p>
                        <button onClick={reset} className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 transition-all">
                            Try Again
                        </button>
                    </div>
                )}

                {/* ── Scanning Progress ── */}
                {(status === 'checking' || status === 'scanning') && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            {previewUrl && (
                                <img src={previewUrl} alt="preview" className="w-20 h-20 rounded-2xl object-cover opacity-40" />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader size={32} className="text-indigo-500 animate-spin" />
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-900 mb-2">
                            {status === 'checking' ? 'Connecting to scanner…' : 'Scanning Form…'}
                        </h3>
                        <p className="text-slate-400 text-sm font-medium mb-8">
                            {status === 'checking'
                                ? 'Checking local Python scanner on port 5050'
                                : 'EasyOCR → ML extraction → EMR calculation → Premium'}
                        </p>

                        <div className="w-full max-w-xs mx-auto bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 font-bold mt-3">{Math.round(progress)}% complete</p>

                        <div className="mt-8 grid grid-cols-3 gap-4 text-xs font-bold text-slate-400 max-w-xs mx-auto">
                            {['Preprocessing', 'OCR', 'ML Extraction'].map((step, i) => (
                                <div key={step} className={`flex flex-col items-center gap-1.5 ${progress > i * 30 ? 'text-indigo-500' : ''}`}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                                        ${progress > i * 30 + 30 ? 'bg-indigo-500 text-white' : progress > i * 30 ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                                        {progress > i * 30 + 30 ? '✓' : i + 1}
                                    </div>
                                    <span className="uppercase tracking-widest text-[9px]">{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Results ── */}
                {status === 'done' && result && <ScanResults result={result} onReset={reset} navigate={navigate} />}
            </div>
        </div>
    );
}

// ── Results Panel ─────────────────────────────────────────────────────────────
function ScanResults({ result, onReset, navigate }) {
    const fields = result.extracted_fields || {};
    const emr    = result.emr_score || 100;
    const color  = EMR_COLOR(emr);

    const downloadReport = () => {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = `AegisAI_Report_${fields.name?.replace(/\s+/g,'_') || 'Unknown'}.json`;
        a.click();
    };

    const submitProposal = () => {
        // Pass extracted data to the proposal page via state
        navigate('/proposal', { state: { prefill: fields } });
    };

    return (
        <div className="space-y-6">
            {/* Top action bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-emerald-500" />
                    <span className="font-black text-slate-900">Scan Complete</span>
                    <span className="text-xs font-bold text-slate-400 ml-2">
                        OCR Confidence: {(result.ocr_confidence_avg * 100).toFixed(0)}%
                    </span>
                </div>
                <div className="flex gap-2">
                    <button onClick={onReset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        <RefreshCw size={14} /> New Scan
                    </button>
                    <button onClick={downloadReport} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        <Download size={14} /> JSON
                    </button>
                    <button onClick={submitProposal} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-all shadow-lg">
                        <FileText size={14} /> Create Proposal
                    </button>
                </div>
            </div>

            {/* Cover warning */}
            {result.cover_warning && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-sm font-medium">{result.cover_warning}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left — Extracted Fields */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Personal info card */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-900 px-6 py-3 flex items-center gap-2">
                            <Shield size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Extracted Fields</span>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            {[
                                ['Name',          fields.name],
                                ['Gender',        fields.gender],
                                ['Date of Birth', fields.date_of_birth],
                                ['Age',           result.age ? `${result.age} yrs` : '—'],
                                ['Residence',     fields.residence],
                                ['Profession',    fields.profession],
                                ['Height',        fields.height_cm ? `${fields.height_cm} cm` : '—'],
                                ['Weight',        fields.weight_kg ? `${fields.weight_kg} kg` : '—'],
                                ['BMI',           result.bmi ? `${result.bmi}` : '—'],
                                ['Income',        fields.yearly_income ? fc(fields.yearly_income) : '—'],
                                ['Base Cover',    fields.base_cover_lakhs ? `₹${fields.base_cover_lakhs}L` : '—'],
                                ['CIR Cover',     fields.cir_cover_lakhs  ? `₹${fields.cir_cover_lakhs}L`  : '—'],
                                ['Accident Cover',fields.accident_cover_lakhs ? `₹${fields.accident_cover_lakhs}L` : '—'],
                                ['Income Source', fields.income_source],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                                    <p className={`font-bold text-sm mt-0.5 ${!val || val === '—' ? 'text-slate-300' : 'text-slate-900'}`}>
                                        {val || '—'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* EMR Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-900 px-6 py-3 flex items-center gap-2">
                            <Activity size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">EMR Breakdown</span>
                        </div>
                        <div className="p-6 space-y-2">
                            {(result.emr_breakdown || []).map((line, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-slate-300 mt-0.5">›</span>
                                    <p className="text-sm text-slate-600 font-medium">{line}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Unclear fields */}
                    {result.unclear_fields?.length > 0 && (
                        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <AlertTriangle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Fields with low OCR confidence</p>
                                <p className="text-sm text-slate-500">{result.unclear_fields.join(', ')}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar — Score + Premium */}
                <div className="space-y-6">

                    {/* EMR Score */}
                    <div className={`${color.bg} rounded-2xl border ${color.ring.replace('ring','border')} p-6 text-center`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">EMR Score</p>
                        <div className={`text-5xl font-black ${color.text} mb-1`}>{emr}</div>
                        <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${color.bg} ${color.text} border ${color.ring.replace('ring','border')}`}>
                            {color.label}
                        </span>

                        <div className="mt-4 w-full bg-white/60 rounded-full h-2 overflow-hidden">
                            <div className={`h-full rounded-full ${color.text.replace('text','bg')} transition-all duration-1000`}
                                 style={{ width: Math.min(emr, 200) / 2 + '%' }} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-left">
                            {[
                                ['Life Class', result.life_class],
                                ['Life Loading', result.life_loading_pct],
                                ['CIR Class', result.cir_class],
                                ['CIR Loading', result.cir_loading_pct],
                            ].map(([l, v]) => (
                                <div key={l} className="bg-white/60 rounded-xl p-2">
                                    <p className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">{l}</p>
                                    <p className="font-black text-slate-900 mt-0.5">{v || '—'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Premium */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-900 px-6 py-3 flex items-center gap-2">
                            <TrendingUp size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Premium Breakdown</span>
                        </div>
                        <div className="p-6 space-y-3">
                            {[
                                ['Life Insurance',  result.life_premium_rs],
                                ['CIR / Health',    result.cir_premium_rs],
                                ['Accident Rider',  result.accident_premium_rs],
                            ].map(([label, val]) => (
                                <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50">
                                    <span className="text-sm text-slate-500 font-medium">{label}</span>
                                    <span className="font-black text-slate-900 text-sm">{fc(val)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-wide">Total</span>
                                <span className="text-xl font-black text-indigo-600">{fc(result.total_premium_rs)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">Per annum estimate</p>
                        </div>
                    </div>

                    {/* Occupations */}
                    {fields.occupations?.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Zap size={11} /> Hazardous Occupation Loading
                            </p>
                            {fields.occupations.map(o => (
                                <p key={o} className="text-xs font-bold text-amber-800 capitalize">{o.replace('_', ' ')}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
