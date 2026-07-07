import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    query,
    where,
    limit,
    orderBy,
    Timestamp,
    serverTimestamp,
    DocumentReference,
    QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
    StatsVues,
    EpisodeSerie,
    Movie,
    ContinueWatchingItem,
    SearchResult,
    UserView,
    NavigationEntry,
    UserNavigation,
} from './types';
import {
    USERS_COLLECTION,
    STATS_VUES_COLLECTION,
    EPISODES_SERIES_COLLECTION,
    MOVIES_COLLECTION,
    USER_VIEW_COLLECTION,
    SERIES_COLLECTION,
    SEASONS_SERIES_COLLECTION,
    USER_NAVIGATION_COLLECTION,
    USER_DAILY_ACTIVITY_COLLECTION,
} from './constants';

export const dailyActivityService = {
    async recordActiveToday(userUid: string): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const docId = `${today}_${userUid}`;
            const docRef = doc(db, USER_DAILY_ACTIVITY_COLLECTION, docId);

            await setDoc(docRef, {
                date: today,
                user_uid: userUid,
                last_active_at: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error recording daily activity:', error);
        }
    },

    async getDailyActiveUsers(days: number = 14): Promise<Array<{ date: string; activeUsers: number }>> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString().split('T')[0];

            const q = query(
                collection(db, USER_DAILY_ACTIVITY_COLLECTION),
                where('date', '>=', startDateStr),
                orderBy('date', 'asc')
            );

            const snapshot = await getDocs(q);

            const countByDate: Record<string, Set<string>> = {};

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const date = data.date;
                const userUid = data.user_uid;

                if (date && userUid) {
                    if (!countByDate[date]) {
                        countByDate[date] = new Set();
                    }
                    countByDate[date].add(userUid);
                }
            });

            const result: Array<{ date: string; activeUsers: number }> = [];
            const currentDate = new Date(startDateStr);

            for (let i = 0; i <= days; i++) {
                const dateStr = currentDate.toISOString().split('T')[0];
                result.push({
                    date: dateStr,
                    activeUsers: countByDate[dateStr]?.size || 0
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return result;
        } catch (error) {
            console.error('Error getting daily active users:', error);
            return [];
        }
    }
};

