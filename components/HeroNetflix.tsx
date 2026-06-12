import React, { useState, useEffect } from 'react';
import { MediaContent, MediaType } from '../types';
import { PlayIcon, PlusIcon, CheckIcon, InfoIcon } from './icons';
import { useAppContext } from '../context/AppContext';
import { movieService, Movie } from '../lib/db';

interface HeroNetflixProps {
  items?: MediaContent[];
  onSelectMedia: (item: MediaContent) => void;
  onPlay: (item: MediaContent) => void;
}

const HeroNetflix: React.FC<HeroNetflixProps> = ({ items: propItems, onSelectMedia, onPlay }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, bookmarkedIds, toggleBookmark } = useAppContext();

  // Récupérer les films populaires
  useEffect(() => {
    const fetchPopularMovies = async () => {
      try {
        const popularMovies = await movieService.getPopularMovies(10);
        setMovies(popularMovies);
      } catch (error) {
        console.error('Error fetching popular movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularMovies();
  }, []);

  const items = movies.length > 0 ? movies.map(movie => ({
    id: movie.uid,
    title: movie.title,
    theme: movie.original_language,
    imageUrl: movie.backdrop_path || movie.picture_path,
    type: MediaType.Movie,
    duration: movie.runtime_h_m,
    description: movie.overview,
    video_path_hd: movie.video_path_hd,
    languages: [movie.original_language],
  })) : propItems || [];

  useEffect(() => {
    if (!items || items.length <= 1 || isPaused) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentIndex, items, isPaused]);

  if (loading || !items || items.length === 0) {
    return (
      <div className="relative w-full h-[85vh] md:h-[90vh] bg-black flex items-center justify-center">
        <div className="text-white text-lg">{t('loading') || 'Chargement...'}</div>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const isBookmarked = bookmarkedIds.includes(currentItem.id);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const handlePlay = () => {
    onPlay(currentItem);
  };

  const handleBookmark = () => {
    toggleBookmark(
      currentItem.id,
      currentItem.title,
      currentItem.description || '',
      currentItem.imageUrl || '',
      false
    );
  };

  return (
    <div className="relative w-full h-[85vh] md:h-[90vh] bg-black overflow-hidden group">
      {/* Image de fond avec gradient Netflix */}
      <div className="absolute inset-0">
        <img
          key={currentItem.id}
          src={currentItem.imageUrl}
          alt={currentItem.title}
          className="w-full h-full object-cover transition-opacity duration-1000"
        />
        {/* Gradient overlay style Netflix */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-transparent" />
      </div>

      {/* Contenu principal - Layout Netflix */}
      <div className="relative z-10 h-full flex items-end pb-16 md:pb-24 lg:pb-32">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 w-full">
          <div className="max-w-2xl lg:max-w-3xl">
            {/* Titre principal - Style Netflix */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 md:mb-6 leading-tight drop-shadow-2xl">
              {currentItem.title}
            </h1>

            {/* Description */}
            {currentItem.description && (
              <p className="text-white/90 text-sm md:text-base lg:text-lg leading-relaxed mb-6 md:mb-8 line-clamp-3 md:line-clamp-4 drop-shadow-lg max-w-xl">
                {currentItem.description}
              </p>
            )}

            {/* Boutons d'action - Style Netflix */}
            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={handlePlay}
                className="group flex items-center gap-2 md:gap-3 px-6 md:px-8 py-2.5 md:py-3.5 bg-white hover:bg-white/90 text-black font-bold rounded text-sm md:text-base transition-all duration-200 hover:scale-105 shadow-lg"
              >
                <PlayIcon className="w-5 h-5 md:w-6 md:h-6" />
                <span>{t('play') || 'Lecture'}</span>
              </button>

              <button
                onClick={handleBookmark}
                className="group flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded text-sm md:text-base border border-white/30 transition-all duration-200 hover:scale-105"
                aria-label={isBookmarked ? 'Retirer de Ma liste' : 'Ajouter à Ma liste'}
              >
                {isBookmarked ? (
                  <>
                    <CheckIcon className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="hidden md:inline">Ma liste</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="hidden md:inline">Ma liste</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onSelectMedia(currentItem)}
                className="group p-2.5 md:p-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full border border-white/30 transition-all duration-200 hover:scale-110"
                aria-label="Plus d'infos"
              >
                <InfoIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles de navigation */}
      {items.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
            aria-label="Précédent"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handleNext}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100"
            aria-label="Suivant"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicateurs de carrousel - Style Netflix */}
      {items.length > 1 && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-1.5 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Aller à la slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroNetflix;

