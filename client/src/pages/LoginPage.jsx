import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { API, forgotPassword } from '../utils/api';
import { languages } from '../i18n/translations';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const { t, language, setLanguage } = useApp();
    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [isWarming, setIsWarming] = useState(false);
    const [showPass, setShowPass] = useState(false);

    // Pre-warm the server on page mount
    useEffect(() => {
        fetch(API + '/health').catch(() => {}); // Silent ping to wake up Render
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setSuccessMsg(''); setLoading(true); setIsWarming(false);
        const warmingTimer = setTimeout(() => setIsWarming(true), 12000);
        try {
            if (isLogin) {
                await login(form.email, form.password);
                setSuccessMsg('Successfully signed in!');
                setTimeout(() => navigate('/dashboard'), 1000);
            } else {
                if (form.password !== form.confirmPassword) { setError('Passwords do not match'); setLoading(false); clearTimeout(warmingTimer); return; }
                if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); clearTimeout(warmingTimer); return; }
                await register(form.name, form.email, form.password);
                setSuccessMsg('Successfully registered! Check your email for a welcome message.');
                setTimeout(() => navigate('/dashboard'), 1000);
            }
        } catch (err) { setError(err.message); }
        setLoading(false);
        setIsWarming(false);
        clearTimeout(warmingTimer);
    };

    const handleForgotPass = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        if (!form.email) {
            setError('Please enter your email address first.');
        } else {
            setError('');
            setResetLoading(true);
            setIsWarming(false);
            const warmingTimer = setTimeout(() => setIsWarming(true), 12000);
            try {
                const data = await forgotPassword(form.email);
                setSuccessMsg(data.message);
                setError('');
            } catch (err) {
                setError(err.message);
            } finally {
                setResetLoading(false);
                setIsWarming(false);
                clearTimeout(warmingTimer);
            }
        }
    };

    const toggle = () => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); setForm({ name: '', email: '', password: '', confirmPassword: '' }); };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 lg:p-12 selection:bg-blue-600 selection:text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            <main className="w-full max-w-7xl bg-white rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row min-h-[85vh] border border-slate-50">

                {/* ── LEFT: Form Section ── */}
                <section className="w-full md:w-1/2 lg:w-5/12 flex items-center justify-center p-8 lg:p-20 relative bg-white">
                    {/* Language Selector */}
                    <div className="absolute top-8 right-8 z-50">
                        <select value={language} onChange={e => setLanguage(e.target.value)}
                            className="border-none rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 outline-none focus:ring-2 focus:ring-blue-600/5 cursor-pointer appearance-none transition-all hover:bg-slate-100">
                            {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                        </select>
                    </div>

                    <div className="w-full max-w-md">
                        {/* Brand Header */}
                        <div className="mb-16">
                            <div className="flex items-center gap-4 mb-16 group cursor-default">
                                <div className="w-12 h-12 rounded-[18px] bg-slate-900 flex items-center justify-center text-white shadow-2xl transition-all duration-500 group-hover:rotate-6">
                                    <span className="material-symbols-outlined text-2xl font-black">shield_person</span>
                                </div>
                                <div>
                                    <span className="text-2xl font-black tracking-tighter text-slate-900 block leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AegisAI™</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Auth Protocol v2.1</span>
                                </div>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tighter leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {isLogin ? 'Access System.' : 'Initialize Profile.'}
                            </h1>
                            <p className="text-slate-400 font-bold text-sm">
                                {isLogin ? 'Enter your credentials to access the secure node.' : 'Begin your journey into autonomous protection.'}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name (Sign Up only) */}
                            {!isLogin && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 ml-1">Identity Name</label>
                                    <div className="relative flex items-center group">
                                        <span className="material-symbols-outlined absolute left-5 text-slate-300 transition-colors group-focus-within:text-blue-600 text-xl font-black">badge</span>
                                        <input className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-slate-50/50 border border-slate-50 text-slate-900 font-bold placeholder-slate-200 transition-all duration-300 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-sm"
                                            placeholder="Full legal name" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 ml-1">Secure Email</label>
                                <div className="relative flex items-center group">
                                    <span className="material-symbols-outlined absolute left-5 text-slate-300 transition-colors group-focus-within:text-blue-600 text-xl font-black">alternate_email</span>
                                    <input className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-slate-50/50 border border-slate-50 text-slate-900 font-bold placeholder-slate-200 transition-all duration-300 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-sm"
                                        placeholder="node-address@service.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">Access Key</label>
                                    {isLogin && (
                                        <button type="button" onClick={handleForgotPass} disabled={resetLoading}
                                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                                            {resetLoading && <span className="w-2 h-2 border border-blue-600 border-t-transparent rounded-full animate-spin" />}
                                            Recover Key
                                        </button>
                                    )}
                                </div>
                                <div className="relative flex items-center group">
                                    <span className="material-symbols-outlined absolute left-5 text-slate-300 transition-colors group-focus-within:text-blue-600 text-xl font-black">key</span>
                                    <input className="w-full pl-14 pr-14 py-5 rounded-[24px] bg-slate-50/50 border border-slate-50 text-slate-900 font-bold placeholder-slate-200 transition-all duration-300 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-sm"
                                        placeholder="••••••••" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-5 text-slate-300 hover:text-blue-600 transition-colors">
                                        <span className="material-symbols-outlined text-xl font-black">{showPass ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password (Sign Up only) */}
                            {!isLogin && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 ml-1">Verify Key</label>
                                    <div className="relative flex items-center group">
                                        <span className="material-symbols-outlined absolute left-5 text-slate-300 transition-colors group-focus-within:text-blue-600 text-xl font-black">task_alt</span>
                                        <input className="w-full pl-14 pr-6 py-5 rounded-[24px] bg-slate-50/50 border border-slate-50 text-slate-900 font-bold placeholder-slate-200 transition-all duration-300 outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 text-sm"
                                            placeholder="••••••••" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
                                    </div>
                                </div>
                            )}

                            {/* Note: Server Warming & Errors */}
                            {isWarming && (loading || resetLoading) && !error && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 p-4 rounded-2xl flex items-center gap-3 animate-pulse border border-amber-100">
                                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                                    <span>System Cold-Start Initiated (60s Max)</span>
                                </div>
                            )}

                            {error && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-4 rounded-2xl flex items-center gap-3 border border-rose-100">
                                    <span className="material-symbols-outlined text-sm">lock_reset</span> 
                                    <span>{error}</span>
                                </div>
                            )}

                            {successMsg && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100">
                                    <span className="material-symbols-outlined text-sm">verified_user</span>
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button type="submit" disabled={loading}
                                className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] py-6 rounded-[24px] hover:bg-black active:scale-[0.98] transition-all duration-500 shadow-2xl shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-50">
                                {loading ? (
                                    <span className="inline-block w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{isLogin ? 'Authenticate' : 'Initalize Profile'}</span>
                                        <span className="material-symbols-outlined text-lg font-black transition-transform group-hover:translate-x-1">login</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer Toggle */}
                        <div className="mt-16 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                                {isLogin ? 'New to the network?' : 'Already have a profile?'}{' '}
                                <button onClick={toggle} className="text-blue-600 hover:text-blue-800 transition-colors ml-2 border-b-2 border-blue-600 pb-0.5">
                                    {isLogin ? 'Request Access' : 'Return to Login'}
                                </button>
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── RIGHT: Visual Section ── */}
                <section className="hidden md:flex md:w-1/2 lg:w-7/12 relative p-6">
                    <div className="w-full h-full rounded-[40px] overflow-hidden relative shadow-inner border border-slate-50">
                        {/* Background Image */}
                        <img alt="Insurance protection"
                            className="absolute inset-0 w-full h-full object-cover scale-110"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAarM9rvcZuNUjB64IbhvJSaRIcHkZBylL2V3cgE7GKq_qA0Oz-VgadP72yxxGN38Ha02A4Oi2LUvB713pbWbUyB0P-Qvgx8E2DO2P4YvdS6Y5qF60ma_iUzeNQB3X_97Muy3EGc5wea1ijaI_RB-AlKAtPA_hmycjGnPBn6TnzDqzPb82JUiPWJpZGJ95ifbU6WfnddAa8tXc08Tx5CzuXfSa2e-HyjwEZx7FDX3nZIjWc4mgjRbYsREjSuS2ctJwI4dEVjAb6bj2v" />

                        {/* Overlays */}
                        <div className="absolute inset-0 bg-slate-900/20 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

                        {/* Floating Tech Badge */}
                        <div className="absolute top-10 right-10 z-20">
                            <div className="bg-black/40 backdrop-blur-3xl px-5 py-2.5 rounded-full flex items-center gap-3 border border-white/10 shadow-2xl">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-pulse" />
                                <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Quantum Encrypted Tunnel</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="absolute bottom-12 left-12 right-12 z-20 text-white max-w-lg">
                            <div className="flex gap-2 mb-10">
                                <div className="w-8 h-1 bg-blue-600 rounded-full" />
                                <div className="w-4 h-1 bg-white/20 rounded-full" />
                                <div className="w-4 h-1 bg-white/20 rounded-full" />
                            </div>
                            <h2 className="text-4xl lg:text-6xl font-black leading-[0.95] mb-8 tracking-tighter" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Secure Your <br />
                                Legacy Today.
                            </h2>
                            <p className="text-white/60 text-lg font-bold leading-relaxed mb-12">
                                Integrating military-grade biometric analysis with autonomous underwriting protocols.
                            </p>
                            
                            <div className="grid grid-cols-3 gap-8 pt-10 border-t border-white/10 opacity-80">
                                {[
                                    { label: 'Uptime', value: '100%' },
                                    { label: 'Protection', value: '256Bit' },
                                    { label: 'Latency', value: '14ms' }
                                ].map((stat, i) => (
                                    <div key={i}>
                                        <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
