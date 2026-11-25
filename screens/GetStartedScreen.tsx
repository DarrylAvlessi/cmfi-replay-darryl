import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SunIcon, MoonIcon, ChevronDownIcon, ArrowRightIcon, GlobeIcon } from '../components/icons';
import { Language } from '../lib/i18n';
import cmfiLogo from '../cmfireplay.svg';

interface GetStartedScreenProps {
  onGetStarted: () => void;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ onGetStarted }) => {
  const { t, theme, setTheme, language, setLanguage } = useAppContext();
  const [imgError, setImgError] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLang = (lang: Language) => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  return (
    <div className="relative w-full min-h-[100dvh] broadcast-canvas text-slate-900 dark:text-slate-50 overflow-hidden">
      <div className="absolute inset-0 broadcast-grid-bg pointer-events-none opacity-60" />

      {/* Top Controls */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 sm:px-8 py-5">
        <div className="flex items-center gap-2.5">
          <img src={cmfiLogo} alt="CMFI Replay" className="h-9 w-9 rounded-xl object-cover shadow-md shadow-blue-600/20" />
          <span className="font-display font-bold text-base tracking-tight">
            CMFI <span className="text-sky-500">Replay</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl shell-bar text-slate-700 dark:text-slate-200 hover:border-blue-500/40 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <SunIcon className="w-4 h-4 text-sky-400" /> : <MoonIcon className="w-4 h-4 text-blue-600" />}
          </button>

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl shell-bar text-slate-700 dark:text-slate-200 hover:border-blue-500/40 transition-colors text-xs"
              aria-label="Select language"
            >
              <GlobeIcon className="w-4 h-4 text-sky-500" />
              <span className="font-mono-meta font-semibold uppercase">{language}</span>
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>
            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 rounded-xl py-1 shadow-xl">
                <button
                  onClick={() => handleLang('en')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  disabled={language === 'en'}
                >
                  English
                </button>
                <button
                  onClick={() => handleLang('fr')}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  disabled={language === 'fr'}
                >
                  Français
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 min-h-[100dvh] flex flex-col lg:flex-row">
        {/* Visual Broadcast Stage */}
        <div className="relative h-[44vh] lg:h-auto lg:w-[56%] lg:order-2 overflow-hidden">
          {!imgError ? (
            <img
              src="https://firebasestorage.googleapis.com/v0/b/c-m-f-i-replay-f-63xui3.appspot.com/o/zacharias-tanee-fomum.jpg?alt=media&token=f85b8398-39ea-4d72-897a-ada8fb709196"
              alt="CMFI Replay"
              className="absolute inset-0 w-full h-full object-cover object-center"
              fetchPriority="high"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#060911] via-blue-950 to-sky-900" />
          )}

          {/* Smooth Broadcast Blending Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#f4f7fc] via-[#f4f7fc]/40 to-transparent dark:from-[#060911] dark:via-[#060911]/55 lg:bg-gradient-to-r lg:from-[#f4f7fc] lg:via-[#f4f7fc]/45 lg:to-transparent dark:lg:from-[#060911] dark:lg:via-[#060911]/55" />
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-sky-400/10 mix-blend-screen pointer-events-none" />
        </div>

        {/* Editorial / Broadcast Launch Copy */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 pb-12 pt-4 lg:py-24 lg:w-[44%] lg:order-1">
          <div className="max-w-lg mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 dark:bg-sky-500/15 border border-blue-500/25 text-blue-600 dark:text-sky-400 text-[11px] font-mono-meta font-semibold uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              CMFI Replay Studio
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tight leading-[1.06] text-slate-900 dark:text-white">
              {t('categoryMovies')}, {t('categorySeries')} &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">
                {t('categoryPodcasts')}
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('slogan')}
            </p>

            {/* Quick Format Chips */}
            <div className="mt-6 flex flex-wrap gap-2">
              {['HD Streaming', 'Watch Together', 'Podcasts'].map((chip) => (
                <span
                  key={chip}
                  className="px-3 py-1 rounded-lg text-xs font-mono-meta bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={onGetStarted}
                className="min-h-[52px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold text-base shadow-xl shadow-blue-600/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
              >
                <span>{t('getStarted')}</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>

              <button
                onClick={onGetStarted}
                className="min-h-[52px] px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-blue-500/50 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors"
              >
                {t('alreadyHaveAccount')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GetStartedScreen;
