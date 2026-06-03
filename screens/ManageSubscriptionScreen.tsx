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
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{t('back')}</span>
                    </button>

                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('manageSubscription') || 'Subscription'}
                    </h1>
                    <div className="h-1 w-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
                </div>

                <div className="bg-white dark:bg-black rounded-2xl shadow-lg p-6 md:p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                        All content is available for free.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ManageSubscriptionScreen;
