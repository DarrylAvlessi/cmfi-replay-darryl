import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { SearchIcon } from '../components/icons';
import { HelpIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { useTutorial } from '../context/TutorialContext';
import { searchService, SearchResult } from '../lib/db';
import { Movie, Serie, SeasonSerie, EpisodeSerie } from '../lib/db';

interface SearchScreenProps {
  onNavigate: (screen: string, data?: any) => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'movie' | 'serie' | 'podcast' | 'season' | 'episode'>('all');
  const { t } = useAppContext();
  const { startTour } = useTutorial();
  const [searchParams] = useSearchParams();

  // Lire le paramètre ?q= de l'URL au montage et à chaque changement d'URL
  useEffect(() => {
    const queryParam = searchParams.get('q');
    setSearchTerm(queryParam || '');
  }, [searchParams]);

  // Debounce la recherche pour éviter trop de requêtes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch(searchTerm);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, selectedFilter]);

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      let searchResults: SearchResult[];

      if (selectedFilter === 'all') {
        searchResults = await searchService.searchAll(term);
      } else {
        searchResults = await searchService.searchByType(term, selectedFilter);
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'movie':
        // Naviguer vers l'écran de détails du film
        onNavigate('movieDetail', { uid: result.uid });
        break;
      case 'serie':
      case 'podcast':
        // Naviguer vers l'écran de détails de la série
        onNavigate('serieDetail', { uid_serie: result.uid_serie });
        break;
      case 'season':
        // Naviguer vers l'écran de détails de la saison
        onNavigate('seasonDetail', {
          uid_serie: result.uid_serie,
          uid_season: result.uid_season
        });
        break;
      case 'episode':
        // Naviguer vers le lecteur d'épisode
        onNavigate('episodePlayer', { uid_episode: result.uid_episode });
        break;
    }
  };

  const getTypeLabel = (type: SearchResult['type']): string => {
    const labels = {
      movie: t('categoryMovies') || 'Documentaire',
      serie: t('categorySeries') || 'Production',
      podcast: t('categoryPodcasts') || 'Podcast',
      season: t('season') || 'Saison',
      episode: t('episode') || 'Épisode'
    };
    return labels[type];
  };

  const getTypeBadgeColor = (type: SearchResult['type']): string => {
    const colors = {
      movie: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      serie: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      podcast: 'bg-green-500/20 text-green-400 border-green-500/30',
      season: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      episode: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
    };
    return colors[type];
  };

  const filters: Array<{ value: typeof selectedFilter; label: string }> = [
    { value: 'all', label: t('all') || 'Tout' },
    { value: 'movie', label: t('categoryMovies') || 'Documentaires' },
    { value: 'serie', label: t('categorySeries') || 'Productions' },
    { value: 'podcast', label: t('categoryPodcasts') || 'Podcasts' },
    { value: 'season', label: t('season') || 'Saison' },
    { value: 'episode', label: t('episode') || 'Épisode' }
  ];

  return (
    <div className="min-h-screen broadcast-canvas pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-600 to-sky-400" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {t('searchScreenTitle')}
            </h1>
          </div>
          <button
            onClick={() => startTour('search')}
            className="p-2.5 rounded-xl broadcast-panel text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
            aria-label={t('startTour')}
          >
            <HelpIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de recherche & Filtres */}
        <div className="p-3.5 rounded-2xl broadcast-panel sticky top-16 z-10 mb-6 space-y-3">
          <div className="relative">
            <input
              type="text"
              data-tour="search-input"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <SearchIcon className="w-5 h-5 text-slate-400" />
            </div>
            {isLoading && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-sky-400" />
              </div>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" data-tour="search-filters">
            {filters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${selectedFilter === filter.value
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Résultats */}
        <div>
          {searchTerm && (
            <h3 className="text-sm font-mono-meta uppercase tracking-wider mb-4 text-slate-500 dark:text-slate-400">
              {results.length > 0
                ? `${t('resultsFor', { term: searchTerm })} (${results.length} ${results.length === 1 ? t('result') : t('results')})`
                : !isLoading && t('noResultsFor', { term: searchTerm })
              }
            </h3>
          )}

          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="broadcast-card rounded-2xl overflow-hidden cursor-pointer group"
              >
                <div className="flex gap-4 p-3.5">
                  <div className="flex-shrink-0 w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt={result.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2796%27 height=%27144%27%3E%3Crect fill=%27%231e293b%27 width=%2796%27 height=%27144%27/%3E%3Ctext fill=%27%2394a3b8%27 font-family=%27sans-serif%27 font-size=%2712%27 text-anchor=%27middle%27 x=%2748%27 y=%2776%27%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <SearchIcon className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-display font-bold text-base text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                        {result.title}
                      </h4>
                      <span className={`text-[11px] font-mono-meta font-semibold px-2.5 py-0.5 rounded-lg border flex-shrink-0 ${getTypeBadgeColor(result.type)}`}>
                        {getTypeLabel(result.type)}
                      </span>
                    </div>

                    {result.serieTitle && (
                      <p className="text-xs font-mono-meta text-sky-600 dark:text-sky-400 mb-1.5">
                        {getTypeLabel(result.type)} {result.seasonNumber && ` · Saison ${result.seasonNumber}`}
                        {result.episodeNumber && ` · Épisode ${result.episodeNumber}`}
                      </p>
                    )}

                    {result.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!searchTerm && !isLoading && (
            <div className="text-center py-16 broadcast-panel rounded-3xl">
              <SearchIcon className="w-12 h-12 text-blue-500/40 dark:text-sky-400/40 mx-auto mb-3" />
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-1">
                {t('noSearchTerm')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('searchPlaceholder')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchScreen;