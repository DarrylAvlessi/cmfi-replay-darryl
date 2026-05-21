import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { movieService, serieService, episodeSerieService, seasonSerieService, EpisodeSerie } from '../lib/firestore';
import MoviePlayerScreen from './MoviePlayerScreen';
import EpisodePlayerScreen from './EpisodePlayerScreen';
import { useAppContext } from '../context/AppContext';

interface WatchScreenProps {
    onReturnHome: () => void;
}

const WatchScreen: React.FC<WatchScreenProps> = ({ onReturnHome }) => {
    const { t } = useAppContext();
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const [media, setMedia] = useState<MediaContent | null>(null);
    const [episode, setEpisode] = useState<EpisodeSerie | null>(null);
    const [loading, setLoading] = useState(true);
    const [episodesCache, setEpisodesCache] = useState<EpisodeSerie[]>([]);

    useEffect(() => {
        const fetchMedia = async () => {
            if (!uid) {
                navigate('/home');
                return;
            }

            setLoading(true);
            try {
                // Essayer de récupérer comme film
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
                        is_premium: movie.is_premium,
                        premium_text: movie.premium_text
                    });
                    setLoading(false);
                    return;
                }

                // Essayer de récupérer comme épisode
                let episodeData = await episodeSerieService.getEpisodeByUid(uid);

                // Fallback : si pas trouvé par UID, essayer par ID de document (pour les anciens liens)
                if (!episodeData) {
                    episodeData = await episodeSerieService.getEpisodeById(uid);
                }

                if (episodeData) {
                    // Récupérer la saison pour obtenir uid_serie
                    const season = await seasonSerieService.getSeasonByUid(episodeData.uid_season);
                    if (season) {
                        // Récupérer la série associée
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
                                is_premium: serie.premium_text !== undefined && serie.premium_text !== '',
                                premium_text: serie.premium_text
                            });
                            setEpisode(episodeData);
                            setLoading(false);
                            return;
                        }
                    }
                }

                // Si aucun média n'est trouvé
                navigate('/home');
            } catch (error) {
                console.error('Erreur lors de la récupération du média:', error);
                navigate('/home');
            }
        };

        fetchMedia();
    }, [uid, navigate]);

    const handleBack = () => {
        if (media) {
            // Convertir le type de média en route appropriée
            const route = media.type === MediaType.Series ? 'teaching' :
                media.type === MediaType.Movie ? 'documentary' :
                    'podcast';
            navigate(`/${route}/${media.id}`);
        } else {
            navigate(-1);
        }
    };

    const handleNavigateEpisode = async (directionOrEpisode: 'next' | 'prev' | EpisodeSerie) => {
        if (!episode || !media) return;

        try {
            // Si on passe directement un épisode, naviguer vers lui
            if (typeof directionOrEpisode !== 'string') {
                const targetEpisode = directionOrEpisode as EpisodeSerie;
                if (targetEpisode.uid_episode) {
                    navigate(`/watch/${targetEpisode.uid_episode}`);
                    return;
                }
                console.error('Épisode invalide: pas de uid_episode', targetEpisode);
                return;
            }

            // Sinon, c'est une direction ('next' ou 'prev')
            const direction = directionOrEpisode as 'next' | 'prev';
            let allEpisodes = episodesCache;

            // Si le cache est vide, charger tous les épisodes
            if (allEpisodes.length === 0) {
                const serie = await serieService.getSerieByUid(media.id);
                if (!serie) {
                    console.error('Série non trouvée pour media.id:', media.id);
                    return;
                }

                const seasons = await import('../lib/firestore').then(m => m.seasonSerieService.getSeasonsBySerie(serie.uid_serie));
                if (seasons.length === 0) {
                    console.error('Aucune saison trouvée pour la série:', serie.uid_serie);
                    return;
                }

                const episodesBySeason = await Promise.all(
                    seasons.map(async (s) => await episodeSerieService.getEpisodesBySeason(s.uid_season))
                );
                allEpisodes = episodesBySeason.flat();
                setEpisodesCache(allEpisodes);
            }

            if (allEpisodes.length === 0) {
                console.error('Aucun épisode trouvé');
                return;
            }

            const currentIndex = allEpisodes.findIndex(e => e.uid_episode === episode.uid_episode);
            if (currentIndex === -1) {
                console.error('Épisode actuel non trouvé dans la liste:', episode.uid_episode);
                return;
            }

            const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
            if (newIndex < 0 || newIndex >= allEpisodes.length) {
                console.error('Index invalide:', newIndex, 'pour', allEpisodes.length, 'épisodes');
                return;
            }

            const newEpisode = allEpisodes[newIndex];
            if (!newEpisode.uid_episode) {
                console.error('Nouvel épisode sans uid_episode:', newEpisode);
                return;
            }
            
            navigate(`/watch/${newEpisode.uid_episode}`);
        } catch (error) {
            console.error('Erreur lors de la navigation entre épisodes:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">{t('loading') || 'Chargement...'}</div>
            </div>
        );
    }

    if (!media) {
        return null;
    }

    if (episode) {
        return (
            <EpisodePlayerScreen
                item={media}
                episode={episode}
                onBack={handleBack}
                onNavigateEpisode={handleNavigateEpisode}
                onReturnHome={onReturnHome}
            />
        );
    }

    return (
        <MoviePlayerScreen
            item={media}
            onBack={handleBack}
        />
    );
};

export default WatchScreen;
