import React, { createContext, useContext, useMemo } from 'react';
import { Language, TranslationKey } from '../lib/i18n';
import { UserProfile } from '../lib/db';
import { User } from 'firebase/auth';
import { ActiveTab } from '../types';
import { ReleaseNoteItem } from '../lib/releaseNotes';
import { useNetworkStatus, ConnectionQuality } from '../hooks/useNetworkStatus';
import { useTheme } from './useTheme';
import { useThemeSync } from './useThemeSync';
import { useLanguage } from './useLanguage';
import { useAuthLogic } from './useAuthLogic';
import { useUIState } from './useUIState';

type HomeViewMode = 'default' | 'prime' | 'netflix';

interface AppContextType {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: TranslationKey, vars?: Record<string, string>) => string;
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuth: boolean) => void;
    bookmarkedIds: string[];
    toggleBookmark: (id: string, title: string, description: string, image: string, isseries?: boolean) => Promise<void>;
    toggleSeriesBookmark: (id: string, title: string, description: string, image: string, moviepath: string, runtime: string) => Promise<void>;
    user: User | null;
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile | null) => void;
    loading: boolean;
    autoplay: boolean;
    setAutoplay: (value: boolean) => void;
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (value: boolean) => void;
    toggleSidebarCollapse: () => void;
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    homeViewMode: HomeViewMode;
    setHomeViewMode: (mode: HomeViewMode) => void;
    showWhatsNew: boolean;
    markWhatsNewSeen: () => void;
    newReleaseNotes: ReleaseNoteItem[];
    lastSeenVersion: string | null;
    connectionQuality: ConnectionQuality;
    effectiveType: string;
    saveData: boolean;
}

export type { HomeViewMode };

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const authLogic = useAuthLogic({ language });
    const { updateTheme } = useThemeSync({ theme, setTheme, user: authLogic.user });
    const uiState = useUIState(authLogic.userProfile, authLogic.user);
    const { connectionQuality, effectiveType, saveData } = useNetworkStatus();

    const value = useMemo(() => ({
        theme,
        setTheme: updateTheme,
        language,
        setLanguage,
        t,
        isAuthenticated: authLogic.isAuthenticated,
        setIsAuthenticated: authLogic.setIsAuthenticated,
        bookmarkedIds: authLogic.bookmarkedIds,
        toggleBookmark: authLogic.toggleBookmark,
        toggleSeriesBookmark: authLogic.toggleSeriesBookmark,
        user: authLogic.user,
        userProfile: authLogic.userProfile,
        setUserProfile: authLogic.setUserProfile,
        loading: authLogic.loading,
        autoplay: uiState.autoplay,
        setAutoplay: uiState.setAutoplay,
        isSidebarCollapsed: uiState.isSidebarCollapsed,
        setIsSidebarCollapsed: uiState.setIsSidebarCollapsed,
        toggleSidebarCollapse: uiState.toggleSidebarCollapse,
        activeTab: uiState.activeTab,
        setActiveTab: uiState.setActiveTab,
        homeViewMode: uiState.homeViewMode,
        setHomeViewMode: uiState.setHomeViewMode,
        showWhatsNew: uiState.showWhatsNew,
        markWhatsNewSeen: uiState.markWhatsNewSeen,
        newReleaseNotes: uiState.newReleaseNotes,
        lastSeenVersion: uiState.lastSeenVersion,
        connectionQuality,
        effectiveType,
        saveData,
    }), [
        theme,
        language,
        t,
        authLogic.isAuthenticated,
        authLogic.setIsAuthenticated,
        authLogic.bookmarkedIds,
        authLogic.toggleBookmark,
        authLogic.toggleSeriesBookmark,
        authLogic.user,
        authLogic.userProfile,
        authLogic.setUserProfile,
        authLogic.loading,
        uiState.autoplay,
        uiState.setAutoplay,
        uiState.isSidebarCollapsed,
        uiState.setIsSidebarCollapsed,
        uiState.toggleSidebarCollapse,
        uiState.activeTab,
        uiState.setActiveTab,
        uiState.homeViewMode,
        uiState.setHomeViewMode,
        uiState.showWhatsNew,
        uiState.markWhatsNewSeen,
        uiState.newReleaseNotes,
        uiState.lastSeenVersion,
        connectionQuality,
        effectiveType,
        saveData,
        setLanguage,
    ]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};