import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { SearchIcon } from '../components/icons';
import { useAppContext } from '../context/AppContext';
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
    <div className="min-h-screen bg-white dark:bg-black pb-20">

      {/* Titre de la page */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('searchScreenTitle')}</h1>
      </div>

      {/* Barre de recherche */}
      <div className="px-4 py-2 sticky top-0 bg-white dark:bg-black z-10">
        <div className="relative">
          <input
            type="text"
            placeholder={t('searchPlaceholder') || 'Rechercher...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700 rounded-full py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="w-5 h-5 text-gray-500" />
          </div>
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
            </div>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mt-2 mb-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedFilter === filter.value
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-gray-200 dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Résultats */}
      <div className="px-4 py-2">
        {searchTerm && (
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
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
              className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-black rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-all cursor-pointer group"
            >
              <div className="flex gap-3 p-3">
                {/* Image */}
                <div className="flex-shrink-0 w-24 h-36 rounded-lg overflow-hidden bg-gray-200 dark:bg-black">
                  {result.imageUrl ? (
                    <img
                      src={result.imageUrl}
                      alt={result.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2796%27 height=%27144%27%3E%3Crect fill=%27%23e5e7eb%27 width=%2796%27 height=%27144%27/%3E%3Ctext fill=%27%239ca3af%27 font-family=%27sans-serif%27 font-size=%2712%27 text-anchor=%27middle%27 x=%2748%27 y=%2776%27%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <SearchIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-amber-500 transition-colors">
                      {result.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getTypeBadgeColor(result.type)}`}>
                      {getTypeLabel(result.type)}
                    </span>
                  </div>

                  {/* Informations supplémentaires */}
                  {result.serieTitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {getTypeLabel(result.type)} {result.seasonNumber && ` - Saison ${result.seasonNumber}`}
                      {result.episodeNumber && ` - Épisode ${result.episodeNumber}`}
                    </p>
                  )}

                  {/* Description */}
                  {result.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {result.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message d'aide initial */}
        {!searchTerm && !isLoading && (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('noSearchTerm')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('searchPlaceholder')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;