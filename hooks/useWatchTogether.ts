import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import {
    watchTogetherService,
    WatchRoom,
    WatchRoomMode,
    WatchParticipant,
    WatchRole,
    WatchMessage,
    WatchSyncTarget,
} from '../lib/db';

const STATE_PUBLISH_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 10000;
const SYNC_POLL_MS = 500;
// Presence heartbeat for every room member (drives the live viewer count).
const PARTICIPANT_HEARTBEAT_MS = 20000;
// A viewer counts as "watching" while lastSeen is fresher than this.
const VIEWER_FRESH_MS = 45000;
// Live DVR: a guest is "behind" once the live edge is this far ahead (seconds).
const BEHIND_THRESHOLD_SEC = 3;
// Live DVR state is re-evaluated on this cadence (edge advances while playing).
const DVR_POLL_MS = 1000;

interface UseWatchTogetherOptions {
    videoId: string;
    videoType: 'movie' | 'episode';
    enabled?: boolean;
    // Host: how to read the live playback state to publish to guests.
    getPlaybackState?: () => { currentTime: number; isPlaying: boolean; playbackRate: number } | null;
    // Guest/host: what to do when a remote sync frame arrives (host = echo guard).
    onApplyRemoteTarget?: (target: WatchSyncTarget | null) => void;
}

interface UseWatchTogetherResult {
    room: WatchRoom | null;
    participants: WatchParticipant[];
    messages: WatchMessage[];
    role: WatchRole | null;
    isInRoom: boolean;
    isBusy: boolean;
    isChatBusy: boolean;
    error: string | null;
    notice: string | null;
    lastHostAliveAt: Date | null;
    // Live viewers: members with a fresh presence heartbeat.
    viewerCount: number;
    // Live DVR (guests in live rooms): seconds behind the live edge (0 = at edge),
    // latest known edge position, and a snap-back action. Always 0/null outside live.
    behindBySec: number;
    // Single source of truth for the behind threshold (panel + player share it).
    isBehind: boolean;
    liveEdge: number | null;
    jumpToLive: () => void;
    createRoom: () => Promise<void>;
    createLiveRoom: () => Promise<void>;
    joinRoom: (code: string) => Promise<WatchRoom | null>;
    leaveRoom: () => Promise<void>;
    endLive: () => Promise<void>;
    sendMessage: (text: string) => Promise<void>;
    dismissError: () => void;
}

