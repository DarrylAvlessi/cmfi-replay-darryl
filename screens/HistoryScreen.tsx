// screens/HistoryScreen.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { statsVuesService, ContinueWatchingItem, movieService, episodeSerieService } from '../lib/db';
import { MediaContent, MediaType } from '../types';
import { ArrowLeftIcon } from '../components/icons';
import { HistoryCard } from '../components/HistorySection';
import { MediaCardSkeleton } from '../components/Skeleton';

interface HistoryScreenProps {
    onSelectMedia: (item: MediaContent) => void;
    onPlay: (item: MediaContent, episode?: any) => void;
    onBack: () => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectMedia, onPlay, onBack }) => {
    const { t, user } = useAppContext();
    const [historyItems, setHistoryItems] = useState<ContinueWatchingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const items = await statsVuesService.getAllHistory(user.uid, 50);
                setHistoryItems(items);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [user]);

    const handleItemClick = useCallback(async (item: ContinueWatchingItem) => {
        if (item.type === 'movie') {
            // C'est un film
            const movie = await movieService.getMovieByUid(item.uid);
            if (movie) {
                const mediaContent: MediaContent = {
                    id: movie.uid,
                    type: MediaType.Movie,
                    title: movie.title,
                    author: movie.original_title,
                    theme: '',
                    imageUrl: movie.backdrop_path || movie.picture_path || movie.poster_path,
                    duration: movie.runtime_h_m,
                    description: movie.overview,
                    languages: [movie.original_language],
                    video_path_hd: movie.video_path_hd
                };
                onPlay(mediaContent);
            }
        } else {
            // C'est un épisode
            const episodeUid = item.uid_episode || item.uid;
            let episode = null;

            // Essayer de récupérer par UID
            if (episodeUid) {
                episode = await episodeSerieService.getEpisodeByUid(episodeUid);
            }

            // Si pas trouvé et qu'on a un ID de document (fallback legacy)
            if (!episode && item.episodeId) {
                episode = await episodeSerieService.getEpisodeById(item.episodeId);
            }

            if (episode) {
                // S'assurer que l'épisode a un uid_episode pour la navigation
                if (!episode.uid_episode && item.episodeId) {
                    episode.uid_episode = item.episodeId;
                }

                const mediaContent: MediaContent = {
                    id: episode.uid_episode,
                    type: MediaType.Series,
                    title: episode.title_serie,
                    author: episode.title_serie,
                    theme: '',
                    imageUrl: episode.backdrop_path || episode.picture_path,
                    duration: episode.runtime_h_m,
                    description: episode.overviewFr || episode.overview,
                    languages: [],
                    video_path_hd: episode.video_path_hd
                };
                onPlay(mediaContent, episode);
            }
        }
    }, [onPlay]);

    return (
        <div className="broadcast-canvas min-h-screen animate-fadeIn">
            <div className="shell-bar sticky top-0 z-10 border-x-0 border-t-0">
                <div className="mx-auto flex max-w-[1440px] items-center px-4 py-3 lg:px-8 lg:py-4">
                    <button
                        onClick={onBack}
                        className="mr-3 rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:mr-4 dark:text-slate-300 dark:hover:bg-white/5"
                        aria-label={t('back')}
                    >
                        <ArrowLeftIcon className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>
                    <div>
                        <p className="font-mono-meta text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-sky-400">{t('myList')}</p>
                        <h1 className="font-display text-xl font-bold text-slate-900 lg:text-2xl dark:text-white">
                            {t('history') || 'Mon historique'}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
                        {[...Array(10)].map((_, i) => (
                            <MediaCardSkeleton key={i} />
                        ))}
                    </div>
                ) : historyItems.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {historyItems.map((item) => (
                            <div key={item.id} className="w-full h-full">
                                <div className="h-full flex flex-col">
                                    <HistoryCard
                                        item={item}
                                        onClick={() => handleItemClick(item)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="broadcast-panel flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/5 text-blue-600 dark:bg-sky-400/5 dark:text-sky-400">
                            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                        </div>
                        <p className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                            {t('noHistory')}
                        </p>
                        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                            {t('discoverHint')}
                        </p>
                        <button
                            onClick={onBack}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:brightness-110"
                        >
                            {t('discover')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryScreen;
