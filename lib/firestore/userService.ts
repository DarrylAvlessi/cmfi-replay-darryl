import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    startAfter,
    onSnapshot,
    Timestamp,
    arrayUnion,
    arrayRemove,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import { UserProfile } from './types';
import {
    USERS_COLLECTION,
    USER_VIEW_COLLECTION,
} from './constants';
import { getCountryName } from './utils';

export const userService = {
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return data as UserProfile;
            }
            return null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    },

    async createUserProfile(userData: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
        try {
            const userProfile: UserProfile = {
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await setDoc(doc(db, USERS_COLLECTION, userData.uid), userProfile, { merge: true });
        } catch (error) {
            console.error('Error creating user profile:', error);
            throw error;
        }
    },

    async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        try {
            const userRef = doc(db, USERS_COLLECTION, uid);
            const firestoreUpdates: any = { ...updates };
            if (updates.lastSeen instanceof Date) {
                firestoreUpdates.lastSeen = Timestamp.fromDate(updates.lastSeen);
            }

            await updateDoc(userRef, {
                ...firestoreUpdates,
                updatedAt: Timestamp.now()
            });

            const updatedDoc = await getDoc(userRef);
            return updatedDoc.data() as UserProfile;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    },

    async toggleBookmark(uid: string, movieId: string): Promise<void> {
        try {
            const userRef = doc(db, USERS_COLLECTION, uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error('User profile not found');
            }

            const userData = userDoc.data() as UserProfile;
            const bookmarkedIds = userData.bookmarkedIds || [];

            if (bookmarkedIds.includes(movieId)) {
                await updateDoc(userRef, {
                    bookmarkedIds: arrayRemove(movieId),
                    updatedAt: new Date()
                });
            } else {
                await updateDoc(userRef, {
                    bookmarkedIds: arrayUnion(movieId),
                    updatedAt: new Date()
                });
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            throw error;
        }
    },

    async getUserBookmarks(uid: string): Promise<string[]> {
        try {
            const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
            if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                return userData.bookmarkedIds || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting user bookmarks:', error);
            return [];
        }
    },

    async setAdminStatus(uid: string, isAdmin: boolean): Promise<void> {
        try {
            await this.updateUserProfile(uid, { isAdmin });
        } catch (error) {
            console.error('Error setting admin status:', error);
            throw error;
        }
    },

    async getActiveUsers(limitCount: number = 50): Promise<UserProfile[]> {
        try {
            const q = query(
                collection(db, USERS_COLLECTION),
                where('presence', 'in', ['online', 'idle']),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as UserProfile);
        } catch (error) {
            console.error('Error getting active users:', error);
            return [];
        }
    },

    async getAllUsers(limitCount: number = 1000): Promise<UserProfile[]> {
        try {
            const allUsers: UserProfile[] = [];
            let lastDoc: QueryDocumentSnapshot | null = null;
            const batchSize = 500;

            while (allUsers.length < limitCount) {
                let q;
                if (lastDoc) {
                    q = query(
                        collection(db, USERS_COLLECTION),
                        orderBy('createdAt', 'desc'),
                        startAfter(lastDoc),
                        limit(Math.min(batchSize, limitCount - allUsers.length))
                    );
                } else {
                    q = query(
                        collection(db, USERS_COLLECTION),
                        orderBy('createdAt', 'desc'),
                        limit(Math.min(batchSize, limitCount - allUsers.length))
                    );
                }

                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    break;
                }

                const batchUsers = querySnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                } as UserProfile));

                allUsers.push(...batchUsers);

                if (querySnapshot.docs.length < batchSize || allUsers.length >= limitCount) {
                    break;
                }

                lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            }

            return allUsers;
        } catch (error) {
            console.error('Error getting all users:', error);
            try {
                const q = query(
                    collection(db, USERS_COLLECTION),
                    limit(limitCount)
                );
                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                } as UserProfile));
            } catch (fallbackError) {
                console.error('Error in fallback getAllUsers:', fallbackError);
                return [];
            }
        }
    },

    subscribeToOnlineUsers(callback: (users: (UserProfile & { lastSeen?: Date | Timestamp | number; updatedAt?: Date | Timestamp })[]) => void, includeInactive: boolean = false): () => void {
        const presenceFilter = includeInactive
            ? where('presence', 'in', ['online', 'away', 'idle', 'offline'])
            : where('presence', 'in', ['online', 'away', 'idle']);

        const q = query(
            collection(db, USERS_COLLECTION),
            presenceFilter
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const now = Date.now();
            const oneMinuteAgo = now - (1 * 60 * 1000);
            const threeMinutesAgo = now - (3 * 60 * 1000);

            const users = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    const originalLastSeen = data.lastSeen;
                    let lastSeenTimestamp = 0;
                    let lastSeenOriginal: Date | Timestamp | undefined = undefined;

                    if (originalLastSeen) {
                        if (originalLastSeen instanceof Timestamp) {
                            lastSeenTimestamp = originalLastSeen.toMillis();
                            lastSeenOriginal = originalLastSeen;
                        } else if (originalLastSeen instanceof Date) {
                            lastSeenTimestamp = originalLastSeen.getTime();
                            lastSeenOriginal = originalLastSeen;
                        } else if (typeof originalLastSeen === 'object' && 'toMillis' in originalLastSeen) {
                            lastSeenTimestamp = (originalLastSeen as any).toMillis();
                            lastSeenOriginal = originalLastSeen as Timestamp;
                        } else if (typeof originalLastSeen === 'number') {
                            lastSeenTimestamp = originalLastSeen;
                            lastSeenOriginal = new Date(originalLastSeen);
                        } else {
                            try {
                                const date = new Date(originalLastSeen as any);
                                if (!isNaN(date.getTime())) {
                                    lastSeenTimestamp = date.getTime();
                                    lastSeenOriginal = date;
                                }
                            } catch (e) {
                            }
                        }
                    }

                    if (lastSeenTimestamp === 0) {
                        const updatedAt = data.updatedAt;
                        if (updatedAt) {
                            if (updatedAt instanceof Timestamp) {
                                lastSeenTimestamp = updatedAt.toMillis();
                                lastSeenOriginal = updatedAt;
                            } else if (updatedAt instanceof Date) {
                                lastSeenTimestamp = updatedAt.getTime();
                                lastSeenOriginal = updatedAt;
                            } else if (typeof updatedAt === 'object' && 'toMillis' in updatedAt) {
                                lastSeenTimestamp = (updatedAt as any).toMillis();
                                lastSeenOriginal = updatedAt as Timestamp;
                            }
                        }
                    }

                    let updatedAtOriginal: Date | Timestamp | undefined = undefined;
                    if (data.updatedAt) {
                        if (data.updatedAt instanceof Timestamp) {
                            updatedAtOriginal = data.updatedAt;
                        } else if (data.updatedAt instanceof Date) {
                            updatedAtOriginal = data.updatedAt;
                        } else if (typeof data.updatedAt === 'object' && 'toMillis' in data.updatedAt) {
                            updatedAtOriginal = data.updatedAt as Timestamp;
                        }
                    }

                    return {
                        ...data,
                        uid: doc.id,
                        lastSeen: lastSeenTimestamp,
                        lastSeenOriginal: lastSeenOriginal,
                        updatedAt: updatedAtOriginal
                    } as UserProfile & { lastSeen: number; lastSeenOriginal?: Date | Timestamp; updatedAt?: Date | Timestamp };
                })
                .filter(user => {
                    const oneMinuteAgoFilter = Date.now() - (1 * 60 * 1000);
                    if (includeInactive) {
                        return true;
                    }
                    if (user.presence === 'online') {
                        if (!user.lastSeen || user.lastSeen === 0) {
                            return true;
                        }
                        return user.lastSeen > oneMinuteAgoFilter;
                    }
                    if (!user.lastSeen || user.lastSeen === 0) {
                        return false;
                    }
                    return user.lastSeen > oneMinuteAgoFilter;
                })
                .map(user => {
                    const now = Date.now();
                    const tenMinutesAgo = now - (10 * 60 * 1000);
                    const oneMinuteAgo = now - (1 * 60 * 1000);

                    let activityTimestamp = 0;

                    if (user.lastSeen) {
                        if (user.lastSeen instanceof Date) {
                            activityTimestamp = user.lastSeen.getTime();
                        } else if (user.lastSeen instanceof Timestamp) {
                            activityTimestamp = user.lastSeen.toMillis();
                        } else if (typeof user.lastSeen === 'number') {
                            activityTimestamp = user.lastSeen;
                        } else if (typeof user.lastSeen === 'object' && 'toMillis' in user.lastSeen) {
                            activityTimestamp = (user.lastSeen as any).toMillis();
                        }
                    }

                    if (activityTimestamp === 0 && user.updatedAt) {
                        if (user.updatedAt instanceof Date) {
                            activityTimestamp = user.updatedAt.getTime();
                        } else if (user.updatedAt instanceof Timestamp) {
                            activityTimestamp = user.updatedAt.toMillis();
                        } else if (typeof user.updatedAt === 'object' && 'toMillis' in user.updatedAt) {
                            activityTimestamp = (user.updatedAt as any).toMillis();
                        }
                    }

                    let newPresence = user.presence;

                    if (user.presence === 'online' && activityTimestamp === 0) {
                        newPresence = 'online';
                    } else if (user.presence === 'away' && activityTimestamp === 0) {
                        newPresence = 'away';
                    } else if (activityTimestamp === 0) {
                        if (user.presence === 'online') {
                            newPresence = 'offline';
                        } else if (user.presence !== 'away' && user.presence !== 'idle') {
                            newPresence = 'offline';
                        } else {
                            newPresence = user.presence;
                        }
                    } else if (activityTimestamp >= oneMinuteAgo) {
                        if (user.presence === 'offline' && activityTimestamp >= oneMinuteAgo) {
                            newPresence = 'offline';
                        } else {
                            newPresence = 'online';
                        }
                    } else if (activityTimestamp >= tenMinutesAgo) {
                        newPresence = 'away';
                    } else {
                        newPresence = 'offline';
                    }

                    if (newPresence !== user.presence && user.uid) {
                        const userRef = doc(db, USERS_COLLECTION, user.uid);
                        updateDoc(userRef, { presence: newPresence }).catch(console.error);
                    }

                    return {
                        ...user,
                        presence: newPresence
                    };
                })
                .map(user => {
                    const { lastSeen, lastSeenOriginal, ...profile } = user;
                    return {
                        ...profile,
                        lastSeen: lastSeenOriginal,
                        updatedAt: profile.updatedAt instanceof Timestamp ? profile.updatedAt :
                                   profile.updatedAt instanceof Date ? profile.updatedAt :
                                   profile.updatedAt ? new Date(profile.updatedAt as any) : undefined
                    } as UserProfile & { lastSeen?: Date | Timestamp; updatedAt?: Date | Timestamp };
                })
                .sort((a, b) => {
                    return (a.display_name || '').localeCompare(b.display_name || '');
                });

            callback(users);
        }, (error) => {
            console.error('Error subscribing to online users:', error);
        });

        return unsubscribe;
    }
};

