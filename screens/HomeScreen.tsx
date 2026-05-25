import React, { useState, useEffect, useCallback } from 'react';
import Hero from '../components/Hero';
import HeroPrimeVideo from '../components/HeroPrimeVideo';
import HeroNetflix from '../components/HeroNetflix';
import MediaCard from '../components/MediaCard';
import RankedMediaCard from '../components/RankedMediaCard';
import UserAvatar from '../components/UserAvatar';
import CategoryTiles from '../components/CategoryTiles';
import { MediaCardSkeleton, UserAvatarSkeleton, ContinueWatchingSkeleton, CategoryTilesSkeleton, MostLikedSkeleton } from '../components/Skeleton';
import { featuredContent } from '../data/mockData';
import { PlayIcon } from '../components/icons';

import { MediaContent, User, MediaType } from '../types';
import { useAppContext, HomeViewMode } from '../context/AppContext';
import { userService, generateDefaultAvatar, likeService, movieService, episodeSerieService, statsVuesService, ContinueWatchingItem, viewService, Movie, Serie, serieService, serieCategoryService, SerieCategory, UserProfile } from '../lib/firestore';
import ContinueWatchingSection from '../components/ContinueWatchingSection';
import InfoBar from '../components/InfoBar';
import ProfileCompletionModal from '../components/ProfileCompletionModal';
import MoviesSection from '../components/sections/MoviesSection';
import SeriesSection from '../components/sections/SeriesSection';
import PodcastsSection from '../components/sections/PodcastsSection';
import MostWatchedSection from '../components/sections/MostWatchedSection';
import MostLikedSection from '../components/sections/MostLikedSection';
import CategorySections from '../components/sections/CategorySections';
import ErrorBoundary from '../components/ErrorBoundary';

