import { db } from '../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    onSnapshot,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import {
    WatchRoom,
    WatchRoomState,
    WatchParticipant,
    WatchMessage,
    WatchRole,
} from './types';
import {
    WATCH_ROOMS_COLLECTION,
    WATCH_ROOMS_PARTICIPANTS_COLLECTION,
    WATCH_ROOMS_MESSAGES_COLLECTION,
} from './constants';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
    return code;
}

// --- Helpers ---

const roomsRef = () => collection(db, WATCH_ROOMS_COLLECTION);
const participantsRef = (roomId: string) =>
    collection(db, WATCH_ROOMS_COLLECTION, roomId, WATCH_ROOMS_PARTICIPANTS_COLLECTION);
const messagesRef = (roomId: string) =>
    collection(db, WATCH_ROOMS_COLLECTION, roomId, WATCH_ROOMS_MESSAGES_COLLECTION);

const toDate = (value: any): Date => {
    if (!value) return new Date(0);
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value);
    return new Date(0);
};

export const parseWatchRoom = (docData: any, roomId: string): WatchRoom => ({
    id: roomId,
    roomCode: docData.roomCode || '',
    hostUid: docData.hostUid || '',
    status: docData.status || 'ended',
    videoId: docData.videoId || '',
    videoType: docData.videoType || 'episode',
    mode: docData.mode === 'live' ? 'live' : 'replay',
    startedAt: docData.startedAt ? toDate(docData.startedAt) : undefined,
    endedAt: docData.endedAt ? toDate(docData.endedAt) : undefined,
    createdAt: toDate(docData.createdAt),
    updatedAt: docData.updatedAt ? toDate(docData.updatedAt) : undefined,
    hostAliveAt: docData.hostAliveAt ? toDate(docData.hostAliveAt) : undefined,
    state: docData.state || undefined,
});

export const parseWatchParticipant = (docData: any, uid: string): WatchParticipant => ({
    uid,
    displayName: docData.displayName || '',
    photoUrl: docData.photoUrl,
    role: docData.role || 'guest',
    joinedAt: toDate(docData.joinedAt),
    lastSeen: toDate(docData.lastSeen),
});

// --- Room lifecycle ---