export const userMetricsService = {
    async getTop10MostConnectedUsers(): Promise<Array<{ user: UserProfile; connectionCount: number }>> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

            const usersWithConnections = users.map(user => {
                let connectionCount = 0;

                if (user.lastSeen) {
                    const lastSeenDate = user.lastSeen instanceof Date
                        ? user.lastSeen
                        : user.lastSeen instanceof Timestamp
                            ? user.lastSeen.toDate()
                            : new Date(user.lastSeen);

                    const createdAtDate = user.createdAt instanceof Date
                        ? user.createdAt
                        : user.createdAt instanceof Timestamp
                            ? user.createdAt.toDate()
                            : new Date(user.created_time || Date.now());

                    const daysSinceCreation = Math.max(1, (Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24));
                    const daysSinceLastSeen = (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24);

                    if (user.presence === 'online' || user.presence === 'away') {
                        connectionCount = Math.max(1, Math.floor(daysSinceCreation / Math.max(1, daysSinceLastSeen)));
                    }
                }

                return { user, connectionCount };
            });

            return usersWithConnections
                .sort((a, b) => b.connectionCount - a.connectionCount)
                .slice(0, 10);
        } catch (error) {
            console.error('Error getting top 10 most connected users:', error);
            return [];
        }
    },

    async getAverageSessionDuration(): Promise<number> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

            let totalSessionTime = 0;
            let activeUsersCount = 0;

            users.forEach(user => {
                if (user.lastSeen && (user.presence === 'online' || user.presence === 'away')) {
                    const lastSeenDate = user.lastSeen instanceof Date
                        ? user.lastSeen
                        : user.lastSeen instanceof Timestamp
                            ? user.lastSeen.toDate()
                            : new Date(user.lastSeen);

                    const sessionDuration = Date.now() - lastSeenDate.getTime();

                    if (sessionDuration < 3600000) {
                        totalSessionTime += sessionDuration;
                        activeUsersCount++;
                    }
                }
            });

            return activeUsersCount > 0 ? totalSessionTime / activeUsersCount : 0;
        } catch (error) {
            console.error('Error getting average session duration:', error);
            return 0;
        }
    },

    async getTop10MostActiveUsers(): Promise<Array<{ user: UserProfile; viewCount: number }>> {
        try {
            const viewsSnapshot = await getDocs(collection(db, USER_VIEW_COLLECTION));
            const views = viewsSnapshot.docs.map(doc => doc.data() as any);

            const viewCountByUser: Record<string, number> = {};
            views.forEach((view: any) => {
                viewCountByUser[view.user_uid] = (viewCountByUser[view.user_uid] || 0) + 1;
            });

            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const usersMap = new Map<string, UserProfile>();
            usersSnapshot.docs.forEach(doc => {
                const user = doc.data() as UserProfile;
                usersMap.set(user.uid, user);
            });

            const usersWithViews = Object.entries(viewCountByUser)
                .map(([uid, viewCount]) => ({
                    user: usersMap.get(uid)!,
                    viewCount
                }))
                .filter(item => item.user)
                .sort((a, b) => b.viewCount - a.viewCount)
                .slice(0, 10);

            return usersWithViews;
        } catch (error) {
            console.error('Error getting top 10 most active users:', error);
            return [];
        }
    },

    async getPeakHours(): Promise<Array<{ hour: number; connectionCount: number }>> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

            const hourCounts: Record<number, number> = {};

            users.forEach(user => {
                if (user.lastSeen) {
                    const lastSeenDate = user.lastSeen instanceof Date
                        ? user.lastSeen
                        : user.lastSeen instanceof Timestamp
                            ? user.lastSeen.toDate()
                            : new Date(user.lastSeen);

                    const hour = lastSeenDate.getHours();
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                }
            });

            return Object.entries(hourCounts)
                .map(([hour, count]) => ({ hour: parseInt(hour), connectionCount: count }))
                .sort((a, b) => b.connectionCount - a.connectionCount)
                .slice(0, 5);
        } catch (error) {
            console.error('Error getting peak hours:', error);
            return [];
        }
    },

    async getTop10TotalOnlineTime(): Promise<Array<{ user: UserProfile; totalOnlineTime: number }>> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

            const usersWithTime = users.map(user => {
                let totalOnlineTime = 0;

                if (user.lastSeen && user.createdAt) {
                    const lastSeenDate = user.lastSeen instanceof Date
                        ? user.lastSeen
                        : user.lastSeen instanceof Timestamp
                            ? user.lastSeen.toDate()
                            : new Date(user.lastSeen);

                    const createdAtDate = user.createdAt instanceof Date
                        ? user.createdAt
                        : user.createdAt instanceof Timestamp
                            ? user.createdAt.toDate()
                            : new Date(user.created_time || Date.now());

                    if (user.presence === 'online' || user.presence === 'away') {
                        totalOnlineTime = Date.now() - createdAtDate.getTime();
                    } else {
                        totalOnlineTime = lastSeenDate.getTime() - createdAtDate.getTime();
                    }
                }

                return { user, totalOnlineTime };
            });

            return usersWithTime
                .sort((a, b) => b.totalOnlineTime - a.totalOnlineTime)
                .slice(0, 10);
        } catch (error) {
            console.error('Error getting top 10 total online time:', error);
            return [];
        }
    }
};

