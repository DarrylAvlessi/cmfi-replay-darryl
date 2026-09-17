// lib/youtubeApi.ts
// Frontend-only YouTube Data API v3 client (Option B).
// Key is public by design -> restrict it in Google Cloud Console
// (APIs & Services > Credentials > HTTP referrers: your domains).
// Quota-cheap strategy: channels.list (1 unit) + playlistItems.list
// (1 unit / 50 videos). Never use search.list for listing videos (100 units).

import type { TranslationKey } from './i18n';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

/** Error carrying an i18n key so screens can toast it translated (message = English fallback). */
export interface YtI18nError {
    i18nKey: TranslationKey;
    i18nVars: Record<string, string>;
}

export function ytError(key: TranslationKey, vars: Record<string, string>, fallbackMessage: string): Error {
    const err = new Error(fallbackMessage) as Error & YtI18nError;
    err.i18nKey = key;
    err.i18nVars = vars;
    return err;
}

/** Resolve a possibly-i18n error to a translated string for toasts. */
export function ytErrorMessage(
    t: (key: TranslationKey, vars?: Record<string, string>) => string,
    error: any,
    fallbackKey: TranslationKey
): string {
    const info = error as Partial<YtI18nError> | null | undefined;
    if (info?.i18nKey) {
        try {
            return t(info.i18nKey, info.i18nVars || {});
        } catch {
            // fall through to raw message below
        }
    }
    return error?.message || t(fallbackKey);
}

export function getYouTubeApiKey(): string {
    return (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined)?.trim() || '';
}

export function hasYouTubeApiKey(): boolean {
    return getYouTubeApiKey().length > 0;
}

export interface YouTubeChannelInfo {
    channelId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    uploadsPlaylistId: string;
    subscriberCount?: number;
}

export interface YouTubeFetchedVideo {
    videoId: string;
    channelId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    publishedAt: string;
    embedUrl: string;
}

// --- Input parsing (local, no quota) ---

const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

/** Extract a channel ID from a raw ID or common channel URL shapes. Null if it looks like a handle/name. */
export function parseChannelIdInput(input: string): string | null {
    const v = input.trim();
    if (!v) return null;
    if (CHANNEL_ID_RE.test(v)) return v;
    const m =
        v.match(/youtube\.com\/channel\/(UC[\w-]{22})/i) ||
        v.match(/youtu\.be\/.*/) || // not a channel shape
        null;
    if (m) return m[1];
    return null;
}

/** Extract the @handle (without @) from input like "@name" or "youtube.com/@name". Null otherwise. */
export function parseChannelHandle(input: string): string | null {
    const v = input.trim();
    const m =
        v.match(/^@([\w.\-]+)$/) ||
        v.match(/youtube\.com\/@([\w.\-]+)/i);
    return m ? m[1] : null;
}

/** Extract an 11-char video ID from watch / youtu.be / embed / shorts URLs or a raw ID. */
export function parseVideoId(input: string): string | null {
    const v = input.trim();
    if (/^[\w-]{11}$/.test(v)) return v;
    const m =
        v.match(/[?&]v=([\w-]{11})/) ||
        v.match(/youtu\.be\/([\w-]{11})/) ||
        v.match(/youtube\.com\/embed\/([\w-]{11})/) ||
        v.match(/youtube\.com\/shorts\/([\w-]{11})/);
    return m ? m[1] : null;
}