export const statsVuesService = {
    async getContinueWatching(userUid: string, limitCount: number = 10): Promise<ContinueWatchingItem[]> {
        try {
            const userRef = doc(db, USERS_COLLECTION, userUid);
            const q = query(
                collection(db, STATS_VUES_COLLECTION),
                where('user', '==', userRef),
                orderBy('dateDernierUpdate', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);

            const episodeRefs: DocumentReference[] = [];
            const movieUids: string[] = [];
            const historyData: Array<{ docSnapshot: QueryDocumentSnapshot; data: StatsVues; isEpisode: boolean }> = [];

            for (const docSnapshot of querySnapshot.docs) {
                const data = docSnapshot.data() as StatsVues;
                const isEpisode = !!data.idEpisodeSerie;

                historyData.push({ docSnapshot, data, isEpisode });

                if (isEpisode && data.idEpisodeSerie) {
                    episodeRefs.push(data.idEpisodeSerie);
                } else if (!isEpisode && data.uid) {
                    movieUids.push(data.uid);
                }
            }

            const episodesMap = new Map<string, EpisodeSerie>();
            if (episodeRefs.length > 0) {
                const uniqueRefs = Array.from(new Set(episodeRefs.map(ref => ref.path)))
                    .map(path => doc(db, path));

                const episodeDocs = await Promise.all(uniqueRefs.map(ref => getDoc(ref)));

                for (const episodeDoc of episodeDocs) {
                    if (episodeDoc.exists()) {
                        episodesMap.set(episodeDoc.id, episodeDoc.data() as EpisodeSerie);
                    }
                }
            }

            const moviesMap = new Map<string, Movie>();
            if (movieUids.length > 0) {
                const uniqueMovieUids = Array.from(new Set(movieUids));
                const batchSize = 10;

                for (let i = 0; i < uniqueMovieUids.length; i += batchSize) {
                    const batch = uniqueMovieUids.slice(i, i + batchSize);
                    const moviesQuery = query(
                        collection(db, MOVIES_COLLECTION),
                        where('uid', 'in', batch)
                    );
                    const moviesSnapshot = await getDocs(moviesQuery);

                    for (const movieDoc of moviesSnapshot.docs) {
                        const movie = movieDoc.data() as Movie;
                        moviesMap.set(movie.uid, movie);
                    }
                }
            }

            const continueWatchingItems: ContinueWatchingItem[] = [];

            for (const { docSnapshot, data, isEpisode } of historyData) {
                if (isEpisode && data.idEpisodeSerie) {
                    const episode = episodesMap.get(data.idEpisodeSerie.id);
                    if (episode) {
                        const runtime = episode.runtime || 0;
                        const progress = runtime > 0 ? Math.min((data.tempsRegarde / runtime) * 100, 100) : 0;

                        if (progress < 95) {
                            const displayTitle = episode.title || `${episode.title_serie} - Épisode ${episode.episode_numero}`;

                            continueWatchingItems.push({
                                id: docSnapshot.id,
                                uid: data.uid || episode.uid_episode || data.idEpisodeSerie.id,
                                title: displayTitle,
                                imageUrl: episode.backdrop_path || episode.picture_path,
                                progress,
                                tempsRegarde: data.tempsRegarde,
                                runtime,
                                type: 'episode',
                                episodeNumber: episode.episode_numero,
                                episodeTitle: episode.title,
                                serieTitle: episode.title_serie,
                                uid_episode: episode.uid_episode || data.idEpisodeSerie.id,
                                episodeId: data.idEpisodeSerie.id,
                                dateDernierUpdate: data.dateDernierUpdate
                            });
                        }
                    }
                } else if (data.uid) {
                    const movie = moviesMap.get(data.uid);
                    if (movie) {
                        const runtime = typeof movie.runtime === 'number' ? movie.runtime : (parseInt(movie.runtime || '0') || 0);

                        const progress = runtime > 0 ? Math.min((data.tempsRegarde / runtime) * 100, 100) : 0;

                        if (progress < 95) {
                            continueWatchingItems.push({
                                id: docSnapshot.id,
                                uid: data.uid,
                                title: movie.title,
                                imageUrl: movie.backdrop_path || movie.poster_path,
                                progress,
                                tempsRegarde: data.tempsRegarde,
                                runtime,
                                type: 'movie',
                                dateDernierUpdate: data.dateDernierUpdate
                            });
                        }
                    }
                }
            }

            return continueWatchingItems;
        } catch (error) {
            console.error('Error getting continue watching items:', error);
            return [];
        }
    },

    async updateViewingProgress(
        userUid: string,
        videoUid: string,
        currentTime: number,
        isEpisode: boolean = false
    ): Promise<void> {
        try {
            const userRef = doc(db, USERS_COLLECTION, userUid);

            let episodeRef: DocumentReference | null = null;
            if (isEpisode) {
                const episodeQuery = query(
                    collection(db, EPISODES_SERIES_COLLECTION),
                    where('uid_episode', '==', videoUid),
                    limit(1)
                );
                const episodeSnapshot = await getDocs(episodeQuery);
                if (!episodeSnapshot.empty) {
                    episodeRef = doc(db, EPISODES_SERIES_COLLECTION, episodeSnapshot.docs[0].id);

                    const existingByEpisodeRef = query(
                        collection(db, STATS_VUES_COLLECTION),
                        where('user', '==', userRef),
                        where('idEpisodeSerie', '==', episodeRef)
                    );

                    const existingByEpisodeSnapshot = await getDocs(existingByEpisodeRef);

                    if (!existingByEpisodeSnapshot.empty) {
                        const docRef = existingByEpisodeSnapshot.docs[0].ref;
                        await updateDoc(docRef, {
                            tempsRegarde: currentTime,
                            dateDernierUpdate: Timestamp.now(),
                            uid: videoUid,
                            isEpisode: true
                        });
                        return;
                    }
                }
            }

            const q = query(
                collection(db, STATS_VUES_COLLECTION),
                where('user', '==', userRef),
                where('uid', '==', videoUid)
            );

            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                const updateData: any = {
                    tempsRegarde: currentTime,
                    dateDernierUpdate: Timestamp.now(),
                    isEpisode: isEpisode
                };

                if (episodeRef) {
                    updateData.idEpisodeSerie = episodeRef;
                }

                await updateDoc(docRef, updateData);
            } else {
                const newViewData: Omit<StatsVues, 'id'> = {
                    uid: videoUid,
                    user: userRef,
                    tempsRegarde: currentTime,
                    dateDernierUpdate: Timestamp.now(),
                    nombreLectures: 1,
                    isEpisode: isEpisode,
                    ...(episodeRef && { idEpisodeSerie: episodeRef })
                } as any;

                await addDoc(collection(db, STATS_VUES_COLLECTION), newViewData);
            }
        } catch (error) {
            console.error('Error updating viewing progress:', error);
            throw error;
        }
    },

    async getAllHistory(userUid: string, limitCount: number = 50): Promise<ContinueWatchingItem[]> {
        try {
            const userRef = doc(db, USERS_COLLECTION, userUid);
            const q = query(
                collection(db, STATS_VUES_COLLECTION),
                where('user', '==', userRef),
                orderBy('dateDernierUpdate', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);

            const episodeRefs: DocumentReference[] = [];
            const movieUids: string[] = [];
            const historyData: Array<{ docSnapshot: QueryDocumentSnapshot; data: StatsVues; isEpisode: boolean }> = [];

            for (const docSnapshot of querySnapshot.docs) {
                const data = docSnapshot.data() as StatsVues;
                const isEpisode = !!data.idEpisodeSerie;

                historyData.push({ docSnapshot, data, isEpisode });

                if (isEpisode && data.idEpisodeSerie) {
                    episodeRefs.push(data.idEpisodeSerie);
                } else if (!isEpisode && data.uid) {
                    movieUids.push(data.uid);
                }
            }

            const episodesMap = new Map<string, EpisodeSerie>();
            if (episodeRefs.length > 0) {
                const episodePromises = episodeRefs.map(ref => getDoc(ref));
                const episodeDocs = await Promise.all(episodePromises);

                for (const episodeDoc of episodeDocs) {
                    if (episodeDoc.exists()) {
                        episodesMap.set(episodeDoc.id, episodeDoc.data() as EpisodeSerie);
                    }
                }
            }

            const moviesMap = new Map<string, Movie>();
            if (movieUids.length > 0) {
                const batchSize = 10;
                for (let i = 0; i < movieUids.length; i += batchSize) {
                    const batch = movieUids.slice(i, i + batchSize);
                    const moviesQuery = query(
                        collection(db, MOVIES_COLLECTION),
                        where('uid', 'in', batch)
                    );
                    const moviesSnapshot = await getDocs(moviesQuery);

                    for (const movieDoc of moviesSnapshot.docs) {
                        const movie = movieDoc.data() as Movie;
                        moviesMap.set(movie.uid, movie);
                    }
                }
            }

            const historyItems: ContinueWatchingItem[] = [];

            for (const { docSnapshot, data, isEpisode } of historyData) {
                if (isEpisode && data.idEpisodeSerie) {
                    const episode = episodesMap.get(data.idEpisodeSerie.id);
                    if (episode) {
                        const runtime = episode.runtime || 0;
                        const progress = runtime > 0 ? Math.min((data.tempsRegarde / runtime) * 100, 100) : 0;
                        const displayTitle = episode.title || `${episode.title_serie} - Épisode ${episode.episode_numero}`;

                        historyItems.push({
                            id: docSnapshot.id,
                            uid: data.uid || episode.uid_episode || data.idEpisodeSerie.id,
                            title: displayTitle,
                            imageUrl: episode.backdrop_path || episode.picture_path,
                            progress,
                            tempsRegarde: data.tempsRegarde,
                            runtime,
                            type: 'episode',
                            episodeNumber: episode.episode_numero,
                            episodeTitle: episode.title,
                            serieTitle: episode.title_serie,
                            uid_episode: episode.uid_episode || data.idEpisodeSerie.id,
                            episodeId: data.idEpisodeSerie.id,
                            dateDernierUpdate: data.dateDernierUpdate
                        });
                    }
                } else if (data.uid) {
                    const movie = moviesMap.get(data.uid);
                    if (movie) {
                        const runtime = typeof movie.runtime === 'number' ? movie.runtime : (parseInt(movie.runtime || '0') || 0);

                        const progress = runtime > 0 ? Math.min((data.tempsRegarde / runtime) * 100, 100) : 0;

                        historyItems.push({
                            id: docSnapshot.id,
                            uid: data.uid,
                            title: movie.title,
                            imageUrl: movie.backdrop_path || movie.poster_path,
                            progress,
                            tempsRegarde: data.tempsRegarde,
                            runtime,
                            type: 'movie',
                            dateDernierUpdate: data.dateDernierUpdate
                        });
                    }
                }
            }

            return historyItems;
        } catch (error) {
            console.error('Error getting all history items:', error);
            return [];
        }
    }
};

export const searchService = {
    async searchAll(searchTerm: string): Promise<SearchResult[]> {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        const term = searchTerm.toLowerCase().trim();
        const results: SearchResult[] = [];

        try {
            const [movies, series, seasons, episodes] = await Promise.all([
                this.searchMovies(term),
                this.searchSeries(term),
                this.searchSeasons(term),
                this.searchEpisodes(term)
            ]);

            results.push(...movies, ...series, ...seasons, ...episodes);

            return results.sort((a, b) => {
                const aExactMatch = a.title.toLowerCase() === term;
                const bExactMatch = b.title.toLowerCase() === term;

                if (aExactMatch && !bExactMatch) return -1;
                if (!aExactMatch && bExactMatch) return 1;

                const aStartsWith = a.title.toLowerCase().startsWith(term);
                const bStartsWith = b.title.toLowerCase().startsWith(term);

                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                return a.title.localeCompare(b.title);
            });
        } catch (error) {
            console.error('Error in global search:', error);
            return [];
        }
    },

    async searchMovies(searchTerm: string): Promise<SearchResult[]> {
        try {
            const moviesSnapshot = await getDocs(collection(db, MOVIES_COLLECTION));
            const results: SearchResult[] = [];

            moviesSnapshot.docs.forEach(doc => {
                const movie = doc.data() as Movie;

                if (movie.hidden) return;

                const titleMatch = movie.title?.toLowerCase().includes(searchTerm);
                const descriptionMatch = movie.overview?.toLowerCase().includes(searchTerm);

                if (titleMatch || descriptionMatch) {
                    results.push({
                        id: doc.id,
                        uid: movie.uid,
                        title: movie.title,
                        description: movie.overview || '',
                        imageUrl: movie.backdrop_path || movie.poster_path || movie.picture_path,
                        type: 'movie'
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('Error searching movies:', error);
            return [];
        }
    },

    async searchSeries(searchTerm: string): Promise<SearchResult[]> {
        try {
            const [seriesSnapshot, seasonsSnapshot, episodesSnapshot] = await Promise.all([
                getDocs(collection(db, SERIES_COLLECTION)),
                getDocs(collection(db, SEASONS_SERIES_COLLECTION)),
                getDocs(collection(db, EPISODES_SERIES_COLLECTION))
            ]);
            const results: SearchResult[] = [];
            const seriesMap = new Map<string, any>();
            const seasonToSerieMap = new Map<string, string>();

            seriesSnapshot.docs.forEach(doc => {
                const serie = doc.data() as any;
                seriesMap.set(serie.uid_serie, serie);
            });

            seasonsSnapshot.docs.forEach(doc => {
                const season = doc.data() as any;
                seasonToSerieMap.set(season.uid_season, season.uid_serie);
            });

            seriesSnapshot.docs.forEach(doc => {
                const serie = doc.data() as any;

                if (serie.is_hidden) return;

                const titleMatch = serie.title_serie?.toLowerCase().includes(searchTerm);
                const overviewMatch = serie.overview_serie?.toLowerCase().includes(searchTerm);

                if (titleMatch || overviewMatch) {
                    results.push({
                        id: doc.id,
                        uid: serie.uid_serie,
                        uid_serie: serie.uid_serie,
                        title: serie.title_serie,
                        description: serie.overview_serie || '',
                        imageUrl: serie.image_path || serie.back_path,
                        type: serie.serie_type === 'podcast' ? 'podcast' : 'serie'
                    });
                }
            });

            const matchedSeriesUids = new Set<string>();

            episodesSnapshot.docs.forEach(doc => {
                const episode = doc.data() as EpisodeSerie;

                if (episode.hidden) return;

                const titleMatch = episode.title?.toLowerCase().includes(searchTerm);
                const overviewMatch = episode.overview?.toLowerCase().includes(searchTerm);
                const overviewFrMatch = episode.overviewFr?.toLowerCase().includes(searchTerm);
                const keywordsMatch = episode.search_keywords?.some(
                    keyword => keyword.toLowerCase().includes(searchTerm)
                );

                if (titleMatch || overviewMatch || overviewFrMatch || keywordsMatch) {
                    const uidSerie = seasonToSerieMap.get(episode.uid_season);
                    if (uidSerie) {
                        matchedSeriesUids.add(uidSerie);
                    }
                }
            });

            matchedSeriesUids.forEach(uidSerie => {
                const serie = seriesMap.get(uidSerie);
                if (serie && !serie.is_hidden) {
                    const alreadyExists = results.some(r => r.uid_serie === serie.uid_serie);
                    if (!alreadyExists) {
                        results.push({
                            id: serie.id || uidSerie,
                            uid: serie.uid_serie,
                            uid_serie: serie.uid_serie,
                            title: serie.title_serie,
                            description: serie.overview_serie || '',
                            imageUrl: serie.image_path || serie.back_path,
                            type: serie.serie_type === 'podcast' ? 'podcast' : 'serie'
                        });
                    }
                }
            });

            return results;
        } catch (error) {
            console.error('Error searching series:', error);
            return [];
        }
    },

    async searchSeasons(searchTerm: string): Promise<SearchResult[]> {
        try {
            const [seasonsSnapshot, episodesSnapshot] = await Promise.all([
                getDocs(collection(db, SEASONS_SERIES_COLLECTION)),
                getDocs(collection(db, EPISODES_SERIES_COLLECTION))
            ]);
            const results: SearchResult[] = [];
            const seasonsMap = new Map<string, any>();

            seasonsSnapshot.docs.forEach(doc => {
                const season = doc.data() as any;
                seasonsMap.set(season.uid_season, season);
            });

            seasonsSnapshot.docs.forEach(doc => {
                const season = doc.data() as any;

                const titleMatch = season.title_season?.toLowerCase().includes(searchTerm);
                const overviewMatch = season.overview?.toLowerCase().includes(searchTerm);

                if (titleMatch || overviewMatch) {
                    results.push({
                        id: doc.id,
                        uid: season.uid_season,
                        uid_serie: season.uid_serie,
                        uid_season: season.uid_season,
                        title: season.title_season,
                        description: season.overview || '',
                        imageUrl: season.poster_path || season.backdrop_path,
                        type: 'season',
                        serieTitle: season.title_serie,
                        seasonNumber: season.season_number
                    });
                }
            });

            const matchedSeasonUids = new Set<string>();

            episodesSnapshot.docs.forEach(doc => {
                const episode = doc.data() as EpisodeSerie;

                if (episode.hidden) return;

                const titleMatch = episode.title?.toLowerCase().includes(searchTerm);
                const overviewMatch = episode.overview?.toLowerCase().includes(searchTerm);
                const overviewFrMatch = episode.overviewFr?.toLowerCase().includes(searchTerm);
                const keywordsMatch = episode.search_keywords?.some(
                    keyword => keyword.toLowerCase().includes(searchTerm)
                );

                if (titleMatch || overviewMatch || overviewFrMatch || keywordsMatch) {
                    matchedSeasonUids.add(episode.uid_season);
                }
            });

            matchedSeasonUids.forEach(uidSeason => {
                const season = seasonsMap.get(uidSeason);
                if (season) {
                    const alreadyExists = results.some(r => r.uid_season === season.uid_season);
                    if (!alreadyExists) {
                        results.push({
                            id: season.id || uidSeason,
                            uid: season.uid_season,
                            uid_serie: season.uid_serie,
                            uid_season: season.uid_season,
                            title: season.title_season,
                            description: season.overview || '',
                            imageUrl: season.poster_path || season.backdrop_path,
                            type: 'season',
                            serieTitle: season.title_serie,
                            seasonNumber: season.season_number
                        });
                    }
                }
            });

            return results;
        } catch (error) {
            console.error('Error searching seasons:', error);
            return [];
        }
    },

    async searchEpisodes(searchTerm: string): Promise<SearchResult[]> {
        try {
            const episodesSnapshot = await getDocs(collection(db, EPISODES_SERIES_COLLECTION));
            const results: SearchResult[] = [];

            episodesSnapshot.docs.forEach(doc => {
                const episode = doc.data() as EpisodeSerie;

                if (episode.hidden) return;

                const titleMatch = episode.title?.toLowerCase().includes(searchTerm);
                const overviewMatch = episode.overview?.toLowerCase().includes(searchTerm);
                const overviewFrMatch = episode.overviewFr?.toLowerCase().includes(searchTerm);
                const keywordsMatch = episode.search_keywords?.some(
                    keyword => keyword.toLowerCase().includes(searchTerm)
                );

                if (titleMatch || overviewMatch || overviewFrMatch || keywordsMatch) {
                    results.push({
                        id: doc.id,
                        uid: episode.uid_episode,
                        uid_episode: episode.uid_episode,
                        uid_season: episode.uid_season,
                        title: episode.title,
                        description: episode.overviewFr || episode.overview || '',
                        imageUrl: episode.backdrop_path || episode.picture_path,
                        type: 'episode',
                        serieTitle: episode.title_serie,
                        episodeNumber: episode.episode_numero
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('Error searching episodes:', error);
            return [];
        }
    },

    async searchByType(searchTerm: string, type: 'movie' | 'serie' | 'podcast' | 'season' | 'episode'): Promise<SearchResult[]> {
        const term = searchTerm.toLowerCase().trim();

        switch (type) {
            case 'movie':
                return this.searchMovies(term);
            case 'serie':
                const series = await this.searchSeries(term);
                return series.filter(s => s.type === 'serie');
            case 'podcast':
                const podcasts = await this.searchSeries(term);
                return podcasts.filter(p => p.type === 'podcast');
            case 'season':
                return this.searchSeasons(term);
            case 'episode':
                return this.searchEpisodes(term);
            default:
                return [];
        }
    }
};

export const viewService = {
    async recordView(uid: string, videoType: 'movie' | 'episode', userUid: string): Promise<void> {
        try {
            const viewData: UserView = {
                view_date: new Date().toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short'
                }),
                uid: uid,
                video_type: videoType,
                user_uid: userUid
            };

            await setDoc(doc(collection(db, USER_VIEW_COLLECTION)), viewData);

            if (videoType === 'movie') {
                await this.incrementMovieViews(uid);
            } else if (videoType === 'episode') {
                await this.incrementEpisodeViews(uid);
            }
        } catch (error) {
            console.error('Error recording view:', error);
            throw error;
        }
    },

    async incrementMovieViews(movieUid: string): Promise<void> {
        try {
            const q = query(
                collection(db, MOVIES_COLLECTION),
                where('uid', '==', movieUid),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const movieDoc = querySnapshot.docs[0];
                const currentViews = movieDoc.data().views || 0;

                await updateDoc(movieDoc.ref, {
                    views: currentViews + 1
                });
            }
        } catch (error) {
            console.error('Error incrementing movie views:', error);
        }
    },

    async incrementEpisodeViews(episodeUid: string): Promise<void> {
        try {
            const q = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_episode', '==', episodeUid),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const episodeDoc = querySnapshot.docs[0];
                const currentViews = episodeDoc.data().views || 0;

                await updateDoc(episodeDoc.ref, {
                    views: currentViews + 1
                });
            }
        } catch (error) {
            console.error('Error incrementing episode views:', error);
        }
    },

    async getViewCount(uid: string, videoType: 'movie' | 'episode'): Promise<number> {
        try {
            const q = query(
                collection(db, USER_VIEW_COLLECTION),
                where('uid', '==', uid),
                where('video_type', '==', videoType)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.size;
        } catch (error) {
            console.error('Error getting view count:', error);
            return 0;
        }
    },

    async hasUserViewed(uid: string, videoType: 'movie' | 'episode', userUid: string): Promise<boolean> {
        try {
            const q = query(
                collection(db, USER_VIEW_COLLECTION),
                where('uid', '==', uid),
                where('video_type', '==', videoType),
                where('user_uid', '==', userUid),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking if user viewed:', error);
            return false;
        }
    },

    async getMostWatchedItems(limitCount: number = 10): Promise<Array<{ uid: string; type: 'movie' | 'episode'; viewCount: number; title: string }>> {
        try {
            const watchedItems: Array<{ uid: string; type: 'movie' | 'episode'; viewCount: number; title: string }> = [];

            const moviesQuery = query(
                collection(db, MOVIES_COLLECTION),
                where('hidden', '==', false),
                where('views', '>', 0)
            );
            const moviesSnapshot = await getDocs(moviesQuery);

            moviesSnapshot.docs.forEach(doc => {
                const movie = doc.data() as Movie;
                if (movie.views) {
                    watchedItems.push({
                        uid: movie.uid,
                        type: 'movie',
                        viewCount: movie.views,
                        title: movie.title
                    });
                }
            });

            const episodesQuery = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('hidden', '==', false),
                where('views', '>', 0)
            );
            const episodesSnapshot = await getDocs(episodesQuery);

            episodesSnapshot.docs.forEach(doc => {
                const episode = doc.data() as EpisodeSerie;
                if (episode.views) {
                    watchedItems.push({
                        uid: episode.uid_episode,
                        type: 'episode',
                        viewCount: episode.views,
                        title: episode.title
                    });
                }
            });

            const sortedItems = watchedItems
                .sort((a, b) => b.viewCount - a.viewCount)
                .slice(0, limitCount);

            return sortedItems;
        } catch (error) {
            console.error('Error getting most watched items:', error);
            return [];
        }
    }
};

export const navigationTrackingService = {
    MAX_PAGES_TO_KEEP: 5,
    MIN_TIME_BETWEEN_SAME_PAGE: 3000,

    async recordNavigation(
        userUid: string,
        pagePath: string,
        pageName: string,
        isOnline: boolean = true,
        videoTitle?: string,
        videoUid?: string
    ): Promise<void> {
        try {
            if (!isOnline) {
                return;
            }

            const userNavRef = doc(db, USER_NAVIGATION_COLLECTION, userUid);
            const userNavDoc = await getDoc(userNavRef);

            const now = Timestamp.now();
            const newEntry: NavigationEntry = {
                page_path: pagePath,
                page_name: pageName,
                timestamp: now,
                ...(videoTitle && { video_title: videoTitle }),
                ...(videoUid && { video_uid: videoUid })
            };

            if (!userNavDoc.exists()) {
                const newData: Omit<UserNavigation, 'id'> = {
                    user_uid: userUid,
                    lastTwoPages: [newEntry],
                    updatedAt: now
                };
                await setDoc(userNavRef, newData);
            } else {
                const existingData = userNavDoc.data() as UserNavigation;
                let lastTwoPages = existingData.lastTwoPages || [];

                if (lastTwoPages.length > 0) {
                    const lastPage = lastTwoPages[lastTwoPages.length - 1];
                    const lastPageTime = lastPage.timestamp instanceof Date
                        ? lastPage.timestamp.getTime()
                        : lastPage.timestamp instanceof Timestamp
                            ? lastPage.timestamp.toMillis()
                            : new Date(lastPage.timestamp).getTime();

                    const nowTime = now.toMillis();
                    const timeSinceLastNav = nowTime - lastPageTime;

                    if (lastPage.page_path === pagePath && timeSinceLastNav < this.MIN_TIME_BETWEEN_SAME_PAGE) {
                        return;
                    }
                }

                lastTwoPages.push(newEntry);

                if (lastTwoPages.length > this.MAX_PAGES_TO_KEEP) {
                    lastTwoPages = lastTwoPages.slice(-this.MAX_PAGES_TO_KEEP);
                }

                await updateDoc(userNavRef, {
                    lastTwoPages: lastTwoPages.map(entry => ({
                        ...entry,
                        timestamp: entry.timestamp instanceof Date
                            ? Timestamp.fromDate(entry.timestamp)
                            : entry.timestamp instanceof Timestamp
                                ? entry.timestamp
                                : Timestamp.fromDate(new Date(entry.timestamp))
                    })),
                    updatedAt: now
                });
            }
        } catch (error) {
            console.error('Error recording navigation:', error);
        }
    },

    async getUserNavigationHistory(userUid: string): Promise<NavigationEntry[]> {
        try {
            const userNavRef = doc(db, USER_NAVIGATION_COLLECTION, userUid);
            const userNavDoc = await getDoc(userNavRef);

            if (!userNavDoc.exists()) {
                return [];
            }

            const data = userNavDoc.data() as UserNavigation;
            const lastTwoPages = data.lastTwoPages || [];

            return lastTwoPages.map(entry => ({
                ...entry,
                timestamp: entry.timestamp instanceof Timestamp
                    ? entry.timestamp.toDate()
                    : entry.timestamp instanceof Date
                        ? entry.timestamp
                        : new Date(entry.timestamp)
            }));
        } catch (error) {
            console.error('Error getting user navigation history:', error);
            return [];
        }
    }
};
