import React from 'react';
import { MediaContent, MediaType } from '../types';
import { PlayIcon } from './icons';

interface MediaCardProps {
  item: MediaContent;
  variant?: 'poster' | 'thumbnail' | 'list';
  onSelect?: (item: MediaContent) => void;
  onPlay?: (item: MediaContent) => void;
}

const MediaCard: React.FC<MediaCardProps> = React.memo(({ item, variant = 'thumbnail', onSelect, onPlay }) => {
  const { title, imageUrl, author, progress, type, is_premium, premium_text } = item;
  const handleSelect = () => onSelect && onSelect(item);
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay && onPlay(item);
  };

  // Icône couronne pour le badge premium
  const CrownIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
    >
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  );

  if (variant === 'poster') {
    return (
      <div onClick={handleSelect} className="flex-shrink-0 w-28 md:w-48 space-y-2.5 cursor-pointer group relative">
        <div className={`relative aspect-[2/3] rounded-2xl overflow-hidden transition-colors duration-300 group-hover:border-blue-500 dark:group-hover:border-blue-400 ${
          is_premium ? 'ring-2 ring-amber-400/60' : ''
        }`}>
          {/* Fond qui prolonge l'image avec effet de flou */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src={imageUrl} 
              alt={title} 
              className="w-full h-full object-cover blur-xl scale-110 opacity-30 dark:opacity-20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-gray-900/20 to-gray-900/30 dark:from-black/60 dark:via-black/30 dark:to-black/40"></div>
          </div>
          
          {is_premium && (
            <>
              {/* Badge Premium */}
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/90 border border-amber-400/50 backdrop-blur-sm">
                <CrownIcon />
                <span className="text-xs font-semibold text-amber-300">Premium</span>
              </div>
            </>
          )}
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105" 
            loading="lazy"
          />
          <div
            onClick={handlePlay}
            className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 transition-transform duration-300 group-hover:scale-110">
              <PlayIcon className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
            </div>
          </div>
        </div>
        <h3 className="text-gray-900 dark:text-white text-sm font-serif font-bold break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{title}</h3>
        {author && <p className="text-gray-500 dark:text-gray-400 text-xs break-words">{author}</p>}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div 
        onClick={handleSelect} 
        className={`group relative flex items-center gap-5 p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-900/50 ${
          is_premium ? 'ring-1 ring-amber-400/30' : ''
        }`}
      >
        {/* Ligne de gradient au hover */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Image avec aspect ratio cinématique */}
        <div className={`relative w-28 h-20 md:w-36 md:h-24 lg:w-40 lg:h-28 bg-gray-200 dark:bg-black rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105 ${
          is_premium ? 'ring-1 ring-amber-400/50' : ''
        }`}>
          {is_premium && (
            <div className="absolute top-1.5 right-1.5 z-20 p-1 bg-black/85 backdrop-blur-sm rounded-md">
              <CrownIcon />
            </div>
          )}
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110" 
            loading="lazy"
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
            {is_premium && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black flex-shrink-0">
                <CrownIcon />
                <span>PREMIUM</span>
              </span>
            )}
          </div>
          {(author || item.theme) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
              {author || item.theme}
            </p>
          )}
          {item.duration && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{item.duration}</span>
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

  // Default variant: 'thumbnail'
  return (
    <div onClick={handleSelect} className="flex-shrink-0 w-44 md:w-80 space-y-2.5 cursor-pointer group relative">
      <div className={`relative aspect-video bg-gray-300 dark:bg-gray-700 rounded-2xl overflow-hidden ${
        is_premium ? 'ring-2 ring-amber-400/60' : ''
      }`}>
        {is_premium && (
          <>
            {/* Effet de brillance animé sur la bordure */}
            <div className="absolute inset-0 z-0 rounded-lg md:rounded-xl pointer-events-none">
              <div className="absolute inset-0 rounded-lg md:rounded-xl border-2 border-transparent bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 opacity-50 animate-pulse"></div>
            </div>
            {/* Badge Premium Content avec icône couronne */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/90 border border-amber-400/60 backdrop-blur-sm">
              <CrownIcon />
              <span className="text-sm font-semibold bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
                Premium Content
              </span>
            </div>
          </>
        )}
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110" 
          loading="lazy"
        />
        <div
          onClick={handlePlay}
          className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 transition-transform duration-300 group-hover:scale-110">
            <PlayIcon className="w-10 h-10 md:w-12 md:h-12 text-white ml-1" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 w-full h-1.5 md:h-2 bg-black/50 z-20">
            <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
      <h3 className="text-gray-900 dark:text-white font-serif font-bold break-words group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">{title}</h3>
      {author && <p className="text-gray-500 dark:text-gray-400 text-sm break-words">{author}</p>}
    </div>
  );
});

export default MediaCard;