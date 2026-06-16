import { Timestamp, DocumentReference } from 'firebase/firestore';
import {
    userService as realUserService,
    titleSuggestionService as realTitleSuggestionService,
    commentService as realCommentService,
    movieService as realMovieService,
    serieService as realSerieService,
    seasonSerieService as realSeasonSerieService,
    episodeSerieService as realEpisodeSerieService,
    serieCategoryService as realSerieCategoryService,
    likeService as realLikeService,
    bookDocService as realBookDocService,
    bookSeriesService as realBookSeriesService,
    statsVuesService as realStatsVuesService,
    searchService as realSearchService,
    viewService as realViewService,
    userMetricsService as realUserMetricsService,
    userGeographyService as realUserGeographyService,
    infoBarService as realInfoBarService,
    appSettingsService as realAppSettingsService,
    adService as realAdService,
    notificationService as realNotificationService,
    navigationTrackingService as realNavigationTrackingService,
    reportService as realReportService,
    dailyActivityService as realDailyActivityService,
} from '../firestore';

import type {
    UserProfile,
    SerieCategory,
    Serie,
    SeasonSerie,
    EpisodeSerie,
    Movie,
    Comment,
    Like,
    Report,
    TitleSuggestion,
    Notification,
    InfoBarMessage,
    Ad,
    AdSettings,
    AppSettings,
    BookDoc,
    BookSeries,
    StatsVues,
    UserView,
    NavigationEntry,
    UserNavigation,
    SearchResult,
    ContinueWatchingItem,
} from '../firestore';

const localProfiles: UserProfile[] = [];
const localComments: Comment[] = [];
const localLikes: Like[] = [];
const localBookDocs: BookDoc[] = [];
const localBookSeries: BookSeries[] = [];
const localStatsVues: (StatsVues & { isEpisode?: boolean })[] = [];
const localUserViews: UserView[] = [];
const localReports: Report[] = [];
const localSuggestions: TitleSuggestion[] = [];
const localNotifications: Notification[] = [];
const localCategories: SerieCategory[] = [];
const localAds: Ad[] = [];
const localInfoBarMessages: InfoBarMessage[] = [];
const localNavigations: UserNavigation[] = [];

let mockIdCounter = 1000;
const nextId = () => `mock-${mockIdCounter++}`;

export const userService = {
    async getUserProfile(uid: string): Promise<UserProfile | null> {
        const local = localProfiles.find(p => p.uid === uid);
        if (local) return local;
        try {
            return await realUserService.getUserProfile(uid);
        } catch {
            return null;
        }
    },

    async createUserProfile(userData: Omit<UserProfile, 'createdAt' | 'updatedAt'>): Promise<void> {
        const profile: UserProfile = {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const existing = localProfiles.findIndex(p => p.uid === userData.uid);
        if (existing >= 0) {
            localProfiles[existing] = profile;
        } else {
            localProfiles.push(profile);
        }
    },

    async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        let idx = localProfiles.findIndex(p => p.uid === uid);
        if (idx < 0) {
            const real = await realUserService.getUserProfile(uid);
            if (real) localProfiles.push(real);
            idx = localProfiles.findIndex(p => p.uid === uid);
        }
        if (idx < 0) throw new Error('User not found');
        localProfiles[idx] = { ...localProfiles[idx], ...updates, updatedAt: new Date() };
        return localProfiles[idx];
    },

    async toggleBookmark(uid: string, movieId: string): Promise<void> {
        try {
            await realUserService.toggleBookmark(uid, movieId);
        } catch {
            const user = localProfiles.find(p => p.uid === uid);
            if (!user) throw new Error('User profile not found');
            const ids = user.bookmarkedIds || [];
            if (ids.includes(movieId)) {
                user.bookmarkedIds = ids.filter(id => id !== movieId);
            } else {
                user.bookmarkedIds = [...ids, movieId];
            }
            user.updatedAt = new Date();
        }
    },

    async getUserBookmarks(uid: string): Promise<string[]> {
        try {
            return await realUserService.getUserBookmarks(uid);
        } catch {
            const user = localProfiles.find(p => p.uid === uid);
            return user?.bookmarkedIds || [];
        }
    },

    async setAdminStatus(uid: string, isAdmin: boolean): Promise<void> {
        const idx = localProfiles.findIndex(p => p.uid === uid);
        if (idx >= 0) {
            localProfiles[idx].isAdmin = isAdmin;
            localProfiles[idx].updatedAt = new Date();
        }
    },

    async getActiveUsers(limitCount: number = 50): Promise<UserProfile[]> {
        try {
            return await realUserService.getActiveUsers(limitCount);
        } catch {
            return localProfiles
                .filter(u => u.presence === 'online' || u.presence === 'idle')
                .slice(0, limitCount);
        }
    },

    async getAllUsers(limitCount: number = 1000): Promise<UserProfile[]> {
        try {
            return await realUserService.getAllUsers(limitCount);
        } catch {
            return localProfiles.slice(0, limitCount);
        }
    },

    subscribeToOnlineUsers(callback: (users: (UserProfile & { lastSeen?: Date | Timestamp | number; updatedAt?: Date | Timestamp })[]) => void, includeInactive: boolean = false): () => void {
        return realUserService.subscribeToOnlineUsers(callback, includeInactive);
    },
};

