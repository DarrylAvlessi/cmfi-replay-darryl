// components/HistorySection.tsx

import React from 'react';
import { ContinueWatchingItem } from '../lib/firestore';
import { PlayIcon } from './icons';

interface HistoryCardProps {
    item: ContinueWatchingItem;
    onClick: () => void;
}

export const HistoryCard: React.FC<HistoryCardProps> = React.memo(({ item, onClick }) => {
    return (
        <div className="h-full flex flex-col">
            <div 
                onClick={onClick}
                className="relative flex-1 flex flex-col rounded-xl overflow-hidden bg-[#f5f5f5] dark:bg-gray-900/70 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-amber-500/30 group"
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
                        <div className="w-14 h-14 rounded-full bg-amber-500/90 flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:scale-110">
                            <PlayIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700/80">
                        <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                </div>

                {/* Info container */}
                <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                        {item.title}
                    </h3>
                    {item.type === 'episode' && item.episodeTitle && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                            <span className="font-medium text-amber-600 dark:text-amber-500">Ép. {item.episodeNumber}</span> • {item.episodeTitle}
                        </p>
                    )}
                    {item.lastWatched && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
        <section className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h3>
                {showViewAll && onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="flex items-center text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-sm transition-colors group"
                    >
                        Voir tout
                        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="border border-gray-200 dark:border-black rounded-lg overflow-hidden">

                <div className="relative group overflow-hidden">
                    <div 
                        className="overflow-x-auto pb-6 -mx-2 scrollbar-none"
                        style={{
                            scrollBehavior: 'smooth',
                            WebkitOverflowScrolling: 'touch',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                        }}
                    >
                        <div className="flex space-x-4 px-2 py-1">
                            {isLoading ? (
                                // Skeleton loaders
                                [...Array(5)].map((_, i) => (
                                    <div 
                                        key={`skeleton-${i}`} 
                                        className="flex-none w-48 sm:w-56 md:w-64 lg:w-72 xl:w-80 2xl:w-96"
                                    >
                                        <div className="h-full flex flex-col">
                                            <div className="relative aspect-video bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-black dark:via-gray-700 dark:to-black rounded-lg overflow-hidden animate-shimmer bg-[length:200%_100%]">
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 animate-pulse" />
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-300 dark:bg-gray-700">
                                                    <div className="h-full bg-gray-400 dark:bg-gray-600 w-1/2" />
                                                </div>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // Contenu réel
                                items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="flex-none w-48 sm:w-56 md:w-64 lg:w-72 xl:w-80 2xl:w-96 transition-all duration-300 hover:scale-[1.02]"
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
            </div>
        </section>
    );
};

export default HistorySection;

