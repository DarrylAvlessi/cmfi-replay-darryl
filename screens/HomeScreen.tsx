import React, { useState, useEffect, useCallback } from 'react';
import HeroPrimeVideo from '../components/HeroPrimeVideo';
import { featuredContent } from '../data/mockData';
import { MediaContent, MediaType } from '../types';
import MediaCard from '../components/MediaCard';
import { useAppContext } from '../context/AppContext';
import { likeService, movieService, episodeSerieService, statsVuesService, viewService, Movie, Serie, serieService, serieCategoryService, SerieCategory, UserProfile, ContinueWatchingItem } from '../lib/db';
import InfoBar from '../components/InfoBar';
import ProfileCompletionModal from '../components/ProfileCompletionModal';
import MoviesSection from '../components/sections/MoviesSection';
import SeriesSection from '../components/sections/SeriesSection';
import PodcastsSection from '../components/sections/PodcastsSection';
import MostWatchedSection from '../components/sections/MostWatchedSection';
import MostLikedSection from '../components/sections/MostLikedSection';
import CategorySections from '../components/sections/CategorySections';
import ErrorBoundary from '../components/ErrorBoundary';

interface HomeScreenProps {
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent, episode?: any) => void;
    navigateToCategory: (type: MediaType) => void;
}

const SectionError: React.FC<{ message: string }> = ({ message }) => (
    <div className="py-8 md:py-12">
        <div className="px-4 md:px-6 lg:px-8">
            <p className="text-sm text-red-500 dark:text-red-400">{message}</p>
        </div>
    </div>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMedia, onPlay, navigateToCategory }) => {
    const { t, user, userProfile, setUserProfile } = useAppContext();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 600);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Vérifier si le profil doit être complété
    useEffect(() => {
        if (userProfile && user) {
            // Vérifier si le pays est manquant (seul champ obligatoire)
            const countryMissing = !userProfile.country || userProfile.country.trim() === '';
            const needsCompletion = countryMissing; // Seul le pays est obligatoire
            
            if (needsCompletion) {
                setShowProfileModal(true);
            } else {
                setShowProfileModal(false);
            }
        }
    }, [userProfile, user]);

    // State: Most Liked
    const [mostLikedItems, setMostLikedItems] = useState<Array<{ content: MediaContent; likeCount: number; viewCount?: number }>>([]);
    const [loadingMostLiked, setLoadingMostLiked] = useState(true);
    const [mostLikedError, setMostLikedError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoadingMostLiked(true);
                setMostLikedError(null);
                const likedItems = await likeService.getMostLikedItems(10);
                const itemsWithDetails = await Promise.all(
                    likedItems.map(async (item) => {
                        let movie = await movieService.getMovieByUid(item.uid);
                        if (movie && !movie.hidden) {
                            const mediaContent: MediaContent = {
                                id: movie.uid, type: MediaType.Movie, title: movie.title, author: undefined, theme: '',
                                imageUrl: movie.picture_path || movie.backdrop_path || movie.poster_path,
                                duration: movie.runtime_h_m, description: movie.overview, languages: [movie.original_language], video_path_hd: movie.video_path_hd
                            };
                            return { content: mediaContent, likeCount: item.likeCount };
                        }
                        let episode = await episodeSerieService.getEpisodeByUid(item.uid);
                        if (episode && !episode.hidden) {
                            const mediaContent: MediaContent = {
                                id: episode.uid_episode, type: MediaType.Series, title: episode.title, author: episode.title_serie, theme: '',
                                imageUrl: episode.backdrop_path || episode.picture_path, duration: episode.runtime_h_m,
                                description: episode.overviewFr || episode.overview, languages: [], video_path_hd: episode.video_path_hd
                            };
                            return { content: mediaContent, likeCount: item.likeCount };
                        }
                        return null;
                    })
                );
                const valid = itemsWithDetails.filter((item): item is { content: MediaContent; likeCount: number; viewCount?: number } => item !== null);
                if (!cancelled) setMostLikedItems(valid);
            } catch (err) {
                if (!cancelled) setMostLikedError('Failed to load most liked');
            } finally {
                if (!cancelled) setLoadingMostLiked(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // State: Most Watched
    const [mostWatchedItems, setMostWatchedItems] = useState<Array<{ content: MediaContent; likeCount: number; viewCount: number }>>([]);
    const [loadingMostWatched, setLoadingMostWatched] = useState(true);
    const [mostWatchedError, setMostWatchedError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoadingMostWatched(true);
                setMostWatchedError(null);
                const watchedItems = await viewService.getMostWatchedItems(10);
                const watchedWithDetails = await Promise.all(
                    watchedItems.map(async (item) => {
                        if (item.type === 'movie') {
                            let movie = await movieService.getMovieByUid(item.uid);
                            if (movie && !movie.hidden) {
                                const mediaContent: MediaContent = {
                                    id: movie.uid, type: MediaType.Movie, title: movie.title, author: undefined, theme: '',
                                    imageUrl: movie.picture_path || movie.backdrop_path || movie.poster_path,
                                    duration: movie.runtime_h_m, description: movie.overview, languages: [movie.original_language], video_path_hd: movie.video_path_hd
                                };
                                return { content: mediaContent, likeCount: item.viewCount, viewCount: item.viewCount };
                            }
                        } else {
                            let episode = await episodeSerieService.getEpisodeByUid(item.uid);
                            if (episode && !episode.hidden) {
                                const mediaContent: MediaContent = {
                                    id: episode.uid_episode, type: MediaType.Series, title: episode.title, author: episode.title_serie, theme: '',
                                    imageUrl: episode.backdrop_path || episode.picture_path, duration: episode.runtime_h_m,
                                    description: episode.overviewFr || episode.overview, languages: [], video_path_hd: episode.video_path_hd
                                };
                                return { content: mediaContent, likeCount: item.viewCount, viewCount: item.viewCount };
                            }
                        }
                        return null;
                    })
                );
                const valid = watchedWithDetails.filter((item): item is { content: MediaContent; likeCount: number; viewCount: number } => item !== null);
                if (!cancelled) setMostWatchedItems(valid);
            } catch (err) {
                if (!cancelled) setMostWatchedError('Failed to load most watched');
            } finally {
                if (!cancelled) setLoadingMostWatched(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // State: Movies
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loadingMovies, setLoadingMovies] = useState(true);
    const [moviesError, setMoviesError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoadingMovies(true);
                setMoviesError(null);
                const data = await movieService.getTenHomeMovies();
                if (!cancelled) setMovies(data);
            } catch (err) {
                if (!cancelled) setMoviesError('Failed to load movies');
            } finally {
                if (!cancelled) setLoadingMovies(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // State: Series
    const [series, setSeries] = useState<Serie[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(true);
    const [seriesError, setSeriesError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoadingSeries(true);
                setSeriesError(null);
                const data = await serieService.getTenHomeSeries();
                if (!cancelled) setSeries(data);
            } catch (err) {
                if (!cancelled) setSeriesError('Failed to load series');
            } finally {
                if (!cancelled) setLoadingSeries(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // State: Podcasts
    const [podcasts, setPodcasts] = useState<Serie[]>([]);
    const [loadingPodcasts, setLoadingPodcasts] = useState(true);
    const [podcastsError, setPodcastsError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoadingPodcasts(true);
                setPodcastsError(null);
                const data = await serieService.getTenHomePodcasts();
                if (!cancelled) setPodcasts(data);
            } catch (err) {
                if (!cancelled) setPodcastsError('Failed to load podcasts');
            } finally {
                if (!cancelled) setLoadingPodcasts(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // State: Categories
    const [serieCategories, setSerieCategories] = useState<SerieCategory[]>([]);
    const [seriesByCategory, setSeriesByCategory] = useState<Record<string, Serie[]>>({});
    const [loadingSeriesByCategory, setLoadingSeriesByCategory] = useState(true);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoadingSeriesByCategory(true);
                setCategoriesError(null);
                const categories = await serieCategoryService.getAllCategories();
                if (cancelled) return;
                setSerieCategories(categories);
                const seriesByCat: Record<string, Serie[]> = {};
                for (const cat of categories) {
                    const catSeries = await serieCategoryService.getSeriesByCategory(cat.id);
                    if (catSeries.length > 0) seriesByCat[cat.id] = catSeries;
                }
                if (!cancelled) setSeriesByCategory(seriesByCat);
            } catch (err) {
                if (!cancelled) setCategoriesError('Failed to load categories');
            } finally {
                if (!cancelled) setLoadingSeriesByCategory(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, []);

    // State: Continue Watching
    const [continueWatchingItems, setContinueWatchingItems] = useState<ContinueWatchingItem[]>([]);
    const [loadingContinueWatching, setLoadingContinueWatching] = useState(true);
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            if (!user) {
                if (!cancelled) setLoadingContinueWatching(false);
                return;
            }
            try {
                const items = await statsVuesService.getContinueWatching(user.uid, 10);
                if (!cancelled) setContinueWatchingItems(items);
            } catch (err) {
                console.error('Error fetching continue watching items:', err);
            } finally {
                if (!cancelled) setLoadingContinueWatching(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [user]);

    const cwToMediaContent = (item: ContinueWatchingItem): MediaContent => ({
        id: item.id,
        type: item.type === 'movie' ? MediaType.Movie : MediaType.Series,
        title: item.episodeTitle || item.title,
        author: item.serieTitle,
        theme: '',
        imageUrl: item.imageUrl,
        duration: item.runtime ? formatSeconds(item.runtime) : undefined,
        progress: item.progress,
        description: '',
        languages: [],
    });

    function formatSeconds(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m} min`;
    }

    const continueWatchingMedia = continueWatchingItems.map(cwToMediaContent);

    const handleContinueWatchingClick = useCallback(async (item: ContinueWatchingItem) => {
        if (item.type === 'movie') {
            // C'est un film
            const movie = await movieService.getMovieByUid(item.uid);
            if (movie) {
                const mediaContent: MediaContent = {
                    id: movie.uid,
                    type: MediaType.Movie,
                    title: movie.title,
                    author: undefined,
                    theme: '',
                    imageUrl: movie.picture_path || movie.backdrop_path || movie.poster_path,
                    duration: movie.runtime_h_m,
                    description: movie.overview,
                    languages: [movie.original_language],
                    video_path_hd: movie.video_path_hd
                };
                onPlay(mediaContent);
            }
        } else {
            // C'est un épisode - utiliser uid_episode en priorité, sinon uid
            const episodeUid = item.uid_episode || item.uid;
            let episode = null;

            // Essayer de récupérer par UID
            if (episodeUid) {
                episode = await episodeSerieService.getEpisodeByUid(episodeUid);
            }

            // Si pas trouvé et qu'on a un ID de document (fallback legacy)
            if (!episode && item.episodeId) {
                episode = await episodeSerieService.getEpisodeById(item.episodeId);
            }

            if (episode) {
                // S'assurer que l'épisode a un uid_episode pour la navigation
                if (!episode.uid_episode && item.episodeId) {
                    episode.uid_episode = item.episodeId;
                }

                const mediaContent: MediaContent = {
                    id: episode.uid_episode,
                    type: MediaType.Series,
                    title: episode.title_serie,
                    author: episode.title_serie,
                    theme: '',
                    imageUrl: episode.backdrop_path || episode.picture_path,
                    duration: episode.runtime_h_m,
                    description: episode.overviewFr || episode.overview,
                    languages: [],
                    video_path_hd: episode.video_path_hd
                };

                // Passer l'épisode directement à onPlay
                onPlay(mediaContent, episode);
            }
        }
    }, [onPlay]);

    const handleContinueSelect = useCallback(async (content: MediaContent) => {
        const cwItem = continueWatchingItems.find(cw => cw.id === content.id);
        if (cwItem) {
            await handleContinueWatchingClick(cwItem);
        }
    }, [continueWatchingItems, handleContinueWatchingClick]);

    return (
        <div className="min-h-screen bg-white dark:bg-black">

            {/* Hero Section Prime Video */}
            <div className="animate-fadeIn">
                <HeroPrimeVideo items={featuredContent} onSelectMedia={onSelectMedia} onPlay={onPlay} />
            </div>

            {/* Barre d'information déroulante */}
            <InfoBar />

            {/* Sections horizontales style Prime Video */}
            <div className="bg-white dark:bg-black">
                {/* Section Continue Watching */}
                {loadingContinueWatching && (
                    <div className="py-8 md:py-12">
                        <div className="px-4 md:px-6 lg:px-8 mb-6">
                            <div className="h-8 w-64 bg-gray-200 dark:bg-black rounded animate-pulse"></div>
                        </div>
                        <div className="flex space-x-4 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                            {[...Array(3)].map((_, i) => (
                                 <div key={i} className="flex-shrink-0 w-36 md:w-48 lg:w-72">
                                    <div className="aspect-video bg-gray-200 dark:bg-black rounded-2xl animate-pulse mb-3"></div>
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-black rounded animate-pulse"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {continueWatchingMedia.length > 0 && (
                    <div className="py-8 md:py-12">
                        <div className="px-4 md:px-6 lg:px-8 mb-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                    {t('continueWatching') || 'Continuer à regarder'}
                                </h3>
                            </div>
                        </div>
                        <div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                            {continueWatchingMedia.slice(0, 10).map((content) => (
                                <MediaCard
                                    key={content.id}
                                    item={content}
                                    variant="poster"
                                    onSelect={handleContinueSelect}
                                    onPlay={handleContinueSelect}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Section Séries */}
                {seriesError ? (
                    <SectionError message={seriesError} />
                ) : (
                    <SeriesSection
                        series={series}
                        onSelectMedia={onSelectMedia}
                        onPlay={onPlay}
                        navigateToCategory={navigateToCategory}
                        t={t}
                    />
                )}

                {/* Sections par catégorie */}
                {categoriesError ? (
                    <SectionError message={categoriesError} />
                ) : (
                    <CategorySections
                        serieCategories={serieCategories}
                        seriesByCategory={seriesByCategory}
                        loading={loadingSeriesByCategory}
                        onSelectMedia={onSelectMedia}
                        onPlay={onPlay}
                    />
                )}

                {/* Section Films */}
                {moviesError ? (
                    <SectionError message={moviesError} />
                ) : (
                    <MoviesSection
                        movies={movies}
                        onSelectMedia={onSelectMedia}
                        onPlay={onPlay}
                        navigateToCategory={navigateToCategory}
                        t={t}
                    />
                )}

                {/* Section Podcasts */}
                {podcastsError ? (
                    <SectionError message={podcastsError} />
                ) : (
                    <PodcastsSection
                        podcasts={podcasts}
                        onSelectMedia={onSelectMedia}
                        onPlay={onPlay}
                        navigateToCategory={navigateToCategory}
                        t={t}
                    />
                )}

                {/* Section Most Watched */}
                {mostWatchedError ? (
                    <SectionError message={mostWatchedError} />
                ) : (
                    <MostWatchedSection
                        items={mostWatchedItems}
                        onSelectMedia={onSelectMedia}
                        onPlay={onPlay}
                        loading={loadingMostWatched}
                        t={t}
                    />
                )}

                {/* Section Most Liked */}
                {mostLikedError ? (
                    <SectionError message={mostLikedError} />
                ) : (
                    <MostLikedSection
                        items={mostLikedItems}
                        onSelectMedia={onSelectMedia}
                        onPlay={onPlay}
                        loading={loadingMostLiked}
                        t={t}
                    />
                )}
            </div>

            {/* Modal de complétion du profil */}
            {showProfileModal && userProfile && (
                <ProfileCompletionModal
                    userProfile={userProfile}
                    onComplete={(updatedProfile) => {
                        setUserProfile(updatedProfile);
                        setShowProfileModal(false);
                    }}
                />
            )}

            {/* Scroll to top */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-all duration-200 hover:scale-110"
                    aria-label="Scroll to top"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>
            )}
        </div>
    );
};

const HomeScreenWithErrorBoundary: React.FC<HomeScreenProps> = (props) => (
    <ErrorBoundary>
        <HomeScreen {...props} />
    </ErrorBoundary>
);

export default HomeScreenWithErrorBoundary;