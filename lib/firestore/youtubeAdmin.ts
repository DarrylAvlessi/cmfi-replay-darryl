// lib/firestore/youtubeAdmin.ts
// Frontend-only admin writes for the "Youtube" production.
// Serie "youtube": seasons = YouTube channels, episodes = curated videos.
// Imported directly by ManageYouTubeScreen (NOT via lib/db, so mock mode is unaffected).

import { db } from '../firebase';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import {
    EPISODES_SERIES_COLLECTION,
    SEASONS_SERIES_COLLECTION,
    SERIES_COLLECTION,
} from './constants';
import { EpisodeSerie, SeasonSerie, Serie } from './types';
import { serieService } from './contentServices';
import type { YouTubeChannelInfo, YouTubeFetchedVideo } from '../youtubeApi';
import { embedUrlFor, ytError } from '../youtubeApi';

export const YOUTUBE_SERIE_UID = 'youtube';

export const seasonUidForChannel = (channelId: string) => `yt_${channelId}`;
export const episodeUidForVideo = (videoId: string) => `yt_${videoId}`;

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

/** Publish checked videos as episodes. Curation order defines episode_numero. Idempotent. */
export async function publishCuratedEpisodes(
    season: SeasonSerie,
    videos: YouTubeFetchedVideo[]
): Promise<number> {
    if (videos.length === 0) return 0;
    const now = slugNow();

    // Existing episodes in this season to continue numbering after the max.
    const existingQ = query(
        collection(db, EPISODES_SERIES_COLLECTION),
        where('uid_season', '==', season.uid_season)
    );
    const existingSnap = await getDocs(existingQ);
    const existing = existingSnap.docs.map((d) => d.data() as EpisodeSerie);
    const byUid = new Map(existing.map((e) => [e.uid_episode, e]));
    let nextNum =
        existing.length > 0 ? Math.max(...existing.map((e) => e.episode_numero || 0)) + 1 : 1;

    let created = 0;
    for (const v of videos) {
        const uid_episode = episodeUidForVideo(v.videoId);
        if (byUid.has(uid_episode)) continue; // already published -> skip (idempotent)
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
        created++;
    }

    // Refresh denormalized counts.
    await updateDoc(doc(db, SEASONS_SERIES_COLLECTION, season.uid_season), {
        nb_episodes: existing.length + created,
        updatedAt: now,
    } as any).catch(() => {});
    await serieService.calculateAndUpdateSeriesStats(YOUTUBE_SERIE_UID).catch(() => {});
    return created;
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
