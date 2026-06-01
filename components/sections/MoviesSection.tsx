import React from 'react';
import { MediaContent, MediaType } from '../../types';
import { Movie } from '../../lib/firestore';
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
        <div className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
            <div className="px-4 md:px-6 lg:px-8 mb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        {t('films') || 'Documentaries'}
                    </h3>
                    <button
                        onClick={() => navigateToCategory(MediaType.Movie)}
                        className="text-sm md:text-base text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold transition-colors"
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
