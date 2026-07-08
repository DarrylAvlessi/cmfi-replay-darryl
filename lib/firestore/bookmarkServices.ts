import { db } from '../firebase';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    increment,
    DocumentReference,
} from 'firebase/firestore';
import { BookDoc, BookSeries, Like, UserProfile, Movie, EpisodeSerie } from './types';
import {
    BOOK_DOC_COLLECTION,
    BOOK_SERIES_COLLECTION,
    MOVIES_COLLECTION,
    LIKES_COLLECTION,
    EPISODES_SERIES_COLLECTION,
} from './constants';

export const bookDocService = {
    async addBookmark(movieOrSerieUid: string, userEmail: string, title: string, description: string, image: string, isseries: boolean = false): Promise<BookDoc | null> {
        try {
            const existing = await this.getBookmark(movieOrSerieUid, userEmail);
            if (existing) {
                return existing;
            }

            const newBookmark: BookDoc = {
                add_at: new Date().toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                }),
                description,
                email: userEmail,
                image,
                isseries,
                title,
                uid: movieOrSerieUid
            };

            await setDoc(doc(collection(db, BOOK_DOC_COLLECTION)), newBookmark);
            return newBookmark;
        } catch (error) {
            console.error('Error adding bookmark:', error);
            return null;
        }
    },

    async removeBookmark(movieOrSerieUid: string, userEmail: string): Promise<boolean> {
        try {
            const q = query(
                collection(db, BOOK_DOC_COLLECTION),
                where('uid', '==', movieOrSerieUid),
                where('email', '==', userEmail)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const bookmarkDoc = querySnapshot.docs[0];
                await deleteDoc(doc(db, BOOK_DOC_COLLECTION, bookmarkDoc.id));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing bookmark:', error);
            return false;
        }
    },

    async getBookmark(movieOrSerieUid: string, userEmail: string): Promise<BookDoc | null> {
        try {
            const q = query(
                collection(db, BOOK_DOC_COLLECTION),
                where('uid', '==', movieOrSerieUid),
                where('email', '==', userEmail)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as BookDoc;
            }
            return null;
        } catch (error) {
            console.error('Error getting bookmark:', error);
            return null;
        }
    },

    async getUserBookmarks(userEmail: string): Promise<BookDoc[]> {
        try {
            const q = query(
                collection(db, BOOK_DOC_COLLECTION),
                where('email', '==', userEmail)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as BookDoc);
        } catch (error) {
            console.error('Error getting user bookmarks:', error);
            return [];
        }
    },

    async toggleBookmark(movieOrSerieUid: string, userEmail: string, title: string, description: string, image: string, isseries: boolean = false): Promise<boolean> {
        try {
            const existing = await this.getBookmark(movieOrSerieUid, userEmail);

            if (existing) {
                await this.removeBookmark(movieOrSerieUid, userEmail);
                return false;
            } else {
                await this.addBookmark(movieOrSerieUid, userEmail, title, description, image, isseries);
                return true;
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            throw error;
        }
    }
};

export const bookSeriesService = {
    async addBookmark(
        episodeUidOrRef: string | DocumentReference,
        userEmail: string,
        title: string,
        description: string,
        image: string,
        moviepath: string,
        runtime: string,
        useRefEpisode: boolean = false
    ): Promise<BookSeries | null> {
        try {
            const existing = await this.getBookmark(episodeUidOrRef, userEmail);
            if (existing) {
                return existing;
            }

            const newBookmark: BookSeries = {
                add_at: new Date().toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                }),
                description,
                email: userEmail,
                image,
                isbooked: true,
                isseries: true,
                moviepath,
                runtime,
                title,
                ...(useRefEpisode
                    ? {
                        refEpisode: typeof episodeUidOrRef === 'string'
                            ? doc(db, EPISODES_SERIES_COLLECTION, episodeUidOrRef)
                            : episodeUidOrRef
                    }
                    : { uid: typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id }
                )
            };

            await setDoc(doc(collection(db, BOOK_SERIES_COLLECTION)), newBookmark);
            return newBookmark;
        } catch (error) {
            console.error('Error adding series bookmark:', error);
            return null;
        }
    },

    async removeBookmark(episodeUidOrRef: string | DocumentReference, userEmail: string): Promise<boolean> {
        try {
            const uidToSearch = typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id;
            let q = query(
                collection(db, BOOK_SERIES_COLLECTION),
                where('uid', '==', uidToSearch),
                where('email', '==', userEmail)
            );
            let querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const refToSearch = typeof episodeUidOrRef === 'string'
                    ? doc(db, EPISODES_SERIES_COLLECTION, episodeUidOrRef)
                    : episodeUidOrRef;
                q = query(
                    collection(db, BOOK_SERIES_COLLECTION),
                    where('refEpisode', '==', refToSearch),
                    where('email', '==', userEmail)
                );
                querySnapshot = await getDocs(q);
            }

            if (!querySnapshot.empty) {
                const bookmarkDoc = querySnapshot.docs[0];
                await deleteDoc(doc(db, BOOK_SERIES_COLLECTION, bookmarkDoc.id));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing series bookmark:', error);
            return false;
        }
    },

    async getBookmark(episodeUidOrRef: string | DocumentReference, userEmail: string): Promise<BookSeries | null> {
        try {
            const uidToSearch = typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id;
            let q = query(
                collection(db, BOOK_SERIES_COLLECTION),
                where('uid', '==', uidToSearch),
                where('email', '==', userEmail)
            );
            let querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const refToSearch = typeof episodeUidOrRef === 'string'
                    ? doc(db, EPISODES_SERIES_COLLECTION, episodeUidOrRef)
                    : episodeUidOrRef;
                q = query(
                    collection(db, BOOK_SERIES_COLLECTION),
                    where('refEpisode', '==', refToSearch),
                    where('email', '==', userEmail)
                );
                querySnapshot = await getDocs(q);
            }

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as BookSeries;
            }
            return null;
        } catch (error) {
            console.error('Error getting series bookmark:', error);
            return null;
        }
    },

    async getUserBookmarks(userEmail: string): Promise<BookSeries[]> {
        try {
            const q = query(
                collection(db, BOOK_SERIES_COLLECTION),
                where('email', '==', userEmail)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as BookSeries);
        } catch (error) {
            console.error('Error getting user series bookmarks:', error);
            return [];
        }
    },

    async toggleBookmark(
        episodeUid: string,
        userEmail: string,
        title: string,
        description: string,
        image: string,
        moviepath: string,
        runtime: string
    ): Promise<boolean> {
        try {
            const existing = await this.getBookmark(episodeUid, userEmail);

            if (existing) {
                await this.removeBookmark(episodeUid, userEmail);
                return false;
            } else {
                await this.addBookmark(episodeUid, userEmail, title, description, image, moviepath, runtime);
                return true;
            }
        } catch (error) {
            console.error('Error toggling series bookmark:', error);
            throw error;
        }
    }
};

