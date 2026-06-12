// screens/MoviePlayerScreen.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaType } from '../types';
import { Movie, movieService, likeService, viewService, getLastWatchedPositionForMovie } from '../lib/db';
import { updateMetaTags, clearMetaTags } from '../lib/metaTags';
import {
    PlayIcon, PauseIcon, ArrowLeftIcon,
    LikeIcon, ShareIcon, PlusIcon,
    VolumeHighIcon, VolumeMuteIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon,
    BackwardIcon, ForwardPlaybackIcon, CheckIcon, PencilIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import AuthPrompt from '../components/AuthPrompt';
import SuggestTitleModal from '../components/SuggestTitleModal';
import PromotionPlayer from '../components/PromotionPlayer';
import { formatNumber, CommentSection } from '../components/CommentSection';
import { VideoPlayer } from '../components/VideoPlayer';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useDraggable } from '../hooks/useDraggable';
import { useMiniPlayerContext } from '../context/MiniPlayerContext';

// --- Main Screen Component ---
interface PlayableItem {
    id: string;
    type: MediaType;
    title: string;
    imageUrl?: string;
    comments?: Comment[];
    video_path_hd?: string;
    original_language?: string;
}

interface MoviePlayerScreenProps {
    item: PlayableItem;
    onBack: () => void;
    onReturnHome?: () => void;
    forceMini?: boolean;
    onClose?: () => void;
}