export const titleSuggestionService = {
    async createSuggestion(data: Omit<TitleSuggestion, 'uid' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = nextId();
        const now = Timestamp.now();
        localSuggestions.push({
            ...data,
            uid: id,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        } as TitleSuggestion);
        return id;
    },

    async getUserSuggestions(userId: string): Promise<TitleSuggestion[]> {
        const local = localSuggestions
            .filter(s => s.userId === userId)
            .sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
        try {
            const real = await realTitleSuggestionService.getUserSuggestions(userId);
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
            return merged;
        } catch {
            return local;
        }
    },

    subscribeToUserSuggestions(userId: string, callback: (suggestions: TitleSuggestion[]) => void): () => void {
        return realTitleSuggestionService.subscribeToUserSuggestions(userId, callback);
    },

    async getAllSuggestions(): Promise<TitleSuggestion[]> {
        const local = [...localSuggestions].sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });
        try {
            const real = await realTitleSuggestionService.getAllSuggestions();
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
            return merged;
        } catch {
            return local;
        }
    },

    async applySuggestion(suggestionId: string, respondedBy: string): Promise<void> {
        const suggestion = localSuggestions.find(s => s.uid === suggestionId);
        if (!suggestion) throw new Error('Suggestion not found');
        suggestion.status = 'accepted';
        suggestion.respondedBy = respondedBy;
        suggestion.respondedAt = Timestamp.now();
        suggestion.updatedAt = Timestamp.now();
    },

    async rejectSuggestion(suggestionId: string, respondedBy: string, adminNote?: string): Promise<void> {
        const suggestion = localSuggestions.find(s => s.uid === suggestionId);
        if (!suggestion) throw new Error('Suggestion not found');
        suggestion.status = 'rejected';
        suggestion.respondedBy = respondedBy;
        suggestion.adminNote = adminNote || '';
        suggestion.respondedAt = Timestamp.now();
        suggestion.updatedAt = Timestamp.now();
    },
};

export const commentService = {
    async getComments(itemUid: string): Promise<Comment[]> {
        const local = localComments.filter(c => c.uid === itemUid);
        try {
            const real = await realCommentService.getComments(itemUid);
            return [...real, ...local];
        } catch {
            return local;
        }
    },

    async addComment(itemUid: string, text: string, user: UserProfile): Promise<Comment | null> {
        const commentData: Omit<Comment, 'uid'> = {
            comment: text,
            created_at: new Date().toLocaleString('fr-FR', { timeZoneName: 'short' }),
            created_by: user.display_name || user.email.split('@')[0],
        };
        if (user.photo_url) {
            commentData.user_photo_url = user.photo_url;
        }
        const comment: Comment = { ...commentData, uid: itemUid };
        localComments.push(comment);
        return comment;
    },
};

export const movieService = {
    async getAllMovies(): Promise<Movie[]> {
        try {
            return await realMovieService.getAllMovies();
        } catch {
            return [];
        }
    },

    async getMovieById(uid: string): Promise<Movie | null> {
        try {
            return await realMovieService.getMovieById(uid);
        } catch {
            return null;
        }
    },

    async getMovieByUid(uid: string): Promise<Movie | null> {
        try {
            return await realMovieService.getMovieByUid(uid);
        } catch {
            return null;
        }
    },

    async getPopularMovies(limitCount: number = 10): Promise<Movie[]> {
        try {
            return await realMovieService.getPopularMovies(limitCount);
        } catch {
            return [];
        }
    },

    async getTrendingMovies(limitCount: number = 10): Promise<Movie[]> {
        try {
            return await realMovieService.getTrendingMovies(limitCount);
        } catch {
            return [];
        }
    },

    async getHomeDisplayMovies(): Promise<Movie[]> {
        try {
            return await realMovieService.getHomeDisplayMovies();
        } catch {
            return [];
        }
    },

    async getTenHomeMovies(): Promise<Movie[]> {
        try {
            return await realMovieService.getTenHomeMovies();
        } catch {
            return [];
        }
    },

    async searchMovies(searchTerm: string): Promise<Movie[]> {
        try {
            return await realMovieService.searchMovies(searchTerm);
        } catch {
            return [];
        }
    },

    async getBookmarkedMovies(movieIds: string[]): Promise<Movie[]> {
        try {
            return await realMovieService.getBookmarkedMovies(movieIds);
        } catch {
            return [];
        }
    },
};

export const serieService = {
    async getAllSeries(): Promise<Serie[]> {
        try {
            return await realSerieService.getAllSeries();
        } catch {
            return [];
        }
    },

    async getSerieById(id: string): Promise<Serie | null> {
        try {
            return await realSerieService.getSerieById(id);
        } catch {
            return null;
        }
    },

    async getSerieByUid(uid_serie: string): Promise<Serie | null> {
        try {
            return await realSerieService.getSerieByUid(uid_serie);
        } catch {
            return null;
        }
    },

    async getHomeDisplaySeries(): Promise<Serie[]> {
        try {
            return await realSerieService.getHomeDisplaySeries();
        } catch {
            return [];
        }
    },

    async getSeriesByLanguage(lang: string): Promise<Serie[]> {
        try {
            return await realSerieService.getSeriesByLanguage(lang);
        } catch {
            return [];
        }
    },

    async getAllPodcasts(): Promise<Serie[]> {
        try {
            return await realSerieService.getAllPodcasts();
        } catch {
            return [];
        }
    },

    async getAllSeriesOnly(): Promise<Serie[]> {
        try {
            return await realSerieService.getAllSeriesOnly();
        } catch {
            return [];
        }
    },

    async getHomeDisplaySeriesOnly(): Promise<Serie[]> {
        try {
            return await realSerieService.getHomeDisplaySeriesOnly();
        } catch {
            return [];
        }
    },

    async getHomeDisplayPodcasts(): Promise<Serie[]> {
        try {
            return await realSerieService.getHomeDisplayPodcasts();
        } catch {
            return [];
        }
    },

    async getPodcastsByLanguage(lang: string): Promise<Serie[]> {
        try {
            return await realSerieService.getPodcastsByLanguage(lang);
        } catch {
            return [];
        }
    },

    async getPodcastById(id: string): Promise<Serie | null> {
        try {
            return await realSerieService.getPodcastById(id);
        } catch {
            return null;
        }
    },

    async getTenHomeSeries(): Promise<Serie[]> {
        try {
            return await realSerieService.getTenHomeSeries();
        } catch {
            return [];
        }
    },

    async getTenHomePodcasts(): Promise<Serie[]> {
        try {
            return await realSerieService.getTenHomePodcasts();
        } catch {
            return [];
        }
    },

    async updateSerieById(id: string, updates: Partial<Serie>): Promise<void> {
        try {
            await realSerieService.updateSerieById(id, updates);
        } catch {
        }
    },

    async updateSerieByUid(uid_serie: string, updates: Partial<Serie>): Promise<void> {
        try {
            await realSerieService.updateSerieByUid(uid_serie, updates);
        } catch {
        }
    },

    async calculateAndUpdateSeriesStats(uid_serie: string): Promise<void> {
    },

    async updateAllSeriesStats(): Promise<void> {
    },
};

