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
            <div className="broadcast-canvas flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-t-2 border-b-2 border-blue-600 dark:border-sky-400"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('verifyingPayment') || 'Vérification du paiement...'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="broadcast-canvas flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="broadcast-panel overflow-hidden rounded-3xl shadow-2xl">
                    {/* Success animation */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 p-8 text-center">
                        <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
                        <div className="relative mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-300/20 bg-white/10 text-sky-300 shadow-lg shadow-sky-950/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-11 w-11" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="relative mb-2 font-mono-meta text-[9px] font-semibold uppercase tracking-[0.2em] text-sky-300">{t('paymentSuccess') || 'Payment confirmed'}</p>
                        <h1 className="relative font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            {t('paymentSuccess') || 'Paiement réussi !'}
                        </h1>
                    </div>

                    {/* Content */}
                    <div className="p-6 sm:p-8">
                        <div className="mb-6 text-center">
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {t('paymentSuccessMessage') || 'Votre paiement a été traité avec succès'}
                            </p>
                        </div>

                        {/* Email confirmation notice */}
                        <div className="mb-6 rounded-2xl border border-blue-500/15 bg-blue-500/5 p-4 dark:border-sky-400/15 dark:bg-sky-400/5">
                            <div className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <p className="text-sm leading-relaxed text-blue-800 dark:text-sky-200">
                                    {t('confirmationEmailSent') || 'Un email de confirmation a été envoyé à votre adresse'}
                                </p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleContinue}
                                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:brightness-110"
                            >
                                {t('startWatching') || 'Commencer à regarder'}
                            </button>
                            <button
                                onClick={() => navigate('/manage-subscription')}
                                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-6 py-3 font-semibold text-slate-800 transition-colors duration-200 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
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
