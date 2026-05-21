import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const PaymentSuccessScreen: React.FC = () => {
    const { t, user, refreshSubscription } = useAppContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyPayment = async () => {
            // Récupérer la session ID depuis les paramètres URL
            const sessionId = searchParams.get('session_id');

            if (!sessionId) {
                console.error('No session ID found');
                setLoading(false);
                return;
            }

            try {
                // Rafraîchir le statut d'abonnement
                await refreshSubscription();
                setLoading(false);
            } catch (error) {
                console.error('Error verifying payment:', error);
                setLoading(false);
            }
        };

        verifyPayment();
    }, [searchParams, refreshSubscription]);

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
                            {t('welcomeToPremium') || 'Bienvenue dans Premium'}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {t('yourePremium') || 'Vous êtes maintenant Premium !'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                {t('enjoyPremiumContent') || 'Profitez de tout le contenu premium sans limite'}
                            </p>
                        </div>

                        {/* Benefits recap */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                                {t('yourBenefits') || 'Vos avantages'}
                            </h3>
                            <ul className="space-y-2">
                                {[
                                    t('premiumFeature1') || 'Accès illimité',
                                    t('premiumFeature2') || 'Qualité HD',
                                    t('premiumFeature3') || 'Sans publicités',
                                    t('premiumFeature4') || 'Accès anticipé',
                                ].map((benefit, idx) => (
                                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
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
