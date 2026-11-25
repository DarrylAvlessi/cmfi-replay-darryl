// screens/EpisodePlayerScreen.tsx

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MediaContent } from '../types';
import { EpisodeSerie, episodeSerieService, seasonSerieService, serieService, likeService, viewService, getLastWatchedPosition, SeasonSerie, WatchRole } from '../lib/db';
import {
    PlayIcon, PauseIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon,
    LikeIcon, ShareIcon, PlusIcon, WatchTogetherIcon, EllipsisVerticalIcon, CommentIcon,
    VolumeHighIcon, VolumeMuteIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon,
    BackwardIcon, ForwardPlaybackIcon, CheckIcon, PencilIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import AuthPrompt from '../components/AuthPrompt';
import SuggestTitleModal from '../components/SuggestTitleModal';
import PromotionPlayer from '../components/PromotionPlayer';
import { updateMetaTags, clearMetaTags } from '../lib/metaTags';
import { formatNumber, CommentSection } from '../components/CommentSection';
import { VideoPlayer } from '../components/VideoPlayer';
import { useMiniPlayer } from '../hooks/useMiniPlayer';
import { useDraggable } from '../hooks/useDraggable';
import WatchTogetherPanel from '../components/WatchTogetherPanel';
import YouTubePlayer from '../components/YouTubePlayer';
import { isYouTubeEpisode, youTubeIdFromEpisode, isYouTubeSeason, seasonLabel } from '../lib/youtubeApi';

import { useTutorial } from '../context/TutorialContext';

// --- Main Screen Component ---
interface EpisodePlayerScreenProps {
    item: MediaContent;
    episode: EpisodeSerie;
    onBack: () => void;
    onNavigateEpisode: (direction: 'next' | 'prev' | EpisodeSerie) => void;
    onReturnHome: () => void;
    forceMini?: boolean;
    onClose?: () => void;
}

const EpisodePlayerScreen: React.FC<EpisodePlayerScreenProps> = ({ item, episode, onBack, onNavigateEpisode, onReturnHome, forceMini = false, onClose }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteRoomCode = searchParams.get('room');
    const { t, bookmarkedIds, toggleSeriesBookmark, userProfile, autoplay } = useAppContext();
    const [episodesInSeason, setEpisodesInSeason] = useState<EpisodeSerie[]>([]);
    const [currentSeason, setCurrentSeason] = useState<SeasonSerie | null>(null);
    const [serieUid, setSerieUid] = useState<string | null>(null);
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
      const key = `ad_shown_${episode.uid_episode}`;
      return sessionStorage.getItem(key) !== 'true' && activeTourId !== 'player' && activeTourId !== 'app-tour';
    });
    const [initialPlaybackPosition, setInitialPlaybackPosition] = useState(0);

    // Reset ad state when episode changes
    useEffect(() => {
      if (!episode?.uid_episode) return;
      const key = `ad_shown_${episode.uid_episode}`;
      setShowAd(sessionStorage.getItem(key) !== 'true' && activeTourId !== 'player' && activeTourId !== 'app-tour');
    }, [episode.uid_episode, activeTourId]);

    const { isMini, sentinelRef, closeMiniPlayer } = useMiniPlayer({ enabled: !showAd && !forceMini });
    const { position: dragPosition, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, hasDraggedRef } = useDraggable();

    const effectiveMini = isMini || forceMini;

    const handleAuthRequired = (action: string) => {
        setAuthAction(action);
        setShowAuthPrompt(true);
    };

    // Récupérer les informations de la saison
    useEffect(() => {
        const fetchSeasonInfo = async () => {
            try {
                const season = await seasonSerieService.getSeasonByUid(episode.uid_season);
                if (season) {
                    setCurrentSeason(season);
                    setSerieUid(season.uid_serie);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de la saison:', error);
            }
        };
        fetchSeasonInfo();
    }, [episode.uid_season]);

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const serie = await serieService.getSerieByUid(item.id);
                if (!serie) { 
                    setEpisodesInSeason([]);
                    return; 
                }
                setEpisodesInSeason(
                    await episodeSerieService.getEpisodesBySeason(episode.uid_season)
                );
            } catch (error) {
                console.error('Error fetching episodes list:', error);
                setEpisodesInSeason([]);
            }
        };
        fetchEpisodes();
    }, [item.id, episode.uid_season]);

    // Fetch like data
    useEffect(() => {
        const fetchLikeData = async () => {
            const itemUid = episode.uid_episode;
            try {
                const count = await likeService.getLikeCount(itemUid, 'episode');
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
    }, [episode.uid_episode, userProfile]);

    // Mettre à jour le titre de la page avec le nom de l'épisode
    useEffect(() => {
        if (episode?.title) {
            document.title = `${episode.title}`;
        }
        
        // Restaurer le titre par défaut lors du démontage du composant
        return () => {
            document.title = 'CMFI Replay';
        };
    }, [episode]);

    // Charger la position de lecture précédente
    useEffect(() => {
        const loadPlaybackPosition = async () => {
            if (!userProfile?.uid || !episode?.uid_episode) return;
            
            try {
                const position = await getLastWatchedPosition(userProfile.uid, episode.uid_episode);
                if (position > 0) {
                    setInitialPlaybackPosition(position);
                }
            } catch (error) {
                console.error('Erreur lors du chargement de la position de lecture:', error);
            }
        };

        loadPlaybackPosition();
    }, [userProfile?.uid, episode?.uid_episode]);

    // Track view after 10 seconds of watching (only when video is playing)
    const watchTimeRef = useRef(0);
    const hasRecordedViewRef = useRef(false);

    useEffect(() => {
        if (!episode?.uid_episode || !userProfile?.uid) return;

        const viewTimer = setInterval(() => {
            if (videoIsPlaying && !hasRecordedViewRef.current) {
                watchTimeRef.current += 1;

                if (watchTimeRef.current >= 10) {
                    hasRecordedViewRef.current = true;
                    // Enregistrer la vue
                    viewService.recordView(episode.uid_episode, 'episode', userProfile.uid)
                        .catch((error) => {
                            console.error('Erreur lors de l\'enregistrement de la vue:', error);
                        });
                }
            }
        }, 1000);

        return () => {
            clearInterval(viewTimer);
        };
    }, [episode, userProfile, videoIsPlaying]);

    // Reset watch time when episode changes
    useEffect(() => {
        watchTimeRef.current = 0;
        hasRecordedViewRef.current = false;
    }, [episode?.uid_episode]);

    // Utiliser les données EpisodeSerie passées en prop
    const displayEpisode = episode;

    // Mettre à jour les métadonnées Open Graph pour le partage
    useEffect(() => {
        if (displayEpisode) {
            updateMetaTags({
                title: displayEpisode.title,
                description: displayEpisode.overview || displayEpisode.overviewFr || `Épisode ${displayEpisode.episode_numero} de ${displayEpisode.title_serie}`,
                image: displayEpisode.picture_path,
                url: window.location.href,
                type: 'video.episode'
            });
        }

        // Nettoyer les métadonnées lors du démontage
        return () => {
            clearMetaTags();
        };
    }, [displayEpisode]);

    const handleShare = async () => {
        if (!userProfile) {
            handleAuthRequired('partager cette vidéo');
            return;
        }

        const shareData = {
            title: displayEpisode.title,
            text: `Regardez "${displayEpisode.title}" sur CMFI Replay`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Lien copié dans le presse-papier !', {
                    position: 'bottom-center',
                    autoClose: 2000,
                    hideProgressBar: true,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: 'colored',
                });
            }
        } catch (err) {
            console.error('Erreur lors du partage:', err);
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

        const itemUid = episode.uid_episode;
        const itemTitle = episode.title;

        try {
            const isLiked = await likeService.toggleLike(itemUid, itemTitle, userProfile, 'episode');
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
        toggleSeriesBookmark(
            item.id,
            episode.title,
            episode.overview || episode.overviewFr || '',
            episode.backdrop_path || episode.picture_path || '',
            episode.video_path_hd || episode.video_path_sd || '',
            episode.runtime_h_m || ''
        );
    };

    const isBookmarked = bookmarkedIds.includes(item.id);

    const currentIndex = useMemo(() => {
        if (!episode || episodesInSeason.length === 0) return -1;
        let idx = episodesInSeason.findIndex(e => e.uid_episode === episode.uid_episode);
        if (idx === -1) {
            idx = episodesInSeason.findIndex(e => e.episode_numero === episode.episode_numero && e.title === episode.title);
        }
        return idx;
    }, [episodesInSeason, episode]);

    const hasPrevEpisode = currentIndex > 0;
    const hasNextEpisode = currentIndex !== -1 && currentIndex < episodesInSeason.length - 1;

    const handleVideoEnded = () => {
        if (!userProfile) {
            handleAuthRequired('continuer à regarder et découvrir plus de contenu');
            return;
        }

        // Réinitialiser le flag pour permettre une nouvelle vue si l'utilisateur regarde la vidéo à nouveau
        watchTimeRef.current = 0;
        hasRecordedViewRef.current = false;

        if (autoplay && hasNextEpisode) {
            onNavigateEpisode('next');
        }
    };

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

    const handleAdEnd = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(`ad_shown_${episode.uid_episode}`, 'true');
    }, [episode.uid_episode]);

    const handleAdSkip = useCallback(() => {
        setShowAd(false);
        sessionStorage.setItem(`ad_shown_${episode.uid_episode}`, 'true');
    }, [episode.uid_episode]);

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
                                    CMFI Replay <span className="mx-1.5 text-slate-300 dark:text-slate-700">/</span>
                                    {currentSeason && isYouTubeSeason(currentSeason) ? seasonLabel(currentSeason, t('season')) : t('series')}
                                </p>
                                <div className="flex min-w-0 items-center gap-2 text-sm">
                                    {currentSeason && serieUid && (
                                        <>
                                            <button
                                                onClick={() => navigate(`/production/${serieUid}`)}
                                                className="truncate font-semibold text-slate-700 transition hover:text-blue-600 dark:text-slate-200 dark:hover:text-sky-300"
                                            >
                                                {item.title}
                                            </button>
                                            <span className="shrink-0 text-slate-400">·</span>
                                        </>
                                    )}
                                    <span className="truncate font-medium text-slate-500 dark:text-slate-400">{displayEpisode.title}</span>
                                </div>
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
                                               onClick={(e) => { if (hasDraggedRef.current) return; if (forceMini) navigate(`/watch/${episode.uid_episode}`); else closeMiniPlayer(); }}
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
                                              onClick={(e) => { e.stopPropagation(); if (forceMini) navigate(`/watch/${episode.uid_episode}`); else closeMiniPlayer(); }}
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
                                      {!showAd && isYouTubeEpisode(episode) && youTubeIdFromEpisode(episode) && (
                                          <YouTubePlayer
                                              key={episode.uid_episode || episode.title}
                                              videoId={youTubeIdFromEpisode(episode) as string}
                                              title={episode.title}
                                          />
                                      )}
                                      {!showAd && !isYouTubeEpisode(episode) && (
                                          <VideoPlayer
                                              key={episode.uid_episode || episode.title}
                                              src={episode.video_path_hd?.trim() ? episode.video_path_hd : episode.video_path_sd}
                                              poster={episode.picture_path || item.imageUrl}
                                              title={displayEpisode.title}
                                              onUnavailable={onReturnHome}
                                              onEnded={handleVideoEnded}
                                              onPlayingStateChange={handlePlayingStateChange}
                                              initialPosition={initialPlaybackPosition}
                                              videoUid={episode.uid_episode}
                                              isEpisode={true}
                                              showAutoplayToggle={true}
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
                                <h1 className="font-display mb-2 truncate text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white md:text-4xl">
                                    {displayEpisode.title}
                                </h1>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 md:mt-0 md:gap-4">
                                    <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 font-mono-meta text-xs font-semibold tracking-wide text-blue-700 dark:text-sky-300">
                                        {item.author || item.theme}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                                    <span className="font-medium">
                                        {formatNumber(displayEpisode.views || 0)} {t('views')}
                                    </span>
                                </div>
                            </div>

                            <div className="broadcast-panel relative flex flex-wrap items-center gap-2 rounded-2xl p-3 shadow-sm sm:p-4">
                                <LikeButton
                                    label={hasLiked ? (t('likeVideo') + ' ✓') : t('likeVideo')}
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

                            <div className="flex items-center justify-between gap-2 md:gap-4">
                                <button
                                    onClick={() => onNavigateEpisode('prev')}
                                    disabled={!hasPrevEpisode}
                                    className="group flex items-center space-x-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition-all hover:border-blue-500/40 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:text-slate-700 sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:text-sky-300 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-200"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                                    <span>{t('prevEpisode')}</span>
                                </button>
                                <button
                                    onClick={() => onNavigateEpisode('next')}
                                    disabled={!hasNextEpisode}
                                    className="group flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-sky-500 sm:px-6"
                                >
                                    <span>{t('nextEpisode')}</span>
                                    <ChevronRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>

                            {!isYouTubeEpisode(episode) && showWatchTogether && (
                                <div className="watch-together-enter">
                                    <WatchTogetherPanel
                                        videoId={episode.uid_episode}
                                        videoType="episode"
                                        onGetPlaybackState={handleGetPlaybackState}
                                        onApplyRemoteTarget={handleApplyRemoteTarget}
                                        onWatchStateChange={setWatchState}
                                        videoTitle={displayEpisode.title}
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
                                        itemUid={episode.uid_episode}
                                        onAuthRequired={handleAuthRequired}
                                    />
                                </div>
                            </div>
                        </div>
                    </aside>
                    )}
                </div>

                {/* Section des autres épisodes de la saison */}
                {!forceMini && episodesInSeason.length > 0 && (
                    <section className="mt-2 border-t border-slate-200/80 pt-7 dark:border-slate-800">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <div>
                                <p className="font-mono-meta text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400">{item.title}</p>
                                <h2 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white md:text-2xl">
                                    {t('otherEpisodes')}
                                </h2>
                            </div>
                            {currentSeason && (
                                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono-meta text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                    {isYouTubeSeason(currentSeason)
                                        ? seasonLabel(currentSeason, t('season'))
                                        : `${t('season')} ${currentSeason.season_number}`}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {episodesInSeason
                                .filter(e => e.uid_episode !== episode.uid_episode) // Exclure l'épisode actuel
                                .sort((a, b) => {
                                    // Use episodeSerieService.getEpisodeNumberForSeason to get correct episode number for current season
                                    const episodeANumber = episodeSerieService.getEpisodeNumberForSeason(a, currentSeason?.uid_season || '');
                                    const episodeBNumber = episodeSerieService.getEpisodeNumberForSeason(b, currentSeason?.uid_season || '');
                                    return episodeANumber - episodeBNumber;
                                }) // Trier par numéro d'épisode
                                .map(otherEpisode => (
                                    <Link
                                        key={otherEpisode.uid_episode}
                                        to={`/watch/${otherEpisode.uid_episode}`}
                                        className="broadcast-card group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        <div className="relative aspect-video bg-slate-200 dark:bg-slate-800">
                                            {otherEpisode.picture_path ? (
                                                <img 
                                                    src={otherEpisode.picture_path} 
                                                    alt={otherEpisode.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <PlayIcon className="h-12 w-12 text-slate-400 dark:text-slate-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 transition-colors group-hover:bg-slate-950/25">
                                                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white opacity-90 backdrop-blur transition group-hover:scale-110 group-hover:bg-blue-500">
                                                    <PlayIcon className="ml-0.5 h-5 w-5" />
                                                </span>
                                            </div>
                                            {otherEpisode.runtime_h_m && (
                                                <div className="absolute bottom-2 right-2 rounded-md bg-slate-950/80 px-2 py-1 font-mono-meta text-[10px] text-white">
                                                    {otherEpisode.runtime_h_m}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-start gap-3 p-3.5">
                                            <span className="font-mono-meta pt-0.5 text-xs font-bold text-blue-600 dark:text-sky-400">
                                                {String(episodeSerieService.getEpisodeNumberForSeason(otherEpisode, currentSeason?.uid_season || '')).padStart(2, '0')}
                                            </span>
                                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-sky-300 md:text-base">
                                                {otherEpisode.title}
                                            </h3>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    </section>
                )}

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
                        mediaId={episode.uid_episode}
                        mediaType="episode"
                        currentTitle={episode.title}
                    />
                )}
            </div>
        </div>
    );
};

export default EpisodePlayerScreen;
