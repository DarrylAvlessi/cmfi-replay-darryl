import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import MediaCard from '../components/MediaCard';
import { serieService, Serie, seasonSerieService, SeasonSerie, episodeSerieService, EpisodeSerie, serieCategoryService, SerieCategory, getCategoryName } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';

interface SeriesScreenProps {
    onSelectMedia: (media: MediaContent) => void;
    onPlay: (media: MediaContent) => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'title' | 'newest' | 'oldest' | 'seasons';

interface SerieWithStats extends MediaContent {
    seasonsCount?: number;
    episodesCount?: number;
    totalDuration?: string;
}

// Composant de carte de série améliorée avec stats
const SeriesCard: React.FC<{
    serie: SerieWithStats;
    onSelect: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    variant: 'poster' | 'list';
}> = ({ serie, onSelect, onPlay, variant }) => {
    // Pour les séries, on navigue toujours vers la page de détails (pas de lecture directe)
    const handleSelect = () => onSelect(serie);
    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Pour les séries, on navigue vers la page de détails au lieu de jouer directement
        onSelect(serie);
    };


    if (variant === 'list') {
        return (
            <div
                onClick={handleSelect}
                className="group relative flex items-center gap-5 p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-200/80 dark:border-black/80 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer overflow-hidden"
            >
                {/* Ligne de gradient au hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Image avec aspect ratio cinématique */}
                <div className="relative w-28 h-20 md:w-36 md:h-24 lg:w-40 lg:h-28 bg-gray-200 dark:bg-black rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105">
                    <img 
                        src={serie.imageUrl} 
                        alt={serie.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    {/* Overlay au hover */}
                    <div
                        onClick={handleSelect}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/95 rounded-lg shadow-xl">
                            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-900 text-sm font-bold">Détails</span>
                        </div>
                    </div>
                </div>
                
                {/* Informations */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                            {serie.title}
                        </h3>
                    </div>
                    {(serie.author || serie.theme) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                            {serie.author || serie.theme}
                        </p>
                    )}
                    {/* Stats de la série */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        {serie.seasonsCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {serie.seasonsCount} {serie.seasonsCount > 1 ? 'saisons' : 'saison'}
                            </span>
                        )}
                        {serie.episodesCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {serie.episodesCount} {serie.episodesCount > 1 ? 'épisodes' : 'épisode'}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Bouton d'action */}
                <button
                    className="p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex-shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSelect();
                    }}
                    title="Voir les détails"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        );
    }

    // Variant poster
    return (
        <div onClick={handleSelect} className="flex-shrink-0 w-24 sm:w-32 md:w-40 lg:w-44 xl:w-48 space-y-1.5 sm:space-y-2 cursor-pointer group">
            <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl overflow-hidden shadow-xl transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:-translate-y-2">
                <img
                    src={serie.imageUrl}
                    alt={serie.title}
                    className="w-full h-full object-cover relative z-0 transition-transform duration-700 group-hover:scale-110"
                />
                <div
                    onClick={handleSelect}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 cursor-pointer"
                >
                        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30 shadow-xl">
                            <svg className="w-3.5 sm:w-5 sm:h-5 h-3.5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-medium">Voir détails</span>
                        </div>
                </div>
            </div>
            {/* Stats sous le poster */}
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {serie.seasonsCount !== undefined && (
                    <span className="flex items-center gap-1" title="Saisons">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {serie.seasonsCount}
                    </span>
                )}
                {serie.episodesCount !== undefined && (
                    <span className="flex items-center gap-1" title="Épisodes">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {serie.episodesCount}
                    </span>
                )}
            </div>
            {serie.author && <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs truncate">{serie.author}</p>}
        </div>
    );
};

const SeriesScreen: React.FC<SeriesScreenProps> = ({ onSelectMedia, onPlay }) => {
    const navigate = useNavigate();
    const { t, theme, language } = useAppContext();
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
            console.warn(`⚠️ Recalcul des stats pour la série ${serie.uid_serie}...`);
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
            totalDuration: serie.totalDuration ? formatDuration(serie.totalDuration) : undefined
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

    // Charger les séries depuis Firestore avec leurs stats
    useEffect(() => {
        const loadSeries = async () => {
            setLoading(true);
            try {
                let seriesData: Serie[];
                if (selectedCategoryId) {
                    // Charger les séries de la catégorie sélectionnée
                    seriesData = await serieCategoryService.getSeriesByCategory(selectedCategoryId);
                } else {
                    // Charger toutes les séries
                    seriesData = await serieService.getAllSeriesOnly();
                }
                // Charger les stats pour chaque série (en parallèle mais avec limite pour éviter la surcharge)
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
    }, [selectedCategoryId]);

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

    // Filtrer et trier les séries
    const filteredAndSortedSeries = useMemo(() => {
        let filtered = [...series];

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
                case 'newest':
                    return b.title.localeCompare(a.title);
                case 'oldest':
                    return a.title.localeCompare(b.title);
                case 'seasons':
                    return (b.seasonsCount || 0) - (a.seasonsCount || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [series, searchTerm, sortOption]);

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

                    {/* Contrôles: Filtres, Tri, Vue */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Menu de tri */}
                        <div className="relative">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                className="appearance-none bg-white dark:bg-black border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 pr-8 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all duration-200"
                            >
                                <option value="title">{t('sortByTitle') || 'Trier par titre'}</option>
                                <option value="newest">{t('sortByNewest') || 'Plus récentes'}</option>
                                <option value="oldest">{t('sortByOldest') || 'Plus anciennes'}</option>
                                <option value="seasons">{t('sortBySeasons') || 'Plus de saisons'}</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Toggle vue Grille/Liste */}
                        <div className="ml-auto flex items-center gap-2 bg-white dark:bg-black border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded transition-all duration-200 ${
                                    viewMode === 'grid'
                                        ? 'bg-gray-200 dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-md'
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
                                        ? 'bg-gray-200 dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-md'
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

                    {/* Filtre par catégorie */}
                    {categories.length > 0 && (
                        <div className="pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Catégories:</span>
                                <button
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('category');
                                        setSearchParams(newParams);
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        selectedCategoryId === null
                                            ? 'bg-amber-500 text-gray-900'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Toutes
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            const newParams = new URLSearchParams(searchParams);
                                            newParams.set('category', category.id);
                                            setSearchParams(newParams);
                                        }}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                            selectedCategoryId === category.id
                                                ? 'bg-amber-500 text-gray-900'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: category.color || '#3B82F6' }}
                                        />
                                        {getCategoryName(category, language)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Légende des icônes de stats */}
                    <div className="pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium">{t('seriesScreenLegends') || 'Légendes'}:</span>
                            <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{t('seasons') || "Saisons"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>{t('episodes') || "Épisodes"}</span>
                            </div>
                        </div>
                    </div>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                                {filteredAndSortedSeries.map((serie) => (
                                    <SeriesCard
                                        key={serie.id}
                                        serie={serie}
                                        variant="poster"
                                        onSelect={onSelectMedia}
                                        onPlay={onPlay}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="relative space-y-2 z-0">
                                {filteredAndSortedSeries.map((serie) => (
                                    <SeriesCard
                                        key={serie.id}
                                        serie={serie}
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

export default SeriesScreen;
