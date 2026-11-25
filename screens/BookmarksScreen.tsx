import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { PlayIcon, HeartIcon } from '../components/icons';
import { MediaContent, MediaType } from '../types';
import { useAppContext } from '../context/AppContext';
import { bookDocService, bookSeriesService, BookDoc, BookSeries, EpisodeSerie, Movie } from '../lib/db';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface BookmarksScreenProps {
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    onBack: () => void;
}

interface FavoriteRowProps {
    item: MediaContent;
    badge: string;
    isRemoving: boolean;
    onSelect: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    onRemove: (e: React.MouseEvent, item: MediaContent) => void;
}

const toTitleCase = (value: string): string => {
    if (!value) return value;
    const trimmed = value.trim();
    if (trimmed === trimmed.toLowerCase() || trimmed === trimmed.toUpperCase()) {
        return trimmed.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
    }
    return value;
};

const FavoriteRow: React.FC<FavoriteRowProps> = ({ item, badge, isRemoving, onSelect, onPlay, onRemove }) => {
    const { t } = useAppContext();
    const displayTitle = toTitleCase(item.title);

    const metaParts: string[] = [];
    if (item.duration) metaParts.push(item.duration);
    if (item.episodes && item.episodes > 0) {
        metaParts.push(`${item.episodes} ${item.episodes === 1 ? t('episodeSingular') : t('episodePlural')}`);
    }

    return (
        <div
            onClick={() => onSelect(item)}
            tabIndex={0}
            role="button"
            aria-label={displayTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect(item); }}
            className={`broadcast-card group relative flex items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 transition-all duration-300 ${
                isRemoving ? 'opacity-0 -translate-x-3 scale-[0.98] pointer-events-none' : 'opacity-100 translate-x-0 scale-100'
            }`}
        >
            <div className="aspect-video w-24 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-transform duration-300 group-hover:scale-[1.04] sm:w-32 dark:border-slate-800 dark:bg-slate-950">
                <img src={item.imageUrl} alt={displayTitle} className="w-full h-full object-cover" loading="lazy" />
            </div>

            <div className="flex-1 min-w-0">
                <span className="mb-1.5 inline-flex rounded-md border border-blue-500/15 bg-blue-500/5 px-2 py-0.5 font-mono-meta text-[9px] font-semibold uppercase tracking-wider text-blue-700 sm:text-[10px] dark:text-sky-300">
                    {badge}
                </span>
                <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-900 transition-colors duration-300 group-hover:text-blue-600 sm:text-base dark:text-white dark:group-hover:text-sky-300">
                    {displayTitle}
                </h3>
                {metaParts.length > 0 && (
                    <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                        {metaParts.join(' · ')}
                    </p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5 flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onPlay(item); }}
                    aria-label={`Play ${displayTitle}`}
                    title={`Play ${displayTitle}`}
                    className="rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 p-2.5 text-white shadow-md shadow-blue-600/20 transition-all duration-300 hover:shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                >
                    <PlayIcon className="w-5 h-5 ml-0.5" />
                </button>
                <button
                    onClick={(e) => onRemove(e, item)}
                    disabled={isRemoving}
                    aria-label={`Remove ${displayTitle} from favorites`}
                    title={`Remove ${displayTitle} from favorites`}
                    data-tour="bookmark-remove-btn"
                    className={`p-2.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
                        isRemoving
                            ? 'bg-transparent text-red-400'
                            : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-600 active:scale-95'
                    }`}
                >
                    <HeartIcon filled={!isRemoving} className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

interface RemoveConfirmDialogProps {
    item: MediaContent;
    onConfirm: () => void;
    onCancel: () => void;
}

const RemoveConfirmDialog: React.FC<RemoveConfirmDialogProps> = ({ item, onConfirm, onCancel }) => {
    const { t } = useAppContext();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const displayTitle = toTitleCase(item.title);

    useEffect(() => {
        cancelRef.current?.focus();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel]);

    return (
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onCancel}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="remove-confirm-title"
                aria-describedby="remove-confirm-message"
                onClick={(e) => e.stopPropagation()}
                className="broadcast-panel w-full max-w-sm overflow-hidden rounded-3xl border border-rose-500/20 shadow-2xl"
            >
                <div className="bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <HeartIcon filled className="w-8 h-8 flex-shrink-0 text-white" />
                        <h2 id="remove-confirm-title" className="text-lg font-bold text-white">
                            {t('removeFromFavorites')}
                        </h2>
                    </div>
                </div>
                <div className="p-6">
                    <p id="remove-confirm-message" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {t('confirmRemoveFavoritesMessage', { title: displayTitle })}
                    </p>
                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button
                            ref={cancelRef}
                            onClick={onCancel}
                            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                        >
                            {t('removeFromFavorites')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BookmarksScreen: React.FC<BookmarksScreenProps> = ({ onSelectMedia, onPlay, onBack }) => {
    const { t, user } = useAppContext();
    const [bookmarkedMovies, setBookmarkedMovies] = useState<MediaContent[]>([]);
    const [bookmarkedEpisodes, setBookmarkedEpisodes] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');
    const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
    const [pendingRemove, setPendingRemove] = useState<MediaContent | null>(null);

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user || !user.email) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Récupérer les bookmarks de films
                const movieBookmarks = await bookDocService.getUserBookmarks(user.email);
                const movieUids = movieBookmarks.map(b => b.uid).filter(uid => !!uid);

                let movieContents: MediaContent[] = [];

                if (movieUids.length > 0) {
                    const batchSize = 10;
                    const moviePromises = [];

                    for (let i = 0; i < movieUids.length; i += batchSize) {
                        const batch = movieUids.slice(i, i + batchSize);
                        const moviesQuery = query(
                            collection(db, 'movies'),
                            where('uid', 'in', batch)
                        );
                        moviePromises.push(getDocs(moviesQuery));
                    }

                    const moviesSnapshots = await Promise.all(moviePromises);
                    const moviesMap = new Map<string, Movie>();

                    moviesSnapshots.forEach(snapshot => {
                        snapshot.docs.forEach(doc => {
                            const movie = doc.data() as Movie;
                            moviesMap.set(movie.uid, movie);
                        });
                    });

                    movieContents = movieBookmarks.map((bookmark: BookDoc) => {
                        const movie = moviesMap.get(bookmark.uid);
                        if (movie) {
                            return {
                                id: movie.uid,
                                title: movie.title,
                                theme: movie.original_language,
                                imageUrl: movie.picture_path || movie.backdrop_path,
                                type: MediaType.Movie,
                                duration: movie.runtime_h_m,
                                year: '',
                                rating: 0,
                                description: movie.overview,
                                video_path_hd: movie.video_path_hd,
                                languages: [movie.original_language],
                                cast: [],
                                director: '',
                            };
                        }

                        return {
                            id: bookmark.uid,
                            title: bookmark.title,
                            theme: '',
                            imageUrl: bookmark.image,
                            type: MediaType.Movie,
                            duration: '',
                            year: '',
                            rating: 0,
                            description: bookmark.description,
                            video_path_hd: '',
                            languages: [],
                            cast: [],
                            director: '',
                        };
                    });
                }

                // Récupérer les bookmarks d'épisodes
                const seriesBookmarks = await bookSeriesService.getUserBookmarks(user.email);
                const episodeUids = seriesBookmarks.map(b => b.uid).filter(uid => !!uid) as string[];

                let episodeContents: MediaContent[] = [];

                if (episodeUids.length > 0) {
                    const batchSize = 10;
                    const episodePromises = [];

                    for (let i = 0; i < episodeUids.length; i += batchSize) {
                        const batch = episodeUids.slice(i, i + batchSize);
                        const episodesQuery = query(
                            collection(db, 'episodesSeries'),
                            where('uid_episode', 'in', batch)
                        );
                        episodePromises.push(getDocs(episodesQuery));
                    }

                    const episodesSnapshots = await Promise.all(episodePromises);
                    const episodesMap = new Map<string, EpisodeSerie>();

                    episodesSnapshots.forEach(snapshot => {
                        snapshot.docs.forEach(doc => {
                            const episode = doc.data() as EpisodeSerie;
                            episodesMap.set(episode.uid_episode, episode);
                        });
                    });

                    episodeContents = seriesBookmarks.map((bookmark: BookSeries) => {
                        const uid = bookmark.uid;
                        const episode = uid ? episodesMap.get(uid) : null;

                        if (episode) {
                            return {
                                id: episode.uid_episode,
                                title: episode.title,
                                theme: episode.title_serie,
                                imageUrl: episode.picture_path || episode.backdrop_path,
                                type: MediaType.Series,
                                duration: episode.runtime_h_m,
                                year: '',
                                rating: 0,
                                description: episode.overview || episode.overviewFr,
                                video_path_hd: episode.video_path_hd,
                                languages: [],
                                cast: [],
                                director: '',
                            };
                        }

                        return {
                            id: bookmark.uid || bookmark.refEpisode?.id || '',
                            title: bookmark.title,
                            theme: '',
                            imageUrl: bookmark.image,
                            type: MediaType.Series,
                            duration: bookmark.runtime,
                            year: '',
                            rating: 0,
                            description: bookmark.description,
                            video_path_hd: bookmark.moviepath,
                            languages: [],
                            cast: [],
                            director: '',
                        };
                    });
                }

                setBookmarkedMovies(movieContents);
                setBookmarkedEpisodes(episodeContents);
            } catch (error) {
                console.error('Error fetching bookmarks:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookmarks();
    }, [user]);

    const performRemove = async (item: MediaContent) => {
        if (!user || !user.email) return;

        setRemovingIds(prev => new Set(prev).add(item.id));

        try {
            const success = item.type === MediaType.Movie
                ? await bookDocService.removeBookmark(item.id, user.email)
                : await bookSeriesService.removeBookmark(item.id, user.email);

            if (!success) throw new Error('Removal failed');

            window.setTimeout(() => {
                if (item.type === MediaType.Movie) {
                    setBookmarkedMovies(prev => prev.filter(m => m.id !== item.id));
                } else {
                    setBookmarkedEpisodes(prev => prev.filter(ep => ep.id !== item.id));
                }
                setRemovingIds(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
                toast.success(t('removedFromList'));
            }, 250);
        } catch (error) {
            console.error('Error removing bookmark:', error);
            setRemovingIds(prev => {
                const next = new Set(prev);
                next.delete(item.id);
                return next;
            });
            toast.error(t('failedToRemove'));
        }
    };

    const requestRemoveBookmark = (e: React.MouseEvent, item: MediaContent) => {
        e.stopPropagation();
        if (!user || !user.email) return;
        setPendingRemove(item);
    };

    const confirmRemoveBookmark = () => {
        if (!pendingRemove) return;
        setPendingRemove(null);
        performRemove(pendingRemove);
    };

    const cancelRemove = () => {
        setPendingRemove(null);
    };

    // Éviter les doublons dans les favoris
    const uniqueEpisodes = useMemo(() => {
        const seen = new Set();
        return bookmarkedEpisodes.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }, [bookmarkedEpisodes]);

    const filteredContent = useMemo(() => {
        switch (activeTab) {
            case 'movies':
                return bookmarkedMovies;
            case 'series':
                return uniqueEpisodes;
            default:
                return [...bookmarkedMovies, ...uniqueEpisodes];
        }
    }, [activeTab, bookmarkedMovies, uniqueEpisodes]);

    return (
        <div className="broadcast-canvas min-h-screen">
            <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 md:px-6 lg:space-y-7 lg:px-8 lg:py-8" data-tour="bookmarks-list">
                {/* En-tête avec titre */}
                <div className="flex items-end justify-between gap-4 pt-0 lg:pt-2">
                    <div>
                    <p className="font-mono-meta text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400">{t('myList')}</p>
                    <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-4xl dark:text-white">
                        {t('myFavorites')}
                    </h1>
                    </div>
                    <div className="hidden rounded-2xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 text-right sm:block dark:border-sky-400/15 dark:bg-sky-400/5">
                        <p className="font-mono-meta text-lg font-bold text-blue-700 dark:text-sky-300">{bookmarkedMovies.length + uniqueEpisodes.length}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('all') || 'Tous'}</p>
                    </div>
                </div>

                {/* Tabs avec design amélioré */}
                <div className="flex items-center justify-start pt-1 lg:pt-4">
                    <div className="shell-bar inline-flex max-w-full items-center space-x-1.5 overflow-x-auto rounded-2xl p-1.5 lg:space-x-2">
                        <button
                            onClick={() => setActiveTab('all')}
                            aria-pressed={activeTab === 'all'}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:px-5 lg:py-2.5 ${activeTab === 'all'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                                }`}
                        >
                            {t('all') || 'Tous'} ({bookmarkedMovies.length + uniqueEpisodes.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('movies')}
                            aria-pressed={activeTab === 'movies'}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:px-5 lg:py-2.5 ${activeTab === 'movies'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                                }`}
                        >
                            {t('categoryMovies')} ({bookmarkedMovies.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('series')}
                            aria-pressed={activeTab === 'series'}
                            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:px-5 lg:py-2.5 ${activeTab === 'series'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                                }`}
                        >
                            {t('categorySeries')} ({bookmarkedEpisodes.length})
                        </button>
                    </div>
                </div>

                {/* Loading State amélioré */}
                {loading && (
                    <div className="flex items-center justify-center py-12 lg:py-32">
                        <div className="broadcast-panel rounded-3xl px-8 py-10 text-center">
                            <div className="relative">
                                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 lg:mb-6 lg:h-16 lg:w-16 dark:border-slate-700 dark:border-t-sky-400"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="h-5 w-5 text-blue-600 lg:h-8 lg:w-8 dark:text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-base lg:text-lg font-medium text-gray-700 dark:text-gray-300">{t('loading')}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('myFavorites')}</p>
                        </div>
                    </div>
                )}

                {/* Empty State amélioré */}
                {!loading && filteredContent.length === 0 && (
                    <div className="broadcast-panel flex flex-col items-center justify-center rounded-3xl px-4 py-12 text-center lg:py-24">
                        <div className="relative mb-5 lg:mb-8">
                            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-500/10 bg-blue-500/5 lg:h-32 lg:w-32 dark:border-sky-400/10 dark:bg-sky-400/5">
                                <svg
                                    className="h-10 w-10 text-blue-600 lg:h-16 lg:w-16 dark:text-sky-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                    />
                                </svg>
                            </div>
                            <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                <PlayIcon className="h-4 w-4 text-blue-600 dark:text-sky-400" />
                            </div>
                        </div>
                        <h3 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mb-2 lg:mb-3">
                            {t('noBookmarks')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md text-sm lg:text-lg leading-relaxed">
                            {t('noBookmarksHint')}
                        </p>
                        <div className="mt-4 lg:mt-8 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>{t('myList')}</span>
                        </div>
                    </div>
                )}

                {/* Content Grid amélioré */}
                {!loading && filteredContent.length > 0 && (
                    <div className="space-y-4 lg:space-y-6">
                        <div className="mb-3 lg:mb-6 pt-0 lg:pt-2">
                            <p className="text-gray-600 dark:text-gray-400">
                                {filteredContent.length} {filteredContent.length === 1 ? t('episode') : t('episodes')}
                                {activeTab !== 'all' && (
                                    <span className="ml-2 rounded-lg border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-sm text-blue-700 dark:text-sky-300">
                                        {activeTab === 'movies' ? t('categoryMovies') : t('categorySeries')}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Liste de favoris */}
                        <div className="space-y-2 lg:space-y-3">
                            {filteredContent.map((item) => (
                                <FavoriteRow
                                    key={item.id}
                                    item={item}
                                    badge={item.type === MediaType.Movie ? t('categoryMovies') : t('categorySeries')}
                                    isRemoving={removingIds.has(item.id)}
                                    onSelect={onSelectMedia}
                                    onPlay={onPlay}
                                    onRemove={requestRemoveBookmark}
                                />
                            ))}
                        </div>
</div>
                )}
            </div>

        {pendingRemove && (
            <RemoveConfirmDialog
                item={pendingRemove}
                onConfirm={confirmRemoveBookmark}
                onCancel={cancelRemove}
            />
        )}
    </div>
);
};

export default BookmarksScreen;