import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { appSettingsService } from '../lib/db';
import { ActiveTab } from '../types';
import { APP_VERSION } from '../lib/version';
import { RELEASE_NOTES, ReleaseNoteItem, isVersionNewerThan } from '../lib/releaseNotes';
import { UserProfile } from '../lib/db';

type HomeViewMode = 'default' | 'prime' | 'netflix';

export function useUIState(userProfile: UserProfile | null, user: any) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const savedState = window.localStorage.getItem('sidebarCollapsed');
            return savedState === 'true';
        }
        return false;
    });

    const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.Home);

    const [autoplay, setAutoplayState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const savedAutoplay = window.localStorage.getItem('autoplay');
            return savedAutoplay === 'true';
        }
        return false;
    });

    const setAutoplay = (value: boolean) => {
        setAutoplayState(value);
        localStorage.setItem('autoplay', String(value));
    };

    const [homeViewMode, setHomeViewModeState] = useState<HomeViewMode>('default');

    useEffect(() => {
        const loadViewMode = async () => {
            try {
                const settings = await appSettingsService.getAppSettings();
                if (settings) {
                    setHomeViewModeState(settings.homeViewMode);
                }
            } catch (error) {
                console.error('Error loading view mode:', error);
                if (typeof window !== 'undefined') {
                    const saved = window.localStorage.getItem('homeViewMode') as HomeViewMode;
                    if (saved) {
                        setHomeViewModeState(saved);
                    }
                }
            }
        };
        loadViewMode();
    }, []);

    useEffect(() => {
        const settingsRef = doc(db, 'appSettings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.homeViewMode) {
                    setHomeViewModeState(data.homeViewMode);
                }
            }
        }, (error) => {
            console.error('Error listening to view mode changes:', error);
        });
        return () => unsubscribe();
    }, []);

    const setHomeViewMode = async (mode: HomeViewMode) => {
        setHomeViewModeState(mode);
        if (userProfile?.isAdmin && user) {
            try {
                await appSettingsService.setHomeViewMode(mode, user.uid);
            } catch (error) {
                console.error('Error saving view mode to Firestore:', error);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem('homeViewMode', mode);
                }
            }
        } else {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('homeViewMode', mode);
            }
        }
    };

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const [newReleaseNotes, setNewReleaseNotes] = useState<ReleaseNoteItem[]>([]);
    const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);

    useEffect(() => {
        const ls = localStorage.getItem('lastSeenVersion');
        setLastSeenVersion(ls);
        if (ls && ls !== APP_VERSION) {
            const filtered = RELEASE_NOTES.filter((note) => isVersionNewerThan(note.version, ls));
            if (filtered.length > 0) {
                setShowWhatsNew(true);
                setNewReleaseNotes(filtered);
            }
        }
        if (!ls) {
            localStorage.setItem('lastSeenVersion', APP_VERSION);
            setLastSeenVersion(APP_VERSION);
        }
    }, []);

    const markWhatsNewSeen = useCallback(() => {
        localStorage.setItem('lastSeenVersion', APP_VERSION);
        setLastSeenVersion(APP_VERSION);
        setShowWhatsNew(false);
    }, []);

    return {
        isSidebarCollapsed, setIsSidebarCollapsed,
        toggleSidebarCollapse,
        activeTab, setActiveTab,
        autoplay, setAutoplay,
        homeViewMode, setHomeViewMode,
        showWhatsNew, markWhatsNewSeen,
        newReleaseNotes, lastSeenVersion,
    };
}
