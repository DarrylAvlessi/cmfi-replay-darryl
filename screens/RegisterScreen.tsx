import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { authService } from '../lib/authService';
import { userService, UserProfile } from '../lib/db';
import AuthHeader from '../components/AuthHeader';
import InputField from '../components/InputField';
import AuthButton from '../components/AuthButton';
import { GoogleIcon } from '../components/icons';
import cmfiLogo from '../cmfireplay.svg';

const SocialLoginButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => {
    const { t } = useAppContext();
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full flex justify-center items-center py-3 px-4 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <GoogleIcon className="w-5 h-5 mr-3" />
            {disabled ? t('loading') || 'Chargement...' : t('continueWithGoogle')}
        </button>
    );
};

const OrSeparator: React.FC = () => {
    const { t } = useAppContext();
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-[#0b1120] text-slate-400 text-[11px] font-mono-meta uppercase tracking-[0.16em]">
                    {t('orSeparator')}
                </span>
            </div>
        </div>
    );
};

const RegisterScreen: React.FC = () => {
    const { t, setIsAuthenticated, setUserProfile } = useAppContext();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        const checkRedirectResult = async () => {
            try {
                const result = await authService.getGoogleRedirectResult();
                if (result) {
                    console.log('✅ Connexion Google réussie via redirection:', result.user.email);
                    // onAuthStateChanged devrait déjà avoir mis à jour l'état, mais on force la navigation
                    setIsAuthenticated(true);
                    navigate('/home');
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
    }, [setIsAuthenticated, navigate]);

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setError('');

        try {
            console.log('🔄 Début de la connexion Google...');
            const result = await authService.signInWithGoogle();

            // Si c'est une redirection, result sera void et onAuthStateChanged gérera l'authentification
            // Si c'est une popup, result contiendra le UserCredential
            if (result) {
                console.log('✅ Connexion Google réussie (popup):', result.user.email);
                // onAuthStateChanged devrait déjà avoir mis à jour l'état, mais on force la navigation
                setIsAuthenticated(true);
                navigate('/home');
            } else {
                console.log('🔄 Redirection Google en cours...');
                // Pour la redirection, on ne fait rien ici
                // getGoogleRedirectResult() dans useEffect gérera le résultat
                // Le loading reste actif car la redirection va se produire
            }
        } catch (error: any) {
            console.error('❌ Erreur lors de la connexion Google:', error);
            console.error('Code d\'erreur:', error.code);
            console.error('Message complet:', error.message);

            let errorMessage = 'Une erreur est survenue lors de la connexion Google';

            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'La fenêtre de connexion a été fermée. Veuillez réessayer.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'La fenêtre popup a été bloquée. L\'application va utiliser la redirection à la place.';
                // Ne pas afficher d'erreur, la redirection devrait se faire automatiquement
                console.log('⚠️ Popup bloquée, redirection en cours...');
                return; // Ne pas arrêter le loading, la redirection va se produire
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

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !fullName) {
            setError(t('fillAllFields') || 'Veuillez remplir tous les champs');
            return;
        }

        setAuthLoading(true);
        setError('');

        try {
            // Créer l'utilisateur dans Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Sauvegarder le nom complet de l'utilisateur
            await updateProfile(userCredential.user, { displayName: fullName.trim() });

            // Créer le profil Firestore de manière déterministe
            const language = (localStorage.getItem('language') as 'en' | 'fr') || 'en';
            const profileData: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
                uid: userCredential.user.uid,
                email: userCredential.user.email || email,
                display_name: fullName.trim(),
                presence: 'online',
                hasAcceptedPrivacyPolicy: false,
                created_time: new Date().toISOString(),
                theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
                language,
                bookmarkedIds: [],
            };
            await userService.createUserProfile(profileData);
            setUserProfile(profileData as UserProfile);

            setIsAuthenticated(true);
            navigate('/home');
        } catch (error: any) {
            setError(error.message || t('authError') || 'Une erreur est survenue');
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
                    <p className="mt-5 text-[11px] font-mono-meta uppercase tracking-[0.22em] text-blue-600 dark:text-sky-400 font-semibold">
                        CMFI Replay
                    </p>
                    <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                        {t('signup')}
                    </h2>
                </div>
                <div className="mt-8 p-6 sm:p-7 rounded-3xl broadcast-panel">
                    <div className="space-y-6">
                        <SocialLoginButton
                            onClick={handleGoogleSignIn}
                            disabled={googleLoading}
                        />
                        <OrSeparator />
                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
                                {error}
                            </div>
                        )}
                        <form className="space-y-5" onSubmit={handleAuth}>
                            <InputField label={t('fullName')} id="full-name" name="full-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Howard Thurman" />
                            <InputField label={t('email')} id="email-signup" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="e.g. howard.thurman@gmail.com" />
                            <InputField label={t('password')} id="password-signup" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required placeholder="••••••••" />
                            <div className="pt-1">
                                <AuthButton type="submit" disabled={authLoading}>
                                    {authLoading ? t('loading') || 'Chargement...' : t('getStarted')}
                                </AuthButton>
                            </div>
                        </form>
                        <div className="pt-2 text-center text-sm">
                            <p className="text-slate-500 dark:text-slate-400">
                                {t('alreadyHaveAccount')}{' '}
                                <button onClick={() => navigate('/login')} className="font-semibold text-blue-600 dark:text-sky-400 hover:underline">
                                    {t('login')}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterScreen;
