// components/HistorySection.tsx

import React from 'react';
import { ContinueWatchingItem } from '../lib/db';
import { PlayIcon } from './icons';

interface HistoryCardProps {
    item: ContinueWatchingItem;
    onClick: () => void;
}

export const HistoryCard: React.FC<HistoryCardProps> = React.memo(({ item, onClick }) => {
    return (
        <div className="h-full flex flex-col">
            <div
                role="button"
                tabIndex={0}
                onClick={onClick}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onClick();
                    }
                }}
                className="broadcast-card relative flex flex-1 flex-col overflow-hidden rounded-2xl text-left shadow-md transition-all duration-300 hover:-translate-y-0.5 group"
            >
                {/* Image container */}
                <div className="relative w-full aspect-video overflow-hidden">
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                    />

                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex h-14 w-14 scale-95 items-center justify-center rounded-2xl bg-blue-600/90 shadow-lg shadow-blue-600/25 transition-transform duration-300 group-hover:scale-110 dark:bg-sky-500/90">
                            <PlayIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-950/60">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                </div>

                {/* Info container */}
                <div className="flex flex-1 flex-col p-3.5">
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                    </h3>
                    {item.type === 'episode' && item.episodeTitle && (
                        <p className="line-clamp-1 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-medium text-blue-600 dark:text-sky-400">Ép. {item.episodeNumber}</span> • {item.episodeTitle}
                        </p>
                    )}
                    {item.lastWatched && (
                        <p className="mt-1 font-mono-meta text-[10px] text-slate-500 dark:text-slate-400">
                            Vu le {new Date(item.lastWatched).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
});

interface HistorySectionProps {
    items: ContinueWatchingItem[];
    onItemClick: (item: ContinueWatchingItem) => void;
    title?: string;
    showViewAll?: boolean;
    onViewAll?: () => void;
    isLoading?: boolean;
}

const HistorySection: React.FC<HistorySectionProps> = ({
    items,
    onItemClick,
    title = 'Mon historique',
    showViewAll = false,
    onViewAll,
    isLoading = false
}) => {
    if (items.length === 0 && !isLoading) {
        return null;
    }

    return (
        <section className="px-3 py-3 lg:px-0 lg:py-4">
            <div className="flex items-center justify-between mb-2 lg:mb-3">
                <h3 className="font-display text-base font-bold text-slate-900 lg:text-xl dark:text-white">
                    {title}
                </h3>
                {showViewAll && onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="group flex items-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                        Voir tout
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="relative overflow-hidden">
                    <div 
                        className="overflow-x-auto pb-3 lg:pb-6 -mx-2 scrollbar-none"
                        style={{
                            scrollBehavior: 'smooth',
                            WebkitOverflowScrolling: 'touch',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                        }}
                    >
                        <div className="flex space-x-3 lg:space-x-4 px-2 py-1">
                            {isLoading ? (
                                // Skeleton loaders
                                [...Array(5)].map((_, i) => (
                                    <div 
                                        key={`skeleton-${i}`} 
                                        className="flex-none w-40 sm:w-56 md:w-64 lg:w-72 xl:w-80 2xl:w-96"
                                    >
                                        <div className="h-full flex flex-col">
                                            <div className="relative aspect-video animate-shimmer overflow-hidden rounded-2xl bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 bg-[length:200%_100%] dark:from-slate-900 dark:via-slate-700 dark:to-slate-900">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 animate-pulse" />
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-300 dark:bg-slate-700">
                                                    <div className="h-full w-1/2 bg-blue-500/50 dark:bg-sky-400/50" />
                                                </div>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Contenu réel
                                items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="flex-none w-40 sm:w-56 md:w-64 lg:w-72 xl:w-80 2xl:w-96 transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        <HistoryCard
                                            item={item}
                                            onClick={() => onItemClick(item)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
        </section>
    );
};

export default HistorySection;
