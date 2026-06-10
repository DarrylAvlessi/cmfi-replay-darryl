import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { serieService, Serie, seasonSerieService, episodeSerieService, serieCategoryService, SerieCategory, getCategoryName } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';
import SeriesCard, { SerieWithStats } from '../components/SeriesCard';

interface SeriesScreenProps {
    onSelectMedia: (media: MediaContent) => void;
    onPlay: (media: MediaContent) => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'title' | 'seasons';

const SeriesScreen: React.FC<SeriesScreenProps> = ({ onSelectMedia, onPlay }) => {
    const navigate = useNavigate();
    const { t, language } = useAppContext();
    const [series, setSeries] = useState<SerieWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sortOption, setSortOption] = useState<SortOption>('title');
    const [categories, setCategories] = useState<SerieCategory[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategoryId = searchParams.get('category') || null;

    // Convertir une Serie en MediaContent avec stats (optimisé - utilise les stats pré-calculées)
    const convertSerieToMediaContent = async (serie: Serie): Promise<SerieWithStats> => {
        let seasonsCount = serie.seasonsCount;
        let episodesCount = serie.episodesCount;

        const needsStatsRefresh = () => {
            if (seasonsCount === undefined || episodesCount === undefined) {
                return true;
            }
            if (seasonsCount === 0 && episodesCount === 0) {
                return true;
            }
            if (serie.statsUpdatedAt) {
                const statsAgeMs = Date.now() - new Date(serie.statsUpdatedAt as any).getTime();
                const statsAgeHours = statsAgeMs / (1000 * 60 * 60);
                if (statsAgeHours > 24) {
                    return true;
                }
            } else {
                return true;
            }
            return false;
        };
        
        if (needsStatsRefresh()) {
            // Stats refresh needed for serie ${serie.uid_serie}
            try {
                const seasons = await seasonSerieService.getSeasonsBySerie(serie.uid_serie);
                seasonsCount = seasons.length;

                const episodesPromises = seasons.map(season =>
                    episodeSerieService.getEpisodesBySeason(season.uid_season)
                );
                const episodesArrays = await Promise.all(episodesPromises);
                episodesCount = episodesArrays.reduce((total, episodes) => total + episodes.length, 0);
                
                try {
                    await serieService.calculateAndUpdateSeriesStats(serie.uid_serie);
                } catch (updateError) {
                    console.error('Error updating series stats:', updateError);
                }
            } catch (error) {
                console.error('Error loading series stats:', error);
                seasonsCount = seasonsCount ?? 0;
                episodesCount = episodesCount ?? 0;
            }
        }

        return {
            id: serie.uid_serie,
            title: serie.title_serie,
            type: MediaType.Series,
            imageUrl: serie.image_path || '',
            duration: serie.runtime_h_m || '',
            theme: '',
            description: serie.overview_serie || '',
            languages: serie.lang ? [serie.lang] : [],
            progress: undefined,
            seasonsCount,
            episodesCount,
            totalDuration: serie.totalDuration ? formatDuration(serie.totalDuration) : undefined,
            categoryId: serie.categoryId,
            backdropUrl: serie.back_path || ''
        };
    };

    // Formater la durée en secondes en format lisible
    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        } else if (minutes > 0) {
            return `${minutes}min`;
        } else {
            return `${seconds}s`;
        }
    };

    // Charger toutes les séries une seule fois (le filtrage par catégorie est côté client)
    useEffect(() => {
        const loadSeries = async () => {
            setLoading(true);
            try {
                const seriesData = await serieService.getAllSeriesOnly();
                const seriesWithStats = await Promise.all(
                    seriesData.map(convertSerieToMediaContent)
                );
                setSeries(seriesWithStats);
            } catch (error) {
                console.error('Error loading series:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSeries();
    }, []);

    // Charger les catégories
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await serieCategoryService.getAllCategories();
                setCategories(cats);
            } catch (error) {
                console.error('Error loading categories:', error);
            }
        };
        loadCategories();
    }, []);

    // Compter les séries par catégorie pour les badges
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        series.forEach(s => {
            if (s.categoryId) {
                counts[s.categoryId] = (counts[s.categoryId] || 0) + 1;
            }
        });
        return counts;
    }, [series]);

    // Filtrer et trier les séries
    const filteredAndSortedSeries = useMemo(() => {
        let filtered = [...series];

        // Filtre par catégorie (côté client)
        if (selectedCategoryId) {
            filtered = filtered.filter(s => s.categoryId === selectedCategoryId);
        }

        // Filtre de recherche
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(serie =>
                serie.title.toLowerCase().includes(searchLower) ||
                serie.description?.toLowerCase().includes(searchLower) ||
                serie.author?.toLowerCase().includes(searchLower)
            );
        }

        // Tri
        filtered.sort((a, b) => {
            switch (sortOption) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'seasons':
                    return (b.seasonsCount || 0) - (a.seasonsCount || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [series, searchTerm, sortOption, selectedCategoryId]);

    const handleBack = () => {
        navigate('/home');
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black animate-fadeIn pb-8">
            {/* Header avec recherche et contrôles */}
            <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-black">
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
                            {t('seriesScreenTitle') || 'Productions'}
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
                            placeholder={t('search') || 'Rechercher une série...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                        />
                    </div>

                    {/* Barre de contrôle unifiée: Tri + Vue */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-900/50 rounded-xl p-1">
                        {/* Sélecteur de tri */}
                        <div className="relative flex-1 min-w-0">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                className="appearance-none bg-transparent border-0 w-full text-gray-700 dark:text-gray-300 px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer transition-colors duration-200 hover:text-amber-600 dark:hover:text-amber-400"
                            >
                                <option value="title">{t('sortByTitle') || 'Titre (A-Z)'}</option>
                                <option value="seasons">{t('sortBySeasons') || 'Plus de saisons'}</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Séparateur vertical */}
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

                        {/* Toggle vue Grille/Liste */}
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all duration-200 ${
                                    viewMode === 'grid'
                                        ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                                aria-label="Vue grille"
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all duration-200 ${
                                    viewMode === 'list'
                                        ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                                aria-label="Vue liste"
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Filtre par catégorie (défilement horizontal) */}
                    {categories.length > 0 && (
                        <div className="pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap items-center">
                                <svg className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                <button
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('category');
                                        setSearchParams(newParams);
                                    }}
                                    className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        selectedCategoryId === null
                                            ? 'bg-amber-500 text-gray-900'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                    aria-pressed={selectedCategoryId === null}
                                >
                                    Toutes ({series.length})
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            const newParams = new URLSearchParams(searchParams);
                                            newParams.set('category', category.id);
                                            setSearchParams(newParams);
                                        }}
                                        className={`flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                            selectedCategoryId === category.id
                                                ? 'bg-amber-500 text-gray-900'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                        aria-pressed={selectedCategoryId === category.id}
                                    >
                                        <div
                                            className="w-3.5 h-3.5 rounded-full ring-1 ring-inset ring-gray-300 dark:ring-gray-600"
                                            style={{ backgroundColor: category.color || '#3B82F6' }}
                                        />
                                        <span>{getCategoryName(category, language)}</span>
                                        <span className="text-xs opacity-70">({categoryCounts[category.id] || 0})</span>
                                    </button>
                                ))}
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
                ) : filteredAndSortedSeries.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="max-w-md mx-auto space-y-4">
                            <svg className="w-24 h-24 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                 {searchTerm ? t('noSearchResults') || 'Aucun résultat' : t('noSeries') || 'No productions found'}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {searchTerm
                                    ? t('tryDifferentSearch') || 'Essayez une autre recherche'
                                     : t('noSeriesAvailable') || 'No productions available'}
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
                                 {filteredAndSortedSeries.length} {filteredAndSortedSeries.length > 1 ? t('series') || 'productions' : t('serie') || 'production'}
                                {searchTerm && ` ${t('foundFor') || 'trouvée(s) pour'} "${searchTerm}"`}
                            </p>
                        </div>

                        {/* Grille ou Liste selon le mode */}
                        {viewMode === 'grid' ? (
                            <div className="relative grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6 z-0">
                                {filteredAndSortedSeries.map((serie, index) => (
                                    <div
                                        key={serie.id}
                                        className="animate-fadeIn"
                                        style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                                    >
                                        <SeriesCard
                                            serie={serie}
                                            variant="poster"
                                            onSelect={onSelectMedia}
                                            onPlay={onPlay}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="relative space-y-2 z-0">
                                {filteredAndSortedSeries.map((serie, index) => (
                                    <div
                                        key={serie.id}
                                        className="animate-fadeIn"
                                        style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                                    >
                                        <SeriesCard
                                            serie={serie}
                                            variant="list"
                                            onSelect={onSelectMedia}
                                            onPlay={onPlay}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default SeriesScreen;
