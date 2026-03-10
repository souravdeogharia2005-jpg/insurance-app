export const API = import.meta.env.VITE_API_URL || '/api';

function getToken() { return localStorage.getItem('aegis-token'); }
function setToken(t) { localStorage.setItem('aegis-token', t); }
function removeToken() { localStorage.removeItem('aegis-token'); }

async function request(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Increase timeout to 120 seconds for deep Render cold start (User preferred waiting over failure)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const res = await fetch(API + url, { 
            ...options, 
            headers,
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if ((res.status === 401 || res.status === 403) && !url.includes('/auth/change-password')) { 
            removeToken(); 
            window.location.href = '/login'; 
            return null; 
        }
        return res;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. The server might be waking up, please try again in 10 seconds.');
        }
        throw err;
    }
}

export async function register(name, email, password) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
        const res = await fetch(API + '/auth/register', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, email, password }),
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        setToken(data.token);
        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Server is taking time to wake up. Please wait 10 seconds and try again.');
        throw err;
    }
}

export async function login(email, password) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
        const res = await fetch(API + '/auth/login', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ email, password }),
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        setToken(data.token);
        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Server is waking up from sleep. Please wait another 15-20 seconds and click Sign In again.');
        throw err;
    }
}

export async function getMe() {
    const res = await request('/auth/me');
    if (!res || !res.ok) return null;
    const data = await res.json();
    return data.user;
}

export async function changePassword(currentPassword, newPassword) {
    const res = await request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!res) throw new Error('Network error');

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response (not JSON)');
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
}

export async function updateProfile(name) {
    const res = await request('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    if (data.token) setToken(data.token);
    return data;
}

export async function deleteAccount() {
    const res = await request('/auth/me', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete account');
    removeToken();
    return data;
}

export async function getProposals() {
    const res = await request('/proposals');
    if (!res || !res.ok) return [];
    return (await res.json()).map(p => ({ ...p, createdAt: new Date(p.createdAt) }));
}

export async function getAdminProposals() {
    const res = await request('/admin/proposals');
    if (!res || !res.ok) return [];
    return (await res.json()).map(p => ({ ...p, createdAt: new Date(p.createdAt) }));
}

export async function createProposal(proposal) {
    proposal.id = 'AGS-' + Date.now().toString(36).toUpperCase();
    const res = await request('/proposals', { method: 'POST', body: JSON.stringify(proposal) });
    if (!res || !res.ok) throw new Error('Failed to create');
    const data = await res.json();
    data.createdAt = new Date(data.createdAt);
    return data;
}

export async function updateProposal(id, updates) {
    const res = await request('/proposals/' + id, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res || !res.ok) throw new Error('Failed to update');
    return res.json();
}

export async function deleteProposal(id) {
    const res = await request('/proposals/' + id, { method: 'DELETE' });
    if (!res || !res.ok) throw new Error('Failed to delete');
    return res.json();
}

export async function updateAdminProposal(id, updates) {
    const res = await request('/admin/proposals/' + id, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res || !res.ok) throw new Error('Failed to update admin proposal');
    return res.json();
}

export async function deleteAdminProposal(id) {
    const res = await request('/admin/proposals/' + id, { method: 'DELETE' });
    if (!res || !res.ok) throw new Error('Failed to delete admin proposal');
    return res.json();
}

export async function getAdminStats() {
    const res = await request('/admin/stats');
    if (!res || !res.ok) return { totalUnderwritten: 0, activeProposals: 0, approvalRate: 0, avgProcessingTime: 0, revenueHistory: [] };
    return res.json();
}

export async function forgotPassword(email) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
        const res = await fetch(API + '/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send reset link');
        return data;
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') throw new Error('Server is starting up. Please wait 15 seconds and try again.');
        throw err;
    }
}

export function logout() { removeToken(); }
export { getToken };
