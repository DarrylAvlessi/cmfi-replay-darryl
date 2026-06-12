import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { authService } from '../lib/authService';
import { userService } from '../lib/db';
import AuthHeader from '../components/AuthHeader';
import InputField from '../components/InputField';
import AuthButton from '../components/AuthButton';
import { GoogleIcon } from '../components/icons';

// Fonction utilitaire pour formater la date au format demandé
const formatCreatedTime = (date: Date): string => {
    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Obtenir le décalage UTC
    const offset = -date.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(offset) / 60);
    const offsetSign = offset >= 0 ? '+' : '-';

    return `${day} ${month} ${year} à ${hours}:${minutes}:${seconds} UTC${offsetSign}${offsetHours}`;
};

const SocialLoginButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => {
    const { t } = useAppContext();
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-md font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-white dark:focus:ring-offset-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <GoogleIcon className="w-6 h-6 mr-3" />
            {disabled ? t('loading') || 'Chargement...' : t('continueWithGoogle')}
        </button>
    );
};

const OrSeparator: React.FC = () => {
    const { t } = useAppContext();
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300/80 dark:border-gray-600/80" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">
                    {t('orSeparator')}
                </span>
            </div>
        </div>
    );
};

const AuthScreen: React.FC = () => {
    const { t, setIsAuthenticated, loading, language } = useAppContext();
    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgotPassword'>('login');
    const [resetRequested, setResetRequested] = useState(false);
    const [error, setError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [resetEmail, setResetEmail] = useState('');

    // Vérifier le résultat de la redirection Google au chargement
    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await authService.getGoogleRedirectResult();
                if (result) {
                    console.log('✅ Connexion Google réussie via redirection:', result.user.email);
                    // onAuthStateChanged devrait déjà avoir mis à jour l'état
                    setIsAuthenticated(true);
                }
                // Si result est null, c'est normal - soit aucune redirection n'a eu lieu,
                // soit l'utilisateur est déjà authentifié via onAuthStateChanged
            } catch (error: any) {
                // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas de résultat
                if (error.code && error.code !== 'auth/operation-not-allowed' && error.code !== 'auth/unauthorized-domain') {
                    console.error('❌ Erreur lors de la redirection Google:', error);
                    setError(error.message || 'Erreur lors de la connexion Google');
                }
            }
        };

        checkRedirectResult();
    }, [setIsAuthenticated]);

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');

        try {
            console.log('Début de la connexion Google...');
            const result = await authService.signInWithGoogle();

            // Si c'est une redirection, result sera void et onAuthStateChanged gérera l'authentification
            // Si c'est une popup, result contiendra le UserCredential
            if (result) {
                console.log('Connexion Google réussie (popup):', result.user.email);
                // onAuthStateChanged devrait déjà avoir mis à jour l'état
                setIsAuthenticated(true);
            } else {
                console.log('Redirection Google en cours...');
                // Pour la redirection, on ne fait rien ici
                // getGoogleRedirectResult() dans useEffect gérera le résultat
            }
        } catch (error: any) {
            console.error('Erreur lors de la connexion Google:', error);
            console.error('Code d\'erreur:', error.code);
            console.error('Message complet:', error.message);

            // Messages d'erreur personnalisés
            let errorMessage = 'Une erreur est survenue lors de la connexion Google';

            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'La fenêtre de connexion a été fermée';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'La fenêtre popup a été bloquée. Veuillez autoriser les popups pour ce site.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = 'Connexion annulée';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'Un compte existe déjà avec cet email mais avec une autre méthode de connexion.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMessage = 'La connexion Google n\'est pas activée. Veuillez contacter le support.';
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage = 'Ce domaine n\'est pas autorisé pour la connexion Google.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
            setGoogleLoading(false);
        }
    };

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

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || (authMode === 'signup' && !fullName)) {
            setError(t('fillAllFields') || 'Veuillez remplir tous les champs');
            return;
        }

        setAuthLoading(true);
        setError('');

        try {
            if (authMode === 'signup') {
                // Créer l'utilisateur dans Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Créer immédiatement le profil utilisateur dans Firestore avec le format demandé
                const createdTime = formatCreatedTime(new Date());

                await userService.createUserProfile({
                    uid: user.uid,
                    email: user.email || email,
                    display_name: fullName,
                    presence: 'offline',
                    hasAcceptedPrivacyPolicy: false,
                    created_time: createdTime,
                    theme: 'dark',
                    language: language,
                    bookmarkedIds: []
                });

                console.log('Profil utilisateur créé:', {
                    uid: user.uid,
                    email: user.email,
                    created_time: createdTime
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            setIsAuthenticated(true);
        } catch (error: any) {
            setError(error.message || t('authError') || 'Une erreur est survenue');
        } finally {
            setAuthLoading(false);
        }
    };

    const commonLayout = (title: string, subtitle: string | null, formContent: React.ReactNode, showSocial: boolean) => (
        <div className="relative min-h-screen bg-white dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fadeIn">
            <AuthHeader />
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="px-4 text-center">
                    <h1 className="text-4xl font-bold text-amber-500 tracking-wider">CMFI Replay</h1>
                    <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    {subtitle && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
                </div>
                <div className="mt-8 px-4 sm:px-0">
                    <div className="space-y-6">
                        {showSocial && (
                            <>
                                <SocialLoginButton
                                    onClick={handleGoogleSignIn}
                                    disabled={googleLoading}
                                />
                                <OrSeparator />
                            </>
                        )}
                        {error && (
                            <div className="text-red-500 text-sm text-center mb-4">
                                {error}
                            </div>
                        )}
                        {formContent}
                    </div>
                </div>
            </div>
        </div>
    );

    if (authMode === 'forgotPassword') {
        return commonLayout(
            resetRequested ? t('resetLinkSent') : t('forgotPasswordScreenTitle'),
            resetRequested ? t('resetLinkSentInstruction') : t('forgotPasswordInstruction'),
            resetRequested ? (
                <div className="space-y-6">
                    <AuthButton onClick={() => { setAuthMode('login'); setResetRequested(false); setResetEmail(''); }}>
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
                        <button type="button" onClick={() => setAuthMode('login')} className="font-medium text-amber-600 hover:text-amber-500">
                            {t('backToLogin')}
                        </button>
                    </div>
                </>
            ),
            false
        );
    }

    if (authMode === 'signup') {
        return commonLayout(
            t('signup'),
            null,
            <>
                <form className="space-y-8" onSubmit={handleAuth}>
                    <InputField label={t('fullName')} id="full-name" name="full-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Howard Thurman" />
                    <InputField label={t('email')} id="email-signup" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="e.g. howard.thurman@gmail.com" />
                    <InputField label={t('password')} id="password-signup" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
                    <div className="pt-2">
                        <AuthButton type="submit" disabled={authLoading}>
                            {authLoading ? t('loading') || 'Chargement...' : t('getStarted')}
                        </AuthButton>
                    </div>
                </form>
                <div className="mt-6 text-center text-sm">
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('alreadyHaveAccount')}{' '}
                        <button onClick={() => setAuthMode('login')} className="font-medium text-amber-600 hover:text-amber-500">
                            {t('login')}
                        </button>
                    </p>
                </div>
            </>,
            true
        );
    }

    // Login mode
    return commonLayout(
        t('login'),
        null,
        <>
            <form className="space-y-8" onSubmit={handleAuth}>
                <InputField label={t('email')} id="email-login" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="e.g. howard.thurman@gmail.com" />
                <InputField label={t('password')} id="password-login" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />

                <div className="text-sm text-right -mt-4">
                    <button type="button" onClick={() => setAuthMode('forgotPassword')} className="font-medium text-amber-600 hover:text-amber-500">{t('forgotPassword')}</button>
                </div>

                <div className="pt-2">
                    <AuthButton type="submit" disabled={authLoading}>
                        {authLoading ? t('loading') || 'Chargement...' : t('login')}
                    </AuthButton>
                </div>
            </form>
            <div className="mt-6 text-center text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                    {t('dontHaveAccount')}{' '}
                    <button onClick={() => setAuthMode('signup')} className="font-medium text-amber-600 hover:text-amber-500">
                        {t('signup')}
                    </button>
                </p>
            </div>
        </>,
        true
    );
}

export default AuthScreen;