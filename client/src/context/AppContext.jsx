import { createContext, useContext, useState, useEffect } from 'react';
import translations, { formatCurrency, formatDate } from '../i18n/translations';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('aegis-theme') || 'light');
    const [currency, setCurrency] = useState(() => localStorage.getItem('aegis-currency') || 'INR');
    const [language, setLanguage] = useState(() => localStorage.getItem('aegis-lang') || 'en');

    useEffect(() => {
        localStorage.setItem('aegis-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => { localStorage.setItem('aegis-currency', currency); }, [currency]);
    useEffect(() => { localStorage.setItem('aegis-lang', language); }, [language]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
    const t = (key) => translations[language]?.[key] || translations.en[key] || key;
    const fc = (amount) => formatCurrency(amount, currency);
    const fd = (date) => formatDate(date, language);

    return (
        <AppContext.Provider value={{ theme, toggleTheme, currency, setCurrency, language, setLanguage, t, fc, fd }}>
            {children}
        </AppContext.Provider>
    );
}
