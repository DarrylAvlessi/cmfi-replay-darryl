import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, LogoutIcon, GlobeIcon, HelpIcon, UpdateIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { Language } from '../lib/i18n';
import { auth } from '../lib/firebase';
import { userService } from '../lib/firestore';
import { toast } from 'react-toastify';

interface HeaderMenuProps {
    variant?: 'light' | 'dark'; // 'light' for light icons on dark bg, 'dark' for dark icons on light bg
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ variant = 'dark' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<number | null>(null);
    const { t, setIsAuthenticated, language, setLanguage, user, userProfile, swUpdateAvailable, applyUpdate } = useAppContext();

    const iconColor = variant === 'light' ? 'text-white' : 'text-gray-600 dark:text-gray-400';
    const hoverBg = variant === 'light' ? 'hover:bg-white/20' : 'hover:bg-gray-200 dark:hover:bg-gray-700';

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current !== null) {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimeoutRef.current = window.setTimeout(() => {
            setIsOpen(false);
        }, 200);
    };

    const handleLogout = async () => {
        try {
            // Mettre à jour le statut hors ligne avant la déconnexion
            if (user?.uid) {
                try {
                    // Mettre à jour le statut à offline ET lastSeen pour éviter qu'il soit remis à online
                    await userService.updateUserProfile(user.uid, { 
                        presence: 'offline',
                        lastSeen: new Date() // Mettre à jour lastSeen pour éviter qu'il soit remis à online
                    });
                } catch (updateError) {
                    console.error('Erreur lors de la mise à jour du statut hors ligne:', updateError);
                }
            }
            
            // Déconnexion de Firebase Auth
            await auth.signOut();
            setIsAuthenticated(false);
            
            // Rediriger vers l'écran d'accueil après la déconnexion
            window.location.href = '/';
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            toast.error('Une erreur est survenue lors de la déconnexion');
        }
    }

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    }

    const photoUrl = userProfile?.photo_url;

    return (
        <div className="relative" ref={menuRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button className={`p-1 rounded-full transition-colors ${iconColor} ${hoverBg} relative`}>
                {photoUrl ? (
                    <img src={photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-white" />
                    </div>
                )}
                {swUpdateAvailable && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-black animate-pulse" />
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-black rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20">
                    {swUpdateAvailable && (
                        <>
                            <button
                                onClick={() => { applyUpdate(); setIsOpen(false); }}
                                className="w-full text-left flex items-center px-4 py-2 text-sm text-amber-600 dark:text-amber-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <UpdateIcon className="w-5 h-5 mr-3" />
                                {t('updateNow')}
                            </button>
                            <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </>
                    )}
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <UserIcon className="w-5 h-5 mr-3" />
                        {t('profile')}
                    </Link>

                    <Link
                        to="/help"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <HelpIcon className="w-5 h-5 mr-3" />
                        {t('help')}
                    </Link>

                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />

                    <div className="flex items-center px-4 pt-2 pb-1 text-sm text-gray-700 dark:text-gray-200">
                        <GlobeIcon className="w-5 h-5 mr-3 text-gray-400" />
                        <span>{t('language')}</span>
                    </div>
                    <button
                        onClick={() => handleLanguageChange('en')}
                        className={`w-full text-left flex items-center pl-12 pr-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${language === 'en' ? 'text-amber-500' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                        {t('english')}
                    </button>
                    <button
                        onClick={() => handleLanguageChange('fr')}
                        className={`w-full text-left flex items-center pl-12 pr-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${language === 'fr' ? 'text-amber-500' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                        {t('french')}
                    </button>

                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <LogoutIcon className="w-5 h-5 mr-3" />
                        {t('logout')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HeaderMenu;