export const watchTogetherService = {
    generateRoomCode,

    async createRoom(params: {
        roomCode: string;
        hostUid: string;
        hostName: string;
        hostPhotoUrl?: string;
        videoId: string;
        videoType: 'movie' | 'episode';
        mode?: 'replay' | 'live';
    }): Promise<WatchRoom> {
        const now = Timestamp.now();
        const mode = params.mode === 'live' ? 'live' : 'replay';
        const roomRef = doc(roomsRef());
        await setDoc(roomRef, {
            roomCode: params.roomCode,
            hostUid: params.hostUid,
            status: 'active',
            videoId: params.videoId,
            videoType: params.videoType,
            mode,
            ...(mode === 'live' ? { startedAt: now } : {}),
            createdAt: now,
            updatedAt: now,
            hostAliveAt: now,
            state: {
                isPlaying: false,
                currentTime: 0,
                positionAt: Date.now(),
                playbackRate: 1,
            },
        });

        await setDoc(doc(participantsRef(roomRef.id), params.hostUid), {
            displayName: params.hostName,
            photoUrl: params.hostPhotoUrl || null,
            role: 'host' as WatchRole,
            joinedAt: now,
            lastSeen: now,
        });

        const roomSnap = await getDoc(roomRef);
        return parseWatchRoom(roomSnap.data()!, roomRef.id);
    },

    async getRoomByCode(roomCode: string): Promise<WatchRoom | null> {
        try {
            const q = query(
                roomsRef(),
                where('roomCode', '==', roomCode),
                where('status', '==', 'active'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            const roomData = snapshot.docs[0];
            return parseWatchRoom(roomData.data(), roomData.id);
        } catch (error) {
            console.error('Error getting room by code:', error);
            return null;
        }
    },

    async getRoom(roomId: string): Promise<WatchRoom | null> {
        try {
            const roomRef = doc(roomsRef(), roomId);
            const snap = await getDoc(roomRef);
            if (!snap.exists()) return null;
            return parseWatchRoom(snap.data(), snap.id);
        } catch (error) {
            console.error('Error getting room:', error);
            return null;
        }
    },

    async joinRoom(roomId: string, participant: {
        uid: string;
        displayName: string;
        photoUrl?: string;
    }): Promise<void> {
        const now = Timestamp.now();
        await setDoc(doc(participantsRef(roomId), participant.uid), {
            displayName: participant.displayName,
            photoUrl: participant.photoUrl || null,
            role: 'guest' as WatchRole,
            joinedAt: now,
            lastSeen: now,
        });
    },

    async leaveRoom(roomId: string, uid: string): Promise<void> {
        try {
            await deleteDoc(doc(participantsRef(roomId), uid));
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    },

    async endRoom(roomId: string): Promise<void> {
        try {
            await updateDoc(doc(roomsRef(), roomId), {
                status: 'ended',
                updatedAt: serverTimestamp(),
                endedAt: serverTimestamp(),
                state: {
                    isPlaying: false,
                    currentTime: 0,
                    positionAt: Date.now(),
                    playbackRate: 1,
                },
            });
        } catch (error) {
            console.error('Error ending room:', error);
        }
    },

    async updateRoomState(roomId: string, state: WatchRoomState): Promise<void> {
        try {
            await updateDoc(doc(roomsRef(), roomId), {
                state: {
                    isPlaying: state.isPlaying,
                    currentTime: state.currentTime,
                    positionAt: Date.now(),
                    playbackRate: state.playbackRate,
                },
                hostAliveAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating room state:', error);
        }
    },

    async setHostAlive(roomId: string): Promise<void> {
        try {
            await updateDoc(doc(roomsRef(), roomId), {
                hostAliveAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating host alive:', error);
        }
    },

    async setParticipantLastSeen(roomId: string, uid: string): Promise<void> {
        try {
            await updateDoc(doc(participantsRef(roomId), uid), {
                lastSeen: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating participant last seen:', error);
        }
    },

    // --- Subscriptions ---

    subscribeToRoom(roomId: string, callback: (room: WatchRoom | null) => void): () => void {
        const unsubscribe = onSnapshot(
            doc(roomsRef(), roomId),
            (snap) => {
                if (!snap.exists()) {
                    callback(null);
                    return;
                }
                callback(parseWatchRoom(snap.data(), snap.id));
            },
            (error) => {
                console.error('Error subscribing to room:', error);
            }
        );
        return unsubscribe;
    },

    subscribeToParticipants(
        roomId: string,
        callback: (participants: WatchParticipant[]) => void
    ): () => void {
        const q = query(
            participantsRef(roomId),
            orderBy('joinedAt', 'asc')
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const participants = snapshot.docs.map((docSnap) =>
                    parseWatchParticipant(docSnap.data(), docSnap.id)
                );
                callback(participants);
            },
            (error) => {
                console.error('Error subscribing to participants:', error);
            }
        );
        return unsubscribe;
    },

    // --- Messages ---

    async sendMessage(roomId: string, message: Omit<WatchMessage, 'id' | 'createdAt'>): Promise<void> {
        try {
            const msgRef = doc(messagesRef(roomId));
            await setDoc(msgRef, {
                uid: message.uid,
                displayName: message.displayName,
                photoUrl: message.photoUrl || null,
                text: message.text,
                // Server clock: the single source of truth for cross-device ordering.
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    },

    subscribeToMessages(
        roomId: string,
        callback: (messages: WatchMessage[]) => void,
        maxMessages = 100
    ): () => void {
        const q = query(
            messagesRef(roomId),
            orderBy('createdAt', 'desc'),
            limit(maxMessages)
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                // Deterministic chronological order: sort on the raw snapshot
                // values (not the mapped Dates) so ties break by doc id and
                // pending writes (createdAt still null) sort last instead of
                // first. The desc+limit query keeps the last-N window.
                const messages = snapshot.docs
                    .map((docSnap) => ({ docSnap, data: docSnap.data() }))
                    .sort((a, b) => {
                        const aTime = a.data.createdAt?.toMillis?.() ?? Number.POSITIVE_INFINITY;
                        const bTime = b.data.createdAt?.toMillis?.() ?? Number.POSITIVE_INFINITY;
                        if (aTime !== bTime) return aTime - bTime;
                        return a.docSnap.id < b.docSnap.id ? -1 : a.docSnap.id > b.docSnap.id ? 1 : 0;
                    })
                    .map(({ docSnap, data }) => ({
                        id: docSnap.id,
                        uid: data.uid || '',
                        displayName: data.displayName || '',
                        photoUrl: data.photoUrl,
                        text: data.text || '',
                        createdAt: toDate(data.createdAt),
                    }) as WatchMessage);
                callback(messages);
            },
            (error) => {
                console.error('Error subscribing to messages:', error);
            }
        );
        return unsubscribe;
    },
};