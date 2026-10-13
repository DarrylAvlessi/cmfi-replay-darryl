import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useAppContext } from '../context/AppContext';

/**
 * PWA update banner: when a new service worker is waiting (i.e. a fresh
 * deploy exists), offer a one-tap reload instead of forcing users to clear
 * site data. Sobriety: single banner, no auto-reload loop.
 */
const PwaUpdatePrompt: React.FC = () => {
    const { t } = useAppContext();
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered() {},
        onRegisterError() {},
    });

    if (!needRefresh) return null;

    const handleReload = () => {
        updateServiceWorker(true);
        setNeedRefresh(false);
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[160] animate-slideUp" role="status" aria-live="polite">
            <div className="mx-auto w-full max-w-md bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
                <p className="flex-1 text-sm font-medium">
                    {t('pwaUpdateAvailable')}
                </p>
                <button
                    onClick={handleReload}
                    className="shrink-0 px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                    {t('pwaReload')}
                </button>
                <button
                    onClick={() => setNeedRefresh(false)}
                    className="shrink-0 px-2 py-2 text-sm font-semibold opacity-70 hover:opacity-100"
                    aria-label={t('dismiss')}
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

export default PwaUpdatePrompt;
