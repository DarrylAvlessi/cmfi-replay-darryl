// screens/MoviePlayerScreen.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MediaType } from '../types';
import { Movie, movieService, likeService, viewService, getLastWatchedPositionForMovie, WatchRole } from '../lib/db';
import { updateMetaTags, clearMetaTags } from '../lib/metaTags';
import {
    PlayIcon, PauseIcon, ArrowLeftIcon,
    LikeIcon, ShareIcon, PlusIcon, WatchTogetherIcon, EllipsisVerticalIcon, CommentIcon,
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
import WatchTogetherPanel from '../components/WatchTogetherPanel';

import { useTutorial } from '../context/TutorialContext';

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
    const [searchParams] = useSearchParams();
    const inviteRoomCode = searchParams.get('room');
    const [movieData, setMovieData] = useState<Movie | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authAction, setAuthAction] = useState('');
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [showWatchTogether, setShowWatchTogether] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [videoIsPlaying, setVideoIsPlaying] = useState(false);
    const [watchState, setWatchState] = useState<{ role: WatchRole | null; isLive: boolean; liveEdge: number | null; behindBySec: number; isBehind: boolean; jumpToLive: () => void }>({ role: null, isLive: false, liveEdge: null, behindBySec: 0, isBehind: false, jumpToLive: () => {} });
    const { activeTourId } = useTutorial();
    const [showAd, setShowAd] = useState(() => {
      const key = `ad_shown_movie_${item.id}`;
      return sessionStorage.getItem(key) !== 'true' && activeTourId !== 'player' && activeTourId !== 'app-tour';
    });

    // Reset ad state when item changes
    useEffect(() => {
      if (!item?.id) return;
      const key = `ad_shown_movie_${item.id}`;
      setShowAd(sessionStorage.getItem(key) !== 'true' && activeTourId !== 'player' && activeTourId !== 'app-tour');
    }, [item.id, activeTourId]);

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
                const count = await likeService.getLikeCount(itemUid, 'movie');
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
            const isLiked = await likeService.toggleLike(itemUid, itemTitle, userProfile, 'movie');
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
            className={`relative flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-rose-500/30 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:text-rose-400'
            }`}
        >
            <div className="relative shrink-0">
                <div
                    className={`transition-all duration-300 ${likeAnimation ? 'scale-150' : 'scale-100'
                        }`}
                    style={{
                        filter: likeAnimation ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))' : 'none',
                        transform: likeAnimation ? 'scale(1.5) rotate(15deg)' : 'scale(1) rotate(0deg)'
                    }}
                >
                    <LikeIcon
                        className={`h-4 w-4 ${isActive ? 'fill-rose-500 dark:fill-rose-400' : ''}`}
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
            <span className={`transition-all duration-300 ${likeAnimation ? 'scale-110' : 'scale-100'}`}>
                {value ? formatNumber(Number(value)) : label}
            </span>
        </button>
    );

    const ActionButton: React.FC<{ Icon: React.FC<any>, label: string, value?: string | number, onClick?: () => void, isActive?: boolean, className?: string }> = ({ Icon, label, value, onClick, isActive, className }) => (
        <button onClick={onClick} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
            isActive
                ? 'border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-sky-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-500/30 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:text-sky-300'
        } ${className || ''}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span>{value ? formatNumber(Number(value)) : label}</span>
        </button>
    );

    const handleAdEnd = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(`ad_shown_movie_${item.id}`, 'true');
    }, [item.id]);

    const handleAdSkip = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(`ad_shown_movie_${item.id}`, 'true');
    }, [item.id]);

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
    const { isMini, sentinelRef, closeMiniPlayer } = useMiniPlayer({ enabled: !showAd && !forceMini });
    const { position: dragPosition, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, hasDraggedRef } = useDraggable();

    const effectiveMini = isMini || forceMini;

    const videoRef = useRef<HTMLVideoElement>(null);

    const handleGetPlaybackState = useCallback(() => {
        const video = videoRef.current;
        if (!video) return null;
        return { isPlaying: !video.paused, currentTime: video.currentTime, playbackRate: video.playbackRate || 1 };
    }, []);

    const handleApplyRemoteTarget = useCallback((target: { isPlaying: boolean; currentTime: number; positionAt: number; playbackRate: number } | null) => {
        const video = videoRef.current;
        if (!video || !target) return;
        const targetRate = Number.isFinite(target.playbackRate) && target.playbackRate > 0 ? target.playbackRate : 1;
        if (video.playbackRate !== targetRate) {
            video.playbackRate = targetRate;
        }
        if (Math.abs(video.currentTime - target.currentTime) > 1.5) {
            video.currentTime = target.currentTime;
        }
        if (target.isPlaying && video.paused) {
            const playPromise = video.play();
            playPromise?.catch(() => {});
        } else if (!target.isPlaying && !video.paused) {
            video.pause();
        }
    }, []);

    const handlePlayingStateChange = useCallback((playing: boolean) => {
      setVideoIsPlaying(playing);
    }, []);

    return (
        <div className={forceMini ? '' : 'broadcast-canvas min-h-screen animate-fadeIn'}>
            <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
                {!forceMini && (
                    <header className="mb-5 flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={onBack}
                                className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-500/40 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-sky-300"
                                aria-label={t('back')}
                            >
                                <ArrowLeftIcon className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                            </button>
                            <div className="min-w-0">
                                <p className="font-mono-meta text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600 dark:text-sky-400">
                                    CMFI Replay <span className="mx-1.5 text-slate-300 dark:text-slate-700">/</span> {t('movie')}
                                </p>
                                <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{item.title}</p>
                            </div>
                        </div>
                        <span className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 font-mono-meta text-[10px] font-bold uppercase tracking-wider sm:flex ${
                            videoIsPlaying
                                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'border-slate-200 bg-white/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400'
                        }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${videoIsPlaying ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
                            {videoIsPlaying ? t('playing') : t('player')}
                        </span>
                    </header>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-8">
                    <div className="space-y-5 lg:col-span-8">
                        <div className={`relative isolate ${effectiveMini ? '' : 'rounded-[28px] border border-slate-800 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.18),transparent_55%),#030712] p-1.5 shadow-[0_28px_90px_-36px_rgba(37,99,235,0.45)] sm:p-2'}`}>
                            <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                             {effectiveMini && <div className="w-full aspect-video" aria-hidden="true" />}
                                 <div
                                     className={
                                        effectiveMini
                                            ? `fixed z-50 pointer-events-auto w-48 md:w-64 aspect-video rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-black ${isDragging ? 'cursor-grabbing' : ''}`
                                            : 'relative aspect-video w-full overflow-hidden rounded-[22px] bg-black ring-1 ring-white/10'
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
                                                aria-label={t('expand')}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (forceMini) { onClose?.(); } else { closeMiniPlayer(); } }}
                                                className="absolute top-2 right-2 z-50 w-7 h-7 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg backdrop-blur-sm border border-white/20"
                                                aria-label={t('dismiss')}
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
                                            title={item.title}
                                            onEnded={handleVideoEnded}
                                            onPlayingStateChange={handlePlayingStateChange}
                                            initialPosition={initialPlaybackPosition}
                                            videoUid={item.id}
                                            isEpisode={false}
                                              hideControls={effectiveMini}
                                              videoRef={videoRef}
                                              remoteMode={watchState.role === 'guest'}
                                              liveDvr={watchState.role === 'guest' && watchState.isLive}
                                              liveEdge={watchState.liveEdge}
                                              isLive={watchState.isLive && watchState.role !== null}
                                              isBehindLive={watchState.role === 'guest' && watchState.isLive && watchState.isBehind}
                                              behindBySec={watchState.behindBySec}
                                              onJumpToLive={watchState.jumpToLive}
                                        />
                                   )}
                                  </div>
                              </div>
                        </div>

                        {!forceMini && (
                        <div className="space-y-5">
                            <div>
                                <h1 className="font-display mb-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white md:text-4xl">
                                    {movieData?.title || item.title}
                                </h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                    <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 font-mono-meta text-xs font-semibold tracking-wide text-blue-700 dark:text-sky-300">
                                        {item.original_language || 'FR'}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                                    <span className="font-medium">
                                        {formatNumber(movieData?.views || 0)} {t('views')}
                                    </span>
                                </div>
                            </div>

                            <div className="broadcast-panel relative flex flex-wrap items-center gap-2 rounded-2xl p-3 shadow-sm sm:p-4">
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

                                {/* Desktop: boutons séparés */}
                                <ActionButton
                                    Icon={PencilIcon}
                                    label={t('suggest')}
                                    onClick={() => setShowSuggestModal(true)}
                                    className="hidden md:flex"
                                />
                                <ActionButton
                                    Icon={WatchTogetherIcon}
                                    label={t('watchTogether')}
                                    onClick={() => setShowWatchTogether(prev => !prev)}
                                    isActive={showWatchTogether}
                                    className="hidden md:flex"
                                />

                                {/* Mobile: bouton Plus */}
                                <ActionButton
                                    Icon={EllipsisVerticalIcon}
                                    label={t('more')}
                                    onClick={() => setShowMoreMenu(prev => !prev)}
                                    className="flex md:hidden"
                                />

                                {/* Menu dropdown mobile */}
                                {showMoreMenu && (
                                    <div className="broadcast-panel absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl shadow-xl">
                                        <button
                                            onClick={() => { setShowMoreMenu(false); setShowSuggestModal(true); }}
                                            className="w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-sky-500/10"
                                        >
                                            {t('suggest')}
                                        </button>
                                        <button
                                            onClick={() => { setShowMoreMenu(false); setShowWatchTogether(prev => !prev); }}
                                            className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-blue-50 dark:hover:bg-sky-500/10 ${showWatchTogether ? 'text-blue-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-300'}`}
                                        >
                                            {t('watchTogether')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {showWatchTogether && (
                                <div className="watch-together-enter">
                                    <WatchTogetherPanel
                                        videoId={movieData?.uid || item.id}
                                        videoType="movie"
                                        onGetPlaybackState={handleGetPlaybackState}
                                        onApplyRemoteTarget={handleApplyRemoteTarget}
                                        onWatchStateChange={setWatchState}
                                        videoTitle={item.title}
                                        initialCode={inviteRoomCode}
                                    />
                                </div>
                            )}
                        </div>
                        )}
                    </div>

                    {/* Colonne de droite - Section des commentaires améliorée */}
                    {!forceMini && (
                    <aside className="lg:col-span-4">
                        <div className="lg:sticky lg:top-5">
                            <div className="broadcast-panel overflow-hidden rounded-3xl shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
                                    <div>
                                        <p className="font-mono-meta text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-sky-400">{t('community')}</p>
                                        <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white">{t('comments')}</h2>
                                    </div>
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400">
                                        <CommentIcon className="h-4 w-4" />
                                    </span>
                                </div>
                                <div className="max-h-[min(70vh,760px)] overflow-y-auto p-4 sm:p-5">
                                    <CommentSection
                                        itemUid={movieData?.uid || item.id}
                                        onAuthRequired={handleAuthRequired}
                                    />
                                </div>
                            </div>
                        </div>
                    </aside>
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