export const userGeographyService = {
    async getUsersByCountry(): Promise<Array<{ countryCode: string; countryName: string; userCount: number; percentage: number }>> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);

            const countryCounts: Record<string, number> = {};
            let totalUsersWithCountry = 0;

            users.forEach(user => {
                if (user.country && user.country.trim()) {
                    countryCounts[user.country] = (countryCounts[user.country] || 0) + 1;
                    totalUsersWithCountry++;
                }
            });

            const countryStats = Object.entries(countryCounts)
                .map(([countryCode, userCount]) => {
                    const countryName = getCountryName(countryCode);
                    return {
                        countryCode,
                        countryName,
                        userCount,
                        percentage: totalUsersWithCountry > 0 ? (userCount / totalUsersWithCountry) * 100 : 0
                    };
                })
                .sort((a, b) => b.userCount - a.userCount);

            return countryStats;
        } catch (error) {
            console.error('Error getting users by country:', error);
            return [];
        }
    },

    async getTotalUsersWithCountry(): Promise<number> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            return users.filter(user => user.country && user.country.trim()).length;
        } catch (error) {
            console.error('Error getting total users with country:', error);
            return 0;
        }
    },

    async getTotalUsersWithPhoneNumber(): Promise<number> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            return users.filter(user => user.phoneNumber && user.phoneNumber.trim()).length;
        } catch (error) {
            console.error('Error getting total users with phone number:', error);
            return 0;
        }
    },

    async getTotalUsersWithCompleteProfile(): Promise<number> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            return users.filter(user =>
                user.country && user.country.trim() &&
                user.phoneNumber && user.phoneNumber.trim()
            ).length;
        } catch (error) {
            console.error('Error getting total users with complete profile:', error);
            return 0;
        }
    },

    async getTotalUsers(): Promise<number> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            return usersSnapshot.docs.length;
        } catch (error) {
            console.error('Error getting total users:', error);
            return 0;
        }
    },

    async getTotalUsersWithRGPDConsent(): Promise<number> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const users = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            return users.filter(user => user.hasAcceptedPrivacyPolicy === true).length;
        } catch (error) {
            console.error('Error getting total users with RGPD consent:', error);
            return 0;
        }
    },

    async getUsersByCountryCode(countryCode: string): Promise<UserProfile[]> {
        try {
            const q = query(
                collection(db, USERS_COLLECTION),
                where('country', '==', countryCode)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as UserProfile));
        } catch (error) {
            console.error('Error getting users by country code:', error);
            return [];
        }
    }
};
