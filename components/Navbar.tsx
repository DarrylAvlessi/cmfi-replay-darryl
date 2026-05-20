import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Navbar: React.FC = () => {
  const { t } = useAppContext();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      label: t('home'),
      path: '/home',
    },
    {
      id: 'movies',
      label: t('categoryMovies'),
      path: '/movies',
    },
    {
      id: 'series',
      label: t('categorySeries'),
      path: '/series',
    },
    {
      id: 'podcasts',
      label: t('categoryPodcasts'),
      path: '/podcasts',
    },
    {
      id: 'bookmarks',
      label: t('myFavorites'),
      path: '/bookmarks',
    },
    {
      id: 'history',
      label: t('history'),
      path: '/history',
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="hidden lg:flex items-center space-x-1">
      {navItems.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            isActive(item.path)
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'
          }`}
          aria-current={isActive(item.path) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
};

export default Navbar;
