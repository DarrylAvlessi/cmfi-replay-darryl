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
        className="group relative flex items-center gap-4 p-3.5 md:p-4 rounded-2xl broadcast-card cursor-pointer overflow-hidden"
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative w-16 h-24 md:w-20 md:h-28 bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-105"
          />
          {movie.duration && (
            <div className="absolute bottom-1 right-1 z-20 bg-slate-950/85 text-white font-mono-meta text-[10px] leading-tight px-1.5 py-0.5 rounded">
              {movie.duration}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-display font-bold text-slate-900 dark:text-white break-words group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
            {title}
          </h3>
          {(author || movie.theme) && (
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
              {author || movie.theme}
            </p>
          )}
        </div>

        <button
          className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400 hover:bg-blue-600 hover:text-white transition-all duration-200 flex-shrink-0"
          onClick={handleInfo}
          aria-label={t('moreInfo')}
        >
          <InfoIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div onClick={handleSelect} className="w-full space-y-2 cursor-pointer group">
      <div className="relative aspect-[2/3] bg-slate-200 dark:bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 group-hover:border-blue-500/60 dark:group-hover:border-sky-400/60 shadow-md group-hover:shadow-xl group-hover:shadow-blue-600/15 transition-all duration-300 group-hover:-translate-y-1">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover relative z-0 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {movie.duration && (
          <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-md bg-slate-950/75 backdrop-blur-sm border border-white/10 font-mono-meta text-[10px] text-white">
            {movie.duration}
          </div>
        )}
        <div
          onClick={handleInfo}
          className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 p-3"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl shadow-xl">
            <PlayIcon className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-bold">{t('play')}</span>
          </div>
          <h3 className="mt-3 text-white font-display font-bold text-xs sm:text-sm text-center leading-tight break-words line-clamp-2">
            {title}
          </h3>
        </div>
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/70 z-20">
            <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <h3 className="text-xs sm:text-sm font-display font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
        {title}
      </h3>
      {author && <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs truncate">{author}</p>}
    </div>
  );
};

export default MovieCard;
