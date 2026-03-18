import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { languages, currencies } from '../i18n/translations';
import { useState } from 'react';
import { changePassword, updateProfile, deleteAccount } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, User, LogOut, Menu, X, Moon, Sun, Globe, CreditCard, Key, Trash2, ChevronRight, Home, LayoutDashboard, FileText, Scan, ShieldAlert } from 'lucide-react';

export default function Navbar() {
    const { user, logout, updateUser } = useAuth();
    const { theme, toggleTheme, currency, setCurrency, language, setLanguage, t } = useApp();
    const [showSettings, setShowSettings] = useState(false);
    const [showUser, setShowUser] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });
    const [editNameValue, setEditNameValue] = useState(user?.name || '');
    const [nameLoading, setNameLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    const handleUpdateName = async () => {
        if (!editNameValue.trim() || editNameValue === user.name) return;
        setNameLoading(true);
        try {
            const data = await updateProfile(editNameValue);
            updateUser(data.user);
        } catch (err) { console.error(err); }
        finally { setNameLoading(false); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return setPassMessage({ type: 'error', text: 'Passwords mismatch' });
        setPassLoading(true);
        try {
            await changePassword(passwords.current, passwords.new);
            setPassMessage({ type: 'success', text: 'Updated!' });
            setTimeout(() => setShowPasswordModal(false), 2000);
        } catch (error) { setPassMessage({ type: 'error', text: error.message }); }
        finally { setPassLoading(false); }
    };

    const links = [
        { to: '/', icon: Home, label: t('home') },
        { to: '/dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { to: '/proposal', icon: FileText, label: t('newProposal') },
        { to: '/scan', icon: Scan, label: t('scan') },
        { to: '/admin', icon: ShieldAlert, label: t('admin') },
    ];

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-4 md:px-8 pointer-events-none">
                <nav className="max-w-7xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-2xl pointer-events-auto h-16 md:h-20 flex items-center justify-between px-6">

                    {/* Brand */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <Shield size={22} />
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">AegisAI</span>
                    </div>

                    {/* Nav Links (Desktop) */}
                    <div className="hidden lg:flex items-center gap-1">
                        {links.map(l => (
                            <NavLink key={l.to} to={l.to} className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                <l.icon size={16} />
                                {l.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowSettings(!showSettings)} className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary'}`}><Settings size={20} /></button>

                        {user ? (
                            <div className="relative">
                                <button onClick={() => setShowUser(!showUser)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-primary transition-all">
                                    <div className="font-black text-xs text-primary">{user.name?.[0].toUpperCase()}</div>
                                </button>

                                <AnimatePresence>
                                    {showUser && (
                                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 origin-top-right">
                                            <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                                <p className="font-black text-slate-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                            <button onClick={() => { setShowPasswordModal(true); setShowUser(false); }} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 transition-all">
                                                <div className="flex items-center gap-2"><Key size={16} /> Change Pass</div>
                                                <ChevronRight size={14} />
                                            </button>
                                            <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 mt-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-sm font-bold transition-all">
                                                <LogOut size={16} /> {t('logout')}
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button onClick={() => navigate('/login')} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Sign In</button>
                        )}
                    </div>
                </nav>
            </header>

            {/* Settings Overlay */}
            <AnimatePresence>
                {showSettings && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Settings</h3>
                                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X size={20} /></button>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Appearance</h4>
                                    <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                                        <div className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-300">
                                            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                                        </div>
                                        <div className={`w-10 h-5 rounded-full relative transition-all ${theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Localization</h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2 text-slate-500"><Globe size={14} /> Language</div>
                                            <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none">
                                                {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 mb-2 text-slate-500"><CreditCard size={14} /> Currency</div>
                                            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-primary outline-none">
                                                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* Modal Components */}
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Security Key Update</h3>
                            <p className="text-slate-500 text-sm mb-8">Update your vault passkey regularly.</p>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <input type="password" placeholder="Current" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />
                                <input type="password" placeholder="New" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} />
                                <input type="password" placeholder="Confirm" className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
                                {passMessage.text && <p className={`text-xs font-bold text-center ${passMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{passMessage.text}</p>}
                                <button type="submit" disabled={passLoading} className="w-full bg-primary text-white py-4 rounded-xl font-black shadow-lg shadow-primary/20 active:scale-95 transition-all">
                                    {passLoading ? 'Syncing...' : 'Update passkey'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
