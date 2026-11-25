import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { serieService, Serie, seasonSerieService, episodeSerieService, serieCategoryService, SerieCategory, getCategoryName } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';
import ScrollReveal from '../components/ScrollReveal';
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
        <div className="min-h-screen broadcast-canvas animate-fadeIn pb-12 lg:flex">
            {/* Filter Panel */}
            <aside className="bg-white/80 dark:bg-[#080d1a]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 lg:w-72 lg:flex-shrink-0 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                <div className="px-4 md:px-5 py-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
                            aria-label={t('back')}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/5 text-blue-600 dark:border-sky-400/15 dark:bg-sky-400/5 dark:text-sky-400 lg:hidden">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="16" rx="3" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h8M8 13h8M8 17h4" />
                            </svg>
                        </span>
                        <h1 className="font-display text-2xl font-bold text-slate-900 lg:hidden dark:text-white">
                            {t('seriesScreenTitle') || 'Productions'}
                        </h1>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-500 sm:text-sm lg:hidden dark:text-slate-400">
                        {t('categorySeriesDescription')}
                    </p>

                    <div className="relative">
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

                    <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                        <div className="relative flex-1 min-w-0">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as SortOption)}
                                className="appearance-none bg-transparent border-0 w-full text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
                            >
                                <option value="title">{t('sortByTitle') || 'Titre (A-Z)'}</option>
                                <option value="seasons">{t('sortBySeasons') || 'Plus de saisons'}</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === 'grid'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-label={t('gridView')}
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${
                                    viewMode === 'list'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                                aria-label={t('listView')}
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {categories.length > 0 && (
                        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800">
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-nowrap items-center lg:flex-col lg:overflow-x-visible lg:items-stretch">
                                <span className="hidden lg:block text-[11px] font-mono-meta font-semibold uppercase tracking-widest text-slate-400 mb-1">
                                    {t('browseCategories')}
                                </span>
                                <button
                                    onClick={() => {
                                        const newParams = new URLSearchParams(searchParams);
                                        newParams.delete('category');
                                        setSearchParams(newParams);
                                    }}
                                    className={`flex-shrink-0 whitespace-nowrap lg:w-full lg:whitespace-normal px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left flex items-center justify-between ${
                                        selectedCategoryId === null
                                            ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/20'
                                            : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                    }`}
                                    aria-pressed={selectedCategoryId === null}
                                >
                                    <span>{t('all')}</span>
                                    <span className="font-mono-meta text-xs opacity-80 ml-2">{series.length}</span>
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        onClick={() => {
                                            const newParams = new URLSearchParams(searchParams);
                                            newParams.set('category', category.id);
                                            setSearchParams(newParams);
                                        }}
                                        className={`flex-shrink-0 whitespace-nowrap lg:w-full lg:whitespace-normal px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                                            selectedCategoryId === category.id
                                                ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/20 font-semibold'
                                                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                                        }`}
                                        aria-pressed={selectedCategoryId === category.id}
                                    >
                                        <span
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: category.color || '#27A7DE' }}
                                        />
                                        <span className="truncate">{getCategoryName(category, language)}</span>
                                        <span className="font-mono-meta text-xs opacity-70 ml-auto">{categoryCounts[category.id] || 0}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Contenu principal */}
            <main className="flex-1 min-w-0">
                <div className="relative px-4 md:px-6 lg:px-8 pt-6 z-10">
                <header className="broadcast-panel relative mb-6 hidden overflow-hidden rounded-3xl p-6 lg:block">
                    <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl dark:bg-sky-400/10" />
                    <div className="relative flex items-end justify-between gap-6">
                        <div>
                            <p className="mb-2 font-mono-meta text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400">{t('browseCategories')}</p>
                            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {t('seriesScreenTitle') || 'Productions'}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {t('categorySeriesDescription')}
                            </p>
                        </div>
                        {!loading && (
                            <div className="shrink-0 rounded-2xl border border-blue-500/15 bg-blue-500/5 px-4 py-3 text-right dark:border-sky-400/15 dark:bg-sky-400/5">
                                <p className="font-mono-meta text-2xl font-bold text-blue-700 dark:text-sky-300">{filteredAndSortedSeries.length}</p>
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('seriesScreenTitle')}</p>
                            </div>
                        )}
                    </div>
                </header>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-11 w-11 border-2 border-slate-700 border-t-sky-400 mx-auto" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading') || 'Chargement...'}</p>
                        </div>
                    </div>
                ) : filteredAndSortedSeries.length === 0 ? (
                    <div className="text-center py-20 broadcast-panel rounded-3xl">
                        <div className="max-w-md mx-auto space-y-4 px-4">
                            <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                            <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                                 {searchTerm ? t('noSearchResults') || 'Aucun résultat' : t('noSeries') || 'No productions found'}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {searchTerm
                                    ? t('tryDifferentSearch') || 'Essayez une autre recherche'
                                     : t('noSeriesAvailable') || 'No productions available'}
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
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-5">
                            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <button onClick={handleBack} className="hover:text-blue-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1">
                                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                                    <span>{t('home') || 'Home'}</span>
                                </button>
                                <span>/</span>
                                <span className="text-slate-900 dark:text-white font-semibold">{t('seriesScreenTitle') || 'Productions'}</span>
                            </div>

                            <p className="text-xs font-mono-meta text-slate-500 dark:text-slate-400">
                                {filteredAndSortedSeries.length} {filteredAndSortedSeries.length > 1 ? t('series') || 'productions' : t('serie') || 'production'}
                                {searchTerm && ` • "${searchTerm}"`}
                            </p>
                        </div>

                        {viewMode === 'grid' ? (
                            <ScrollReveal>
                                <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 z-0">
                                    {filteredAndSortedSeries.map((serie, index) => (
                                        <div
                                            key={serie.id}
                                            className="animate-fadeIn"
                                            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
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
                            </ScrollReveal>
                        ) : (
                            <ScrollReveal>
                                <div className="relative space-y-3 z-0">
                                    {filteredAndSortedSeries.map((serie, index) => (
                                        <div
                                            key={serie.id}
                                            className="animate-fadeIn"
                                            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
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
                            </ScrollReveal>
                        )}
                    </>
                )}
                </div>
            </main>
        </div>
    );
};

export default SeriesScreen;
