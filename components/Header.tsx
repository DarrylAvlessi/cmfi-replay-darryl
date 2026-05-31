import React, { useState } from 'react';
import { ArrowLeftIcon, SunIcon, MoonIcon } from './icons';
import HeaderMenu from './HeaderMenu';
import { useAppContext } from '../context/AppContext';
import HamburgerMenu from './HamburgerMenu';
import NotificationBell from './NotificationBell';
import Navbar from './Navbar';
import DesktopSearchBar from './DesktopSearchBar';

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
  isWatchRoute = false
}) => {
  const { theme, setTheme, t } = useAppContext();
  const [isSearchActive, setIsSearchActive] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Header pour les écrans mobiles */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-black p-4 border-b border-gray-200 dark:border-black md:hidden">
        <div className="w-full flex items-center justify-between">
          {/* Menu burger à gauche */}
          <HamburgerMenu
            isOpen={isSidebarOpen}
            onClick={onToggleSidebar}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          />

          {/* Titre au centre */}
          <h1 className="text-xl font-serif font-bold text-center">CMFI Replay</h1>

          {/* Contrôles à droite */}
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <HeaderMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Header pour les écrans plus larges */}
      <header className={`bg-white dark:bg-black hidden md:block fixed top-0 right-0 left-0 z-10 transition-all duration-500 ease-in-out ${isWatchRoute ? 'lg:left-0 bg-black/60 backdrop-blur-md' : 'lg:left-0'
        } ${isWatchRoute ? 'bg-opacity-60' : ''}`}>
        <div className="relative flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-black">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4 z-10">
            {/* Hamburger pour tablette (quand la Navbar est cachée) */}
            <div className="md:flex lg:hidden">
              <HamburgerMenu isOpen={isSidebarOpen} onClick={onToggleSidebar} className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" />
            </div>
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
            ) : null}
            <h1 className="text-lg font-serif font-semibold text-gray-900 dark:text-white">CMFI Replay</h1>
          </div>

          {/* Navbar central (caché quand la recherche est active) */}
          {!isWatchRoute && !isSearchActive && <Navbar />}
          {!isWatchRoute && isSearchActive && <div className="flex-1" />}

          {/* Contrôles alignés à droite */}
          <div className="flex items-center space-x-4 z-10">
            <div className={`${isSearchActive ? 'absolute left-0 right-0 flex justify-center px-6' : ''}`}>
              <DesktopSearchBar onActiveChange={setIsSearchActive} fullWidth={isSearchActive} />
            </div>
            {!isSearchActive && !isWatchRoute && <NotificationBell />}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            {!isWatchRoute && <HeaderMenu />}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;