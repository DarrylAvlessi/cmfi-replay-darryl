import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { SunIcon, MoonIcon, GlobeIcon } from '../components/icons';
import { Language } from '../lib/i18n';

const PrivacyScreen: React.FC = () => {
    const navigate = useNavigate();
    const { theme, setTheme, language, setLanguage, t } = useAppContext();
    const [showFullText, setShowFullText] = useState(false);
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

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-black rounded-lg transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-semibold">{t('privacyPolicy')}</h1>
                    </div>
                    
                    {/* Theme and Language Controls */}
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
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Message d'introduction */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                        <strong>CMFI Replay</strong> {t('privacySubtitle')}
                    </p>
                </div>

                {/* Résumé */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                        📋 {t('privacySummary')}
                    </h2>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                        <li>{t('privacySummary1')}</li>
                        <li>{t('privacySummary2')}</li>
                        <li>{t('privacySummary3')}</li>
                        <li>{t('privacySummary4')}</li>
                    </ul>
                </div>

                {/* Bouton pour afficher/masquer le texte complet */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                        onClick={() => setShowFullText(!showFullText)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {showFullText ? t('hideFullPolicy') : t('showFullPolicy')}
                        </span>
                        {showFullText ? (
                            <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                            <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                    </button>
                </div>

                {/* Texte complet (affiché/masqué) */}
                {showFullText && (
                    <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300">
                        {/* 1. Responsable du traitement */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection1')}
                            </h3>
                            <p dangerouslySetInnerHTML={{ __html: t('privacySection1Text') }}></p>
                        </section>

                        {/* 2. Données collectées */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection2')}
                            </h3>
                            <p className="mb-2">{t('privacySection2Text')}</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection2Item1') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection2Item2') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection2Item3') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection2Item4') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection2Item5') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection2Item6') }}></li>
                            </ul>
                        </section>

                        {/* 3. Finalités du traitement */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection3')}
                            </h3>
                            <p className="mb-2">{t('privacySection3Text')}</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>{t('privacySection3Item1')}</li>
                                <li>{t('privacySection3Item2')}</li>
                                <li>{t('privacySection3Item3')}</li>
                                <li>{t('privacySection3Item4')}</li>
                                <li>{t('privacySection3Item5')}</li>
                                <li>{t('privacySection3Item6')}</li>
                                <li>{t('privacySection3Item7')}</li>
                            </ul>
                        </section>

                        {/* 4. Base légale */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection4')}
                            </h3>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection4Item1') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection4Item2') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection4Item3') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection4Item4') }}></li>
                            </ul>
                        </section>

                        {/* 5. Conservation des données */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection5')}
                            </h3>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>{t('privacySection5Item1')}</li>
                                <li>{t('privacySection5Item2')}</li>
                                <li>{t('privacySection5Item3')}</li>
                                <li>{t('privacySection5Item4')}</li>
                            </ul>
                        </section>

                        {/* 6. Partage des données */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection6')}
                            </h3>
                            <p className="mb-2">{t('privacySection6Text')}</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection6Item1') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection6Item2') }}></li>
                            </ul>
                            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                {t('privacySection6Note')}
                            </p>
                        </section>

                        {/* 7. Vos droits */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection7')}
                            </h3>
                            <p className="mb-2">{t('privacySection7Text')}</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item1') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item2') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item3') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item4') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item5') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item6') }}></li>
                                <li dangerouslySetInnerHTML={{ __html: t('privacySection7Item7') }}></li>
                            </ul>
                            <p className="mt-2">
                                {t('privacySection7Contact')}
                            </p>
                        </section>

                        {/* 8. Sécurité */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection8')}
                            </h3>
                            <p>
                                {t('privacySection8Text')}
                            </p>
                        </section>

                        {/* 9. Cookies et technologies similaires */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection9')}
                            </h3>
                            <p>
                                {t('privacySection9Text')}
                            </p>
                        </section>

                        {/* 10. Modifications */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection10')}
                            </h3>
                            <p>
                                {t('privacySection10Text')}
                            </p>
                        </section>

                        {/* 11. Contact */}
                        <section>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                {t('privacySection11')}
                            </h3>
                            <p className="mb-2">
                                {t('privacySection11Text')}
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>{t('privacySection11Item1')}</li>
                                <li>{t('privacySection11Item2')}</li>
                            </ul>
                        </section>

                        {/* Date de mise à jour */}
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p>{t('lastUpdated')} {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrivacyScreen;
