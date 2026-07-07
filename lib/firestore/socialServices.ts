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
    increment,
} from 'firebase/firestore';
import {
    Comment,
    TitleSuggestion,
    Report,
    UserProfile,
} from './types';
import {
    COMMENTS_COLLECTION,
    TITLE_SUGGESTIONS_COLLECTION,
    USERS_REPORTS_COLLECTION,
    MOVIES_COLLECTION,
    SERIES_COLLECTION,
    EPISODES_SERIES_COLLECTION,
} from './constants';

export const commentService = {
    async getComments(
        itemUid: string,
        options?: { limit?: number; startAfter?: string }
    ): Promise<{ comments: Comment[]; hasMore: boolean }> {
        try {
            const pageSize = options?.limit ?? 50;
            let q = query(
                collection(db, COMMENTS_COLLECTION),
                where('uid', '==', itemUid),
                orderBy('created_at', 'desc'),
                limit(pageSize + 1)
            );
            if (options?.startAfter) {
                const cursorDoc = await getDoc(doc(db, COMMENTS_COLLECTION, options.startAfter));
                if (cursorDoc.exists()) {
                    q = query(q, startAfter(cursorDoc));
                }
            }
            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs;
            const hasMore = docs.length > pageSize;
            const results = docs.slice(0, pageSize).map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    comment: data.comment || '',
                    created_at: data.created_at || '',
                    created_by: data.created_by || '',
                    uid: data.uid || '',
                    user_photo_url: data.user_photo_url,
                    likes: data.likes ?? 0,
                    liked_by: data.liked_by ?? [],
                    parent_id: data.parent_id ?? null,
                    edited: data.edited ?? false,
                    edited_at: data.edited_at,
                } as Comment;
            });
            return { comments: results, hasMore };
        } catch (error) {
            console.error('Error getting comments:', error);
            return { comments: [], hasMore: false };
        }
    },

    async addComment(
        itemUid: string,
        text: string,
        user: UserProfile,
        parentId?: string
    ): Promise<Comment | null> {
        try {
            const docRef = doc(collection(db, COMMENTS_COLLECTION));
            const commentData: Comment = {
                id: docRef.id,
                comment: text,
                created_at: new Date().toISOString(),
                created_by: user.display_name || user.email.split('@')[0],
                uid: itemUid,
                user_photo_url: user.photo_url || undefined,
                likes: 0,
                liked_by: [],
                parent_id: parentId ?? null,
                edited: false,
            };

            await setDoc(docRef, commentData);
            return commentData;
        } catch (error) {
            console.error('Error adding comment:', error);
            return null;
        }
    },

    async updateComment(commentId: string, text: string): Promise<boolean> {
        try {
            await updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
                comment: text,
                edited: true,
                edited_at: new Date().toISOString(),
            });
            return true;
        } catch (error) {
            console.error('Error updating comment:', error);
            return false;
        }
    },

    async deleteComment(commentId: string): Promise<boolean> {
        try {
            await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
            return true;
        } catch (error) {
            console.error('Error deleting comment:', error);
            return false;
        }
    },

    async likeComment(commentId: string, userId: string): Promise<boolean> {
        try {
            await updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
                liked_by: arrayUnion(userId),
                likes: increment(1),
            });
            return true;
        } catch (error) {
            console.error('Error liking comment:', error);
            return false;
        }
    },

    async unlikeComment(commentId: string, userId: string): Promise<boolean> {
        try {
            await updateDoc(doc(db, COMMENTS_COLLECTION, commentId), {
                liked_by: arrayRemove(userId),
                likes: increment(-1),
            });
            return true;
        } catch (error) {
            console.error('Error unliking comment:', error);
            return false;
        }
    },
};

