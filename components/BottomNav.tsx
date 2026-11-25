import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ActiveTab } from '../types';
import { useAppContext } from '../context/AppContext';

const BottomNav: React.FC = () => {
  const { setActiveTab, t } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: ActiveTab.Home,
      label: t('home'),
      path: '/home',
      icon: (isActive: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill={isActive ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isActive ? 0 : 1.9}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: ActiveTab.Search,
      label: t('search'),
      path: '/search',
      icon: (isActive: boolean) => (
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
            strokeWidth={isActive ? 2.4 : 1.9}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      id: ActiveTab.Profile,
      label: t('profile'),
      path: '/profile',
      icon: (isActive: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill={isActive ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={isActive ? 0 : 1.9}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="shell-bar rounded-2xl p-1.5" data-tour="bottom-nav">
      <div className="flex justify-around items-center gap-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                navigate(tab.path);
              }}
              className={`flex items-center justify-center gap-2 flex-1 h-11 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-900/5 dark:hover:bg-white/5'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon(isActive)}
              <span className="text-xs font-semibold tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default React.memo(BottomNav);
