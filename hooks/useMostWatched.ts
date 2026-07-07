import { useQuery } from '@tanstack/react-query';
import { viewService, movieService, episodeSerieService } from '../lib/db';
import { MediaContent, MediaType } from '../types';

interface WatchedItem {
    content: MediaContent;
    likeCount: number;
    viewCount: number;
}

export function useMostWatchedItems(limitCount: number = 10) {
    const watchedItemsQuery = useQuery({
        queryKey: ['watched', 'most', limitCount],
        queryFn: () => viewService.getMostWatchedItems(limitCount),
    });

    const watchedItems = watchedItemsQuery.data || [];

    const movieUids = watchedItems
        .filter((item: any) => item.type === 'movie')
        .map((item: any) => item.uid);

    const episodeUids = watchedItems
        .filter((item: any) => item.type === 'episode')
        .map((item: any) => item.uid);

    const batchMoviesQuery = useQuery({
        queryKey: ['movies', 'batch', 'watched', movieUids.sort()],
        queryFn: () => movieService.getMoviesByUids(movieUids),
        enabled: movieUids.length > 0,
    });

    const batchEpisodesQuery = useQuery({
        queryKey: ['episodes', 'batch', 'watched', episodeUids.sort()],
        queryFn: () => episodeSerieService.getEpisodesByUids(episodeUids),
        enabled: episodeUids.length > 0,
    });

    const isLoading = watchedItemsQuery.isLoading || batchMoviesQuery.isLoading || batchEpisodesQuery.isLoading;
    const error = watchedItemsQuery.error || batchMoviesQuery.error || batchEpisodesQuery.error;

    if (!watchedItemsQuery.data) {
        return { data: [], isLoading, error };
    }

    const moviesMap = batchMoviesQuery.data || new Map();
    const episodesMap = batchEpisodesQuery.data || new Map();

    const items: WatchedItem[] = [];

    for (const item of watchedItems) {
        if (item.type === 'movie') {
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
                    likeCount: item.viewCount,
                    viewCount: item.viewCount,
                });
            }
        } else {
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
                    likeCount: item.viewCount,
                    viewCount: item.viewCount,
                });
            }
        }
    }

    return { data: items, isLoading, error: error || null };
}
