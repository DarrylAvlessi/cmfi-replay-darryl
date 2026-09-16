import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import {
    watchTogetherService,
    WatchRoom,
    WatchParticipant,
    WatchRole,
    WatchMessage,
    WatchSyncTarget,
} from '../lib/db';

const STATE_PUBLISH_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 10000;
const SYNC_POLL_MS = 500;

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
    createRoom: () => Promise<void>;
    joinRoom: (code: string) => Promise<WatchRoom | null>;
    leaveRoom: () => Promise<void>;
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

    const roomIdRef = useRef<string | null>(null);
    const roleRef = useRef<WatchRole | null>(null);
    const userProfileRef = useRef(userProfile);
    const isMountedRef = useRef(true);
    const isApplyingRemoteRef = useRef(false);
    const lastPublishedRef = useRef<WatchSyncTarget | null>(null);
    const getPlaybackStateRef = useRef(getPlaybackState);
    const onApplyRemoteTargetRef = useRef(onApplyRemoteTarget);

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
        lastPublishedRef.current = null;
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
    }, [enabled, roomId, resetRoomState, t]);

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

    const createRoom = useCallback(async () => {
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
            });

            if (!isMountedRef.current) return;
            roomIdRef.current = createdRoom.id;
            setRoomId(createdRoom.id);
            setRoom(createdRoom);
            setRole('host');
            setNotice(t('roomCreated'));
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            if (isMountedRef.current) setIsBusy(false);
        }
    }, [isAuthenticated, videoId, videoType, t]);

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
        createRoom,
        joinRoom,
        leaveRoom,
        sendMessage,
        dismissError,
    };
}