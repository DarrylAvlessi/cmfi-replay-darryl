import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { SunIcon, MoonIcon, ChevronDownIcon, ArrowRightIcon } from '../components/icons';
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
        <div className="relative w-full h-[100dvh] text-white bg-black overflow-hidden">
            <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-gray-600 bg-black/10 backdrop-blur-sm hover:bg-black/20 dark:text-gray-400 dark:bg-white/10 dark:hover:bg-white/20 transition-colors"
                        aria-label="Toggle dark mode"
                    >
                        {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    </button>
                    <div className="relative" ref={langRef}>
                        <button
                            onClick={() => setIsLangOpen(!isLangOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/20 bg-black/10 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:border-black/40 dark:border-white/20 dark:bg-white/10 dark:text-gray-300 dark:hover:text-white dark:hover:border-white/40 transition-colors text-sm"
                            aria-label="Select language"
                        >
                            <span className="font-semibold uppercase text-xs">{language}</span>
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isLangOpen && (
                            <div className="absolute left-0 mt-2 w-28 bg-white/90 backdrop-blur-md border border-black/10 dark:bg-black/90 dark:border-white/10 rounded-lg py-1 shadow-xl">
                                <button
                                    onClick={() => handleLang('en')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-black/10 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                                    disabled={language === 'en'}
                                >
                                    English
                                </button>
                                <button
                                    onClick={() => handleLang('fr')}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-black/10 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
                                    disabled={language === 'fr'}
                                >
                                    Français
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="h-full">
                <div className="flex flex-col md:flex-row h-full">

                    {/* IMAGE */}
                    <div className="relative h-[45vh] md:h-full md:w-1/2 lg:order-2 lg:w-3/5 overflow-hidden">
                        {!imgError ? (
                            <img
                                src="https://firebasestorage.googleapis.com/v0/b/c-m-f-i-replay-f-63xui3.appspot.com/o/zacharias-tanee-fomum.jpg?alt=media&token=f85b8398-39ea-4d72-897a-ada8fb709196"
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover object-center"
                                fetchPriority="high"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-amber-900 to-black" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-black lg:bg-gradient-to-r lg:from-black lg:via-black/60 lg:to-transparent" />
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 flex flex-col items-center md:items-center lg:items-start justify-center px-6 sm:px-10 md:px-12 lg:px-16 pb-16 md:pb-0 md:w-1/2 lg:w-2/5 lg:order-1 bg-black md:pt-16">
                        <section className="w-full max-w-sm md:max-w-md lg:max-w-none mx-auto lg:mx-0">
                            <div style={{ animation: 'fadeIn 0.5s ease-out 0.1s both' }}>
                                <img src={cmfiLogo} alt="CMFI Replay" className="h-12 md:h-16 rounded-xl" />
                            </div>
                            <div
                                className="mt-3 md:mt-4"
                                style={{ animation: 'fadeIn 0.5s ease-out 0.25s both' }}
                            >
                                <p className="text-base md:text-base lg:text-lg text-gray-300 leading-relaxed">
                                    {t('slogan')}
                                </p>
                            </div>
                            <div
                                className="mt-8 md:mt-10 lg:mt-12 w-full"
                                style={{ animation: 'fadeIn 0.5s ease-out 0.35s both' }}
                            >
                                <button
                                    onClick={onGetStarted}
                                    className="w-full lg:w-auto min-h-[52px] bg-amber-500 text-gray-900 font-bold py-3.5 px-10 rounded-full text-base md:text-lg hover:bg-amber-400 active:scale-[0.97] transition-all duration-300 shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3"
                                >
                                    <span>{t('getStarted')}</span>
                                    <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div
                                className="mt-5 md:mt-6 lg:mt-8"
                                style={{ animation: 'fadeIn 0.5s ease-out 0.45s both' }}
                            >
                                <button
                                    onClick={onGetStarted}
                                    className="text-sm text-gray-500 hover:text-white transition-colors underline underline-offset-2"
                                >
                                    {t('alreadyHaveAccount')}
                                </button>
                            </div>
                        </section>
                    </div>

                </div>
            </main>

        </div>
    );
};

export default GetStartedScreen;
