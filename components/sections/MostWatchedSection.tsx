import React from 'react';
import { MediaContent } from '../../types';
import MediaCard from '../MediaCard';

interface MostWatchedSectionProps {
    items: Array<{ content: MediaContent; likeCount: number; viewCount: number }>;
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    loading: boolean;
    t: (key: string) => string;
}

const MostWatchedSection: React.FC<MostWatchedSectionProps> = React.memo(({
    items,
    onSelectMedia,
    onPlay,
    loading,
    t
}) => {
    if (loading) {
        return (
            <div className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
                <div className="px-4 md:px-6 lg:px-8 mb-6">
                    <div className="h-8 w-64 bg-gray-200 dark:bg-black rounded animate-pulse"></div>
                </div>
<div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-28 md:w-48 lg:w-52">
                            <div className="aspect-[2/3] bg-gray-200 dark:bg-black rounded animate-pulse mb-3"></div>
                            <div className="h-4 w-3/4 bg-gray-200 dark:bg-black rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
            <div className="px-4 md:px-6 lg:px-8 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('mostWatched') || 'Les plus regardés'}
                    </h3>
                </div>
            </div>
            <div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                {items.slice(0, 10).map((item, index) => (
                    <div key={item.content.id} className="flex-shrink-0">
                        <MediaCard
                            item={item.content}
                            variant="poster"
                            onSelect={onSelectMedia}
                            onPlay={onPlay}
                            rank={index + 1}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

export default MostWatchedSection;
