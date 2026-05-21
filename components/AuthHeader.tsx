import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SunIcon, MoonIcon, ChevronDownIcon, GlobeIcon } from './icons';
import { Language } from '../lib/i18n';

const AuthHeader: React.FC = () => {
    const { theme, setTheme, language, setLanguage } = useAppContext();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setIsLangMenuOpen(false);
    }

    return (
        <header className="absolute top-0 right-0 p-4 sm:p-6 z-10">
            <div className="flex items-center space-x-4">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>

                {/* Language Selector */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className="flex items-center space-x-2 p-2 rounded-full text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Select language"
                    >
                        <GlobeIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold uppercase">{language}</span>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLangMenuOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-black rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                            <button 
                                onClick={() => handleLanguageChange('en')}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                disabled={language === 'en'}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => handleLanguageChange('fr')}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                disabled={language === 'fr'}
                            >
                                Français
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AuthHeader;
