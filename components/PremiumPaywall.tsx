import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface PremiumPaywallProps {
    contentTitle?: string;
    contentType?: 'movie' | 'series' | 'episode';
}

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ contentTitle, contentType = 'movie' }) => {
    const { t } = useAppContext();
    const navigate = useNavigate();

    const handleUpgrade = () => {
        navigate('/redeem-voucher');
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Fond avec effet de blur */}
                <div className="relative bg-gradient-to-br from-gray-900 via-black to-black rounded-3xl shadow-2xl overflow-hidden">
                    {/* Effet de brillance */}
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10"></div>

                    {/* Contenu */}
                    <div className="relative p-8 md:p-12">
                        {/* Icône Premium */}
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Titre */}
                        <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
                            {t('premiumContent')}
                        </h1>

                        {/* Description */}
                        <p className="text-center text-gray-300 text-lg mb-2">
                            {t('upgradeToAccess')}
                        </p>

                        {contentTitle && (
                            <p className="text-center text-amber-400 font-semibold mb-8">
                                "{contentTitle}"
                            </p>
                        )}

                        {/* Avantages Premium */}
                        <div className="grid md:grid-cols-2 gap-4 mb-8">
                            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Unlimited Access</h3>
                                    <p className="text-sm text-gray-400">Watch all premium content without limits</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">HD Quality</h3>
                                    <p className="text-sm text-gray-400">Enjoy content in high definition</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Early Access</h3>
                                    <p className="text-sm text-gray-400">Get new content before everyone else</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Ad-Free</h3>
                                    <p className="text-sm text-gray-400">No interruptions, pure content</p>
                                </div>
                            </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={handleUpgrade}
                                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {t('upgradeToPremium')}
                            </button>

                            <button
                                onClick={() => navigate(-1)}
                                className="flex-1 bg-white/10 backdrop-blur-sm text-white font-semibold py-4 px-8 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-200"
                            >
                                {t('back')}
                            </button>
                        </div>

                        {/* Note */}
                        <p className="text-center text-gray-500 text-sm mt-6">
                            Use a promo code to activate your premium subscription
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumPaywall;
