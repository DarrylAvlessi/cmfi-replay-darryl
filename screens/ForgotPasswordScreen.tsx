import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import AuthHeader from '../components/AuthHeader';
import InputField from '../components/InputField';
import AuthButton from '../components/AuthButton';

const ForgotPasswordScreen: React.FC = () => {
    const { t } = useAppContext();
    const navigate = useNavigate();
    const [resetRequested, setResetRequested] = useState(false);
    const [error, setError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!resetEmail) {
            setError(t('fillAllFields') || 'Veuillez entrer votre adresse email');
            return;
        }

        setAuthLoading(true);
        setError('');

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetRequested(true);
        } catch (error: any) {
            console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);

            // Messages d'erreur personnalisés
            let errorMessage = 'Une erreur est survenue lors de l\'envoi de l\'email';

            if (error.code === 'auth/user-not-found') {
                // Pour des raisons de sécurité, on affiche le même message que si l'email existait
                setResetRequested(true);
                return;
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Adresse email invalide';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fadeIn">
            <AuthHeader />
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="px-4 text-center">
                    <h1 className="text-4xl font-bold text-amber-500 tracking-wider">CMFI Replay</h1>
                    <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
                        {resetRequested ? t('resetLinkSent') : t('forgotPasswordScreenTitle')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {resetRequested ? t('resetLinkSentInstruction') : t('forgotPasswordInstruction')}
                    </p>
                </div>
                <div className="mt-8 px-4 sm:px-0">
                    <div className="space-y-6">
                        {error && (
                            <div className="text-red-500 text-sm text-center mb-4">
                                {error}
                            </div>
                        )}
                        {resetRequested ? (
                            <div className="space-y-6">
                                <AuthButton onClick={() => navigate('/login')}>
                                    {t('backToLogin')}
                                </AuthButton>
                            </div>
                        ) : (
                            <>
                                <form className="space-y-8" onSubmit={handleForgotPassword}>
                                    <InputField
                                        label={t('email')}
                                        id="email-reset"
                                        name="email"
                                        type="email"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                        placeholder="e.g. howard.thurman@gmail.com"
                                    />
                                    <AuthButton type="submit" disabled={authLoading}>
                                        {authLoading ? t('loading') || 'Envoi...' : t('sendResetLink')}
                                    </AuthButton>
                                </form>
                                <div className="mt-6 text-center text-sm">
                                    <button type="button" onClick={() => navigate('/login')} className="font-medium text-amber-600 hover:text-amber-500">
                                        {t('backToLogin')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordScreen;
