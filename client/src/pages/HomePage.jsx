import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import SplitText from '../components/SplitText';
import RotatingText from '../components/RotatingText';

export default function HomePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useApp();

    return (
        <div className="relative flex flex-col overflow-x-hidden bg-background-light dark:bg-background-dark transition-colors duration-300 pb-20 md:pb-0">
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden px-6 pt-12 pb-24 lg:pt-20 lg:pb-32 flex flex-col items-center text-center">
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col items-center gap-8 max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 dark:bg-primary/20 px-4 py-1.5 text-primary">
                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">{t('nextGenInsurance')}</span>
                        </div>

                        <div className="space-y-4">
                            <SplitText text={t('findBestInsurance')} className="text-4xl sm:text-5xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl text-deep dark:text-white" tag="h1" delay={30} duration={0.6} from={{ opacity: 0, y: 40 }} to={{ opacity: 1, y: 0 }} />
                            <h2 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
                                <span className="text-primary">{t('policyWith')}</span>
                                <RotatingText words={['AI', 'Trust', 'AegisAI', 'Innovation']} interval={2500} className="text-secondary underline decoration-secondary/30" />
                            </h2>
                        </div>

                        <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
                            {t('aegisDesc')}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center sm:w-auto">
                            <button onClick={() => navigate(user ? '/scan' : '/login')} className="flex items-center justify-center gap-2 bg-primary text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-primary/20 w-full sm:w-auto">
                                <span className="material-symbols-outlined">document_scanner</span>
                                {t('scanDoc')}
                            </button>
                            <button onClick={() => navigate(user ? '/proposal' : '/login')} className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm w-full sm:w-auto">
                                <span className="material-symbols-outlined">edit_note</span>
                                {t('fillForm')}
                            </button>
                        </div>

                        <div className="mt-6 flex items-center justify-center gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                            <div className="flex -space-x-2">
                                <img className="h-8 w-8 rounded-full border-2 border-white dark:border-deep shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCe75rp62s722_9Hp8s36-oX9Lzb3XOcwDok4YOBOIxJ2r6MhZQCvgx4a9p-YSoQk9S73NgJob-F1u1ncu28Iueo7da_RV4YQ9-EEfGY2Jz_LmGX0b754fDvQ35CCPh-QiUYEquhYQ93MoK2VY3WnYIsJ0-PWUNRuiar1rrBEPs_xvjahdDcM2Le0UvihbTGboap4eLDPfjuarrkUKTQ5j3B80Hdj1zPIMDFmh_icXjUc13UR5RPA_Glye9RplpsrkFLuxPZpuINc1A" alt="" />
                                <img className="h-8 w-8 rounded-full border-2 border-white dark:border-deep shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuZzVc7NtAEa_pcEVuO-97EfP6TPFbrTn3AvhWMp8YbJku_f8gRV-7EIMkDybP9X9nrVwdKZqPbgG7GgeKohIwSsZ_dGuf9q1_Ozw-UwLM5K-njjfLrXyCFFPjfmw1ZzZGhWunzVXwEAX4APoO3XtByerwxob3pV-YUJOaERoB4fKi56CWNjkJ5T9cx0yjYZFnEuDQw91PgEJ5y2sP-z3eaKGDFwzVj21NFiyZ0bCTOawEkRmkOIORik8JdCE8XR38N11U6jzhdrI" alt="" />
                                <img className="h-8 w-8 rounded-full border-2 border-white dark:border-deep shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvQmVwcpnJNeZ-fMjMNgAYphH5aS9vN8O7TArlU-NL889nuC-wVVnhnMrFUZraGQkHfRuPTgGAq5AfCYzwmODCq-wmAxU70z9izE4hwcTu1r8gdfbRW1-wcpwZ8jWogo5QTIm2_MPpwKQQl3pxtMkujnTDjZF9zRRFo4sz5M1xFdoPKCx0x1V-46ejIv-p41JS1z3LFDRpUfioIxXOqnfQ3IKFq3a3bK33xCWY3f3LNdTLjRlsgtplodgXqZShhNvbGm845tLI8QQ" alt="" />
                            </div>
                            <p>{t('trustedBy')}</p>
                        </div>
                    </div>

                    <div className="relative mt-16 lg:mt-24 w-full max-w-5xl mx-auto px-4 sm:px-6">
                        <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-tr from-primary/20 via-secondary/15 to-transparent blur-3xl opacity-50 dark:opacity-30" />
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                            <img className="w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRuwoDtw8igcuqOXn-qGUqr2EjYPolJUXKU03txvSQolTxiUtcZqjrNUhlCDIcxxuYsuKA8_Rypl_pQsVS53KIuPDzE0VKZPSWYGDLftnGPbAnCATMg1Z2ywUKHfCu3_GEpOG5q6Eg7BgVLB6LGwqktNhFiVOYjUMaUvVamVMvmt_1DVmFXzlD1OQnEvWSNUr-KcaBQ1YeS1SF-eASlWi4olb6Gfif0g2UAHcd1oZ7Y0JhFMPhdRe2oPFMXA96bez6VbN9bwnMHWM" alt="AI Dashboard" />
                            <div className="absolute inset-0 bg-gradient-to-t from-deep/50 via-deep/10 to-transparent pointer-events-none" />
                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pointer-events-none">
                                <div className="bg-white/95 dark:bg-deep/90 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-white/20 shadow-xl pointer-events-auto">
                                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Live Savings</p>
                                    <p className="text-xl sm:text-3xl font-black text-primary">₹2,45,000</p>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 bg-accent text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-accent/20 pointer-events-auto">
                                    <span className="material-symbols-outlined text-sm sm:text-base">trending_up</span>+12.4% Optimal
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Why Choose */}
                <section id="solutions" className="py-20 bg-slate-50 dark:bg-deep/50">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="mb-16 text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-deep dark:text-white sm:text-4xl">{t('whyChoose')}</h2>
                            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{t('whyDesc')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { icon: 'bolt', title: t('instantQuotes'), desc: t('instantDesc'), color: 'bg-primary' },
                                { icon: 'target', title: t('aiAccuracy'), desc: t('aiDesc'), color: 'bg-secondary' },
                                { icon: 'payments', title: t('support247'), desc: t('supportDesc'), color: 'bg-accent' },
                            ].map((c, i) => (
                                <div key={i} className="group relative bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                                    <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${c.color} text-white transition-transform group-hover:rotate-12`}>
                                        <span className="material-symbols-outlined">{c.icon}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-deep dark:text-white mb-3">{c.title}</h3>
                                    <p className="text-slate-600 dark:text-slate-400">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How it Works */}
                <section id="how" className="py-20 overflow-hidden">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="flex flex-col lg:flex-row gap-16 items-center">
                            <div className="flex-1 order-2 lg:order-1">
                                <h2 className="text-3xl font-bold tracking-tight text-deep dark:text-white sm:text-4xl mb-12">The Insurance Process, Simplified</h2>
                                <div className="space-y-8">
                                    {[
                                        { n: '1', title: 'Upload Data', desc: 'Simply drag and drop your existing documents or connect your current provider.', color: 'bg-primary/10 text-primary' },
                                        { n: '2', title: 'AI Matching', desc: 'Our engine scans thousands of plans to find the needle in the haystack.', color: 'bg-secondary/10 text-secondary' },
                                        { n: '3', title: 'Secure Enrollment', desc: 'Finalize your new policy with one click and instant digital signing.', color: 'bg-accent/10 text-accent' },
                                    ].map((s, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.color} font-bold`}>{s.n}</div>
                                            <div><h4 className="font-bold text-deep dark:text-white">{s.title}</h4><p className="text-slate-600 dark:text-slate-400">{s.desc}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 order-1 lg:order-2">
                                <div className="relative rounded-3xl overflow-hidden">
                                    <img className="w-full h-auto object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGoM6-mov8uq92Jl2q1AzHHaliqpepnkWt_8d8vgU2CTPJsMLHCxI9vlDTcpOAcbyWoaZn6VagxcDfds2GmqAKBwryas3feovPFe9fcF8wV5Lu3W8pyQZyWuFkXLH33QzscuKhsXd59XumvPtvlqlMnuuaAcapr878VABnrzzfnrz4mepZjbpswPu-dxjm-OS0taFagabxxEc4U0Z2hb4ZQo2RHKTx1b87fJjO_DW5pL3ddbkBgPcGmN0ABi6ohRBNGvpIUcj3EDc" alt="Smart Tech" />
                                    <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 bg-gradient-to-r from-primary to-secondary text-white">
                    <div className="mx-auto max-w-5xl px-6 text-center">
                        <h2 className="text-3xl font-bold mb-6 sm:text-5xl">Ready for a Smarter Way to Insure?</h2>
                        <p className="text-white/70 text-lg mb-10 max-w-2xl mx-auto">Join thousands of people who have simplified their insurance and saved thousands annually.</p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button onClick={() => navigate(user ? '/proposal' : '/login')} className="bg-white text-primary px-10 py-4 rounded-xl font-bold hover:bg-slate-100 transition-all text-lg shadow-2xl">
                                Start Your Free Analysis
                            </button>
                            <button onClick={() => navigate(user ? '/dashboard' : '/login')} className="bg-white/10 backdrop-blur border border-white/20 text-white px-10 py-4 rounded-xl font-bold hover:bg-white/20 transition-all text-lg">
                                Schedule a Demo
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark py-12 px-6">
                <div className="mx-auto max-w-7xl grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                                <span className="material-symbols-outlined text-lg">shield_with_heart</span>
                            </div>
                            <span className="text-lg font-bold tracking-tight text-deep dark:text-white">AegisAI</span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-xs">Revolutionizing insurance through artificial intelligence and user-centric design.</p>
                    </div>
                    <div>
                        <h5 className="font-bold mb-4 text-deep dark:text-white">Product</h5>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><a className="hover:text-primary transition-colors" href="#">Features</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Integrations</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Pricing</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Security</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold mb-4 text-deep dark:text-white">Company</h5>
                        <ul className="space-y-2 text-sm text-slate-500">
                            <li><a className="hover:text-primary transition-colors" href="#">About Us</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Careers</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Blog</a></li>
                            <li><a className="hover:text-primary transition-colors" href="#">Press</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold mb-4 text-deep dark:text-white">Social</h5>
                        <div className="flex gap-4">
                            <a className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">public</span></a>
                            <a className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">alternate_email</span></a>
                        </div>
                    </div>
                </div>
                <div className="mx-auto max-w-7xl mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-400 uppercase tracking-widest font-bold">
                    <p>© 2026 AegisAI Technologies Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                        <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
