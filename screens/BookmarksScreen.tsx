import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import MediaCard from '../components/MediaCard';
import { MediaContent, MediaType } from '../types';
import { useAppContext } from '../context/AppContext';
import { bookDocService, bookSeriesService, movieService, episodeSerieService, BookDoc, BookSeries, EpisodeSerie, Movie } from '../lib/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TrashIcon } from '../components/icons';

interface BookmarksScreenProps {
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    onBack: () => void;
}

const BookmarksScreen: React.FC<BookmarksScreenProps> = ({ onSelectMedia, onPlay, onBack }) => {
    const { t, user } = useAppContext();
    const [bookmarkedMovies, setBookmarkedMovies] = useState<MediaContent[]>([]);
    const [bookmarkedEpisodes, setBookmarkedEpisodes] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');

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
                                is_premium: movie.is_premium,
                                premium_text: movie.premium_text
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

    const handleRemoveBookmark = async (e: React.MouseEvent, item: MediaContent) => {
        e.stopPropagation();
        if (!user || !user.email) return;

        try {
            let success = false;
            if (item.type === MediaType.Movie) {
                // Suppression du bookmark film
                success = await bookDocService.removeBookmark(item.id, user.email);
                if (success) {
                    setBookmarkedMovies(prev => prev.filter(m => m.id !== item.id));
                    toast.success('Removed from list');
                } else {
                    toast.error('Failed to remove');
                }
            } else {
                // Suppression du bookmark série/épisode
                success = await bookSeriesService.removeBookmark(item.id, user.email);
                if (success) {
                    setBookmarkedEpisodes(prev => prev.filter(ep => ep.id !== item.id));
                    toast.success('Removed from list');
                } else {
                    toast.error('Failed to remove');
                }
            }
        } catch (error) {
            console.error('Error removing bookmark:', error);
            toast.error('Failed to remove');
        }
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
        <div className="min-h-screen bg-[#FBF9F3] dark:bg-black">
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
                {/* En-tête avec titre */}
                <div className="pt-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('myFavorites')}
                    </h1>
                    <div className="h-1 w-16 bg-amber-500 rounded-full"></div>
                </div>

                {/* Tabs avec design amélioré */}
                <div className="flex items-center justify-center md:justify-start pt-4">
                    <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-lg">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 ${activeTab === 'all'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('all') || 'Tous'} ({bookmarkedMovies.length + uniqueEpisodes.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('movies')}
                            className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 ${activeTab === 'movies'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('categoryMovies')} ({bookmarkedMovies.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('series')}
                            className={`text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200 ${activeTab === 'series'
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
                            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg">
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

                        {/* Liste de cartes horizontales */}
                        <div className="space-y-4">
                            {filteredContent.map((item) => (
                                <div key={item.id} className="relative group">
                                    <div className="transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                                        <MediaCard
                                            item={item}
                                            variant="list"
                                            onSelect={onSelectMedia}
                                            onPlay={onPlay}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookmarksScreen;