export const seasonSerieService = {
    async getAllSeasons(): Promise<SeasonSerie[]> {
        try {
            return await realSeasonSerieService.getAllSeasons();
        } catch {
            return [];
        }
    },

    async getSeasonById(id: string): Promise<SeasonSerie | null> {
        try {
            return await realSeasonSerieService.getSeasonById(id);
        } catch {
            return null;
        }
    },

    async getSeasonsBySerie(uid_serie: string, userId?: string): Promise<SeasonSerie[]> {
        try {
            return await realSeasonSerieService.getSeasonsBySerie(uid_serie, userId);
        } catch {
            return [];
        }
    },

    async getSeasonBySerieAndNumber(uid_serie: string, season_number: number): Promise<SeasonSerie | null> {
        try {
            return await realSeasonSerieService.getSeasonBySerieAndNumber(uid_serie, season_number);
        } catch {
            return null;
        }
    },

    async getSeasonByUid(uid_season: string): Promise<SeasonSerie | null> {
        try {
            return await realSeasonSerieService.getSeasonByUid(uid_season);
        } catch {
            return null;
        }
    },

    async updateSeasonById(id: string, updates: Partial<SeasonSerie>): Promise<void> {
        try {
            await realSeasonSerieService.updateSeasonById(id, updates);
        } catch {
        }
    },

    async updateSeasonByUid(uid_season: string, updates: Partial<SeasonSerie>): Promise<void> {
        try {
            await realSeasonSerieService.updateSeasonByUid(uid_season, updates);
        } catch {
        }
    },

    async getEpisodesForSeason(uid_season: string): Promise<EpisodeSerie[]> {
        try {
            return await realSeasonSerieService.getEpisodesForSeason(uid_season);
        } catch {
            return [];
        }
    },

    async getActualEpisodeCount(uid_season: string): Promise<number> {
        try {
            return await realSeasonSerieService.getActualEpisodeCount(uid_season);
        } catch {
            return 0;
        }
    },
};

export const episodeSerieService = {
    async getAllEpisodes(): Promise<EpisodeSerie[]> {
        try {
            return await realEpisodeSerieService.getAllEpisodes();
        } catch {
            return [];
        }
    },

    async getEpisodeById(id: string): Promise<EpisodeSerie | null> {
        try {
            return await realEpisodeSerieService.getEpisodeById(id);
        } catch {
            return null;
        }
    },

    async getEpisodeByUid(uid_episode: string): Promise<EpisodeSerie | null> {
        try {
            return await realEpisodeSerieService.getEpisodeByUid(uid_episode);
        } catch {
            return null;
        }
    },

    async getEpisodesBySeason(uid_season: string): Promise<EpisodeSerie[]> {
        try {
            return await realEpisodeSerieService.getEpisodesBySeason(uid_season);
        } catch {
            return [];
        }
    },

    async getEpisodeBySeasonAndNumber(uid_season: string, episode_numero: number): Promise<EpisodeSerie | null> {
        try {
            return await realEpisodeSerieService.getEpisodeBySeasonAndNumber(uid_season, episode_numero);
        } catch {
            return null;
        }
    },

    async getEpisodesBySerie(uid_serie: string): Promise<EpisodeSerie[]> {
        try {
            return await realEpisodeSerieService.getEpisodesBySerie(uid_serie);
        } catch {
            return [];
        }
    },

    async searchEpisodes(searchTerm: string): Promise<EpisodeSerie[]> {
        try {
            return await realEpisodeSerieService.searchEpisodes(searchTerm);
        } catch {
            return [];
        }
    },

    async updateEpisodeById(id: string, updates: Partial<EpisodeSerie>): Promise<void> {
        try {
            await realEpisodeSerieService.updateEpisodeById(id, updates);
        } catch {
        }
    },

    async updateEpisodeByUid(uid_episode: string, updates: Partial<EpisodeSerie>): Promise<void> {
        try {
            await realEpisodeSerieService.updateEpisodeByUid(uid_episode, updates);
        } catch {
        }
    },

    async addEpisodeToSeason(uid_episode: string, targetSeasonUid: string): Promise<void> {
        try {
            await realEpisodeSerieService.addEpisodeToSeason(uid_episode, targetSeasonUid);
        } catch {
        }
    },

    async removeEpisodeFromSeason(uid_episode: string, seasonUid: string): Promise<void> {
        try {
            await realEpisodeSerieService.removeEpisodeFromSeason(uid_episode, seasonUid);
        } catch {
        }
    },

    getEpisodeNumberForSeason(episode: EpisodeSerie, seasonUid: string): number {
        return realEpisodeSerieService.getEpisodeNumberForSeason(episode, seasonUid);
    },

    getEpisodeSeasons(episode: EpisodeSerie): string[] {
        return realEpisodeSerieService.getEpisodeSeasons(episode);
    },
};

