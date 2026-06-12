import React, { useState, useEffect } from 'react';
import { infoBarService } from '../lib/db';
import { useAppContext } from '../context/AppContext';

interface InfoBarMessage {
    id: string;
    message: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const InfoBar: React.FC = () => {
    const { theme } = useAppContext();
    const [messages, setMessages] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActiveMessages = async () => {
            try {
                const activeMessages = await infoBarService.getAllActiveMessages();
                if (activeMessages && activeMessages.length > 0) {
                    // Extraire les textes des messages actifs
                    const messageTexts = activeMessages
                        .filter(msg => msg.message && msg.message.trim())
                        .map(msg => msg.message.trim());
                    setMessages(messageTexts);
                } else {
                    setMessages([]);
                }
            } catch (error) {
                console.error('Error fetching active info bar messages:', error);
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveMessages();
        
        // Recharger les messages toutes les 30 secondes pour avoir les mises à jour en temps réel
        const interval = setInterval(fetchActiveMessages, 30000);
        return () => clearInterval(interval);
    }, []);

    // Ne pas afficher si pas de messages ou en chargement
    if (loading || messages.length === 0) {
        return null;
    }

    return (
        <div className={`relative w-full overflow-hidden ${
            theme === 'dark' 
                ? 'bg-gradient-to-r from-amber-900/20 via-amber-800/30 to-amber-900/20 border-y border-amber-700/30' 
                : 'bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 border-y border-amber-200'
        }`}>
            <div className={`flex items-center py-1.5 sm:py-2 md:py-3`}>
                {/* Icône d'information */}
                <div className={`flex-shrink-0 px-4 md:px-6 ${
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                }`}>
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Messages déroulants - Tous les messages actifs côte à côte */}
                <div className="flex-1 overflow-hidden relative">
                    <div 
                        className="inline-flex items-center animate-scroll"
                        style={{
                            animation: 'scroll 40s linear infinite',
                            whiteSpace: 'nowrap',
                            width: 'max-content',
                            paddingRight: '100%',
                        }}
                    >
                        {/* Afficher tous les messages actifs séparés par un séparateur */}
                        {messages.map((msg, index) => (
                            <React.Fragment key={index}>
                                <span className={`text-xs sm:text-sm md:text-base font-medium ${
                                    theme === 'dark' ? 'text-amber-200' : 'text-amber-900'
                                }`}>
                                    {msg}
                                </span>
                                {index < messages.length - 1 && (
                                    <span className={`mx-3 sm:mx-4 md:mx-6 text-xs sm:text-sm md:text-base font-medium ${
                                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                    }`}>
                                        •
                                    </span>
                                )}
                            </React.Fragment>
                        ))}
                        {/* Dupliquer pour un défilement continu */}
                        <span className={`ml-8 text-sm md:text-base font-medium ${
                            theme === 'dark' ? 'text-amber-200' : 'text-amber-900'
                        }`}>
                            {messages.map((msg, index) => (
                                <React.Fragment key={`dup-${index}`}>
                                    {msg}
                                    {index < messages.length - 1 && (
                                        <span className={`mx-3 sm:mx-4 md:mx-6 text-xs sm:text-sm md:text-base font-medium ${
                                            theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                        }`}>
                                            •
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Styles CSS pour l'animation */}
            <style>{`
                @keyframes scroll {
                    0% {
                        transform: translate3d(0, 0, 0);
                    }
                    100% {
                        transform: translate3d(-35%, 0, 0);
                    }
                }
                @media (max-width: 768px) {
                    .animate-scroll {
                        animation-duration: 40s !important; /* Ralentir un peu sur mobile */
                    }
                }
            `}</style>
        </div>
    );
};

export default InfoBar;

