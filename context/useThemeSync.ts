import { useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { userService } from '../lib/db';
import { Theme } from './useTheme';

interface UseThemeSyncParams {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    user: User | null;
}

export function useThemeSync({ theme, setTheme, user }: UseThemeSyncParams) {
    const themeRef = useRef(theme);
    themeRef.current = theme;
    const isLocalChangeRef = useRef(false);

    useEffect(() => {
        if (!user?.uid) return;

        let unsubscribeProfile: (() => void) | null = null;

        const loadProfileAndSubscribe = async () => {
            try {
                const profile = await userService.getUserProfile(user.uid);
                if (profile?.theme && profile.theme !== themeRef.current) {
                    setTheme(profile.theme);
                }

                const userProfileRef = doc(db, 'users', user.uid);
                unsubscribeProfile = onSnapshot(userProfileRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data() as { theme?: Theme };
                        if (data.theme && data.theme !== themeRef.current && !isLocalChangeRef.current) {
                            setTheme(data.theme);
                        }
                    }
                });
            } catch (error) {
                console.error('Error syncing theme from Firestore:', error);
            }
        };

        loadProfileAndSubscribe();

        return () => {
            unsubscribeProfile?.();
        };
    }, [user?.uid, setTheme]);

    const updateTheme = useCallback(async (newTheme: Theme) => {
        if (themeRef.current === newTheme) return;

        isLocalChangeRef.current = true;
        setTheme(newTheme);

        if (user) {
            try {
                await userService.updateUserProfile(user.uid, { theme: newTheme });
            } catch (error) {
                console.error('Failed to update theme in Firestore:', error);
            }
        }

        setTimeout(() => {
            isLocalChangeRef.current = false;
        }, 1000);
    }, [setTheme, user]);

    return { updateTheme };
}
