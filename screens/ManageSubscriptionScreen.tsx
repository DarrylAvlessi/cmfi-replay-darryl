import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { usePageTitle } from '../lib/pageTitle';

const ManageSubscriptionScreen: React.FC = () => {
    const { t } = useAppContext();
    const navigate = useNavigate();

    const { updateTitle } = usePageTitle();
    React.useEffect(() => {
        updateTitle();
    }, [updateTitle]);

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="broadcast-canvas min-h-screen">
            <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 py-4 lg:py-8">
                <div className="mb-4 lg:mb-8">
                    <button
                        onClick={handleBack}
                        className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:mb-6 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{t('back')}</span>
                    </button>

                    <p className="mb-1 font-mono-meta text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400">{t('accountSettings')}</p>
                    <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-4xl lg:mb-2 dark:text-white">
                        {t('manageSubscription') || 'Subscription'}
                    </h1>
                </div>

                <div className="broadcast-panel relative overflow-hidden rounded-3xl p-6 md:p-10">
                    <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl dark:bg-sky-400/10" />
                    <div className="relative mx-auto max-w-2xl text-center">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/10 bg-blue-500/5 text-blue-600 dark:border-sky-400/15 dark:bg-sky-400/5 dark:text-sky-400">
                            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3m15.36-6.36a12 12 0 0 1-12.72 12.72m12.72 0A12 12 0 0 1 5.64 5.64" />
                            </svg>
                        </div>
                        <p className="mb-2 font-mono-meta text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400">{t('accountSettings')}</p>
                        <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl dark:text-white">
                            {t('allContentFreeTitle')}
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            {t('allContentFreeDescription')}
                        </p>
                        <button
                            onClick={() => navigate('/donate')}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110"
                        >
                            {t('donate') || 'Support CMFI Replay'}
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageSubscriptionScreen;
