import { useState, useCallback, useMemo } from 'react';
import { Language, TranslationKey } from '../lib/i18n';
import { i18n } from '../lib/i18n';

type Theme = 'light' | 'dark';

export function useThemeLogic() {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = window.localStorage.getItem('theme') as Theme;
            if (savedTheme) {
                const root = window.document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(savedTheme);
                return savedTheme;
            }
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const defaultTheme = prefersDark ? 'dark' : 'light';
            localStorage.setItem('theme', defaultTheme);
            return defaultTheme;
        }
        return 'light';
    });

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(prevTheme => {
            if (prevTheme !== newTheme) {
                if (typeof window !== 'undefined') {
                    const root = window.document.documentElement;
                    root.classList.remove(prevTheme);
                    root.classList.add(newTheme);
                    localStorage.setItem('theme', newTheme);
                }
                return newTheme;
            }
            return prevTheme;
        });
    }, []);

    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem('language');
            if (saved === 'en' || saved === 'fr') return saved;
        }
        return 'en';
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('language', lang);
        }
    }, []);

    const t = useMemo(() => i18n(language), [language]);

    return { theme, setTheme, language, setLanguage, t };
}
