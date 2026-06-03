import React, { useState, useEffect } from 'react';
import MediaCard from '../components/MediaCard';
import { continueWatching, allContent, mostWatched, mostLiked } from '../data/mockData';
import { MediaContent, MediaType } from '../types';
import { useAppContext } from '../context/AppContext';
import { serieService, Serie, movieService, Movie } from '../lib/firestore';

interface CategoryScreenProps {
    mediaType: MediaType;
    onBack: () => void;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
}

const MediaRow: React.FC<{ title: string; items: MediaContent[]; onSelectMedia: (item: MediaContent) => void; onPlay: (item: MediaContent) => void; variant?: 'poster' | 'thumbnail' | 'list' }> = ({ title, items, onSelectMedia, onPlay, variant }) => {
    if (items.length === 0) return null;
    return (
        <section className="py-4">
            <h3 className="text-xl font-bold px-4 mb-3">{title}</h3>
            <div className="flex space-x-4 overflow-x-auto px-4 scrollbar-hide pb-2">
                {items.map((item) => (
                    <MediaCard key={item.id} item={item} variant={variant} onSelect={onSelectMedia} onPlay={onPlay} />
                ))}
            </div>
        </section>
    );
};


const CategoryScreen: React.FC<CategoryScreenProps> = ({ mediaType, onBack, onSelectMedia, onPlay }) => {
    const { t } = useAppContext();
    const [series, setSeries] = useState<MediaContent[]>([]);
    const [movies, setMovies] = useState<MediaContent[]>([]);
    const [podcasts, setPodcasts] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);

    // Convertir une Serie en MediaContent
    const convertSerieToMediaContent = (serie: Serie): MediaContent => ({
        id: serie.uid_serie,
        title: serie.title_serie,
        type: MediaType.Series,
        imageUrl: serie.image_path,
        duration: serie.runtime_h_m || '',
        theme: '',
        description: serie.overview_serie,
        languages: serie.lang ? [serie.lang] : [],
        progress: undefined,
    });

    // Convertir un Movie en MediaContent (pour les films)
    const convertMovieToMediaContent = (movie: Movie): MediaContent => ({
        id: movie.uid,
        title: movie.title,
        type: MediaType.Movie,
        imageUrl: movie.picture_path,
        duration: movie.runtime_h_m || '',
        theme: '',
        description: movie.overview,
        languages: movie.original_language ? [movie.original_language] : [],
        progress: undefined,
        video_path_hd: movie.video_path_hd,
    });

    // Convertir un Podcast (Serie avec serie_type: 'podcast') en MediaContent
    const convertPodcastToMediaContent = (podcast: Serie): MediaContent => ({
        id: podcast.uid_serie,
        title: podcast.title_serie,
        type: MediaType.Podcast,
        imageUrl: podcast.image_path,
        duration: podcast.runtime_h_m || '',
        theme: '',
        description: podcast.overview_serie,
        languages: podcast.lang ? [podcast.lang] : [],
        progress: undefined,
    });

    // Charger les données depuis Firestore
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                if (mediaType === MediaType.Series) {
                    const seriesData = await serieService.getAllSeriesOnly();
                    const mediaContent = seriesData.map(convertSerieToMediaContent);
                    setSeries(mediaContent);
                } else if (mediaType === MediaType.Movie) {
                    const moviesData = await movieService.getAllMovies();
                    const mediaContent = moviesData.map(convertMovieToMediaContent);
                    setMovies(mediaContent);
                } else if (mediaType === MediaType.Podcast) {
                    const podcastsData = await serieService.getAllPodcasts();
                    const mediaContent = podcastsData.map(convertPodcastToMediaContent);
                    setPodcasts(mediaContent);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [mediaType]);

    const screenTitleMap: Record<MediaType, string> = {
        [MediaType.Series]: t('seriesScreenTitle'),
        [MediaType.Movie]: t('moviesScreenTitle'),
        [MediaType.Podcast]: t('podcastsScreenTitle'),
    };

    const sectionTitleMap = {
        all: {
            [MediaType.Series]: t('allSeries'),
            [MediaType.Movie]: t('allMovies'),
            [MediaType.Podcast]: t('allPodcasts'),
        },
        mostWatched: {
            [MediaType.Series]: t('mostWatchedSeries'),
            [MediaType.Movie]: t('mostWatchedMovies'),
            [MediaType.Podcast]: t('mostWatchedPodcasts'),
        },
        mostLiked: {
            [MediaType.Series]: t('mostLikedSeries'),
            [MediaType.Movie]: t('mostLikedMovies'),
            [MediaType.Podcast]: t('mostLikedPodcasts'),
        }
    };

    const continueWatchingForCategory = continueWatching.filter(item => item.type === mediaType);
    const allForCategory = mediaType === MediaType.Series ? series :
        mediaType === MediaType.Movie ? movies :
            mediaType === MediaType.Podcast ? podcasts :
                allContent.filter(item => item.type === mediaType);
    const mostWatchedForCategory = mostWatched.filter(item => item.type === mediaType);
    const mostLikedForCategory = mostLiked.filter(item => item.type === mediaType);

    return (
        <div className="animate-fadeIn pt-4">
            <div className="px-6 mb-6 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Retour à l'accueil"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {screenTitleMap[mediaType]}
                </h1>
                <div className="w-10"></div> {/* Pour équilibrer la mise en page */}
            </div>
            <div className="px-4 space-y-3">
                {loading && (mediaType === MediaType.Series || mediaType === MediaType.Movie || mediaType === MediaType.Podcast) ? (
                    <div className="text-center py-8">
                        <div className="text-gray-500 dark:text-gray-400">{t('loading') || 'Chargement...'}</div>
                    </div>
                ) : (
                    allForCategory.map((item) => (
                        <MediaCard
                            key={item.id}
                            item={item}
                            variant="list"
                            onSelect={onSelectMedia}
                            onPlay={onPlay}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default CategoryScreen;
