import React from 'react';
import { MediaContent, MediaType } from '../../types';
import { Serie } from '../../lib/firestore';
import MediaCard from '../MediaCard';
import { transformSerieToMediaContent } from '../../utils/mediaTransformers';

interface PodcastsSectionProps {
    podcasts: Serie[];
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    navigateToCategory: (type: MediaType) => void;
    t: (key: string) => string;
}

const PodcastsSection: React.FC<PodcastsSectionProps> = React.memo(({
    podcasts,
    onSelectMedia,
    onPlay,
    navigateToCategory,
    t
}) => {
    if (podcasts.length === 0) return null;

    return (
        <div className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
            <div className="px-4 md:px-6 lg:px-8 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('podcastsTitle') || 'Podcasts'}
                    </h3>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToCategory(MediaType.Podcast);
                        }}
                        className="text-sm md:text-base text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
                    >
                        {t('viewAll') || 'Voir plus'} →
                    </button>
                </div>
            </div>
            <div className="flex space-x-2 md:space-x-4 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                {podcasts.map((podcast) => (
                    <div key={podcast.uid_serie} className="flex-shrink-0">
                        <MediaCard
                            item={transformSerieToMediaContent(podcast, MediaType.Podcast)}
                            variant="poster"
                            onSelect={onSelectMedia}
                            onPlay={onPlay}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

export default PodcastsSection;
