import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { subscriptionService } from '../lib/subscriptionService';
import { usePageTitle } from '../lib/pageTitle';
import StripeCheckout from '../components/StripeCheckout';
import { MONTHLY_PRICE_DISPLAY } from '../lib/stripeService';

interface PlanCard {
    id: 'free' | 'monthly' | 'yearly' | 'lifetime';
    name: string;
    price: string;
    period?: string;
    features: string[];
    popular?: boolean;
}

const ManageSubscriptionScreen: React.FC = () => {
    const { t, user, isPremium, subscriptionDetails, refreshSubscription } = useAppContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showStripeCheckout, setShowStripeCheckout] = useState(false);
    const [localSubscription, setLocalSubscription] = useState<{
        isPremium: boolean;
        planType: string;
        endDate: Date | null;
        daysRemaining: number | null;
    } | null>(null);

    // Mise à jour du titre de la page
    const { updateTitle } = usePageTitle();
    useEffect(() => {
        updateTitle();
    }, [updateTitle]);

    useEffect(() => {
        const fetchSubscription = async () => {
            if (!user?.uid) {
                setLoading(false);
                return;
            }

            try {
                const details = await subscriptionService.getSubscriptionDetails(user.uid);
                setLocalSubscription(details);
            } catch (error) {
                console.error('Error fetching subscription:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [user?.uid]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleRedeemVoucher = () => {
        navigate('/redeem-voucher');
    };

    // Utiliser les détails locaux ou globaux
    const subscription = localSubscription || subscriptionDetails;

    const getPlanIcon = (planType: string) => {
        switch (planType) {
            case 'monthly':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                );
            case 'yearly':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                );
            case 'lifetime':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" />
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    </svg>
                );
        }
    };

    const getPlanName = (planType: string) => {
        switch (planType) {
            case 'monthly':
                return t('monthly') || 'Mensuel';
            case 'yearly':
                return t('yearly') || 'Annuel';
            case 'lifetime':
                return t('lifetime') || 'À vie';
            default:
                return t('free') || 'Gratuit';
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getDaysText = (days: number | null) => {
        if (days === null) return t('lifetimeAccess') || 'Accès à vie';
        if (days < 0) return t('expired') || 'Expiré';
        if (days === 0) return t('expiringToday') || 'Expire aujourd\'hui';
        if (days === 1) return t('expiringTomorrow') || 'Expire demain';
        return `${days} ${t('daysRemaining') || 'jours restants'}`;
    };

    // Plans disponibles - Seulement Free et Monthly
    const plans: PlanCard[] = [
        {
            id: 'free',
            name: t('free') || 'Gratuit',
            price: '0€',
            features: [
                t('freeFeature1') || 'Accès au contenu gratuit',
                t('freeFeature2') || 'Qualité SD',
                t('freeFeature3') || 'Avec publicités'
            ]
        },
        {
            id: 'monthly',
            name: t('monthly') || 'Mensuel',
            price: MONTHLY_PRICE_DISPLAY,
            period: t('perMonth') || '/mois',
            popular: true, // Marquer le plan mensuel comme populaire
            features: [
                t('premiumFeature1') || 'Accès illimité',
                t('premiumFeature2') || 'Qualité HD',
                t('premiumFeature3') || 'Sans publicités',
                t('premiumFeature4') || 'Accès anticipé',
                t('cancelAnytime') || 'Annulation à tout moment'
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header avec bouton retour */}
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
                        {t('manageSubscription') || 'Gérer l\'abonnement'}
                    </h1>
                    <div className="h-1 w-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('manageSubscriptionDesc') || 'Consultez et gérez votre abonnement actuel'}
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
                    </div>
                ) : (
                    <>
                        {/* Carte de statut actuel */}
                        <div className="bg-white dark:bg-black rounded-2xl shadow-lg overflow-hidden mb-8">
                            <div className="relative">
                                {/* Fond avec gradient */}
                                <div className={`absolute inset-0 ${isPremium
                                    ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500'
                                    : 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600'
                                    }`}></div>
                                <div className="absolute inset-0 bg-black/20"></div>

                                {/* Contenu */}
                                <div className="relative p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                        {/* Info principale */}
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                                                {getPlanIcon(subscription?.planType || 'free')}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm text-white/80 uppercase tracking-wider font-medium">
                                                        {t('currentPlan') || 'Plan actuel'}
                                                    </span>
                                                    {isPremium && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm3.707-7.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                                                            </svg>
                                                            PREMIUM
                                                        </span>
                                                    )}
                                                </div>
                                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                                    {getPlanName(subscription?.planType || 'free')}
                                                </h2>
                                                {isPremium && subscription?.planType !== 'lifetime' && (
                                                    <p className="text-white/80">
                                                        {t('validUntil') || 'Valide jusqu\'au'}: {formatDate(subscription?.endDate || null)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Badge jours restants */}
                                        {isPremium && (
                                            <div className="flex flex-col items-end">
                                                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center">
                                                    {subscription?.planType === 'lifetime' ? (
                                                        <div className="flex items-center gap-2 text-white">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span className="font-semibold">{t('lifetimeAccess') || 'Accès à vie'}</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-3xl font-bold text-white">
                                                                {subscription?.daysRemaining ?? 0}
                                                            </div>
                                                            <div className="text-sm text-white/80">
                                                                {t('daysRemaining') || 'jours restants'}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Détails supplémentaires */}
                            <div className="px-6 md:px-8 py-6 bg-gray-50 dark:bg-gray-900/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-white dark:bg-black rounded-xl">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('status') || 'Statut'}</div>
                                    <div className={`font-semibold ${isPremium ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {isPremium ? (t('active') || 'Actif') : (t('inactive') || 'Inactif')}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-white dark:bg-black rounded-xl">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('plan') || 'Plan'}</div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {getPlanName(subscription?.planType || 'free')}
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-white dark:bg-black rounded-xl">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                        {subscription?.planType === 'lifetime' ? (t('access') || 'Accès') : (t('expiration') || 'Expiration')}
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {getDaysText(subscription?.daysRemaining ?? null)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section Activer un code */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg p-6 md:p-8 mb-8">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">
                                            {t('haveVoucherCode') || 'Vous avez un code promo ?'}
                                        </h3>
                                        <p className="text-white/80">
                                            {t('redeemToUpgrade') || 'Utilisez votre code pour activer votre abonnement Premium'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRedeemVoucher}
                                    className="w-full md:w-auto bg-white text-amber-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 5.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 11H14a1 1 0 100-2H8.414l1.293-1.293z" clipRule="evenodd" />
                                    </svg>
                                    {t('redeemCode') || 'Utiliser un code'}
                                </button>
                            </div>
                        </div>

                        {/* Plans disponibles */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {t('availablePlans') || 'Plans disponibles'}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                                {plans.map((plan) => {
                                    const isCurrentPlan = subscription?.planType === plan.id;
                                    return (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-white dark:bg-black rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${isCurrentPlan ? 'ring-2 ring-amber-500' : ''}`}
                                        >
                                            {plan.popular && (
                                                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                                    {t('popular') || 'POPULAIRE'}
                                                </div>
                                            )}
                                            {isCurrentPlan && (
                                                <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                                                    {t('yourPlan') || 'VOTRE PLAN'}
                                                </div>
                                            )}
                                            <div className="p-6">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                                    {plan.name}
                                                </h3>
                                                <div className="flex items-baseline gap-1 mb-4">
                                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                                        {plan.price}
                                                    </span>
                                                    {plan.period && (
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                            {plan.period}
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="space-y-2 mb-6">
                                                    {plan.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                                {plan.id !== 'free' && !isCurrentPlan && (
                                                    <button
                                                        onClick={() => {
                                                            if (plan.id === 'monthly') {
                                                                setShowStripeCheckout(true);
                                                            } else {
                                                                handleRedeemVoucher();
                                                            }
                                                        }}
                                                        className={`w-full py-2.5 px-4 rounded-xl font-semibold transition-all duration-200 ${plan.popular
                                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {plan.id === 'monthly' ? (t('payByCard') || 'Payer par carte') : (t('selectPlan') || 'Choisir')}
                                                    </button>
                                                )}
                                                {isCurrentPlan && (
                                                    <div className="w-full py-2.5 px-4 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-center font-semibold">
                                                        {t('currentPlan') || 'Plan actuel'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Avantages Premium */}
                        <div className="bg-white dark:bg-black rounded-2xl shadow-lg p-6 md:p-8">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                                <span className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                {t('premiumBenefits') || 'Avantages Premium'}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            {t('unlimitedAccess') || 'Accès illimité'}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('unlimitedAccessDesc') || 'Regardez tout le contenu premium sans limite'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            {t('hdQuality') || 'Qualité HD'}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('hdQualityDesc') || 'Profitez du contenu en haute définition'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            {t('earlyAccess') || 'Accès anticipé'}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('earlyAccessDesc') || 'Accédez aux nouveautés avant tout le monde'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                            {t('adFree') || 'Sans publicités'}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('adFreeDesc') || 'Aucune interruption, contenu pur'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Modal Stripe Checkout */}
                {showStripeCheckout && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="relative">
                            <button
                                onClick={() => setShowStripeCheckout(false)}
                                className="absolute -top-4 -right-4 bg-white dark:bg-black rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <StripeCheckout onClose={() => setShowStripeCheckout(false)} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageSubscriptionScreen;
