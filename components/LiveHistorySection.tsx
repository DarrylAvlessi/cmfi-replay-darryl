import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { WatchRoom } from '../lib/db';

function toDateSafe(v: unknown): Date | null {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
        try { return (v as { toDate: () => Date }).toDate(); } catch { return null; }
    }
    const d = new Date(v as string | number);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatDuration(sec?: number): string {
    if (typeof sec !== 'number' || !Number.isFinite(sec)) return '—';
    const s = Math.max(0, Math.round(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${String(r).padStart(2, '0')}s`;
    return `${r}s`;
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</span>
        <span className="text-[13px] lg:text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
);

const LiveHistorySection: React.FC<{
    hosted: WatchRoom[];
    joined: WatchRoom[];
    isLoading: boolean;
}> = ({ hosted, joined, isLoading }) => {
    const { t } = useAppContext();
    const navigate = useNavigate();
    const [tab, setTab] = useState<'hosted' | 'joined'>('hosted');
    const items = tab === 'hosted' ? hosted : joined;

    return (
        <div className="p-4 lg:p-6 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 mb-3 lg:mb-4">
                <h3 className="text-base lg:text-xl font-serif font-bold flex items-center gap-2">
                    <span className="inline-flex items-center text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full bg-red-600 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
                        {t('liveBadge')}
                    </span>
                    {t('myLives')}
                </h3>
                <div className="grid grid-cols-2 w-full sm:w-auto sm:flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs sm:text-sm">
                    <button
                        onClick={() => setTab('hosted')}
                        className={`px-3 py-2 font-semibold ${tab === 'hosted' ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        {t('hostedLives')} ({hosted.length})
                    </button>
                    <button
                        onClick={() => setTab('joined')}
                        className={`px-3 py-2 font-semibold ${tab === 'joined' ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        {t('joinedLives')} ({joined.length})
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-6 text-sm text-gray-500">{t('loading')}</div>
            ) : items.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">{t('noLivesYet')}</div>
            ) : (
                <div className="space-y-2 lg:space-y-3">
                    {items.map((room) => {
                        const ended = toDateSafe(room.endedAt);
                        return (
                            <div key={room.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 lg:p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm lg:text-base text-gray-900 dark:text-white truncate">
                                            {room.videoTitle?.trim() || room.videoId}
                                        </p>
                                        <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400">
                                            {ended ? ended.toLocaleString() : ''} · {room.roomCode}
                                            {room.hostName ? ` · ${room.hostName}` : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/watch/${room.videoId}`)}
                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold"
                                    >
                                        {t('play')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3 mt-2 lg:mt-3">
                                    <Stat label={t('liveDuration')} value={formatDuration(room.durationSec)} />
                                    <Stat label={t('livePeakViewers')} value={room.peakViewers != null ? String(room.peakViewers) : '—'} />
                                    <Stat label={t('liveParticipantsCount')} value={room.totalParticipants != null ? String(room.totalParticipants) : String(room.participantUids?.length ?? '—')} />
                                    <Stat label={t('liveMessagesCount')} value={room.messageCount != null ? String(room.messageCount) : '—'} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default LiveHistorySection;
