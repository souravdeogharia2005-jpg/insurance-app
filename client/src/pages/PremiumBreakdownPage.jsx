import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { buildBreakdownSteps, getTopFactors } from '../utils/breakdown';
import { calcHealthScore, calcInsuranceScore, calcFinancialScore, scoreColor, claimProbability } from '../utils/scores';
import { calculateInsurance } from '../utils/emr';
import { getToken } from '../utils/api';
import {
    ArrowLeft, Brain, TrendingUp, TrendingDown,
    Minus, ChevronRight, Star, Zap, Shield, Heart,
    DollarSign, Activity, Loader, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://aegis-backend.onrender.com';

// ── Animated Score Ring ─────────────────────────────────────────────────────────
function ScoreRing({ score, label, icon: Icon, size = 100 }) {
    const { color, label: lvl, bg } = scoreColor(score);
    const r = 38;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={r} fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                    <circle cx="50" cy="50" r={r} fill="transparent"
                        stroke={color} strokeWidth="7"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold" style={{ color }}>{score}</span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>{lvl}</span>
            </div>
        </div>
    );
}

// ── Impact Badge ───────────────────────────────────────────────────────────────
function ImpactBar({ delta, max }) {
    const pct = Math.min(Math.abs(delta) / (max || 1) * 100, 100);
    const color = delta > 0 ? '#EF4444' : delta < 0 ? '#22C55E' : '#F59E0B';
    return (
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full">
            <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
            />
        </div>
    );
}

