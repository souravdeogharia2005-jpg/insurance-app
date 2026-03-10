import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function HomePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useApp();

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
            <main>
                {/* Hero Section */}
                <section className="relative pt-4 pb-20 lg:pt-8 lg:pb-32 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none overflow-hidden">
                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]"></div>
                        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]"></div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="flex flex-col gap-8 max-w-2xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    <span className="text-primary text-xs font-bold uppercase tracking-wider">AI-Powered Scanning Live</span>
                                </div>
                                <div className="flex flex-col gap-4 text-left">
                                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight text-left">
                                        Find the Best Insurance Policy with <span className="text-primary">Innovation</span>
                                    </h1>
                                    <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg text-left">
                                        Experience the future of Insurtech with AI-powered scanning that finds your perfect coverage in seconds. Compare thousands of policies instantly.
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                                    <div className="flex-1 relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                                        <input className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm" placeholder="Enter your email for a free scan" type="email" />
                                    </div>
                                    <button
                                        onClick={() => navigate(user ? '/scan' : '/login')}
                                        className="bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-primary/90 shadow-xl shadow-primary/30 flex items-center justify-center gap-2 whitespace-nowrap transition-all active:scale-95"
                                    >
                                        <span>Scan Now</span>
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                            <div className="relative group">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-transparent blur-3xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                                <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                    <img alt="Insurance protection" className="w-full h-full object-cover aspect-[4/3]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC778QwwLw_6c5Nw5xtAJOy8SCHFTTFl_zK-WCm7Mz1SZOWM-khMF1xKK_p6gmcv170naKi682B5QqXD656OKNJHXA4pG95pIEN71__AZL2pYUDMy_ns2vik8DK6D8RCEk62AcMIhMu7ZHLPXQz4AHtG69VY_-TbpOzSlrexy-2MqYIgbkDQcBVAGX7qSVsnAyxoq7SFFwJvDhUFj9rrynOEOjR_mBaVIRbStAOPwhR3zM2Ta3fPBEdl3-Ct8N6Lr2b87frSzEMSgQY" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                                    <div className="absolute bottom-6 left-6 right-6 p-5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-xl shadow-lg border border-white/30 dark:border-slate-800/30">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-green-500/20 text-green-600 rounded-full">
                                                <span className="material-symbols-outlined">check_circle</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Policy Match Found</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Optimization Score: 98%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trusted By Section */}
                <section className="py-12 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="max-w-7xl mx-auto px-4">
                        <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-10">Trusted by Industry Leaders</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center justify-items-center opacity-70 grayscale hover:grayscale-0 transition-all duration-500 dark:invert dark:brightness-150">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-3xl">shield_person</span>
                                <span className="text-xl font-bold text-slate-800">Guardian</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
                                <span className="text-xl font-bold text-slate-800">NexaSafe</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
                                <span className="text-xl font-bold text-slate-800">SwiftInsure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-3xl">public</span>
                                <span className="text-xl font-bold text-slate-800">OmniShield</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Cards Section */}
                <section className="py-24 bg-slate-50/50 dark:bg-background-dark/50 lg:py-32">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl mb-4 tracking-tight">The AegisAI Advantage</h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Revolutionizing the insurance landscape with state-of-the-art artificial intelligence designed for accuracy and speed.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            {[
                                { icon: 'timer', title: 'Instant Quotes', desc: 'Stop waiting for brokers. Our AI generates comprehensive quote comparisons in less than 30 seconds.' },
                                { icon: 'psychology', title: 'AI-Driven Accuracy', desc: 'Advanced neural networks analyze your risk profile to find the most accurate coverage for your specific needs.' },
                                { icon: 'support_agent', title: '24/7 Support', desc: 'Our smart agents are available around the clock to assist with claims, updates, and any policy questions.' }
                            ].map((f, i) => (
                                <div key={i} className="group bg-white dark:bg-slate-900 p-10 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <span className="material-symbols-outlined text-3xl">{f.icon}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{f.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="py-24 bg-white dark:bg-slate-900 lg:py-32">
                    <div className="max-w-7xl mx-auto px-4">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="lg:w-1/2 text-left">
                                <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-8 leading-tight tracking-tight">A Smarter Journey to Protection in 3 Easy Steps</h2>
                                <div className="space-y-10">
                                    {[
                                        { n: '1', title: 'Connect Your Profile', desc: 'Securely link your basic information. Our AI encrypts all data with military-grade security protocols.' },
                                        { n: '2', title: 'AI Scan & Compare', desc: 'AegisAI scans millions of data points across top-rated carriers to find hidden discounts and optimal terms.' },
                                        { n: '3', title: 'Select & Secure', desc: 'Pick the best plan and finalize your coverage digitally. No paperwork, no hassle, just peace of mind.' }
                                    ].map((s, i) => (
                                        <div key={i} className="flex gap-6">
                                            <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">{s.n}</div>
                                            <div>
                                                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{s.title}</h4>
                                                <p className="text-slate-600 dark:text-slate-400">{s.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-1/2 relative">
                                <div className="rounded-3xl overflow-hidden shadow-2xl">
                                    <img alt="Modern insurance selection" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfObuiBVCupaEHZ8gzW-XuHoYmeKR2JgRBl9eWEIDM5UgUKrterS_R32XbBd1fxb9ULcpqYk9G4yBYsziFNfBIHLSjPFbdv_6obVv5_cmeNXs04v1fn2e73dljQbVnYKWz0DmOy6ybD3iCBZF1oxv79y4MCQoAe4NiWmv5Ry-SkRbEqIBhG5Vqc0KxlBB6bK0BGu0jinTMQHil2VhP5i4qFLcgDK4Ovvjr-bvyHMrd_E9VteWSfFgdQCx7GMt4SOp-2AwB_-wsvJjd" />
                                </div>
                                <div className="absolute -bottom-8 -left-8 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 hidden md:block">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 text-primary rounded-full">
                                            <span className="material-symbols-outlined">verified</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xl font-bold text-slate-900 dark:text-white">100% Digital</p>
                                            <p className="text-sm text-slate-500">Zero physical paperwork required</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-20 px-4">
                    <div className="max-w-5xl mx-auto">
                        <div className="relative rounded-[2rem] bg-slate-900 p-8 md:p-16 overflow-hidden text-center text-white">
                            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary rounded-full blur-[120px] opacity-30"></div>
                            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-primary/40 rounded-full blur-[120px] opacity-20"></div>
                            <div className="relative z-10 flex flex-col items-center gap-8">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl leading-tight text-center">Ready for a Smarter Way to Insure?</h2>
                                <p className="text-slate-400 text-lg max-w-xl">Join over 500,000+ individuals and businesses who have optimized their coverage with AegisAI.</p>
                                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                    <button
                                        onClick={() => navigate(user ? '/proposal' : '/login')}
                                        className="bg-primary hover:bg-primary/90 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg shadow-primary/40 text-lg active:scale-95"
                                    >
                                        Get Started Now
                                    </button>
                                    <button
                                        onClick={() => navigate(user ? '/dashboard' : '/login')}
                                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold py-4 px-10 rounded-xl transition-all border border-white/20 text-lg"
                                    >
                                        Talk to an Expert
                                    </button>
                                </div>
                                <p className="text-slate-500 text-sm">No credit card required. Scan takes less than 60 seconds.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-slate-50 dark:bg-background-dark py-16 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 lg:gap-8 text-left">
                        <div className="col-span-2 lg:col-span-2 pr-8">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                                    <span className="material-symbols-outlined text-xl">shield_with_heart</span>
                                </div>
                                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">AegisAI</span>
                            </div>
                            <p className="text-slate-500 max-w-sm mb-8">
                                The next generation of insurance technology. Secure, fast, and driven by the world's most advanced AI risk assessment algorithms.
                            </p>
                            <div className="flex gap-4">
                                <a className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all" href="#">
                                    <span className="material-symbols-outlined text-xl">share</span>
                                </a>
                                <a className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all" href="#">
                                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-xs">Products</h5>
                            <ul className="space-y-4 text-sm text-slate-500 font-medium">
                                <li><a className="hover:text-primary" href="#">Life Insurance</a></li>
                                <li><a className="hover:text-primary" href="#">Health Care</a></li>
                                <li><a className="hover:text-primary" href="#">Auto Coverage</a></li>
                                <li><a className="hover:text-primary" href="#">Home Shield</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-xs">Company</h5>
                            <ul className="space-y-4 text-sm text-slate-500 font-medium">
                                <li><a className="hover:text-primary" href="#">About Us</a></li>
                                <li><a className="hover:text-primary" href="#">Careers</a></li>
                                <li><a className="hover:text-primary" href="#">Privacy Policy</a></li>
                                <li><a className="hover:text-primary" href="#">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-xs">Support</h5>
                            <ul className="space-y-4 text-sm text-slate-500 font-medium">
                                <li><a className="hover:text-primary" href="#">Help Center</a></li>
                                <li><a className="hover:text-primary" href="#">Documentation</a></li>
                                <li><a className="hover:text-primary" href="#">Claim Center</a></li>
                                <li><a className="hover:text-primary" href="#">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
