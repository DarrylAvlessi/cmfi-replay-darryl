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
            className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-amber-500/70 dark:hover:border-amber-500/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black transition-all duration-300 ${
                isRemoving ? 'opacity-0 -translate-x-3 scale-[0.98] pointer-events-none' : 'opacity-100 translate-x-0 scale-100'
            }`}
        >
            <div className="w-24 sm:w-28 aspect-video flex-shrink-0 rounded-md overflow-hidden bg-gray-200 dark:bg-black border border-gray-200 dark:border-gray-700 transition-transform duration-300 group-hover:scale-[1.04]">
                <img src={item.imageUrl} alt={displayTitle} className="w-full h-full object-cover" loading="lazy" />
            </div>

            <div className="flex-1 min-w-0">
                <span className="inline-block px-2 py-0.5 mb-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                    {badge}
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2 break-words group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                    {displayTitle}
                </h3>
                {metaParts.length > 0 && (
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                        {metaParts.join(' · ')}
                    </p>
                )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5 flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onPlay(item); }}
                    aria-label={`Play ${displayTitle}`}
                    title={`Play ${displayTitle}`}
                    className="p-2.5 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
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
                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 active:scale-95'
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
                className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-red-500/30 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
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
                            className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
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
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="p-4 md:p-6 lg:p-8 space-y-6" data-tour="bookmarks-list">
                {/* En-tête avec titre */}
                <div className="pt-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('myFavorites')}
                    </h1>
                    <div className="h-1.5 w-24 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"></div>
                </div>

                {/* Tabs avec design amélioré */}
                <div className="flex items-center justify-center md:justify-start pt-4">
                    <div className="inline-flex items-center space-x-2 bg-white dark:bg-black p-1.5 rounded-full shadow-lg">
                        <button
                            onClick={() => setActiveTab('all')}
                            aria-pressed={activeTab === 'all'}
                            className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${activeTab === 'all'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('all') || 'Tous'} ({bookmarkedMovies.length + uniqueEpisodes.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('movies')}
                            aria-pressed={activeTab === 'movies'}
                            className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${activeTab === 'movies'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('categoryMovies')} ({bookmarkedMovies.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('series')}
                            aria-pressed={activeTab === 'series'}
                            className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${activeTab === 'series'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('categorySeries')} ({bookmarkedEpisodes.length})
                        </button>
                    </div>
                </div>

                {/* Loading State amélioré */}
                {loading && (
                    <div className="flex items-center justify-center py-32">
                        <div className="text-center">
                            <div className="relative">
                                <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-amber-500 mx-auto mb-6"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('loading')}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('myFavorites')}</p>
                        </div>
                    </div>
                )}

                {/* Empty State amélioré */}
                {!loading && filteredContent.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-16 h-16 text-amber-500"
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
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-2xl">📺</span>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {t('noBookmarks')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md text-lg leading-relaxed">
                            {t('noBookmarksHint')}
                        </p>
                        <div className="mt-8 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span>{t('myList')}</span>
                        </div>
                    </div>
                )}

                {/* Content Grid amélioré */}
                {!loading && filteredContent.length > 0 && (
                    <div className="space-y-6">
                        <div className="mb-6 pt-2">
                            <p className="text-gray-600 dark:text-gray-400">
                                {filteredContent.length} {filteredContent.length === 1 ? t('episode') : t('episodes')}
                                {activeTab !== 'all' && (
                                    <span className="ml-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm rounded-full">
                                        {activeTab === 'movies' ? t('categoryMovies') : t('categorySeries')}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Liste de favoris */}
                        <div className="space-y-3">
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