import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import MovieCard from '../components/MovieCard';
import { movieService, Movie } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';

interface MoviesScreenProps {
    onSelectMedia: (media: MediaContent) => void;
    onPlay: (media: MediaContent) => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'title' | 'newest' | 'oldest' | 'popular';
type FilterOption = 'all' | 'premiumContent' | 'free';

const MoviesScreen: React.FC<MoviesScreenProps> = ({ onSelectMedia, onPlay }) => {
    const navigate = useNavigate();
    const { t, theme } = useAppContext();
    const [movies, setMovies] = useState<MediaContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortOption, setSortOption] = useState<SortOption>('title');
    const [filterOption, setFilterOption] = useState<FilterOption>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Convertir un Movie en MediaContent
    const convertMovieToMediaContent = (movie: Movie): MediaContent => ({
        id: movie.uid,
        title: movie.title,
        type: MediaType.Movie,
        imageUrl: movie.picture_path || movie.poster_path || movie.backdrop_path || '',
        duration: movie.runtime_h_m || '',
        theme: '',
        description: movie.overview || '',
        languages: movie.original_language ? [movie.original_language] : [],
        progress: undefined,
        video_path_hd: movie.video_path_hd,
        is_premium: movie.is_premium || false,
        premium_text: movie.premium_text || ''
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

        // Filtre Premium/Free
        if (filterOption === 'premiumContent') {
            filtered = filtered.filter(movie => movie.is_premium);
        } else if (filterOption === 'free') {
            filtered = filtered.filter(movie => !movie.is_premium);
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
    }, [movies, searchTerm, filterOption, sortOption]);

    const handleBack = () => {
        navigate('/home');
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black animate-fadeIn pb-8">
            {/* Header avec recherche et contrôles */}
            <div className="sticky top-16 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-black backdrop-blur-md shadow-sm">
                <div className="px-4 md:px-6 lg:px-8 py-4 space-y-4">
                    {/* Barre de navigation supérieure */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Retour"
                        >
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                            {t('moviesScreenTitle') || 'Documentaires'}
                        </h1>
                        <div className="w-10"></div>
                    </div>

                    {/* Barre de recherche */}
                    <div className="relative">
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
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                        />
                    </div>

                    {/* Contrôles: Filtres, Tri, Vue */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Bouton Filtres */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                showFilters || filterOption !== 'all'
                                    ? 'bg-amber-500 text-gray-900'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span className="text-sm">{t('filters') || 'Filtres'}</span>
                            {filterOption !== 'all' && (
                                <span className="ml-1 px-1.5 py-0.5 bg-gray-900 text-white text-xs rounded-full">
                                    {filterOption === 'premiumContent' ? 'Premium' : 'Gratuit'}
                                </span>
                            )}
                        </button>

                        {/* Menu de tri */}
                        <div className="relative">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                className="appearance-none bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 pr-8 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all duration-200"
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

                        {/* Toggle vue Grille/Liste */}
                        <div className="ml-auto flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-all duration-200 ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                                aria-label="Vue grille"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded transition-all duration-200 ${
                                    viewMode === 'list'
                                        ? 'bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-md'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                                aria-label="Vue liste"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Panneau de filtres déroulant */}
                    {showFilters && (
                        <div className="pt-2 pb-2 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilterOption('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        filterOption === 'all'
                                            ? 'bg-amber-500 text-gray-900'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {t('all') || 'Tous'}
                                </button>
                                <button
                                    onClick={() => setFilterOption('premiumContent')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        filterOption === 'premiumContent'
                                            ? 'bg-amber-500 text-gray-900'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                        </svg>
                                        {t('premiumContent') || 'Premium'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setFilterOption('free')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        filterOption === 'free'
                                            ? 'bg-amber-500 text-gray-900'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {t('free') || 'Gratuit'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Contenu principal */}
            <div className="relative px-4 md:px-6 lg:px-8 pt-6 z-10">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
                            <p className="text-gray-600 dark:text-gray-400">{t('loading') || 'Chargement...'}</p>
                        </div>
                    </div>
                ) : filteredAndSortedMovies.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="max-w-md mx-auto space-y-4">
                            <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {searchTerm ? t('noSearchResults') || 'Aucun résultat' : t('noMovies') || 'Aucun documentaire'}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
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
                ) : (
                    <>
                        {/* Compteur de résultats */}
                        <div className="mb-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {filteredAndSortedMovies.length} {filteredAndSortedMovies.length > 1 ? t('movies') || 'documentaires' : t('movie') || 'documentaire'}
                                {searchTerm && ` ${t('foundFor') || 'trouvé(s) pour'} "${searchTerm}"`}
                            </p>
                        </div>

                        {/* Grille ou Liste selon le mode */}
                        {viewMode === 'grid' ? (
                            <div className="relative grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6 z-0">
                                {filteredAndSortedMovies.map((movie) => (
                                    <MovieCard
                                        key={movie.id}
                                        movie={movie}
                                        variant="poster"
                                        onSelect={onSelectMedia}
                                        onPlay={onPlay}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="relative space-y-2 z-0">
                                {filteredAndSortedMovies.map((movie) => (
                                    <MovieCard
                                        key={movie.id}
                                        movie={movie}
                                        variant="list"
                                        onSelect={onSelectMedia}
                                        onPlay={onPlay}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MoviesScreen;
