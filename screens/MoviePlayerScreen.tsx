// screens/MoviePlayerScreen.tsx

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MediaType } from '../types';
import { Movie, movieService, likeService, commentService, Comment, generateDefaultAvatar, viewService, getLastWatchedPositionForMovie, statsVuesService } from '../lib/firestore';
import { appSettingsService } from '../lib/appSettingsService';
import { updateMetaTags, clearMetaTags } from '../lib/metaTags';
import {
    PlayIcon, PauseIcon, ArrowLeftIcon,
    LikeIcon, ShareIcon, PlusIcon,
    VolumeHighIcon, VolumeMuteIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon, PaperAirplaneIcon,
    BackwardIcon, ForwardPlaybackIcon, CheckIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import AuthPrompt from '../components/AuthPrompt';
import PremiumPaywall from '../components/PremiumPaywall';
import PromotionPlayer from '../components/PromotionPlayer';

// --- Reusable formatter ---
const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
        return `${hh}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
};

// --- Video Player Component ---
const VideoPlayer: React.FC<{ 
    src: string, 
    poster: string, 
    onEnded?: () => void, 
    onPlayingStateChange?: (isPlaying: boolean) => void,
    initialPosition?: number,
    videoUid: string,
    isEpisode?: boolean,
    episodeRef?: any
}> = ({ src, poster, onEnded, onPlayingStateChange, initialPosition = 0, videoUid, isEpisode = false, episodeRef }) => {
    const { t } = useAppContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [seekFeedback, setSeekFeedback] = useState<null | 'rewind' | 'forward'>(null);
    const seekFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [buffered, setBuffered] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const wasPausedBeforeTabSwitch = useRef(false);

    // Fermer automatiquement le PiP et mettre en pause la lecture au chargement du composant
    useEffect(() => {
        const closePiP = async () => {
            const pipElement = document.pictureInPictureElement;
            if (pipElement) {
                try {
                    // Vérifier si l'élément est une vidéo et la mettre en pause
                    if (pipElement instanceof HTMLVideoElement) {
                        pipElement.pause();
                    }
                    await document.exitPictureInPicture();
                    console.log('PiP fermé et lecture mise en pause');
                } catch (err) {
                    console.error('Erreur lors de la fermeture du PiP :', err);
                }
            }
        };

        closePiP();
    }, []);

    // Gérer la visibilité de l'onglet pour préserver l'état de pause/play
    useEffect(() => {
        const handleVisibilityChange = () => {
            const video = videoRef.current;
            if (!video) return;

            if (document.hidden) {
                // L'onglet devient caché - sauvegarder l'état actuel
                wasPausedBeforeTabSwitch.current = video.paused;
            } else {
                // L'onglet redevient visible - ne pas relancer si l'utilisateur avait mis en pause
                if (wasPausedBeforeTabSwitch.current && !video.paused) {
                    video.pause();
                    setIsPlaying(false);
                    if (onPlayingStateChange) onPlayingStateChange(false);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [onPlayingStateChange]);

    // Positionner la lecture à la position enregistrée
    useEffect(() => {
        if (videoRef.current && initialPosition > 0) {
            videoRef.current.currentTime = initialPosition;
            // Mettre à jour la barre de progression
            setProgress((initialPosition / duration) * 100);
            setCurrentTime(initialPosition);
        }
    }, [initialPosition]);
    const [isLoading, setIsLoading] = useState(true);
    const wasPlayingRef = useRef(false);
    const [showControls, setShowControls] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedPosition = useRef(0);
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { userProfile } = useAppContext();

    // Sauvegarder la position de lecture toutes les 10 secondes
    useEffect(() => {
        if (!userProfile?.uid || !videoUid) return;

        const saveProgress = async () => {
            if (!videoRef.current) return;
            
            const currentTime = Math.floor(videoRef.current.currentTime);
            
            // Ne sauvegarder que si la position a changé d'au moins 5 secondes
            if (Math.abs(currentTime - lastSavedPosition.current) >= 5) {
                try {
                    await statsVuesService.updateViewingProgress(
                        userProfile.uid,
                        videoUid,
                        currentTime,
                        isEpisode,
                    );
                    lastSavedPosition.current = currentTime;
                } catch (error) {
                    console.error('Erreur lors de la sauvegarde de la position:', error);
                }
            }
        };

        // Démarrer l'enregistrement périodique
        saveIntervalRef.current = setInterval(saveProgress, 10000); // Toutes les 10 secondes

        // Sauvegarder aussi lors du démontage du composant
        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
            // Dernière sauvegarde à la fermeture
            saveProgress().catch(console.error);
        };
    }, [userProfile?.uid, videoUid, isEpisode, episodeRef]);

    const togglePlay = () => {
        const wasPlaying = !videoRef.current?.paused;
        wasPlaying ? videoRef.current?.pause() : videoRef.current?.play();
        setShowControls(wasPlaying); // Afficher les contrôles si on met en pause, sinon laisser le timeout gérer
        if (!wasPlaying) {
            resetControlsTimeout();
            // Sauvegarder l'état de pause dans sessionStorage pour préserver après rafraîchissement
            sessionStorage.setItem(`video_paused_${videoUid}`, 'true');
        } else {
            // Nettoyer le flag si on reprend la lecture
            sessionStorage.removeItem(`video_paused_${videoUid}`);
        }
    };

    // Gérer l'affichage automatique des contrôles
    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000); // Cache après 3 secondes d'inactivité
    };

    useEffect(() => {
        // Ne pas afficher les contrôles automatiquement au chargement
        if (isPlaying) {
            const timer = setTimeout(() => {
                setShowControls(false);
            }, 2000); // Cacher les contrôles après 2 secondes de lecture
            return () => clearTimeout(timer);
        } else {
            setShowControls(true); // Toujours montrer les contrôles en pause
        }

        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [isPlaying, progress, currentTime]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Fermer le PIP si une autre vidéo est en mode PIP
        const handlePipChange = async () => {
            if (document.pictureInPictureElement && document.pictureInPictureElement !== video) {
                try {
                    await document.exitPictureInPicture();
                } catch (err) {
                    console.error('Error exiting PiP:', err);
                }
            }
        };

        document.addEventListener('enterpictureinpicture', handlePipChange);
        document.addEventListener('leavepictureinpicture', handlePipChange);

        const handleCanPlay = () => {
            setIsLoading(false);
            // Ne pas relancer automatiquement si :
            // 1. L'utilisateur avait mis en pause avant de changer d'onglet
            // 2. La vidéo était en pause dans sessionStorage (rafraîchissement de page)
            const wasPausedInStorage = sessionStorage.getItem(`video_paused_${videoUid}`) === 'true';
            if (!wasPausedBeforeTabSwitch.current && !wasPausedInStorage) {
                setIsPlaying(true);
                videoRef.current?.play().catch(() => setIsPlaying(false));
            } else if (wasPausedInStorage) {
                // Nettoyer le flag de sessionStorage après utilisation
                sessionStorage.removeItem(`video_paused_${videoUid}`);
            }
        };

        const handleWaiting = () => {
            setIsLoading(true);
        };

        const handlePlaying = () => {
            setIsLoading(false);
        };

        const handlePlay = () => {
            setIsPlaying(true);
            if (onPlayingStateChange) onPlayingStateChange(true);
        };
        const handlePause = () => {
            setIsPlaying(false);
            if (onPlayingStateChange) onPlayingStateChange(false);
        };
        const handleTimeUpdate = () => {
            if (video.duration) {
                setCurrentTime(video.currentTime);
                if (!isScrubbing) {
                    setProgress((video.currentTime / video.duration) * 100);
                }
            }
            try {
                if (video.buffered && video.buffered.length > 0 && video.duration) {
                    const end = video.buffered.end(video.buffered.length - 1);
                    setBuffered(Math.min(100, (end / video.duration) * 100));
                }
            } catch { }
        };
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };
        const handleEnded = () => {
            setIsPlaying(false);
            if (onEnded) onEnded();
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('volumechange', handleVolumeChange);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);

        handleVolumeChange(); // Initialize state

        return () => {
            document.removeEventListener('enterpictureinpicture', handlePipChange);
            document.removeEventListener('leavepictureinpicture', handlePipChange);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('volumechange', handleVolumeChange);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
        };
    }, [isScrubbing, onEnded]);

    const handleRewind = () => {
        resetControlsTimeout();
        if (videoRef.current) videoRef.current.currentTime -= 10;
    };
    const handleFastForward = () => {
        resetControlsTimeout();
        if (videoRef.current) videoRef.current.currentTime += 10;
    };

    const showSeekFeedback = (type: 'rewind' | 'forward') => {
        setSeekFeedback(type);
        if (seekFeedbackTimeoutRef.current) {
            clearTimeout(seekFeedbackTimeoutRef.current);
        }
        seekFeedbackTimeoutRef.current = setTimeout(() => {
            setSeekFeedback(null);
        }, 450);
    };

    const lastTapRef = useRef<{ time: number; x: number } | null>(null);
    const ignoreClickUntilRef = useRef(0);

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container) return;

        const touch = e.changedTouches?.[0];
        if (!touch) return;

        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const now = Date.now();
        const prev = lastTapRef.current;

        const DOUBLE_TAP_DELAY_MS = 300;
        const DOUBLE_TAP_MAX_DISTANCE_PX = 60;

        if (prev && now - prev.time <= DOUBLE_TAP_DELAY_MS && Math.abs(x - prev.x) <= DOUBLE_TAP_MAX_DISTANCE_PX) {
            const isLeft = x < rect.width / 2;
            if (isLeft) {
                handleRewind();
                showSeekFeedback('rewind');
            } else {
                handleFastForward();
                showSeekFeedback('forward');
            }
            lastTapRef.current = null;
            ignoreClickUntilRef.current = now + 500;
            e.preventDefault();
            return;
        }

        lastTapRef.current = { time: now, x };
    };

    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRate = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.playbackRate = newRate;
        }
        setPlaybackRate(newRate);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        resetControlsTimeout();
        const video = videoRef.current;
        if (!video) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        video.currentTime = pos * video.duration;
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const pct = parseFloat(e.target.value);
        setProgress(pct);
        video.currentTime = (pct / 100) * video.duration;
    };

    const handleSliderMouseDown = () => {
        setIsScrubbing(true);
        if (videoRef.current && !videoRef.current.paused) {
            wasPlayingRef.current = true;
            videoRef.current.pause();
        } else {
            wasPlayingRef.current = false;
        }
    };

    const handleSliderMouseUp = () => {
        setIsScrubbing(false);
        if (wasPlayingRef.current && videoRef.current) {
            videoRef.current.play();
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            // Empêcher les raccourcis si l'utilisateur est en train de taper dans un champ de saisie
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            const v = videoRef.current;
            if (!v) return;
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowLeft') {
                v.currentTime = Math.max(0, v.currentTime - 5);
            } else if (e.code === 'ArrowRight') {
                v.currentTime = Math.min(v.duration || v.currentTime + 5, v.currentTime + 5);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const toggleMute = () => {
        resetControlsTimeout();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
        }
    }

    const togglePip = async () => {
        resetControlsTimeout();
        if (!videoRef.current) return;
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
            await videoRef.current.requestPictureInPicture();
        }
    };

    // Fermer le PIP quand la source de la vidéo change
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleSrcChange = async () => {
            if (document.pictureInPictureElement === video) {
                try {
                    await document.exitPictureInPicture();
                } catch (err) {
                    console.error('Error exiting PiP:', err);
                }
            }
        };

        // Observer les changements de source
        const observer = new MutationObserver(handleSrcChange);
        observer.observe(video, { attributes: true, attributeFilter: ['src'] });

        return () => {
            observer.disconnect();
        };
    }, [src]);

    const toggleFullscreen = () => {
        resetControlsTimeout();
        const container = containerRef.current;
        if (!container) return;
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const playbackControlSize = "w-10 h-10 sm:w-12 sm:h-12";
    const seekControlSize = "w-6 h-6 sm:w-8 sm:h-8";

    const handleMouseMove = () => {
        if (!isPlaying) {
            setShowControls(true);
        } else {
            resetControlsTimeout();
        }
    };

    const handleMouseLeave = () => {
        if (isPlaying) {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 1000); // Réduit à 1 seconde pour un meilleur UX
        }
    };

    const handleVideoClick = () => {
        if (Date.now() < ignoreClickUntilRef.current) {
            return;
        }
        if (!showControls) {
            resetControlsTimeout();
            return;
        }
        togglePlay();
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black group overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchEnd={handleTouchEnd}
        >
            {/* Glide Loading Spinner */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-10 transition-all duration-500 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="glide-spinner">
                    <div className="glide-spinner__track">
                        <div className="glide-spinner__circle"></div>
                        <div className="glide-spinner__circle"></div>
                        <div className="glide-spinner__circle"></div>
                        <div className="glide-spinner__circle"></div>
                    </div>
                    <div className="glide-spinner__label text-amber-400 text-sm font-medium mt-6">{t('loadingInProgress') || 'Chargement en cours'}</div>
                </div>
            </div>
            <video ref={videoRef} src={src} poster={poster} className="w-full h-full" onClick={handleVideoClick} />
            
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-150 ${seekFeedback === 'rewind' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                    <div className="px-3 py-2 rounded-xl bg-black/60 text-white font-semibold text-sm backdrop-blur-sm border border-white/10 shadow-lg">
                        -10s
                    </div>
                </div>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-150 ${seekFeedback === 'forward' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                    <div className="px-3 py-2 rounded-xl bg-black/60 text-white font-semibold text-sm backdrop-blur-sm border border-white/10 shadow-lg">
                        +10s
                    </div>
                </div>
            </div>

            <div className={`absolute inset-0 bg-black/30 transition-opacity flex flex-col justify-between ${showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex justify-end p-2 sm:p-4">
                    <div className="flex items-center space-x-2 bg-black/60 p-2 rounded-lg backdrop-blur-sm">
                        <span className="text-white font-semibold text-sm w-12 text-center">{playbackRate.toFixed(2)}x</span>
                        <input
                            type="range"
                            min="0.5"
                            max="2"
                            step="0.25"
                            value={playbackRate}
                            onChange={handlePlaybackRateChange}
                            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-amber-500"
                            aria-label={t('playbackSpeed')}
                        />
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center space-x-4">
                    <button onClick={handleRewind} className="text-white p-2 bg-black/50 rounded-full transition-transform hover:scale-110">
                        <BackwardIcon className={seekControlSize} />
                    </button>
                    <button onClick={togglePlay} className="text-white p-2 bg-black/50 rounded-full transition-transform hover:scale-110">
                        {isPlaying ? <PauseIcon className={playbackControlSize} /> : <PlayIcon className={playbackControlSize} />}
                    </button>
                    <button onClick={handleFastForward} className="text-white p-2 bg-black/50 rounded-full transition-transform hover:scale-110">
                        <ForwardPlaybackIcon className={seekControlSize} />
                    </button>
                </div>

                <div className="p-2 sm:p-4">
                    <div className="space-y-2">
                        <div className="relative w-full h-1.5 hover:h-2.5 transition-all duration-200 bg-white/20 rounded-full cursor-pointer group" onClick={handleSeek}>
                            {/* Buffered Bar */}
                            <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full transition-all duration-200" style={{ width: `${buffered}%` }} />

                            {/* Progress Bar with Gradient and Glow */}
                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-100" style={{ width: `${progress}%` }}>
                                {/* Thumb / Handle */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 scale-0 group-hover:scale-100 ring-2 ring-amber-500/50" />
                            </div>

                            {/* Invisible Input for Interaction */}
                            <input
                                type="range"
                                min={0}
                                max={100}
                                step={0.1}
                                value={progress}
                                onChange={handleSliderChange}
                                onMouseDown={handleSliderMouseDown}
                                onMouseUp={handleSliderMouseUp}
                                onTouchStart={handleSliderMouseDown}
                                onTouchEnd={handleSliderMouseUp}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                aria-label="Seek"
                            />
                        </div>
                        <div className="flex items-center justify-between text-white text-sm font-medium">
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <button onClick={togglePlay}>
                                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                                </button>
                                <button onClick={toggleMute}>
                                    {isMuted ? <VolumeMuteIcon className="w-6 h-6" /> : <VolumeHighIcon className="w-6 h-6" />}
                                </button>
                                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-4">
                                <button onClick={togglePip}><PipIcon className="w-6 h-6" /></button>
                                <button onClick={toggleFullscreen}>
                                    {isFullscreen ? <FullscreenExitIcon className="w-6 h-6" /> : <FullscreenEnterIcon className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Comments Section ---
const formatDate = (timestamp: any) => {
    if (!timestamp) return '';

    // Handle Firestore Timestamp
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Handle string timestamps
    if (typeof timestamp === 'string') {
        return timestamp;
    }

    // Handle raw timestamp objects (if needed)
    if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return '';
};

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
    <div className="flex items-start space-x-3 group">
        <div className="relative flex-shrink-0">
            <img
                src={comment.user_photo_url || generateDefaultAvatar(comment.created_by)}
                alt={comment.created_by}
                className="w-12 h-12 rounded-full ring-2 ring-amber-500/20 group-hover:ring-amber-500/40 transition-all duration-300"
            />
        </div>
        <div className="flex-1 min-w-0">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 p-4 rounded-xl rounded-tl-none shadow-sm group-hover:shadow-md transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50">
                <p className="font-bold text-sm text-gray-900 dark:text-white mb-1.5">{comment.created_by}</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed break-words">{comment.comment}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                {formatDate(comment.created_at)}
            </p>
        </div>
    </div>
);

const CommentSection: React.FC<{ itemUid: string, onAuthRequired: (action: string) => void }> = ({ itemUid, onAuthRequired }) => {
    const { t, userProfile } = useAppContext();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const MAX_COMMENT_LENGTH = 280;

    useEffect(() => {
        const fetchComments = async () => {
            if (!itemUid) return;
            const fetched = await commentService.getComments(itemUid);
            // Tri par date décroissante
            const sortedComments = [...fetched].sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA; // Tri décroissant
            });
            setComments(sortedComments);
        };
        fetchComments();
    }, [itemUid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || newComment.length > MAX_COMMENT_LENGTH) return;
        if (!userProfile) {
            onAuthRequired('commenter cette vidéo');
            return;
        }
        try {
            const added = await commentService.addComment(itemUid, newComment, userProfile);
            if (added) {
                setComments([added, ...comments]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error("Erreur lors de l'ajout du commentaire", {
                position: 'bottom-center',
                autoClose: 2000,
            });
        }
    };

    const charCountColor = newComment.length > MAX_COMMENT_LENGTH
        ? 'text-red-500'
        : newComment.length > MAX_COMMENT_LENGTH - 20
            ? 'text-yellow-500'
            : 'text-gray-500 dark:text-gray-400';

    return (
        <div className="space-y-6">
            <div className="pb-2 border-b border-gray-200 dark:border-black">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    {t('comments')} <span className="text-amber-500">({comments.length})</span>
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="flex items-start space-x-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-gray-900 p-4 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <img src={userProfile?.photo_url || generateDefaultAvatar(userProfile?.display_name)} alt="you" className="w-12 h-12 rounded-full flex-shrink-0 ring-2 ring-amber-500/20" />
                <div className="flex-1">
                    <div className="relative">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={t('addAComment')}
                            className="w-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 pr-14 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition-all duration-300 shadow-sm"
                            rows={3}
                            maxLength={MAX_COMMENT_LENGTH + 1}
                        />
                        <button
                            type="submit"
                            className="absolute right-3 bottom-3 p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:from-amber-600 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 disabled:hover:scale-100"
                            disabled={!newComment.trim() || newComment.length > MAX_COMMENT_LENGTH}
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <p className={`text-xs text-right mt-2 pr-2 font-semibold ${charCountColor}`}>
                        {newComment.length}/{MAX_COMMENT_LENGTH}
                    </p>
                </div>
            </form>
            <div className="space-y-4">
                {comments.length > 0 ? (
                    comments.map((comment, index) => <CommentItem key={`${comment.uid}-${index}-${comment.created_at}`} comment={comment} />)
                ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-lg font-semibold">Aucun commentaire pour le moment</p>
                        <p className="text-sm mt-2">Soyez le premier à commenter !</p>
                    </div>
                )}
            </div>
        </div>
    )
}

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
}

const MoviePlayerScreen: React.FC<MoviePlayerScreenProps> = ({ item, onBack }) => {
    const { t, bookmarkedIds, toggleBookmark, userProfile, isPremium, autoplay } = useAppContext();
    const [movieData, setMovieData] = useState<Movie | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authAction, setAuthAction] = useState('');
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

    const [premiumForAll, setPremiumForAll] = useState(false);

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

    // Charger l'état de premiumForAll
    useEffect(() => {
        const loadPremiumForAll = async () => {
            try {
                const isEnabled = await appSettingsService.isPremiumForAll();
                setPremiumForAll(isEnabled);
            } catch (error) {
                console.error('Error loading premiumForAll setting:', error);
            }
        };
        loadPremiumForAll();
    }, []);

    // Vérifier si le contenu est premium et si l'utilisateur n'a pas accès
    if (movieData?.is_premium && !isPremium && !premiumForAll) {
        return <PremiumPaywall contentTitle={movieData.title} contentType="movie" />;
    }

    const [initialPlaybackPosition, setInitialPlaybackPosition] = useState(0);

    return (
        <div className="bg-white dark:bg-black min-h-screen animate-fadeIn">
            {/* Bouton de retour amélioré avec gradient */}
            <header className="absolute top-4 left-4 z-30">
                <button
                    onClick={onBack}
                    className="group p-3 rounded-full text-white bg-black/70 hover:bg-black/90 backdrop-blur-md transition-all duration-300 hover:scale-110 shadow-xl border border-white/10"
                    aria-label="Go back"
                >
                    <ArrowLeftIcon className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
                </button>
            </header>

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 lg:py-8 pt-20">

                {/* Conteneur principal avec grille pour la mise en page */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne de gauche - Lecteur vidéo et métadonnées */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-2 ring-black/20 dark:ring-white/5">
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
                                    onPlayingStateChange={setVideoIsPlaying}
                                    initialPosition={initialPlaybackPosition}
                                    videoUid={item.id}
                                    isEpisode={false}
                                />
                            )}
                        </div>

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
                            </div>
                        </div>
                    </div>

                    {/* Colonne de droite - Section des commentaires améliorée */}
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
                </div>

                {showAuthPrompt && (
                    <AuthPrompt
                        action={authAction}
                        onClose={() => setShowAuthPrompt(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default MoviePlayerScreen;
