import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    onSnapshot,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import {
    Notification,
    InfoBarMessage,
    AppSettings,
    Ad,
    AdSettings,
    UserProfile,
} from './types';
import {
    NOTIFICATIONS_COLLECTION,
    USERS_COLLECTION,
    INFO_BAR_COLLECTION,
    APP_SETTINGS_COLLECTION,
    ADS_COLLECTION,
} from './constants';

export const notificationService = {
    async createNotification(
        userId: string,
        title: string,
        message: string,
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        link?: string
    ): Promise<string> {
        try {
            const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
            const notificationData = {
                userId,
                title,
                message,
                type,
                read: false,
                createdAt: Timestamp.now(),
                link: link || null
            };
            await setDoc(notificationRef, notificationData);
            return notificationRef.id;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    },

    async getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt
            })) as Notification[];
        } catch (error) {
            console.error('Error getting user notifications:', error);
            return [];
        }
    },

    async markAsRead(notificationId: string): Promise<void> {
        try {
            const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
            await updateDoc(notificationRef, { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    async markAllAsRead(userId: string): Promise<void> {
        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            await batch.commit();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },

    async deleteNotification(notificationId: string): Promise<void> {
        try {
            const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
            await deleteDoc(notificationRef);
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    },

    async getUnreadCount(userId: string): Promise<number> {
        try {
            const q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('userId', '==', userId),
                where('read', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.size;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    },

    subscribeToUserNotifications(
        userId: string,
        callback: (notifications: Notification[]) => void
    ): () => void {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const notifications = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt
            })) as Notification[];
            callback(notifications);
        }, (error) => {
            console.error('Error subscribing to notifications:', error);
            if (error.code === 'failed-precondition') {
                console.error('Index composite manquant !');
            }
        });

        return unsubscribe;
    },

    async getUsersByCategory(category: 'all' | 'admin' | 'non-admin'): Promise<string[]> {
        try {
            const allUsersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const allUsers = allUsersSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as UserProfile[];

            if (category === 'all') {
                return allUsers.map(u => u.uid);
            }

            if (category === 'admin' || category === 'non-admin') {
                const isAdminValue = category === 'admin';
                return allUsers
                    .filter(u => {
                        const userIsAdmin = u.isAdmin ?? (u as any)?.['isAdmin '];
                        return isAdminValue ? userIsAdmin : !userIsAdmin;
                    })
                    .map(u => u.uid);
            }

            return [];
        } catch (error) {
            console.error('Error getting users by category:', error);
            return [];
        }
    },

    async createNotificationForAllUsers(
        title: string,
        message: string,
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        link?: string
    ): Promise<{ success: number; errors: number }> {
        try {
            const usersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
            const userIds = usersSnapshot.docs.map(doc => doc.id);

            const batchSize = 500;
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < userIds.length; i += batchSize) {
                const batch = writeBatch(db);
                const batchUserIds = userIds.slice(i, i + batchSize);

                batchUserIds.forEach(userId => {
                    const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                    batch.set(notificationRef, {
                        userId,
                        title,
                        message,
                        type,
                        read: false,
                        createdAt: Timestamp.now(),
                        link: link || null
                    });
                });

                try {
                    await batch.commit();
                    successCount += batchUserIds.length;
                } catch (error) {
                    console.error(`Erreur batch ${Math.floor(i / batchSize) + 1}:`, error);
                    errorCount += batchUserIds.length;
                }
            }

            return { success: successCount, errors: errorCount };
        } catch (error) {
            console.error('Error creating notification for all users:', error);
            throw error;
        }
    },

    async createNotificationForCategory(
        category: 'all' | 'admin' | 'non-admin',
        title: string,
        message: string,
        type: 'info' | 'success' | 'warning' | 'error' = 'info',
        link?: string
    ): Promise<{ success: number; errors: number; category: string }> {
        try {
            const userIds = await this.getUsersByCategory(category);

            if (userIds.length === 0) {
                return { success: 0, errors: 0, category };
            }

            const batchSize = 500;
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < userIds.length; i += batchSize) {
                const batch = writeBatch(db);
                const batchUserIds = userIds.slice(i, i + batchSize);

                batchUserIds.forEach(userId => {
                    const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
                    batch.set(notificationRef, {
                        userId,
                        title,
                        message,
                        type,
                        read: false,
                        createdAt: Timestamp.now(),
                        link: link || null
                    });
                });

                try {
                    await batch.commit();
                    successCount += batchUserIds.length;
                } catch (error) {
                    console.error(`Erreur batch ${Math.floor(i / batchSize) + 1}:`, error);
                    errorCount += batchUserIds.length;
                }
            }

            return { success: successCount, errors: errorCount, category };
        } catch (error) {
            console.error('Error creating notification for category:', error);
            throw error;
        }
    },

    async getAllNotificationsGrouped(): Promise<Array<{
        title: string;
        message: string;
        type: string;
        link?: string;
        totalCount: number;
        readCount: number;
        unreadCount: number;
        createdAt: Date | Timestamp;
        notificationIds: string[];
    }>> {
        try {
            const notificationsSnapshot = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
            const allNotifications = notificationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as (Notification & { id: string })[];

            const grouped = new Map<string, {
                title: string;
                message: string;
                type: string;
                link?: string;
                notificationIds: string[];
                readCount: number;
                createdAt: Date | Timestamp;
            }>();

            allNotifications.forEach(notif => {
                const key = `${notif.title}|${notif.message}|${notif.type}|${notif.link || ''}`;
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        title: notif.title,
                        message: notif.message,
                        type: notif.type,
                        link: notif.link,
                        notificationIds: [],
                        readCount: 0,
                        createdAt: notif.createdAt
                    });
                }
                const group = grouped.get(key)!;
                group.notificationIds.push(notif.id);
                if (notif.read) {
                    group.readCount++;
                }
            });

            return Array.from(grouped.values()).map(group => ({
                ...group,
                totalCount: group.notificationIds.length,
                unreadCount: group.notificationIds.length - group.readCount
            })).sort((a, b) => {
                const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() :
                             a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() :
                             b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });
        } catch (error) {
            console.error('Error getting all notifications grouped:', error);
            return [];
        }
    },

    async deleteUnreadNotifications(
        title: string,
        message: string,
        type: string,
        link?: string
    ): Promise<{ deleted: number; errors: number }> {
        try {
            let q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('title', '==', title),
                where('message', '==', message),
                where('type', '==', type),
                where('read', '==', false)
            );

            if (link) {
                q = query(
                    collection(db, NOTIFICATIONS_COLLECTION),
                    where('title', '==', title),
                    where('message', '==', message),
                    where('type', '==', type),
                    where('link', '==', link),
                    where('read', '==', false)
                );
            }

            const querySnapshot = await getDocs(q);
            const notificationsToDelete = querySnapshot.docs;

            const batchSize = 500;
            let deletedCount = 0;
            let errorCount = 0;

            for (let i = 0; i < notificationsToDelete.length; i += batchSize) {
                const batch = writeBatch(db);
                const batchDocs = notificationsToDelete.slice(i, i + batchSize);

                batchDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                try {
                    await batch.commit();
                    deletedCount += batchDocs.length;
                } catch (error) {
                    errorCount += batchDocs.length;
                }
            }

            return { deleted: deletedCount, errors: errorCount };
        } catch (error) {
            console.error('Error deleting unread notifications:', error);
            throw error;
        }
    },

    async deleteAllNotifications(
        title: string,
        message: string,
        type: string,
        link?: string
    ): Promise<{ deleted: number; errors: number }> {
        try {
            let q = query(
                collection(db, NOTIFICATIONS_COLLECTION),
                where('title', '==', title),
                where('message', '==', message),
                where('type', '==', type)
            );

            if (link) {
                q = query(
                    collection(db, NOTIFICATIONS_COLLECTION),
                    where('title', '==', title),
                    where('message', '==', message),
                    where('type', '==', type),
                    where('link', '==', link)
                );
            }

            const querySnapshot = await getDocs(q);
            const notificationsToDelete = querySnapshot.docs;

            const batchSize = 500;
            let deletedCount = 0;
            let errorCount = 0;

            for (let i = 0; i < notificationsToDelete.length; i += batchSize) {
                const batch = writeBatch(db);
                const batchDocs = notificationsToDelete.slice(i, i + batchSize);

                batchDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                try {
                    await batch.commit();
                    deletedCount += batchDocs.length;
                } catch (error) {
                    errorCount += batchDocs.length;
                }
            }

            return { deleted: deletedCount, errors: errorCount };
        } catch (error) {
            console.error('Error deleting all notifications:', error);
            throw error;
        }
    }
};

