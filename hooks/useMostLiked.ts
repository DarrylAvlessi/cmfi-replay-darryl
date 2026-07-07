import { useQuery } from '@tanstack/react-query';
import { likeService, movieService, episodeSerieService } from '../lib/db';
import { MediaContent, MediaType } from '../types';

interface LikedItem {
    content: MediaContent;
    likeCount: number;
    viewCount?: number;
}

export function useMostLikedItems(limitCount: number = 10) {
    const likedItemsQuery = useQuery({
        queryKey: ['liked', 'most', limitCount],
        queryFn: () => likeService.getMostLikedItems(limitCount),
    });

    const likedItems = likedItemsQuery.data || [];

    const movieUids = likedItems
        .filter((item) => !item.isEpisode)
        .map((item) => item.uid);

    const episodeUids = likedItems
        .filter((item) => item.isEpisode)
        .map((item) => item.uid);

    const batchMoviesQuery = useQuery({
        queryKey: ['movies', 'batch', movieUids.sort()],
        queryFn: () => movieService.getMoviesByUids(movieUids),
        enabled: movieUids.length > 0,
    });

    const batchEpisodesQuery = useQuery({
        queryKey: ['episodes', 'batch', episodeUids.sort()],
        queryFn: () => episodeSerieService.getEpisodesByUids(episodeUids),
        enabled: episodeUids.length > 0,
    });

    const isLoading = likedItemsQuery.isLoading || batchMoviesQuery.isLoading || batchEpisodesQuery.isLoading;
    const error = likedItemsQuery.error || batchMoviesQuery.error || batchEpisodesQuery.error;

    if (!likedItemsQuery.data) {
        return { data: [], isLoading, error };
    }

    const moviesMap = batchMoviesQuery.data || new Map();
    const episodesMap = batchEpisodesQuery.data || new Map();

    const items: LikedItem[] = [];

    for (const item of likedItems) {
        const movie = moviesMap.get(item.uid);
        if (movie && !movie.hidden) {
            items.push({
                content: {
                    id: movie.uid,
                    type: MediaType.Movie,
                    title: movie.title,
                    author: undefined,
                    theme: '',
                    imageUrl: movie.picture_path || movie.backdrop_path || movie.poster_path,
                    duration: movie.runtime_h_m,
                    description: movie.overview,
                    languages: [movie.original_language],
                    video_path_hd: movie.video_path_hd,
                } as MediaContent,
                likeCount: item.likeCount,
            });
            continue;
        }
        const episode = episodesMap.get(item.uid);
        if (episode && !episode.hidden) {
            items.push({
                content: {
                    id: episode.uid_episode,
                    type: MediaType.Series,
                    title: episode.title,
                    author: episode.title_serie,
                    theme: '',
                    imageUrl: episode.backdrop_path || episode.picture_path,
                    duration: episode.runtime_h_m,
                    description: episode.overviewFr || episode.overview,
                    languages: [],
                    video_path_hd: episode.video_path_hd,
                } as MediaContent,
                likeCount: item.likeCount,
            });
        }
    }

    return { data: items, isLoading, error: error || null };
}
