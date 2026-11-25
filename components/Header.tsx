import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon, SunIcon, MoonIcon } from './icons';
import HeaderMenu from './HeaderMenu';
import HamburgerMenu from './HamburgerMenu';
import NotificationBell from './NotificationBell';
import DesktopSearchBar from './DesktopSearchBar';
import cmfiLogo from '../cmfireplay.svg';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isWatchRoute?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBack,
  isSidebarOpen,
  onToggleSidebar,
  isWatchRoute = false,
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { t, theme, setTheme, isSidebarCollapsed } = useAppContext();

  const railOffset = isWatchRoute
    ? 'lg:left-0'
    : isSidebarCollapsed
      ? 'lg:left-[76px]'
      : 'lg:left-[244px]';

  return (
    <>
      {/* ================= MOBILE COMPACT TOP BAR ================= */}
      <div className="fixed top-0 left-0 right-0 z-20 px-3 pt-2.5 md:hidden">
        <div className="shell-bar relative flex items-center justify-between h-14 px-2.5 rounded-2xl">
          <HamburgerMenu
            isOpen={isSidebarOpen}
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10"
            data-tour="mobile-menu-btn"
          />

          <Link to="/home" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <img src={cmfiLogo} alt="CMFI Replay" className="h-7 w-7 rounded-lg object-cover" />
            <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              CMFI <span className="text-sky-500">Replay</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        </div>
      </div>

      {/* ================= DESKTOP / TABLET BROADCAST TOP BAR ================= */}
      <header className={`hidden md:block fixed top-0 right-0 left-0 z-20 transition-all duration-300 ${railOffset}`}>
        <div
          className={`h-16 px-5 lg:px-7 flex items-center justify-between border-b backdrop-blur-xl transition-colors ${
            isWatchRoute
              ? 'bg-[#060911]/85 border-slate-800/80 text-white'
              : 'bg-white/80 dark:bg-[#060911]/80 border-slate-200/80 dark:border-slate-800/80'
          }`}
        >
          {/* Left: Tablet hamburger / Back button / Page Context */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex lg:hidden items-center gap-2">
              <HamburgerMenu
                isOpen={isSidebarOpen}
                onClick={onToggleSidebar}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-900/5 dark:hover:bg-white/10"
                data-tour="mobile-menu-btn"
              />
              <Link to="/home" className="flex items-center gap-2">
                <img src={cmfiLogo} alt="CMFI Replay" className="h-7 w-7 rounded-lg object-cover" />
                <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  CMFI <span className="text-sky-500">Replay</span>
                </span>
              </Link>
            </div>

            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                aria-label={t('back')}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            )}

            {!isWatchRoute && title && (
              <div className="hidden lg:flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(39,167,222,0.7)]" />
                <span className="font-display font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-100 truncate">
                  {title}
                </span>
              </div>
            )}
          </div>

          {/* Right: Search + Quick Theme + Notifications + Profile */}
          <div className="flex items-center gap-2.5 z-10">
            <div className={isSearchActive ? 'w-72 md:w-96' : ''}>
              <DesktopSearchBar onActiveChange={setIsSearchActive} fullWidth={isSearchActive} />
            </div>

            {!isWatchRoute && (
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors"
                aria-label={theme === 'dark' ? t('light') : t('dark')}
                title={theme === 'dark' ? t('light') : t('dark')}
              >
                {theme === 'dark' ? <SunIcon className="w-5 h-5 text-sky-400" /> : <MoonIcon className="w-5 h-5" />}
              </button>
            )}

            {!isWatchRoute && <NotificationBell />}
            {!isWatchRoute && <HeaderMenu />}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
