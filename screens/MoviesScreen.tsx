import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import MovieCard from '../components/MovieCard';
import { movieService, Movie } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';
import ScrollReveal from '../components/ScrollReveal';
import { Skeleton } from '../components/Skeleton';

interface MoviesScreenProps {
    onSelectMedia: (media: MediaContent) => void;
    onPlay: (media: MediaContent) => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'title' | 'newest' | 'oldest' | 'popular';

const MovieCardSkeleton: React.FC = () => (
    <div className="space-y-2">
        <Skeleton variant="rounded" className="w-full aspect-[2/3]" />
        <Skeleton variant="text" height={14} width="80%" />
        <Skeleton variant="text" height={12} width="55%" />
    </div>
);

const MoviesScreen: React.FC<MoviesScreenProps> = ({ onSelectMedia, onPlay }) => {
    const navigate = useNavigate();
    const { t } = useAppContext();
    const [movies, setMovies] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortOption, setSortOption] = useState<SortOption>('title');

    // Formater la durée en secondes en hh:mm:ss
    const formatRuntime = (runtime: string): string => {
        const totalSeconds = parseInt(runtime, 10);
        if (isNaN(totalSeconds)) return runtime || '';
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    // Convertir un Movie en MediaContent
    const convertMovieToMediaContent = (movie: Movie): MediaContent => ({
        id: movie.uid,
        title: movie.title,
        type: MediaType.Movie,
        imageUrl: movie.picture_path || movie.poster_path || movie.backdrop_path || '',
        duration: formatRuntime(movie.runtime),
        theme: '',
        description: movie.overview || '',
        languages: movie.original_language ? [movie.original_language] : [],
        progress: undefined,
        video_path_hd: movie.video_path_hd,
    });

    // Charger les films depuis Firestore
    useEffect(() => {
        const loadMovies = async () => {
            setLoading(true);
            try {
                const moviesData = await movieService.getAllMovies();
                const mediaContent = moviesData.map(convertMovieToMediaContent);
                setMovies(mediaContent);
            } catch (error) {
                console.error('Error loading movies:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMovies();
    }, []);

    // Filtrer et trier les films
    const filteredAndSortedMovies = useMemo(() => {
        let filtered = [...movies];

        // Filtre de recherche
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(movie =>
                movie.title.toLowerCase().includes(searchLower) ||
                movie.description?.toLowerCase().includes(searchLower) ||
                movie.author?.toLowerCase().includes(searchLower)
            );
        }

        // Tri
        filtered.sort((a, b) => {
            switch (sortOption) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'newest':
                    // Pour l'instant, tri par titre (à améliorer avec une date de sortie)
                    return b.title.localeCompare(a.title);
                case 'oldest':
                    return a.title.localeCompare(b.title);
                case 'popular':
                    // Pour l'instant, tri par titre (à améliorer avec des vues)
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [movies, searchTerm, sortOption]);

    const handleBack = () => {
        navigate('/home');
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black animate-fadeIn pb-10">
            <div className="max-w-7xl mx-auto px-3 md:px-6 lg:px-8 pt-4 lg:pt-6">
                {/* En-tête de page : titre unique */}
                <div className="flex items-center gap-3 mb-5 md:mb-7">
                    <button
                        onClick={handleBack}
                        className="lg:hidden p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label={t('back')}
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                        {t('moviesScreenTitle') || 'Documentaires'}
                    </h1>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5 md:mb-7">
                    {t('categoryMoviesDescription')}
                </p>

                {/* Barre fusionnée : fil d'ariane + recherche */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-5 md:mb-7">
                    {/* <button
                        onClick={handleBack}
                        className="self-start flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400 hover:text-amber-500 transition-colors"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                        {t('home') || 'Home'}
                    </button> */}

                    <div className="relative md:flex-1 md:max-w-md md:ml-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder={t('search') || 'Rechercher un documentaire...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Barre d'action : tri + compteur + vue */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="relative">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value as SortOption)}
                            className="appearance-none bg-white dark:bg-black border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 pr-8 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all duration-200"
                        >
                            <option value="title">{t('sortByTitle') || 'Trier par titre'}</option>
                            <option value="newest">{t('sortByNewest') || 'Plus récents'}</option>
                            <option value="oldest">{t('sortByOldest') || 'Plus anciens'}</option>
                            <option value="popular">{t('sortByPopular') || 'Plus populaires'}</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {!loading && (
                        <p className="ml-auto text-sm text-slate-500 dark:text-gray-400">
                            {filteredAndSortedMovies.length} {filteredAndSortedMovies.length > 1 ? t('movies') || 'documentaires' : t('movie') || 'documentaire'}
                            {searchTerm && ` ${t('foundFor') || 'trouvé(s) pour'} "${searchTerm}"`}
                        </p>
                    )}

                    <div className="flex items-center gap-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded transition-all duration-200 ${
                                viewMode === 'grid'
                                    ? 'bg-gray-200 dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            aria-label={t('gridView')}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-all duration-200 ${
                                viewMode === 'list'
                                    ? 'bg-gray-200 dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            aria-label={t('listView')}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Contenu principal */}
                {loading ? (
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-6">
                        {[...Array(12)].map((_, i) => (
                            <MovieCardSkeleton key={i} />
                        ))}
                    </div>
                ) : filteredAndSortedMovies.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="max-w-md mx-auto space-y-4">
                            <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {searchTerm ? t('noSearchResults') || 'Aucun résultat' : t('noMovies') || 'Aucun documentaire'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {searchTerm
                                    ? t('tryDifferentSearch') || 'Essayez une autre recherche'
                                    : t('noMoviesAvailable') || 'Aucun documentaire disponible pour le moment'}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-4 px-6 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
                                >
                                    {t('clearSearch') || 'Effacer la recherche'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (
                    <ScrollReveal>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-6">
                            {filteredAndSortedMovies.map((movie) => (
                                <MovieCard
                                    key={movie.id}
                                    movie={movie}
                                    variant="poster"
                                    onSelect={onSelectMedia}
                                />
                            ))}
                        </div>
                    </ScrollReveal>
                ) : (
                    <ScrollReveal>
                        <div className="space-y-2">
                            {filteredAndSortedMovies.map((movie) => (
                                <MovieCard
                                    key={movie.id}
                                    movie={movie}
                                    variant="list"
                                    onSelect={onSelectMedia}
                                />
                            ))}
                        </div>
                    </ScrollReveal>
                )}
            </div>
        </div>
    );
};

export default MoviesScreen;