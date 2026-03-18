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
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
                .login-page { background: radial-gradient(circle at top left, #f8fafc 0%, #f1f5f9 100%); }
                .glass-main { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.4); }
                .hero-overlay-gradient { background: linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.85) 100%); }
                .input-glow:focus-within { box-shadow: 0 0 0 4px rgba(99,102,241,0.1); border-color: #6366F1; }
                .premium-box-shadow { box-shadow: 0 40px 100px -20px rgba(0,0,0,0.06); }
                .login-btn-shadow { box-shadow: 0 20px 40px -12px rgba(30,41,59,0.35); }
                .accent-indigo { color: #6366F1; }
                .bg-accent-indigo { background: #6366F1; }
                .noise-texture { background-image: url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="n"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23n)" opacity="0.08"/%3E%3C/svg%3E'); }
            `}</style>

            <div className="login-page min-h-screen flex items-center justify-center p-4 md:p-8 lg:p-12" style={{ fontFamily: "'Inter', sans-serif" }}>
                <main className="w-full max-w-7xl glass-main rounded-[2rem] md:rounded-[3.5rem] premium-box-shadow overflow-hidden flex flex-col md:flex-row min-h-[85vh]">

                    {/* ── LEFT: Form Section ── */}
                    <section className="w-full md:w-1/2 lg:w-5/12 flex items-center justify-center p-6 sm:p-8 lg:p-16 xl:p-24 bg-white/60 relative">
                        {/* Language Selector */}
                        <div className="absolute top-4 right-4 z-50">
                            <select value={language} onChange={e => setLanguage(e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white/80 text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm cursor-pointer">
                                {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                            </select>
                        </div>

                        <div className="w-full max-w-md">
                            {/* Brand Header */}
                            <div className="mb-10 md:mb-12">
                                <div className="flex items-center gap-3.5 mb-10 md:mb-12 group cursor-default">
                                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 transition-all duration-500 group-hover:rotate-6">
                                        <span className="material-symbols-outlined text-2xl">shield_person</span>
                                    </div>
                                    <div>
                                        <span className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 block leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AegisAI</span>
                                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Insurance Group</span>
                                    </div>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {isLogin ? t('welcomeBack') : t('createAccount')}
                                </h1>
                                <p className="text-slate-500 font-medium text-sm md:text-base">
                                    {isLogin ? 'Access your secure protection dashboard.' : 'Create your AegisAI insurance account.'}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name (Sign Up only) */}
                                {!isLogin && (
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('fullName')}</label>
                                        <div className="relative flex items-center group">
                                            <span className="material-symbols-outlined absolute left-4 text-slate-400 transition-colors group-focus-within:text-indigo-500 text-xl">person</span>
                                            <input className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-300 transition-all duration-300 outline-none focus:ring-0 input-glow text-sm"
                                                placeholder="John Doe" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                        </div>
                                    </div>
                                )}

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('email')}</label>
                                    <div className="relative flex items-center group">
                                        <span className="material-symbols-outlined absolute left-4 text-slate-400 transition-colors group-focus-within:text-indigo-500 text-xl">mail</span>
                                        <input className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-300 transition-all duration-300 outline-none focus:ring-0 input-glow text-sm"
                                            placeholder="name@company.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('password')}</label>
                                        {isLogin && (
                                            <button type="button" onClick={handleForgotPass} disabled={resetLoading}
                                                className="text-[11px] font-bold accent-indigo hover:text-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                                                {resetLoading && <span className="w-2 h-2 border border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                                                {resetLoading ? 'Resetting...' : 'Forgot password?'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative flex items-center group">
                                        <span className="material-symbols-outlined absolute left-4 text-slate-400 transition-colors group-focus-within:text-indigo-500 text-xl">lock_open</span>
                                        <input className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-300 transition-all duration-300 outline-none focus:ring-0 input-glow text-sm"
                                            placeholder="••••••••" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 text-slate-400 hover:text-indigo-500 transition-colors">
                                            <span className="material-symbols-outlined text-xl">{showPass ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password (Sign Up only) */}
                                {!isLogin && (
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t('confirmPassword')}</label>
                                        <div className="relative flex items-center group">
                                            <span className="material-symbols-outlined absolute left-4 text-slate-400 transition-colors group-focus-within:text-indigo-500 text-xl">lock</span>
                                            <input className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-800 placeholder-slate-300 transition-all duration-300 outline-none focus:ring-0 input-glow text-sm"
                                                placeholder="••••••••" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
                                        </div>
                                    </div>
                                )}

                                {/* Remember Me */}
                                {isLogin && (
                                    <div className="flex items-center px-1">
                                        <input className="h-5 w-5 text-indigo-500 focus:ring-indigo-200 border-slate-200 rounded-md transition-all cursor-pointer" id="remember_me" type="checkbox" />
                                        <label className="ml-3 block text-sm font-semibold text-slate-600 cursor-pointer select-none" htmlFor="remember_me">Keep me logged in</label>
                                    </div>
                                )}

                                {/* Server Warming Message */}
                                {isWarming && (loading || resetLoading) && !error && (
                                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-start gap-2 animate-pulse">
                                        <span className="material-symbols-outlined text-sm mt-0.5 animate-spin">sync</span>
                                        <span>Server is starting up (Free Tier cold-start). This may take up to 60 seconds. Please wait...</span>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-2xl flex items-start gap-2">
                                        <span className="material-symbols-outlined text-sm mt-0.5">error</span> {error}
                                    </div>
                                )}

                                {/* Success */}
                                {successMsg && (
                                    <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-start gap-2">
                                        <span className="material-symbols-outlined text-sm mt-0.5">check_circle</span> {successMsg}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button type="submit" disabled={loading}
                                    className="w-full bg-slate-900 text-white font-bold py-4 md:py-5 rounded-2xl hover:bg-slate-800 active:scale-[0.99] transition-all duration-300 login-btn-shadow flex items-center justify-center gap-2 group disabled:opacity-50">
                                    {loading ? (
                                        <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>{isLogin ? t('signIn') : t('signUp')}</span>
                                            <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-10 md:mt-12 text-center">
                                <p className="text-sm font-medium text-slate-400">
                                    {isLogin ? t('noAccount') : t('hasAccount')}{' '}
                                    <button onClick={toggle} className="accent-indigo font-bold hover:underline underline-offset-8 decoration-2">
                                        {isLogin ? t('signUp') : t('signIn')}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* ── RIGHT: Hero Section (hidden on mobile) ── */}
                    <section className="hidden md:flex md:w-1/2 lg:w-7/12 relative p-5">
                        <div className="w-full h-full rounded-[2rem] md:rounded-[3rem] overflow-hidden relative shadow-2xl">
                            {/* Background Image */}
                            <img alt="Happy family representing insurance protection"
                                className="absolute inset-0 w-full h-full object-cover scale-105"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAarM9rvcZuNUjB64IbhvJSaRIcHkZBylL2V3cgE7GKq_qA0Oz-VgadP72yxxGN38Ha02A4Oi2LUvB713pbWbUyB0P-Qvgx8E2DO2P4YvdS6Y5qF60ma_iUzeNQB3X_97Muy3EGc5wea1ijaI_RB-AlKAtPA_hmycjGnPBn6TnzDqzPb82JUiPWJpZGJ95ifbU6WfnddAa8tXc08Tx5CzuXfSa2e-HyjwEZx7FDX3nZIjWc4mgjRbYsREjSuS2ctJwI4dEVjAb6bj2v" />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-slate-900/10 mix-blend-multiply" />
                            <div className="absolute inset-0 hero-overlay-gradient" />

                            {/* Floating Badge */}
                            <div className="absolute top-8 right-8 z-20">
                                <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-2.5 border border-white/20">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
                                    <span className="text-[9px] font-extrabold text-white uppercase tracking-[0.2em]">Secure Encryption Active</span>
                                </div>
                            </div>

                            {/* Hero Content */}
                            <div className="absolute bottom-10 lg:bottom-16 left-8 lg:left-16 z-20 text-white max-w-lg">
                                <div className="w-14 h-1.5 bg-indigo-500 mb-8 lg:mb-10 rounded-full shadow-lg shadow-indigo-500/50" />
                                <h2 className="text-3xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.08] mb-6 lg:mb-8 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Modern Protection <br />
                                    <span className="font-normal opacity-90 italic">for your legacy.</span>
                                </h2>
                                <p className="text-white/80 text-base lg:text-xl font-medium leading-relaxed max-w-md">
                                    Join over 2 million families who trust AegisAI to safeguard their most valuable moments.
                                </p>
                                <div className="mt-8 lg:mt-12 flex gap-8 items-center border-t border-white/10 pt-6 lg:pt-8">
                                    <div>
                                        <p className="text-xl lg:text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>A+</p>
                                        <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-white/50 font-bold">Rating</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/20" />
                                    <div>
                                        <p className="text-xl lg:text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>24/7</p>
                                        <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-white/50 font-bold">Support</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/20" />
                                    <div>
                                        <p className="text-xl lg:text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>2M+</p>
                                        <p className="text-[9px] lg:text-[10px] uppercase tracking-widest text-white/50 font-bold">Families</p>
                                    </div>
                                </div>
                            </div>

                            {/* Noise texture overlay */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.1] mix-blend-overlay noise-texture" />
                        </div>
                    </section>

                    {/* ── MOBILE: Compact Hero (visible only on mobile) ── */}
                    <section className="md:hidden bg-slate-900 p-6 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAarM9rvcZuNUjB64IbhvJSaRIcHkZBylL2V3cgE7GKq_qA0Oz-VgadP72yxxGN38Ha02A4Oi2LUvB713pbWbUyB0P-Qvgx8E2DO2P4YvdS6Y5qF60ma_iUzeNQB3X_97Muy3EGc5wea1ijaI_RB-AlKAtPA_hmycjGnPBn6TnzDqzPb82JUiPWJpZGJ95ifbU6WfnddAa8tXc08Tx5CzuXfSa2e-HyjwEZx7FDX3nZIjWc4mgjRbYsREjSuS2ctJwI4dEVjAb6bj2v')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <div className="relative z-10">
                            <div className="flex justify-center gap-6 items-center">
                                <div>
                                    <p className="text-lg font-bold text-white">A+</p>
                                    <p className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Rating</p>
                                </div>
                                <div className="w-px h-6 bg-white/20" />
                                <div>
                                    <p className="text-lg font-bold text-white">24/7</p>
                                    <p className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Support</p>
                                </div>
                                <div className="w-px h-6 bg-white/20" />
                                <div>
                                    <p className="text-lg font-bold text-white">2M+</p>
                                    <p className="text-[8px] uppercase tracking-widest text-white/50 font-bold">Families</p>
                                </div>
                            </div>
                            <div className="mt-3 flex justify-center">
                                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[8px] font-bold text-white/80 uppercase tracking-wider">Secure Encryption Active</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