const MediaRow: React.FC<{ title: string; items: MediaContent[]; onSelectMedia: (item: MediaContent) => void; onPlay: (item: MediaContent) => void; variant?: 'poster' | 'thumbnail' | 'list' }> = ({ title, items, onSelectMedia, onPlay, variant }) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showLeftGradient, setShowLeftGradient] = React.useState(false);
    const [showRightGradient, setShowRightGradient] = React.useState(true);

    React.useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let timeoutId: NodeJS.Timeout | null = null;
        const checkScroll = () => {
            if (timeoutId) return;
            
            timeoutId = setTimeout(() => {
                const { scrollLeft, scrollWidth, clientWidth } = container;
                setShowLeftGradient(scrollLeft > 10);
                setShowRightGradient(scrollLeft < scrollWidth - clientWidth - 10);
                timeoutId = null;
            }, 100);
        };

        checkScroll();
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [items]);

    if (items.length === 0) return null;

    return (
        <section className="py-8 md:py-12 relative group">
            {/* Titre avec meilleure hiérarchie */}
            <div className="px-4 md:px-6 lg:px-8 mb-6">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight">
                    {title}
                </h3>
            </div>

            {/* Container avec gradients de fade dynamiques */}
            <div className="relative">
                {/* Gradient gauche */}
                {showLeftGradient && (
                    <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 lg:w-40 bg-gradient-to-r from-white dark:from-black via-white/80 dark:via-black/80 to-transparent z-20 pointer-events-none transition-opacity duration-500" />
                )}

                {/* Gradient droite */}
                {showRightGradient && (
                    <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 lg:w-40 bg-gradient-to-l from-white dark:from-black via-white/80 dark:via-black/80 to-transparent z-20 pointer-events-none transition-opacity duration-500" />
                )}

                {/* Carrousel avec scroll smooth et snap */}
                <div
                    ref={scrollContainerRef}
                    className="flex space-x-2 md:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-6 scroll-smooth snap-x snap-mandatory"
                    style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
                >
                    {items.map((item, index) => (
                        <div key={item.id} className="snap-start flex-shrink-0">
                            <MediaCard item={item} variant={variant} onSelect={onSelectMedia} onPlay={onPlay} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const RankedMediaRow: React.FC<{
    title: string;
    items: Array<{ content: MediaContent; likeCount: number; viewCount?: number }>;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}> = ({ title, items, onSelectMedia, onPlay }) => {
    if (items.length === 0) return null;

    return (
        <section className="py-8 md:py-12">
            {/* Titre */}
            <div className="px-4 md:px-6 lg:px-8 mb-6">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                    {title}
                </h3>
            </div>

            {/* Container simple sans effets de défilement */}
            <div className="flex space-x-2 md:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-6">
                {items.map((item, index) => (
                    <div key={item.content.id} className="flex-shrink-0">
                        <RankedMediaCard
                            item={item.content}
                            rank={index + 1}
                            viewCount={item.viewCount}
                            onSelect={onSelectMedia}
                            onPlay={onPlay}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
};

const UserRow: React.FC<{ title: string; users: User[] }> = ({ title, users }) => (
    <section className="py-4">
        <h3 className="text-xl font-bold px-4 mb-3">{title}</h3>
        <div className="flex space-x-4 overflow-x-auto px-4 scrollbar-hide pb-2">
            {users.map((user: User) => (
                <UserAvatar key={user.id} user={user} />
            ))}
        </div>
    </section>
);

interface HomeScreenProps {
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent, episode?: any) => void;
    navigateToCategory: (type: MediaType) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMedia, onPlay, navigateToCategory }) => {
    const { t, user, userProfile, setUserProfile } = useAppContext();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [mostLikedItems, setMostLikedItems] = useState<Array<{ content: MediaContent; likeCount: number; viewCount?: number }>>([]);

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
    const [loadingMostLiked, setLoadingMostLiked] = useState(true);
    const [mostWatchedItems, setMostWatchedItems] = useState<Array<{ content: MediaContent; likeCount: number; viewCount: number }>>([]);
    const [loadingMostWatched, setLoadingMostWatched] = useState(true);
    const [continueWatchingItems, setContinueWatchingItems] = useState<ContinueWatchingItem[]>([]);
    const [loadingContinueWatching, setLoadingContinueWatching] = useState(true);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loadingMovies, setLoadingMovies] = useState(true);
    const [series, setSeries] = useState<Serie[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(true);
    const [podcasts, setPodcasts] = useState<Serie[]>([]);
    const [loadingPodcasts, setLoadingPodcasts] = useState(true);
    const [serieCategories, setSerieCategories] = useState<SerieCategory[]>([]);
    const [seriesByCategory, setSeriesByCategory] = useState<Record<string, Serie[]>>({});
    const [loadingSeriesByCategory, setLoadingSeriesByCategory] = useState(true);

    // Combined data fetching for independent data sources
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch all independent data sources in parallel
                const [
                    likedItems,
                    watchedItems,
                    moviesData,
                    seriesData,
                    podcastsData,
                    categories
                ] = await Promise.all([
                    likeService.getMostLikedItems(10),
                    viewService.getMostWatchedItems(10),
                    movieService.getTenHomeMovies(),
                    serieService.getTenHomeSeries(),
                    serieService.getTenHomePodcasts(),
                    serieCategoryService.getAllCategories()
                ]);

                // Process most liked items
                const itemsWithDetails = await Promise.all(
                    likedItems.map(async (item) => {
                        let movie = await movieService.getMovieByUid(item.uid);
                        if (movie && !movie.hidden) {
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
                            return { content: mediaContent, likeCount: item.likeCount };
                        }

                        let episode = await episodeSerieService.getEpisodeByUid(item.uid);
                        if (episode && !episode.hidden) {
                            const mediaContent: MediaContent = {
                                id: episode.uid_episode,
                                type: MediaType.Series,
                                title: episode.title,
                                author: episode.title_serie,
                                theme: '',
                                imageUrl: episode.backdrop_path || episode.picture_path,
                                duration: episode.runtime_h_m,
                                description: episode.overviewFr || episode.overview,
                                languages: [],
                                video_path_hd: episode.video_path_hd
                            };
                            return { content: mediaContent, likeCount: item.likeCount };
                        }

                        return null;
                    })
                );
                const validLikedItems = itemsWithDetails.filter((item): item is { content: MediaContent; likeCount: number; viewCount?: number } => item !== null);
                setMostLikedItems(validLikedItems);
                setLoadingMostLiked(false);

                // Process most watched items
                const watchedWithDetails = await Promise.all(
                    watchedItems.map(async (item) => {
                        if (item.type === 'movie') {
                            let movie = await movieService.getMovieByUid(item.uid);
                            if (movie && !movie.hidden) {
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
                                return { content: mediaContent, likeCount: item.viewCount, viewCount: item.viewCount };
                            }
                        } else {
                            let episode = await episodeSerieService.getEpisodeByUid(item.uid);
                            if (episode && !episode.hidden) {
                                const mediaContent: MediaContent = {
                                    id: episode.uid_episode,
                                    type: MediaType.Series,
                                    title: episode.title,
                                    author: episode.title_serie,
                                    theme: '',
                                    imageUrl: episode.backdrop_path || episode.picture_path,
                                    duration: episode.runtime_h_m,
                                    description: episode.overviewFr || episode.overview,
                                    languages: [],
                                    video_path_hd: episode.video_path_hd
                                };
                                return { content: mediaContent, likeCount: item.viewCount, viewCount: item.viewCount };
                            }
                        }
                        return null;
                    })
                );
                const validWatchedItems = watchedWithDetails.filter((item): item is { content: MediaContent; likeCount: number; viewCount: number } => item !== null);
                setMostWatchedItems(validWatchedItems);
                setLoadingMostWatched(false);

                // Set basic data
                setMovies(moviesData);
                setLoadingMovies(false);

                setSeries(seriesData);
                setLoadingSeries(false);

                setPodcasts(podcastsData);
                setLoadingPodcasts(false);

                // Process categories and series by category
                setSerieCategories(categories);
                const seriesByCat: Record<string, Serie[]> = {};
                for (const category of categories) {
                    const categorySeries = await serieCategoryService.getSeriesByCategory(category.id);
                    if (categorySeries.length > 0) {
                        seriesByCat[category.id] = categorySeries;
                    }
                }
                setSeriesByCategory(seriesByCat);
                setLoadingSeriesByCategory(false);

            } catch (error) {
                console.error('Error fetching data:', error);
                // Set loading states to false even on error
                setLoadingMostLiked(false);
                setLoadingMostWatched(false);
                setLoadingMovies(false);
                setLoadingSeries(false);
                setLoadingPodcasts(false);
                setLoadingSeriesByCategory(false);
            }
        };

        fetchAllData();
    }, []);

    // Récupérer les éléments "Continuer la lecture" (depends on user state)
    useEffect(() => {
        const fetchContinueWatching = async () => {
            if (!user) {
                setLoadingContinueWatching(false);
                return;
            }

            try {
                const items = await statsVuesService.getContinueWatching(user.uid, 10);
                setContinueWatchingItems(items);
            } catch (error) {
                console.error('Error fetching continue watching items:', error);
            } finally {
                setLoadingContinueWatching(false);
            }
        };

        fetchContinueWatching();
    }, [user]);

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
                {continueWatchingItems.length > 0 && (
                    <div className="py-8 md:py-12">
                        <div className="px-4 md:px-6 lg:px-8 mb-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                    {t('continueWatching') || 'Continuer la lecture'}
                                </h3>
                            </div>
                        </div>
                        <div className="flex space-x-2 md:space-x-4 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                            {continueWatchingItems.slice(0, 10).map((item) => (
                                 <div key={item.id} className="flex-shrink-0 w-28 md:w-48 group cursor-pointer" onClick={() => handleContinueWatchingClick(item)}>
                                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-3">
                                        {/* Fond qui prolonge l'image avec effet de flou */}
                                        <div className="absolute inset-0 w-full h-full">
                                            <img
                                                src={item.imageUrl}
                                                alt={item.title}
                                                className="w-full h-full object-cover blur-xl scale-110 opacity-30 dark:opacity-20"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-gray-900/20 to-gray-900/30 dark:from-black/60 dark:via-black/30 dark:to-black/40"></div>
                                        </div>
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
                                            className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
                                        />
                                        {/* Progress bar */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-300"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        </div>
                                        {/* Overlay au hover */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-2xl">
                                                <PlayIcon className="w-7 h-7 text-gray-900 ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="text-gray-900 dark:text-white text-sm md:text-base font-semibold break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {item.title}
                                    </h4>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section Films */}
                <MoviesSection
                    movies={movies}
                    onSelectMedia={onSelectMedia}
                    onPlay={onPlay}
                    navigateToCategory={navigateToCategory}
                    t={t}
                />

                {/* Section Séries */}
                <SeriesSection
                    series={series}
                    onSelectMedia={onSelectMedia}
                    onPlay={onPlay}
                    navigateToCategory={navigateToCategory}
                    t={t}
                />

                {/* Sections par catégorie */}
                <CategorySections
                    serieCategories={serieCategories}
                    seriesByCategory={seriesByCategory}
                    loading={loadingSeriesByCategory}
                    onSelectMedia={onSelectMedia}
                    onPlay={onPlay}
                />

                {/* Section Podcasts */}
                <PodcastsSection
                    podcasts={podcasts}
                    onSelectMedia={onSelectMedia}
                    onPlay={onPlay}
                    navigateToCategory={navigateToCategory}
                    t={t}
                />

                {/* Section Most Watched */}
                <MostWatchedSection
                    items={mostWatchedItems}
                    onSelectMedia={onSelectMedia}
                    onPlay={onPlay}
                    loading={loadingMostWatched}
                    t={t}
                />

                {/* Section Most Liked */}
                <MostLikedSection
                    items={mostLikedItems}
                    onSelectMedia={onSelectMedia}
                    onPlay={onPlay}
                    loading={loadingMostLiked}
                    t={t}
                />
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
        </div>
    );
};

const HomeScreenWithErrorBoundary: React.FC<HomeScreenProps> = (props) => (
    <ErrorBoundary>
        <HomeScreen {...props} />
    </ErrorBoundary>
);

export default HomeScreenWithErrorBoundary;