import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { watchTogetherService, WatchRoom } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { ArrowLeftIcon } from '../components/icons';
import { toast } from 'react-toastify';

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
    return `${m}m ${String(r).padStart(2, '0')}s`;
}

const ManageLivesScreen: React.FC = () => {
    const navigate = useNavigate();
    const { t, userProfile } = useAppContext();
    const [lives, setLives] = useState<WatchRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');

    const isAdmin = userProfile?.isAdmin ?? (userProfile as unknown as Record<string, unknown>)?.['isAdmin '];

    useEffect(() => {
        if (!isAdmin) return;
        const load = async () => {
            setLoading(true);
            try {
                const all = await watchTogetherService.getAllLives(50, filter === 'active');
                setLives(filter === 'ended' ? all.filter((r) => r.status === 'ended') : all);
            } catch (error) {
                console.error('Error loading lives:', error);
                toast.error('Erreur lors du chargement des directs');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isAdmin, filter]);

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Accès refusé. Administrateur requis.</p>
                    <button onClick={() => navigate('/home')} className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4 md:p-6 max-w-5xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
                <ArrowLeftIcon className="w-4 h-4" /> {t('back')}
            </button>
            <div className="flex items-center justify-between gap-3 mb-4">
                <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
                    <span className="inline-flex items-center text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full bg-red-600 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1" />
                        {t('liveBadge')}
                    </span>
                    {t('allLives')}
                </h1>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
                    {(['all', 'active', 'ended'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 font-semibold ${filter === f ? 'bg-amber-500 text-white' : 'text-gray-600 dark:text-gray-300'}`}
                        >
                            {f === 'all' ? t('allLives') : f === 'active' ? t('activeLives') : t('endedLives')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">{t('loading')}</div>
            ) : lives.length === 0 ? (
                <div className="text-center py-12 text-gray-500">{t('noLivesAdmin')}</div>
            ) : (
                <div className="space-y-3">
                    {lives.map((room) => {
                        const ended = toDateSafe(room.endedAt) ?? toDateSafe(room.createdAt);
                        return (
                            <div key={room.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                                            {room.videoTitle?.trim() || room.videoId}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {ended ? ended.toLocaleString() : ''} · {room.roomCode} · {room.hostName || room.hostUid}
                                            {' · '}
                                            <span className={room.status === 'active' ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                                                {room.status === 'active' ? t('activeLives') : t('endedLives')}
                                            </span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/watch/${room.videoId}`)}
                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold"
                                    >
                                        {t('play')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 text-sm">
                                    <div><span className="text-[10px] uppercase tracking-widest text-gray-400">{t('liveDuration')}</span><p className="font-semibold">{formatDuration(room.durationSec)}</p></div>
                                    <div><span className="text-[10px] uppercase tracking-widest text-gray-400">{t('livePeakViewers')}</span><p className="font-semibold">{room.peakViewers ?? '—'}</p></div>
                                    <div><span className="text-[10px] uppercase tracking-widest text-gray-400">{t('liveParticipantsCount')}</span><p className="font-semibold">{room.totalParticipants ?? room.participantUids?.length ?? '—'}</p></div>
                                    <div><span className="text-[10px] uppercase tracking-widest text-gray-400">{t('liveMessagesCount')}</span><p className="font-semibold">{room.messageCount ?? '—'}</p></div>
                                    <div><span className="text-[10px] uppercase tracking-widest text-gray-400">Video</span><p className="font-semibold truncate">{room.videoId}</p></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ManageLivesScreen;
