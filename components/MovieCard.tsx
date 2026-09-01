import React from 'react';
import { MediaContent } from '../types';
import { PlayIcon, InfoIcon } from './icons';
import { useAppContext } from '../context/AppContext';

interface MovieCardProps {
  movie: MediaContent;
  variant?: 'poster' | 'list';
  onSelect: (item: MediaContent) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, variant = 'poster', onSelect }) => {
  const { t } = useAppContext();
  const { title, imageUrl, author, progress } = movie;
  const handleSelect = () => onSelect(movie);
  const handleInfo = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(movie);
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
        <div className="relative w-16 h-24 md:w-20 md:h-28 lg:w-24 lg:h-32 bg-gray-200 dark:bg-black rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110" 
          />
          {/* Badge durée (style YouTube) */}
          {movie.duration && (
            <div className="absolute bottom-1 right-1 z-20 bg-black/80 text-white text-[10px] leading-tight px-1.5 py-0.5 rounded font-medium">
              {movie.duration}
            </div>
          )}
          {/* Overlay au hover */}
          <div
            onClick={handleInfo}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
              <InfoIcon className="w-6 h-6 text-gray-900 ml-0.5" />
            </div>
          </div>
        </div>
        
        {/* Informations */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white break-words group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
              {title}
            </h3>
          </div>
          {(author || movie.theme) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
              {author || movie.theme}
            </p>
          )}
        </div>
        
        {/* Bouton d'action */}
        <button 
          className="p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex-shrink-0" 
          onClick={(e) => {
            e.stopPropagation();
            handleInfo(e);
          }}
        >
          <InfoIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Variant poster optimisé pour une grille responsive
  return (
    <div onClick={handleSelect} className="w-full space-y-1.5 sm:space-y-2 cursor-pointer group hover:z-20">
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl overflow-hidden shadow-xl border-2 border-transparent group-hover:border-amber-500/60 dark:group-hover:border-amber-500/60 transition-all duration-200 ease-out group-hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.6)] group-hover:-translate-y-1">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover relative z-0 transition-transform duration-500 group-hover:scale-105"
        />
        <div
          onClick={handleInfo}
          className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out z-10 cursor-pointer p-3"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white/95 rounded-full shadow-xl">
            <PlayIcon className="w-5 h-5 text-gray-900" />
            <span className="text-gray-900 text-sm font-bold">{t('play') || 'Regarder'}</span>
          </div>
          <h3 className="mt-3 text-white font-bold text-xs sm:text-sm text-center leading-tight break-words line-clamp-2">
            {title}
          </h3>
          {movie.duration && (
            <div className="flex items-center gap-1 text-white/80 text-[10px] sm:text-xs mt-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{movie.duration}</span>
            </div>
          )}
        </div>
        {/* Barre de progression si présente */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {author && <p className="text-gray-500 dark:text-gray-400 text-[9px] sm:text-[10px] truncate">{author}</p>}
    </div>
  );
};

export default MovieCard;
