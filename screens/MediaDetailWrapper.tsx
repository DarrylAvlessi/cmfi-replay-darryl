import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { movieService, serieService, episodeSerieService } from '../lib/db';
import MediaDetailScreen from './MediaDetailScreen';
import { useAppContext } from '../context/AppContext';

interface MediaDetailWrapperProps {
    onPlay: (media: MediaContent) => void;
    playingItem: { media: MediaContent; episode?: any } | null;
}

const MediaDetailWrapper: React.FC<MediaDetailWrapperProps> = ({ onPlay, playingItem }) => {
    const { t } = useAppContext();
    const { uid } = useParams<{ uid: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [media, setMedia] = useState<MediaContent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        const fetchMedia = async () => {
            if (!uid) {
                navigate('/home');
                return;
            }

            setLoading(true);
            setMedia(null);
            try {
                // Essayer de récupérer comme film
                const movie = await movieService.getMovieByUid(uid);
                if (ignore) return;
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

                // Essayer de récupérer comme série ou podcast
                const serie = await serieService.getSerieByUid(uid);
                if (ignore) return;
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
                    setLoading(false);
                    return;
                }

                // Essayer de récupérer comme épisode
                const episode = await episodeSerieService.getEpisodeByUid(uid);
                if (ignore) return;
                if (episode) {
                    navigate(`/watch/${uid}`);
                    return;
                }

                // Si aucun média n'est trouvé
                navigate('/home');
            } catch (error) {
                if (ignore) return;
                console.error('Erreur lors de la récupération du média:', error);
                navigate('/home');
            }
        };

        fetchMedia();

        return () => {
            ignore = true;
        };
    }, [uid, navigate]);

    const handleBack = () => {
        // Rediriger vers la liste appropriée en fonction du type de contenu
        if (media) {
            switch (media.type) {
                case MediaType.Series:
                    navigate('/productions');
                    break;
                case MediaType.Movie:
                    navigate('/documentaries');
                    break;
                case MediaType.Podcast:
                    navigate('/podcasts');
                    break;
                default:
                    navigate(-1); // Fallback à la navigation arrière par défaut
            }
        } else {
            navigate(-1); // Fallback si le média n'est pas chargé
        }
    };

    const handleSelectMedia = (media: MediaContent) => {
        // Convertir le type de média en route appropriée
        const route = media.type === MediaType.Series ? 'production' :
            media.type === MediaType.Movie ? 'documentary' :
                'podcast';
        navigate(`/${route}/${media.id}`);
    };

    if (loading) {
        return (
            <div
                className="broadcast-canvas min-h-screen px-4 py-8 sm:px-6 lg:px-8"
                role="status"
                aria-live="polite"
                aria-busy="true"
            >
                <span className="sr-only">{t('loading') || 'Chargement...'}</span>
                <div className="mx-auto max-w-7xl animate-pulse space-y-6">
                    <div className="h-64 rounded-3xl border border-slate-200/70 bg-slate-200/70 dark:border-slate-800 dark:bg-slate-900 sm:h-80" />
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="space-y-5">
                            <div className="h-12 w-2/3 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                            <div className="flex gap-3">
                                <div className="h-12 w-32 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                                <div className="h-12 w-28 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                                <div className="h-12 w-28 rounded-xl bg-slate-200/80 dark:bg-slate-800" />
                            </div>
                            <div className="h-48 rounded-2xl border border-slate-200/70 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70" />
                        </div>
                        <div className="hidden h-72 rounded-2xl border border-slate-200/70 bg-white/80 dark:border-slate-800 dark:bg-slate-900/70 lg:block" />
                    </div>
                </div>
            </div>
        );
    }

    if (!media) {
        return null;
    }

    return (
        <MediaDetailScreen
            item={media}
            onBack={handleBack}
            onPlay={onPlay}
            playingItem={playingItem}
            onSelectMedia={handleSelectMedia}
            initialSeasonUid={searchParams.get('season') || undefined}
        />
    );
};

export default MediaDetailWrapper;
