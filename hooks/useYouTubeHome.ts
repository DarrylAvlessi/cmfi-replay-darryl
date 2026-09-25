import { useQuery } from '@tanstack/react-query';
import type { SeasonSerie } from '../lib/db';
import { getYoutubeSeasons } from '../lib/firestore/youtubeAdmin';

const YOUTUBE_HOME_KEY = 'youtube-home';

/** YouTube seasons (channels + playlists), ordered by season_number. */
export function useYouTubeHomeSeasons() {
    return useQuery<SeasonSerie[]>({
        queryKey: [YOUTUBE_HOME_KEY, 'seasons'],
        queryFn: () => getYoutubeSeasons(),
        staleTime: 10 * 60 * 1000,
    });
}