export default function PremiumBreakdownPage() {
    const navigate = useNavigate();
    const { fc } = useApp();
    const [simpleMode, setSimpleMode] = useState(true);
    const [explanation, setExplanation] = useState('');
    const [explanationLoading, setExplanationLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Future simulator state
    const [simBmi, setSimBmi] = useState(null);
    const [simSmoking, setSimSmoking] = useState(null);
    const [simAlcohol, setSimAlcohol] = useState(null);
    const [simPremium, setSimPremium] = useState(null);

    // Load proposal data from sessionStorage
    const [data, setData] = useState(null);
    const [calc, setCalc] = useState(null);
    const [steps, setSteps] = useState([]);
    const [scores, setScores] = useState({ health: 0, insurance: 0, financial: 0 });

    useEffect(() => {
        const raw = sessionStorage.getItem('aegis_breakdown');
        if (!raw) { navigate('/proposal'); return; }
        try {
            const parsed = JSON.parse(raw);
            setData(parsed.user);
            setCalc(parsed.calc);
            const s = buildBreakdownSteps(parsed.user, parsed.calc);
            setSteps(s);
            setScores({
                health:    calcHealthScore(parsed.user, parsed.calc),
                insurance: calcInsuranceScore(parsed.calc),
                financial: calcFinancialScore(parsed.user),
            });
            setSimBmi(parseFloat(parsed.user.bmi) || 25);
            setSimSmoking(parseInt(parsed.user.smoking) || 0);
            setSimAlcohol(parseInt(parsed.user.alcohol) || 0);
            setSimPremium(parsed.calc.total);

            // Fetch AI risk profile
            fetchRiskProfile(parsed.user, parsed.calc);
            // Fetch explanation
            fetchExplanation(parsed.user, parsed.calc, 'simple');
        } catch (e) {
            navigate('/proposal');
        }
    }, []);

    const maxDelta = Math.max(...steps.filter(s => s.id !== 'base').map(s => Math.abs(s.premiumDelta)), 1);

    async function fetchExplanation(user, c, mode) {
        setExplanationLoading(true);
        try {
            const r = await fetch(`${API_BASE}/api/explain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ user, calc: c, mode }),
            });
            const d = await r.json();
            setExplanation(d.explanation || '');
        } catch { setExplanation('AI explanation unavailable.'); }
        setExplanationLoading(false);
    }

    async function fetchRiskProfile(user, c) {
        setProfileLoading(true);
        try {
            const r = await fetch(`${API_BASE}/api/risk-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ user, calc: c }),
            });
            const d = await r.json();
            setProfile(d.profile || null);
        } catch { setProfile(null); }
        setProfileLoading(false);
    }

    function handleModeToggle() {
        const newMode = !simpleMode;
        setSimpleMode(newMode);
        if (data && calc) fetchExplanation(data, calc, newMode ? 'simple' : 'detailed');
    }

    // Live premium simulator
    function runSim() {
        if (!data || !calc) return;
        const simUser = { ...data, bmi: simBmi, smoking: simSmoking, alcohol: simAlcohol };
        const simCalc = calculateInsurance(simUser);
        setSimPremium(simCalc.total);
    }

    useEffect(() => { runSim(); }, [simBmi, simSmoking, simAlcohol]);

    if (!data || !calc) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="spinner" />
            </div>
        );
    }

    const riskColors = { Low: '#22C55E', Medium: '#F59E0B', High: '#F97316', 'Very High': '#EF4444' };
    const impactColor = (s) => s === 'increase' ? '#EF4444' : s === 'decrease' ? '#22C55E' : '#F59E0B';
    const impactIcon = (s) => s === 'increase' ? TrendingUp : s === 'decrease' ? TrendingDown : Minus;
    const savings = calc.total - (simPremium || calc.total);
    const habitLevelLabel = ['Never', 'Occasionally', 'Moderate', 'Heavy'];

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white pb-24">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Premium Breakdown</h1>
                        <p className="text-slate-400 text-sm">For {data.name || 'You'}, Age {data.age}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-sm font-semibold">
                        <span className={simpleMode ? 'text-blue-400' : 'text-slate-500'}>Simple</span>
                        <button onClick={handleModeToggle} className="text-blue-400 hover:text-blue-300 transition-colors">
                            {simpleMode ? <ToggleLeft size={28} /> : <ToggleRight size={28} />}
                        </button>
                        <span className={!simpleMode ? 'text-blue-400' : 'text-slate-500'}>Detailed</span>
                    </div>
                </motion.div>

                {/* ── Section 0: AI Risk Profile ──────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="rounded-2xl overflow-hidden border border-white/10"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Brain size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">AI Risk Profile</h2>
                                <p className="text-xs text-slate-400">Powered by Groq AI</p>
                            </div>
                        </div>

                        {profileLoading ? (
                            <div className="flex items-center gap-3 text-slate-400 py-4">
                                <Loader className="animate-spin" size={18} />
                                <span className="text-sm">Analysing your risk profile...</span>
                            </div>
                        ) : profile ? (
                            <>
                                {/* Risk Level + Summary */}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="px-4 py-2 rounded-xl font-black text-lg border"
                                        style={{ color: riskColors[profile.riskLevel], borderColor: riskColors[profile.riskLevel] + '40', background: riskColors[profile.riskLevel] + '15' }}>
                                        {profile.riskLevel}
                                        <div className="text-xs font-semibold opacity-80">{profile.riskPercentage}% risk</div>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed flex-1">{profile.summary}</p>
                                </div>

                                {/* Tips */}
                                <div className="space-y-2">
                                    {(profile.tips || []).map((tip, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                            <Zap size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-200">{tip.action}</p>
                                                <p className="text-xs text-green-400 font-semibold mt-0.5">Save ~{tip.saving}/yr</p>
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${tip.priority === 'High' ? 'bg-red-500/20 text-red-400' : tip.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {tip.priority}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-slate-500 text-sm py-2">Risk profile unavailable. Check API connection.</p>
                        )}
                    </div>
                </motion.div>

                {/* ── Section 1: Extracted Data ──────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-white/10 p-5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400"><Shield size={14} /></span>
                        Your Profile Data
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                            { icon: '🎂', label: 'Age', value: `${data.age} years` },
                            { icon: '⚖️', label: 'BMI', value: `${parseFloat(data.bmi || 0).toFixed(1)}` },
                            { icon: '🚬', label: 'Smoking', value: habitLevelLabel[parseInt(data.smoking) || 0] },
                            { icon: '🍺', label: 'Alcohol', value: habitLevelLabel[parseInt(data.alcohol) || 0] },
                            { icon: '👨‍👩‍👧', label: 'Family', value: (data.parentStatus || '').replace(/_/g, ' ') },
                            { icon: '💼', label: 'Occupation', value: (data.occupation || 'normal').replace(/_/g, ' ') },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                <span className="text-xl">{item.icon}</span>
                                <div>
                                    <p className="text-xs text-slate-400">{item.label}</p>
                                    <p className="text-sm font-semibold capitalize">{item.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Active conditions */}
                    {Object.entries(data.diseases || {}).some(([, v]) => parseInt(v) > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(data.diseases || {}).filter(([, v]) => parseInt(v) > 0).map(([k, v]) => (
                                <span key={k} className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
                                    {k.replace('_', ' ')} (Sev {v})
                                </span>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* ── Section 2: Calculation Timeline ───────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-white/10 p-5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Activity size={14} />
                        </span>
                        Step-by-Step Calculation
                    </h2>
                    <div className="space-y-0">
                        {steps.map((step, i) => {
                            const Icon = impactIcon(step.impact);
                            const color = impactColor(step.impact);
                            const isLast = i === steps.length - 1;
                            return (
                                <motion.div key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.06 }}
                                    className="relative pl-12">
                                    {/* Vertical line */}
                                    {!isLast && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-white/10" />}
                                    {/* Step dot */}
                                    <div className="absolute left-0 top-3 w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-sm font-bold"
                                        style={{ background: color + '22', borderColor: color + '44', color }}>
                                        <span className="text-base">{step.icon}</span>
                                    </div>

                                    <div className="pb-6">
                                        <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-semibold text-sm">{step.label}</span>
                                                {step.id !== 'base' ? (
                                                    <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color }}>
                                                        <Icon size={14} />
                                                        {step.premiumDelta >= 0 ? '+' : ''}₹{Math.abs(step.premiumDelta).toLocaleString('en-IN')}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-bold text-blue-400">₹{step.premiumDelta.toLocaleString('en-IN')}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mb-2 leading-relaxed">{step.reason}</p>
                                            {step.id !== 'base' && (
                                                <ImpactBar delta={step.premiumDelta} max={maxDelta} />
                                            )}
                                            <div className="mt-2 text-right">
                                                <span className="text-xs text-slate-500">Running total: </span>
                                                <span className="text-xs font-bold text-white">₹{step.running.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Final Premium */}
                    <div className="rounded-2xl p-5 border mt-2" style={{ background: 'rgba(37,99,235,0.12)', borderColor: '#2563EB66' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">🎯 Final Annual Premium</p>
                                <p className="text-4xl font-black text-white">₹{calc.total.toLocaleString('en-IN')}</p>
                                <p className="text-slate-400 text-xs mt-1">= ₹{Math.round(calc.total / 12).toLocaleString('en-IN')}/month</p>
                            </div>
                            <div className="text-right">
                                <div className="px-3 py-1 rounded-lg mb-2 font-bold text-sm"
                                    style={{ background: '#2563EB33', color: '#93C5FD' }}>
                                    Life Class {calc.lifeClass}
                                </div>
                                <p className="text-xs text-slate-400">EMR Score: {calc.emr}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* ── AI Explanation ─────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-white/10 p-5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <Zap size={18} className="text-yellow-400" />
                            {simpleMode ? '🧒 Explain Like I\'m 10' : '📊 Detailed Analysis'}
                        </h2>
                        <button onClick={() => data && calc && fetchExplanation(data, calc, simpleMode ? 'simple' : 'detailed')}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                            <RefreshCw size={14} className={explanationLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {explanationLoading ? (
                        <div className="flex items-center gap-3 text-slate-400 py-2">
                            <Loader className="animate-spin" size={16} />
                            <span className="text-sm">Generating {simpleMode ? 'simple' : 'detailed'} explanation...</span>
                        </div>
                    ) : (
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{explanation}</p>
                    )}
                </motion.div>

                {/* ── Section 3: Insurance Scores ────────────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="rounded-2xl border border-white/10 p-5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                        <Star size={18} className="text-yellow-400" />
                        Your AegisAI Scores
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <ScoreRing score={scores.health} label="Health Score" icon={Heart} />
                        <ScoreRing score={scores.insurance} label="Insurance Score" icon={Shield} />
                        <ScoreRing score={scores.financial} label="Financial Protection" icon={DollarSign} />
                    </div>

                    {/* Claim probability */}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        {[10, 20].map(yr => {
                            const prob = claimProbability(yr, calc.emr, data.age);
                            const col = prob < 30 ? '#22C55E' : prob < 60 ? '#F59E0B' : '#EF4444';
                            return (
                                <div key={yr} className="p-4 rounded-xl border border-white/10 bg-white/5 text-center">
                                    <p className="text-slate-400 text-xs mb-1">Claim probability in {yr} years</p>
                                    <p className="text-2xl font-black" style={{ color: col }}>{prob}%</p>
                                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div className="h-full rounded-full" style={{ background: col }}
                                            initial={{ width: 0 }} animate={{ width: `${prob}%` }}
                                            transition={{ duration: 1, delay: 0.5 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* ── Section 4: Future Premium Simulator ───────────────────── */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-white/10 p-5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                        <RefreshCw size={18} className="text-purple-400" />
                        Future Premium Simulator
                    </h2>
                    <p className="text-slate-400 text-sm mb-5">Adjust your habits below to see your new premium instantly.</p>

                    <div className="space-y-5">
                        {/* BMI Slider */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-300">⚖️ BMI</span>
                                <span className="font-bold text-blue-400">{simBmi?.toFixed(1)}</span>
                            </div>
                            <input type="range" min="15" max="45" step="0.5"
                                value={simBmi || 25}
                                onChange={e => setSimBmi(parseFloat(e.target.value))}
                                className="range-slider w-full" />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>15 (Very Low)</span><span>25 (Ideal)</span><span>45 (Obese)</span>
                            </div>
                        </div>

                        {/* Smoking Slider */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-300">🚬 Smoking</span>
                                <span className="font-bold text-orange-400">{['Never', 'Occasional', 'Moderate', 'Heavy'][simSmoking || 0]}</span>
                            </div>
                            <input type="range" min="0" max="3" step="1"
                                value={simSmoking || 0}
                                onChange={e => setSimSmoking(parseInt(e.target.value))}
                                className="range-slider w-full" />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>Never</span><span>Occasional</span><span>Moderate</span><span>Heavy</span>
                            </div>
                        </div>

                        {/* Alcohol Slider */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-300">🍺 Alcohol</span>
                                <span className="font-bold text-yellow-400">{['Never', 'Occasional', 'Moderate', 'Heavy'][simAlcohol || 0]}</span>
                            </div>
                            <input type="range" min="0" max="3" step="1"
                                value={simAlcohol || 0}
                                onChange={e => setSimAlcohol(parseInt(e.target.value))}
                                className="range-slider w-full" />
                        </div>
                    </div>

                    {/* Sim result */}
                    <div className="mt-6 p-4 rounded-2xl border" style={{ background: savings > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', borderColor: savings > 0 ? '#22C55E44' : '#EF444444' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-xs mb-0.5">Simulated Premium</p>
                                <p className="text-2xl font-black">₹{(simPremium || calc.total).toLocaleString('en-IN')}</p>
                            </div>
                            {savings !== 0 && (
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 mb-0.5">{savings > 0 ? 'Potential Savings' : 'Extra Cost'}</p>
                                    <p className="text-xl font-bold" style={{ color: savings > 0 ? '#22C55E' : '#EF4444' }}>
                                        {savings > 0 ? '-' : '+'}₹{Math.abs(savings).toLocaleString('en-IN')}/yr
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* ── Section 5: Premium Reduction Roadmap ─────────────────── */}
                {profile?.roadmap && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="rounded-2xl border border-white/10 p-5"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                            <TrendingDown size={18} className="text-green-400" />
                            Your Premium Reduction Roadmap
                        </h2>
                        <div className="space-y-4">
                            {profile.roadmap.map((item, i) => (
                                <div key={i} className="relative pl-10">
                                    {i < profile.roadmap.length - 1 && (
                                        <div className="absolute left-3.5 top-8 bottom-0 w-0.5 bg-green-500/20" />
                                    )}
                                    <div className="absolute left-0 top-2 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-xs font-black text-white">
                                        {item.step}
                                    </div>
                                    <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-3 mb-1">
                                            <h3 className="font-bold text-sm text-green-300">{item.title}</h3>
                                            <span className="text-xs font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
                                                Save {item.savings}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-relaxed">{item.description}</p>
                                        <p className="text-xs text-blue-400 mt-1.5 font-semibold">⏱ {item.timeframe}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

            </div>
        </div>
    );
}
