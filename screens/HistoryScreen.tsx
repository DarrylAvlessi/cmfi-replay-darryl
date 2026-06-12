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
        <div className="bg-white dark:bg-black min-h-screen animate-fadeIn">
            <div className="sticky top-0 z-10 bg-white dark:bg-black border-b border-gray-200 dark:border-black">
                <div className="flex items-center px-4 py-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-black transition-colors mr-4"
                        aria-label="Retour"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('history') || 'Mon historique'}
                    </h1>
                </div>
            </div>

            <div className="px-4 py-2 sm:p-4">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <MediaCardSkeleton key={i} />
                        ))}
                    </div>
                ) : historyItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
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
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                            Aucun historique disponible
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                            Votre historique de visionnage apparaîtra ici
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryScreen;

