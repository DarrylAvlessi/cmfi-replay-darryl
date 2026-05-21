import React, { useState } from 'react';
import { useAppContext, HomeViewMode } from '../context/AppContext';

const ViewModeSelector: React.FC = () => {
    const { homeViewMode, setHomeViewMode } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);

    const modes: { value: HomeViewMode; label: string; icon: React.ReactNode }[] = [
        {
            value: 'default',
            label: 'Classique',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            value: 'prime',
            label: 'Prime Video',
            icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            value: 'netflix',
            label: 'Netflix',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.924-5.923-16.747-8.487-24zm8.489 0v9.63L18.6 22.951c-.043-7.923-.006-15.71-.002-22.95zM5.398 1.05V24c1.873-.225 2.81-.312 4.715-.398v-9.22z" />
                </svg>
            )
        }
    ];

    const currentMode = modes.find(m => m.value === homeViewMode);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleModeSelect = (mode: HomeViewMode) => {
        setHomeViewMode(mode);
        setIsOpen(false);
    };

    return (
        <div className="relative" style={{ zIndex: isOpen ? 1000 : 'auto' }}>
            <button
                onClick={handleToggle}
                className={`w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-black transition-colors ${
                    homeViewMode === 'default'
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : ''
                }`}
                title="Changer le mode d'affichage"
                aria-label="Changer le mode d'affichage"
            >
                <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                        homeViewMode === 'default'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                        {currentMode?.icon}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">Mode d'affichage</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{currentMode?.label}</span>
                    <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-[999]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div 
                        className="absolute top-full left-0 right-0 mt-2 w-full bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden z-[1000]"
                        style={{ position: 'absolute' }}
                    >
                        {modes.map((mode) => (
                            <button
                                key={mode.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleModeSelect(mode.value);
                                }}
                                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer ${
                                    homeViewMode === mode.value
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <span className={homeViewMode === mode.value ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}>
                                    {mode.icon}
                                </span>
                                <span className="font-medium">{mode.label}</span>
                                {homeViewMode === mode.value && (
                                    <svg className="w-4 h-4 ml-auto text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ViewModeSelector;

