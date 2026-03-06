import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * ThemeProvider — wraps the app and manages dark/light mode.
 * - Reads preference from localStorage first
 * - Falls back to prefers-color-scheme media query
 * - Toggles `dark` class on <html> element (Tailwind dark mode: 'class')
 */
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // 1. Saved preference
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        // 2. System preference
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    // Apply `dark` class to <html> on theme change
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Sync with system changes when no saved preference
    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return; // user has explicit pref, don't override

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/** useTheme — returns { theme, toggleTheme } */
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
