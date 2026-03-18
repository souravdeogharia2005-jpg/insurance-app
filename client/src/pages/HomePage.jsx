import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function HomePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useApp();

    return (
        <div className="bg-[#F8FAFC] text-slate-900 antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
            <main>
                {/* Hero Section */}
                <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-40 overflow-hidden">
                    {/* Abstract Decorative Elements */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[140px] opacity-60"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[120px] opacity-40"></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-20 items-center">
                            <div className="flex flex-col gap-10 max-w-2xl">
                                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white border border-slate-100 shadow-sm w-fit transition-transform hover:scale-105 duration-300">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                    </span>
                                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">Aegis Quantum v4.2 Live</span>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 leading-[0.95] tracking-tighter">
                                        Asset <span className="text-blue-600">Protection</span> Reimagined.
                                    </h1>
                                    <p className="text-lg md:text-xl text-slate-400 font-bold leading-relaxed max-w-lg">
                                        The autonomous underwriting engine for the next generation. Secure, instantaneous, and radically transparent.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                                    <div className="flex-1 relative group">
                                        <div className="absolute inset-0 bg-blue-600/5 blur-xl group-focus-within:opacity-100 opacity-0 transition-opacity" />
                                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">mail</span>
                                        <input className="w-full pl-14 pr-6 py-5 rounded-[28px] border border-slate-100 bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all shadow-sm font-bold text-slate-900 placeholder:text-slate-300" placeholder="Initialize with email..." type="email" />
                                    </div>
                                    <button
                                        onClick={() => navigate(user ? '/scan' : '/login')}
                                        className="bg-slate-900 text-white px-10 py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-black shadow-2xl shadow-slate-900/10 flex items-center justify-center gap-3 whitespace-nowrap transition-all active:scale-95 group"
                                    >
                                        <span>Deploy Scan</span>
                                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            <div className="relative group perspective-1000">
                                <div className="absolute -inset-10 bg-blue-600/5 rounded-full blur-[100px] group-hover:bg-blue-600/10 transition-colors duration-1000" />
                                <div className="relative bg-white rounded-[48px] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-50 transform transition-all duration-700 hover:scale-[1.02] hover:-rotate-1">
                                    <img alt="Insurance protection" className="w-full h-full object-cover aspect-[5/4] scale-110 group-hover:scale-100 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC778QwwLw_6c5Nw5xtAJOy8SCHFTTFl_zK-WCm7Mz1SZOWM-khMF1xKK_p6gmcv170naKi682B5QqXD656OKNJHXA4pG95pIEN71__AZL2pYUDMy_ns2vik8DK6D8RCEk62AcMIhMu7ZHLPXQz4AHtG69VY_-TbpOzSlrexy-2MqYIgbkDQcBVAGX7qSVsnAyxoq7SFFwJvDhUFj9rrynOEOjR_mBaVIRbStAOPwhR3zM2Ta3fPBEdl3-Ct8N6Lr2b87frSzEMSgQY" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                    <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-700">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                <span className="material-symbols-outlined text-3xl">verified_user</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">REAL-TIME VALIDATION</p>
                                                <p className="text-xl font-black text-slate-900 tracking-tight">System Integrity: 99.98%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Partners Section */}
                <section className="py-20 border-y border-slate-50 bg-white/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-12">Institutional Grade Infrastructure</p>
                        <div className="flex flex-wrap justify-center gap-12 lg:gap-24 opacity-30 hover:opacity-100 transition-opacity duration-700 grayscale">
                            {['Guardian', 'NexaSafe', 'SwiftInsure', 'OmniShield'].map((p, i) => (
                                <div key={i} className="flex items-center gap-2 group cursor-none">
                                    <span className="material-symbols-outlined text-slate-900 text-4xl group-hover:text-blue-600 transition-colors">shield</span>
                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{p}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-32 lg:py-48 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50/30 rounded-full blur-[160px] -z-10" />
                    
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-24 space-y-4">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Core Competencies</p>
                            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">Engineered for Radical Speed.</h2>
                            <p className="text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed text-lg">Weaponizing data to eliminate friction in the insurance ecosystem.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-10">
                            {[
                                { icon: 'bolt', title: 'Sub-30s Processing', desc: 'Neural networks iterate through carrier rulesets with surgical precision, delivering results instantly.' },
                                { icon: 'auto_graph', title: 'Dynamic Factoring', desc: 'Multi-dimensional risk assessment that adapts to your life metrics in real-time.' },
                                { icon: 'security', title: 'Hardened Security', desc: 'End-to-end asymmetric encryption ensuring your data profile remains impenetrable.' }
                            ].map((f, i) => (
                                <div key={i} className="group bg-white p-12 rounded-[48px] border border-slate-50 shadow-sm hover:shadow-2xl hover:-translate-y-4 transition-all duration-500">
                                    <div className="w-20 h-20 bg-slate-50 text-slate-900 rounded-3xl flex items-center justify-center mb-10 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 rotate-3 group-hover:rotate-0">
                                        <span className="material-symbols-outlined text-4xl">{f.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{f.title}</h3>
                                    <p className="text-slate-400 font-bold leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Workflow */}
                <section className="py-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="relative rounded-[64px] bg-slate-900 p-12 md:p-24 overflow-hidden text-center text-white">
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[200px] opacity-20 -mr-64 -mt-64" />
                            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[160px] opacity-10 -ml-40 -mb-40" />
                            
                            <div className="relative z-10 flex flex-col items-center gap-12">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Final Protocol</p>
                                    <h2 className="text-4xl md:text-7xl font-black tracking-tighter max-w-3xl leading-[1] text-center">Ready to Secure Your Future?</h2>
                                    <p className="text-slate-400 text-lg font-bold max-w-xl mx-auto">Initialize the Aegis engine and discover your optimized coverage architecture today.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-6 w-full justify-center scale-110">
                                    <button
                                        onClick={() => navigate(user ? '/proposal' : '/login')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-6 px-12 rounded-3xl transition-all shadow-2xl shadow-blue-600/20 text-xs uppercase tracking-[0.2em] active:scale-95"
                                    >
                                        Execute Launch
                                    </button>
                                    <button
                                        onClick={() => navigate(user ? '/dashboard' : '/login')}
                                        className="bg-white/5 hover:bg-white/10 backdrop-blur-3xl text-white font-black py-6 px-12 rounded-3xl transition-all border border-white/10 text-xs uppercase tracking-[0.2em]"
                                    >
                                        Access Dashboard
                                    </button>
                                </div>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">System encrypted • Zero latency • Global coverage</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Premium Footer */}
            <footer className="bg-white py-24 border-t border-slate-50 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 opacity-50" />
                
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-16 lg:gap-8">
                        <div className="col-span-2 lg:col-span-2 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                    <span className="material-symbols-outlined text-2xl font-black">shield_with_heart</span>
                                </div>
                                <span className="text-3xl font-black tracking-tighter text-slate-900">AegisAI™</span>
                            </div>
                            <p className="text-slate-400 font-bold max-w-sm leading-relaxed">
                                Defining the new standard in autonomous underwriting. Decrypting risk, protecting assets, and securing the future of the global digital economy.
                            </p>
                            <div className="flex gap-4">
                                {[1, 2, 3].map(i => (
                                    <a key={i} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-300 shadow-sm" href="#">
                                        <span className="material-symbols-outlined text-xl">hub</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                        {['Protocol', 'Intelligence', 'Company'].map((title, i) => (
                            <div key={i}>
                                <h5 className="font-black text-slate-900 mb-10 uppercase tracking-[0.25em] text-[10px]">{title}</h5>
                                <ul className="space-y-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                                    {['Modular Core', 'Risk Analysis', 'Global Compliance', 'Terms of Use'].map((link, j) => (
                                        <li key={j}><a className="hover:text-blue-600 transition-colors" href="#">{link}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-24 pt-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">© 2026 Aegis Global Systems Inc. All Rights Reserved.</p>
                        <div className="flex gap-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                            <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
                            <a href="#" className="hover:text-slate-900 transition-colors">Legal</a>
                            <a href="#" className="hover:text-slate-900 transition-colors">Status</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
