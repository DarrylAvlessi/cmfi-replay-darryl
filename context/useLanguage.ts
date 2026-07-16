import { useState, useCallback, useMemo } from 'react';
import { Language, TranslationKey, i18n } from '../lib/i18n';

export function useLanguage() {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('language');
            if (saved === 'en' || saved === 'fr') return saved;
        }
        return 'en';
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
    }, []);

    const t = useMemo(() => i18n(language), [language]);

    return { language, setLanguage, t };
}
