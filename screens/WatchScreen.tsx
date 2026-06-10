import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { movieService, serieService, episodeSerieService, seasonSerieService, EpisodeSerie } from '../lib/firestore';
import { useAppContext } from '../context/AppContext';
import { useMiniPlayerContext } from '../context/MiniPlayerContext';

interface WatchScreenProps {
    onReturnHome: () => void;
}

const WatchScreen: React.FC<WatchScreenProps> = ({ onReturnHome }) => {
    const { t } = useAppContext();
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const { playerData, setPlayerData } = useMiniPlayerContext();
    const [media, setMedia] = useState<MediaContent | null>(null);
    const [episode, setEpisode] = useState<EpisodeSerie | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If player already exists for this uid, no fetch needed
        if (playerData && (
            (playerData.type === 'movie' && playerData.item.id === uid) ||
            (playerData.type === 'episode' && playerData.episode?.uid_episode === uid)
        )) {
            setLoading(false);
            return;
        }

        const fetchMedia = async () => {
            if (!uid) {
                navigate('/home');
                return;
            }

            setLoading(true);
            try {
                const movie = await movieService.getMovieByUid(uid);
                if (movie) {
                    setMedia({
                        id: movie.uid,
                        title: movie.title,
                        description: movie.overview || '',
                        imageUrl: movie.picture_path || movie.poster_path || '',
                        type: MediaType.Movie,
                        duration: movie.runtime_h_m || movie.runtime || '',
                        theme: '',
                        languages: [movie.original_language || 'fr'],
                        video_path_hd: movie.video_path_hd || movie.video_path_sd || '',
                    });
                    setLoading(false);
                    return;
                }

                let episodeData = await episodeSerieService.getEpisodeByUid(uid);

                if (!episodeData) {
                    episodeData = await episodeSerieService.getEpisodeById(uid);
                }

                if (episodeData) {
                    const season = await seasonSerieService.getSeasonByUid(episodeData.uid_season);
                    if (season) {
                        const serie = await serieService.getSerieByUid(season.uid_serie);
                        if (serie) {
                            setMedia({
                                id: serie.uid_serie,
                                title: serie.title_serie,
                                description: serie.overview_serie || '',
                                imageUrl: serie.image_path || '',
                                type: serie.serie_type === 'podcast' ? MediaType.Podcast : MediaType.Series,
                                duration: serie.runtime_h_m || '',
                                theme: '',
                                languages: Array.isArray(serie.lang) ? serie.lang : [serie.lang || 'fr'],
                            });
                            setEpisode(episodeData);
                            setLoading(false);
                            return;
                        }
                    }
                }

                navigate('/home');
            } catch (error) {
                console.error('Erreur lors de la récupération du média:', error);
                navigate('/home');
            }
        };

        fetchMedia();
    }, [uid, navigate]);

    // Set player data when media is loaded
    useEffect(() => {
        if (!media) return;

        const data: any = {
            item: media,
            onBack: () => {
                const route = media.type === MediaType.Series ? 'production' :
                    media.type === MediaType.Movie ? 'documentary' : 'podcast';
                navigate(`/${route}/${media.id}`);
            },
            onReturnHome: () => navigate('/home'),
        };

        if (episode) {
            data.type = 'episode';
            data.episode = episode;
            data.onNavigateEpisode = async (directionOrEpisode: any) => {
                if (!episode) return;
                if (typeof directionOrEpisode !== 'string' && directionOrEpisode?.uid_episode) {
                    navigate(`/watch/${directionOrEpisode.uid_episode}`);
                    return;
                }

                const episodes = await (async () => {
                    const serie = await serieService.getSerieByUid(media.id);
                    if (!serie) return [];
                    const seasons = await seasonSerieService.getSeasonsBySerie(serie.uid_serie);
                    const bySeason = await Promise.all(
                        seasons.map((s: any) => episodeSerieService.getEpisodesBySeason(s.uid_season))
                    );
                    return bySeason.flat();
                })();

                const idx = episodes.findIndex((e: any) => e.uid_episode === episode.uid_episode);
                if (idx === -1) return;
                const dir = directionOrEpisode as 'next' | 'prev';
                const newIdx = dir === 'next' ? idx + 1 : idx - 1;
                if (newIdx < 0 || newIdx >= episodes.length) return;
                const newEp = episodes[newIdx];
                if (newEp?.uid_episode) navigate(`/watch/${newEp.uid_episode}`);
            };
        } else {
            data.type = 'movie';
        }

        setPlayerData(data);
    }, [media, episode]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">{t('loading') || 'Chargement...'}</div>
            </div>
        );
    }

    return null;
};

export default WatchScreen;
