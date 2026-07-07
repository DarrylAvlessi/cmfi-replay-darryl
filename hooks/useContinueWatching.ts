import { useQuery } from '@tanstack/react-query';
import { statsVuesService, ContinueWatchingItem } from '../lib/db';

export function useContinueWatching(userUid: string | undefined, limitCount: number = 10) {
    return useQuery<ContinueWatchingItem[]>({
        queryKey: ['continueWatching', userUid, limitCount],
        queryFn: () => statsVuesService.getContinueWatching(userUid!, limitCount),
        enabled: !!userUid,
        staleTime: 60 * 1000,
    });
}
