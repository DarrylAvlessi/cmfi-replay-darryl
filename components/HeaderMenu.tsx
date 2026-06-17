import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, LogoutIcon, GlobeIcon, HelpIcon, UpdateIcon, SunIcon, MoonIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { Language } from '../lib/i18n';
import { auth } from '../lib/firebase';
import { userService } from '../lib/db';
import { toast } from 'react-toastify';

interface HeaderMenuProps {
    variant?: 'light' | 'dark';
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ variant = 'dark' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const closeTimeoutRef = useRef<number | null>(null);
    const { t, setIsAuthenticated, language, setLanguage, user, userProfile, swUpdateAvailable, applyUpdate, theme, setTheme } = useAppContext();

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
            if (user?.uid) {
                try {
                    await userService.updateUserProfile(user.uid, {
                        presence: 'offline',
                        lastSeen: new Date()
                    });
                } catch (updateError) {
                    console.error('Erreur lors de la mise à jour du statut hors ligne:', updateError);
                }
            }

            await auth.signOut();
            setIsAuthenticated(false);

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
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-black rounded-xl shadow-xl py-1.5 ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                    {swUpdateAvailable && (
                        <>
                            <button
                                onClick={() => { applyUpdate(); setIsOpen(false); }}
                                className="w-full text-left flex items-center px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            >
                                <UpdateIcon className="w-5 h-5 mr-3" />
                                {t('updateNow')}
                            </button>
                            <div className="mx-3 my-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </>
                    )}

                    {/* Account group */}
                    <Link
                        to="/profile"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <UserIcon className="w-5 h-5 mr-3" />
                        {t('profile')}
                    </Link>
                    <Link
                        to="/bookmarks"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        {t('myFavorites')}
                    </Link>
                    <Link
                        to="/history"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('history')}
                    </Link>

                    <div className="mx-3 my-1 h-px bg-gray-200 dark:bg-gray-700" />

                    {/* Support group */}
                    <Link
                        to="/donate"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                        <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {t('donate') || 'Donate'}
                    </Link>
                    <Link
                        to="/help"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <HelpIcon className="w-5 h-5 mr-3" />
                        {t('help')}
                    </Link>

                    <div className="mx-3 my-1 h-px bg-gray-200 dark:bg-gray-700" />

                    {/* Settings group */}
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {theme === 'dark' ? (
                            <SunIcon className="w-5 h-5 mr-3 text-amber-400" />
                        ) : (
                            <MoonIcon className="w-5 h-5 mr-3 text-gray-400" />
                        )}
                        {theme === 'dark' ? t('light') : t('dark')}
                    </button>
                    <div className="mx-3 my-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-1 px-4 py-2.5">
                        <GlobeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <button
                            onClick={() => handleLanguageChange('en')}
                            className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                                language === 'en'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => handleLanguageChange('fr')}
                            className={`flex-1 py-1.5 px-3 text-sm font-medium rounded-lg transition-colors ${
                                language === 'fr'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            FR
                        </button>
                    </div>

                    <div className="mx-3 my-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <LogoutIcon className="w-5 h-5 mr-3" />
                        {t('logout')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default HeaderMenu;
