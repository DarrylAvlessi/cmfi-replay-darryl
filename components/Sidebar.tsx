import * as React from 'react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { serieCategoryService, SerieCategory, getCategoryName } from '../lib/db';
import { ActiveTab } from '../types';
import cmfiLogo from '../cmfireplay.svg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t, language, isSidebarCollapsed, toggleSidebarCollapse } = useAppContext();
  const location = useLocation();
  const [categories, setCategories] = useState<SerieCategory[]>([]);
  const [isSeriesMenuOpen, setIsSeriesMenuOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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
    if ((isOpen || !isSidebarCollapsed) && location.pathname === '/productions') {
      setIsSeriesMenuOpen(true);
    }
  }, [isOpen, isSidebarCollapsed, location.pathname]);

  interface MenuItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    isSeries?: boolean;
  }

  const primaryItems: MenuItem[] = [
    {
      id: 'home',
      label: t('home'),
      path: '/home',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'movies',
      label: t('categoryMovies'),
      path: '/documentaries',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      ),
    },
    {
      id: 'series',
      label: t('categorySeries'),
      path: '/productions',
      isSeries: true,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'podcasts',
      label: t('categoryPodcasts'),
      path: '/podcasts',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
  ];

  const libraryItems: MenuItem[] = [
    {
      id: 'search',
      label: t('search'),
      path: '/search',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'bookmarks',
      label: t('myFavorites'),
      path: '/bookmarks',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: t('history'),
      path: '/history',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => {
    if (path === '/bookmarks' && location.pathname === '/favorites') return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const currentCategoryFromUrl = location.search
    ? new URLSearchParams(location.search).get('category')
    : null;

  return (
    <>
      {/* ================= DESKTOP BROADCAST ICON-RAIL ================= */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-30 flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#080d1a]/95 backdrop-blur-xl transition-all duration-300 ease-out ${
          isSidebarCollapsed ? 'w-[76px]' : 'w-[244px]'
        }`}
        aria-label="Navigation principale"
      >
        {/* Brand Header */}
        <div className={`flex items-center h-16 border-b border-slate-200/70 dark:border-slate-800/80 ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          <Link to="/home" className="flex items-center gap-3 min-w-0 group">
            <div className="relative flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden ring-1 ring-slate-900/10 dark:ring-white/15 shadow-md shadow-blue-600/15 group-hover:ring-sky-400/50 transition-all">
              <img src={cmfiLogo} alt="CMFI Replay" className="w-full h-full object-cover" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                  CMFI <span className="text-sky-500">Replay</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono-meta uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Broadcast
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Links */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-6 scrollbar-thin"
          data-tour={isDesktop ? 'sidebar-categories' : undefined}
        >
          {/* Primary Channels */}
          <div>
            {!isSidebarCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-mono-meta font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {t('browse') || 'Découvrir'}
              </p>
            )}
            <ul className="space-y-1">
              {primaryItems.map((item) => {
                const active = isActive(item.path);
                if (item.isSeries) {
                  return (
                    <li key={item.id} className="relative group/series">
                      <div className="flex items-center">
                        <Link
                          to={item.path}
                          title={isSidebarCollapsed ? item.label : undefined}
                          className={`relative flex items-center flex-1 rounded-xl transition-all duration-200 ${
                            isSidebarCollapsed ? 'justify-center h-11 px-0' : 'px-3 py-2.5 gap-3'
                          } ${
                            active
                              ? 'bg-blue-600/12 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {active && (
                            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-600 dark:bg-sky-400" />
                          )}
                          <span className="flex-shrink-0">{item.icon}</span>
                          {!isSidebarCollapsed && <span className="text-sm truncate flex-1">{item.label}</span>}
                        </Link>
                        {!isSidebarCollapsed && (
                          <button
                            type="button"
                            onClick={() => setIsSeriesMenuOpen(!isSeriesMenuOpen)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            aria-label="Toggle categories"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${isSeriesMenuOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Expanded inline categories */}
                      {!isSidebarCollapsed && isSeriesMenuOpen && (
                        <ul className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 dark:border-slate-800 pl-3">
                          {categoriesLoading ? (
                            <li className="px-2.5 py-1.5 text-xs text-slate-400">
                              {t('loading') || 'Chargement...'}
                            </li>
                          ) : (
                            <>
                              {categories.map((category) => (
                                <li key={category.id}>
                                  <Link
                                    to={`/productions?category=${category.id}`}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                      currentCategoryFromUrl === category.id
                                        ? 'text-blue-600 dark:text-sky-400 font-semibold bg-blue-500/10'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/[0.05]'
                                    }`}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: category.color || '#27A7DE' }}
                                    />
                                    <span className="truncate">{getCategoryName(category, language)}</span>
                                  </Link>
                                </li>
                              ))}
                              <li>
                                <Link
                                  to="/productions"
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                                    active && !currentCategoryFromUrl
                                      ? 'text-blue-600 dark:text-sky-400 font-semibold'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  }`}
                                >
                                  {t('viewAll') || 'Voir tout'}
                                </Link>
                              </li>
                            </>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`relative flex items-center rounded-xl transition-all duration-200 ${
                        isSidebarCollapsed ? 'justify-center h-11 px-0' : 'px-3 py-2.5 gap-3'
                      } ${
                        active
                          ? 'bg-blue-600/12 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-600 dark:bg-sky-400" />
                      )}
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!isSidebarCollapsed && <span className="text-sm truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Library */}
          <div>
            {!isSidebarCollapsed && (
              <p className="px-3 mb-2 text-[10px] font-mono-meta font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {t('library') || 'Bibliothèque'}
              </p>
            )}
            <ul className="space-y-1">
              {libraryItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`relative flex items-center rounded-xl transition-all duration-200 ${
                        isSidebarCollapsed ? 'justify-center h-11 px-0' : 'px-3 py-2.5 gap-3'
                      } ${
                        active
                          ? 'bg-blue-600/12 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-blue-600 dark:bg-sky-400" />
                      )}
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!isSidebarCollapsed && <span className="text-sm truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Bottom Actions: Donate + Help + Collapse Toggle */}
        <div className="p-2.5 border-t border-slate-200/70 dark:border-slate-800/80 space-y-1.5">
          <Link
            to="/donate"
            title={isSidebarCollapsed ? (t('donate') || 'Donate') : undefined}
            className={`flex items-center rounded-xl font-semibold text-sm transition-all duration-200 ${
              isSidebarCollapsed ? 'justify-center h-11 px-0' : 'px-3 py-2.5 gap-3'
            } ${
              isActive('/donate')
                ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-600/25'
                : 'bg-blue-600/10 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400 hover:bg-blue-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-slate-950'
            }`}
          >
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {!isSidebarCollapsed && <span className="truncate">{t('donate') || 'Soutenir'}</span>}
          </Link>

          <Link
            to="/help"
            title={isSidebarCollapsed ? t('help') : undefined}
            className={`flex items-center rounded-xl text-sm transition-colors ${
              isSidebarCollapsed ? 'justify-center h-10 px-0' : 'px-3 py-2 gap-3'
            } ${
              isActive('/help')
                ? 'bg-slate-900/5 dark:bg-white/10 text-slate-900 dark:text-white font-medium'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/[0.05]'
            }`}
          >
            <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {!isSidebarCollapsed && <span className="truncate">{t('help')}</span>}
          </Link>

          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className={`w-full flex items-center rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/[0.05] transition-colors ${
              isSidebarCollapsed ? 'justify-center h-10 px-0' : 'px-3 py-2 gap-3'
            }`}
            aria-label={isSidebarCollapsed ? 'Déplier la barre latérale' : 'Réduire la barre latérale'}
          >
            <svg
              className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isSidebarCollapsed && <span className="truncate">{t('collapse') || 'Réduire'}</span>}
          </button>
        </div>
      </aside>

      {/* ================= MOBILE SLIDE-OVER DRAWER ================= */}
      <div className="lg:hidden">
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
        </div>

        <div
          className={`fixed inset-y-3 left-3 z-50 w-[18.5rem] rounded-3xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-[120%]'
          }`}
          role="navigation"
          aria-label="Menu principal"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200/70 dark:border-slate-800">
            <Link to="/home" onClick={onClose} className="flex items-center gap-2.5">
              <img src={cmfiLogo} alt="CMFI Replay" className="h-8 w-8 rounded-lg object-cover" />
              <div>
                <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                  CMFI <span className="text-sky-500">Replay</span>
                </div>
                <div className="text-[10px] font-mono-meta uppercase tracking-widest text-slate-400">
                  Streaming
                </div>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Fermer le menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 pt-3 pb-2">
            <Link
              to="/search"
              onClick={onClose}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-sm"
            >
              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <span>{t('search')}...</span>
            </Link>
          </div>

          <nav
            className="flex-1 overflow-y-auto py-2 px-3 space-y-4"
            data-tour={!isDesktop ? 'sidebar-categories' : undefined}
          >
            <ul className="space-y-1">
              {primaryItems.map((item) => {
                const active = isActive(item.path);
                if (item.isSeries) {
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setIsSeriesMenuOpen(!isSeriesMenuOpen)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-blue-600/12 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isSeriesMenuOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isSeriesMenuOpen && (
                        <ul className="ml-5 mt-1 space-y-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                          {categoriesLoading ? (
                            <li className="px-3 py-1.5 text-xs text-slate-400">{t('loading') || 'Chargement...'}</li>
                          ) : (
                            <>
                              {categories.map((category) => (
                                <li key={category.id}>
                                  <Link
                                    to={`/productions?category=${category.id}`}
                                    onClick={onClose}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                      currentCategoryFromUrl === category.id
                                        ? 'text-blue-600 dark:text-sky-400 font-semibold bg-blue-500/10'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: category.color || '#27A7DE' }}
                                    />
                                    {getCategoryName(category, language)}
                                  </Link>
                                </li>
                              ))}
                              <li>
                                <Link
                                  to="/productions"
                                  onClick={onClose}
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                >
                                  {t('viewAll') || 'Voir tout'}
                                </Link>
                              </li>
                            </>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.id}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-blue-600/12 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
              <ul className="space-y-1">
                {libraryItems.slice(1).map((item) => {
                  const active = isActive(item.path);
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          active
                            ? 'bg-blue-600/12 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <div className="p-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
            <Link
              to="/donate"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{t('donate') || 'Donate'}</span>
            </Link>
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.85} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t('profile')}</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