export const infoBarService = {
    async getActiveMessage(): Promise<InfoBarMessage | null> {
        try {
            const activeMessages = await this.getAllActiveMessages();
            return activeMessages.length > 0 ? activeMessages[0] : null;
        } catch (error) {
            console.error('Error getting active info bar message:', error);
            return null;
        }
    },

    async getAllActiveMessages(): Promise<InfoBarMessage[]> {
        try {
            const q = query(
                collection(db, INFO_BAR_COLLECTION),
                where('isActive', '==', true)
            );
            const querySnapshot = await getDocs(q);

            const messages = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    message: data.message || '',
                    isActive: data.isActive || false,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    createdBy: data.createdBy
                };
            });

            messages.sort((a, b) => {
                const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
                const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
                return dateB - dateA;
            });

            return messages;
        } catch (error) {
            console.error('Error getting all active info bar messages:', error);
            return [];
        }
    },

    async createMessage(message: string, userId: string): Promise<string> {
        try {
            const newMessageRef = doc(collection(db, INFO_BAR_COLLECTION));
            await setDoc(newMessageRef, {
                message: message.trim(),
                isActive: false,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                createdBy: userId
            });

            return newMessageRef.id;
        } catch (error) {
            console.error('Error creating info bar message:', error);
            throw error;
        }
    },

    async updateMessage(messageId: string, message: string, userId: string): Promise<void> {
        try {
            const messageRef = doc(db, INFO_BAR_COLLECTION, messageId);
            await updateDoc(messageRef, {
                message,
                updatedAt: Timestamp.now(),
                createdBy: userId
            });
        } catch (error) {
            console.error('Error updating info bar message:', error);
            throw error;
        }
    },

    async setMessageActive(messageId: string, isActive: boolean): Promise<void> {
        try {
            const messageRef = doc(db, INFO_BAR_COLLECTION, messageId);
            await updateDoc(messageRef, {
                isActive: isActive,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error setting message active:', error);
            throw error;
        }
    },

    async getAllMessages(): Promise<InfoBarMessage[]> {
        try {
            const q = query(
                collection(db, INFO_BAR_COLLECTION),
                orderBy('updatedAt', 'desc')
            );
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    message: data.message || '',
                    isActive: data.isActive || false,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    createdBy: data.createdBy
                };
            });
        } catch (error) {
            console.error('Error getting all info bar messages:', error);
            return [];
        }
    },

    async deleteMessage(messageId: string): Promise<void> {
        try {
            const messageRef = doc(db, INFO_BAR_COLLECTION, messageId);
            await deleteDoc(messageRef);
        } catch (error) {
            console.error('Error deleting info bar message:', error);
            throw error;
        }
    }
};

