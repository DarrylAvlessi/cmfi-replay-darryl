import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { Language, TranslationKey } from '../lib/i18n';
import { userService, UserProfile } from '../lib/db';
import { User } from 'firebase/auth';
import { ActiveTab } from '../types';
import { ReleaseNoteItem } from '../lib/releaseNotes';
import { useNetworkStatus, ConnectionQuality } from '../hooks/useNetworkStatus';
import { useThemeLogic } from './useThemeLogic';
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
    swUpdateAvailable: boolean;
    swUpdateDismissed: boolean;
    applyUpdate: () => void;
    dismissUpdate: () => void;
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
    const { theme, setTheme, language, setLanguage, t } = useThemeLogic();
    const authLogic = useAuthLogic({ theme, language, setTheme });
    const uiState = useUIState(authLogic.userProfile, authLogic.user);
    const { connectionQuality, effectiveType, saveData } = useNetworkStatus();

    useEffect(() => {
        if (authLogic.userProfile && authLogic.user && theme !== undefined) {
            if (theme !== authLogic.userProfile.theme) {
                userService.updateUserProfile(authLogic.user.uid, { theme }).catch(() => {});
            }
        }
    }, [theme, authLogic.userProfile, authLogic.user]);

    const value = useMemo(() => ({
        theme,
        setTheme,
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
        swUpdateAvailable: uiState.swUpdateAvailable,
        swUpdateDismissed: uiState.swUpdateDismissed,
        applyUpdate: uiState.applyUpdate,
        dismissUpdate: uiState.dismissUpdate,
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
        uiState.swUpdateAvailable,
        uiState.swUpdateDismissed,
        uiState.applyUpdate,
        uiState.dismissUpdate,
        uiState.showWhatsNew,
        uiState.markWhatsNewSeen,
        uiState.newReleaseNotes,
        uiState.lastSeenVersion,
        connectionQuality,
        effectiveType,
        saveData,
        setTheme,
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