export const likeService = {
    async toggleLike(itemUid: string, itemTitle: string, user: UserProfile, contentType: 'movie' | 'episode'): Promise<boolean> {
        try {
            const q = query(
                collection(db, LIKES_COLLECTION),
                where('uid', '==', itemUid),
                where('likedby', '==', user.email)
            );

            const querySnapshot = await getDocs(q);

            const collectionName = contentType === 'movie' ? MOVIES_COLLECTION : EPISODES_SERIES_COLLECTION;

            if (!querySnapshot.empty) {
                const likeDoc = querySnapshot.docs[0];
                await deleteDoc(doc(db, LIKES_COLLECTION, likeDoc.id));

                const contentQuery = query(collection(db, collectionName), where('uid', '==', itemUid), limit(1));
                const contentSnap = await getDocs(contentQuery);
                if (!contentSnap.empty) {
                    await updateDoc(doc(db, collectionName, contentSnap.docs[0].id), {
                        likesCount: increment(-1),
                    });
                }

                return false;
            } else {
                const newLike: Like = {
                    isliked: true,
                    liked_at: new Date().toLocaleString('fr-FR', { timeZoneName: 'short' }),
                    likedby: user.email,
                    title: itemTitle,
                    uid: itemUid,
                    username: user.display_name || user.email.split('@')[0],
                    contentType,
                };

                await setDoc(doc(collection(db, LIKES_COLLECTION)), newLike);

                const contentQuery = query(collection(db, collectionName), where('uid', '==', itemUid), limit(1));
                const contentSnap = await getDocs(contentQuery);
                if (!contentSnap.empty) {
                    await updateDoc(doc(db, collectionName, contentSnap.docs[0].id), {
                        likesCount: increment(1),
                    });
                }

                return true;
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            throw error;
        }
    },

    async getLikeCount(itemUid: string, contentType: 'movie' | 'episode'): Promise<number> {
        try {
            const collectionName = contentType === 'movie' ? MOVIES_COLLECTION : EPISODES_SERIES_COLLECTION;
            const uidField = contentType === 'movie' ? 'uid' : 'uid_episode';
            const q = query(
                collection(db, collectionName),
                where(uidField, '==', itemUid),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const content = querySnapshot.docs[0].data() as Movie | EpisodeSerie;
                return content.likesCount || 0;
            }
            return 0;
        } catch (error) {
            console.error('Error getting like count:', error);
            return 0;
        }
    },

    async hasUserLiked(itemUid: string, userEmail: string): Promise<boolean> {
        try {
            const q = query(
                collection(db, LIKES_COLLECTION),
                where('uid', '==', itemUid),
                where('likedby', '==', userEmail),
                where('isliked', '==', true)
            );
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking if user liked:', error);
            return false;
        }
    },

    async getMostLikedItems(limitCount: number = 10): Promise<Array<{ uid: string; likeCount: number; title: string; isEpisode: boolean }>> {
        try {
            const [movieSnap, episodeSnap] = await Promise.all([
                getDocs(query(collection(db, MOVIES_COLLECTION), orderBy('likesCount', 'desc'), limit(limitCount))),
                getDocs(query(collection(db, EPISODES_SERIES_COLLECTION), orderBy('likesCount', 'desc'), limit(limitCount))),
            ]);

            const results: Array<{ uid: string; likeCount: number; title: string; isEpisode: boolean }> = [];

            movieSnap.docs.forEach(doc => {
                const movie = doc.data() as Movie;
                if (movie.likesCount && movie.likesCount > 0) {
                    results.push({ uid: movie.uid, likeCount: movie.likesCount, title: movie.title, isEpisode: false });
                }
            });

            episodeSnap.docs.forEach(doc => {
                const episode = doc.data() as EpisodeSerie;
                if (episode.likesCount && episode.likesCount > 0) {
                    results.push({ uid: episode.uid_episode, likeCount: episode.likesCount, title: episode.title, isEpisode: true });
                }
            });

            results.sort((a, b) => b.likeCount - a.likeCount);
            return results.slice(0, limitCount);
        } catch (error) {
            console.error('Error getting most liked items:', error);
            return [];
        }
    }
};
