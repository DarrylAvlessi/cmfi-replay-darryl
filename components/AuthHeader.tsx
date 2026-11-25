import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SunIcon, MoonIcon, ChevronDownIcon, GlobeIcon } from './icons';
import { Language } from '../lib/i18n';

const AuthHeader: React.FC = () => {
  const { theme, setTheme, language, setLanguage, t } = useAppContext();
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
  };

  return (
    <header className="absolute top-0 right-0 p-4 sm:p-6 z-30">
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl shell-bar text-slate-700 dark:text-slate-200 hover:border-blue-500/40 transition-colors"
          aria-label={t('theme')}
        >
          {theme === 'dark' ? <SunIcon className="w-4 h-4 text-sky-400" /> : <MoonIcon className="w-4 h-4 text-blue-600" />}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl shell-bar text-slate-700 dark:text-slate-200 hover:border-blue-500/40 transition-colors"
            aria-label={t('language')}
          >
            <GlobeIcon className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-mono-meta font-semibold uppercase">{language}</span>
            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 overflow-hidden">
              <button
                onClick={() => handleLanguageChange('en')}
                className="w-full text-left flex items-center px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                disabled={language === 'en'}
              >
                English
              </button>
              <button
                onClick={() => handleLanguageChange('fr')}
                className="w-full text-left flex items-center px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
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