export const serieCategoryService = {
    async getAllCategories(): Promise<SerieCategory[]> {
        const local = [...localCategories].sort((a, b) => (a.order || 0) - (b.order || 0));
        try {
            const real = await realSerieCategoryService.getAllCategories();
            const merged = [...real, ...local];
            merged.sort((a, b) => (a.order || 0) - (b.order || 0));
            return merged;
        } catch {
            return local;
        }
    },

    async getCategoryById(id: string): Promise<SerieCategory | null> {
        const local = localCategories.find(c => c.id === id);
        if (local) return local;
        try {
            return await realSerieCategoryService.getCategoryById(id);
        } catch {
            return null;
        }
    },

    async createCategory(category: Omit<SerieCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = nextId();
        const now = new Date().toISOString();
        localCategories.push({ ...category, id, createdAt: now, updatedAt: now, order: category.order || 0 });
        return id;
    },

    async updateCategory(id: string, updates: Partial<Omit<SerieCategory, 'id' | 'createdAt'>>): Promise<void> {
        const idx = localCategories.findIndex(c => c.id === id);
        if (idx >= 0) {
            localCategories[idx] = { ...localCategories[idx], ...updates, updatedAt: new Date().toISOString() };
        }
    },

    async deleteCategory(id: string): Promise<void> {
        const idx = localCategories.findIndex(c => c.id === id);
        if (idx >= 0) localCategories.splice(idx, 1);
    },

    async getSeriesByCategory(categoryId: string): Promise<Serie[]> {
        try {
            return await realSerieCategoryService.getSeriesByCategory(categoryId);
        } catch {
            return [];
        }
    },
};

export const likeService = {
    async toggleLike(itemUid: string, itemTitle: string, user: UserProfile): Promise<boolean> {
        const existingIdx = localLikes.findIndex(l => l.uid === itemUid && l.likedby === user.email);
        if (existingIdx >= 0) {
            localLikes.splice(existingIdx, 1);
            return false;
        }
        const newLike: Like = {
            isliked: true,
            liked_at: new Date().toLocaleString('fr-FR', { timeZoneName: 'short' }),
            likedby: user.email,
            title: itemTitle,
            uid: itemUid,
            username: user.display_name || user.email.split('@')[0],
        };
        localLikes.push(newLike);
        return true;
    },

    async getLikeCount(itemUid: string): Promise<number> {
        const localCount = localLikes.filter(l => l.uid === itemUid && l.isliked).length;
        try {
            const realCount = await realLikeService.getLikeCount(itemUid);
            return realCount + localCount;
        } catch {
            return localCount;
        }
    },

    async hasUserLiked(itemUid: string, userEmail: string): Promise<boolean> {
        const local = localLikes.some(l => l.uid === itemUid && l.likedby === userEmail && l.isliked);
        if (local) return true;
        try {
            return await realLikeService.hasUserLiked(itemUid, userEmail);
        } catch {
            return false;
        }
    },

    async getMostLikedItems(limitCount: number = 10): Promise<Array<{ uid: string; likeCount: number; title: string }>> {
        try {
            return await realLikeService.getMostLikedItems(limitCount);
        } catch {
            const likesMap = new Map<string, { count: number; title: string }>();
            localLikes.forEach(l => {
                const current = likesMap.get(l.uid);
                if (current) {
                    current.count++;
                } else {
                    likesMap.set(l.uid, { count: 1, title: l.title });
                }
            });
            return Array.from(likesMap.entries())
                .map(([uid, data]) => ({ uid, likeCount: data.count, title: data.title }))
                .sort((a, b) => b.likeCount - a.likeCount)
                .slice(0, limitCount);
        }
    },
};

