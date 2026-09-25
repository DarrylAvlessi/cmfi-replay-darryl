// lib/firestore/youtubeAdmin.ts
// Frontend-only admin writes for the "Youtube" production.
// Serie "youtube": seasons = YouTube channels, episodes = curated videos.
// Imported directly by ManageYouTubeScreen (NOT via lib/db, so mock mode is unaffected).

import { db, storage } from '../firebase';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
    EPISODES_SERIES_COLLECTION,
    SEASONS_SERIES_COLLECTION,
    SERIES_COLLECTION,
} from './constants';
import { EpisodeSerie, SeasonSerie, Serie } from './types';
import { episodeSerieService } from './episodeSerieService';
import { seasonSerieService, serieService } from './contentServices';
import type { YouTubeChannelInfo, YouTubeFetchedVideo, YouTubePlaylistInfo } from '../youtubeApi';
import { embedUrlFor, ytError } from '../youtubeApi';

export const YOUTUBE_SERIE_UID = 'youtube';

export const seasonUidForChannel = (channelId: string) => `yt_${channelId}`;
export const seasonUidForPlaylist = (playlistId: string) => `ytpl_${playlistId}`;
export const seasonUidForCustom = () => `ytc_${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
export const episodeUidForVideo = (videoId: string) => `yt_${videoId}`;

/** Playlist actually backing a season (custom playlist wins, uploads auto-playlist as fallback). */
export const resolveSeasonPlaylistId = (season: SeasonSerie): string =>
    season.youtubePlaylistId || season.youtubeUploadsPlaylistId || '';

function slugNow(): string {
    return new Date().toISOString();
}

/** Ensure the `series/youtube` doc exists; create it on first channel add. */
export async function ensureYoutubeSerie(): Promise<Serie> {
    const existing = await serieService.getSerieByUid(YOUTUBE_SERIE_UID);
    if (existing) return existing;
    const data: Serie = {
        id: YOUTUBE_SERIE_UID,
        uid_serie: YOUTUBE_SERIE_UID,
        title_serie: 'Youtube',
        overview_serie: 'Curated YouTube channels and videos.',
        image_path: '',
        back_path: '',
        lang: 'en',
        runtime_h_m: '',
        homedisplayed: true,
        is_hidden: false,
        serie_type: 'serie',
    };
    await setDoc(doc(db, SERIES_COLLECTION, YOUTUBE_SERIE_UID), data, { merge: true });
    return data;
}

export async function getYoutubeSeasons(): Promise<SeasonSerie[]> {
    const q = query(
        collection(db, SEASONS_SERIES_COLLECTION),
        where('uid_serie', '==', YOUTUBE_SERIE_UID)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map((d) => d.data() as SeasonSerie)
        .sort((a, b) => (a.season_number || 0) - (b.season_number || 0));
}

/** Create (or refresh metadata of) one season per YouTube channel. */
export async function upsertChannelSeason(channel: YouTubeChannelInfo): Promise<SeasonSerie> {
    await ensureYoutubeSerie();
    const uid_season = seasonUidForChannel(channel.channelId);
    const existing = await getYoutubeSeasons();
    const already = existing.find((s) => s.uid_season === uid_season);
    const season_number = already?.season_number ?? (existing.length > 0 ? Math.max(...existing.map((s) => s.season_number || 0)) + 1 : 1);

    const data: SeasonSerie = {
        id: uid_season,
        uid_season,
        uid_serie: YOUTUBE_SERIE_UID,
        title_season: channel.title,
        title_serie: 'Youtube',
        overview: channel.description || `Videos from ${channel.title}`,
        poster_path: channel.thumbnailUrl,
        backdrop_path: channel.thumbnailUrl,
        season_number,
        nb_episodes: already?.nb_episodes ?? 0,
        year_season: new Date().getFullYear(),
        youtubeChannelId: channel.channelId,
        youtubeUploadsPlaylistId: channel.uploadsPlaylistId,
    };
    await setDoc(doc(db, SEASONS_SERIES_COLLECTION, uid_season), data, { merge: true });
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
    return data;
}

/** Create (or refresh metadata of) one season per custom YouTube playlist. */
export async function upsertPlaylistSeason(meta: YouTubePlaylistInfo): Promise<SeasonSerie> {
    await ensureYoutubeSerie();
    const uid_season = seasonUidForPlaylist(meta.playlistId);
    const existing = await getYoutubeSeasons();
    const already = existing.find((s) => s.uid_season === uid_season);
    const season_number = already?.season_number ?? (existing.length > 0 ? Math.max(...existing.map((s) => s.season_number || 0)) + 1 : 1);

    const data: SeasonSerie = {
        id: uid_season,
        uid_season,
        uid_serie: YOUTUBE_SERIE_UID,
        title_season: meta.title,
        title_serie: 'Youtube',
        overview: meta.description || `Playlist ${meta.title}${meta.channelTitle ? ` by ${meta.channelTitle}` : ''}`,
        poster_path: meta.thumbnailUrl,
        backdrop_path: meta.thumbnailUrl,
        season_number,
        nb_episodes: already?.nb_episodes ?? 0,
        year_season: new Date().getFullYear(),
        youtubeChannelId: meta.channelId,
        youtubeUploadsPlaylistId: meta.playlistId,
        youtubeSourceType: 'playlist',
        youtubePlaylistId: meta.playlistId,
    };
    await setDoc(doc(db, SEASONS_SERIES_COLLECTION, uid_season), data, { merge: true });
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
    return data;
}

/** Create an empty app-owned playlist season (free title, fed by pasted links). */
export async function createCustomPlaylistSeason(title: string, overview = ''): Promise<SeasonSerie> {
    const clean = title.trim();
    if (!clean) throw ytError('ytCustomTitleRequired', {}, 'Playlist title is required.');
    await ensureYoutubeSerie();
    const uid_season = seasonUidForCustom();
    const existing = await getYoutubeSeasons();
    const season_number = existing.length > 0 ? Math.max(...existing.map((s) => s.season_number || 0)) + 1 : 1;

    const data: SeasonSerie = {
        id: uid_season,
        uid_season,
        uid_serie: YOUTUBE_SERIE_UID,
        title_season: clean,
        title_serie: 'Youtube',
        overview: overview.trim() || clean,
        poster_path: '',
        backdrop_path: '',
        season_number,
        nb_episodes: 0,
        year_season: new Date().getFullYear(),
        youtubeSourceType: 'custom',
    };
    await setDoc(doc(db, SEASONS_SERIES_COLLECTION, uid_season), data, { merge: true });
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
    return data;
}

/** Rename / edit a custom season (title + overview). Custom-only by convention. */
export async function renameCustomSeason(uid_season: string, title: string, overview = ''): Promise<void> {
    const clean = title.trim();
    if (!clean) throw ytError('ytCustomTitleRequired', {}, 'Playlist title is required.');
    await seasonSerieService.updateSeasonByUid(uid_season, {
        title_season: clean,
        overview: overview.trim(),
    } as Partial<SeasonSerie>);
    await loadSeasonsRefresh();
}

/** Set a custom cover: file upload to Storage or direct image URL. */
export async function setSeasonCoverFromFile(uid_season: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
        throw ytError('ytCoverNotImage', {}, 'Cover must be an image file.');
    }
    if (file.size > 5 * 1024 * 1024) {
        throw ytError('ytCoverTooLarge', {}, 'Cover must be under 5 MB.');
    }
    const storageRef = ref(storage, `youtube/seasons/${uid_season}/cover`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await setSeasonCoverFromUrl(uid_season, url);
    return url;
}

export async function setSeasonCoverFromUrl(uid_season: string, url: string): Promise<void> {
    const clean = url.trim();
    if (!/^https?:\/\/.+/i.test(clean)) {
        throw ytError('ytCoverBadUrl', {}, 'Cover must be an http(s) image URL.');
    }
    await seasonSerieService.updateSeasonByUid(uid_season, {
        poster_path: clean,
        backdrop_path: clean,
    } as Partial<SeasonSerie>);
    await loadSeasonsRefresh();
}

async function loadSeasonsRefresh(): Promise<void> {
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
}

export interface PublishResult {
    created: number;
    /** Existing episodes in another season, now also visible here via other_seasons. */
    linked: number;
    /** Already present in this season (direct or linked) — untouched. */
    skipped: number;
}

/** Publish checked videos as episodes. Curation order defines episode_numero. Idempotent. */
export async function publishCuratedEpisodes(
    season: SeasonSerie,
    videos: YouTubeFetchedVideo[]
): Promise<PublishResult> {
    if (videos.length === 0) return { created: 0, linked: 0, skipped: 0 };
    const now = slugNow();

    // Existing episodes in this season to continue numbering after the max.
    const existingQ = query(
        collection(db, EPISODES_SERIES_COLLECTION),
        where('uid_season', '==', season.uid_season)
    );
    const existingSnap = await getDocs(existingQ);
    const existing = existingSnap.docs.map((d) => d.data() as EpisodeSerie);
    // All episodes visible in this season (direct + linked) determine the next number.
    const visible = await episodeSerieService.getEpisodesBySeason(season.uid_season).catch(() => existing);
    const maxVisible = visible.reduce((m, e) => {
        const n = e.uid_season === season.uid_season
            ? (e.episode_numero || 0)
            : (e.other_seasons?.[season.uid_season] || 0);
        return Math.max(m, n);
    }, 0);
    let nextNum = maxVisible + 1;
    // Map uid_episode -> { data, docId } for updates.
    const byUid = new Map(existingSnap.docs.map((d) => [(d.data() as EpisodeSerie).uid_episode, { data: d.data() as EpisodeSerie, docId: d.id }]));
    // Episodes linked from other seasons also need lookup (global UID dedup).
    const globalByUid = new Map<string, { data: EpisodeSerie; docId: string }>();
    for (const [uid, entry] of byUid) globalByUid.set(uid, entry);

    let created = 0;
    let linked = 0;
    let skipped = 0;
    for (const v of videos) {
        const uid_episode = episodeUidForVideo(v.videoId);
        let entry = globalByUid.get(uid_episode);
        if (!entry) {
            // Check globally: the same video may live in another season (global UID dedup).
            const gq = query(
                collection(db, EPISODES_SERIES_COLLECTION),
                where('uid_episode', '==', uid_episode)
            );
            const gsnap = await getDocs(gq);
            if (!gsnap.empty) {
                const gdoc = gsnap.docs[0];
                entry = { data: gdoc.data() as EpisodeSerie, docId: gdoc.id };
                globalByUid.set(uid_episode, entry);
            }
        }
        if (entry) {
            // Already visible here? -> skip, else link via other_seasons.
            if (entry.data.uid_season === season.uid_season || entry.data.other_seasons?.[season.uid_season]) {
                skipped++;
                continue;
            }
            await setDoc(doc(db, EPISODES_SERIES_COLLECTION, entry.docId), {
                other_seasons: { ...(entry.data.other_seasons || {}), [season.uid_season]: nextNum++ },
                updatedAt: now,
            } as any, { merge: true });
            // Keep the in-memory entry fresh for repeat selections in the same batch.
            entry.data = { ...entry.data, other_seasons: { ...(entry.data.other_seasons || {}), [season.uid_season]: nextNum - 1 } };
            linked++;
            continue;
        }
        const data: EpisodeSerie = {
            id: uid_episode,
            uid_episode,
            uid_season: season.uid_season,
            title_serie: 'Youtube',
            episode_numero: nextNum++,
            title: v.title,
            original_title: v.title,
            overview: v.description || v.title,
            overviewFr: '',
            picture_path: v.thumbnailUrl,
            backdrop_path: v.thumbnailUrl,
            embedUrl: embedUrlFor(v.videoId),
            video_path_hd: '',
            video_path_sd: '',
            runtime: 0,
            runtime_h_m: '',
            hidden: false,
            search_keywords: [v.title, season.title_season, 'youtube'],
            title_lowercase: v.title.toLowerCase(),
            youtubeVideoId: v.videoId,
            youtubeChannelId: v.channelId,
            youtubePublishedAt: v.publishedAt,
        };
        await setDoc(doc(db, EPISODES_SERIES_COLLECTION, uid_episode), { ...data, updatedAt: now } as any, {
            merge: true,
        });
        globalByUid.set(uid_episode, { data, docId: uid_episode });
        created++;
    }

    // Refresh denormalized counts (visible = direct + linked via other_seasons).
    const visibleCount = await episodeSerieService.getEpisodesBySeason(season.uid_season).then((eps) => eps.length).catch(() => existing.length + created + linked);
    await updateDoc(doc(db, SEASONS_SERIES_COLLECTION, season.uid_season), {
        nb_episodes: visibleCount,
        updatedAt: now,
    } as any).catch(() => {});
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
    return { created, linked, skipped };
}

/** Remove one episode link from a single season (keeps the doc + other seasons). */
export async function unlinkEpisodeFromSeason(uid_episode: string, seasonUid: string): Promise<void> {
    await episodeSerieService.removeEpisodeFromSeason(uid_episode, seasonUid);
    const visibleCount = await episodeSerieService.getEpisodesBySeason(seasonUid).then((eps) => eps.length).catch(() => 0);
    await updateDoc(doc(db, SEASONS_SERIES_COLLECTION, seasonUid), {
        nb_episodes: visibleCount,
        updatedAt: slugNow(),
    } as any).catch(() => {});
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
}

/** Hard delete one episode doc, then refresh the season/serie counters. */
export async function deleteEpisode(uid_episode: string): Promise<void> {
    const q = query(
        collection(db, EPISODES_SERIES_COLLECTION),
        where('uid_episode', '==', uid_episode)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
        throw ytError('ytEpisodeNotFound', { id: uid_episode }, `Episode not found: ${uid_episode}`);
    }
    const data = snap.docs[0].data() as EpisodeSerie;
    await deleteDoc(doc(db, EPISODES_SERIES_COLLECTION, snap.docs[0].id));

    // Recount remaining episodes for the season.
    const seasonQ = query(
        collection(db, EPISODES_SERIES_COLLECTION),
        where('uid_season', '==', data.uid_season)
    );
    const seasonSnap = await getDocs(seasonQ);
    await updateDoc(doc(db, SEASONS_SERIES_COLLECTION, data.uid_season), {
        nb_episodes: seasonSnap.size,
        updatedAt: slugNow(),
    } as any).catch(() => {});
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
}

/** Delete a channel season doc and all its episode docs. */
export async function deleteChannelSeason(uid_season: string): Promise<number> {
    const q = query(
        collection(db, EPISODES_SERIES_COLLECTION),
        where('uid_season', '==', uid_season)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, EPISODES_SERIES_COLLECTION, d.id))));

    const seasonQ = query(
        collection(db, SEASONS_SERIES_COLLECTION),
        where('uid_season', '==', uid_season)
    );
    const seasonSnap = await getDocs(seasonQ);
    await Promise.all(seasonSnap.docs.map((d) => deleteDoc(doc(db, SEASONS_SERIES_COLLECTION, d.id))));
    // Also cover the deterministic doc id in case the query missed it.
    await deleteDoc(doc(db, SEASONS_SERIES_COLLECTION, uid_season)).catch(() => {});

    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
    return snap.size;
}
