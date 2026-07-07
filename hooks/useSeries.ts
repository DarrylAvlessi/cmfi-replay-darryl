import { useQuery } from '@tanstack/react-query';
import { serieService, Serie } from '../lib/db';

const SERIES_QUERY_KEY = 'series';

export function useTenHomeSeries() {
    return useQuery<Serie[]>({
        queryKey: [SERIES_QUERY_KEY, 'home'],
        queryFn: () => serieService.getTenHomeSeries(),
    });
}

export function useTenHomePodcasts() {
    return useQuery<Serie[]>({
        queryKey: [SERIES_QUERY_KEY, 'homePodcasts'],
        queryFn: () => serieService.getTenHomePodcasts(),
    });
}