export const bookDocService = {
    async addBookmark(movieOrSerieUid: string, userEmail: string, title: string, description: string, image: string, isseries: boolean = false): Promise<BookDoc | null> {
        const existing = localBookDocs.find(b => b.uid === movieOrSerieUid && b.email === userEmail);
        if (existing) return existing;
        const newBookmark: BookDoc = {
            add_at: new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }),
            description,
            email: userEmail,
            image,
            isseries,
            title,
            uid: movieOrSerieUid,
        };
        localBookDocs.push(newBookmark);
        return newBookmark;
    },

    async removeBookmark(movieOrSerieUid: string, userEmail: string): Promise<boolean> {
        const idx = localBookDocs.findIndex(b => b.uid === movieOrSerieUid && b.email === userEmail);
        if (idx >= 0) {
            localBookDocs.splice(idx, 1);
            return true;
        }
        return false;
    },

    async getBookmark(movieOrSerieUid: string, userEmail: string): Promise<BookDoc | null> {
        const local = localBookDocs.find(b => b.uid === movieOrSerieUid && b.email === userEmail);
        if (local) return local;
        try {
            return await realBookDocService.getBookmark(movieOrSerieUid, userEmail);
        } catch {
            return null;
        }
    },

    async getUserBookmarks(userEmail: string): Promise<BookDoc[]> {
        const local = localBookDocs.filter(b => b.email === userEmail);
        try {
            const real = await realBookDocService.getUserBookmarks(userEmail);
            const merged = [...real, ...local];
            const seen = new Set<string>();
            return merged.filter(b => {
                const key = `${b.uid}-${b.email}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        } catch {
            return local;
        }
    },

    async toggleBookmark(movieOrSerieUid: string, userEmail: string, title: string, description: string, image: string, isseries: boolean = false): Promise<boolean> {
        const existing = localBookDocs.find(b => b.uid === movieOrSerieUid && b.email === userEmail);
        if (existing) {
            await this.removeBookmark(movieOrSerieUid, userEmail);
            return false;
        }
        await this.addBookmark(movieOrSerieUid, userEmail, title, description, image, isseries);
        return true;
    },
};

export const bookSeriesService = {
    async addBookmark(episodeUidOrRef: string | any, userEmail: string, title: string, description: string, image: string, moviepath: string, runtime: string, useRefEpisode: boolean = false): Promise<BookSeries | null> {
        const uidToSearch = typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id;
        const existing = localBookSeries.find(b => b.uid === uidToSearch && b.email === userEmail);
        if (existing) return existing;
        const newBookmark: BookSeries = {
            add_at: new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }),
            description,
            email: userEmail,
            image,
            isbooked: true,
            isseries: true,
            moviepath,
            runtime,
            title,
            ...(useRefEpisode ? { refEpisode: typeof episodeUidOrRef === 'string' ? { id: episodeUidOrRef } as any : episodeUidOrRef } : { uid: typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id }),
        };
        localBookSeries.push(newBookmark);
        return newBookmark;
    },

    async removeBookmark(episodeUidOrRef: string | any, userEmail: string): Promise<boolean> {
        const uidToSearch = typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id;
        let idx = localBookSeries.findIndex(b => b.uid === uidToSearch && b.email === userEmail);
        if (idx >= 0) {
            localBookSeries.splice(idx, 1);
            return true;
        }
        const refToSearch = typeof episodeUidOrRef === 'string' ? { id: episodeUidOrRef } : episodeUidOrRef;
        idx = localBookSeries.findIndex(b => b.refEpisode && (b.refEpisode as any).id === (refToSearch as any).id && b.email === userEmail);
        if (idx >= 0) {
            localBookSeries.splice(idx, 1);
            return true;
        }
        return false;
    },

    async getBookmark(episodeUidOrRef: string | any, userEmail: string): Promise<BookSeries | null> {
        const uidToSearch = typeof episodeUidOrRef === 'string' ? episodeUidOrRef : episodeUidOrRef.id;
        let found = localBookSeries.find(b => b.uid === uidToSearch && b.email === userEmail);
        if (found) return found;
        const refToSearch = typeof episodeUidOrRef === 'string' ? { id: episodeUidOrRef } : episodeUidOrRef;
        found = localBookSeries.find(b => b.refEpisode && (b.refEpisode as any).id === (refToSearch as any).id && b.email === userEmail);
        if (found) return found;
        try {
            return await realBookSeriesService.getBookmark(episodeUidOrRef, userEmail);
        } catch {
            return null;
        }
    },

    async getUserBookmarks(userEmail: string): Promise<BookSeries[]> {
        const local = localBookSeries.filter(b => b.email === userEmail);
        try {
            const real = await realBookSeriesService.getUserBookmarks(userEmail);
            const merged = [...real, ...local];
            const seen = new Set<string>();
            return merged.filter(b => {
                const key = `${b.uid || (b.refEpisode as any)?.id}-${b.email}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        } catch {
            return local;
        }
    },

    async toggleBookmark(episodeUid: string, userEmail: string, title: string, description: string, image: string, moviepath: string, runtime: string): Promise<boolean> {
        const existing = localBookSeries.find(b => b.uid === episodeUid && b.email === userEmail);
        if (existing) {
            await this.removeBookmark(episodeUid, userEmail);
            return false;
        }
        await this.addBookmark(episodeUid, userEmail, title, description, image, moviepath, runtime);
        return true;
    },
};

export const statsVuesService = {
    async getContinueWatching(userUid: string, limitCount: number = 10): Promise<ContinueWatchingItem[]> {
        try {
            return await realStatsVuesService.getContinueWatching(userUid, limitCount);
        } catch {
            return [];
        }
    },

    async updateViewingProgress(userUid: string, videoUid: string, currentTime: number, isEpisode: boolean = false): Promise<void> {
        const existingIdx = localStatsVues.findIndex(s => (s as any).user === userUid && s.uid === videoUid);
        if (existingIdx >= 0) {
            localStatsVues[existingIdx].tempsRegarde = currentTime;
            (localStatsVues[existingIdx] as any).dateDernierUpdate = new Date();
        } else {
            const newEntry: any = {
                uid: videoUid,
                user: userUid,
                tempsRegarde: currentTime,
                dateDernierUpdate: new Date(),
                nombreLectures: 1,
                isEpisode,
            };
            localStatsVues.push(newEntry);
        }
    },

    async getAllHistory(userUid: string, limitCount: number = 50): Promise<ContinueWatchingItem[]> {
        try {
            return await realStatsVuesService.getAllHistory(userUid, limitCount);
        } catch {
            return [];
        }
    },
};

export const searchService = {
    async searchAll(searchTerm: string): Promise<SearchResult[]> {
        if (!searchTerm || searchTerm.trim().length === 0) return [];
        try {
            return await realSearchService.searchAll(searchTerm);
        } catch {
            return [];
        }
    },

    async searchMovies(searchTerm: string): Promise<SearchResult[]> {
        try {
            return await realSearchService.searchMovies(searchTerm);
        } catch {
            return [];
        }
    },

    async searchSeries(searchTerm: string): Promise<SearchResult[]> {
        try {
            return await realSearchService.searchSeries(searchTerm);
        } catch {
            return [];
        }
    },

    async searchSeasons(searchTerm: string): Promise<SearchResult[]> {
        try {
            return await realSearchService.searchSeasons(searchTerm);
        } catch {
            return [];
        }
    },

    async searchEpisodes(searchTerm: string): Promise<SearchResult[]> {
        try {
            return await realSearchService.searchEpisodes(searchTerm);
        } catch {
            return [];
        }
    },

    async searchByType(searchTerm: string, type: 'movie' | 'serie' | 'podcast' | 'season' | 'episode'): Promise<SearchResult[]> {
        try {
            return await realSearchService.searchByType(searchTerm, type);
        } catch {
            return [];
        }
    },
};

export const viewService = {
    async recordView(uid: string, videoType: 'movie' | 'episode', userUid: string): Promise<void> {
        const viewData: UserView = {
            view_date: new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }),
            uid,
            video_type: videoType,
            user_uid: userUid,
        };
        localUserViews.push(viewData);
        try {
            await realViewService.recordView(uid, videoType, userUid);
        } catch {
        }
    },

    async incrementMovieViews(movieUid: string): Promise<void> {
        try {
            await realViewService.incrementMovieViews(movieUid);
        } catch {
        }
    },

    async incrementEpisodeViews(episodeUid: string): Promise<void> {
        try {
            await realViewService.incrementEpisodeViews(episodeUid);
        } catch {
        }
    },

    async getViewCount(uid: string, videoType: 'movie' | 'episode'): Promise<number> {
        const localCount = localUserViews.filter(v => v.uid === uid && v.video_type === videoType).length;
        try {
            const realCount = await realViewService.getViewCount(uid, videoType);
            return realCount + localCount;
        } catch {
            return localCount;
        }
    },

    async hasUserViewed(uid: string, videoType: 'movie' | 'episode', userUid: string): Promise<boolean> {
        const local = localUserViews.some(v => v.uid === uid && v.video_type === videoType && v.user_uid === userUid);
        if (local) return true;
        try {
            return await realViewService.hasUserViewed(uid, videoType, userUid);
        } catch {
            return false;
        }
    },

    async getMostWatchedItems(limitCount: number = 10): Promise<Array<{ uid: string; type: 'movie' | 'episode'; viewCount: number; title: string }>> {
        try {
            return await realViewService.getMostWatchedItems(limitCount);
        } catch {
            return [];
        }
    },
};

