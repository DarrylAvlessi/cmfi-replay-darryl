import {
    WatchRoom,
    WatchRoomState,
    WatchParticipant,
    WatchMessage,
    WatchRole,
} from '../firestore';
import { generateRoomCode as realGenerateRoomCode } from '../firestore/watchTogetherService';

const rooms = new Map<string, WatchRoom>();
const participants = new Map<string, Map<string, WatchParticipant>>();
const messages = new Map<string, WatchMessage[]>();

const now = () => new Date();

const POLL_MS = 300;

function subscribeWithPolling<T>(poll: () => T[], callback: (items: T[]) => void): () => void {
    let lastFingerprint = '';
    const pollCurrent = () => {
        try {
            const items = poll();
            const fingerprint = JSON.stringify(items);
            if (fingerprint !== lastFingerprint) {
                lastFingerprint = fingerprint;
                callback(items);
            }
        } catch {}
    };
    pollCurrent();
    const interval = setInterval(pollCurrent, POLL_MS);
    return () => clearInterval(interval);
}

function makeRoomId(): string {
    let id: string;
    do {
        id = realGenerateRoomCode() + Date.now().toString(36);
    } while (rooms.has(id));
    return id;
}

export const watchTogetherService = {
    generateRoomCode: realGenerateRoomCode,

    async createRoom(params: {
        roomCode: string;
        hostUid: string;
        hostName: string;
        hostPhotoUrl?: string;
        videoId: string;
        videoType: 'movie' | 'episode';
        mode?: 'replay' | 'live';
        videoTitle?: string;
    }): Promise<WatchRoom> {
        const roomId = makeRoomId();
        const mode = params.mode === 'live' ? 'live' : 'replay';
        const room: WatchRoom = {
            id: roomId,
            roomCode: params.roomCode,
            hostUid: params.hostUid,
            hostName: params.hostName,
            ...(params.videoTitle ? { videoTitle: params.videoTitle } : {}),
            status: 'active',
            videoId: params.videoId,
            videoType: params.videoType,
            mode,
            participantUids: [params.hostUid],
            ...(mode === 'live' ? { startedAt: now() } : {}),
            createdAt: now(),
            updatedAt: now(),
            hostAliveAt: now(),
            state: { isPlaying: false, currentTime: 0, positionAt: Date.now(), playbackRate: 1 },
        };
        rooms.set(roomId, room);

        const host: WatchParticipant = {
            uid: params.hostUid,
            displayName: params.hostName,
            photoUrl: params.hostPhotoUrl,
            role: 'host',
            joinedAt: now(),
            lastSeen: now(),
        };
        participants.set(roomId, new Map([[host.uid, host]]));

        return room;
    },

    async getRoomByCode(roomCode: string): Promise<WatchRoom | null> {
        for (const room of rooms.values()) {
            if (room.roomCode === roomCode && room.status === 'active') return room;
        }
        return null;
    },

    async getRoom(roomId: string): Promise<WatchRoom | null> {
        return rooms.get(roomId) || null;
    },

    async joinRoom(roomId: string, participant: {
        uid: string;
        displayName: string;
        photoUrl?: string;
    }): Promise<void> {
        const room = rooms.get(roomId);
        if (!room || room.status !== 'active') throw new Error('Room not available');
        if (!participants.has(roomId)) participants.set(roomId, new Map());
        const existing = participants.get(roomId)!.get(participant.uid);
        participants.get(roomId)!.set(participant.uid, {
            uid: participant.uid,
            displayName: participant.displayName,
            photoUrl: participant.photoUrl,
            role: existing?.role ?? 'guest',
            joinedAt: existing?.joinedAt ?? now(),
            lastSeen: now(),
        });
        if (!room.participantUids?.includes(participant.uid)) {
            room.participantUids = [...(room.participantUids ?? []), participant.uid];
        }
    },

    async leaveRoom(roomId: string, uid: string): Promise<void> {
        const roomParticipants = participants.get(roomId);
        const p = roomParticipants?.get(uid);
        if (p) {
            p.leftAt = now();
            p.lastSeen = now();
        }
    },

    async endRoom(roomId: string, stats?: {
        peakViewers?: number;
        totalParticipants?: number;
        messageCount?: number;
        finalPositionSec?: number;
    }): Promise<void> {
        const room = rooms.get(roomId);
        if (room) {
            const prevPos = room.state?.currentTime ?? 0;
            const finalPosition = typeof stats?.finalPositionSec === 'number'
                ? Math.max(0, Math.round(stats.finalPositionSec))
                : Math.max(0, Math.round(prevPos));
            let durationSec: number | undefined;
            const start = room.startedAt instanceof Date ? room.startedAt.getTime() : NaN;
            if (Number.isFinite(start) && start > 0) {
                durationSec = Math.max(0, Math.round((Date.now() - start) / 1000));
            }
            room.status = 'ended';
            room.endedAt = now();
            room.updatedAt = now();
            room.state = { isPlaying: false, currentTime: finalPosition, positionAt: Date.now(), playbackRate: room.state?.playbackRate ?? 1 };
            room.finalPositionSec = finalPosition;
            if (typeof durationSec === 'number') room.durationSec = durationSec;
            if (typeof stats?.peakViewers === 'number') room.peakViewers = Math.max(0, Math.round(stats.peakViewers));
            if (typeof stats?.totalParticipants === 'number') room.totalParticipants = Math.max(0, Math.round(stats.totalParticipants));
            if (typeof stats?.messageCount === 'number') room.messageCount = Math.max(0, Math.round(stats.messageCount));
        }
    },

    async updateRoomState(roomId: string, state: WatchRoomState): Promise<void> {
        const room = rooms.get(roomId);
        if (room) {
            room.state = {
                isPlaying: state.isPlaying,
                currentTime: state.currentTime,
                positionAt: Date.now(),
                playbackRate: state.playbackRate,
            };
            room.hostAliveAt = now();
            room.updatedAt = now();
        }
    },

    async setHostAlive(roomId: string): Promise<void> {
        const room = rooms.get(roomId);
        if (room) room.hostAliveAt = now();
    },

    async setParticipantLastSeen(roomId: string, uid: string): Promise<void> {
        const roomParticipants = participants.get(roomId);
        const p = roomParticipants?.get(uid);
        if (p) p.lastSeen = now();
    },

    subscribeToRoom(roomId: string, callback: (room: WatchRoom | null) => void): () => void {
        return subscribeWithPolling(
            () => [rooms.get(roomId) || null],
            (items) => callback(items[0] ?? null)
        );
    },

    async getMyHostedLives(hostUid: string, maxResults = 20): Promise<WatchRoom[]> {
        return [...rooms.values()]
            .filter((r) => r.hostUid === hostUid && r.mode === 'live' && r.status === 'ended')
            .sort((a, b) => {
                const at = a.endedAt instanceof Date ? a.endedAt.getTime() : 0;
                const bt = b.endedAt instanceof Date ? b.endedAt.getTime() : 0;
                return bt - at;
            })
            .slice(0, maxResults);
    },

    async getMyJoinedLives(uid: string, maxResults = 20): Promise<WatchRoom[]> {
        return [...rooms.values()]
            .filter((r) => r.mode === 'live' && r.status === 'ended' && r.hostUid !== uid && (r.participantUids ?? []).includes(uid))
            .sort((a, b) => {
                const at = a.endedAt instanceof Date ? a.endedAt.getTime() : 0;
                const bt = b.endedAt instanceof Date ? b.endedAt.getTime() : 0;
                return bt - at;
            })
            .slice(0, maxResults);
    },

    async getLiveHistoryByVideo(videoId: string, maxResults = 20): Promise<WatchRoom[]> {
        return [...rooms.values()]
            .filter((r) => r.videoId === videoId && r.mode === 'live' && r.status === 'ended')
            .sort((a, b) => {
                const at = a.endedAt instanceof Date ? a.endedAt.getTime() : 0;
                const bt = b.endedAt instanceof Date ? b.endedAt.getTime() : 0;
                return bt - at;
            })
            .slice(0, maxResults);
    },

    async getAllLives(maxResults = 50, onlyActive = false): Promise<WatchRoom[]> {
        return [...rooms.values()]
            .filter((r) => r.mode === 'live' && (!onlyActive || r.status === 'active'))
            .sort((a, b) => {
                const at = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                const bt = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                return bt - at;
            })
            .slice(0, maxResults);
    },

    subscribeToMyLives(uid: string, callback: (roomsList: WatchRoom[]) => void, maxResults = 20): () => void {
        return subscribeWithPolling(
            () => [...rooms.values()]
                .filter((r) => r.hostUid === uid && r.mode === 'live' && r.status === 'ended')
                .sort((a, b) => {
                    const at = a.endedAt instanceof Date ? a.endedAt.getTime() : 0;
                    const bt = b.endedAt instanceof Date ? b.endedAt.getTime() : 0;
                    return bt - at;
                })
                .slice(0, maxResults),
            callback
        );
    },

    subscribeToParticipants(
        roomId: string,
        callback: (participantsList: WatchParticipant[]) => void
    ): () => void {
        return subscribeWithPolling(
            () => Array.from(participants.get(roomId)?.values() || []),
            callback
        );
    },

    async sendMessage(roomId: string, message: Omit<WatchMessage, 'id' | 'createdAt'>): Promise<void> {
        if (!messages.has(roomId)) messages.set(roomId, []);
        messages.get(roomId)!.push({
            id: Math.random().toString(36).slice(2),
            uid: message.uid,
            displayName: message.displayName,
            photoUrl: message.photoUrl,
            text: message.text,
            createdAt: now(),
        });
    },

    subscribeToMessages(
        roomId: string,
        callback: (messagesList: WatchMessage[]) => void,
        maxMessages = 100
    ): () => void {
        return subscribeWithPolling(
            // Same deterministic chronological order as the Firestore service:
            // ascending by timestamp, ties broken by id, last-N window.
            () => [...(messages.get(roomId) || [])]
                .sort((a, b) => {
                    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                    if (aTime !== bTime) return aTime - bTime;
                    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
                })
                .slice(-maxMessages),
            callback
        );
    },
};

// Re-export for convenience (mock consumers use real code generation).
export type { WatchRole };