import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout, getToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [freshAuth, setFreshAuth] = useState(false); // tracks if user was just logged in/registered

    useEffect(() => {
        // Only run the getMe check if there's no fresh auth (i.e. we're restoring from a page reload)
        if (freshAuth) return;
        const token = getToken();
        if (token) {
            getMe()
                .then(u => { setUser(u); setLoading(false); })
                .catch(() => {
                    // Only clear on failure if no user is already set (don't wipe a freshly registered user)
                    if (!user) { apiLogout(); }
                    setLoading(false);
                });
        } else { setLoading(false); }
    }, []);

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        setUser(data.user);
        setFreshAuth(true);
        setLoading(false);
        return data;
    };

    const register = async (name, email, password) => {
        const data = await apiRegister(name, email, password);
        setUser(data.user);
        setFreshAuth(true);
        setLoading(false);
        return data;
    };

    const logout = () => { apiLogout(); setUser(null); setFreshAuth(false); };

    const updateUser = (newUser) => { setUser(newUser); };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() { return useContext(AuthContext); }
