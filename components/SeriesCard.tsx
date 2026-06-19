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

const SeriesCard: React.FC<SeriesCardProps> = ({ serie, variant = 'poster', onSelect, onPlay }) => {
    const { t } = useAppContext();
    const handleSelect = () => onSelect(serie);
    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(serie);
    };

    if (variant === 'list') {
        return (
            <div
                onClick={handleSelect}
                className="group relative flex items-center gap-5 p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-900/50 border border-gray-200/80 dark:border-black/80 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer overflow-hidden"
            >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative w-28 h-20 md:w-36 md:h-24 lg:w-40 lg:h-28 bg-gray-200 dark:bg-black rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-105">
                    <img
                        src={serie.imageUrl}
                        alt={serie.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div
                        onClick={handleSelect}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/95 rounded-lg shadow-xl">
                            <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-900 text-sm font-bold">{t('details')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-lg md:text-xl font-serif font-bold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                            {serie.title}
                        </h3>
                    </div>
                    {(serie.author || serie.theme) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                            {serie.author || serie.theme}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                        {serie.seasonsCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {serie.seasonsCount} {serie.seasonsCount > 1 ? 'saisons' : 'saison'}
                            </span>
                        )}
                        {serie.episodesCount !== undefined && (
                            <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {serie.episodesCount} {serie.episodesCount > 1 ? 'épisodes' : 'épisode'}
                            </span>
                        )}
                    </div>
                </div>

                <button
                    className="p-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex-shrink-0"
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
        <div onClick={handleSelect} className="w-full space-y-1.5 sm:space-y-2 cursor-pointer group hover:z-20">
            <div className="relative aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg md:rounded-xl overflow-hidden shadow-xl border-2 border-gray-200/80 dark:border-gray-700/80 group-hover:border-amber-500 dark:group-hover:border-amber-400 transform transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl group-hover:-translate-y-2">
                <img
                    src={serie.imageUrl}
                    alt={serie.title}
                    className="w-full h-full object-cover relative z-0 transition-transform duration-700 group-hover:scale-110"
                />
                <div
                    onClick={handleSelect}
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-10 cursor-pointer p-3"
                >
                    <h3 className="text-white font-bold text-xs sm:text-sm lg:text-sm xl:text-base text-center leading-tight mb-2 break-words">
                        {serie.title}
                    </h3>
                    {(serie.seasonsCount !== undefined || serie.episodesCount !== undefined) && (
                        <div className="flex flex-col items-center gap-0.5 text-white/80 text-[10px] sm:text-xs mb-3">
                            {serie.seasonsCount !== undefined && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>{serie.seasonsCount} {t(serie.seasonsCount > 1 ? 'seasonPlural' : 'seasonSingular')}</span>
                                </span>
                            )}
                            {serie.episodesCount !== undefined && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>{serie.episodesCount} {t(serie.episodesCount > 1 ? 'episodePlural' : 'episodeSingular')}</span>
                                </span>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-md rounded-lg border border-white/30 shadow-xl">
                        <svg className="w-3.5 sm:w-5 sm:h-5 h-3.5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-white text-[10px] sm:text-xs md:text-sm font-medium">{t('seeDetails')}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {serie.seasonsCount !== undefined && (
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>{serie.seasonsCount} {t(serie.seasonsCount > 1 ? 'seasonPlural' : 'seasonSingular')}</span>
                    </span>
                )}
                {serie.episodesCount !== undefined && (
                    <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{serie.episodesCount} {t(serie.episodesCount > 1 ? 'episodePlural' : 'episodeSingular')}</span>
                    </span>
                )}
            </div>
            {serie.author && <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs truncate">{serie.author}</p>}
        </div>
    );
};

export default SeriesCard;
