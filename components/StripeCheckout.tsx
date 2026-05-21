import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { createCheckoutSession, redirectToCheckout, MONTHLY_PRICE_DISPLAY } from '../lib/stripeService';
import { toast } from 'react-toastify';

interface StripeCheckoutProps {
    onClose?: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({ onClose }) => {
    const { t, user } = useAppContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        if (!user?.uid) {
            toast.error(t('pleaseLogin') || 'Veuillez vous connecter');
            navigate('/login');
            return;
        }

        setLoading(true);

        try {
            // Créer une session de paiement
            const session = await createCheckoutSession({
                userId: user.uid,
                planType: 'monthly',
                successUrl: `${window.location.origin}/payment-success`,
                cancelUrl: `${window.location.origin}/manage-subscription`,
            });

            // Rediriger vers Stripe Checkout
            await redirectToCheckout(session.sessionId);
        } catch (error) {
            console.error('Error during checkout:', error);
            toast.error(t('paymentError') || 'Erreur lors du paiement');
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-black rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">
                        {t('subscribeToPremium') || 'S\'abonner à Premium'}
                    </h2>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">{MONTHLY_PRICE_DISPLAY}</span>
                    <span className="text-xl text-white/80">{t('perMonth') || '/mois'}</span>
                </div>
            </div>

            {/* Features */}
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {t('includedFeatures') || 'Fonctionnalités incluses'}
                </h3>
                <ul className="space-y-3 mb-6">
                    {[
                        t('premiumFeature1') || 'Accès illimité',
                        t('premiumFeature2') || 'Qualité HD',
                        t('premiumFeature3') || 'Sans publicités',
                        t('premiumFeature4') || 'Accès anticipé',
                        t('cancelAnytime') || 'Annulation à tout moment',
                    ].map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* Payment info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                            <p className="font-medium mb-1">
                                {t('securePayment') || 'Paiement sécurisé'}
                            </p>
                            <p className="text-blue-700 dark:text-blue-400">
                                {t('stripeSecure') || 'Vos informations de paiement sont sécurisées par Stripe'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Subscribe button */}
                <button
                    onClick={handleSubscribe}
                    disabled={loading}
                    className={`w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                        }`}
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            <span>{t('processing') || 'Traitement...'}</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                            </svg>
                            <span>{t('subscribeNow') || 'S\'abonner maintenant'}</span>
                        </>
                    )}
                </button>

                {/* Terms */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                    {t('subscriptionTerms') || 'En vous abonnant, vous acceptez nos conditions d\'utilisation. Vous pouvez annuler à tout moment.'}
                </p>
            </div>
        </div>
    );
};

export default StripeCheckout;