export const userMetricsService = {
    async getTop10MostConnectedUsers(): Promise<Array<{ user: UserProfile; connectionCount: number }>> {
        try {
            return await realUserMetricsService.getTop10MostConnectedUsers();
        } catch {
            return [];
        }
    },

    async getAverageSessionDuration(): Promise<number> {
        try {
            return await realUserMetricsService.getAverageSessionDuration();
        } catch {
            return 0;
        }
    },

    async getTop10MostActiveUsers(): Promise<Array<{ user: UserProfile; viewCount: number }>> {
        try {
            return await realUserMetricsService.getTop10MostActiveUsers();
        } catch {
            return [];
        }
    },

    async getPeakHours(): Promise<Array<{ hour: number; connectionCount: number }>> {
        try {
            return await realUserMetricsService.getPeakHours();
        } catch {
            return [];
        }
    },

    async getTop10TotalOnlineTime(): Promise<Array<{ user: UserProfile; totalOnlineTime: number }>> {
        try {
            return await realUserMetricsService.getTop10TotalOnlineTime();
        } catch {
            return [];
        }
    },
};

export const userGeographyService = {
    async getUsersByCountry(): Promise<Array<{ countryCode: string; countryName: string; userCount: number; percentage: number }>> {
        try {
            return await realUserGeographyService.getUsersByCountry();
        } catch {
            return [];
        }
    },

    async getTotalUsersWithCountry(): Promise<number> {
        try {
            return await realUserGeographyService.getTotalUsersWithCountry();
        } catch {
            return 0;
        }
    },

    async getTotalUsersWithPhoneNumber(): Promise<number> {
        try {
            return await realUserGeographyService.getTotalUsersWithPhoneNumber();
        } catch {
            return 0;
        }
    },

    async getTotalUsersWithCompleteProfile(): Promise<number> {
        try {
            return await realUserGeographyService.getTotalUsersWithCompleteProfile();
        } catch {
            return 0;
        }
    },

    async getTotalUsers(): Promise<number> {
        try {
            return await realUserGeographyService.getTotalUsers();
        } catch {
            return 0;
        }
    },

    async getTotalUsersWithRGPDConsent(): Promise<number> {
        try {
            return await realUserGeographyService.getTotalUsersWithRGPDConsent();
        } catch {
            return 0;
        }
    },

    async getUsersByCountryCode(countryCode: string): Promise<UserProfile[]> {
        try {
            return await realUserGeographyService.getUsersByCountryCode(countryCode);
        } catch {
            return [];
        }
    },
};

