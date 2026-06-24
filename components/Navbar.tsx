import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { serieCategoryService, SerieCategory, getCategoryName } from '../lib/db';

const Navbar: React.FC = () => {
  const { t, language } = useAppContext();
  const location = useLocation();
  const [categories, setCategories] = useState<SerieCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const cats = await serieCategoryService.getAllCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories in Navbar:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const navItems = [
    {
      id: 'home',
      label: t('home'),
      path: '/home',
    },
    {
      id: 'movies',
      label: t('categoryMovies'),
      path: '/documentaries',
    },
    {
      id: 'podcasts',
      label: t('categoryPodcasts'),
      path: '/podcasts',
    },
  ];

  const donateItem = {
    id: 'donate',
    label: t('donate') || 'Donate',
    path: '/donate',
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="hidden lg:flex items-center space-x-1" data-tour="sidebar-categories">
      {navItems.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive(item.path)
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-black/50'
            }`}
          aria-current={isActive(item.path) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}

      <div className="relative group">
        <Link
          to="/productions"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1 ${isActive('/productions')
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-black/50'
            }`}
          aria-current={isActive('/productions') ? 'page' : undefined}
        >
          {t('categorySeries')}
          <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Link>

        <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-black rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
          {categoriesLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              {t('loading') || 'Chargement...'}
            </div>
          ) : (
            <ul className="py-2">
              {categories.length > 0 && categories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/productions?category=${category.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
                    />
                    {getCategoryName(category, language)}
                  </Link>
                </li>
              ))}
              {categories.length > 0 && (
                <li className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                  <Link
                    to="/productions"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    {t('viewAll') || 'Voir tout'}
                  </Link>
                </li>
              )}
              {categories.length === 0 && (
                <li>
                  <Link
                    to="/productions"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {t('viewAll') || 'Voir tout'}
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <Link
        to={donateItem.path}
        className={`ml-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-1.5 ${isActive(donateItem.path)
            ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/40'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105'
          }`}
        aria-current={isActive(donateItem.path) ? 'page' : undefined}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        {donateItem.label}
      </Link>
    </nav>
  );
};

export default Navbar;