export function useWatchTogether({
    videoId,
    videoType,
    enabled = true,
    getPlaybackState,
    onApplyRemoteTarget,
}: UseWatchTogetherOptions): UseWatchTogetherResult {
    const { t, userProfile, user, isAuthenticated } = useAppContext();
    const [room, setRoom] = useState<WatchRoom | null>(null);
    const [participants, setParticipants] = useState<WatchParticipant[]>([]);
    const [messages, setMessages] = useState<WatchMessage[]>([]);
    const [role, setRole] = useState<WatchRole | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [isChatBusy, setIsChatBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [lastHostAliveAt, setLastHostAliveAt] = useState<Date | null>(null);
    const [behindBySec, setBehindBySec] = useState(0);
    const [liveEdge, setLiveEdge] = useState<number | null>(null);

    const roomIdRef = useRef<string | null>(null);
    const roleRef = useRef<WatchRole | null>(null);
    const userProfileRef = useRef(userProfile);
    const isMountedRef = useRef(true);
    const isApplyingRemoteRef = useRef(false);
    const lastPublishedRef = useRef<WatchSyncTarget | null>(null);
    const getPlaybackStateRef = useRef(getPlaybackState);
    const onApplyRemoteTargetRef = useRef(onApplyRemoteTarget);
    // Last received live edge frame {currentTime, positionAt, isPlaying, playbackRate}.
    const lastEdgeRef = useRef<WatchSyncTarget | null>(null);
    // False until the first remote frame is applied after joining: guarantees
    // late joiners always snap to the edge once before DVR gating kicks in.
    const edgeSnapDoneRef = useRef(false);

    useEffect(() => {
        userProfileRef.current = userProfile;
    }, [userProfile]);

    useEffect(() => {
        getPlaybackStateRef.current = getPlaybackState;
        onApplyRemoteTargetRef.current = onApplyRemoteTarget;
    }, [getPlaybackState, onApplyRemoteTarget]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleUid = () => userProfile?.uid ?? null;
    const handleDisplayName = () =>
        userProfile?.display_name || user?.email || 'Guest';
    const handlePhotoUrl = () => userProfile?.photo_url;

    const resetRoomState = useCallback(() => {
        roomIdRef.current = null;
        setRoomId(null);
        setRoom(null);
        setParticipants([]);
        setMessages([]);
        setRole(null);
        setLastHostAliveAt(null);
        setBehindBySec(0);
        setLiveEdge(null);
        lastPublishedRef.current = null;
        lastEdgeRef.current = null;
        edgeSnapDoneRef.current = false;
    }, []);

    // Live DVR evaluation shared by the snapshot callback and the poll interval:
    // returns { edgeNow, behind } and pushes rounded values to state.
    const evaluateDvr = useCallback(() => {
        const edge = lastEdgeRef.current;
        const local = getPlaybackStateRef.current?.() ?? null;
        if (!edge || !local) return { edgeNow: null as number | null, behind: false };
        const edgeNow = edge.isPlaying
            ? edge.currentTime + (Date.now() - edge.positionAt) / 1000
            : edge.currentTime;
        const gap = Math.max(0, edgeNow - local.currentTime);
        const behind = gap >= BEHIND_THRESHOLD_SEC;
        // Paused-behind: guest deliberately paused while the edge plays on.
        // Stateless latch — clears itself the moment the guest resumes.
        const held = !local.isPlaying && edge.isPlaying;
        if (isMountedRef.current) {
            setLiveEdge(Math.max(0, Math.round(edgeNow)));
            setBehindBySec(Math.round(gap));
        }
        return { edgeNow, behind, held };
    }, []);

    // Host: publish playback state on an interval and immediately on play/pause
    // changes, plus a heartbeat so guests can detect a stale host.
    // NOTE: isHost is derived from `role` state (not roleRef) and is a dep,
    // so publishing starts the moment the role becomes 'host'. Reading
    // roleRef here would see the stale pre-join value because the ref-sync
    // effect below runs after this one.
    const isHost = role === 'host';
    useEffect(() => {
        if (!enabled || !roomId || !isHost || !getPlaybackState) return;

        let lastPublishAt = 0;

        const publishState = () => {
            if (isApplyingRemoteRef.current) {
                isApplyingRemoteRef.current = false;
                return;
            }
            const state = getPlaybackState();
            if (!state) return;
            const now = Date.now();
            const lastPublished = lastPublishedRef.current;
            const isPlayingChanged = lastPublished === null || lastPublished.isPlaying !== state.isPlaying;
            const rateChanged = lastPublished === null || lastPublished.playbackRate !== state.playbackRate;
            if (!isPlayingChanged && !rateChanged && now - lastPublishAt < STATE_PUBLISH_INTERVAL_MS) return;
            lastPublishAt = now;
            const target: WatchSyncTarget = { ...state, positionAt: now };
            lastPublishedRef.current = target;
            watchTogetherService.updateRoomState(roomId, target);
        };

        publishState();
        const syncInterval = setInterval(publishState, SYNC_POLL_MS);
        const heartbeatInterval = setInterval(() => {
            watchTogetherService.setHostAlive(roomId);
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            clearInterval(syncInterval);
            clearInterval(heartbeatInterval);
            lastPublishedRef.current = null;
        };
    }, [enabled, roomId, isHost, getPlaybackState]);

    // Subscribe to room + participants while active in a room
    useEffect(() => {
        if (!enabled || !roomId) return;

        roomIdRef.current = roomId;

        const unsubRoom = watchTogetherService.subscribeToRoom(roomId, (updatedRoom) => {
            if (!isMountedRef.current) return;
            if (!updatedRoom) {
                setNotice(t('roomEnded'));
                resetRoomState();
                return;
            }
            setRoom(updatedRoom);
            if (updatedRoom.status === 'ended' && roleRef.current === 'guest') {
                setNotice(t('roomEnded'));
                resetRoomState();
            }
            if (updatedRoom.hostAliveAt) {
                setLastHostAliveAt(updatedRoom.hostAliveAt instanceof Date
                    ? updatedRoom.hostAliveAt
                    : new Date(0));
            }
            const applyTarget = onApplyRemoteTargetRef.current;
            if (applyTarget && updatedRoom.state) {
                const s = updatedRoom.state;
                const expected = s.isPlaying
                    ? s.currentTime + (Date.now() - s.positionAt) / 1000
                    : s.currentTime;
                // Record the live edge on every frame (drives DVR + seek clamp).
                lastEdgeRef.current = {
                    isPlaying: s.isPlaying,
                    currentTime: s.currentTime,
                    positionAt: s.positionAt,
                    playbackRate: s.playbackRate ?? 1,
                };
                const isLiveGuest = roleRef.current === 'guest' && updatedRoom.mode === 'live';
                if (isLiveGuest) {
                    const { behind, held } = evaluateDvr();
                    // First frame after joining always snaps to the edge; afterwards
                    // a behind guest keeps its local position (no forced re-apply),
                    // and a guest that paused deliberately is never force-resumed.
                    if (!edgeSnapDoneRef.current) {
                        edgeSnapDoneRef.current = true;
                    } else if (behind || held) {
                        return;
                    }
                }
                const isHostEcho =
                    roleRef.current === 'host' &&
                    lastPublishedRef.current !== null &&
                    lastPublishedRef.current.isPlaying === s.isPlaying &&
                    lastPublishedRef.current.playbackRate === (s.playbackRate ?? 1) &&
                    Math.abs(lastPublishedRef.current.currentTime - expected) < 1.5;
                if (!isHostEcho) {
                    isApplyingRemoteRef.current = true;
                    applyTarget({ isPlaying: s.isPlaying, currentTime: expected, positionAt: s.positionAt, playbackRate: s.playbackRate ?? 1 });
                }
            }
        });

        const unsubParticipants = watchTogetherService.subscribeToParticipants(
            roomId,
            (list) => {
                if (isMountedRef.current) setParticipants(list);
            }
        );

        const unsubMessages = watchTogetherService.subscribeToMessages(
            roomId,
            (list) => {
                if (isMountedRef.current) setMessages(list);
            }
        );

        return () => {
            unsubRoom();
            unsubParticipants();
            unsubMessages();
        };
    }, [enabled, roomId, resetRoomState, t, evaluateDvr]);

    // Live DVR poll: the edge advances while the host plays, so behind-ness
    // (and the seek-clamp edge) must refresh between room snapshots too.
    useEffect(() => {
        if (!enabled || !roomId || role !== 'guest' || room?.mode !== 'live') return;
        const id = setInterval(() => {
            if (roleRef.current === 'guest') evaluateDvr();
        }, DVR_POLL_MS);
        return () => clearInterval(id);
    }, [enabled, roomId, role, room?.mode, evaluateDvr]);

    // Presence heartbeat: every member (host included) refreshes lastSeen so
    // the viewer count reflects who's actually still watching.
    useEffect(() => {
        if (!enabled || !roomId || !role) return;
        const uid = userProfileRef.current?.uid;
        if (!uid) return;
        watchTogetherService.setParticipantLastSeen(roomId, uid).catch(() => {});
        const id = setInterval(() => {
            const currentUid = userProfileRef.current?.uid;
            const currentRoomId = roomIdRef.current;
            if (currentUid && currentRoomId) {
                watchTogetherService.setParticipantLastSeen(currentRoomId, currentUid).catch(() => {});
            }
        }, PARTICIPANT_HEARTBEAT_MS);
        return () => clearInterval(id);
    }, [enabled, roomId, role]);

    const viewerCount = participants.filter((p) => {
        const seen = p.lastSeen instanceof Date
            ? p.lastSeen.getTime()
            : (p.lastSeen as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return Date.now() - seen < VIEWER_FRESH_MS;
    }).length;

    // Keep roleRef in sync for the subscription callback
    useEffect(() => {
        roleRef.current = role;
    }, [role]);

    // Gracefully leave the room when the component unmounts (mount-once effect;
    // reads latest values from refs so dep changes never trigger a premature leave)
    useEffect(() => {
        return () => {
            const currentRole = roleRef.current;
            const currentRoomId = roomIdRef.current;
            const uid = userProfileRef.current?.uid;
            if (!currentRoomId || !uid) return;
            if (currentRole === 'host') {
                watchTogetherService.endRoom(currentRoomId);
            }
            watchTogetherService.leaveRoom(currentRoomId, uid);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const doCreateRoom = useCallback(async (mode: WatchRoomMode) => {
        const uid = handleUid();
        if (!isAuthenticated || !uid) {
            setError(t('loginToWatchTogether'));
            return;
        }
        setIsBusy(true);
        setError(null);
        setNotice(null);
        try {
            let roomCode = '';
            for (let attempt = 0; attempt < 5; attempt++) {
                const candidate = watchTogetherService.generateRoomCode();
                const existing = await watchTogetherService.getRoomByCode(candidate);
                if (!existing) {
                    roomCode = candidate;
                    break;
                }
            }
            if (!roomCode) throw new Error('Unable to generate a unique room code.');

            const createdRoom = await watchTogetherService.createRoom({
                roomCode,
                hostUid: uid,
                hostName: handleDisplayName(),
                hostPhotoUrl: handlePhotoUrl(),
                videoId,
                videoType,
                mode,
            });

            if (!isMountedRef.current) return;
            roomIdRef.current = createdRoom.id;
            setRoomId(createdRoom.id);
            setRoom(createdRoom);
            setRole('host');
            setNotice(t(mode === 'live' ? 'liveStarted' : 'roomCreated'));
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            if (isMountedRef.current) setIsBusy(false);
        }
    }, [isAuthenticated, videoId, videoType, t]);

    const createRoom = useCallback(() => doCreateRoom('replay'), [doCreateRoom]);

    // Premiere-style live: same room mechanics, host position is the live edge.
    const createLiveRoom = useCallback(() => doCreateRoom('live'), [doCreateRoom]);

    const joinRoom = useCallback(
        async (code: string): Promise<WatchRoom | null> => {
            const uid = handleUid();
            if (!isAuthenticated || !uid) {
                setError(t('loginRequiredJoin'));
                return null;
            }
            const normalized = code.trim().toUpperCase();
            if (normalized.length < 4) {
                setError(t('roomNotFound'));
                return null;
            }
            setIsBusy(true);
            setError(null);
            setNotice(null);
            try {
                const foundRoom = await watchTogetherService.getRoomByCode(normalized);
                if (!foundRoom || foundRoom.status !== 'active') {
                    if (isMountedRef.current) setError(t('roomNotFound'));
                    return null;
                }
                await watchTogetherService.joinRoom(foundRoom.id, {
                    uid,
                    displayName: handleDisplayName(),
                    photoUrl: handlePhotoUrl(),
                });
                if (!isMountedRef.current) return null;
                roomIdRef.current = foundRoom.id;
                setRoomId(foundRoom.id);
                setRoom(foundRoom);
                setRole('guest');
                return foundRoom;
            } catch (err) {
                if (isMountedRef.current) {
                    setError(err instanceof Error ? err.message : String(err));
                }
                return null;
            } finally {
                if (isMountedRef.current) setIsBusy(false);
            }
        },
        [isAuthenticated, t]
    );

    const leaveRoom = useCallback(async () => {
        const currentRoomId = roomIdRef.current;
        const uid = handleUid();
        if (!currentRoomId || !uid) return;
        setIsBusy(true);
        try {
            if (roleRef.current === 'host') {
                await watchTogetherService.endRoom(currentRoomId);
            }
            await watchTogetherService.leaveRoom(currentRoomId, uid);
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            if (isMountedRef.current) {
                setIsBusy(false);
                resetRoomState();
            }
        }
    }, [resetRoomState]);

    // Ending a live stream is leaving as host (closes the room for everyone).
    const endLive = useCallback(() => leaveRoom(), [leaveRoom]);

    // Snap back to the live edge (freshly computed, not the last snapshot).
    const jumpToLive = useCallback(() => {
        const edge = lastEdgeRef.current;
        const applyTarget = onApplyRemoteTargetRef.current;
        if (!edge || !applyTarget) return;
        const edgeNow = edge.isPlaying
            ? edge.currentTime + (Date.now() - edge.positionAt) / 1000
            : edge.currentTime;
        isApplyingRemoteRef.current = true;
        applyTarget({
            isPlaying: edge.isPlaying,
            currentTime: Math.max(0, edgeNow),
            positionAt: Date.now(),
            playbackRate: edge.playbackRate,
        });
    }, []);

    const dismissError = useCallback(() => setError(null), []);

    const sendMessage = useCallback(async (text: string) => {
        const currentRoomId = roomIdRef.current;
        const uid = handleUid();
        const trimmed = text.trim();
        if (!currentRoomId || !uid || !trimmed) return;
        setIsChatBusy(true);
        try {
            await watchTogetherService.sendMessage(currentRoomId, {
                uid,
                displayName: handleDisplayName(),
                photoUrl: handlePhotoUrl(),
                text: trimmed,
            });
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            if (isMountedRef.current) setIsChatBusy(false);
        }
    }, []);

    return {
        room,
        participants,
        messages,
        role,
        isInRoom: room !== null && role !== null,
        isBusy,
        isChatBusy,
        error,
        notice,
        lastHostAliveAt,
        viewerCount,
        behindBySec,
        isBehind: behindBySec >= BEHIND_THRESHOLD_SEC,
        liveEdge,
        jumpToLive,
        createRoom,
        createLiveRoom,
        joinRoom,
        leaveRoom,
        endLive,
        sendMessage,
        dismissError,
    };
}