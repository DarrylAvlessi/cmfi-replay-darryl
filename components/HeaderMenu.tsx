import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, LogoutIcon, GlobeIcon, HelpIcon, SunIcon, MoonIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { Language } from '../lib/i18n';
import { auth } from '../lib/firebase';
import { userService } from '../lib/db';
import { toast } from 'react-toastify';

interface HeaderMenuProps {
  variant?: 'light' | 'dark';
}

const HeaderMenu: React.FC<HeaderMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const { t, setIsAuthenticated, language, setLanguage, user, userProfile, theme, setTheme } = useAppContext();

  const isHoverDevice = typeof window !== 'undefined' && !('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (!isHoverDevice) return;
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isHoverDevice) return;
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleToggle = () => {
    clearCloseTimeout();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      if (user?.uid) {
        try {
          await userService.updateUserProfile(user.uid, {
            presence: 'offline',
            lastSeen: new Date(),
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
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  const photoUrl = userProfile?.photo_url;
  const displayName = userProfile?.display_name || user?.displayName || user?.email?.split('@')[0] || '';

  return (
    <div className="relative" ref={menuRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
        data-tour="header-avatar"
        aria-label={t('profile')}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-600/70 dark:ring-sky-400/70"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center ring-2 ring-blue-500/30 text-white">
            <UserIcon className="w-4 h-4" />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-40 overflow-hidden">
          {displayName && (
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
              {user?.email && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>}
            </div>
          )}

          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <UserIcon className="w-4 h-4 mr-3 text-slate-400" />
            {t('profile')}
          </Link>
          <Link
            to="/bookmarks"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <svg className="w-4 h-4 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {t('myFavorites')}
          </Link>
          <Link
            to="/history"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <svg className="w-4 h-4 mr-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('history')}
          </Link>

          <div className="mx-3 my-1.5 h-px bg-slate-200/80 dark:bg-slate-800" />

          <Link
            to="/donate"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2 text-sm font-semibold text-blue-600 dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-500/10"
          >
            <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {t('donate') || 'Donate'}
          </Link>
          <Link
            to="/help"
            onClick={() => setIsOpen(false)}
            className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <HelpIcon className="w-4 h-4 mr-3 text-slate-400" />
            {t('help')}
          </Link>

          <div className="mx-3 my-1.5 h-px bg-slate-200/80 dark:bg-slate-800" />

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? (
              <SunIcon className="w-4 h-4 mr-3 text-sky-400" />
            ) : (
              <MoonIcon className="w-4 h-4 mr-3 text-blue-600" />
            )}
            {theme === 'dark' ? t('light') : t('dark')}
          </button>

          <div className="flex items-center gap-1.5 px-4 py-2">
            <GlobeIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mr-1" />
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 py-1 px-2.5 text-xs font-semibold rounded-lg transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageChange('fr')}
              className={`flex-1 py-1 px-2.5 text-xs font-semibold rounded-lg transition-colors ${
                language === 'fr'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              FR
            </button>
          </div>

          <div className="mx-3 my-1.5 h-px bg-slate-200/80 dark:bg-slate-800" />

          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          >
            <LogoutIcon className="w-4 h-4 mr-3" />
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
};

export default HeaderMenu;
