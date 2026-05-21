import React, { memo } from 'react';
import { useAppContext } from '../context/AppContext';

interface PremiumBadgeProps {
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
}

const PremiumBadgeComponent: React.FC<PremiumBadgeProps> = ({ size = 'md', showDetails = false }) => {
    const { isPremium, subscriptionDetails, t, loading } = useAppContext();

    // Si le chargement est en cours, on affiche un indicateur de chargement
    if (isPremium === null) {
        return (
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-black dark:bg-gray-700 dark:text-gray-200">
                <span>Chargement...</span>
            </div>
        );
    }


    if (!isPremium) {
        return null;
    }

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base'
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5'
    };

    const getPlanLabel = () => {
        if (!subscriptionDetails) return 'Premium';

        switch (subscriptionDetails.planType) {
            case 'monthly':
                return t('monthly');
            case 'yearly':
                return t('yearly');
            case 'lifetime':
                return t('lifetime');
            default:
                return 'Premium';
        }
    };

    const getDaysRemainingText = () => {
        console.log('🔍 [PremiumBadge] getDaysRemainingText avec subscriptionDetails:', subscriptionDetails);
        if (!subscriptionDetails || !subscriptionDetails.daysRemaining) return null;

        const days = subscriptionDetails.daysRemaining;
        if (days < 0) return null;
        if (days === 0) return t('expiringToday') || 'Expires today';
        if (days === 1) return t('expiringTomorrow') || 'Expires tomorrow';
        return `${days} ${t('daysRemaining') || 'days remaining'}`;
    };

    return (
        <div className="inline-flex flex-col gap-1">
            <div className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full shadow-md`}>
                {/* Crown Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className={iconSizes[size]} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>{getPlanLabel()}</span>
            </div>

            {showDetails && subscriptionDetails && (
                <div className="text-xs text-gray-600 dark:text-gray-400 pl-1">
                    {subscriptionDetails.planType === 'lifetime' ? (
                        <span className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {t('lifetimeAccess') || 'Lifetime access'}
                        </span>
                    ) : (
                        getDaysRemainingText()
                    )}
                </div>
            )}
        </div>
    );
};

// Utilisation de memo pour éviter les rendus inutiles
const PremiumBadge = memo(PremiumBadgeComponent, (prevProps, nextProps) => {
    // Ne se re-rend que si les props changent
    return (
        prevProps.size === nextProps.size &&
        prevProps.showDetails === nextProps.showDetails
    );
});

export default PremiumBadge;