export const infoBarService = {
    async getActiveMessage(): Promise<InfoBarMessage | null> {
        const active = localInfoBarMessages.filter(m => m.isActive);
        if (active.length > 0) return active[0];
        try {
            return await realInfoBarService.getActiveMessage();
        } catch {
            return null;
        }
    },

    async getAllActiveMessages(): Promise<InfoBarMessage[]> {
        const local = localInfoBarMessages
            .filter(m => m.isActive)
            .sort((a, b) => {
                const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
                const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
                return dateB - dateA;
            });
        try {
            const real = await realInfoBarService.getAllActiveMessages();
            return [...real, ...local];
        } catch {
            return local;
        }
    },

    async createMessage(message: string, userId: string): Promise<string> {
        const id = nextId();
        localInfoBarMessages.push({
            id,
            message: message.trim(),
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: userId,
        });
        return id;
    },

    async updateMessage(messageId: string, message: string, userId: string): Promise<void> {
        const idx = localInfoBarMessages.findIndex(m => m.id === messageId);
        if (idx >= 0) {
            localInfoBarMessages[idx].message = message;
            localInfoBarMessages[idx].updatedAt = new Date();
            localInfoBarMessages[idx].createdBy = userId;
        }
    },

    async setMessageActive(messageId: string, isActive: boolean): Promise<void> {
        const idx = localInfoBarMessages.findIndex(m => m.id === messageId);
        if (idx >= 0) {
            localInfoBarMessages[idx].isActive = isActive;
            localInfoBarMessages[idx].updatedAt = new Date();
        }
    },

    async getAllMessages(): Promise<InfoBarMessage[]> {
        const local = [...localInfoBarMessages].sort((a, b) => {
            const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
            const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
            return dateB - dateA;
        });
        try {
            const real = await realInfoBarService.getAllMessages();
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const dateA = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
                const dateB = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
                return dateB - dateA;
            });
            return merged;
        } catch {
            return local;
        }
    },

    async deleteMessage(messageId: string): Promise<void> {
        const idx = localInfoBarMessages.findIndex(m => m.id === messageId);
        if (idx >= 0) localInfoBarMessages.splice(idx, 1);
    },
};

export const appSettingsService = {
    async getAppSettings(): Promise<AppSettings | null> {
        try {
            return await realAppSettingsService.getAppSettings();
        } catch {
            return null;
        }
    },

    async setHomeViewMode(mode: 'default' | 'prime' | 'netflix', userId: string): Promise<void> {
    },
};

export const adService = {
    async getActiveAds(): Promise<Ad[]> {
        const local = localAds
            .filter(a => a.isActive)
            .sort((a, b) => {
                const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });
        try {
            const real = await realAdService.getActiveAds();
            return [...real, ...local];
        } catch {
            return local;
        }
    },

    async getRandomAd(): Promise<Ad | null> {
        const all = await this.getActiveAds();
        if (all.length === 0) return null;
        return all[Math.floor(Math.random() * all.length)];
    },

    async getAllAds(): Promise<Ad[]> {
        const local = [...localAds].sort((a, b) => {
            const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return bTime - aTime;
        });
        try {
            const real = await realAdService.getAllAds();
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });
            return merged;
        } catch {
            return local;
        }
    },

    async createAd(adData: Omit<Ad, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = nextId();
        localAds.push({
            ...adData,
            id,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return id;
    },

    async updateAd(adId: string, updates: Partial<Ad>): Promise<void> {
        const idx = localAds.findIndex(a => a.id === adId);
        if (idx >= 0) {
            localAds[idx] = { ...localAds[idx], ...updates, updatedAt: Timestamp.now() };
        }
    },

    async deleteAd(adId: string): Promise<void> {
        const idx = localAds.findIndex(a => a.id === adId);
        if (idx >= 0) localAds.splice(idx, 1);
    },

    async getAdSettings(): Promise<AdSettings | null> {
        try {
            return await realAdService.getAdSettings();
        } catch {
            return null;
        }
    },

    async updateAdSettings(settings: Partial<AdSettings>, userId: string): Promise<void> {
    },
};

export const notificationService = {
    async createNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string): Promise<string> {
        const id = nextId();
        localNotifications.push({
            id,
            userId,
            title,
            message,
            type,
            read: false,
            createdAt: Timestamp.now(),
            link: link || undefined,
        });
        return id;
    },

    async getUserNotifications(userId: string, limitCount: number = 50): Promise<Notification[]> {
        const local = localNotifications
            .filter(n => n.userId === userId)
            .sort((a, b) => {
                const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            })
            .slice(0, limitCount);
        try {
            const real = await realNotificationService.getUserNotifications(userId, limitCount);
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                return bTime - aTime;
            });
            return merged.slice(0, limitCount);
        } catch {
            return local;
        }
    },

    async markAsRead(notificationId: string): Promise<void> {
        const notif = localNotifications.find(n => n.id === notificationId);
        if (notif) notif.read = true;
    },

    async markAllAsRead(userId: string): Promise<void> {
        localNotifications.forEach(n => {
            if (n.userId === userId && !n.read) n.read = true;
        });
    },

    async deleteNotification(notificationId: string): Promise<void> {
        const idx = localNotifications.findIndex(n => n.id === notificationId);
        if (idx >= 0) localNotifications.splice(idx, 1);
    },

    async getUnreadCount(userId: string): Promise<number> {
        const localCount = localNotifications.filter(n => n.userId === userId && !n.read).length;
        try {
            const realCount = await realNotificationService.getUnreadCount(userId);
            return realCount + localCount;
        } catch {
            return localCount;
        }
    },

    subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
        return realNotificationService.subscribeToUserNotifications(userId, callback);
    },

    async getUsersByCategory(category: 'all' | 'admin' | 'non-admin'): Promise<string[]> {
        try {
            return await realNotificationService.getUsersByCategory(category);
        } catch {
            return [];
        }
    },

    async createNotificationForAllUsers(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string): Promise<{ success: number; errors: number }> {
        try {
            return await realNotificationService.createNotificationForAllUsers(title, message, type, link);
        } catch {
            return { success: 0, errors: 0 };
        }
    },

    async createNotificationForCategory(category: 'all' | 'admin' | 'non-admin', title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', link?: string): Promise<{ success: number; errors: number; category: string }> {
        try {
            return await realNotificationService.createNotificationForCategory(category, title, message, type, link);
        } catch {
            return { success: 0, errors: 0, category };
        }
    },

    async getAllNotificationsGrouped(): Promise<Array<{ title: string; message: string; type: string; link?: string; totalCount: number; readCount: number; unreadCount: number; createdAt: Date | Timestamp; notificationIds: string[] }>> {
        try {
            return await realNotificationService.getAllNotificationsGrouped();
        } catch {
            return [];
        }
    },

    async deleteUnreadNotifications(title: string, message: string, type: string, link?: string): Promise<{ deleted: number; errors: number }> {
        const toRemove = localNotifications.filter(n =>
            n.title === title && n.message === message && n.type === type && !n.read &&
            (link === undefined || n.link === link)
        );
        toRemove.forEach(n => {
            const idx = localNotifications.indexOf(n);
            if (idx >= 0) localNotifications.splice(idx, 1);
        });
        try {
            const real = await realNotificationService.deleteUnreadNotifications(title, message, type, link);
            return { deleted: real.deleted + toRemove.length, errors: real.errors };
        } catch {
            return { deleted: toRemove.length, errors: 0 };
        }
    },

    async deleteAllNotifications(title: string, message: string, type: string, link?: string): Promise<{ deleted: number; errors: number }> {
        const toRemove = localNotifications.filter(n =>
            n.title === title && n.message === message && n.type === type &&
            (link === undefined || n.link === link)
        );
        toRemove.forEach(n => {
            const idx = localNotifications.indexOf(n);
            if (idx >= 0) localNotifications.splice(idx, 1);
        });
        try {
            const real = await realNotificationService.deleteAllNotifications(title, message, type, link);
            return { deleted: real.deleted + toRemove.length, errors: real.errors };
        } catch {
            return { deleted: toRemove.length, errors: 0 };
        }
    },
};

