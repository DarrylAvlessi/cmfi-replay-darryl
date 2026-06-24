import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ActiveTab } from '../types';
import { useAppContext } from '../context/AppContext';

const BottomNav: React.FC = () => {
    const { activeTab, setActiveTab } = useAppContext();
    const { t } = useAppContext();
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
                    className={`h-6 w-6 ${isActive ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}
                    fill={isActive ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
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
                    className={`h-6 w-6 ${isActive ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}
                    fill={isActive ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
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
                    className={`h-6 w-6 ${isActive ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}
                    fill={isActive ? 'currentColor' : 'none'}
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
            ),
        },
    ];

    return (
        <nav className="bg-white dark:bg-black border-t border-gray-200 dark:border-black shadow-lg" data-tour="bottom-nav">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                navigate(tab.path);
                            }}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${isActive ? 'bg-amber-50 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                                }`}
                            aria-label={tab.label}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            {tab.icon(isActive)}
                            <span
                                className={`text-xs mt-1 font-medium ${isActive ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'
                                    }`}
                            >
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default React.memo(BottomNav);