const MoviePlayerScreen: React.FC<MoviePlayerScreenProps> = ({ item, onBack, onReturnHome, forceMini = false, onClose }) => {
    const { t, bookmarkedIds, toggleBookmark, userProfile, autoplay } = useAppContext();
    const navigate = useNavigate();
    const [movieData, setMovieData] = useState<Movie | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authAction, setAuthAction] = useState('');
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [videoIsPlaying, setVideoIsPlaying] = useState(false);
    // Sauvegarder l'état de la pub dans sessionStorage pour éviter de la relancer
    const getAdStateKey = () => `ad_shown_movie_${item.id}`;
    const wasAdShown = sessionStorage.getItem(getAdStateKey()) === 'true';
    const [showAd, setShowAd] = useState(!wasAdShown);

    const handleAuthRequired = (action: string) => {
        setAuthAction(action);
        setShowAuthPrompt(true);
    };

    const handleVideoEnded = () => {
        if (!userProfile) {
            handleAuthRequired('continuer à regarder et découvrir plus de contenu');
        }
        // Réinitialiser le flag pour permettre une nouvelle vue si l'utilisateur regarde la vidéo à nouveau
        watchTimeRef.current = 0;
        hasRecordedViewRef.current = false;
    };

    useEffect(() => {
        const fetchMovieData = async () => {
            try {
                const movie = await movieService.getMovieByUid(item.id);
                setMovieData(movie);
            } catch (error) {
                console.error('Error fetching movie data:', error);
            }
        };


        if (item.type === MediaType.Movie) {
            fetchMovieData();
        }
    }, [item.id, item.type]);

    // Fetch like data
    useEffect(() => {
        const fetchLikeData = async () => {
            const itemUid = movieData?.uid || item.id;
            try {
                const count = await likeService.getLikeCount(itemUid);
                setLikeCount(count);

                if (userProfile?.email) {
                    const liked = await likeService.hasUserLiked(itemUid, userProfile.email);
                    setHasLiked(liked);
                }
            } catch (error) {
                console.error('Error fetching like data:', error);
            }
        };

        fetchLikeData();
    }, [item.id, movieData, userProfile]);

    // Track view after 10 seconds of watching (only when video is playing)
    const watchTimeRef = useRef(0);
    const hasRecordedViewRef = useRef(false);

    useEffect(() => {
        // Use movieData.uid if available, otherwise fallback to item.id
        const movieUid = movieData?.uid || item.id;

        if (!movieUid || !userProfile?.uid) return;

        const viewTimer = setInterval(() => {
            if (videoIsPlaying && !hasRecordedViewRef.current) {
                watchTimeRef.current += 1;

                if (watchTimeRef.current >= 10) {
                    hasRecordedViewRef.current = true;
                    viewService.recordView(movieUid, 'movie', userProfile.uid)
                        .catch((error) => {
                            console.error('Erreur lors de l\'enregistrement de la vue:', error);
                        });
                }
            }
        }, 1000);

        return () => {
            clearInterval(viewTimer);
        };
    }, [movieData, userProfile, videoIsPlaying, item.id]);

    // Reset watch time when movie changes
    useEffect(() => {
        watchTimeRef.current = 0;
        hasRecordedViewRef.current = false;
    }, [movieData?.uid, item.id]);

    // Utiliser les données de la collection Movie si disponibles, sinon fallback sur MediaContent
    const displayItem = movieData || item;

    // Mettre à jour les métadonnées Open Graph pour le partage
    useEffect(() => {
        if (displayItem) {
            const movieData = displayItem as Movie;
            updateMetaTags({
                title: displayItem.title,
                description: movieData.overview || `Découvrez "${displayItem.title}" sur CMFI Replay`,
                image: movieData.picture_path,
                url: window.location.href,
                type: 'video.movie'
            });
        }

        // Nettoyer les métadonnées lors du démontage
        return () => {
            clearMetaTags();
        };
    }, [displayItem]);

    const handleShare = async () => {
        if (!userProfile) {
            handleAuthRequired('partager cette vidéo');
            return;
        }

        const shareData = {
            title: item.title,
            text: `Regardez "${item.title}" sur CMFI Replay`,
            url: window.location.href,
        };

        try {
            // Vérifier si l'API Web Share est disponible
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else if (navigator.clipboard) {
                // Fallback 1: Copier dans le presse-papier
                await navigator.clipboard.writeText(shareData.url);
                toast.success('Lien copié dans le presse-papier !', {
                    position: 'bottom-center',
                    autoClose: 2000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'colored',
                });
            } else {
                // Fallback 2: Afficher l'URL à copier manuellement
                const textArea = document.createElement('textarea');
                textArea.value = shareData.url;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    toast.success('Lien copié !', {
                        position: 'bottom-center',
                        autoClose: 2000,
                    });
                } catch (err) {
                    // Fallback 3: Afficher l'URL dans une alerte
                    prompt('Copiez ce lien :', shareData.url);
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            console.error('Erreur lors du partage:', err);
            // Si l'utilisateur a annulé le partage, ne rien faire
            if (err.name !== 'AbortError') {
                toast.error('Impossible de partager, copiez le lien manuellement', {
                    position: 'bottom-center',
                    autoClose: 3000,
                });
            }
            if (err.name !== 'AbortError') {
                toast.error('Erreur lors du partage', {
                    position: 'bottom-center',
                    autoClose: 2000,
                    hideProgressBar: true,
                });
            }
        }
    };

    const handleLike = async () => {
        if (!userProfile) {
            handleAuthRequired('liker cette vidéo');
            return;
        }

        const itemUid = movieData?.uid || item.id;
        const itemTitle = movieData?.title || item.title;

        try {
            const isLiked = await likeService.toggleLike(itemUid, itemTitle, userProfile);
            setHasLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        } catch (error) {
            console.error('Error toggling like:', error);
            toast.error('Erreur lors du like', {
                position: 'bottom-center',
                autoClose: 2000,
            });
        }
    };

    const handleBookmark = () => {
        if (!userProfile) {
            handleAuthRequired('ajouter cette vidéo à votre liste');
            return;
        }
        toggleBookmark(
            movieData ? movieData.uid : item.id,
            movieData?.title || item.title,
            movieData?.overview || '',
            movieData?.backdrop_path || item.imageUrl || '',
            false
        );
    };

    const isBookmarked = bookmarkedIds.includes(movieData ? movieData.uid : item.id);

    const [likeAnimation, setLikeAnimation] = useState(false);
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

    const handleLikeWithAnimation = async () => {
        setLikeAnimation(true);
        // Créer des particules
        const newParticles = Array.from({ length: 12 }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 100,
            y: Math.random() * 100
        }));
        setParticles(newParticles);

        // Appeler la fonction like originale
        await handleLike();

        // Nettoyer les particules après l'animation
        setTimeout(() => {
            setParticles([]);
            setLikeAnimation(false);
        }, 1000);
    };

    const LikeButton: React.FC<{ label: string, value?: string | number, onClick?: () => void, isActive?: boolean }> = ({ label, value, onClick, isActive }) => (
        <button
            onClick={handleLikeWithAnimation}
            className={`relative flex flex-col items-center space-y-1 transition-all duration-300 ${isActive
                ? 'text-red-500 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                }`}
        >
            <div className="relative">
                <div
                    className={`transition-all duration-300 ${likeAnimation ? 'scale-150' : 'scale-100'
                        }`}
                    style={{
                        filter: likeAnimation ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'none',
                        transform: likeAnimation ? 'scale(1.5) rotate(15deg)' : 'scale(1) rotate(0deg)'
                    }}
                >
                    <LikeIcon
                        className={`w-7 h-7 ${isActive ? 'fill-red-500 dark:fill-red-400' : ''}`}
                    />
                </div>
                {/* Particules animées */}
                {particles.map((particle, index) => {
                    const angle = (index / particles.length) * Math.PI * 2;
                    const distance = 40 + Math.random() * 30;
                    return (
                        <div
                            key={particle.id}
                            className="absolute pointer-events-none"
                            style={{
                                left: '50%',
                                top: '50%',
                                animation: `particleFloat 1s ease-out forwards`,
                                animationDelay: `${index * 0.05}s`,
                                '--random-x': Math.cos(angle),
                                '--random-y': Math.sin(angle),
                                '--distance': `${distance}px`
                            } as React.CSSProperties}
                        >
                            <div className="w-2 h-2 bg-red-500 rounded-full opacity-90 shadow-lg shadow-red-500/50" />
                        </div>
                    );
                })}
                {/* Effet de pulse quand actif */}
                {isActive && (
                    <div className="absolute inset-0 animate-ping">
                        <div className="w-7 h-7 bg-red-500 rounded-full opacity-20" />
                    </div>
                )}
            </div>
            <span className={`text-xs font-semibold transition-all duration-300 ${likeAnimation ? 'scale-110' : 'scale-100'
                }`}>
                {value ? formatNumber(Number(value)) : label}
            </span>
        </button>
    );

    const ActionButton: React.FC<{ Icon: React.FC<any>, label: string, value?: string | number, onClick?: () => void, isActive?: boolean }> = ({ Icon, label, value, onClick, isActive }) => (
        <button onClick={onClick} className={`flex flex-col items-center space-y-1 hover:text-amber-500 dark:hover:text-amber-400 ${isActive ? 'text-amber-500 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
            <Icon className="w-7 h-7" />
            <span className="text-xs font-semibold">{value ? formatNumber(Number(value)) : label}</span>
        </button>
    );

    // Créer des callbacks mémorisés pour la publicité
    const handleAdEnd = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(getAdStateKey(), 'true');
    }, []);

    const handleAdSkip = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(getAdStateKey(), 'true');
    }, []);

    // Mettre à jour le titre de la page avec le nom du film
    useEffect(() => {
        if (item?.title) {
            document.title = `${item.title}`;
        }
        
        // Restaurer le titre par défaut lors du démontage du composant
        return () => {
            document.title = 'CMFI Replay';
        };
    }, [item]);

    // Charger la position de lecture précédente
    useEffect(() => {
        const loadPlaybackPosition = async () => {
            if (!userProfile?.uid || !item.id) return;
            
            try {
                const position = await getLastWatchedPositionForMovie(userProfile.uid, item.id);
                if (position > 0) {
                    setInitialPlaybackPosition(position);
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la position de lecture du film:', error);
            }
        };

        loadPlaybackPosition();
    }, [userProfile?.uid, item?.id]);

    const [initialPlaybackPosition, setInitialPlaybackPosition] = useState(0);
    const { isMini, sentinelRef, openMiniPlayer, closeMiniPlayer } = useMiniPlayer({ enabled: !showAd && !forceMini });
    const { position: dragPosition, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, hasDraggedRef } = useDraggable();

    const effectiveMini = isMini || forceMini;

    const handlePipTrigger = useCallback(() => {
      openMiniPlayer();
    }, [openMiniPlayer]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const videoTimeRef = useRef(0);
    const videoIsPlayingRef = useRef(false);

    const handleTimeUpdate = useCallback((time: number) => {
      videoTimeRef.current = time;
    }, []);

    const handlePlayingStateChange = useCallback((playing: boolean) => {
      setVideoIsPlaying(playing);
      videoIsPlayingRef.current = playing;
    }, []);

    return (
        <div className={forceMini ? '' : 'bg-white dark:bg-black min-h-screen animate-fadeIn'}>
            {!forceMini && (
            <header className="absolute top-4 left-4 z-30">
                <button
                    onClick={onBack}
                    className="group p-3 rounded-full text-white bg-black/70 hover:bg-black/90 backdrop-blur-md transition-all duration-300 hover:scale-110 shadow-xl border border-white/10"
                    aria-label="Go back"
                >
                    <ArrowLeftIcon className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                </button>
            </header>
            )}

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 lg:py-8 pt-20">

                {/* Conteneur principal avec grille pour la mise en page */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne de gauche - Lecteur vidéo et métadonnées */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                             {effectiveMini && <div className="w-full aspect-video" aria-hidden="true" />}
                                 <div
                                     className={
                                        effectiveMini
                                            ? `fixed z-50 pointer-events-auto w-48 md:w-64 aspect-video rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-black ${isDragging ? 'cursor-grabbing' : ''}`
                                            : 'relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-2 ring-black/20 dark:ring-white/5'
                                    }
                                    style={effectiveMini ? { position: 'fixed', ...(dragPosition ? { left: dragPosition.x, top: dragPosition.y } : { bottom: 16, right: 16 }), touchAction: 'none', zIndex: 50 } : undefined}
                                >
                                     {effectiveMini && (
                                         <>
                                             <div
                                                 onPointerDown={handlePointerDown}
                                                 onPointerMove={handlePointerMove}
                                                 onPointerUp={handlePointerUp}
                                                 className="absolute inset-0 z-40"
                                                 style={{ touchAction: 'none' }}
                                                 onClick={(e) => { if (hasDraggedRef.current) return; if (forceMini) navigate(`/watch/${item.id}`); else closeMiniPlayer(); }}
                                             />
                                             <button
                                                 onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) { if (v.paused) v.play(); else v.pause(); } }}
                                                 className="absolute bottom-2 left-2 z-50 w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm border border-white/20"
                                                 aria-label={videoIsPlaying ? 'Pause' : 'Play'}
                                            >
                                                {videoIsPlaying ? (
                                                    <PauseIcon className="w-4 h-4" />
                                                ) : (
                                                    <PlayIcon className="w-4 h-4 ml-0.5" />
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (forceMini) navigate(`/watch/${item.id}`); else closeMiniPlayer(); }}
                                                className="absolute bottom-2 right-2 z-50 w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors shadow-lg backdrop-blur-sm border border-white/20"
                                                aria-label="Expand"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (forceMini) { onClose?.(); } else { closeMiniPlayer(); } }}
                                                className="absolute top-2 right-2 z-50 w-7 h-7 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg backdrop-blur-sm border border-white/20"
                                                aria-label="Close"
                                            >
                                                ✕
                                            </button>
                                        </>
                                    )}
                                  <div className={effectiveMini ? 'pointer-events-none' : ''}>
                                   {showAd && (
                                       <PromotionPlayer
                                           onPromotionEnd={handleAdEnd}
                                           onSkip={handleAdSkip}
                                       />
                                   )}
                                    {!showAd && (
                                        <VideoPlayer
                                            key={item.id}
                                            src={item.video_path_hd?.trim() ? item.video_path_hd : ''}
                                            poster={item.imageUrl || ''}
                                            onEnded={handleVideoEnded}
                                            onPlayingStateChange={handlePlayingStateChange}
                                            initialPosition={initialPlaybackPosition}
                                            videoUid={item.id}
                                            isEpisode={false}
                                             hideControls={effectiveMini}
                                             onTimeUpdate={handleTimeUpdate}
                                            onPipTrigger={handlePipTrigger}
                                            videoRef={videoRef}
                                        />
                                   )}
                                  </div>
                              </div>
                        </div>

                        {!forceMini && (
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-3 leading-tight">
                                    {movieData?.title || item.title}
                                </h1>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full font-semibold">
                                        {item.original_language || 'FR'}
                                    </span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <span className="font-medium">
                                        {formatNumber(movieData?.views || 0)} {t('views')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-around py-4 px-2 bg-white/50 dark:bg-gray-900/50 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-black/50 shadow-lg">
                                <LikeButton
                                    label={t('likeVideo')}
                                    value={likeCount}
                                    onClick={handleLike}
                                    isActive={hasLiked}
                                />
                                <ActionButton
                                    Icon={isBookmarked ? CheckIcon : PlusIcon}
                                    label={isBookmarked ? t('addedToList') : t('myList')}
                                    onClick={handleBookmark}
                                    isActive={isBookmarked}
                                />
                                <ActionButton
                                    Icon={ShareIcon}
                                    label={t('share')}
                                    onClick={handleShare}
                                />
                                <ActionButton
                                    Icon={PencilIcon}
                                    label={t('suggest')}
                                    onClick={() => setShowSuggestModal(true)}
                                />
                            </div>
                        </div>
                        )}
                    </div>

                    {/* Colonne de droite - Section des commentaires améliorée */}
                    {!forceMini && (
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto pb-4 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-gray-200 dark:scrollbar-track-black">
                                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200/50 dark:border-black/50 shadow-xl">
                                    <CommentSection
                                        itemUid={movieData?.uid || item.id}
                                        onAuthRequired={handleAuthRequired}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                {!forceMini && showAuthPrompt && (
                    <AuthPrompt
                        action={authAction}
                        onClose={() => setShowAuthPrompt(false)}
                    />
                )}

                {!forceMini && (
                    <SuggestTitleModal
                        isOpen={showSuggestModal}
                        onClose={() => setShowSuggestModal(false)}
                        mediaId={item.id}
                        mediaType="movie"
                        currentTitle={item.title}
                    />
                )}
            </div>
        </div>
    );
};

export default MoviePlayerScreen;
