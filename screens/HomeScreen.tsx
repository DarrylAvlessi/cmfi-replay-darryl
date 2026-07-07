import React, { useState, useEffect, useCallback } from 'react';
import HeroPrimeVideo from '../components/HeroPrimeVideo';
import { featuredContent } from '../data/mockData';
import { MediaContent, MediaType } from '../types';
import MediaCard from '../components/MediaCard';
import { useAppContext } from '../context/AppContext';
import { episodeSerieService, serieService, seasonSerieService, EpisodeSerie, ContinueWatchingItem } from '../lib/db';
import InfoBar from '../components/InfoBar';
import ProfileCompletionModal from '../components/ProfileCompletionModal';
import { useTutorial } from '../context/TutorialContext';
import MoviesSection from '../components/sections/MoviesSection';
import SeriesSection from '../components/sections/SeriesSection';
import PodcastsSection from '../components/sections/PodcastsSection';
import MostWatchedSection from '../components/sections/MostWatchedSection';
import MostLikedSection from '../components/sections/MostLikedSection';
import CategorySections from '../components/sections/CategorySections';
import ErrorBoundary from '../components/ErrorBoundary';
import ScrollReveal from '../components/ScrollReveal';
import { useTenHomeMovies } from '../hooks/useMovies';
import { useTenHomeSeries, useTenHomePodcasts } from '../hooks/useSeries';
import { useCategories, useSeriesByCategories } from '../hooks/useCategories';
import { useMostLikedItems } from '../hooks/useMostLiked';
import { useMostWatchedItems } from '../hooks/useMostWatched';
import { useContinueWatching } from '../hooks/useContinueWatching';

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
    const { t, user, userProfile, setUserProfile, connectionQuality } = useAppContext();
    const { tryShowTutorialPrompt, isTourRunning } = useTutorial();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const skipNonEssential = connectionQuality === 'slow';
    const itemLimit = skipNonEssential ? 5 : connectionQuality === 'medium' ? 8 : 10;

    useEffect(() => {
        const handleScroll = () => setShowScrollTop(window.scrollY > 600);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (userProfile && user) {
            const countryMissing = !userProfile.country || userProfile.country.trim() === '';
            const needsCompletion = countryMissing;
            if (needsCompletion) {
                setShowProfileModal(true);
            } else {
                setShowProfileModal(false);
            }
        }
    }, [userProfile, user]);

    useEffect(() => {
        if (showProfileModal || isTourRunning) return;
        const timer = setTimeout(() => tryShowTutorialPrompt(), 2000);
        return () => clearTimeout(timer);
    }, [showProfileModal, isTourRunning, tryShowTutorialPrompt]);

    const {
        data: mostLikedItems,
        isLoading: loadingMostLiked,
        error: mostLikedError,
    } = useMostLikedItems(itemLimit);

    const {
        data: mostWatchedItems,
        isLoading: loadingMostWatched,
        error: mostWatchedError,
    } = useMostWatchedItems(itemLimit);

    const {
        data: movies,
        isLoading: loadingMovies,
        error: moviesError,
    } = useTenHomeMovies();

    const {
        data: series,
        isLoading: loadingSeries,
        error: seriesError,
    } = useTenHomeSeries();

    const {
        data: podcasts,
        isLoading: loadingPodcasts,
        error: podcastsError,
    } = useTenHomePodcasts();

    const {
        data: serieCategories,
        isLoading: loadingCategories,
        error: categoriesError,
    } = useCategories();

    const {
        data: seriesByCategory,
        isLoading: loadingSeriesByCategory,
    } = useSeriesByCategories(serieCategories || []);

    const {
        data: continueWatchingItems,
        isLoading: loadingContinueWatching,
    } = useContinueWatching(user?.uid, 10);

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

    const continueWatchingMedia = (continueWatchingItems || []).map(cwToMediaContent);

    const handleContinueWatchingClick = useCallback(async (item: ContinueWatchingItem) => {
        if (item.type === 'movie') {
            const movie = await (await import('../lib/db')).movieService.getMovieByUid(item.uid);
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
            const episodeUid = item.uid_episode || item.uid;
            let episode = null;

            if (episodeUid) {
                episode = await episodeSerieService.getEpisodeByUid(episodeUid);
            }

            if (!episode && item.episodeId) {
                episode = await episodeSerieService.getEpisodeById(item.episodeId);
            }

            if (episode) {
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

                onPlay(mediaContent, episode);
            }
        }
    }, [onPlay]);

    const handleContinueSelect = useCallback(async (content: MediaContent) => {
        const cwItem = (continueWatchingItems || []).find(cw => cw.id === content.id);
        if (cwItem) {
            await handleContinueWatchingClick(cwItem);
        }
    }, [continueWatchingItems, handleContinueWatchingClick]);

    return (
        <div className="min-h-screen bg-white dark:bg-black">

            <div className="animate-fadeIn">
                <HeroPrimeVideo items={featuredContent} onSelectMedia={onSelectMedia} onPlay={onPlay} />
            </div>

            <InfoBar />

            {connectionQuality === 'slow' && (
                <div className="px-4 md:px-6 lg:px-8 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                    <p className="text-xs md:text-sm text-amber-700 dark:text-amber-300 text-center">
                        {'Connexion lente détectée — certains contenus sont masqués pour économiser les données.'}
                    </p>
                </div>
            )}

            <div className="bg-white dark:bg-black">
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
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
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
                    </ScrollReveal>
                    </div>
                )}

                {seriesError ? (
                    <SectionError message={String(seriesError)} />
                ) : (
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
                        <SeriesSection
                            series={series || []}
                            onSelectMedia={onSelectMedia}
                            onPlay={onPlay}
                            navigateToCategory={navigateToCategory}
                            t={t}
                        />
                    </ScrollReveal>
                    </div>
                )}

                {categoriesError ? (
                    <SectionError message={String(categoriesError)} />
                ) : (
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
                        <CategorySections
                            serieCategories={serieCategories || []}
                            seriesByCategory={seriesByCategory || {}}
                            loading={loadingCategories || loadingSeriesByCategory}
                            onSelectMedia={onSelectMedia}
                            onPlay={onPlay}
                        />
                    </ScrollReveal>
                    </div>
                )}

                {moviesError ? (
                    <SectionError message={String(moviesError)} />
                ) : (
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
                        <MoviesSection
                            movies={movies || []}
                            onSelectMedia={onSelectMedia}
                            onPlay={onPlay}
                            navigateToCategory={navigateToCategory}
                            t={t}
                        />
                    </ScrollReveal>
                    </div>
                )}

                {!skipNonEssential && (podcastsError ? (
                    <SectionError message={String(podcastsError)} />
                ) : (
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
                        <PodcastsSection
                            podcasts={podcasts || []}
                            onSelectMedia={onSelectMedia}
                            onPlay={onPlay}
                            navigateToCategory={navigateToCategory}
                            t={t}
                        />
                    </ScrollReveal>
                    </div>
                ))}

                {!skipNonEssential && (mostWatchedError ? (
                    <SectionError message={String(mostWatchedError)} />
                ) : (
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
                        <MostWatchedSection
                            items={mostWatchedItems || []}
                            onSelectMedia={onSelectMedia}
                            onPlay={onPlay}
                            loading={loadingMostWatched}
                            t={t}
                        />
                    </ScrollReveal>
                    </div>
                ))}

                {!skipNonEssential && (mostLikedError ? (
                    <SectionError message={String(mostLikedError)} />
                ) : (
                    <div style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
                    <ScrollReveal>
                        <MostLikedSection
                            items={mostLikedItems || []}
                            onSelectMedia={onSelectMedia}
                            onPlay={onPlay}
                            loading={loadingMostLiked}
                            t={t}
                        />
                    </ScrollReveal>
                    </div>
                ))}
            </div>

            {showProfileModal && userProfile && (
                <ProfileCompletionModal
                    userProfile={userProfile}
                    onComplete={(updatedProfile) => {
                        setUserProfile(updatedProfile);
                        setShowProfileModal(false);
                    }}
                />
            )}

            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-20 md:bottom-8 right-8 z-50 p-3 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-all duration-200 hover:scale-110"
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
