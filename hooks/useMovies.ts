import { useQuery } from '@tanstack/react-query';
import { movieService, Movie } from '../lib/db';

const MOVIES_QUERY_KEY = 'movies';

export function useTenHomeMovies() {
    return useQuery<Movie[]>({
        queryKey: [MOVIES_QUERY_KEY, 'home'],
        queryFn: () => movieService.getTenHomeMovies(),
    });
}

export function useMoviesByUids(uids: string[]) {
    return useQuery<Map<string, Movie>>({
        queryKey: [MOVIES_QUERY_KEY, 'batch', [...uids].sort()],
        queryFn: () => movieService.getMoviesByUids(uids),
        enabled: uids.length > 0,
    });
}

export function usePopularMovies(limitCount: number = 10) {
    return useQuery<Movie[]>({
        queryKey: [MOVIES_QUERY_KEY, 'popular', limitCount],
        queryFn: () => movieService.getPopularMovies(limitCount),
    });
}

export function useTrendingMovies(limitCount: number = 10) {
    return useQuery<Movie[]>({
        queryKey: [MOVIES_QUERY_KEY, 'trending', limitCount],
        queryFn: () => movieService.getTrendingMovies(limitCount),
    });
}

export function useMovieByUid(uid: string | undefined) {
    return useQuery<Movie | null>({
        queryKey: [MOVIES_QUERY_KEY, 'detail', uid],
        queryFn: () => movieService.getMovieByUid(uid!),
        enabled: !!uid,
    });
}
