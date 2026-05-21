import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

interface AuthPromptProps {
    action: string; // "liker", "commenter", "ajouter aux favoris"
    onClose?: () => void;
}

const AuthPrompt: React.FC<AuthPromptProps> = ({ action, onClose }) => {
    const { t } = useAppContext();
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate('/login');
    };

    const handleRegister = () => {
        navigate('/register');
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 relative scale-enter">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label="Fermer"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Connexion requise
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Vous devez être connecté pour {action}
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                        Se connecter
                    </button>
                    <button
                        onClick={handleRegister}
                        className="w-full py-3 px-4 bg-gray-100 dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-all duration-200"
                    >
                        Créer un compte
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                        >
                            Continuer sans compte
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-6">
                    Créez un compte gratuitement pour profiter de toutes les fonctionnalités
                </p>
            </div>
        </div>
    );
};

export default AuthPrompt;
