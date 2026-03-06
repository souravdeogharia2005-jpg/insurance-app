import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout, getToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            getMe().then(u => { setUser(u); setLoading(false); }).catch(() => { apiLogout(); setLoading(false); });
        } else { setLoading(false); }
    }, []);

    const login = async (email, password) => {
        const data = await apiLogin(email, password);
        setUser(data.user);
        return data;
    };

    const register = async (name, email, password) => {
        const data = await apiRegister(name, email, password);
        setUser(data.user);
        return data;
    };

    const logout = () => { apiLogout(); setUser(null); };

    const updateUser = (newUser) => { setUser(newUser); };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() { return useContext(AuthContext); }
