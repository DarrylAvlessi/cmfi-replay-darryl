// screens/ManageYouTubeScreen.tsx
// Admin POC: "Youtube" production where seasons = YouTube channels and
// episodes = manually curated videos fetched via YouTube Data API v3.
// Frontend + Firebase only (no server/). Writes go straight to Firestore.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '../components/icons';
import { episodeSerieService, EpisodeSerie, SeasonSerie } from '../lib/db';
import {
    hasYouTubeApiKey,
    resolveChannel,
    fetchChannelVideos,
    getQuotaUsage,
    resetQuotaUsage,
    ytErrorMessage,
    YouTubeChannelInfo,
    YouTubeFetchedVideo,
    QuotaUsage,
} from '../lib/youtubeApi';
import type { TranslationKey } from '../lib/i18n';
import {
    getYoutubeSeasons,
    upsertChannelSeason,
    publishCuratedEpisodes,
    deleteEpisode,
    deleteChannelSeason,
    episodeUidForVideo,
} from '../lib/firestore/youtubeAdmin';

const ManageYouTubeScreen: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile, t } = useAppContext();

    const notifyYtError = (error: any, fallbackKey: TranslationKey) => {
        toast.error(ytErrorMessage(t, error, fallbackKey));
    };

    const [seasons, setSeasons] = useState<SeasonSerie[]>([]);
    const [loading, setLoading] = useState(true);
    const [channelInput, setChannelInput] = useState('');
    const [resolving, setResolving] = useState(false);
    const [preview, setPreview] = useState<YouTubeChannelInfo | null>(null);
    const [adding, setAdding] = useState(false);

    const [selectedSeasonUid, setSelectedSeasonUid] = useState<string | null>(null);
    const [fetched, setFetched] = useState<YouTubeFetchedVideo[]>([]);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [fetching, setFetching] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [publishing, setPublishing] = useState(false);

    const [published, setPublished] = useState<EpisodeSerie[]>([]);
    const [loadingPublished, setLoadingPublished] = useState(false);

    // YouTube quota meter (local session estimate) + fetch progress.
    const [quota, setQuota] = useState<QuotaUsage>({ units: 0, searches: 0 });
    const [fetchingAll, setFetchingAll] = useState(false);
    const [fetchAllCount, setFetchAllCount] = useState(0);
    const [fetchMoreCount, setFetchMoreCount] = useState(0);
    const stopFetchAllRef = useRef(false);
    // Search among fetched videos (curation filter).
    const [searchQuery, setSearchQuery] = useState('');
    const FETCH_MORE_PAGES = 10; // +500 button = 10 pages x 50 videos (~10 units)

    const apiKeyOk = hasYouTubeApiKey();
    const selectedSeason = seasons.find((s) => s.uid_season === selectedSeasonUid) || null;

    useEffect(() => {
        if (userProfile && !userProfile.isAdmin) {
            toast.error(t('ytAdminRequired'));
            navigate('/home');
        }
    }, [userProfile, navigate, t]);

    const loadSeasons = useCallback(async () => {
        setLoading(true);
        try {
            setSeasons(await getYoutubeSeasons());
        } catch (error) {
            console.error('Error loading YouTube seasons:', error);
            toast.error(t('ytLoadChannelsError'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        loadSeasons();
    }, [loadSeasons]);

    const loadPublished = useCallback(async (seasonUid: string) => {
        setLoadingPublished(true);
        try {
            setPublished(await episodeSerieService.getEpisodesBySeason(seasonUid));
        } catch (error) {
            console.error('Error loading published episodes:', error);
        } finally {
            setLoadingPublished(false);
        }
    }, []);

    useEffect(() => {
        if (selectedSeasonUid) {
            setFetched([]);
            setNextPageToken(undefined);
            setChecked(new Set());
            setSearchQuery('');
            loadPublished(selectedSeasonUid);
        } else {
            setPublished([]);
        }
    }, [selectedSeasonUid, loadPublished]);

    const normalizeForSearch = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /** Fetched videos filtered by the search box (title + description, accent-insensitive). */
    const filteredFetched = useMemo(() => {
        const q = normalizeForSearch(searchQuery.trim());
        if (!q) return fetched;
        return fetched.filter((v) =>
            normalizeForSearch(`${v.title} ${v.description || ''}`).includes(q)
        );
    }, [fetched, searchQuery]);

    const handleCheckFiltered = () => {
        setChecked((prev) => {
            const next = new Set(prev);
            filteredFetched.forEach((v) => next.add(v.videoId));
            return next;
        });
    };

    const handleUncheckFiltered = () => {
        setChecked((prev) => {
            const next = new Set(prev);
            filteredFetched.forEach((v) => next.delete(v.videoId));
            return next;
        });
    };

    const handleResolve = async () => {
        if (!channelInput.trim()) {
            toast.error(t('ytPasteChannel'));
            return;
        }
        if (!apiKeyOk) {
            toast.error(t('ytApiKeyMissingError'));
            return;
        }
        setResolving(true);
        setPreview(null);
        try {
            setPreview(await resolveChannel(channelInput.trim()));
        } catch (error: any) {
            console.error('Error resolving channel:', error);
            notifyYtError(error, 'ytChannelNotFound');
        } finally {
            setQuota(getQuotaUsage());
            setResolving(false);
        }
    };

    const handleAddChannel = async () => {
        if (!preview) return;
        setAdding(true);
        try {
            const season = await upsertChannelSeason(preview);
            toast.success(t('ytChannelAdded', { name: season.title_season }));
            setChannelInput('');
            setPreview(null);
            await loadSeasons();
            setSelectedSeasonUid(season.uid_season);
        } catch (error: any) {
            console.error('Error adding channel:', error);
            notifyYtError(error, 'ytAddChannelError');
        } finally {
            setAdding(false);
        }
    };

    /** Merge video lists, deduped by videoId (page overlaps can never duplicate cards). */
    const mergeVideos = (prev: YouTubeFetchedVideo[], incoming: YouTubeFetchedVideo[]) => {
        if (prev.length === 0) return incoming;
        const seen = new Set(prev.map((v) => v.videoId));
        const fresh = incoming.filter((v) => !seen.has(v.videoId));
        return fresh.length === 0 ? prev : [...prev, ...fresh];
    };

    const handleFetch = async (more = false) => {
        if (!selectedSeason) return;
        if (!apiKeyOk) {
            toast.error(t('ytApiKeyMissingError'));
            return;
        }
        const playlistId = selectedSeason.youtubeUploadsPlaylistId;
        if (!playlistId) {
            toast.error(t('ytNoUploadsPlaylist'));
            return;
        }
        const channelId = selectedSeason.youtubeChannelId || '';
        setFetching(true);
        setFetchMoreCount(0);
        try {
            if (!more) {
                // Fresh fetch: first page (50 latest).
                const { videos, nextPageToken: next } = await fetchChannelVideos(playlistId, channelId, 50, undefined);
                setFetched(videos);
                setNextPageToken(next);
                if (videos.length === 0) toast.info(t('ytNoVideos'));
            } else {
                // +500: up to 10 pages appended to the current list.
                let page = nextPageToken;
                let added = 0;
                for (let p = 0; p < FETCH_MORE_PAGES && page; p++) {
                    const { videos, nextPageToken: next } = await fetchChannelVideos(playlistId, channelId, 50, page);
                    if (videos.length > 0) {
                        setFetched((prev) => mergeVideos(prev, videos));
                        added += videos.length;
                        setFetchMoreCount(added);
                    }
                    setQuota(getQuotaUsage());
                    page = (videos.length === 0 ? undefined : next);
                }
                setNextPageToken(page);
                if (added === 0) toast.info(t('ytNoNewVideos'));
            }
        } catch (error: any) {
            console.error('Error fetching videos:', error);
            notifyYtError(error, 'ytFetchError');
        } finally {
            setQuota(getQuotaUsage());
            setFetching(false);
            setFetchMoreCount(0);
        }
    };

    const handleFetchAll = async () => {
        if (!selectedSeason || fetchingAll) return;
        if (!apiKeyOk) {
            toast.error(t('ytApiKeyMissingError'));
            return;
        }
        const playlistId = selectedSeason.youtubeUploadsPlaylistId;
        if (!playlistId) {
            toast.error(t('ytNoUploadsPlaylist'));
            return;
        }
        const channelId = selectedSeason.youtubeChannelId || '';
        stopFetchAllRef.current = false;
        setFetchingAll(true);
        setFetchAllCount(0);
        try {
            // Uncapped: page from the start to exhaustion (~1 quota unit / 50 videos).
            const all: YouTubeFetchedVideo[] = [];
            const seen = new Set<string>();
            let page: string | undefined;
            for (;;) {
                if (stopFetchAllRef.current) break;
                const { videos, nextPageToken: next } = await fetchChannelVideos(playlistId, channelId, 50, page);
                for (const v of videos) {
                    if (!seen.has(v.videoId)) {
                        seen.add(v.videoId);
                        all.push(v);
                    }
                }
                setFetchAllCount(all.length);
                setQuota(getQuotaUsage());
                if (!next || videos.length === 0) {
                    page = undefined;
                    break;
                }
                page = next;
            }
            setFetched(all);
            setNextPageToken(page);
            if (stopFetchAllRef.current) {
                toast.info(t('ytFetchStopped', { count: String(all.length) }));
            } else {
                toast.success(t('ytVideosFetched', { count: String(all.length) }));
            }
        } catch (error: any) {
            console.error('Error fetching all videos:', error);
            notifyYtError(error, 'ytFetchError');
        } finally {
            setQuota(getQuotaUsage());
            setFetchingAll(false);
        }
    };

    const toggleCheck = (videoId: string) => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(videoId)) next.delete(videoId);
            else next.add(videoId);
            return next;
        });
    };

    const handlePublish = async () => {
        if (!selectedSeason || checked.size === 0) return;
        setPublishing(true);
        try {
            const toPublish = fetched.filter((v) => checked.has(v.videoId));
            const created = await publishCuratedEpisodes(selectedSeason, toPublish);
            const skipped = toPublish.length - created;
            toast.success(
                t('ytPublished', { created: String(created) }) +
                (skipped > 0 ? t('ytPublishedSkipped', { skipped: String(skipped) }) : '')
            );
            setChecked(new Set());
            await loadPublished(selectedSeason.uid_season);
            await loadSeasons();
        } catch (error: any) {
            console.error('Error publishing episodes:', error);
            notifyYtError(error, 'ytPublishError');
        } finally {
            setPublishing(false);
        }
    };

    const handleDeleteEpisode = async (ep: EpisodeSerie) => {
        if (!window.confirm(t('ytDeleteEpisodeConfirm', { title: ep.title }))) return;
        try {
            await deleteEpisode(ep.uid_episode);
            toast.success(t('ytEpisodeDeleted'));
            if (selectedSeasonUid) await loadPublished(selectedSeasonUid);
            await loadSeasons();
        } catch (error: any) {
            notifyYtError(error, 'ytDeleteError');
        }
    };

    const handleRemoveSeason = async (season: SeasonSerie) => {
        const count = season.nb_episodes || 0;
        if (!window.confirm(t('ytDeleteChannelConfirm', { name: season.title_season, count: String(count) }))) return;
        try {
            const deleted = await deleteChannelSeason(season.uid_season);
            toast.success(t('ytChannelDeleted', { count: String(deleted) }));
            if (selectedSeasonUid === season.uid_season) setSelectedSeasonUid(null);
            await loadSeasons();
        } catch (error: any) {
            notifyYtError(error, 'ytDeleteError');
        }
    };

    const publishedUids = new Set(published.map((e) => e.uid_episode));

    return (
        <div className="min-h-screen bg-white dark:bg-[#121212] pb-12">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label={t('goBack')}
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                            {t('ytTitle')}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('ytSubtitle')}
                        </p>
                    </div>
                </div>

                {!apiKeyOk && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
                        {t('ytApiKeyMissing')}
                    </div>
                )}

                {apiKeyOk && (
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <span>
                            {t('ytQuotaSession', { units: String(quota.units) })}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span>
                            {t('ytQuotaSearches', { count: String(quota.searches) })}
                        </span>
                        {(quota.units > 0 || quota.searches > 0) && (
                            <button
                                onClick={() => {
                                    resetQuotaUsage();
                                    setQuota(getQuotaUsage());
                                }}
                                className="ml-auto font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                {t('ytReset')}
                            </button>
                        )}
                    </div>
                )}

                {/* Step 1 — Add channel */}
                <section className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="font-bold text-gray-900 dark:text-white">{t('ytStep1')}</h2>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            value={channelInput}
                            onChange={(e) => setChannelInput(e.target.value)}
                            placeholder={t('ytChannelPlaceholder')}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        />
                        <button
                            onClick={handleResolve}
                            disabled={resolving || !apiKeyOk}
                            className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                        >
                            {resolving ? t('ytSearching') : t('ytSearch')}
                        </button>
                    </div>
                    {preview && (
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            {preview.thumbnailUrl && (
                                <img src={preview.thumbnailUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate">{preview.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {preview.channelId}
                                    {preview.subscriberCount !== undefined && ` • ${t('ytSubscribers', { count: preview.subscriberCount.toLocaleString() })}`}
                                </p>
                            </div>
                            <button
                                onClick={handleAddChannel}
                                disabled={adding}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {adding ? t('ytAdding') : t('ytAdd')}
                            </button>
                        </div>
                    )}
                </section>

                {/* Step 2 — Seasons */}
                <section className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <h2 className="font-bold text-gray-900 dark:text-white">{t('ytStep2')}</h2>
                    {loading ? (
                        <p className="text-sm text-gray-500">{t('loading')}</p>
                    ) : seasons.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">{t('ytNoChannels')}</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {seasons.map((s) => (
                                <div
                                    key={s.uid_season}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                        s.uid_season === selectedSeasonUid
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <button onClick={() => setSelectedSeasonUid(s.uid_season)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                        {s.poster_path ? (
                                            <img src={s.poster_path} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                                        )}
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-sm text-gray-900 dark:text-white truncate">
                                                {s.title_season}
                                            </span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                {t('ytEpisodesCount', { count: String(s.nb_episodes || 0) })}
                                            </span>
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleRemoveSeason(s)}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title={t('ytDeleteChannel')}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Step 3 — Fetch + curate */}
                {selectedSeason && (
                    <section className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                            <h2 className="font-bold text-gray-900 dark:text-white">
                                {t('ytStep3', { name: selectedSeason.title_season })}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleFetch(false)}
                                    disabled={fetching || fetchingAll || !apiKeyOk}
                                    className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                                >
                                    {fetching
                                        ? (fetchMoreCount > 0 ? t('ytLoadingMore', { count: String(fetchMoreCount) }) : t('loading'))
                                        : fetched.length > 0 ? t('ytRefresh') : t('ytFetchLatest')}
                                </button>
                                {nextPageToken && (
                                    <button
                                        onClick={() => handleFetch(true)}
                                        disabled={fetching || fetchingAll}
                                        title={t('ytLoadMoreHint')}
                                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 font-bold text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50"
                                    >
                                        {t('ytLoadMore')}
                                    </button>
                                )}
                                {fetchingAll ? (
                                    <button
                                        onClick={() => { stopFetchAllRef.current = true; }}
                                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm"
                                    >
                                        {t('ytStop', { count: String(fetchAllCount) })}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleFetchAll}
                                        disabled={fetching || !apiKeyOk}
                                        title={t('ytFetchAllHint')}
                                        className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 font-bold text-sm text-amber-700 dark:text-amber-300 disabled:opacity-50"
                                    >
                                        {t('ytFetchAll')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {checked.size > 0 && (
                            <button
                                onClick={handlePublish}
                                disabled={publishing}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                            >
                                <CheckIcon className="w-4 h-4" />
                                {publishing ? t('ytPublishing') : t('ytPublishSelection', { count: String(checked.size) })}
                            </button>
                        )}

                        {fetched.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">{t('ytFetchHint')}</p>
                        ) : (
                            <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('ytSearchPlaceholder')}
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            aria-label={t('clearSearch')}
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {t('ytVideosCount', { filtered: String(filteredFetched.length), total: String(fetched.length) })}
                                </span>
                                {filteredFetched.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCheckFiltered}
                                            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            {t('ytCheckAll', { count: String(filteredFetched.length) })}
                                        </button>
                                        <button
                                            onClick={handleUncheckFiltered}
                                            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            {t('ytUncheckAll')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {filteredFetched.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">{t('ytNoSearchResult', { query: searchQuery })}</p>
                            ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredFetched.map((v) => {
                                    const already = publishedUids.has(episodeUidForVideo(v.videoId));
                                    const isChecked = checked.has(v.videoId);
                                    return (
                                        <label
                                            key={v.videoId}
                                            className={`relative flex gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${
                                                isChecked
                                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isChecked}
                                                onChange={() => toggleCheck(v.videoId)}
                                            />
                                            <img src={v.thumbnailUrl} alt="" className="w-28 aspect-video object-cover rounded-lg shrink-0 bg-gray-200 dark:bg-gray-700" loading="lazy" />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{v.title}</span>
                                                <span className="block text-xs text-gray-500 mt-1">
                                                    {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : ''}
                                                </span>
                                                {already && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium">
                                                        {t('ytAlreadyPublished')}
                                                    </span>
                                                )}
                                            </span>
                                            {isChecked && (
                                                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                                    <CheckIcon className="w-4 h-4 text-gray-900" />
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                            )}
                            </>
                        )}

                        {/* Published episodes with delete */}
                        <div className="pt-2">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                                {t('ytPublishedTitle', { count: String(published.length) })}
                            </h3>
                            {loadingPublished ? (
                                <p className="text-sm text-gray-500">{t('loading')}</p>
                            ) : published.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">{t('ytNothingPublished')}</p>
                            ) : (
                                <div className="space-y-1">
                                    {published.map((ep) => (
                                        <div key={ep.uid_episode} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <img src={ep.picture_path} alt="" className="w-20 aspect-video object-cover rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" loading="lazy" />
                                            <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
                                                {ep.episode_numero}. {ep.title}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteEpisode(ep)}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                                {t('ytDelete')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ManageYouTubeScreen;
