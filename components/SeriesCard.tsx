import React from 'react';
import { MediaContent } from '../types';
import { useAppContext } from '../context/AppContext';

export interface SerieWithStats extends MediaContent {
  seasonsCount?: number;
  episodesCount?: number;
  totalDuration?: string;
  categoryId?: string;
  backdropUrl?: string;
}

interface SeriesCardProps {
  serie: SerieWithStats;
  variant?: 'poster' | 'list';
  onSelect: (item: MediaContent) => void;
  onPlay: (item: MediaContent) => void;
}

const SeriesCard: React.FC<SeriesCardProps> = ({ serie, variant = 'poster', onSelect }) => {
  const { t } = useAppContext();
  const handleSelect = () => onSelect(serie);

  if (variant === 'list') {
    return (
      <div
        onClick={handleSelect}
        className="group relative flex items-center gap-4 p-3.5 md:p-4 rounded-2xl broadcast-card cursor-pointer overflow-hidden"
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-sky-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative w-28 h-20 md:w-36 md:h-24 bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
          <img
            src={serie.imageUrl}
            alt={serie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base md:text-lg font-display font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
            {serie.title}
          </h3>
          {(serie.author || serie.theme) && (
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {serie.author || serie.theme}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-meta text-slate-500 dark:text-slate-400 mt-1.5">
            {serie.seasonsCount !== undefined && (
              <span>{serie.seasonsCount} {serie.seasonsCount > 1 ? 'saisons' : 'saison'}</span>
            )}
            {serie.episodesCount !== undefined && (
              <span>• {serie.episodesCount} {serie.episodesCount > 1 ? 'épisodes' : 'épisode'}</span>
            )}
          </div>
        </div>

        <button
          className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-sky-500/15 dark:text-sky-400 hover:bg-blue-600 hover:text-white transition-all duration-200 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleSelect();
          }}
          title={t('seeDetails')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div onClick={handleSelect} className="w-full space-y-2 cursor-pointer group">
      <div className="relative aspect-[2/3] bg-slate-200 dark:bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 group-hover:border-blue-500/60 dark:group-hover:border-sky-400/60 shadow-md group-hover:shadow-xl group-hover:shadow-blue-600/15 transition-all duration-300 group-hover:-translate-y-1">
        <img
          src={serie.imageUrl}
          alt={serie.title}
          className="w-full h-full object-cover relative z-0 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div
          onClick={handleSelect}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 p-3"
        >
          <h3 className="text-white font-display font-bold text-xs sm:text-sm text-center leading-tight mb-2 break-words line-clamp-2">
            {serie.title}
          </h3>
          {(serie.seasonsCount !== undefined || serie.episodesCount !== undefined) && (
            <div className="flex flex-col items-center gap-0.5 text-sky-300 font-mono-meta text-[10px] sm:text-xs mb-3">
              {serie.seasonsCount !== undefined && (
                <span>{serie.seasonsCount} {t(serie.seasonsCount > 1 ? 'seasonPlural' : 'seasonSingular')}</span>
              )}
              {serie.episodesCount !== undefined && (
                <span>{serie.episodesCount} {t(serie.episodesCount > 1 ? 'episodePlural' : 'episodeSingular')}</span>
              )}
            </div>
          )}
          <div className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-sky-500 rounded-xl shadow-lg text-white text-xs font-semibold">
            {t('seeDetails')}
          </div>
        </div>
      </div>
      <h3 className="text-xs sm:text-sm font-display font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
        {serie.title}
      </h3>
      <div className="flex flex-wrap items-center gap-x-2 text-[10px] sm:text-xs font-mono-meta text-slate-500 dark:text-slate-400">
        {serie.seasonsCount !== undefined && (
          <span>{serie.seasonsCount} {t(serie.seasonsCount > 1 ? 'seasonPlural' : 'seasonSingular')}</span>
        )}
        {serie.episodesCount !== undefined && (
          <span>• {serie.episodesCount} {t(serie.episodesCount > 1 ? 'episodePlural' : 'episodeSingular')}</span>
        )}
      </div>
    </div>
  );
};

export default SeriesCard;
