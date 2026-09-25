// screens/ManageYouTubeScreen.tsx
// Admin POC: "Youtube" production where seasons = YouTube channels and
// episodes = manually curated videos fetched via YouTube Data API v3.
// Frontend + Firebase only (no server/). Writes go straight to Firestore.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { ArrowLeftIcon, PlusIcon, TrashIcon, CheckIcon, XMarkIcon, PencilIcon } from '../components/icons';
import { episodeSerieService, EpisodeSerie, SeasonSerie } from '../lib/db';
import {
    hasYouTubeApiKey,
    resolveChannel,
    fetchPlaylistMeta,
    fetchPlaylistVideos,
    fetchVideosByIds,
    getQuotaUsage,
    resetQuotaUsage,
    ytErrorMessage,
    parsePlaylistIdInput,
    parseVideoId,
    seasonSource,
    YouTubeChannelInfo,
    YouTubeFetchedVideo,
    YouTubePlaylistInfo,
    QuotaUsage,
} from '../lib/youtubeApi';
import type { TranslationKey } from '../lib/i18n';
import {
    getYoutubeSeasons,
    upsertChannelSeason,
    upsertPlaylistSeason,
    createCustomPlaylistSeason,
    renameCustomSeason,
    setSeasonCoverFromFile,
    setSeasonCoverFromUrl,
    publishCuratedEpisodes,
    deleteEpisode,
    deleteChannelSeason,
    unlinkEpisodeFromSeason,
    resolveSeasonPlaylistId,
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

    // Step 1b — Playlist → season.
    const [playlistInput, setPlaylistInput] = useState('');
    const [resolvingPlaylist, setResolvingPlaylist] = useState(false);
    const [playlistPreview, setPlaylistPreview] = useState<YouTubePlaylistInfo | null>(null);
    const [addingPlaylist, setAddingPlaylist] = useState(false);

    // Step 1 — unified add tabs: channel | playlist | custom.
    const [addTab, setAddTab] = useState<'channel' | 'playlist' | 'custom'>('channel');

    // Duplicate detection: warn before re-adding a season that already exists.
    const channelDuplicate = useMemo(
        () => (preview ? seasons.find((s) => s.youtubeChannelId && s.youtubeChannelId === preview.channelId) || null : null),
        [preview, seasons]
    );
    const playlistDuplicate = useMemo(
        () => (playlistPreview ? seasons.find((s) => resolveSeasonPlaylistId(s) === playlistPreview.playlistId) || null : null),
        [playlistPreview, seasons]
    );

    // Step 1c — App-created custom playlist (free title, fed by pasted links).
    const [customTitle, setCustomTitle] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const [creatingCustom, setCreatingCustom] = useState(false);
    const [linksInput, setLinksInput] = useState('');
    const [resolvingLinks, setResolvingLinks] = useState(false);
    const [linkPreview, setLinkPreview] = useState<{ videos: YouTubeFetchedVideo[]; invalid: string[]; missing: string[] } | null>(null);

    // Custom season rename + cover.
    const [renamingUid, setRenamingUid] = useState<string | null>(null);
    const [renameTitle, setRenameTitle] = useState('');
    const [renameDesc, setRenameDesc] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverUrlInput, setCoverUrlInput] = useState('');

    // Delete modal: linked episode → unlink here vs delete everywhere.
    const [deleteTarget, setDeleteTarget] = useState<{ ep: EpisodeSerie; seasonTitles: string[]; isOrigin: boolean } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [selectedSeasonUid, setSelectedSeasonUid] = useState<string | null>(null);
    const [fetched, setFetched] = useState<YouTubeFetchedVideo[]>([]);
    const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
    const [fetching, setFetching] = useState(false);
    // Ordered selection: click order defines episode numbers (first selected = 1).
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [publishing, setPublishing] = useState(false);

    const [published, setPublished] = useState<EpisodeSerie[]>([]);
    const [loadingPublished, setLoadingPublished] = useState(false);

    // YouTube quota meter (local session estimate) + fetch progress.
    const [quota, setQuota] = useState<QuotaUsage>({ units: 0, searches: 0 });
    const [fetchingAll, setFetchingAll] = useState(false);
    const [fetchAllCount, setFetchAllCount] = useState(0);
    const [fetchMoreCount, setFetchMoreCount] = useState(0);
    const stopFetchAllRef = useRef(false);
    // Unified content search (fetched videos + published episodes).
    const [contentQuery, setContentQuery] = useState('');
    const FETCH_MORE_PAGES = 10; // +500 button = 10 pages x 50 videos (~10 units)

    // Step 2 filter: display preference, independent from the selected season.
    const [seasonFilter, setSeasonFilter] = useState<'all' | 'channel' | 'playlist'>('all');
    const [seasonSearch, setSeasonSearch] = useState('');

    const apiKeyOk = hasYouTubeApiKey();
    const selectedSeason = seasons.find((s) => s.uid_season === selectedSeasonUid) || null;
    /** Custom seasons have no backing YouTube playlist: feed by links only, no fetch. */
    const canFetch = !!selectedSeason && resolveSeasonPlaylistId(selectedSeason) !== '';

    // Step 3 anchor: selecting a season scrolls the curation workspace into view.
    const step3Ref = useRef<HTMLElement | null>(null);
    const selectSeason = useCallback((uid: string) => {
        setSelectedSeasonUid(uid);
    }, []);

    // Post-commit scroll: runs after the content section has mounted,
    // so it works for every path (create, pick, re-select). No-op on deselect.
    useEffect(() => {
        if (!selectedSeasonUid) return;
        step3Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [selectedSeasonUid]);

    /** Quota estimate for a full fetch: ~1 unit per 50 videos. */
    const fetchEstimate = useMemo(() => {
        const total = selectedSeason?.nb_episodes || 0;
        if (!selectedSeason || total <= 0) return null;
        return { count: total, units: Math.max(1, Math.ceil(total / 50)) };
    }, [selectedSeason]);

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
            setSelectedIds([]);
            setContentQuery('');
            setLinksInput('');
            setLinkPreview(null);
            setCoverUrlInput('');
            setRenamingUid(null);
            loadPublished(selectedSeasonUid);
        } else {
            setPublished([]);
        }
    }, [selectedSeasonUid, loadPublished]);

    const normalizeForSearch = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /** Fetched videos filtered by the unified search box (title + description, accent-insensitive). */
    const filteredVideos = useMemo(() => {
        const q = normalizeForSearch(contentQuery.trim());
        if (!q) return fetched;
        return fetched.filter((v) =>
            normalizeForSearch(`${v.title} ${v.description || ''}`).includes(q)
        );
    }, [fetched, contentQuery]);

    /** Published episodes filtered by the unified search (title, description or number). */
    const filteredPublishedEpisodes = useMemo(() => {
        const raw = contentQuery.trim();
        if (!raw) return published;
        const q = normalizeForSearch(raw);
        return published.filter((ep) => {
            const seasonNum = selectedSeasonUid && ep.other_seasons?.[selectedSeasonUid]
                ? ep.other_seasons[selectedSeasonUid]
                : ep.episode_numero;
            return (
                normalizeForSearch(`${ep.title} ${ep.overview || ''}`).includes(q) ||
                String(ep.episode_numero || '').includes(raw) ||
                String(seasonNum || '').includes(raw)
            );
        });
    }, [published, contentQuery, selectedSeasonUid]);

    /** Step 2 seasons filtered by source + search (title, accent-insensitive). Custom seasons count as playlists. */
    const seasonCounts = useMemo(() => {
        let channels = 0;
        let playlists = 0;
        for (const s of seasons) {
            if (seasonSource(s) === 'channel') channels++;
            else playlists++;
        }
        return { all: seasons.length, channels, playlists };
    }, [seasons]);

    const visibleSeasons = useMemo(() => {
        const q = normalizeForSearch(seasonSearch.trim());
        return seasons.filter((s) =>
            (seasonFilter === 'all' ||
                (seasonFilter === 'channel' ? seasonSource(s) === 'channel' : seasonSource(s) !== 'channel')) &&
            (!q || normalizeForSearch(s.title_season || '').includes(q))
        );
    }, [seasons, seasonFilter, seasonSearch]);

    const handleCheckFiltered = () => {
        setSelectedIds((prev) => {
            const seen = new Set(prev);
            const additions = filteredVideos.map((v) => v.videoId).filter((id) => !seen.has(id));
            return additions.length === 0 ? prev : [...prev, ...additions];
        });
    };

    const handleUncheckFiltered = () => {
        setSelectedIds((prev) => {
            const remove = new Set(filteredVideos.map((v) => v.videoId));
            return prev.filter((id) => !remove.has(id));
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
            selectSeason(season.uid_season);
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

    const handleResolvePlaylist = async () => {
        const raw = playlistInput.trim();
        if (!raw) {
            toast.error(t('ytPlaylistPlaceholder'));
            return;
        }
        if (!apiKeyOk) {
            toast.error(t('ytApiKeyMissingError'));
            return;
        }
        // Local parse first: no quota burned on an invalid URL.
        const parsed = parsePlaylistIdInput(raw);
        if (!parsed) {
            toast.error(t('ytInvalidPlaylistUrl'));
            return;
        }
        setResolvingPlaylist(true);
        setPlaylistPreview(null);
        try {
            setPlaylistPreview(await fetchPlaylistMeta(parsed));
        } catch (error: any) {
            console.error('Error resolving playlist:', error);
            notifyYtError(error, 'ytFetchError');
        } finally {
            setQuota(getQuotaUsage());
            setResolvingPlaylist(false);
        }
    };

    const handleAddPlaylist = async () => {
        if (!playlistPreview) return;
        setAddingPlaylist(true);
        try {
            const season = await upsertPlaylistSeason(playlistPreview);
            toast.success(t('ytPlaylistAdded', { name: season.title_season, count: String(playlistPreview.itemCount) }));
            setPlaylistInput('');
            setPlaylistPreview(null);
            await loadSeasons();
            selectSeason(season.uid_season);
        } catch (error: any) {
            console.error('Error adding playlist:', error);
            notifyYtError(error, 'ytAddChannelError');
        } finally {
            setAddingPlaylist(false);
        }
    };

    const handleCreateCustom = async () => {
        if (!customTitle.trim()) {
            toast.error(t('ytCustomTitleRequired'));
            return;
        }
        setCreatingCustom(true);
        try {
            const season = await createCustomPlaylistSeason(customTitle.trim(), customDesc.trim());
            toast.success(t('ytCustomCreated', { name: season.title_season }));
            setCustomTitle('');
            setCustomDesc('');
            await loadSeasons();
            selectSeason(season.uid_season);
        } catch (error: any) {
            console.error('Error creating custom playlist:', error);
            notifyYtError(error, 'ytAddChannelError');
        } finally {
            setCreatingCustom(false);
        }
    };

    /** Parse pasted links (one per line) into video IDs, preserving paste order. */
    const parseLinksInput = (raw: string): { ids: string[]; invalid: string[] } => {
        const ids: string[] = [];
        const invalid: string[] = [];
        const seen = new Set<string>();
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const id = parseVideoId(trimmed);
            if (!id) {
                invalid.push(trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed);
                continue;
            }
            if (!seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        }
        return { ids, invalid };
    };

    const handleResolveLinks = async () => {
        if (!apiKeyOk) {
            toast.error(t('ytApiKeyMissingError'));
            return;
        }
        const { ids, invalid } = parseLinksInput(linksInput);
        if (ids.length === 0 && invalid.length === 0) {
            toast.error(t('ytLinksEmpty'));
            return;
        }
        setResolvingLinks(true);
        try {
            const { videos, missing } = await fetchVideosByIds(ids);
            setLinkPreview({ videos, invalid, missing });
            if (videos.length === 0) toast.info(t('ytLinksNoneResolved'));
        } catch (error: any) {
            console.error('Error resolving links:', error);
            notifyYtError(error, 'ytFetchError');
        } finally {
            setQuota(getQuotaUsage());
            setResolvingLinks(false);
        }
    };

    const handlePublishLinks = async () => {
        if (!selectedSeason || !linkPreview || linkPreview.videos.length === 0) return;
        setPublishing(true);
        try {
            // Paste order defines episode numbers.
            const { created, linked, skipped } = await publishCuratedEpisodes(selectedSeason, linkPreview.videos);
            const ignored = linkPreview.invalid.length + linkPreview.missing.length;
            toast.success(
                t('ytPublished', { created: String(created) }) +
                (linked > 0 ? t('ytPublishedLinked', { linked: String(linked) }) : '') +
                (skipped > 0 ? t('ytPublishedSkipped', { skipped: String(skipped) }) : '') +
                (ignored > 0 ? t('ytLinksIgnored', { count: String(ignored) }) : '')
            );
            setLinksInput('');
            setLinkPreview(null);
            await loadPublished(selectedSeason.uid_season);
            await loadSeasons();
        } catch (error: any) {
            console.error('Error publishing links:', error);
            notifyYtError(error, 'ytPublishError');
        } finally {
            setPublishing(false);
        }
    };

    const startRename = (season: SeasonSerie) => {
        setRenamingUid(season.uid_season);
        setRenameTitle(season.title_season);
        setRenameDesc(season.overview || '');
    };

    const handleRename = async () => {
        if (!renamingUid) return;
        if (!renameTitle.trim()) {
            toast.error(t('ytCustomTitleRequired'));
            return;
        }
        setRenaming(true);
        try {
            await renameCustomSeason(renamingUid, renameTitle.trim(), renameDesc.trim());
            toast.success(t('ytRenamed'));
            setRenamingUid(null);
            await loadSeasons();
        } catch (error: any) {
            console.error('Error renaming season:', error);
            notifyYtError(error, 'ytDeleteError');
        } finally {
            setRenaming(false);
        }
    };

    const handleCoverFile = async (file: File | undefined) => {
        if (!file || !selectedSeasonUid) return;
        setUploadingCover(true);
        try {
            await setSeasonCoverFromFile(selectedSeasonUid, file);
            toast.success(t('ytCoverUpdated'));
            await loadSeasons();
        } catch (error: any) {
            console.error('Error uploading cover:', error);
            notifyYtError(error, 'ytDeleteError');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleCoverUrl = async () => {
        if (!coverUrlInput.trim() || !selectedSeasonUid) return;
        setUploadingCover(true);
        try {
            await setSeasonCoverFromUrl(selectedSeasonUid, coverUrlInput.trim());
            toast.success(t('ytCoverUpdated'));
            setCoverUrlInput('');
            await loadSeasons();
        } catch (error: any) {
            console.error('Error setting cover URL:', error);
            notifyYtError(error, 'ytDeleteError');
        } finally {
            setUploadingCover(false);
        }
    };

    const handleFetch = async (more = false) => {
        if (!selectedSeason) return;
        if (!apiKeyOk) {
            toast.error(t('ytApiKeyMissingError'));
            return;
        }
        const playlistId = resolveSeasonPlaylistId(selectedSeason);
        if (!playlistId) {
            toast.error(t('ytNoPlaylistId'));
            return;
        }
        const channelId = selectedSeason.youtubeChannelId || '';
        setFetching(true);
        setFetchMoreCount(0);
        try {
            if (!more) {
                // Fresh fetch: first page (50 latest).
                const { videos, nextPageToken: next } = await fetchPlaylistVideos(playlistId, channelId, 50, undefined);
                setFetched(videos);
                setNextPageToken(next);
                if (videos.length === 0) toast.info(t('ytNoVideos'));
            } else {
                // +500: up to 10 pages appended to the current list.
                let page = nextPageToken;
                let added = 0;
                for (let p = 0; p < FETCH_MORE_PAGES && page; p++) {
                    const { videos, nextPageToken: next } = await fetchPlaylistVideos(playlistId, channelId, 50, page);
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
        if (!window.confirm(t('ytFetchAllConfirm', { name: selectedSeason.title_season }))) return;
        const playlistId = resolveSeasonPlaylistId(selectedSeason);
        if (!playlistId) {
            toast.error(t('ytNoPlaylistId'));
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
                const { videos, nextPageToken: next } = await fetchPlaylistVideos(playlistId, channelId, 50, page);
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
        setSelectedIds((prev) =>
            prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
        );
    };

    /** 1-based rank of a selected video in click order (0 = not selected). */
    const selectionRank = (videoId: string) => selectedIds.indexOf(videoId) + 1;

    const handlePublish = async () => {
        if (!selectedSeason || selectedIds.length === 0) return;
        setPublishing(true);
        try {
            // Selection order defines episode numbers: first selected = lowest new number.
            const byId = new Map(fetched.map((v) => [v.videoId, v]));
            const toPublish = selectedIds
                .map((id) => byId.get(id))
                .filter((v): v is YouTubeFetchedVideo => !!v);
            const { created, linked, skipped } = await publishCuratedEpisodes(selectedSeason, toPublish);
            toast.success(
                t('ytPublished', { created: String(created) }) +
                (linked > 0 ? t('ytPublishedLinked', { linked: String(linked) }) : '') +
                (skipped > 0 ? t('ytPublishedSkipped', { skipped: String(skipped) }) : '')
            );
            setSelectedIds([]);
            await loadPublished(selectedSeason.uid_season);
            await loadSeasons();
        } catch (error: any) {
            console.error('Error publishing episodes:', error);
            notifyYtError(error, 'ytPublishError');
        } finally {
            setPublishing(false);
        }
    };

    /** Open the delete modal: unlink-only vs global delete for linked episodes. */
    const handleDeleteEpisode = (ep: EpisodeSerie) => {
        if (!selectedSeasonUid) return;
        const linkedSeasons = ep.other_seasons ? Object.keys(ep.other_seasons) : [];
        const allSeasons = [ep.uid_season, ...linkedSeasons.filter((s) => s !== ep.uid_season)];
        const isOrigin = ep.uid_season === selectedSeasonUid;
        if (allSeasons.length <= 1 && isOrigin) {
            // Local-only episode: single confirm → global delete (previous behavior).
            if (!window.confirm(t('ytDeleteEpisodeConfirm', { title: ep.title }))) return;
            void (async () => {
                setDeleting(true);
                try {
                    await deleteEpisode(ep.uid_episode);
                    toast.success(t('ytEpisodeDeleted'));
                    if (selectedSeasonUid) await loadPublished(selectedSeasonUid);
                    await loadSeasons();
                } catch (error: any) {
                    notifyYtError(error, 'ytDeleteError');
                } finally {
                    setDeleting(false);
                }
            })();
            return;
        }
        const titleByUid = new Map(seasons.map((s) => [s.uid_season, s.title_season]));
        setDeleteTarget({
            ep,
            seasonTitles: allSeasons.map((uid) => titleByUid.get(uid) || uid),
            isOrigin,
        });
    };

    const handleUnlinkOnly = async () => {
        if (!deleteTarget || !selectedSeasonUid) return;
        setDeleting(true);
        try {
            await unlinkEpisodeFromSeason(deleteTarget.ep.uid_episode, selectedSeasonUid);
            toast.success(t('ytUnlinked', { name: selectedSeason?.title_season || selectedSeasonUid }));
            setDeleteTarget(null);
            await loadPublished(selectedSeasonUid);
            await loadSeasons();
        } catch (error: any) {
            notifyYtError(error, 'ytDeleteError');
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteEverywhere = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteEpisode(deleteTarget.ep.uid_episode);
            toast.success(t('ytEpisodeDeleted'));
            setDeleteTarget(null);
            if (selectedSeasonUid) await loadPublished(selectedSeasonUid);
            await loadSeasons();
        } catch (error: any) {
            notifyYtError(error, 'ytDeleteError');
        } finally {
            setDeleting(false);
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
    // Global lookup (all seasons) to distinguish "already here" from "linked elsewhere".
    const [globalEpMap, setGlobalEpMap] = useState<Map<string, EpisodeSerie>>(new Map());
    const lookupIds = useMemo(() => {
        const ids = fetched.map((v) => episodeUidForVideo(v.videoId));
        for (const v of linkPreview?.videos || []) {
            const uid = episodeUidForVideo(v.videoId);
            if (!ids.includes(uid)) ids.push(uid);
        }
        return ids;
    }, [fetched, linkPreview]);
    useEffect(() => {
        if (lookupIds.length === 0) {
            setGlobalEpMap(new Map());
            return;
        }
        let cancelled = false;
        void (async () => {
            try {
                const map = await episodeSerieService.getEpisodesByUids(lookupIds);
                if (!cancelled) setGlobalEpMap(map);
            } catch {
                // Badge fallback: local published set only.
            }
        })();
        return () => { cancelled = true; };
    }, [lookupIds]);

    const seasonTitleByUid = useMemo(() => new Map(seasons.map((s) => [s.uid_season, s.title_season])), [seasons]);

    /** Badge state for a fetched video in the context of the selected season. */
    const badgeFor = (videoId: string): { kind: 'here' | 'link'; originName?: string } | null => {
        const uid = episodeUidForVideo(videoId);
        if (publishedUids.has(uid)) return { kind: 'here' };
        const g = globalEpMap.get(uid);
        if (!g) return null;
        if (g.uid_season === selectedSeasonUid || (selectedSeasonUid && g.other_seasons?.[selectedSeasonUid])) {
            return { kind: 'here' };
        }
        return { kind: 'link', originName: seasonTitleByUid.get(g.uid_season) || g.title_serie || g.uid_season };
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black pb-12">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label={t('goBack')}
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-gray-900 dark:text-white" />
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
                    <details className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                        <summary className="cursor-pointer font-semibold">
                            {t('ytQuotaSession', { units: String(quota.units) })}
                        </summary>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
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
                    </details>
                )}

                {/* Step 1 — Season: add or pick */}
                <section className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="font-bold text-gray-900 dark:text-white">{t('ytStepSeason')}</h2>
                    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('ytStepSeason')}>
                        {(['channel', 'playlist', 'custom'] as const).map((tab) => {
                            const active = addTab === tab;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => setAddTab(tab)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                                        active
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                            : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {tab === 'channel' ? t('ytAddTabChannel') : tab === 'playlist' ? t('ytAddTabPlaylist') : t('ytAddTabCustom')}
                                </button>
                            );
                        })}
                    </div>

                    {addTab === 'channel' && (
                    <div className="space-y-4" role="tabpanel">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('ytAddChannelHint')}</p>
                    <form
                        className="flex flex-col sm:flex-row gap-2"
                        onSubmit={(e) => { e.preventDefault(); void handleResolve(); }}
                    >
                        <input
                            value={channelInput}
                            onChange={(e) => setChannelInput(e.target.value)}
                            placeholder={t('ytChannelPlaceholder')}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                        />
                        <button
                            type="submit"
                            disabled={resolving || !apiKeyOk}
                            className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                        >
                            {resolving ? t('ytSearching') : t('ytSearch')}
                        </button>
                    </form>
                    {preview && (
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                            {preview.thumbnailUrl && (
                                <img src={preview.thumbnailUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate">{preview.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {preview.channelId}
                                    {preview.subscriberCount !== undefined && ` • ${t('ytSubscribers', { count: preview.subscriberCount.toLocaleString() })}`}
                                </p>
                                {channelDuplicate && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('ytAlreadyAdded')}</p>
                                )}
                            </div>
                            {channelDuplicate ? (
                                <button
                                    onClick={() => selectSeason(channelDuplicate.uid_season)}
                                    className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold text-sm"
                                >
                                    {channelDuplicate.title_season}
                                </button>
                            ) : (
                            <button
                                onClick={handleAddChannel}
                                disabled={adding}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {adding ? t('ytAdding') : t('ytAdd')}
                            </button>
                            )}
                        </div>
                    )}
                    </div>
                    )}

                    {addTab === 'playlist' && (
                    <div className="space-y-4" role="tabpanel">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('ytAddPlaylistHint')}</p>
                    <form
                        className="flex flex-col sm:flex-row gap-2"
                        onSubmit={(e) => { e.preventDefault(); void handleResolvePlaylist(); }}
                    >
                        <input
                            value={playlistInput}
                            onChange={(e) => setPlaylistInput(e.target.value)}
                            placeholder={t('ytPlaylistPlaceholder')}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                        />
                        <button
                            type="submit"
                            disabled={resolvingPlaylist || !apiKeyOk}
                            className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                        >
                            {resolvingPlaylist ? t('ytPlaylistSearching') : t('ytPlaylistSearch')}
                        </button>
                    </form>
                    {playlistPreview && (
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                            {playlistPreview.thumbnailUrl && (
                                <img src={playlistPreview.thumbnailUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white truncate">{playlistPreview.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {playlistPreview.playlistId}
                                    {playlistPreview.channelTitle && ` • ${playlistPreview.channelTitle}`}
                                    {` • ${t('ytEpisodesCount', { count: String(playlistPreview.itemCount) })}`}
                                </p>
                                {playlistDuplicate && (
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('ytAlreadyAdded')}</p>
                                )}
                            </div>
                            {playlistDuplicate ? (
                                <button
                                    onClick={() => selectSeason(playlistDuplicate.uid_season)}
                                    className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-bold text-sm"
                                >
                                    {playlistDuplicate.title_season}
                                </button>
                            ) : (
                            <button
                                onClick={handleAddPlaylist}
                                disabled={addingPlaylist}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                            >
                                <PlusIcon className="w-4 h-4" />
                                {addingPlaylist ? t('ytAdding') : t('ytAdd')}
                            </button>
                            )}
                        </div>
                    )}
                    </div>
                    )}

                    {addTab === 'custom' && (
                    <div className="space-y-4" role="tabpanel">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('ytAddCustomHint')}</p>
                    <form
                        className="flex flex-col sm:flex-row gap-2"
                        onSubmit={(e) => { e.preventDefault(); void handleCreateCustom(); }}
                    >
                        <input
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder={t('ytCustomTitlePlaceholder')}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                        />
                        <input
                            value={customDesc}
                            onChange={(e) => setCustomDesc(e.target.value)}
                            placeholder={t('ytCustomDescPlaceholder')}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                        />
                        <button
                            type="submit"
                            disabled={creatingCustom || !customTitle.trim()}
                            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                        >
                            <PlusIcon className="w-4 h-4" />
                            {creatingCustom ? t('ytAdding') : t('ytCustomCreate')}
                        </button>
                    </form>
                    </div>
                    )}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('ytSeasonPick')}</h3>
                    {loading ? (
                        <p className="text-sm text-gray-500">{t('loading')}</p>
                    ) : seasons.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">{t('ytNoChannels')}</p>
                    ) : (
                        <>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('ytSeasonPick')}>
                                {(['all', 'channel', 'playlist'] as const).map((f) => {
                                    const active = seasonFilter === f;
                                    const label = f === 'all'
                                        ? t('ytFilterAll', { count: String(seasonCounts.all) })
                                        : f === 'channel'
                                            ? t('ytFilterChannels', { count: String(seasonCounts.channels) })
                                            : t('ytFilterPlaylists', { count: String(seasonCounts.playlists) });
                                    return (
                                        <button
                                            key={f}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => setSeasonFilter(f)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                                                active
                                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
                                <input
                                    value={seasonSearch}
                                    onChange={(e) => setSeasonSearch(e.target.value)}
                                    placeholder={t('ytSeasonSearchPlaceholder')}
                                    className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                                />
                                {seasonSearch && (
                                    <button
                                        onClick={() => setSeasonSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                        aria-label={t('clearSearch')}
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        {visibleSeasons.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">{t('ytNoSeasonMatch', { query: seasonSearch })}</p>
                        ) : (
                        <div className="space-y-1">
                            {visibleSeasons.map((s) => {
                                const isCustom = seasonSource(s) === 'custom';
                                const isRenaming = renamingUid === s.uid_season;
                                const isActive = s.uid_season === selectedSeasonUid;
                                return (
                                <div
                                    key={s.uid_season}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-colors ${
                                        isActive
                                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <button onClick={() => selectSeason(s.uid_season)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                        {s.poster_path ? (
                                            <img src={s.poster_path} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-black dark:border dark:border-gray-700 shrink-0 flex items-center justify-center text-xs font-black text-gray-500">
                                                {s.title_season.trim().charAt(0).toUpperCase() || '?'}
                                            </div>
                                        )}
                                        {isRenaming ? (
                                            <span className="flex-1 min-w-0 space-y-1" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    value={renameTitle}
                                                    onChange={(e) => setRenameTitle(e.target.value)}
                                                    className="w-full px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-sm text-gray-900 dark:text-white"
                                                />
                                                <span className="flex gap-1">
                                                    <button
                                                        onClick={handleRename}
                                                        disabled={renaming}
                                                        className="px-2 py-1 rounded-lg bg-amber-500 text-gray-900 text-xs font-bold disabled:opacity-50"
                                                    >
                                                        <CheckIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setRenamingUid(null)}
                                                        disabled={renaming}
                                                        className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 text-xs font-bold disabled:opacity-50"
                                                    >
                                                        <XMarkIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </span>
                                            </span>
                                        ) : (
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-semibold text-sm text-gray-900 dark:text-white truncate">
                                                {s.title_season}
                                                {isActive && <span className="ml-2 text-xs font-bold text-amber-600 dark:text-amber-400">●</span>}
                                            </span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {(() => {
                                                    const src = seasonSource(s);
                                                    return src === 'custom'
                                                        ? t('ytSeasonLabelCustom')
                                                        : src === 'playlist'
                                                            ? t('ytSeasonLabelPlaylist')
                                                            : t('ytSeasonLabelChannel');
                                                })()}
                                                {' • '}
                                                {t('ytEpisodesCount', { count: String(s.nb_episodes || 0) })}
                                            </span>
                                        </span>
                                        )}
                                    </button>
                                    {isCustom && !isRenaming && (
                                        <button
                                            onClick={() => startRename(s)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 shrink-0"
                                            title={t('ytRename')}
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemoveSeason(s)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                                        title={t('ytDeleteChannel')}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                );
                            })}
                        </div>
                        )}
                        </>
                    )}
                </section>

                {/* Step 2 — Content */}
                {selectedSeason && (
                    <section ref={step3Ref} className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 scroll-mt-4">
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                            <h2 className="font-bold text-gray-900 dark:text-white">
                                {t('ytStepContent', { name: selectedSeason.title_season })}
                            </h2>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                                {t('ytSelectedSeason', { name: selectedSeason.title_season })}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 justify-between">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('ytCurateHint')}</p>
                            {canFetch && (
                            <div className="flex flex-wrap items-center gap-2">
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
                                <details className="relative">
                                    <summary className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 font-bold text-sm text-gray-700 dark:text-gray-300 cursor-pointer list-none">
                                        {t('ytAdvanced')}
                                    </summary>
                                    <div className="absolute right-0 mt-2 z-20 w-64 p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl space-y-2">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('ytFetchAllHint')}</p>
                                        {fetchingAll ? (
                                            <button
                                                onClick={() => { stopFetchAllRef.current = true; }}
                                                className="w-full px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm"
                                            >
                                                {t('ytStop', { count: String(fetchAllCount) })}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleFetchAll}
                                                disabled={fetching || !apiKeyOk}
                                                className="w-full px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700 font-bold text-sm text-amber-700 dark:text-amber-300 disabled:opacity-50"
                                            >
                                                {t('ytFetchAll')}
                                            </button>
                                        )}
                                    </div>
                                </details>
                            </div>
                            )}
                        </div>
                        {canFetch && fetchEstimate && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t('ytFetchEstimate', { units: String(fetchEstimate.units), count: String(fetchEstimate.count) })}
                            </p>
                        )}

                        {!canFetch && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('ytCustomFeedNote')}</p>
                        )}

                        {canFetch && (
                        <>
                        {fetched.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">{t('ytFetchHint')}</p>
                        ) : (
                            <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        value={contentQuery}
                                        onChange={(e) => setContentQuery(e.target.value)}
                                        placeholder={t('ytSearchPlaceholder')}
                                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                                    />
                                    {contentQuery && (
                                        <button
                                            onClick={() => setContentQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            aria-label={t('clearSearch')}
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {t('ytVideosCount', { filtered: String(filteredVideos.length), total: String(fetched.length) })}
                                </span>
                                {filteredVideos.length > 0 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCheckFiltered}
                                            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                        >
                                            {t('ytCheckAll', { count: String(filteredVideos.length) })}
                                        </button>
                                        <button
                                            onClick={handleUncheckFiltered}
                                            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                        >
                                            {t('ytUncheckAll')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {filteredVideos.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">{t('ytNoSearchResult', { query: contentQuery })}</p>
                            ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredVideos.map((v) => {
                                    const badge = badgeFor(v.videoId);
                                    const rank = selectionRank(v.videoId);
                                    const isChecked = rank > 0;
                                    return (
                                        <label
                                            key={v.videoId}
                                            className={`relative flex gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${
                                                isChecked
                                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isChecked}
                                                onChange={() => toggleCheck(v.videoId)}
                                            />
                                            <img src={v.thumbnailUrl} alt="" className="w-28 aspect-video object-cover rounded-lg shrink-0 bg-gray-200 dark:bg-black dark:border dark:border-gray-700" loading="lazy" />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-gray-900 dark:text-white line-clamp-2">{v.title}</span>
                                                <span className="block text-xs text-gray-500 mt-1">
                                                    {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : ''}
                                                </span>
                                                {badge?.kind === 'here' && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium">
                                                        {t('ytAlreadyHere')}
                                                    </span>
                                                )}
                                                {badge?.kind === 'link' && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium">
                                                        {t('ytAlreadyInSeason', { name: badge.originName || '?' })}
                                                    </span>
                                                )}
                                            </span>
                                            {isChecked && (
                                                <span className="absolute top-2 right-2 min-w-6 h-6 px-1.5 rounded-full bg-amber-500 flex items-center justify-center text-gray-900 text-xs font-black tabular-nums">
                                                    {rank}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                            )}
                            </>
                        )}
                        {/* Sticky curation bar: publish + clear, always reachable while scrolling. */}
                        {canFetch && selectedIds.length > 0 && (
                            <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-gray-900 dark:bg-white shadow-xl">
                                <span className="px-3 py-1 rounded-full bg-amber-500 text-gray-900 text-xs font-black tabular-nums">
                                    {selectedIds.length}
                                </span>
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    {publishing ? t('ytPublishing') : t('ytPublishSelection', { count: String(selectedIds.length) })}
                                </button>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    disabled={publishing}
                                    className="px-4 py-2.5 rounded-xl font-bold text-sm text-white dark:text-gray-900 hover:underline disabled:opacity-50"
                                >
                                    {t('ytClearSelection')}
                                </button>
                            </div>
                        )}
                        </>)}

                        {/* Custom season feed: cover + links in one place */}
                        {seasonSource(selectedSeason) === 'custom' && (
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 space-y-4">
                            <div className="space-y-2">
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('ytCoverTitle')}</h3>
                                {selectedSeason.poster_path && (
                                    <img src={selectedSeason.poster_path} alt="" className="w-20 h-20 rounded-xl object-cover" />
                                )}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <label className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 font-bold text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.04] text-center">
                                        {uploadingCover ? t('ytUploading') : t('ytCoverUpload')}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            disabled={uploadingCover}
                                            onChange={(e) => { void handleCoverFile(e.target.files?.[0]); e.target.value = ''; }}
                                        />
                                    </label>
                                    <input
                                        value={coverUrlInput}
                                        onChange={(e) => setCoverUrlInput(e.target.value)}
                                        placeholder={t('ytCoverUrlPlaceholder')}
                                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                                    />
                                    <button
                                        onClick={handleCoverUrl}
                                        disabled={uploadingCover || !coverUrlInput.trim()}
                                        className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                                    >
                                        {t('ytAdd')}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('ytLinksTitle')}</h3>
                            <textarea
                                value={linksInput}
                                onChange={(e) => setLinksInput(e.target.value)}
                                placeholder={t('ytLinksPlaceholder')}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleResolveLinks}
                                    disabled={resolvingLinks || !apiKeyOk || !linksInput.trim()}
                                    className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                                >
                                    {resolvingLinks ? t('ytResolving') : t('ytLinksResolve')}
                                </button>
                                {linkPreview && linkPreview.videos.length > 0 && (
                                    <button
                                        onClick={handlePublishLinks}
                                        disabled={publishing}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-sm disabled:opacity-50"
                                    >
                                        <CheckIcon className="w-4 h-4" />
                                        {publishing ? t('ytPublishing') : t('ytPublishSelection', { count: String(linkPreview.videos.length) })}
                                    </button>
                                )}
                            </div>
                            {linkPreview && (
                                <div className="space-y-1">
                                    {linkPreview.videos.map((v) => {
                                        const badge = badgeFor(v.videoId);
                                        return (
                                            <div key={v.videoId} className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-gray-900">
                                                <img src={v.thumbnailUrl} alt="" className="w-16 aspect-video object-cover rounded-md shrink-0 bg-gray-200 dark:bg-black dark:border dark:border-gray-700" loading="lazy" />
                                                <span className="flex-1 min-w-0 text-xs text-gray-900 dark:text-white truncate">{v.title}</span>
                                                {badge?.kind === 'here' && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium whitespace-nowrap">{t('ytAlreadyHere')}</span>
                                                )}
                                                {badge?.kind === 'link' && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium whitespace-nowrap">{t('ytAlreadyInSeason', { name: badge.originName || '?' })}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {linkPreview.invalid.map((line) => (
                                        <p key={`inv-${line}`} className="text-xs text-red-600 dark:text-red-400 truncate">✗ {line}</p>
                                    ))}
                                    {linkPreview.missing.map((id) => (
                                        <p key={`miss-${id}`} className="text-xs text-amber-700 dark:text-amber-300 truncate">⚠ {t('ytLinksMissing', { id })}</p>
                                    ))}
                                </div>
                            )}
                            </div>
                        </div>
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
                                <>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                    {!canFetch && (
                                    <div className="relative flex-1">
                                        <input
                                            value={contentQuery}
                                            onChange={(e) => setContentQuery(e.target.value)}
                                            placeholder={t('ytPublishedSearchPlaceholder')}
                                            className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-gray-900 dark:text-white text-sm"
                                        />
                                        {contentQuery && (
                                            <button
                                                onClick={() => setContentQuery('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                                aria-label={t('clearSearch')}
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    )}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        {t('ytVideosCount', { filtered: String(filteredPublishedEpisodes.length), total: String(published.length) })}
                                    </span>
                                </div>
                                {filteredPublishedEpisodes.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">{t('ytNoSearchResult', { query: contentQuery })}</p>
                                ) : (
                                <div className="space-y-1">
                                    {filteredPublishedEpisodes.map((ep) => {
                                        const rank = published.findIndex((e) => e.uid_episode === ep.uid_episode) + 1;
                                        return (
                                        <div key={ep.uid_episode} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                                            <img src={ep.picture_path} alt="" className="w-20 aspect-video object-cover rounded-lg bg-gray-200 dark:bg-black dark:border dark:border-gray-700 shrink-0" loading="lazy" />
                                            <span className="flex-1 min-w-0 text-sm text-gray-900 dark:text-white truncate">
                                                {rank}. {ep.title}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteEpisode(ep)}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                                {t('ytDelete')}
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>
                                )}
                                </>
                            )}
                        </div>
                    </section>
                )}

                {/* Delete modal: unlink from this season vs delete everywhere */}
                {deleteTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
                        <div className="w-full max-w-md p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {t('ytDeleteEpisodeLinkedTitle', { title: deleteTarget.ep.title, count: String(deleteTarget.seasonTitles.length) })}
                            </h3>
                            <ul className="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside">
                                {deleteTarget.seasonTitles.map((name) => (
                                    <li key={name} className="truncate">{name}</li>
                                ))}
                            </ul>
                            {deleteTarget.isOrigin && (
                                <p className="text-xs text-amber-700 dark:text-amber-300">{t('ytOriginSeasonHint')}</p>
                            )}
                            <div className="flex flex-col gap-2">
                                {!deleteTarget.isOrigin && (
                                    <button
                                        onClick={handleUnlinkOnly}
                                        disabled={deleting}
                                        className="px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm disabled:opacity-50"
                                    >
                                        {t('ytRemoveFromSeasonOnly', { name: selectedSeason?.title_season || '' })}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteEverywhere}
                                    disabled={deleting}
                                    className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm disabled:opacity-50"
                                >
                                    {t('ytDeleteEverywhere', { count: String(deleteTarget.seasonTitles.length) })}
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={deleting}
                                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-bold text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageYouTubeScreen;
