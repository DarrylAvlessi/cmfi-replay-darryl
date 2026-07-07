import { useQuery } from '@tanstack/react-query';
import { serieCategoryService, SerieCategory, serieService, Serie } from '../lib/db';

const CATEGORIES_QUERY_KEY = 'categories';

export function useCategories() {
    return useQuery<SerieCategory[]>({
        queryKey: [CATEGORIES_QUERY_KEY, 'all'],
        queryFn: () => serieCategoryService.getAllCategories(),
    });
}

export function useSeriesByCategories(categories: SerieCategory[]) {
    return useQuery<Record<string, Serie[]>>({
        queryKey: [CATEGORIES_QUERY_KEY, 'seriesByCategory', categories.map(c => c.id).sort()],
        queryFn: async () => {
            const catResults = await Promise.all(
                categories.map(cat =>
                    serieCategoryService.getSeriesByCategory(cat.id)
                        .then(series => ({ catId: cat.id, series }))
                )
            );
            const seriesByCat: Record<string, Serie[]> = {};
            for (const { catId, series } of catResults) {
                if (series.length > 0) seriesByCat[catId] = series;
            }
            return seriesByCat;
        },
        enabled: categories.length > 0,
    });
}
