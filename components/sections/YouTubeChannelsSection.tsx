import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeasonSerie } from '../../lib/db';
import { splitSeasonsBySource } from '../../lib/youtubeApi';
import { YOUTUBE_SERIE_UID } from '../../lib/firestore/youtubeAdmin';
import { ChannelSeasonCard, PlaylistSeasonCard } from '../YouTubeSeasonCards';

interface YouTubeChannelsSectionProps {
    seasons: SeasonSerie[];
    channelsLabel: string;
    playlistsLabel: string;
    /** (count) => "12 épisode(s)" — parent composes with its own i18n. */
    episodesCountLabel: (count: number) => string;
    /** "Chaîne" / "Playlist" eyebrow per card. */
    channelEyebrow: string;
    playlistEyebrow: string;
    seeAllLabel: string;
}

/** Max cards per home rail; overflow goes behind "See all". */
const RAIL_LIMIT = 6;

function SourceRail({
    title,
    seasons,
    kind,
    episodesCountLabel,
    eyebrow,
    seeAllLabel,
    onOpen,
    onSeeAll,
}: {
    title: string;
    seasons: SeasonSerie[];
    kind: 'channel' | 'playlist';
    episodesCountLabel: (count: number) => string;
    eyebrow: string;
    seeAllLabel: string;
    onOpen: (uidSeason: string) => void;
    onSeeAll: () => void;
}) {
    if (seasons.length === 0) return null;
    const Card = kind === 'channel' ? ChannelSeasonCard : PlaylistSeasonCard;
    const width = kind === 'channel' ? 'w-36 md:w-44' : 'w-48 md:w-64';
    return (
        <div className="mt-4 first:mt-0">
            <div className="px-4 md:px-6 lg:px-8 mb-3 flex items-center justify-between">
                <h4 className="text-base md:text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {title}
                </h4>
                {seasons.length > RAIL_LIMIT && (
                    <button
                        onClick={onSeeAll}
                        className="text-sm md:text-base text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold transition-colors"
                    >
                        {seeAllLabel} →
                    </button>
                )}
            </div>
            <div className="flex space-x-2 md:space-x-4 lg:space-x-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide pt-1 pb-4">
                {seasons.slice(0, RAIL_LIMIT).map((season) => (
                    <div key={season.uid_season} className={`flex-shrink-0 flex ${width}`}>
                        <Card
                            title={season.title_season}
                            imageUrl={season.poster_path || season.backdrop_path}
                            subtitle={`${eyebrow} • ${episodesCountLabel(season.nb_episodes || 0)}`}
                            episodeCount={season.nb_episodes || 0}
                            onSelect={() => onOpen(season.uid_season)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * "Channels & Playlists" block for Home: channels as avatars, playlists in
 * the usual YouTube 16:9 stacked format. Click deep-links to
 * /production/youtube?season=… (preselected source).
 */
const YouTubeChannelsSection: React.FC<YouTubeChannelsSectionProps> = React.memo(({
    seasons,
    channelsLabel,
    playlistsLabel,
    episodesCountLabel,
    channelEyebrow,
    playlistEyebrow,
    seeAllLabel,
}) => {
    const navigate = useNavigate();
    const { channels, playlists } = useMemo(() => splitSeasonsBySource(seasons), [seasons]);

    if (seasons.length === 0) return null;

    const openSeason = (uidSeason: string) => {
        navigate(`/production/${YOUTUBE_SERIE_UID}?season=${encodeURIComponent(uidSeason)}`);
    };

    /** "See all" → production page with this source preselected (via remembered filter). */
    const seeAllSource = (kind: 'channel' | 'playlist') => {
        try {
            window.localStorage.setItem('yt-source-filter', kind);
        } catch {
            // Ignore persistence failures (private mode).
        }
        navigate(`/production/${YOUTUBE_SERIE_UID}`);
    };

    return (
        <div className="py-6 md:py-8 lg:py-10 mt-4 md:mt-6">
            <SourceRail title={channelsLabel} seasons={channels} kind="channel" episodesCountLabel={episodesCountLabel} eyebrow={channelEyebrow} seeAllLabel={seeAllLabel} onOpen={openSeason} onSeeAll={() => seeAllSource('channel')} />
            <SourceRail title={playlistsLabel} seasons={playlists} kind="playlist" episodesCountLabel={episodesCountLabel} eyebrow={playlistEyebrow} seeAllLabel={seeAllLabel} onOpen={openSeason} onSeeAll={() => seeAllSource('playlist')} />
        </div>
    );
});

export default YouTubeChannelsSection;