export const navigationTrackingService = {
    MAX_PAGES_TO_KEEP: 5,
    MIN_TIME_BETWEEN_SAME_PAGE: 3000,

    async recordNavigation(userUid: string, pagePath: string, pageName: string, isOnline: boolean = true, videoTitle?: string, videoUid?: string): Promise<void> {
        if (!isOnline) return;
        const now = new Date();
        const newEntry: NavigationEntry = {
            page_path: pagePath,
            page_name: pageName,
            timestamp: now,
            ...(videoTitle && { video_title: videoTitle }),
            ...(videoUid && { video_uid: videoUid }),
        };
        const existingIdx = localNavigations.findIndex(n => n.user_uid === userUid);
        if (existingIdx < 0) {
            localNavigations.push({
                user_uid: userUid,
                lastTwoPages: [newEntry],
                updatedAt: now,
            });
        } else {
            const existing = localNavigations[existingIdx];
            const lastTwoPages = existing.lastTwoPages || [];
            if (lastTwoPages.length > 0) {
                const lastPage = lastTwoPages[lastTwoPages.length - 1];
                const lastPageTime = lastPage.timestamp instanceof Date ? lastPage.timestamp.getTime() : new Date(lastPage.timestamp as any).getTime();
                const nowTime = now.getTime();
                if (lastPage.page_path === pagePath && (nowTime - lastPageTime) < this.MIN_TIME_BETWEEN_SAME_PAGE) {
                    return;
                }
            }
            lastTwoPages.push(newEntry);
            if (lastTwoPages.length > this.MAX_PAGES_TO_KEEP) {
                existing.lastTwoPages = lastTwoPages.slice(-this.MAX_PAGES_TO_KEEP);
            } else {
                existing.lastTwoPages = lastTwoPages;
            }
            existing.updatedAt = now;
        }
    },

    async getUserNavigationHistory(userUid: string): Promise<NavigationEntry[]> {
        const local = localNavigations.find(n => n.user_uid === userUid);
        const localEntries = local ? (local.lastTwoPages || []).map(entry => ({
            ...entry,
            timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp as any),
        })) : [];
        try {
            const real = await realNavigationTrackingService.getUserNavigationHistory(userUid);
            return [...real, ...localEntries];
        } catch {
            return localEntries;
        }
    },
};

export const reportService = {
    async createReport(data: Omit<Report, 'uid' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const id = nextId();
        const now = Timestamp.now();
        localReports.push({
            ...data,
            uid: id,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        } as Report);
        return id;
    },

    async getUserReports(userId: string): Promise<Report[]> {
        const local = localReports
            .filter(r => r.userId === userId)
            .sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
        try {
            const real = await realReportService.getUserReports(userId);
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
            return merged;
        } catch {
            return local;
        }
    },

    subscribeToUserReports(userId: string, callback: (reports: Report[]) => void): () => void {
        return realReportService.subscribeToUserReports(userId, callback);
    },

    async getAllReports(): Promise<Report[]> {
        const local = [...localReports].sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });
        try {
            const real = await realReportService.getAllReports();
            const merged = [...real, ...local];
            merged.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || 0;
                const bTime = b.createdAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
            return merged;
        } catch {
            return local;
        }
    },

    async respondToReport(reportId: string, adminResponse: string, respondedBy: string): Promise<void> {
        const report = localReports.find(r => r.uid === reportId);
        if (report) {
            report.adminResponse = adminResponse;
            report.respondedBy = respondedBy;
            report.status = 'resolved';
            report.respondedAt = Timestamp.now();
            report.updatedAt = Timestamp.now();
        }
    },

    async updateReportStatus(reportId: string, status: 'pending' | 'read' | 'resolved'): Promise<void> {
        const report = localReports.find(r => r.uid === reportId);
        if (report) {
            report.status = status;
            report.updatedAt = Timestamp.now();
        }
    },

    subscribeToAllReports(callback: (reports: Report[]) => void): () => void {
        return realReportService.subscribeToAllReports(callback);
    },
};

export const dailyActivityService = {
    ...realDailyActivityService,
};

