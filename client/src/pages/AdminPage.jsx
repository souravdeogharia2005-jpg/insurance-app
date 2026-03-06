import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getAdminProposals, updateAdminProposal, deleteAdminProposal } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, Trash2, Search, X, ChevronDown, Download, LockOpen } from 'lucide-react';

const ADMIN_PASSWORD = 'student123';
const ADMIN_NAME = 'SHREYA DEOGHARIA';

export default function AdminPage() {
    const { t, fc, fd } = useApp();
    const [unlocked, setUnlocked] = useState(false);
    const [adminName, setAdminName] = useState('');
    const [password, setPassword] = useState('');
    const [passError, setPassError] = useState('');
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [viewProp, setViewProp] = useState(null);
    const [delProp, setDelProp] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);

    useEffect(() => { if (unlocked) loadData(); }, [unlocked]);
    const loadData = () => { setLoading(true); getAdminProposals().then(p => { setProposals(p); setLoading(false); }); };

    const tryUnlock = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD && adminName.trim().toUpperCase() === ADMIN_NAME) {
            setUnlocked(true);
            setPassError('');
        } else {
            setPassError('Incorrect Name or Password');
        }
    };

    const changeStatus = async (id, status) => {
        await updateAdminProposal(id, { status }); setOpenMenu(null); loadData();
    };
    const confirmDelete = async () => {
        if (delProp) { await deleteAdminProposal(delProp); setDelProp(null); loadData(); }
    };
    const handleEditSave = async () => {
        if (viewProp) { await updateAdminProposal(viewProp.id, viewProp); setViewProp(null); loadData(); }
    };

    const filtered = proposals.filter(p => {
        const matchSearch = !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.id || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || p.status === filter;
        return matchSearch && matchFilter;
    });

    const fmtStatus = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
    const statusBadge = (s) => ({ approved: 'badge-green', pending: 'badge-yellow', rejected: 'badge-red', under_review: 'badge-blue' }[s] || 'badge-blue');
    const emrColor = (emr) => { if (!emr) return 'inherit'; if (emr <= 110) return '#10b981'; if (emr <= 130) return '#f59e0b'; return '#ef4444'; };

    // Admin gate
    if (!unlocked) {
        return (
            <div className="admin-gate">
                <motion.div className="gate-card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="gate-icon"><Lock size={32} /></div>
                    <h2>{t('adminPanel')}</h2>
                    <p className="text-muted">{t('enterAdminPass')}</p>
                    <form onSubmit={tryUnlock} className="gate-form">
                        <div className="input-group">
                            <span className="material-symbols-outlined input-icon text-slate-400">person</span>
                            <input type="text" placeholder="Admin Name" value={adminName} onChange={e => setAdminName(e.target.value)} autoFocus />
                        </div>
                        <div className="input-group">
                            <Lock size={16} className="input-icon" />
                            <input type="password" placeholder={t('adminPassword')} value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        {passError && <p className="login-error">{passError}</p>}
                        <button type="submit" className="btn btn-primary btn-full"><LockOpen size={16} /> {t('unlock')}</button>
                    </form>
                </motion.div>
            </div>
        );
    }

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    return (
        <div className="admin-page">
            <div className="page-header"><h1>{t('adminPanel')}</h1><p>{t('manageAll')}</p></div>
            <div className="admin-toolbar">
                <div className="search-box"><Search size={16} /><input placeholder={t('searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} /></div>
                <select className="form-select filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">{t('allStatus')}</option>
                    <option value="pending">{t('pending')}</option><option value="approved">{t('approved')}</option>
                    <option value="rejected">{t('rejected')}</option><option value="under_review">{t('underReview')}</option>
                </select>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>ID</th><th>Name</th><th>EMR</th><th>Risk</th><th>Premium</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={8}><p className="text-center text-muted" style={{ padding: '2rem' }}>{t('noProposals')}</p></td></tr>}
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td className="mono">{p.id}</td><td className="fw-600">{p.name || '—'}</td>
                                    <td><span className="fw-700" style={{ color: emrColor(p.emrScore) }}>{p.emrScore || '—'}</span></td>
                                    <td><span className={`badge ${statusBadge(p.riskClass?.includes('IV') || p.riskClass?.includes('V') ? 'rejected' : p.riskClass === 'Class III' ? 'pending' : 'approved')}`}>{p.riskClass || '—'}</span></td>
                                    <td className="fw-600">{p.premium ? fc(p.premium.total) : '—'}</td>
                                    <td>
                                        <select title={t('changeStatus')} className={`badge ${statusBadge(p.status)} appearance-none outline-none cursor-pointer border-0 font-bold px-3 py-1 bg-opacity-20`} value={p.status} onChange={e => changeStatus(p.id, e.target.value)}>
                                            <option className="text-deep dark:text-white bg-white dark:bg-slate-800" value="pending">{fmtStatus('pending')}</option>
                                            <option className="text-deep dark:text-white bg-white dark:bg-slate-800" value="approved">{fmtStatus('approved')}</option>
                                            <option className="text-deep dark:text-white bg-white dark:bg-slate-800" value="rejected">{fmtStatus('rejected')}</option>
                                            <option className="text-deep dark:text-white bg-white dark:bg-slate-800" value="under_review">{fmtStatus('under_review')}</option>
                                        </select>
                                    </td>
                                    <td className="text-muted">{fd(p.createdAt)}</td>
                                    <td>
                                        <div className="action-btns">
                                            <button className="icon-btn" title="View" onClick={() => setViewProp(p)}><Eye size={14} /></button>
                                            <button className="icon-btn danger" title="Delete" onClick={() => setDelProp(p.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {viewProp && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewProp(null)}>
                        <motion.div className="modal-card modal-lg" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header"><h3>Edit Proposal: {viewProp.id}</h3><button className="icon-btn" onClick={() => setViewProp(null)}><X size={18} /></button></div>
                            <div className="modal-body pb-0">
                                <div className="grid-2 mb-4">
                                    <div className="form-group"><label>Name</label><input className="form-input" value={viewProp.name || ''} onChange={e => setViewProp({ ...viewProp, name: e.target.value })} /></div>
                                    <div className="form-group"><label>Age</label><input type="number" className="form-input" value={viewProp.age || ''} onChange={e => setViewProp({ ...viewProp, age: e.target.value })} /></div>
                                    <div className="form-group"><label>Gender</label><select className="form-select" value={viewProp.gender || ''} onChange={e => setViewProp({ ...viewProp, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                                    <div className="form-group"><label>DOB</label><input type="date" className="form-input" value={viewProp.dob || ''} onChange={e => setViewProp({ ...viewProp, dob: e.target.value })} /></div>
                                    <div className="form-group"><label>Residence</label><select className="form-select" value={viewProp.residence || ''} onChange={e => setViewProp({ ...viewProp, residence: e.target.value })}><option value="urban">Urban</option><option value="semi-urban">Semi-Urban</option><option value="rural">Rural</option></select></div>
                                    <div className="form-group"><label>Profession</label><input className="form-input" value={viewProp.profession || ''} onChange={e => setViewProp({ ...viewProp, profession: e.target.value })} /></div>
                                    <div className="form-group"><label>Income Source</label><input className="form-input" value={viewProp.incomeSource || ''} onChange={e => setViewProp({ ...viewProp, incomeSource: e.target.value })} /></div>
                                </div>
                                <div className="grid-3 mb-6">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center"><p className="text-xs text-slate-500 mb-1">EMR Score</p><p className="font-bold text-deep dark:text-white">{viewProp.emrScore || '—'}</p></div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center"><p className="text-xs text-slate-500 mb-1">Risk Class</p><p className="font-bold text-deep dark:text-white">{viewProp.riskClass || '—'}</p></div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center"><p className="text-xs text-slate-500 mb-1">Premium</p><p className="font-bold text-deep dark:text-white">{viewProp.premium ? fc(viewProp.premium.total) : '—'}</p></div>
                                </div>
                            </div>
                            <div className="modal-btns">
                                <button className="btn btn-secondary" onClick={() => setViewProp(null)}>{t('cancel')}</button>
                                <button className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Modal */}
            <AnimatePresence>
                {delProp && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDelProp(null)}>
                        <motion.div className="modal-card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
                            <div className="delete-modal"><Trash2 size={32} className="red" /><h3>{t('deleteConfirm')}</h3><p className="text-muted">{t('deleteDesc')} <strong>{delProp}</strong></p>
                                <div className="modal-btns"><button className="btn btn-secondary" onClick={() => setDelProp(null)}>{t('cancel')}</button><button className="btn btn-danger" onClick={confirmDelete}>{t('delete')}</button></div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
