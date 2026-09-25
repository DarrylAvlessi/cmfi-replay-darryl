// components/YouTubeSourcePicker.tsx
// Split picker for the "Youtube" production: channels (left) vs playlists (right).
// Purely presentational: the parent owns filtering + persistence.
// Visual language reuses the repo DS (rounded-2xl cards, amber active state,
// same tokens as the season dropdown + SeriesCard list variant).

import React from 'react';
import { CheckIcon } from './icons';

/** Picker tabs: custom seasons live under "playlist". */
export type YouTubePickerTab = 'channel' | 'playlist';

export interface YouTubeSourceGroup {
    seasons: { uid_season: string; title_season: string; poster_path: string; nb_episodes?: number }[];
    /** Up to 3 poster URLs for the preview strip. */
    previews: string[];
    /** Title of the most recently added season, for the subtitle. */
    latestTitle: string;
}

interface YouTubeSourcePickerProps {
    channels: YouTubeSourceGroup;
    playlists: YouTubeSourceGroup;
    selected: YouTubePickerTab;
    onSelect: (source: YouTubePickerTab) => void;
    channelsLabel: string;
    playlistsLabel: string;
    soonLabel: string;
    latestLabel: (name: string) => string;
    hint: string;
}

function SourceCard({
    source,
    group,
    title,
    icon,
    active,
    onSelect,
    soonLabel,
    latestLabel,
    circular,
}: {
    source: YouTubePickerTab;
    group: YouTubeSourceGroup;
    title: string;
    icon: React.ReactNode;
    active: boolean;
    onSelect: () => void;
    soonLabel: string;
    latestLabel: (name: string) => string;
    circular: boolean;
}) {
    const empty = group.seasons.length === 0;
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            disabled={empty}
            onClick={onSelect}
            className={`relative text-left p-4 rounded-2xl border transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                active
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15'
                    : empty
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 cursor-pointer hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-0.5'
            }`}
        >
            {active && (
                <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                </span>
            )}
            <span className="flex items-center gap-2.5">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${circular ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                    {icon}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">{title}</span>
                <span className="ml-auto mr-8 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
                    {group.seasons.length}
                </span>
            </span>
            <span className="flex items-center gap-0 mt-3 -space-x-3">
                {empty ? (
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                        {soonLabel}
                    </span>
                ) : (
                    <>
                        {group.previews.map((url, i) => (
                            url ? (
                                <img
                                    key={`${source}-${i}`}
                                    src={url}
                                    alt=""
                                    loading="lazy"
                                    className={circular
                                        ? 'w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700'
                                        : 'w-16 sm:w-20 aspect-video rounded-lg object-cover ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700'}
                                />
                            ) : (
                                <span
                                    key={`${source}-${i}`}
                                    className={circular
                                        ? 'w-8 sm:w-10 h-8 sm:h-10 rounded-full ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700'
                                        : 'w-16 sm:w-20 aspect-video rounded-lg ring-2 ring-white dark:ring-gray-900 bg-gray-200 dark:bg-gray-700'}
                                />
                            )
                        ))}
                        {group.seasons.length > group.previews.length && (
                            <span className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                +{group.seasons.length - group.previews.length}
                            </span>
                        )}
                    </>
                )}
            </span>
            {!empty && group.latestTitle && (
                <span className="block mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {latestLabel(group.latestTitle)}
                </span>
            )}
        </button>
    );
}

const YouTubeSourcePicker: React.FC<YouTubeSourcePickerProps> = ({
    channels,
    playlists,
    selected,
    onSelect,
    channelsLabel,
    playlistsLabel,
    soonLabel,
    latestLabel,
    hint,
}) => {
    return (
        <div className="space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">{hint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={hint}>
                <SourceCard
                    source="channel"
                    group={channels}
                    title={channelsLabel}
                    active={selected === 'channel'}
                    onSelect={() => onSelect('channel')}
                    soonLabel={soonLabel}
                    latestLabel={latestLabel}
                    circular
                    icon={(
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    )}
                />
                <SourceCard
                    source="playlist"
                    group={playlists}
                    title={playlistsLabel}
                    active={selected === 'playlist'}
                    onSelect={() => onSelect('playlist')}
                    soonLabel={soonLabel}
                    latestLabel={latestLabel}
                    circular={false}
                    icon={(
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                    )}
                />
            </div>
        </div>
    );
};

export default YouTubeSourcePicker;
