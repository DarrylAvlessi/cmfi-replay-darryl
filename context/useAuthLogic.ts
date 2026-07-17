import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { userService, UserProfile, bookDocService, bookSeriesService } from '../lib/db';
import { onAuthStateChanged } from 'firebase/auth';

interface UseAuthLogicParams {
    language: 'en' | 'fr';
}

export function useAuthLogic({ language }: UseAuthLogicParams) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
    const profileSnapshotRef = useRef<string | null>(null);
    const lastPresenceRef = useRef<{ uid: string; status: string } | null>(null);

    const updateUserPresence = useCallback(async (uid: string, status: 'online' | 'offline' | 'idle' | 'away') => {
        if (lastPresenceRef.current?.uid === uid && lastPresenceRef.current?.status === status) return;
        try {
            await userService.updateUserProfile(uid, {
                presence: status,
                lastSeen: new Date()
            });
            lastPresenceRef.current = { uid, status };
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut de présence:', error);
        }
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        updateUserPresence(user.uid, userProfile?.presence || 'online');

        const heartbeatInterval = setInterval(async () => {
            if (user?.uid && document.visibilityState === 'visible') {
                try {
                    await userService.updateUserProfile(user.uid, {
                        lastSeen: new Date()
                    });
                } catch (error) {
                    console.error('Erreur lors du heartbeat:', error);
                }
            }
        }, 300000);

        const handleVisibilityChange = async () => {
            if (user && user.uid) {
                if (document.visibilityState === 'visible') {
                    await updateUserPresence(user.uid, 'online');
                } else {
                    await updateUserPresence(user.uid, 'away');
                }
            }
        };

        const handleBeforeUnload = () => {
            if (user?.uid) {
                try {
                    if (navigator.sendBeacon) {
                    }
                    userService.updateUserProfile(user.uid, {
                        presence: 'offline',
                        lastSeen: new Date()
                    }).catch(() => {});
                } catch (error) {
                }
            }
        };

        const handlePageHide = async () => {
            if (user?.uid) {
                try {
                    await userService.updateUserProfile(user.uid, {
                        presence: 'offline',
                        lastSeen: new Date()
                    });
                } catch (error) {
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            clearInterval(heartbeatInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [user, updateUserPresence]);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUser(currentUser);
            setIsAuthenticated(true);
        }

        let unsubscribeProfile: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log(' État d\'authentification changé:', user ? `Utilisateur connecté: ${user.uid}` : 'Déconnecté');
            setUser(user);
            setIsAuthenticated(!!user);
            setLoading(true);

            if (user) {
                try {
                    await updateUserPresence(user.uid, 'online');

                    const profile = await userService.getUserProfile(user.uid);
                    if (profile) {
                        setUserProfile(profile);
                        setBookmarkedIds(profile.bookmarkedIds || []);

                        const bookDocs = await bookDocService.getUserBookmarks(user.email!);
                        const bookSeries = await bookSeriesService.getUserBookmarks(user.email!);
                        const allBookmarkIds = [
                            ...bookDocs.map(doc => doc.uid),
                            ...bookSeries.map(series => series.uid)
                        ];
                        setBookmarkedIds(allBookmarkIds);

                    } else {
                        await userService.createUserProfile({
                            uid: user.uid,
                            email: user.email || '',
                            display_name: user.displayName || 'User',
                            photo_url: user.photoURL || undefined,
                            presence: 'online',
                            hasAcceptedPrivacyPolicy: false,
                            created_time: new Date().toISOString(),
                            theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
                            language,
                            bookmarkedIds: []
                        });
                    }

                    const userProfileRef = doc(db, 'users', user.uid);
                    unsubscribeProfile = onSnapshot(userProfileRef, (snapshot) => {
                        if (snapshot.exists()) {
                            const updatedProfile = snapshot.data() as UserProfile;
                            const profileJson = JSON.stringify(updatedProfile);
                            if (profileSnapshotRef.current === profileJson) return;
                            profileSnapshotRef.current = profileJson;
                            console.log('🔄 Profil mis à jour en temps réel - isAdmin:', updatedProfile.isAdmin, 'Type:', typeof updatedProfile.isAdmin);
                            setUserProfile(updatedProfile);
                        }
                    }, (error) => {
                        console.error('Erreur lors de l\'écoute du profil:', error);
                    });
                } catch (error) {
                    console.error('Error loading user profile:', error);
                }
            } else {
                if (unsubscribeProfile) {
                    unsubscribeProfile();
                    unsubscribeProfile = null;
                }

                if (userProfile?.uid) {
                    try {
                        await userService.updateUserProfile(userProfile.uid, {
                            presence: 'offline',
                            lastSeen: new Date()
                        });
                    } catch (error) {
                        console.error('Erreur lors de la mise à jour du statut hors ligne:', error);
                    }
                }
                setUserProfile(null);
                setBookmarkedIds([]);
            }

            setLoading(false);
        });

        return () => {
            if (userProfile?.uid) {
                updateUserPresence(userProfile.uid, 'offline').catch(console.error);
            }
            if (unsubscribeProfile) {
                unsubscribeProfile();
            }
            unsubscribe();
        };
    }, []);

    const toggleBookmark = async (id: string, title: string, description: string, image: string, isseries: boolean = false) => {
        if (!user || !user.email) return;

        try {
            const isBookmarked = await bookDocService.toggleBookmark(
                id,
                user.email,
                title,
                description,
                image,
                isseries
            );

            setBookmarkedIds(prev =>
                isBookmarked
                    ? [...prev, id]
                    : prev.filter(bookmarkedId => bookmarkedId !== id)
            );

            await userService.toggleBookmark(user.uid, id);
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    const toggleSeriesBookmark = async (
        id: string,
        title: string,
        description: string,
        image: string,
        moviepath: string,
        runtime: string
    ) => {
        if (!user || !user.email) return;

        try {
            const isBookmarked = await bookSeriesService.toggleBookmark(
                id,
                user.email,
                title,
                description,
                image,
                moviepath,
                runtime
            );

            setBookmarkedIds(prev =>
                isBookmarked
                    ? [...prev, id]
                    : prev.filter(bookmarkedId => bookmarkedId !== id)
            );

            await userService.toggleBookmark(user.uid, id);
        } catch (error) {
            console.error('Error toggling series bookmark:', error);
        }
    };

    return {
        isAuthenticated, setIsAuthenticated,
        user, setUser,
        userProfile, setUserProfile,
        loading,
        bookmarkedIds,
        toggleBookmark,
        toggleSeriesBookmark,
        updateUserPresence,
    };
}
