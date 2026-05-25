import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MediaContent, MediaType } from '../types';
import { movieService, serieService } from '../lib/firestore';
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

                // Essayer de récupérer comme série ou podcast
                const serie = await serieService.getSerieByUid(uid);
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
                    setLoading(false);
                    return;
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">{t('loading') || 'Chargement...'}</div>
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
