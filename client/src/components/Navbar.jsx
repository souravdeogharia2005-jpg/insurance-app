import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { languages, currencies } from '../i18n/translations';
import { useState } from 'react';
import { changePassword, updateProfile, deleteAccount } from '../utils/api';

export default function Navbar() {
    const { user, logout, updateUser } = useAuth();
    const { theme, toggleTheme, currency, setCurrency, language, setLanguage, t } = useApp();
    const [showSettings, setShowSettings] = useState(false);
    const [showUser, setShowUser] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);
    const [passMessage, setPassMessage] = useState({ type: '', text: '' });

    // Profile Edit States
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [nameLoading, setNameLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/login'); };

    const handleUpdateName = async () => {
        if (!editNameValue.trim() || editNameValue === user.name) return setIsEditingName(false);
        setNameLoading(true);
        try {
            const data = await updateProfile(editNameValue);
            updateUser(data.user);
            setIsEditingName(false);
        } catch (err) {
            console.error(err);
        } finally {
            setNameLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) return;
        setDeleteLoading(true);
        try {
            await deleteAccount();
            logout();
            navigate('/login');
        } catch (err) {
            console.error(err);
            setDeleteLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPassMessage({ type: '', text: '' });
        if (passwords.new !== passwords.confirm) {
            return setPassMessage({ type: 'error', text: 'New passwords do not match' });
        }
        if (passwords.new.length < 6) {
            return setPassMessage({ type: 'error', text: 'New password must be at least 6 characters' });
        }

        setPassLoading(true);
        try {
            await changePassword(passwords.current, passwords.new);
            setPassMessage({ type: 'success', text: 'Password changed successfully!' });
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswords({ current: '', new: '', confirm: '' });
                setPassMessage({ type: '', text: '' });
            }, 2000);
        } catch (error) {
            setPassMessage({ type: 'error', text: error.message || 'Failed to change password' });
        } finally {
            setPassLoading(false);
        }
    };

    const links = [
        { to: '/', icon: 'home', label: t('home') },
        { to: '/dashboard', icon: 'grid_view', label: t('dashboard') },
        { to: '/proposal', icon: 'add_moderator', label: t('newProposal') },
        { to: '/scan', icon: 'document_scanner', label: t('scan') },
        { to: '/admin', icon: 'admin_panel_settings', label: t('admin') },
    ];

    return (
        <>
            {/* Desktop Navbar */}
            <header className="hidden md:grid grid-cols-3 fixed w-full top-0 left-0 right-0 z-[100] items-center bg-white/95 backdrop-blur-sm dark:bg-slate-900/95 shadow-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 lg:px-20 transition-colors">
                {/* Left: Logo */}
                <div className="flex items-center gap-3 cursor-pointer justify-self-start" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-lg">
                        <span className="material-symbols-outlined text-lg">shield_with_heart</span>
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-tight text-deep dark:text-white">AegisAI</h2>
                </div>

                {/* Center: Navigation Links */}
                <nav className="flex items-center justify-center gap-8 lg:gap-12 justify-self-center">
                    {links.map(l => (
                        <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `text-sm font-medium transition-colors whitespace-nowrap ${isActive ? 'text-primary font-bold border-b-2 border-primary pb-1 -mb-1' : 'text-slate-600 dark:text-slate-400 hover:text-primary pb-1 -mb-1'}`}>
                            {l.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Right: Actions */}
                <div className="flex justify-end gap-4 items-center justify-self-end w-full">
                    {/* Settings */}
                    <div className="relative">
                        <button onClick={() => { setShowSettings(!showSettings); setShowUser(false); }} className="flex items-center gap-1 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-sm">
                            <span className="material-symbols-outlined text-lg">tune</span>
                        </button>
                        {showSettings && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-50" onClick={e => e.stopPropagation()}>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('settings')}</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{t('currency')}</label>
                                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none">
                                            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">{t('language')}</label>
                                        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none">
                                            {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all">
                                        <span className="material-symbols-outlined text-lg">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                                        {theme === 'dark' ? t('light') : t('dark')} Mode
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* User / Login */}
                    {user ? (
                        <div className="relative flex items-center gap-3 border-l border-slate-200 dark:border-slate-700 pl-4">
                            <button onClick={() => { setShowUser(!showUser); setShowSettings(false); }} className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold leading-none text-deep dark:text-white">{user.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                                </div>
                                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center border-2 border-primary/20">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                </div>
                            </button>
                            {showUser && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2 mb-1">
                                                <input autoFocus type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded px-2 py-1 bg-slate-50 dark:bg-slate-800 dark:text-white outline-none" />
                                                <button disabled={nameLoading} onClick={handleUpdateName} className="text-primary hover:text-primary/80"><span className="material-symbols-outlined text-sm">check</span></button>
                                                <button disabled={nameLoading} onClick={() => setIsEditingName(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-sm">close</span></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-bold text-sm text-deep dark:text-white truncate pr-2">{user.name}</p>
                                                <button onClick={() => { setEditNameValue(user.name); setIsEditingName(true); }} className="text-slate-400 hover:text-primary shrink-0"><span className="material-symbols-outlined text-sm">edit</span></button>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                    <div className="py-1">
                                        <button onClick={() => { setShowPasswordModal(true); setShowUser(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <span className="material-symbols-outlined text-lg">lock_reset</span> Change Password
                                        </button>
                                    </div>
                                    <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                            <span className="material-symbols-outlined text-lg">logout</span> {t('logout')}
                                        </button>
                                        <button disabled={deleteLoading} onClick={handleDeleteAccount} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <span className="material-symbols-outlined text-lg">person_remove</span> {deleteLoading ? 'Deleting...' : 'Delete Account'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                            <span className="material-symbols-outlined text-lg">login</span> {t('signIn')}
                        </button>
                    )}
                </div>
            </header>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-50 transition-colors">
                {links.map(l => (
                    <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-1 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-[22px]">{l.icon}</span>
                        <span className="text-[9px] font-bold leading-tight">{l.label}</span>
                    </NavLink>
                ))}
                {user ? (
                    <button onClick={() => setShowSettings(!showSettings)} className="flex flex-col items-center gap-0.5 px-1 text-slate-400">
                        <span className="material-symbols-outlined text-[22px]">settings</span>
                        <span className="text-[9px] font-bold leading-tight">{t('settings')}</span>
                    </button>
                ) : (
                    <button onClick={() => navigate('/login')} className="flex flex-col items-center gap-0.5 px-1 text-slate-400">
                        <span className="material-symbols-outlined text-[22px]">login</span>
                        <span className="text-[9px] font-bold leading-tight">{t('signIn')}</span>
                    </button>
                )}
            </nav>

            {/* Mobile Settings Overlay */}
            {showSettings && (
                <div className="md:hidden fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowSettings(false)}>
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-10 transition-colors" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6" />
                        <h3 className="font-bold text-lg mb-4 text-deep dark:text-white">{t('settings')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">{t('currency')}</label>
                                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base bg-slate-50 dark:bg-slate-800 dark:text-white">
                                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">{t('language')}</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base bg-slate-50 dark:bg-slate-800 dark:text-white">
                                    {languages.map(l => <option key={l.code} value={l.code}>{l.native}</option>)}
                                </select>
                            </div>
                            <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-300">
                                <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span> Toggle Theme
                            </button>
                            {user && (
                                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="px-1 text-center">
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2">
                                                <input autoFocus type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="w-full text-sm bg-transparent outline-none dark:text-white px-2" />
                                                <button disabled={nameLoading} onClick={handleUpdateName} className="text-primary hover:text-primary/80 w-8 h-8 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-sm">check</span></button>
                                                <button disabled={nameLoading} onClick={() => setIsEditingName(false)} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-sm">close</span></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                <p className="font-bold text-base text-deep dark:text-white truncate">{user.name}</p>
                                                <button onClick={() => { setEditNameValue(user.name); setIsEditingName(true); }} className="text-slate-400 hover:text-primary"><span className="material-symbols-outlined text-sm">edit</span></button>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                    </div>
                                    <button onClick={() => { setShowPasswordModal(true); setShowSettings(false); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold">
                                        <span className="material-symbols-outlined">lock_reset</span> Change Password
                                    </button>
                                    <button disabled={deleteLoading} onClick={handleDeleteAccount} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 text-sm font-bold border border-red-100 dark:border-red-900/30">
                                        <span className="material-symbols-outlined">person_remove</span> {deleteLoading ? 'Deleting...' : 'Delete Account'}
                                    </button>
                                    <button onClick={() => { handleLogout(); setShowSettings(false); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/20">
                                        <span className="material-symbols-outlined">logout</span> {t('logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-deep dark:text-white">Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6">
                            {passMessage.text && (
                                <div className={`p-3 rounded-lg text-sm font-semibold mb-4 ${passMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-[#22c55e]/10 text-[#22c55e]'}`}>
                                    {passMessage.text}
                                </div>
                            )}
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Current Password</label>
                                    <div className="relative">
                                        <input type={showPasswords ? "text" : "password"} required value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
                                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            <span className="material-symbols-outlined text-sm">{showPasswords ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">New Password</label>
                                    <div className="relative">
                                        <input type={showPasswords ? "text" : "password"} required value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
                                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            <span className="material-symbols-outlined text-sm">{showPasswords ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Confirm New Password</label>
                                    <div className="relative">
                                        <input type={showPasswords ? "text" : "password"} required value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-10 text-sm bg-slate-50 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
                                        <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            <span className="material-symbols-outlined text-sm">{showPasswords ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>
                                <button disabled={passLoading} type="submit" className="w-full px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4">
                                    {passLoading ? <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