export const appSettingsService = {
    async getAppSettings(): Promise<AppSettings | null> {
        try {
            const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'global');
            const settingsDoc = await getDoc(settingsRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                return {
                    homeViewMode: data.homeViewMode || 'default',
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    updatedBy: data.updatedBy
                };
            }

            const defaultSettings: AppSettings = {
                homeViewMode: 'default',
                updatedAt: new Date()
            };
            await setDoc(settingsRef, {
                ...defaultSettings,
                updatedAt: Timestamp.now()
            });
            return defaultSettings;
        } catch (error) {
            console.error('Error getting app settings:', error);
            return null;
        }
    },

    async setHomeViewMode(mode: 'default' | 'prime' | 'netflix', userId: string): Promise<void> {
        try {
            const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'global');
            await setDoc(settingsRef, {
                homeViewMode: mode,
                updatedAt: Timestamp.now(),
                updatedBy: userId
            }, { merge: true });
        } catch (error) {
            console.error('Error setting home view mode:', error);
            throw error;
        }
    }
};

export const adService = {
    async getActiveAds(): Promise<Ad[]> {
        try {
            const q = query(
                collection(db, ADS_COLLECTION),
                where('isActive', '==', true)
            );
            const querySnapshot = await getDocs(q);
            const ads = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt || Timestamp.now(),
                updatedAt: doc.data().updatedAt || Timestamp.now()
            })) as Ad[];

            ads.sort((a, b) => {
                const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });

            return ads;
        } catch (error) {
            console.error('Error getting active ads:', error);
            return [];
        }
    },

    async getRandomAd(): Promise<Ad | null> {
        try {
            const ads = await this.getActiveAds();
            if (ads.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * ads.length);
            return ads[randomIndex];
        } catch (error) {
            console.error('Error getting random ad:', error);
            return null;
        }
    },

    async getAllAds(): Promise<Ad[]> {
        try {
            const q = query(
                collection(db, ADS_COLLECTION),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt || Timestamp.now(),
                updatedAt: doc.data().updatedAt || Timestamp.now()
            })) as Ad[];
        } catch (error) {
            console.error('Error getting all ads:', error);
            return [];
        }
    },

    async createAd(adData: Omit<Ad, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const adRef = await addDoc(collection(db, ADS_COLLECTION), {
                ...adData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            return adRef.id;
        } catch (error) {
            console.error('Error creating ad:', error);
            throw error;
        }
    },

    async updateAd(adId: string, updates: Partial<Ad>): Promise<void> {
        try {
            const adRef = doc(db, ADS_COLLECTION, adId);
            await updateDoc(adRef, {
                ...updates,
                updatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error updating ad:', error);
            throw error;
        }
    },

    async deleteAd(adId: string): Promise<void> {
        try {
            const adRef = doc(db, ADS_COLLECTION, adId);
            await deleteDoc(adRef);
        } catch (error) {
            console.error('Error deleting ad:', error);
            throw error;
        }
    },

    async getAdSettings(): Promise<AdSettings | null> {
        try {
            const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'ads');
            const settingsDoc = await getDoc(settingsRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                const enabled = typeof data.enabled === 'boolean' ? data.enabled : false;
                return {
                    enabled: enabled,
                    skipAfterSeconds: data.skipAfterSeconds || 5,
                    updatedAt: data.updatedAt || Timestamp.now(),
                    updatedBy: data.updatedBy
                };
            }

            const defaultSettings: AdSettings = {
                enabled: false,
                skipAfterSeconds: 5,
                updatedAt: Timestamp.now()
            };
            await setDoc(settingsRef, defaultSettings);
            return defaultSettings;
        } catch (error) {
            console.error('Error getting ad settings:', error);
            return null;
        }
    },

    async updateAdSettings(settings: Partial<AdSettings>, userId: string): Promise<void> {
        try {
            const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'ads');
            const dataToSave: any = {
                updatedAt: Timestamp.now(),
                updatedBy: userId
            };

            if (typeof settings.enabled === 'boolean') {
                dataToSave.enabled = settings.enabled;
            }

            if (typeof settings.skipAfterSeconds === 'number') {
                dataToSave.skipAfterSeconds = settings.skipAfterSeconds;
            }

            await setDoc(settingsRef, dataToSave, { merge: true });
        } catch (error) {
            console.error('Error updating ad settings:', error);
            throw error;
        }
    }
};
