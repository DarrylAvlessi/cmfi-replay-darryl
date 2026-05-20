import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { updateEpisodeViews } from '../lib/firestore';
import { toast } from 'react-toastify';
import { ActiveTab } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useAppContext();
  const location = useLocation();

  interface MenuItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    isAdmin?: boolean;
    onClick?: (e: React.MouseEvent) => void;
  }

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: t('home'),
      path: '/home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'movies',
      label: t('categoryMovies'),
      path: '/movies',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: 'series',
      label: t('categorySeries'),
      path: '/series',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'podcasts',
      label: t('categoryPodcasts'),
      path: '/podcasts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      id: 'bookmarks',
      label: t('myFavorites'),
      path: '/bookmarks',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: t('history'),
      path: '/history',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // Filtrer les éléments de menu pour n'afficher que ceux accessibles à tous les utilisateurs
  const filteredMenuItems = menuItems;

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };


  return (
    <>
      {/* Overlay pour mobile avec animation */}
      <div
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} lg:opacity-0 lg:pointer-events-none`}
        onClick={onClose}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300" />
      </div>

      {/* Barre latérale avec animation fluide */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FBF9F3] dark:bg-black border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          transitionProperty: 'transform',
          willChange: 'transform',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        role="navigation"
        aria-label="Menu principal"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-[17.8px] border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">CMFI Replay</h2>
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Fermer le menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Champ de recherche */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <Link
              to="/search"
              onClick={onClose}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-sm"
            >
              <span className="text-gray-500 dark:text-gray-400">{t('search')}</span>
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          <ul className="space-y-1 px-2">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={(e) => {
                    onClose();
                    if (item.onClick) {
                      item.onClick(e);
                    }
                  }}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50 text-gray-700"
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="ml-3">{item.label}</span>
                </Link>
              </li>
            ))}
            {/* Bouton d'administration (toujours visible) */}
            {menuItems.find(item => item.isAdmin) && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Administration
                </p>
                {menuItems
                  .filter(item => item.isAdmin)
                  .map((item) => (
                    <a
                      key={item.id}
                      href="#"
                      onClick={item.onClick}
                      className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <span className="w-5 mr-3 flex items-center justify-center">{item.icon}</span>
                      {item.label}
                    </a>
                  ))}
              </div>
            )}
          </ul>
        </nav>

        {/* Espace vide en bas pour laisser de la marge */}
        <div className="mt-auto py-2"></div>

        {/* User section */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span className="flex items-center justify-center w-5 mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </span>
            <span>{t('profile')}</span>
          </Link>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
