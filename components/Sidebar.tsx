import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { updateEpisodeViews, serieCategoryService, SerieCategory, getCategoryName } from '../lib/db';
import { toast } from 'react-toastify';
import { ActiveTab } from '../types';
import cmfiLogo from '../cmfireplay.svg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t, language } = useAppContext();
  const location = useLocation();
  const [categories, setCategories] = useState<SerieCategory[]>([]);
  const [isSeriesMenuOpen, setIsSeriesMenuOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const cats = await serieCategoryService.getAllCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories in Sidebar:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (isOpen && location.pathname === '/productions') {
      setIsSeriesMenuOpen(true);
    }
  }, [isOpen, location.pathname]);

  interface MenuItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    isAdmin?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    isSeries?: boolean;
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
      path: '/documentaries',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: 'series',
      label: t('categorySeries'),
      path: '/productions',
      isSeries: true,
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
      id: 'donate',
      label: t('donate') || 'Donate',
      path: '/donate',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
  ];

  const filteredMenuItems = menuItems;

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentCategoryFromUrl = location.search ? 
    new URLSearchParams(location.search).get('category') : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} lg:opacity-0 lg:pointer-events-none`}
        onClick={onClose}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300" />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-black flex flex-col h-full transition-all duration-300 ease-out ${
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
        <div className="flex items-center justify-between px-4 py-[17.8px] border-b border-gray-200 dark:border-black">
          <img src={cmfiLogo} alt="CMFI Replay" className="h-8 rounded-md" />
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

        <div className="px-4 py-3 border-b border-gray-200 dark:border-black">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <Link
              to="/search"
              onClick={onClose}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent sm:text-sm"
            >
              <span className="text-gray-500 dark:text-gray-400">{t('search')}</span>
            </Link>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2" data-tour="sidebar-categories">
          <ul className="space-y-1 px-2">
            {filteredMenuItems.map((item) => (
              <li key={item.id}>
                {item.isSeries ? (
                  <div>
                    <button
                      onClick={() => setIsSeriesMenuOpen(!isSeriesMenuOpen)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-black/50 text-gray-700 ${
                        isActive(item.path) ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100' : ''
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className="ml-3">{item.label}</span>
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${isSeriesMenuOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isSeriesMenuOpen && (
                      <ul className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                        {categoriesLoading ? (
                          <li>
                            <span className="block px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {t('loading') || 'Chargement...'}
                            </span>
                          </li>
                        ) : (
                          <>
                            {categories.length > 0 && categories.map((category) => (
                              <li key={category.id}>
                                <Link
                                  to={`/productions?category=${category.id}`}
                                  onClick={onClose}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    currentCategoryFromUrl === category.id
                                      ? 'text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20'
                                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-black/50'
                                  }`}
                                >
                                  <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: category.color || '#3B82F6' }}
                                  />
                                  {getCategoryName(category, language)}
                                </Link>
                              </li>
                            ))}
                            <li>
                              <Link
                                to="/productions"
                                onClick={onClose}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isActive('/productions') && !currentCategoryFromUrl
                                    ? 'text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-black/50'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                {t('viewAll') || 'Voir tout'}
                              </Link>
                            </li>
                          </>
                        )}
                      </ul>
                    )}
                  </div>
                ) : item.id === 'donate' ? (
                  <Link
                    to={item.path}
                    onClick={(e) => {
                      onClose();
                      if (item.onClick) {
                        item.onClick(e);
                      }
                    }}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/40'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 hover:scale-[1.02]'
                    }`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="ml-3">{item.label}</span>
                  </Link>
                ) : (
                  <Link
                    to={item.path}
                    onClick={(e) => {
                      onClose();
                      if (item.onClick) {
                        item.onClick(e);
                      }
                    }}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-black/50 text-gray-700 ${
                      isActive(item.path) ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100' : ''
                    }`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="ml-3">{item.label}</span>
                  </Link>
                )}
              </li>
            ))}

            {menuItems.find(item => item.isAdmin) && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="px-4 text-xs font-serif font-semibold text-gray-500 uppercase tracking-wider mb-2">
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

        <div className="mt-auto py-2"></div>

        <div className="p-2 border-t border-gray-200 dark:border-black">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-black"
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
