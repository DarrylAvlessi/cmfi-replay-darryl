import React from 'react';
import { MediaContent, MediaType } from '../../types';
import { Serie } from '../../lib/db';
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
        <div className="py-6 md:py-8">
            <div className="px-4 md:px-6 lg:px-8 mb-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-600 to-sky-400" />
                        <h3 className="rail-title text-2xl md:text-[1.85rem] text-slate-900 dark:text-white">
                            {t('podcastsTitle') || 'Podcasts'}
                        </h3>
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigateToCategory(MediaType.Podcast);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600/10 dark:bg-sky-500/10 border border-blue-500/20 text-xs md:text-sm text-blue-600 dark:text-sky-400 hover:bg-blue-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-slate-950 font-semibold transition-all"
                    >
                        {t('viewAll') || 'Voir plus'} →
                    </button>
                </div>
            </div>
            <div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
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
