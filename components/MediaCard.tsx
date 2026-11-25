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
  1: 'bg-gradient-to-br from-blue-600 to-sky-400 text-white shadow-blue-600/40',
  2: 'bg-slate-200 text-slate-900 shadow-slate-400/30',
  3: 'bg-sky-800 text-sky-100 shadow-sky-900/40',
};

const MediaCard: React.FC<MediaCardProps> = ({ item, variant = 'thumbnail', onSelect, onPlay, rank }) => {
  const { t } = useAppContext();
  const { title, imageUrl, author, progress, duration } = item;
  const handleSelect = () => onSelect && onSelect(item);
  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay && onPlay(item);
  };

  const commonRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2';

  if (variant === 'poster') {
    return (
      <div
        onClick={handleSelect}
        className={`flex-shrink-0 w-34 md:w-48 lg:w-52 space-y-2.5 cursor-pointer group relative ${commonRing}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(); }}
      >
        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-slate-200 dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800 group-hover:border-blue-500/60 dark:group-hover:border-sky-400/60 shadow-md group-hover:shadow-xl group-hover:shadow-blue-600/15 transition-all duration-300 group-hover:-translate-y-1">
          <div className="absolute inset-0 w-full h-full">
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover blur-xl scale-110 opacity-25 dark:opacity-30"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-slate-950/30" />
          </div>

          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {rank !== undefined && (
            <div
              className={`absolute top-2.5 left-2.5 z-20 w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center font-mono-meta text-xs md:text-sm font-bold shadow-lg ${rank <= 3 ? rankBadge[rank] : 'bg-slate-950/80 text-white border border-white/15'
                }`}
            >
              {rank}
            </div>
          )}

          {duration && (
            <div className="absolute bottom-2.5 right-2.5 z-20 px-2 py-0.5 bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-md font-mono-meta text-[10px] md:text-[11px] text-slate-100 font-medium">
              {duration}
            </div>
          )}

          {progress !== undefined && (
            <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2 py-1 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-md font-mono-meta text-[10px] text-slate-200 font-medium leading-none">
              <div className="w-6 md:w-8 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{Math.round(100 - progress)}% {t('remaining') || 'left'}</span>
            </div>
          )}

          <div
            onClick={handlePlay}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPlay && onPlay(item); } }}
            className="absolute inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            tabIndex={0}
            role="button"
            aria-label={`Play ${title}`}
          >
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-xl shadow-blue-600/40 transition-transform duration-300 group-hover:scale-110">
              <PlayIcon className="w-6 h-6 md:w-7 md:h-7 text-white ml-0.5" />
            </div>
          </div>
        </div>

        <h3 className="text-slate-900 dark:text-slate-100 text-sm font-display font-semibold leading-snug break-words line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
          {title}
        </h3>
        {author && <p className="text-slate-500 dark:text-slate-400 text-xs break-words line-clamp-1">{author}</p>}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div
        onClick={handleSelect}
        className={`group relative flex items-center gap-4 p-3 md:p-4 rounded-2xl broadcast-card cursor-pointer overflow-hidden ${commonRing}`}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(); }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative w-28 h-20 md:w-36 md:h-24 bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div
            onClick={handlePlay}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPlay && onPlay(item); } }}
            className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            tabIndex={0}
            role="button"
            aria-label={`Play ${title}`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-lg">
              <PlayIcon className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-display font-bold text-slate-900 dark:text-white break-words line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
            {title}
          </h3>
          {(author || item.theme) && (
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
              {author || item.theme}
            </p>
          )}
          {duration && (
            <div className="flex items-center gap-1.5 text-xs font-mono-meta text-slate-400 mt-1.5">
              <span>{duration}</span>
            </div>
          )}
        </div>

        <button
          className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-md shadow-blue-600/20 hover:scale-105 transition-all duration-200 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handlePlay(e);
          }}
          aria-label={`Play ${title}`}
        >
          <PlayIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Default: thumbnail variant
  return (
    <div
      onClick={handleSelect}
      className={`flex-shrink-0 w-48 md:w-72 lg:w-80 space-y-2.5 cursor-pointer group relative ${commonRing}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(); }}
    >
      <div className="relative aspect-video bg-slate-200 dark:bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 group-hover:border-blue-500/60 dark:group-hover:border-sky-400/60 shadow-md group-hover:shadow-xl group-hover:shadow-blue-600/15 transition-all duration-300 group-hover:-translate-y-1">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div
          onClick={handlePlay}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onPlay && onPlay(item); } }}
          className="absolute inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
          tabIndex={0}
          role="button"
          aria-label={`Play ${title}`}
        >
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-xl shadow-blue-600/40 transition-transform duration-300 group-hover:scale-110">
            <PlayIcon className="w-6 h-6 md:w-7 md:h-7 text-white ml-0.5" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-slate-950/70 z-20">
            <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <h3 className="text-slate-900 dark:text-slate-100 font-display font-semibold leading-snug break-words line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
        {title}
      </h3>
      {author && <p className="text-slate-500 dark:text-slate-400 text-xs break-words line-clamp-1">{author}</p>}
    </div>
  );
};

export default MediaCard;