export function thumbnailFor(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export function thumbnailFallbackFor(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function embedUrlFor(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

function thumbOf(thumbnails: any): string {
    return (
        thumbnails?.maxres?.url ||
        thumbnails?.standard?.url ||
        thumbnails?.high?.url ||
        thumbnails?.medium?.url ||
        thumbnails?.default?.url ||
        ''
    );
}

export interface QuotaUsage {
    /** Units against the shared 10,000/day pool (channels/playlistItems/videos = 1 each). */
    units: number;
    /** search.list calls against their own limited daily bucket (not the shared pool). */
    searches: number;
}

let sessionUsage: QuotaUsage = { units: 0, searches: 0 };

/** Quota consumed by this browser session (local estimate: failed calls burn quota too). */
export function getQuotaUsage(): QuotaUsage {
    return { ...sessionUsage };
}

export function resetQuotaUsage(): void {
    sessionUsage = { units: 0, searches: 0 };
}

async function ytGet(path: string, params: Record<string, string>): Promise<any> {
    const key = getYouTubeApiKey();
    if (!key) throw ytError('ytApiKeyMissingError', {}, 'YouTube API key missing. Set VITE_YOUTUBE_API_KEY in .env.');
    // Track BEFORE the call: even failed/invalid requests burn quota.
    if (path.startsWith('/search')) sessionUsage.searches += 1;
    else sessionUsage.units += 1;
    const qs = new URLSearchParams({ ...params, key });
    const res = await fetch(`${API_BASE}${path}?${qs.toString()}`);
    if (!res.ok) {
        let detail = '';
        try {
            const body = await res.json();
            detail = body?.error?.message || JSON.stringify(body).slice(0, 200);
        } catch {
            detail = await res.text().catch(() => '');
        }
        throw ytError(
            'ytApiError',
            { status: String(res.status), detail: detail || res.statusText },
            `YouTube API error ${res.status}: ${detail || res.statusText}`
        );
    }
    return res.json();
}

function channelInfoFrom(item: any, fallbackId: string): YouTubeChannelInfo {
    return {
        channelId: item.id,
        title: item.snippet?.title || fallbackId,
        description: item.snippet?.description || '',
        thumbnailUrl: thumbOf(item.snippet?.thumbnails),
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads || '',
        subscriberCount: item.statistics?.subscriberCount ? Number(item.statistics.subscriberCount) : undefined,
    };
}

/** Resolve a @handle via channels.list forHandle (1 unit — the cheap path). */
export async function fetchChannelByHandle(handle: string): Promise<YouTubeChannelInfo> {
    const clean = handle.replace(/^@/, '').trim();
    if (!clean) throw new Error('Empty handle.');
    const data = await ytGet('/channels', {
        part: 'snippet,contentDetails,statistics',
        forHandle: clean,
    });
    const item = data?.items?.[0];
    if (!item) throw ytError('ytNoChannelForHandle', { handle: clean }, `No channel found for handle "@${clean}".`);
    return channelInfoFrom(item, clean);
}

/** Resolve any channel input to full channel info. 1-unit lookups first; search.list only as last resort. */
export async function resolveChannel(input: string): Promise<YouTubeChannelInfo> {
    const v = input.trim();
    const id = parseChannelIdInput(v);
    if (id) return fetchChannelById(id);

    // @handle or youtube.com/@handle -> forHandle (1 unit).
    const handle = parseChannelHandle(v);
    if (handle) {
        try {
            return await fetchChannelByHandle(handle);
        } catch {
            // Fall through to search fallback below (e.g. renamed handle).
        }
    }

    // Legacy youtube.com/user/NAME -> forUsername (1 unit).
    const userMatch = v.match(/youtube\.com\/user\/([\w.\-]+)/i);
    if (userMatch) {
        const data = await ytGet('/channels', {
            part: 'snippet,contentDetails,statistics',
            forUsername: userMatch[1],
        });
        const item = data?.items?.[0];
        if (!item) throw ytError('ytNoChannelForUser', { name: userMatch[1] }, `No channel found for user "${userMatch[1]}". Paste the channel ID or /channel/ URL.`);
        return channelInfoFrom(item, userMatch[1]);
    }

    // Bare word (no spaces/URL): probably a handle typed without @ -> try forHandle (1 unit).
    if (/^@?[\w.\-]{3,30}$/.test(v) && !v.includes('youtube.com')) {
        try {
            return await fetchChannelByHandle(v);
        } catch {
            // Fall through to search fallback below.
        }
    }

    // Last resort: /c/custom-name URLs have no 1-unit path. search.list lives in
    // its own limited daily bucket, so use it sparingly and never retry in a loop.
    const q = v.replace(/\/$/, '');
    const data = await ytGet('/search', {
        part: 'snippet',
        q,
        type: 'channel',
        maxResults: '1',
    });
    const item = data?.items?.[0];
    const foundId = item?.snippet?.channelId || item?.id?.channelId;
    if (!foundId) throw ytError('ytChannelNotFoundFor', { input }, `Channel not found for "${input}". Paste the channel ID or /channel/ URL.`);
    return fetchChannelById(foundId);
}

export async function fetchChannelById(channelId: string): Promise<YouTubeChannelInfo> {
    const data = await ytGet('/channels', {
        part: 'snippet,contentDetails,statistics',
        id: channelId,
    });
    const item = data?.items?.[0];
    if (!item) throw ytError('ytChannelNotFoundId', { id: channelId }, `Channel not found: ${channelId}`);
    return channelInfoFrom(item, channelId);
}

/** Fetch latest videos from a channel's uploads playlist. 1 quota unit per 50-video page. */
export async function fetchChannelVideos(
    uploadsPlaylistId: string,
    channelId: string,
    maxResults = 50,
    pageToken?: string
): Promise<{ videos: YouTubeFetchedVideo[]; nextPageToken?: string }> {
    const data = await ytGet('/playlistItems', {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: String(Math.min(50, Math.max(1, maxResults))),
        ...(pageToken ? { pageToken } : {}),
    });
    const videos: YouTubeFetchedVideo[] = (data?.items || [])
        .map((it: any) => {
            const videoId = it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId;
            if (!videoId) return null;
            const maxres = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
            return {
                videoId,
                channelId,
                title: it.snippet?.title || videoId,
                description: it.snippet?.description || '',
                thumbnailUrl: thumbOf(it.snippet?.thumbnails) || maxres,
                publishedAt: it.snippet?.publishedAt || it.contentDetails?.videoPublishedAt || '',
                embedUrl: embedUrlFor(videoId),
            } as YouTubeFetchedVideo;
        })
        .filter(Boolean) as YouTubeFetchedVideo[];
    return { videos, nextPageToken: data?.nextPageToken };
}

/** Season detection: seasons of the "Youtube" serie are YouTube channels. */
export function isYouTubeSeason(
    season: { uid_serie?: string; uid_season?: string } | null | undefined
): boolean {
    if (!season) return false;
    return season.uid_serie === 'youtube' || (season.uid_season?.startsWith('yt_') ?? false);
}

/**
 * Display label for a season: channel name for YouTube seasons,
 * "Season N" for everything else (or as fallback when title is missing).
 */
export function seasonLabel(
    season: { uid_serie?: string; uid_season?: string; title_season?: string; season_number?: number },
    seasonWord: string
): string {
    if (isYouTubeSeason(season) && season.title_season?.trim()) {
        return season.title_season;
    }
    return `${seasonWord} ${season.season_number}`;
}

/** Episode detection shared by player + admin UI. */
export function isYouTubeEpisode(ep: { uid_episode?: string; embedUrl?: string } | null | undefined): boolean {
    if (!ep) return false;
    if (ep.uid_episode?.startsWith('yt_')) return true;
    const url = ep.embedUrl || '';
    return url.includes('youtube.com') || url.includes('youtu.be');
}

export function youTubeIdFromEpisode(ep: { uid_episode?: string; embedUrl?: string }): string | null {
    if (ep.uid_episode?.startsWith('yt_')) return ep.uid_episode.slice(3);
    if (ep.embedUrl) return parseVideoId(ep.embedUrl);
    return null;
}
