import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { languages, currencies } from '../i18n/translations';
import { useState } from 'react';
import { changePassword, updateProfile } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, LogOut, X, Moon, Sun, Globe, CreditCard, Key, ChevronRight, Home, LayoutDashboard, FileText, Scan, ShieldAlert, User } from 'lucide-react';

const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/proposal', icon: FileText, label: 'New Proposal' },
    { to: '/scan', icon: Scan, label: 'Scan' },
    { to: '/admin', icon: ShieldAlert, label: 'Admin' },
];

const mobileLinks = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/proposal', icon: FileText, label: 'Proposal' },
    { to: '/scan', icon: Scan, label: 'Scan' },
    { to: '/admin', icon: ShieldAlert, label: 'Admin' },
];

export default function Navbar() {
    const { user, logout, updateUser } = useAuth();
    const { theme, toggleTheme, currency, setCurrency, language, setLanguage, t } = useApp();
    const [showSettings, setShowSettings] = useState(false);
    const [showUser, setShowUser] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) return setPassMessage({ type: 'error', text: 'Passwords do not match' });
        setPassLoading(true);
        try {
            await changePassword(passwords.current, passwords.new);
            setPassMessage({ type: 'success', text: 'Password updated!' });
            setTimeout(() => setShowPasswordModal(false), 2000);
        } catch (error) { setPassMessage({ type: 'error', text: error.message }); }
        finally { setPassLoading(false); }
    };

    return (
        <>
            {/* ===== Desktop / Tablet Top Navbar ===== */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 md:px-6 pointer-events-none">
                <nav className="max-w-7xl mx-auto pointer-events-auto h-16 flex items-center justify-between px-5 rounded-2xl shadow-lg"
                    style={{
                        background: theme === 'dark' ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
                        border: theme === 'dark' ? '1.5px solid #1E3A8A' : '1.5px solid #BFDBFE',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                    }}>

                    {/* Brand */}
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <span className="text-lg font-black tracking-tight" style={{ color: theme === 'dark' ? '#93C5FD' : '#1E3A8A' }}>AegisAI</span>
                            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#22C55E', lineHeight: 1, marginTop: -1 }}>Insurance Platform</div>
                        </div>
                    </div>

                    {/* Desktop Nav Links */}
                    <div className="hidden lg:flex items-center gap-1">
                        {links.map(l => (
                            <NavLink key={l.to} to={l.to}
                                className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isActive
                                    ? 'text-white shadow-md'
                                    : 'hover:bg-blue-50 dark:hover:bg-blue-950'
                                    }`}
                                style={({ isActive }) => isActive ? {
                                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                                    color: 'white',
                                } : {
                                    color: theme === 'dark' ? '#94A3B8' : '#475569',
                                }}>
                                <l.icon size={15} />
                                {l.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Settings button  */}
                        <button onClick={() => setShowSettings(true)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                            style={{
                                background: theme === 'dark' ? 'rgba(30,58,138,.2)' : '#EFF6FF',
                                color: '#2563EB',
                                border: '1.5px solid #BFDBFE',
                            }}>
                            <Settings size={18} />
                        </button>

                        {/* User Avatar */}
                        {user ? (
                            <div className="relative">
                                <button onClick={() => setShowUser(!showUser)}
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md transition-all"
                                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
                                    {user.name?.[0]?.toUpperCase()}
                                </button>
                                <AnimatePresence>
                                    {showUser && (
                                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl p-4 origin-top-right"
                                            style={{ background: theme === 'dark' ? '#0F172A' : 'white', border: '1.5px solid #BFDBFE' }}
                                            onClick={e => e.stopPropagation()}>
                                            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #BFDBFE' }}>
                                                <p className="font-black text-sm" style={{ color: theme === 'dark' ? '#93C5FD' : '#1E3A8A' }}>{user.name}</p>
                                                <p className="text-xs" style={{ color: '#64748B' }}>{user.email}</p>
                                            </div>
                                            <button onClick={() => { setShowPasswordModal(true); setShowUser(false); }}
                                                className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition-all"
                                                style={{ color: theme === 'dark' ? '#94A3B8' : '#475569' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <div className="flex items-center gap-2"><Key size={16} /> Change Password</div>
                                                <ChevronRight size={14} />
                                            </button>
                                            <button onClick={handleLogout}
                                                className="w-full flex items-center gap-2 p-3 mt-2 rounded-xl text-sm font-semibold transition-all"
                                                style={{ color: '#EF4444' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <LogOut size={16} /> Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <button onClick={() => navigate('/login')}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                                Sign In
                            </button>
                        )}
                    </div>
                </nav>
            </header>

            {/* ===== Mobile Bottom Navigation (YouTube-style) ===== */}
            <nav className="mobile-bottom-nav lg:hidden">
                {mobileLinks.map(l => (
                    <NavLink key={l.to} to={l.to}
                        className={({ isActive }) => `${isActive ? 'active' : ''}`}>
                        {({ isActive }) => (
                            <>
                                <l.icon size={22} strokeWidth={isActive ? 2.5 : 1.8}
                                    style={{ color: isActive ? '#2563EB' : '#94A3B8', transition: 'color .2s' }} />
                                <span style={{ color: isActive ? '#2563EB' : '#94A3B8' }}>{l.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* ===== Settings Overlay ===== */}
            <AnimatePresence>
                {showSettings && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowSettings(false)}
                            className="absolute inset-0"
                            style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative z-10"
                            style={{ background: theme === 'dark' ? '#0F172A' : 'white', border: '1.5px solid #BFDBFE' }}>
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black" style={{ color: theme === 'dark' ? '#93C5FD' : '#1E3A8A' }}>Settings</h3>
                                <button onClick={() => setShowSettings(false)}
                                    className="p-2 rounded-full transition-all"
                                    style={{ background: '#EFF6FF', color: '#2563EB' }}>
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#22C55E' }}>Appearance</h4>
                                    <button onClick={toggleTheme}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
                                        style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE' }}>
                                        <div className="flex items-center gap-3 font-semibold text-sm" style={{ color: '#1E3A8A' }}>
                                            {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                                        </div>
                                        <div className={`w-11 h-6 rounded-full relative transition-all`}
                                            style={{ background: theme === 'dark' ? '#2563EB' : '#CBD5E1' }}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow`}
                                                style={{ left: theme === 'dark' ? '26px' : '4px' }} />
                                        </div>
                                    </button>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#22C55E' }}>Localization</h4>
                                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                                        <div>
                                            <div className="flex items-center gap-1 mb-2" style={{ color: '#64748B' }}><Globe size={13} /> Language</div>
                                            <select value={language} onChange={e => setLanguage(e.target.value)}
                                                className="w-full p-3 rounded-xl text-sm outline-none"
                                                style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>
                                                {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1 mb-2" style={{ color: '#64748B' }}><CreditCard size={13} /> Currency</div>
                                            <select value={currency} onChange={e => setCurrency(e.target.value)}
                                                className="w-full p-3 rounded-xl text-sm outline-none"
                                                style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>
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

            {/* ===== Password Modal ===== */}
            <AnimatePresence>
                {showPasswordModal && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowPasswordModal(false)}
                            className="absolute inset-0"
                            style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative z-10"
                            style={{ background: theme === 'dark' ? '#0F172A' : 'white', border: '1.5px solid #BFDBFE' }}>
                            <h3 className="text-xl font-black mb-1" style={{ color: theme === 'dark' ? '#93C5FD' : '#1E3A8A' }}>Change Password</h3>
                            <p className="text-sm mb-6" style={{ color: '#64748B' }}>Update your account password securely.</p>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                {['current', 'new', 'confirm'].map((field) => (
                                    <input key={field} type="password"
                                        placeholder={field.charAt(0).toUpperCase() + field.slice(1) + ' Password'}
                                        className="w-full p-4 rounded-xl text-sm outline-none transition-all"
                                        style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A' }}
                                        value={passwords[field]}
                                        onChange={e => setPasswords({ ...passwords, [field]: e.target.value })}
                                        onFocus={e => e.target.style.borderColor = '#2563EB'}
                                        onBlur={e => e.target.style.borderColor = '#BFDBFE'} />
                                ))}
                                {passMessage.text && (
                                    <p className={`text-xs font-bold text-center ${passMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                        {passMessage.text}
                                    </p>
                                )}
                                <button type="submit" disabled={passLoading}
                                    className="w-full py-4 rounded-xl font-black text-sm text-white transition-all active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 14px rgba(37,99,235,.3)' }}>
                                    {passLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Click outside to close user menu */}
            {showUser && (
                <div className="fixed inset-0 z-[99]" onClick={() => setShowUser(false)} />
            )}
        </>
    );
}
