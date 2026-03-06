import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { languages } from '../i18n/translations';
import SplitText from '../components/SplitText';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const { t, language, setLanguage } = useApp();
    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setSuccessMsg(''); setLoading(true);
        try {
            if (isLogin) {
                await login(form.email, form.password);
                setSuccessMsg('Successfully signed in!');
                setTimeout(() => navigate('/dashboard'), 1000);
            } else {
                if (form.password !== form.confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
                if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
                await register(form.name, form.email, form.password);
                setSuccessMsg('Successfully registered and signed in!');
                setTimeout(() => navigate('/dashboard'), 1000);
            }
        } catch (err) { setError(err.message); }
        setLoading(false);
    };

    const handleForgotPass = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        if (!form.email) {
            setError('Please enter your email address first.');
        } else {
            setError('');
            setLoading(true);
            try {
                const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: form.email })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to send reset link');
                setSuccessMsg(data.message);
                // In a real app we'd hide the form or show instructions, here we just show the message
            } catch (err) {
                setError(err.message);
            }
            setLoading(false);
        }
    };

    const toggle = () => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); setForm({ name: '', email: '', password: '', confirmPassword: '' }); };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-background-dark">
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary/5 dark:bg-primary/10">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-white/60 dark:from-deep/60 via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBwtNe3f-rGQFzG0rhSx3j0XRiCTogEZa1Ilu-Iezx6xYD-jjQ4zW1j5GpBwVF_shKVktJtiVXeH-NNk1OJJQdYSekuNS3AhvGkzobqveKzbhCXCBGK55a7r-Lr5mvl38Ytss9laBvM0_nCCas7h5WE6lITIIvx4DLjgEIG7ILV-QaihU0ty5wVSWVPTyKrhs5ArLegrGHfeidfNf_4PIwZDmadhJbaLlr8f9zLahAO6Ev_dHzVCzcAEOjsas9WsvEkQhrOuGVMegQ')" }} />
                <div className="relative z-20 flex flex-col justify-end p-20 w-full">
                    <div className="flex items-center gap-3 mb-8 text-primary">
                        <span className="material-symbols-outlined text-4xl">shield_with_heart</span>
                        <h2 className="text-2xl font-bold tracking-tight text-deep dark:text-white">AegisAI</h2>
                    </div>
                    <SplitText text="Secure Your Family's Future Today" className="text-4xl font-black leading-tight text-deep dark:text-white" tag="h1" delay={40} duration={0.6} from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} />
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed mt-6">
                        Join over 2 million families who trust AegisAI for comprehensive protection and peace of mind.
                    </p>
                    <div className="mt-12 flex gap-4">
                        <div className="flex -space-x-3">
                            <img alt="" className="w-10 h-10 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnoKvNvt_rt0v-MhYU7z7bnfKoV4I1HaGxycig2pqZB8JnO_QuxNotfW3Gvkz56Ko6aUWE5cmyX53jlU_I7EgMFTUPuV6e1eQynBb0wraCTyer5yI0BSiuffG4f8N6x9FQHKCRZ2SMAV--_51lySjfE8VR1KIpolb08e2VFfmzSsLPk-po7khwlakA0uRTgnvXKqmuLzfECfEoxB_rmRzyYr31FpDfyV1v5WKgZvLY_mX1yF7K8HFy5CHO9l4Z2-TctV4Brpy3Q0Y" />
                            <img alt="" className="w-10 h-10 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdpnb3yQpRJL020JU2KK2QX3C65AZTQ7fks67Kirv0wHa2FhV3i9pFoyG6P7fJ8IidDBvgZZ3vwTPOT_t1saoViqBPXDbg2Xj_-319c-NCuWOS3OjXkshrUiYub5zYI5u4bBYgFpAaohGce4FDu4hGRFyGjLPlSK9UtxXOi-rWF9HSC8p2IRfLijrPQQfDAu0SSQqwSj-pCjoVn8_hn9yCd8fqQXfL3zOzUrcXPB_9Hiof3a2YRizwet3vHWQJ1J0cKinh8Vfssfo" />
                            <img alt="" className="w-10 h-10 rounded-full border-2 border-white" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAugO2_97fKh12KLvcD50BTCpS99TWIXwp_sszET0gPpkrYI3LP63flHhGT7Idw_RVDMmgFu9kV9FLu90KvOfUAMbVOv4c4j8WiUadKoxZKoq8k_YgYnmeryjCJYSDp0q5ESv0IScKTyfq4LPXRWUT1qBAfXl7pnGKnUonHzV91bUOYruXWSlORG3KzQ1sZMflMCYVzJY1ZrDGk777sCwaDQhTwqk_ZAkbRqzWNgqWp-6PGOcldJn2hOUdh9f7ouPOh2XbQ_SlkV-s" />
                        </div>
                        <div className="text-sm">
                            <p className="font-bold text-deep dark:text-white">4.9/5 Rating</p>
                            <p className="text-slate-500">From 10k+ customer reviews</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Form */}
            <div className="w-full lg:w-1/2 flex flex-col bg-white dark:bg-background-dark overflow-y-auto relative">

                {/* Language Selector */}
                <div className="absolute top-4 right-4 z-50">
                    <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                    </select>
                </div>
                {/* Mobile Carousel */}
                <div className="lg:hidden">
                    <div className="flex items-center p-4 pb-2 justify-between">
                        <div className="text-primary flex items-center justify-start">
                            <span className="material-symbols-outlined text-[32px]">shield_with_heart</span>
                        </div>
                        <h2 className="text-deep dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">AegisAI</h2>
                    </div>
                    <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex items-stretch p-4 gap-4">
                            {[
                                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDzIL_2yNQjNQZDXyw0r-Jm3cjytP5OEkCdPEmGFZXfBD1i7oM7h1mT469bA7kollPx42mTvy6Cfd7_4RfgrRCO6aC06VRgZW98FrwoloLM5sUHtcxDb6WkHEuMupUR0SF70rtF6qxHRYvPmcUfJXszfqx2_iaNYh1S1smedJAcwgYe0DnsJMJ-vvGBL4IkA2e5kDtPzmMKB2O9l_2MGNLWLGXP0jq5lmWC0GSXt6hC2eJoBdjA2Dzjq9cR7fD1yTWvz-bfaDvovHg", title: "Protect what matters", desc: "Tailored plans for your growing family" },
                                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9IodMOUGQM0V5vUH1OlaTyPjeYvLzukCc03U7FYrdgkRZ7DWOsATvdHX1QYh0RIrwDATR0vTlfH97b9dzf77unA0CQmJvA3PM0wxAbwBMZ6BT3i9w8MQ6064yPzNdvYqahZ8q83ryX2alYZRihOcE5xijFzath8O_1gKE_y1i7c79uh5motAKNUjDHNK_Gp_ulJXRuhcLpKm-mHDtywk7FQFZpb9nthcdQBGKevGCkrxWVIlRAaldAIZn5joayvrEhuG4PpM2EYI", title: "Security you can trust", desc: "Smart coverage for complete peace of mind" },
                                { img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_8RfN7SZVhLV490NiYidVugmw4Zucdpaj7faPmvMZ-PedvMwPaVA9z30CqvZ_aRcmoS31xMyA0eXUwJy6MeFps52RrNWr419EwFmWYhj3yVD0tkyAITl_SuYCVtZFc5vS0I4ibMpWd93T7V0TeYwrYW45IRuRwK3WoScX6qch9NEvydrOwwijhxrLY9zenPan1Oajmthc23TZcUlHD4DFMZAydto2c5G9Q6BYkhaFJdmEcrZ12ZHbZ8SRwDE6FB1yrYpolMPT_NQ", title: "Peace of mind 24/7", desc: "Our support team is always just one tap away" },
                            ].map((s, i) => (
                                <div key={i} className="flex h-full flex-1 flex-col gap-3 rounded-xl min-w-[280px]">
                                    <div className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-xl" style={{ backgroundImage: `url('${s.img}')` }} />
                                    <div><p className="text-deep dark:text-white text-base font-semibold">{s.title}</p><p className="text-slate-500 text-sm">{s.desc}</p></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24">
                    <div className="w-full max-w-md space-y-8">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-deep dark:text-white">{isLogin ? t('welcomeBack') : t('createAccount')}</h2>
                            <p className="text-slate-500">{isLogin ? 'Please enter your details to access your account.' : 'Create your AegisAI insurance account.'}</p>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                {!isLogin && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('fullName')}</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
                                            <input className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-deep dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                                placeholder="John Doe" type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('email')}</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                                        <input className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-deep dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                            placeholder="name@company.com" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('password')}</label>
                                        {isLogin && <button type="button" onClick={handleForgotPass} className="text-xs font-bold text-primary hover:underline">Forgot Password?</button>}
                                    </div>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                                        <input className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-deep dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                            placeholder="••••••••" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined">{showPass ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>
                                {!isLogin && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('confirmPassword')}</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                                            <input className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-deep dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                                placeholder="••••••••" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isLogin && (
                                <div className="flex items-center gap-2">
                                    <input className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary" id="remember" type="checkbox" />
                                    <label className="text-sm text-slate-500" htmlFor="remember">Remember me for 30 days</label>
                                </div>
                            )}
                            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-3 rounded-lg flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">error</span> {error}</div>}
                            {successMsg && <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-3 rounded-lg flex items-start gap-2"><span className="material-symbols-outlined text-sm mt-0.5">check_circle</span> {successMsg}</div>}
                            <button type="submit" disabled={loading} className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-outlined">{isLogin ? 'login' : 'person_add'}</span>{isLogin ? t('signIn') : t('signUp')}</>}
                            </button>

                        </form>
                        <p className="text-slate-500">
                            {isLogin ? t('noAccount') : t('hasAccount')}{' '}
                            <button onClick={toggle} className="text-primary font-bold hover:underline">{isLogin ? t('signUp') : t('signIn')}</button>
                        </p>
                        <div className="pt-8 flex justify-center gap-6 text-xs text-slate-400 font-medium uppercase tracking-widest">
                            <a className="hover:text-primary transition-colors" href="#">Help Center</a>
                            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
