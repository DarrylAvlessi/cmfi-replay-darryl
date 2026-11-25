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
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="broadcast-panel rounded-3xl max-w-md w-full p-8 relative scale-enter">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        aria-label="Fermer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-blue-600/10 dark:bg-sky-500/15 border border-blue-500/25 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-blue-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Connexion requise
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Vous devez être connecté pour {action}
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25"
                    >
                        Se connecter
                    </button>
                    <button
                        onClick={handleRegister}
                        className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold rounded-xl transition-colors"
                    >
                        Créer un compte
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 px-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                        >
                            Continuer sans compte
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPrompt;
