// screens/ChangePasswordScreen.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { auth } from '../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'react-toastify';
import AuthHeader from '../components/AuthHeader';
import InputField from '../components/InputField';
import AuthButton from '../components/AuthButton';
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '../components/icons';
import cmfiLogo from '../cmfireplay.svg';

const ChangePasswordScreen: React.FC = () => {
    const { t } = useAppContext();
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validations
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError(t('fillAllFields') || 'Veuillez remplir tous les champs');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('passwordsDoNotMatch') || 'Les mots de passe ne correspondent pas');
            return;
        }

        if (newPassword.length < 6) {
            setError(t('passwordTooShort') || 'Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (currentPassword === newPassword) {
            setError('Le nouveau mot de passe doit être différent de l\'ancien');
            return;
        }

        setLoading(true);
        const user = auth.currentUser;

        if (user && user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            try {
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                toast.success(t('passwordUpdated') || 'Mot de passe mis à jour avec succès', {
                    position: 'bottom-center',
                    autoClose: 3000,
                });
                navigate('/profile');
            } catch (error: any) {
                console.error('Error updating password:', error);
                if (error.code === 'auth/wrong-password') {
                    setError(t('wrongPassword') || 'Mot de passe actuel incorrect');
                } else if (error.code === 'auth/weak-password') {
                    setError('Le mot de passe est trop faible');
                } else if (error.code === 'auth/requires-recent-login') {
                    setError('Veuillez vous reconnecter pour changer votre mot de passe');
                } else {
                    setError(t('errorUpdatingPassword') || 'Erreur lors de la mise à jour du mot de passe');
                }
            } finally {
                setLoading(false);
            }
        } else {
            setError(t('userNotAuthenticated') || 'Utilisateur non authentifié');
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-white dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fadeIn">
            <AuthHeader />
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="px-4 text-center">
                    <img src={cmfiLogo} alt="CMFI Replay" className="h-12 mx-auto rounded-lg" />
                    <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
                        {t('changePassword') || 'Changer le mot de passe'}
                    </h2>
                </div>
                <div className="mt-8 px-4 sm:px-0">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('currentPassword') || 'Mot de passe actuel'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    required
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('newPassword') || 'Nouveau mot de passe'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    required
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Minimum 6 caractères
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t('confirmNewPassword') || 'Confirmer le nouveau mot de passe'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-100 dark:bg-black border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                                    required
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <AuthButton type="submit" disabled={loading}>
                                {loading ? (t('updating') || 'Mise à jour...') : (t('updatePassword') || 'Mettre à jour le mot de passe')}
                            </AuthButton>
                        </div>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="flex items-center justify-center space-x-2 text-amber-600 hover:text-amber-500 font-medium"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                                <span>Retour au profil</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordScreen;


