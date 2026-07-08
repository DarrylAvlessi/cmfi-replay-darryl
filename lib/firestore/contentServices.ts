import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    where,
    limit,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import {
    Movie,
    Serie,
    SeasonSerie,
    EpisodeSerie,
    SerieCategory,
} from './types';
import {
    MOVIES_COLLECTION,
    SERIES_COLLECTION,
    SEASONS_SERIES_COLLECTION,
    EPISODES_SERIES_COLLECTION,
    SERIE_CATEGORIES_COLLECTION,
} from './constants';
import { episodeSerieService } from './episodeSerieService';

export const movieService = {
    async getAllMovies(): Promise<Movie[]> {
        try {
            const moviesSnapshot = await getDocs(collection(db, MOVIES_COLLECTION));
            return moviesSnapshot.docs.map(doc => doc.data() as Movie);
        } catch (error) {
            console.error('Error getting all movies:', error);
            return [];
        }
    },

    async getMovieById(uid: string): Promise<Movie | null> {
        try {
            const movieDoc = await getDoc(doc(db, MOVIES_COLLECTION, uid));
            if (movieDoc.exists()) {
                return movieDoc.data() as Movie;
            }
            return null;
        } catch (error) {
            console.error('Error getting movie by ID:', error);
            return null;
        }
    },

    async getMovieByUid(uid: string): Promise<Movie | null> {
        try {
            const q = query(
                collection(db, MOVIES_COLLECTION),
                where('uid', '==', uid),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as Movie;
            }
            return null;
        } catch (error) {
            console.error('Error getting movie by UID:', error);
            return null;
        }
    },

    async getPopularMovies(limitCount: number = 10): Promise<Movie[]> {
        try {
            const q = query(
                collection(db, MOVIES_COLLECTION),
                where('popular', '==', true),
                where('hidden', '==', false),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Movie);
        } catch (error) {
            console.error('Error getting popular movies:', error);
            return [];
        }
    },

    async getTrendingMovies(limitCount: number = 10): Promise<Movie[]> {
        try {
            const q = query(
                collection(db, MOVIES_COLLECTION),
                where('trending', '==', true),
                where('hidden', '==', false),
                limit(limitCount)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Movie);
        } catch (error) {
            console.error('Error getting trending movies:', error);
            return [];
        }
    },

    async getHomeDisplayMovies(): Promise<Movie[]> {
        try {
            const q = query(
                collection(db, MOVIES_COLLECTION),
                where('homedisplayed', '==', true),
                where('hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Movie);
        } catch (error) {
            console.error('Error getting home display movies:', error);
            return [];
        }
    },

    async getTenHomeMovies(): Promise<Movie[]> {
        try {
            const q = query(
                collection(db, MOVIES_COLLECTION),
                where('hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            const allMovies = querySnapshot.docs.map(doc => doc.data() as Movie);

            const shuffled = [...allMovies];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            return shuffled.slice(0, 10);
        } catch (error) {
            console.error('Error getting ten home movies:', error);
            return [];
        }
    },

    async searchMovies(searchTerm: string): Promise<Movie[]> {
        try {
            const moviesSnapshot = await getDocs(collection(db, MOVIES_COLLECTION));
            const allMovies = moviesSnapshot.docs.map(doc => doc.data() as Movie);

            return allMovies.filter(movie =>
                movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.original_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                movie.overview.toLowerCase().includes(searchTerm.toLowerCase())
            );
        } catch (error) {
            console.error('Error searching movies:', error);
            return [];
        }
    },

    async getMoviesByUids(uids: string[]): Promise<Map<string, Movie>> {
        try {
            const map = new Map<string, Movie>();
            if (uids.length === 0) return map;

            for (let i = 0; i < uids.length; i += 10) {
                const batch = uids.slice(i, i + 10);
                const q = query(
                    collection(db, MOVIES_COLLECTION),
                    where('uid', 'in', batch)
                );
                const snap = await getDocs(q);
                snap.docs.forEach(d => {
                    const m = d.data() as Movie;
                    map.set(m.uid, m);
                });
            }
            return map;
        } catch (error) {
            console.error('Error getting movies by UIDs:', error);
            return new Map();
        }
    },

    async getBookmarkedMovies(movieIds: string[]): Promise<Movie[]> {
        try {
            if (movieIds.length === 0) return [];

            const moviesMap = await this.getMoviesByUids(movieIds);
            return movieIds
                .map(id => moviesMap.get(id))
                .filter((m): m is Movie => !!m && !m.hidden);
        } catch (error) {
            console.error('Error getting bookmarked movies:', error);
            return [];
        }
    }
};

export const serieService = {
    async getAllSeries(): Promise<Serie[]> {
        try {
            const seriesSnapshot = await getDocs(collection(db, SERIES_COLLECTION));
            return seriesSnapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting all series:', error);
            return [];
        }
    },

    async getSerieById(id: string): Promise<Serie | null> {
        try {
            const serieDoc = await getDoc(doc(db, SERIES_COLLECTION, id));
            if (serieDoc.exists()) {
                return serieDoc.data() as Serie;
            }
            return null;
        } catch (error) {
            console.error('Error getting serie by ID:', error);
            return null;
        }
    },

    async getSerieByUid(uid_serie: string): Promise<Serie | null> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('uid_serie', '==', uid_serie),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as Serie;
            }
            return null;
        } catch (error) {
            console.error('Error getting serie by UID:', error);
            return null;
        }
    },

    async getHomeDisplaySeries(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('homedisplayed', '==', true),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting home display series:', error);
            return [];
        }
    },

    async getSeriesByLanguage(lang: string): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('lang', 'array-contains', lang),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting series by language:', error);
            return [];
        }
    },

    async getAllPodcasts(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('serie_type', '==', 'podcast'),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting all podcasts:', error);
            return [];
        }
    },

    async getAllSeriesOnly(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs
                .map(doc => doc.data() as Serie)
                .filter(serie => !serie.serie_type || serie.serie_type === 'serie');
        } catch (error) {
            console.error('Error getting all series:', error);
            return [];
        }
    },

    async getHomeDisplaySeriesOnly(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('homedisplayed', '==', true),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs
                .map(doc => doc.data() as Serie)
                .filter(serie => !serie.serie_type || serie.serie_type === 'serie');
        } catch (error) {
            console.error('Error getting home display series:', error);
            return [];
        }
    },

    async getHomeDisplayPodcasts(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('serie_type', '==', 'podcast'),
                where('homedisplayed', '==', true),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting home display podcasts:', error);
            return [];
        }
    },

    async getPodcastsByLanguage(lang: string): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('serie_type', '==', 'podcast'),
                where('lang', 'array-contains', lang),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting podcasts by language:', error);
            return [];
        }
    },

    async getPodcastById(id: string): Promise<Serie | null> {
        try {
            const podcastDoc = await getDoc(doc(db, SERIES_COLLECTION, id));
            if (podcastDoc.exists()) {
                const podcast = podcastDoc.data() as Serie;
                return podcast.serie_type === 'podcast' ? podcast : null;
            }
            return null;
        } catch (error) {
            console.error('Error getting podcast by ID:', error);
            return null;
        }
    },

    async getTenHomeSeries(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            const allSeries = querySnapshot.docs
                .map(doc => doc.data() as Serie)
                .filter(serie => !serie.serie_type || serie.serie_type === 'serie');

            const shuffled = [...allSeries];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            return shuffled.slice(0, 10);
        } catch (error) {
            console.error('Error getting ten home series:', error);
            return [];
        }
    },

    async getTenHomePodcasts(): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('serie_type', '==', 'podcast'),
                where('is_hidden', '==', false)
            );
            const querySnapshot = await getDocs(q);
            const allPodcasts = querySnapshot.docs.map(doc => doc.data() as Serie);

            const shuffled = [...allPodcasts];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            return shuffled.slice(0, 10);
        } catch (error) {
            console.error('Error getting ten home podcasts:', error);
            return [];
        }
    },

    async updateSerieById(id: string, updates: Partial<Serie>): Promise<void> {
        try {
            const serieRef = doc(db, SERIES_COLLECTION, id);
            await updateDoc(serieRef, updates as any);
        } catch (error) {
            console.error('Error updating serie:', error);
            throw error;
        }
    },

    async updateSerieByUid(uid_serie: string, updates: Partial<Serie>): Promise<void> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('uid_serie', '==', uid_serie),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error(`Série avec UID ${uid_serie} non trouvée`);
            }

            const serieRef = doc(db, SERIES_COLLECTION, snapshot.docs[0].id);
            await updateDoc(serieRef, updates as any);
        } catch (error) {
            console.error('Error updating serie by UID:', error);
            throw error;
        }
    },

    async calculateAndUpdateSeriesStats(uid_serie: string): Promise<void> {
        try {
            const episodes = await episodeSerieService.getEpisodesBySerie(uid_serie);
            const seasonsCount = new Set(episodes.map(e => e.uid_season)).size;
            const episodesCount = episodes.length;
            const totalDuration = episodes.reduce((sum, e) => sum + (e.runtime || 0), 0);

            const q = query(
                collection(db, SERIES_COLLECTION),
                where('uid_serie', '==', uid_serie),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.warn(`Série avec UID ${uid_serie} non trouvée pour mise à jour des stats`);
                return;
            }

            const serieRef = doc(db, SERIES_COLLECTION, snapshot.docs[0].id);
            await updateDoc(serieRef, {
                seasonsCount,
                episodesCount,
                totalDuration,
                statsUpdatedAt: Timestamp.now()
            });
        } catch (error) {
            console.error('Error calculating series stats:', error);
            throw error;
        }
    },

    async updateAllSeriesStats(): Promise<void> {
        try {
            const allSeries = await this.getAllSeriesOnly();
            const batchSize = 10;

            for (let i = 0; i < allSeries.length; i += batchSize) {
                const batch = allSeries.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(serie =>
                        this.calculateAndUpdateSeriesStats(serie.uid_serie)
                        .catch(error => console.error(`Erreur pour la série ${serie.uid_serie}:`, error))
                    )
                );

                if (i + batchSize < allSeries.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (error) {
            console.error('Error updating all series stats:', error);
            throw error;
        }
    },
};

export const seasonSerieService = {
    async getAllSeasons(): Promise<SeasonSerie[]> {
        try {
            const seasonsSnapshot = await getDocs(collection(db, SEASONS_SERIES_COLLECTION));
            return seasonsSnapshot.docs.map(doc => doc.data() as SeasonSerie);
        } catch (error) {
            console.error('Error getting all seasons:', error);
            return [];
        }
    },

    async getSeasonById(id: string): Promise<SeasonSerie | null> {
        try {
            const seasonDoc = await getDoc(doc(db, SEASONS_SERIES_COLLECTION, id));
            if (seasonDoc.exists()) {
                return seasonDoc.data() as SeasonSerie;
            }
            return null;
        } catch (error) {
            console.error('Error getting season by ID:', error);
            return null;
        }
    },

    async getSeasonsBySerie(uid_serie: string, userId?: string): Promise<SeasonSerie[]> {
        try {
            const q = query(
                collection(db, SEASONS_SERIES_COLLECTION),
                where('uid_serie', '==', uid_serie),
                orderBy('season_number', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const allSeasons = querySnapshot.docs.map(doc => doc.data() as SeasonSerie);

            if (userId) {
                return allSeasons.filter(season => {
                    if (!season.isSecret) return true;
                    return season.allowedUserIds?.includes(userId) || false;
                });
            }

            return allSeasons.filter(season => !season.isSecret);
        } catch (error) {
            console.error('Error getting seasons by serie:', error);
            return [];
        }
    },

    async getSeasonBySerieAndNumber(uid_serie: string, season_number: number): Promise<SeasonSerie | null> {
        try {
            const q = query(
                collection(db, SEASONS_SERIES_COLLECTION),
                where('uid_serie', '==', uid_serie),
                where('season_number', '==', season_number)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as SeasonSerie;
            }
            return null;
        } catch (error) {
            console.error('Error getting season by serie and number:', error);
            return null;
        }
    },

    async getSeasonByUid(uid_season: string): Promise<SeasonSerie | null> {
        try {
            const q = query(
                collection(db, SEASONS_SERIES_COLLECTION),
                where('uid_season', '==', uid_season),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data() as SeasonSerie;
            }
            return null;
        } catch (error) {
            console.error('Error getting season by UID:', error);
            return null;
        }
    },

    async updateSeasonById(id: string, updates: Partial<SeasonSerie>): Promise<void> {
        try {
            const seasonRef = doc(db, SEASONS_SERIES_COLLECTION, id);
            await updateDoc(seasonRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            } as any);
        } catch (error) {
            console.error('Error updating season:', error);
            throw error;
        }
    },

    async updateSeasonByUid(uid_season: string, updates: Partial<SeasonSerie>): Promise<void> {
        try {
            const q = query(
                collection(db, SEASONS_SERIES_COLLECTION),
                where('uid_season', '==', uid_season),
                limit(1)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error(`Saison avec UID ${uid_season} non trouvée`);
            }

            const seasonRef = doc(db, SEASONS_SERIES_COLLECTION, snapshot.docs[0].id);
            await updateDoc(seasonRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            } as any);
        } catch (error) {
            console.error('Error updating season by UID:', error);
            throw error;
        }
    },

    async getEpisodesForSeason(uid_season: string): Promise<EpisodeSerie[]> {
        try {
            return await episodeSerieService.getEpisodesBySeason(uid_season);
        } catch (error) {
            console.error('Error getting episodes for season:', error);
            return [];
        }
    },

    async getActualEpisodeCount(uid_season: string): Promise<number> {
        try {
            const episodes = await this.getEpisodesForSeason(uid_season);
            return episodes.length;
        } catch (error) {
            console.error('Error getting actual episode count:', error);
            return 0;
        }
    },
};

export const serieCategoryService = {
    async getAllCategories(): Promise<SerieCategory[]> {
        try {
            const q = query(
                collection(db, SERIE_CATEGORIES_COLLECTION),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SerieCategory));
        } catch (error) {
            console.error('Error getting all categories:', error);
            return [];
        }
    },

    async getCategoryById(id: string): Promise<SerieCategory | null> {
        try {
            const categoryDoc = await getDoc(doc(db, SERIE_CATEGORIES_COLLECTION, id));
            if (categoryDoc.exists()) {
                return {
                    id: categoryDoc.id,
                    ...categoryDoc.data()
                } as SerieCategory;
            }
            return null;
        } catch (error) {
            console.error('Error getting category by ID:', error);
            return null;
        }
    },

    async createCategory(category: Omit<SerieCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const now = new Date().toISOString();
            const categoryData = {
                ...category,
                createdAt: now,
                updatedAt: now,
                order: category.order || 0
            };
            const docRef = await addDoc(collection(db, SERIE_CATEGORIES_COLLECTION), categoryData);
            return docRef.id;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    },

    async updateCategory(id: string, updates: Partial<Omit<SerieCategory, 'id' | 'createdAt'>>): Promise<void> {
        try {
            const categoryRef = doc(db, SERIE_CATEGORIES_COLLECTION, id);
            await updateDoc(categoryRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            } as any);
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    },

    async deleteCategory(id: string): Promise<void> {
        try {
            const categoryRef = doc(db, SERIE_CATEGORIES_COLLECTION, id);
            await deleteDoc(categoryRef);
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    },

    async getSeriesByCategory(categoryId: string): Promise<Serie[]> {
        try {
            const q = query(
                collection(db, SERIES_COLLECTION),
                where('categoryId', '==', categoryId),
                where('is_hidden', '==', false)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as Serie);
        } catch (error) {
            console.error('Error getting series by category:', error);
            return [];
        }
    },
};
