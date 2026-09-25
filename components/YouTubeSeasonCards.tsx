// components/YouTubeSeasonCards.tsx
// Shared season cards: channels as avatars, playlists in the usual YouTube
// 16:9 stacked format. Used by Home (YouTubeChannelsSection) and the admin
// seasons grid (ManageYouTubeScreen step 2) for visual consistency.

import React, { ReactNode } from 'react';

export interface SeasonCardProps {
    title: string;
    imageUrl: string;
    /** e.g. "Chaîne • 12 épisode(s)" — parent composes with its own i18n. */
    subtitle: string;
    /** Episode count shown in the playlist overlay badge. */
    episodeCount: number;
    selected?: boolean;
    onSelect?: () => void;
    /** Top-right slot (e.g. admin delete button). */
    action?: ReactNode;
}

function cardFrame(selected: boolean | undefined, clickable: boolean): string {
    // h-full: in flex rails the wrapper stretches to the tallest card, so all
    // cards in a rail share the tallest height. (Grid layouts stretch already.)
    // No translate lift on hover: these cards sit right under rail headers, so
    // moving up would overlap the title — border + shadow feedback only.
    return `relative text-left w-full h-full p-3 rounded-2xl border transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
        selected
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15'
            : clickable
                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 cursor-pointer hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50'
    }`;
}

function initialsOf(title: string): string {
    const words = title.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

/** Channel season: round avatar (YouTube @handle style) + name. */
export const ChannelSeasonCard: React.FC<SeasonCardProps> = ({
    title,
    imageUrl,
    subtitle,
    selected,
    onSelect,
    action,
}) => (
    <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cardFrame(selected, !!onSelect)}
    >
        {action && <span className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>{action}</span>}
        <span className="flex flex-col items-start gap-2">
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 bg-gray-200 dark:bg-gray-700"
                />
            ) : (
                <span className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-xl font-black ring-2 ring-gray-200 dark:ring-gray-700">
                    {initialsOf(title)}
                </span>
            )}
            <span className="min-w-0 w-full">
                <span className="block font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                    {title}
                </span>
                <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {subtitle}
                </span>
            </span>
        </span>
    </button>
);

/** Playlist season: usual YouTube 16:9 thumbnail with stacked effect + count overlay. */
export const PlaylistSeasonCard: React.FC<SeasonCardProps> = ({
    title,
    imageUrl,
    subtitle,
    episodeCount,
    selected,
    onSelect,
    action,
}) => (
    <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cardFrame(selected, !!onSelect)}
    >
        {action && <span className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>{action}</span>}
        <span className="block">
            <span className="relative block">
                {/* Stacked-playlist effect (à la youtube.com/playlists). */}
                <span aria-hidden className="absolute inset-x-3 -bottom-1.5 h-3 rounded-b-xl bg-gray-300/70 dark:bg-gray-700/70" />
                <span aria-hidden className="absolute inset-x-1.5 -bottom-0.5 h-3 rounded-b-xl bg-gray-300/50 dark:bg-gray-700/50" />
                <span className="relative block aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {imageUrl && (
                        <img src={imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute right-0 top-0 bottom-0 w-14 md:w-16 bg-black/70 flex flex-col items-center justify-center gap-1 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                        <span className="text-xs font-bold tabular-nums">{episodeCount}</span>
                    </span>
                </span>
            </span>
            <span className="block mt-2 min-w-0">
                <span className="block font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
                    {title}
                </span>
                <span className="block mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {subtitle}
                </span>
            </span>
        </span>
    </button>
);
