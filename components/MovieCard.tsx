import React from 'react';
import { MediaContent } from '../types';
import { PlayIcon } from './icons';

interface MovieCardProps {
  movie: MediaContent;
  variant?: 'poster' | 'list';
  onSelect: (item: MediaContent) => void;
  onPlay: (item: MediaContent) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, variant = 'poster', onSelect, onPlay }) => {
  const { title, imageUrl, author, progress } = movie;
  const handleSelect = () => onSelect(movie);
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(movie);
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
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110" 
          />
          {/* Overlay au hover */}
          <div
            onClick={handlePlay}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
              <PlayIcon className="w-6 h-6 text-gray-900 ml-0.5" />
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
          {movie.duration && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{movie.duration}</span>
            </div>
          )}
        </div>
        
        {/* Bouton d'action */}
        <button 
          className="p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex-shrink-0" 
          onClick={(e) => {
            e.stopPropagation();
            handlePlay(e);
          }}
        >
          <PlayIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Variant poster optimisé pour 4 cartes par ligne sur mobile
  return (
    <div onClick={handleSelect} className="flex-shrink-0 w-24 sm:w-32 md:w-40 lg:w-44 xl:w-48 space-y-1.5 sm:space-y-2 cursor-pointer group">
      <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl overflow-hidden shadow-xl transform transition-all duration-500 border-2 border-transparent group-hover:border-amber-500/60 dark:group-hover:border-amber-500/60 group-hover:scale-105 group-hover:shadow-2xl group-hover:-translate-y-2">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover relative z-0 transition-transform duration-700 group-hover:scale-110"
        />
        <div
          onClick={handlePlay}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 transition-transform duration-300 group-hover:scale-110">
            <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white ml-1" />
          </div>
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
