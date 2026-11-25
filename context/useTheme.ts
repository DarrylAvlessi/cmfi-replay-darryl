import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
        return 'dark';
    }
    return 'dark';
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#060911' : '#f4f7fc');
        }
    }, [theme]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(prev => prev === newTheme ? prev : newTheme);
    }, []);

    return { theme, setTheme };
}
