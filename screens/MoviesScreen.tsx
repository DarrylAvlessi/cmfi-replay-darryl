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
        <div className="min-h-screen broadcast-canvas animate-fadeIn pb-14">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-6">
                {/* En-tête de page */}
                <div className="broadcast-panel relative mb-6 flex flex-col gap-5 overflow-hidden rounded-3xl p-5 sm:p-7 md:flex-row md:items-end md:justify-between">
                    <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl dark:bg-sky-400/10" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <button
                                onClick={handleBack}
                                className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
                                aria-label={t('back')}
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                            </button>
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/15 bg-blue-500/5 text-blue-600 dark:border-sky-400/15 dark:bg-sky-400/5 dark:text-sky-400">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                    <rect x="3" y="4" width="18" height="16" rx="3" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m10 9 5 3-5 3V9Z" />
                                </svg>
                            </span>
                            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
                                {t('moviesScreenTitle') || 'Documentaires'}
                            </h1>
                        </div>
                        <p className="max-w-2xl pl-0 text-sm leading-relaxed text-slate-600 sm:pl-14 dark:text-slate-400">
                            {t('categoryMoviesDescription')}
                        </p>
                    </div>

                    {!loading && (
                        <div className="relative inline-flex items-center gap-3 self-start rounded-2xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 md:self-auto dark:border-sky-400/15 dark:bg-sky-400/5">
                            <span className="font-mono-meta text-2xl font-bold text-blue-700 dark:text-sky-300">{filteredAndSortedMovies.length}</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {filteredAndSortedMovies.length > 1 ? t('movies') || 'documentaires' : t('movie') || 'documentaire'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Toolbar Studio */}
                <div className="p-3 rounded-2xl broadcast-panel flex flex-col md:flex-row md:items-center gap-3 mb-7">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="relative flex-1 md:flex-none">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                className="appearance-none w-full bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 px-3.5 py-2.5 pr-9 rounded-xl font-medium text-xs sm:text-sm focus:outline-none focus:border-blue-500 cursor-pointer transition-all"
                            >
                                <option value="title">{t('sortByTitle') || 'Trier par titre'}</option>
                                <option value="newest">{t('sortByNewest') || 'Plus récents'}</option>
                                <option value="oldest">{t('sortByOldest') || 'Plus anciens'}</option>
                                <option value="popular">{t('sortByPopular') || 'Plus populaires'}</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-label={t('gridView')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-label={t('listView')}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contenu principal */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 sm:gap-6">
                        {[...Array(12)].map((_, i) => (
                            <MovieCardSkeleton key={i} />
                        ))}
                    </div>
                ) : filteredAndSortedMovies.length === 0 ? (
                    <div className="text-center py-20 broadcast-panel rounded-3xl">
                        <div className="max-w-md mx-auto space-y-4 px-4">
                            <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                                {searchTerm ? t('noSearchResults') || 'Aucun résultat' : t('noMovies') || 'Aucun documentaire'}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {searchTerm
                                    ? t('tryDifferentSearch') || 'Essayez une autre recherche'
                                    : t('noMoviesAvailable') || 'Aucun documentaire disponible pour le moment'}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-semibold rounded-xl hover:from-blue-500 hover:to-sky-400 transition-all"
                                >
                                    {t('clearSearch') || 'Effacer la recherche'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : viewMode === 'grid' ? (
                    <ScrollReveal>
                        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 sm:gap-6">
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
                        <div className="space-y-3">
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