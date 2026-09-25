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

/** Raw playlist IDs start with PL/UU/LL/RD/FL followed by 10+ base64-ish chars. */
const PLAYLIST_ID_RE = /^(PL|UU|LL|RD|FL|OL|UU)[\w-]{10,}$/i;

/**
 * Extract a playlist ID from a raw ID or common playlist URL shapes.
 * Supports: raw PL..., youtube.com/playlist?list=PL..., youtube.com/watch?v=...&list=PL...
 * Returns null for channel/watch-without-list URLs (no quota consumed).
 */
export function parsePlaylistIdInput(input: string): string | null {
    const v = input.trim();
    if (!v) return null;
    if (PLAYLIST_ID_RE.test(v)) return v;
    const m =
        v.match(/[?&]list=([A-Za-z0-9_-]+)/) ||
        v.match(/youtube\.com\/playlist\/([A-Za-z0-9_-]+)/i);
    if (m && PLAYLIST_ID_RE.test(m[1])) return m[1];
    return null;
}

export interface YouTubePlaylistInfo {
    playlistId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    channelId: string;
    channelTitle: string;
    itemCount: number;
}

function playlistInfoFrom(item: any, fallbackId: string): YouTubePlaylistInfo {
    return {
        playlistId: item.id || fallbackId,
        title: item.snippet?.title || fallbackId,
        description: item.snippet?.description || '',
        thumbnailUrl: thumbOf(item.snippet?.thumbnails),
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        itemCount: typeof item.contentDetails?.itemCount === 'number' ? item.contentDetails.itemCount : 0,
    };
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

/** Map a playlist fetch failure to a specific i18n error (private vs not found). */
export function mapPlaylistError(error: any, playlistId: string): Error {
    const msg = String(error?.message || '');
    const vars = error && typeof error === 'object' && 'i18nVars' in error
        ? (error as any).i18nVars as Record<string, string>
        : {};
    const status = vars.status || (msg.match(/(\d{3})/)?.[1] || '');
    const detail = `${vars.detail || msg}`.toLowerCase();
    if (status === '404' || detail.includes('playlistnotfound') || detail.includes('not found')) {
        return ytError('ytPlaylistNotFound', { id: playlistId }, `Playlist not found: ${playlistId}`);
    }
    if (status === '403' || detail.includes('forbidden') || detail.includes('private') || detail.includes('playlistitems.notaccessible')) {
        return ytError('ytPlaylistPrivate', { id: playlistId }, `Playlist is private or inaccessible: ${playlistId}`);
    }
    if (error instanceof Error && (error as Partial<YtI18nError>).i18nKey) return error;
    return ytError('ytFetchError', {}, `Error fetching playlist ${playlistId}.`);
}

/** Validate a playlist exists + is visible before creating a season. 1 quota unit. */
export async function fetchPlaylistMeta(playlistId: string): Promise<YouTubePlaylistInfo> {
    const id = playlistId.trim();
    if (!PLAYLIST_ID_RE.test(id)) {
        throw ytError('ytInvalidPlaylistUrl', { input: playlistId }, `Invalid playlist URL or ID: "${playlistId}". Paste a youtube.com/playlist?list=PL... link.`);
    }
    let data: any;
    try {
        data = await ytGet('/playlists', { part: 'snippet,contentDetails', id });
    } catch (error) {
        throw mapPlaylistError(error, id);
    }
    const item = data?.items?.[0];
    if (!item) throw ytError('ytPlaylistNotFound', { id }, `Playlist not found: ${id}`);
    return playlistInfoFrom(item, id);
}

/** Fetch latest videos from a channel's uploads playlist. 1 quota unit per 50-video page. */
export async function fetchChannelVideos(
    uploadsPlaylistId: string,
    channelId: string,
    maxResults = 50,
    pageToken?: string
): Promise<{ videos: YouTubeFetchedVideo[]; nextPageToken?: string }> {
    return fetchPlaylistVideos(uploadsPlaylistId, channelId, maxResults, pageToken);
}

/**
 * Fetch videos from any playlist (uploads auto-playlist or custom playlist).
 * Same cost: 1 quota unit per 50-video page.
 */
export async function fetchPlaylistVideos(
    playlistId: string,
    channelId: string,
    maxResults = 50,
    pageToken?: string
): Promise<{ videos: YouTubeFetchedVideo[]; nextPageToken?: string }> {
    let data: any;
    try {
        data = await ytGet('/playlistItems', {
            part: 'snippet,contentDetails',
            playlistId,
            maxResults: String(Math.min(50, Math.max(1, maxResults))),
            ...(pageToken ? { pageToken } : {}),
        });
    } catch (error) {
        throw mapPlaylistError(error, playlistId);
    }
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

export interface ResolveVideosResult {
    videos: YouTubeFetchedVideo[];
    /** IDs absent from the response: private, deleted or invalid. */
    missing: string[];
}

function fetchedVideoFromDetails(item: any): YouTubeFetchedVideo | null {
    const videoId = item?.id;
    if (!videoId || typeof videoId !== 'string') return null;
    const channelId = item.snippet?.channelId || '';
    return {
        videoId,
        channelId,
        title: item.snippet?.title || videoId,
        description: item.snippet?.description || '',
        thumbnailUrl: thumbOf(item.snippet?.thumbnails) || thumbnailFor(videoId),
        publishedAt: item.snippet?.publishedAt || '',
        embedUrl: embedUrlFor(videoId),
    };
}

/**
 * Resolve arbitrary video IDs (pasted links) to metadata.
 * videos.list, 1 quota unit per 50 IDs. Order of `ids` is preserved.
 */
export async function fetchVideosByIds(ids: string[]): Promise<ResolveVideosResult> {
    const clean = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (clean.length === 0) return { videos: [], missing: [] };
    const byId = new Map<string, YouTubeFetchedVideo>();
    for (let i = 0; i < clean.length; i += 50) {
        const batch = clean.slice(i, i + 50);
        const data = await ytGet('/videos', {
            part: 'snippet,contentDetails',
            id: batch.join(','),
        });
        for (const item of data?.items || []) {
            const v = fetchedVideoFromDetails(item);
            if (v) byId.set(v.videoId, v);
        }
    }
    const videos = clean.map((id) => byId.get(id)).filter((v): v is YouTubeFetchedVideo => !!v);
    const missing = clean.filter((id) => !byId.has(id));
    return { videos, missing };
}

/** Source kind of a YouTube season: channel, playlist, or app-created custom. */
export type YouTubeSeasonSource = 'channel' | 'playlist' | 'custom';

/**
 * Classify a season. youtubeSourceType wins; uid prefix is the fallback for
 * seasons created before the field existed. Non-YouTube seasons → 'channel'.
 */
export function seasonSource(
    season: { uid_serie?: string; uid_season?: string; youtubeSourceType?: 'channel' | 'playlist' | 'custom' } | null | undefined
): YouTubeSeasonSource {
    if (!season) return 'channel';
    if (season.youtubeSourceType === 'playlist') return 'playlist';
    if (season.youtubeSourceType === 'custom') return 'custom';
    if (season.youtubeSourceType === 'channel') return 'channel';
    if (season.uid_season?.startsWith('ytpl_')) return 'playlist';
    if (season.uid_season?.startsWith('ytc_')) return 'custom';
    return 'channel';
}

/**
 * Split YouTube seasons into channels (left) and playlists (right).
 * Custom app-created seasons join the playlists group. Pure, no quota.
 */
export function splitSeasonsBySource<T extends { uid_serie?: string; uid_season?: string; youtubeSourceType?: 'channel' | 'playlist' | 'custom' }>(
    seasons: T[]
): { channels: T[]; playlists: T[] } {
    const channels: T[] = [];
    const playlists: T[] = [];
    for (const s of seasons) {
        if (seasonSource(s) === 'channel') channels.push(s);
        else playlists.push(s);
    }
    return { channels, playlists };
}

/** Seasons of the "Youtube" serie are YouTube channels, playlists or custom lists. */
export function isYouTubeSeason(
    season: { uid_serie?: string; uid_season?: string } | null | undefined
): boolean {
    if (!season) return false;
    return (
        season.uid_serie === 'youtube' ||
        (season.uid_season?.startsWith('yt_') ?? false) ||
        (season.uid_season?.startsWith('ytpl_') ?? false) ||
        (season.uid_season?.startsWith('ytc_') ?? false)
    );
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
