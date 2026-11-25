import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import AuthHeader from '../components/AuthHeader';
import InputField from '../components/InputField';
import AuthButton from '../components/AuthButton';
import cmfiLogo from '../cmfireplay.svg';

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
        <div className="relative min-h-screen broadcast-canvas flex flex-col justify-center py-16 px-4 sm:px-6 lg:px-8 animate-fadeIn overflow-hidden">
            <div className="absolute inset-0 broadcast-grid-bg pointer-events-none opacity-50" />
            <AuthHeader />
            <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-blue-600/20 ring-1 ring-slate-900/10 dark:ring-white/15">
                        <img src={cmfiLogo} alt="CMFI Replay" className="w-full h-full object-cover" />
                    </div>
                    <h2 className="mt-5 font-display text-3xl font-bold text-slate-900 dark:text-white">
                        {resetRequested ? t('resetLinkSent') : t('forgotPasswordScreenTitle')}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {resetRequested ? t('resetLinkSentInstruction') : t('forgotPasswordInstruction')}
                    </p>
                </div>
                <div className="mt-8 p-6 sm:p-7 rounded-3xl broadcast-panel">
                    <div className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
                                {error}
                            </div>
                        )}
                        {resetRequested ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-300 text-sm text-center">
                                    {t('resetLinkSentInstruction')}
                                </div>
                                <AuthButton onClick={() => navigate('/login')}>
                                    {t('backToLogin')}
                                </AuthButton>
                            </div>
                        ) : (
                            <>
                                <form className="space-y-6" onSubmit={handleForgotPassword}>
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
                                <div className="text-center text-sm">
                                    <button type="button" onClick={() => navigate('/login')} className="font-semibold text-blue-600 dark:text-sky-400 hover:underline">
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
