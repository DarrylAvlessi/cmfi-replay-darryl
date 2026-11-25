import React from 'react';
import { MediaContent, MediaType } from '../../types';
import { Movie } from '../../lib/db';
import MediaCard from '../MediaCard';
import { transformMovieToMediaContent } from '../../utils/mediaTransformers';

interface MoviesSectionProps {
    movies: Movie[];
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent) => void;
    navigateToCategory: (type: MediaType) => void;
    t: (key: string) => string;
}

const MoviesSection: React.FC<MoviesSectionProps> = React.memo(({
    movies,
    onSelectMedia,
    onPlay,
    navigateToCategory,
    t
}) => {
    if (movies.length === 0) return null;

    return (
        <div className="py-6 md:py-8">
            <div className="px-4 md:px-6 lg:px-8 mb-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-1 h-7 rounded-full bg-gradient-to-b from-blue-600 to-sky-400" />
                        <h3 className="rail-title text-2xl md:text-[1.85rem] text-slate-900 dark:text-white">
                            {t('films') || 'Documentaries'}
                        </h3>
                    </div>
                    <button
                        onClick={() => navigateToCategory(MediaType.Movie)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600/10 dark:bg-sky-500/10 border border-blue-500/20 text-xs md:text-sm text-blue-600 dark:text-sky-400 hover:bg-blue-600 hover:text-white dark:hover:bg-sky-500 dark:hover:text-slate-950 font-semibold transition-all"
                    >
                        {t('viewAll') || 'Voir plus'} →
                    </button>
                </div>
            </div>
            <div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pb-4">
                {movies.map((movie) => (
                    <div key={movie.uid} className="flex-shrink-0">
                        <MediaCard
                            item={transformMovieToMediaContent(movie)}
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

export default MoviesSection;
