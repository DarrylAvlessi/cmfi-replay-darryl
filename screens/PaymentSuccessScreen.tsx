import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const PaymentSuccessScreen: React.FC = () => {
    const { t } = useAppContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);

    const handleContinue = () => {
        navigate('/home');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('verifyingPayment') || 'Vérification du paiement...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-black rounded-2xl shadow-xl overflow-hidden">
                    {/* Success animation */}
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 animate-bounce">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {t('paymentSuccess') || 'Paiement réussi !'}
                        </h1>
                        <p className="text-white/90">
                            {t('paymentSuccess') || 'Paiement réussi !'}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('paymentSuccess') || 'Paiement réussi !'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('paymentSuccessMessage') || 'Votre paiement a été traité avec succès'}
                            </p>
                        </div>

                        {/* Email confirmation notice */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    {t('confirmationEmailSent') || 'Un email de confirmation a été envoyé à votre adresse'}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleContinue}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                            >
                                {t('startWatching') || 'Commencer à regarder'}
                            </button>
                            <button
                                onClick={() => navigate('/manage-subscription')}
                                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                            >
                                {t('manageSubscription') || 'Gérer mon abonnement'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccessScreen;
