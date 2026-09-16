import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserGroupIcon, CheckIcon, ArrowRightIcon, ArrowLeftStartOnRectangleIcon, PaperAirplaneIcon, LinkIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../context/AppContext';
import { useWatchTogether } from '../hooks/useWatchTogether';
import { WatchParticipant, WatchRole, WatchRoom, WatchSyncTarget } from '../lib/db';

interface WatchTogetherPanelProps {
    videoId: string;
    videoType: 'movie' | 'episode';
    enabled?: boolean;
    onGetPlaybackState?: () => { isPlaying: boolean; currentTime: number; playbackRate: number } | null;
    onApplyRemoteTarget?: (target: WatchSyncTarget | null) => void;
    onRoleChange?: (role: WatchRole | null) => void;
    // Room code from a shareable invite link (?room=CODE). Prefills the join
    // field and triggers a one-time auto-join for authenticated guests.
    initialCode?: string | null;
}

const buildInviteUrl = (room: WatchRoom): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/watch/${room.videoId}?room=${room.roomCode}`;
};

const ParticipantRow: React.FC<{ participant: WatchParticipant; isSelf: boolean }> = ({
    participant,
    isSelf,
}) => (
    <div className="flex items-center gap-3 py-2">
        <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                {participant.photoUrl ? (
                    <img
                        src={participant.photoUrl}
                        alt={participant.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                    />
                ) : null}
                {!participant.photoUrl && (
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {(participant.displayName || 'U').charAt(0).toUpperCase()}
                    </span>
                )}
            </div>
            {participant.role === 'host' && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
                    ★
                </span>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {participant.displayName}
                {isSelf && <span className="text-gray-500 dark:text-gray-400"> (vous)</span>}
            </p>
        </div>
        {participant.role === 'host' && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400">
                Host
            </span>
        )}
    </div>
);

const WatchTogetherPanel: React.FC<WatchTogetherPanelProps> = ({ videoId, videoType, enabled = true, onGetPlaybackState, onApplyRemoteTarget, onRoleChange, initialCode }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const autoJoinAttemptedRef = useRef(false);
    const { t, isAuthenticated, userProfile } = useAppContext();
    const {
        room,
        participants,
        messages,
        role,
        isInRoom,
        isBusy,
        isChatBusy,
        error,
        notice,
        createRoom,
        joinRoom,
        leaveRoom,
        sendMessage,
        dismissError,
    } = useWatchTogether({
        videoId,
        videoType,
        enabled,
        getPlaybackState: onGetPlaybackState,
        onApplyRemoteTarget,
    });

    const [joinCode, setJoinCode] = useState(initialCode ?? '');
    const [copied, setCopied] = useState(false);
    const [chatDraft, setChatDraft] = useState('');

    const stripRoomParam = () => {
        if (!searchParams.get('room')) return;
        const next = new URLSearchParams(searchParams);
        next.delete('room');
        setSearchParams(next, { replace: true });
    };

    // After joining: if the room belongs to a different video, redirect to it
    // (keeping ?room= so the new page rejoins); otherwise consume the param.
    const afterJoin = (joinedRoom: WatchRoom | null, code: string) => {
        if (!joinedRoom) return;
        const normalized = code.trim().toUpperCase();
        if (joinedRoom.videoId && joinedRoom.videoId !== videoId) {
            navigate(`/watch/${joinedRoom.videoId}?room=${normalized}`, { replace: true });
            return;
        }
        setJoinCode('');
        stripRoomParam();
    };

    const handleCopyInviteLink = async () => {
        if (!room) return;
        const inviteUrl = buildInviteUrl(room);
        try {
            if (navigator.share) {
                await navigator.share({ title: t('watchTogether'), url: inviteUrl });
                return;
            }
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch (err) {
            // User dismissed the share sheet: not an error. Otherwise fall back
            // to clipboard so there is always a way to copy the link.
            if (err instanceof Error && err.name === 'AbortError') return;
            try {
                await navigator.clipboard.writeText(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
            } catch {
                // Clipboard may be unavailable; silently ignore for the POC.
            }
        }
    };

    const handleJoin = async () => {
        const joinedRoom = await joinRoom(joinCode);
        afterJoin(joinedRoom, joinCode);
    };

    // Notify the hosting screen of role changes so it can lock guest controls.
    const onRoleChangeRef = useRef(onRoleChange);
    useEffect(() => {
        onRoleChangeRef.current = onRoleChange;
    }, [onRoleChange]);
    useEffect(() => {
        onRoleChangeRef.current?.(role);
    }, [role]);

    // One-time auto-join from a shareable invite link (?room=CODE).
    useEffect(() => {
        if (!initialCode || !isAuthenticated || isInRoom || isBusy || autoJoinAttemptedRef.current) return;
        autoJoinAttemptedRef.current = true;
        joinRoom(initialCode).then((joinedRoom) => {
            afterJoin(joinedRoom, initialCode);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCode, isAuthenticated, isInRoom, isBusy]);

    const handleSendChat = async () => {
        const text = chatDraft.trim();
        if (!text) return;
        await sendMessage(text);
        setChatDraft('');
    };

    return (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-gray-200/50 dark:border-black/50 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        {t('watchTogether')}
                    </h3>
                </div>
                {isInRoom && (
                    <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full ${
                        role === 'host'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    }`}>
                        {role === 'host' ? t('youAreHost') : t('youAreGuest')}
                    </span>
                )}
            </div>

            {!isAuthenticated ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('loginToWatchTogether')}</p>
            ) : !isInRoom ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('watchTogetherDesc')}</p>

                    <button
                        onClick={createRoom}
                        disabled={isBusy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        <UserGroupIcon className="w-4 h-4" />
                        {isBusy ? t('creatingRoom') : t('createRoom')}
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                        <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
                    </div>

                    <div className="flex gap-2">
                        <input
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
                            placeholder={t('joinCodePlaceholder')}
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase tracking-widest"
                            maxLength={8}
                        />
                        <button
                            onClick={handleJoin}
                            disabled={isBusy || joinCode.trim().length < 4}
                            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isBusy ? t('joiningRoom') : t('joinRoom')}
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {notice && (
                        <div className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100/60 dark:bg-green-900/30 rounded-lg px-3 py-2">
                            {notice}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('roomCode')}</p>
                            <p className="text-xl md:text-2xl font-black tracking-[0.3em] text-gray-900 dark:text-white">
                                {room?.roomCode}
                            </p>
                        </div>
                        <button
                            onClick={handleCopyInviteLink}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
                        >
                            {copied ? <CheckIcon className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                            {copied ? t('inviteLinkCopied') : t('copyInviteLink')}
                        </button>
                    </div>

                    {role === 'guest' && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {t('hostControlsPlayback')}
                        </p>
                    )}

                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            {t('participants')} ({participants.length})
                        </p>
                        {participants.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500">{t('noParticipantsYet')}</p>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {participants.map((p) => (
                                    <ParticipantRow key={p.uid} participant={p} isSelf={p.uid === userProfile?.uid} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            {t('chatTitle')}
                        </p>
                        {messages.length > 0 && (
                            <div className="max-h-44 overflow-y-auto space-y-2 pr-1 mb-2 scrollbar-thin scrollbar-thumb-gray-400">
                                {messages.map((m) => (
                                    <div key={m.id} className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                                            {m.photoUrl ? (
                                                <img
                                                    src={m.photoUrl}
                                                    alt={m.displayName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">
                                                    {(m.displayName || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-900 dark:text-white">
                                                <span className="font-semibold">{m.displayName}</span>
                                                <span className="text-gray-400 dark:text-gray-500 ml-1.5">
                                                    {new Date(
                                                        m.createdAt instanceof Date ? m.createdAt : new Date(0)
                                                    ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 break-words">{m.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input
                                value={chatDraft}
                                onChange={(e) => setChatDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                                placeholder={t('chatPlaceholder')}
                                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                maxLength={500}
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={isChatBusy || !chatDraft.trim()}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('chatSend')}
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={leaveRoom}
                        disabled={isBusy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors disabled:opacity-60"
                    >
                        <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
                        {role === 'host' ? t('endRoom') : t('leaveRoom')}
                    </button>
                </div>
            )}

            {error && !isInRoom && (
                <div className="mt-3 flex items-start justify-between gap-2 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100/60 dark:bg-red-900/30 rounded-lg px-3 py-2">
                    <span>{error}</span>
                    <button onClick={dismissError} className="shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold" aria-label="Close">
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
};

export default WatchTogetherPanel;