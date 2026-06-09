import React from 'react';
import { MediaContent } from '../types';
import { PlayIcon } from './icons';
import { useAppContext } from '../context/AppContext';

interface MediaCardProps {
  item: MediaContent;
  variant?: 'poster' | 'thumbnail' | 'list';
  onSelect?: (item: MediaContent) => void;
  onPlay?: (item: MediaContent) => void;
  rank?: number;
}

const rankBadge: Record<number, string> = {
  1: 'bg-amber-400 text-white shadow-amber-400/40',
  2: 'bg-gray-300 text-gray-800 shadow-gray-300/40',
  3: 'bg-amber-700 text-white shadow-amber-700/40',
};

const MediaCard: React.FC<MediaCardProps> = ({ item, variant = 'thumbnail', onSelect, onPlay, rank }) => {
  const { t } = useAppContext();
  const { title, imageUrl, author, progress, duration } = item;
  const handleSelect = () => onSelect && onSelect(item);
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay && onPlay(item);
  };

  const commonRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

  if (variant === 'poster') {
    return (
      <div
        onClick={handleSelect}
        className={`flex-shrink-0 w-28 md:w-48 lg:w-56 space-y-2.5 cursor-pointer group relative ${commonRing}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(); }}
      >
        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border-2 border-gray-200/80 dark:border-gray-700/80 transition-colors duration-300 group-hover:border-amber-500 dark:group-hover:border-amber-400">
          {/* Focus blur background */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover blur-xl scale-110 opacity-30 dark:opacity-20"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-gray-900/20 to-gray-900/30 dark:from-black/60 dark:via-black/30 dark:to-black/40"></div>
          </div>

          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Rank badge */}
          {rank !== undefined && (
            <div
              className={`absolute top-2 left-2 z-20 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold shadow-lg ${
                rank <= 3 ? rankBadge[rank] : 'bg-black/60 text-white'
              }`}
            >
              {rank}
            </div>
          )}

          {/* Duration badge */}
          {duration && (
            <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] md:text-xs text-white/90 font-medium">
              {duration}
            </div>
          )}

          {/* Progress pill */}
          {progress !== undefined && (
            <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] md:text-xs text-white/80 font-medium leading-none">
              <div className="w-6 md:w-8 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{Math.round(100 - progress)}% {t('remaining') || 'left'}</span>
            </div>
          )}

          {/* Hover play overlay */}
          <div
            onClick={handlePlay}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPlay && onPlay(item); } }}
            className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
            tabIndex={0}
            role="button"
            aria-label={`Play ${title}`}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 transition-transform duration-300 group-hover:scale-110">
              <PlayIcon className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
            </div>
          </div>
        </div>

        <h3 className="text-gray-900 dark:text-white text-sm font-serif font-bold break-words line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
          {title}
        </h3>
        {author && <p className="text-gray-500 dark:text-gray-400 text-xs break-words line-clamp-1">{author}</p>}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div
        onClick={handleSelect}
        className={`group relative flex items-center gap-5 p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-900/50 border-2 border-gray-200/80 dark:border-gray-700/80 hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-colors duration-300 ${commonRing}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(); }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative w-28 h-20 md:w-36 md:h-24 lg:w-40 lg:h-28 bg-gray-200 dark:bg-black rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105 border-2 border-gray-200/80 dark:border-gray-700/80">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div
            onClick={handlePlay}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPlay && onPlay(item); } }}
            className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            tabIndex={0}
            role="button"
            aria-label={`Play ${title}`}
          >
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
              <PlayIcon className="w-6 h-6 text-gray-900 ml-0.5" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white break-words line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
              {title}
            </h3>
          </div>
          {(author || item.theme) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
              {author || item.theme}
            </p>
          )}
          {duration && (
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{duration}</span>
            </div>
          )}
        </div>

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

  // Default: thumbnail variant
  return (
    <div
      onClick={handleSelect}
      className={`flex-shrink-0 w-44 md:w-72 lg:w-80 space-y-2.5 cursor-pointer group relative ${commonRing}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(); }}
    >
      <div className="relative aspect-video bg-gray-300 dark:bg-gray-700 rounded-2xl overflow-hidden border-2 border-gray-200/80 dark:border-gray-700/80 transition-colors duration-300 group-hover:border-amber-500 dark:group-hover:border-amber-400">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div
          onClick={handlePlay}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPlay && onPlay(item); } }}
          className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500"
          tabIndex={0}
          role="button"
          aria-label={`Play ${title}`}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/40 transition-transform duration-300 group-hover:scale-110">
            <PlayIcon className="w-10 h-10 md:w-12 md:h-12 text-white ml-1" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 w-full h-1.5 md:h-2 bg-black/50 z-20">
            <div className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <h3 className="text-gray-900 dark:text-white font-serif font-bold break-words line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">{title}</h3>
      {author && <p className="text-gray-500 dark:text-gray-400 text-sm break-words line-clamp-1">{author}</p>}
    </div>
  );
};

export default MediaCard;
