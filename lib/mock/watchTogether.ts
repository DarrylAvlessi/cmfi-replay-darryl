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
    }): Promise<WatchRoom> {
        const roomId = makeRoomId();
        const room: WatchRoom = {
            id: roomId,
            roomCode: params.roomCode,
            hostUid: params.hostUid,
            status: 'active',
            videoId: params.videoId,
            videoType: params.videoType,
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
        participants.get(roomId)!.set(participant.uid, {
            uid: participant.uid,
            displayName: participant.displayName,
            photoUrl: participant.photoUrl,
            role: 'guest',
            joinedAt: now(),
            lastSeen: now(),
        });
    },

    async leaveRoom(roomId: string, uid: string): Promise<void> {
        const roomParticipants = participants.get(roomId);
        if (roomParticipants) {
            roomParticipants.delete(uid);
            if (roomParticipants.size === 0) {
                participants.delete(roomId);
            }
        }
    },

    async endRoom(roomId: string): Promise<void> {
        const room = rooms.get(roomId);
        if (room) {
            room.status = 'ended';
            room.updatedAt = now();
            room.state = { isPlaying: false, currentTime: 0, positionAt: Date.now(), playbackRate: 1 };
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
            () => (messages.get(roomId) || []).slice(-maxMessages),
            callback
        );
    },
};

// Re-export for convenience (mock consumers use real code generation).
export type { WatchRole };