export const titleSuggestionService = {
    async createSuggestion(data: Omit<TitleSuggestion, 'uid' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const ref = doc(collection(db, TITLE_SUGGESTIONS_COLLECTION));
            const now = Timestamp.now();
            await setDoc(ref, {
                ...data,
                status: 'pending',
                createdAt: now,
                updatedAt: now,
            });
            return ref.id;
        } catch (error) {
            console.error('Error creating title suggestion:', error);
            throw error;
        }
    },

    async getUserSuggestions(userId: string): Promise<TitleSuggestion[]> {
        try {
            const q = query(
                collection(db, TITLE_SUGGESTIONS_COLLECTION),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            const suggestions = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as TitleSuggestion[];
            return suggestions.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
        } catch (error) {
            console.error('Error getting user suggestions:', error);
            return [];
        }
    },

    subscribeToUserSuggestions(userId: string, callback: (suggestions: TitleSuggestion[]) => void): () => void {
        const q = query(
            collection(db, TITLE_SUGGESTIONS_COLLECTION),
            where('userId', '==', userId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const suggestions = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as TitleSuggestion[];
            callback(suggestions.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            }));
        });
        return unsubscribe;
    },

    async getAllSuggestions(): Promise<TitleSuggestion[]> {
        try {
            const q = query(
                collection(db, TITLE_SUGGESTIONS_COLLECTION),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as TitleSuggestion[];
        } catch (error) {
            console.error('Error getting all suggestions:', error);
            return [];
        }
    },

    async applySuggestion(suggestionId: string, respondedBy: string): Promise<void> {
        try {
            const ref = doc(db, TITLE_SUGGESTIONS_COLLECTION, suggestionId);
            const snap = await getDoc(ref);
            if (!snap.exists()) throw new Error('Suggestion not found');

            const suggestion = { uid: snap.id, ...snap.data() } as TitleSuggestion;

            if (suggestion.mediaType === 'movie') {
                const q = query(
                    collection(db, MOVIES_COLLECTION),
                    where('uid', '==', suggestion.mediaId),
                    limit(1)
                );
                const movieSnap = await getDocs(q);
                if (!movieSnap.empty) {
                    const movieRef = doc(db, MOVIES_COLLECTION, movieSnap.docs[0].id);
                    await updateDoc(movieRef, { title: suggestion.suggestedTitle });
                }
            } else if (suggestion.mediaType === 'serie') {
                const q = query(
                    collection(db, SERIES_COLLECTION),
                    where('uid_serie', '==', suggestion.mediaId),
                    limit(1)
                );
                const serieSnap = await getDocs(q);
                if (!serieSnap.empty) {
                    const serieRef = doc(db, SERIES_COLLECTION, serieSnap.docs[0].id);
                    await updateDoc(serieRef, { title_serie: suggestion.suggestedTitle });
                }
            } else if (suggestion.mediaType === 'episode') {
                const q = query(
                    collection(db, EPISODES_SERIES_COLLECTION),
                    where('uid_episode', '==', suggestion.mediaId),
                    limit(1)
                );
                const episodeSnap = await getDocs(q);
                if (!episodeSnap.empty) {
                    const episodeRef = doc(db, EPISODES_SERIES_COLLECTION, episodeSnap.docs[0].id);
                    await updateDoc(episodeRef, { title: suggestion.suggestedTitle });
                }
            }

            const now = Timestamp.now();
            await updateDoc(ref, {
                status: 'accepted',
                respondedBy,
                respondedAt: now,
                updatedAt: now,
            });
        } catch (error) {
            console.error('Error applying suggestion:', error);
            throw error;
        }
    },

    async rejectSuggestion(suggestionId: string, respondedBy: string, adminNote?: string): Promise<void> {
        try {
            const ref = doc(db, TITLE_SUGGESTIONS_COLLECTION, suggestionId);
            const now = Timestamp.now();
            await updateDoc(ref, {
                status: 'rejected',
                respondedBy,
                adminNote: adminNote || '',
                respondedAt: now,
                updatedAt: now,
            });
        } catch (error) {
            console.error('Error rejecting suggestion:', error);
            throw error;
        }
    }
};

export const reportService = {
    async createReport(data: Omit<Report, 'uid' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const reportRef = doc(collection(db, USERS_REPORTS_COLLECTION));
            const now = Timestamp.now();
            await setDoc(reportRef, {
                ...data,
                status: 'pending',
                createdAt: now,
                updatedAt: now,
            });
            return reportRef.id;
        } catch (error) {
            console.error('Error creating report:', error);
            throw error;
        }
    },

    async getUserReports(userId: string): Promise<Report[]> {
        try {
            const q = query(
                collection(db, USERS_REPORTS_COLLECTION),
                where('userId', '==', userId)
            );
            const snapshot = await getDocs(q);
            const reports = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Report[];
            return reports.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
        } catch (error) {
            console.error('Error getting user reports:', error);
            return [];
        }
    },

    subscribeToUserReports(userId: string, callback: (reports: Report[]) => void): () => void {
        const q = query(
            collection(db, USERS_REPORTS_COLLECTION),
            where('userId', '==', userId)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reports = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Report[];
            callback(reports.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            }));
        });
        return unsubscribe;
    },

    async getAllReports(): Promise<Report[]> {
        try {
            const q = query(
                collection(db, USERS_REPORTS_COLLECTION),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Report[];
        } catch (error) {
            console.error('Error getting all reports:', error);
            return [];
        }
    },

    async respondToReport(reportId: string, adminResponse: string, respondedBy: string): Promise<void> {
        try {
            const reportRef = doc(db, USERS_REPORTS_COLLECTION, reportId);
            await updateDoc(reportRef, {
                adminResponse,
                respondedBy,
                status: 'resolved',
                respondedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error responding to report:', error);
            throw error;
        }
    },

    async updateReportStatus(reportId: string, status: 'pending' | 'read' | 'resolved'): Promise<void> {
        try {
            const reportRef = doc(db, USERS_REPORTS_COLLECTION, reportId);
            await updateDoc(reportRef, {
                status,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            console.error('Error updating report status:', error);
            throw error;
        }
    },

    subscribeToAllReports(callback: (reports: Report[]) => void): () => void {
        const q = query(
            collection(db, USERS_REPORTS_COLLECTION),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reports = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            })) as Report[];
            callback(reports);
        });
        return unsubscribe;
    }
};
