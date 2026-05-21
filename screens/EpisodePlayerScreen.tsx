// screens/EpisodePlayerScreen.tsx

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MediaContent } from '../types';
import { EpisodeSerie, episodeSerieService, seasonSerieService, serieService, likeService, commentService, Comment, generateDefaultAvatar, viewService, getLastWatchedPosition, statsVuesService, SeasonSerie } from '../lib/firestore';
import { doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    PlayIcon, PauseIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon,
    LikeIcon, ShareIcon, PlusIcon,
    VolumeHighIcon, VolumeMuteIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon, PaperAirplaneIcon,
    BackwardIcon, ForwardPlaybackIcon, CheckIcon
} from '../components/icons';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import AuthPrompt from '../components/AuthPrompt';
import PremiumPaywall from '../components/PremiumPaywall';
import PromotionPlayer from '../components/PromotionPlayer';
import { appSettingsService } from '../lib/appSettingsService';
import { updateMetaTags, clearMetaTags } from '../lib/metaTags';

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

// Helper function to format timestamps from Firestore
const formatTimestamp = (timestamp: any): string => {
    if (typeof timestamp === 'string') {
        return timestamp;
    } else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        // Firestore Timestamp object
        return new Date(timestamp.seconds * 1000).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else if (timestamp instanceof Date) {
        return timestamp.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return 'Date inconnue';
};

// Helper function to get timestamp in milliseconds
const getTimestampMillis = (timestamp: any): number => {
    if (typeof timestamp === 'string') {
        return new Date(timestamp).getTime();
    } else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        // Firestore Timestamp object
        return timestamp.seconds * 1000;
    } else if (timestamp instanceof Date) {
        return timestamp.getTime();
    }
    return 0;
};

// --- Video Player Component ---
const VideoPlayer: React.FC<{ 
    src?: string, 
    poster: string, 
    onUnavailable: () => void, 
    onEnded?: () => void, 
    onPlayingStateChange?: (isPlaying: boolean) => void,
    initialPosition?: number,
    videoUid: string,
    isEpisode?: boolean,
    episodeRef?: any
}> = ({ src, poster, onUnavailable, onEnded, onPlayingStateChange, initialPosition = 0, videoUid, isEpisode = false, episodeRef }) => {
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
    const [isPip, setIsPip] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [autoplayEnabled, setAutoplayEnabled] = useState(true);
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
    const [unavailable, setUnavailable] = useState(false);

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
                        isEpisode
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
            // Ne pas relancer automatiquement si l'utilisateur avait mis en pause avant de changer d'onglet
            if (!wasPausedBeforeTabSwitch.current && autoplayEnabled) {
                setIsPlaying(true);
                videoRef.current?.play().catch(() => setIsPlaying(false));
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
            // Mise à jour uniquement de l'état isMuted
            // Le volume est géré directement par l'élément vidéo
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
    }, [onEnded, isScrubbing]);

    useEffect(() => {
        if (!src || !src.trim()) {
            setUnavailable(true);
        } else {
            setUnavailable(false);
        }
    }, [src]);

    // Reload video when source changes and reset state
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Fermer le PIP si la vidéo change
        const closePip = async () => {
            if (document.pictureInPictureElement === video) {
                try {
                    await document.exitPictureInPicture();
                } catch (err) {
                    console.error('Error exiting PiP:', err);
                }
            }
        };

        closePip();

        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
        setCurrentTime(0);
        setBuffered(0);
        setUnavailable(!src || !src.trim());
        try {
            video.pause();
            video.load();
            // Autoplay new episode if allowed
            video.play().catch(() => { });
        } catch { }
    }, [src]);

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
        const nextTime = (pct / 100) * video.duration;
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
    };

    const handleSliderInput = (e: React.FormEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const pct = parseFloat((e.currentTarget as HTMLInputElement).value);
        setProgress(pct);
        const nextTime = (pct / 100) * video.duration;
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
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

    const toggleAutoplay = () => {
        const newAutoplayState = !autoplayEnabled;
        setAutoplayEnabled(newAutoplayState);
        
        // Afficher une notification élégante
        toast.success(`Lecture automatique ${newAutoplayState ? 'activée' : 'désactivée'}`, {
            position: 'bottom-center',
            autoClose: 2000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            style: {
                background: 'rgba(26, 32, 44, 0.95)',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }
        });
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

    if (unavailable) {
        return (
            <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                <div className="flex items-center space-x-4 text-white">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20">
                        <span className="text-3xl leading-none">!</span>
                    </div>
                    <div>
                        <div className="text-xl font-semibold">Video unavailable</div>
                        <button onClick={onUnavailable} className="mt-1 text-amber-400 font-semibold hover:text-amber-300">
                            Return to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
            <video ref={videoRef} src={src} poster={poster} className="w-full h-full" onClick={handleVideoClick} onError={() => setUnavailable(true)} />

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
                                onInput={handleSliderInput}
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
                                <button 
                                    onClick={toggleAutoplay}
                                    className={`relative w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ${autoplayEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}
                                    title={`Lecture automatique ${autoplayEnabled ? 'activée' : 'désactivée'}`}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${autoplayEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
                                        {autoplayEnabled ? (
                                            <svg 
                                                viewBox="0 0 24 24" 
                                                fill="currentColor"
                                                className="w-full h-full text-amber-500"
                                            >
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                                <path d="M10 16l6-4-6-4v8z" />
                                            </svg>
                                        ) : (
                                            <svg 
                                                viewBox="0 0 24 24" 
                                                fill="currentColor"
                                                className="w-full h-full text-gray-700"
                                            >
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                                <path d="M9 16h2V8H9v8zm4 0h2V8h-2v8z" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                                <button 
                                    onClick={togglePip} 
                                    className="p-1 text-white hover:bg-white/20 rounded-full transition-colors duration-200"
                                    title="Mode image dans l'image"
                                >
                                    <PipIcon className="w-6 h-6" />
                                </button>
                                <button 
                                    onClick={toggleFullscreen}
                                    className="p-1 text-white hover:bg-white/20 rounded-full transition-colors duration-200"
                                >
                                    {isFullscreen ? 
                                        <FullscreenExitIcon className="w-6 h-6" /> : 
                                        <FullscreenEnterIcon className="w-6 h-6" />
                                    }
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
                {formatTimestamp(comment.created_at)}
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
            const fetchedComments = await commentService.getComments(itemUid);
            // Tri par date décroissante
            const sortedComments = [...fetchedComments].sort((a, b) => {
                const dateA = getTimestampMillis(a.created_at);
                const dateB = getTimestampMillis(b.created_at);
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
            const addedComment = await commentService.addComment(itemUid, newComment, userProfile);
            if (addedComment) {
                setComments([addedComment, ...comments]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Erreur lors de l\'ajout du commentaire', {
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
interface EpisodePlayerScreenProps {
    item: MediaContent;
    episode: EpisodeSerie;
    onBack: () => void;
    onNavigateEpisode: (direction: 'next' | 'prev' | EpisodeSerie) => void;
    onReturnHome: () => void;
}

const EpisodePlayerScreen: React.FC<EpisodePlayerScreenProps> = ({ item, episode, onBack, onNavigateEpisode, onReturnHome }) => {
    const navigate = useNavigate();
    const { t, bookmarkedIds, toggleSeriesBookmark, userProfile, autoplay, isPremium } = useAppContext();
    const [episodesInSerie, setEpisodesInSerie] = useState<EpisodeSerie[]>([]);
    const [episodesInSeason, setEpisodesInSeason] = useState<EpisodeSerie[]>([]);
    const [currentSeason, setCurrentSeason] = useState<SeasonSerie | null>(null);
    const [serieUid, setSerieUid] = useState<string | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [showAuthPrompt, setShowAuthPrompt] = useState(false);
    const [authAction, setAuthAction] = useState('');
    const [videoIsPlaying, setVideoIsPlaying] = useState(false);
    const [isPremiumContent, setIsPremiumContent] = useState(false);
    const [isCheckingPremium, setIsCheckingPremium] = useState(true);
    // Sauvegarder l'état de la pub dans sessionStorage pour éviter de la relancer
    const getAdStateKey = () => `ad_shown_${episode.uid_episode}`;
    const wasAdShown = sessionStorage.getItem(getAdStateKey()) === 'true';
    const [showAd, setShowAd] = useState(!wasAdShown);
    const [premiumForAll, setPremiumForAll] = useState(false);
    const [initialPlaybackPosition, setInitialPlaybackPosition] = useState(0);

    const handleAuthRequired = (action: string) => {
        setAuthAction(action);
        setShowAuthPrompt(true);
    };

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

    // Récupérer les informations de la saison et vérifier si le contenu est premium
    useEffect(() => {
        const checkPremiumStatus = async () => {
            try {
                // Récupérer la saison de l'épisode
                const season = await seasonSerieService.getSeasonByUid(episode.uid_season);
                if (!season) {
                    console.error('Saison non trouvée');
                    setIsPremiumContent(false);
                    return;
                }

                // Stocker les informations de la saison
                setCurrentSeason(season);
                setSerieUid(season.uid_serie);

                // Récupérer la série
                const serie = await serieService.getSerieByUid(season.uid_serie);
                if (!serie) {
                    console.error('Série non trouvée');
                    setIsPremiumContent(false);
                    return;
                }

                // Vérifier si la série ou la saison est premium
                const isContentPremium = Boolean(serie.premium_text?.trim() || season.premium_text?.trim());
                setIsPremiumContent(isContentPremium);

                // Si c'est du contenu premium et que l'utilisateur n'est pas premium, afficher le paywall
                if (isContentPremium && (!userProfile?.uid || !isPremium)) {
                    if (!userProfile?.uid) {
                        handleAuthRequired('accéder à ce contenu premium');
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la vérification du statut premium:', error);
                setIsPremiumContent(false);
            } finally {
                setIsCheckingPremium(false);
            }
        };

        checkPremiumStatus();
    }, [episode.uid_season, userProfile]);

    useEffect(() => {
        const fetchEpisodes = async () => {
            try {
                const serie = await serieService.getSerieByUid(item.id);
                if (!serie) { 
                    setEpisodesInSerie([]); 
                    setEpisodesInSeason([]);
                    return; 
                }
                const userUid = userProfile?.uid;
                const seasons = await seasonSerieService.getSeasonsBySerie(serie.uid_serie, userUid);
                if (seasons.length === 0) { 
                    setEpisodesInSerie([]); 
                    setEpisodesInSeason([]);
                    return; 
                }
                const episodesBySeason = await Promise.all(
                    seasons.map(async (s) => await episodeSerieService.getEpisodesBySeason(s.uid_season))
                );
                const allEpisodes = episodesBySeason.flat();
                setEpisodesInSerie(allEpisodes);
                
                // Filtrer les épisodes de la même saison que l'épisode actuel
                const currentSeasonEpisodes = await episodeSerieService.getEpisodesBySeason(episode.uid_season);
                setEpisodesInSeason(currentSeasonEpisodes);
            } catch (error) {
                console.error('Error fetching episodes list:', error);
                setEpisodesInSerie([]);
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
        if (!episode || episodesInSerie.length === 0) return -1;
        let idx = episodesInSerie.findIndex(e => e.uid_episode === episode.uid_episode);
        if (idx === -1) {
            idx = episodesInSerie.findIndex(e => e.episode_numero === episode.episode_numero && e.title === episode.title);
        }
        return idx;
    }, [episodesInSerie, episode]);

    const hasPrevEpisode = currentIndex > 0;
    const hasNextEpisode = currentIndex !== -1 && currentIndex < episodesInSerie.length - 1;

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

    // Afficher un indicateur de chargement pendant la vérification du statut premium
    if (isCheckingPremium) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    // Si le contenu est premium et que l'utilisateur n'est pas premium, afficher le paywall
    if (isPremiumContent && (!userProfile?.uid || !isPremium) && !premiumForAll) {
        return (
            <div className="bg-white dark:bg-black min-h-screen">
                <header className="absolute top-4 left-4 z-20">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full text-white bg-black/60 hover:bg-black/80 backdrop-blur-sm transition-all duration-200"
                        aria-label="Go back"
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="container mx-auto px-4 py-20">
                    <PremiumPaywall
                        contentTitle={episode.title}
                        contentType="episode"
                    />
                </div>
            </div>
        );
    }

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

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-1 md:py-4 lg:py-8 pt-16 md:pt-20">

                {/* Conteneur principal avec grille pour la mise en page */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Colonne de gauche - Lecteur vidéo et métadonnées */}
                    <div className="lg:col-span-2 space-y-2 md:space-y-4">
                        {/* Titre de la saison avec lien vers la série */}
                        {currentSeason && serieUid && (
                            <div className="flex items-center gap-2 text-sm md:text-base">
                                <button
                                    onClick={() => navigate(`/serie/${serieUid}`)}
                                    className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold transition-colors duration-200 hover:underline"
                                >
                                    {item.title}
                                </button>
                                <span className="text-gray-500 dark:text-gray-400">•</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {t('season')} {currentSeason.season_number}
                                    {currentSeason.title_season && (
                                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                                            - {currentSeason.title_season}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                        
                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-2 ring-black/20 dark:ring-white/5">
                            {showAd && (
                                <PromotionPlayer
                                    onPromotionEnd={handleAdEnd}
                                    onSkip={handleAdSkip}
                                />
                            )}
                            {!showAd && (
                                <VideoPlayer
                                    key={episode.uid_episode || episode.title}
                                    src={episode.video_path_hd?.trim() ? episode.video_path_hd : episode.video_path_sd}
                                    poster={episode.picture_path || item.imageUrl}
                                    onUnavailable={onReturnHome}
                                    onEnded={handleVideoEnded}
                                    onPlayingStateChange={setVideoIsPlaying}
                                    initialPosition={initialPlaybackPosition}
                                    videoUid={episode.uid_episode}
                                    isEpisode={true}
                                />
                            )}
                        </div>

                        <div className="space-y-2 md:space-y-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                                    {displayEpisode.title}
                                </h1>
                                <div className="flex items-center space-x-2 md:space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1 md:mt-0">
                                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full font-semibold">
                                        {item.author || item.theme}
                                    </span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    <span className="font-medium">
                                        {formatNumber(displayEpisode.views || 0)} {t('views')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-around py-2 md:py-4 px-2 bg-white/50 dark:bg-gray-900/50 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-black/50 shadow-lg">
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
                            </div>

                            <div className="flex items-center justify-between gap-2 md:gap-4">
                                <button
                                    onClick={() => onNavigateEpisode('prev')}
                                    disabled={!hasPrevEpisode}
                                    className="group flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 dark:from-black dark:to-gray-700 hover:from-amber-500 hover:to-orange-500 text-gray-900 dark:text-white hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-gray-200 disabled:hover:to-gray-300 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100 font-semibold"
                                >
                                    <ChevronLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                                    <span>{t('prevEpisode')}</span>
                                </button>
                                <button
                                    onClick={() => onNavigateEpisode('next')}
                                    disabled={!hasNextEpisode}
                                    className="group flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-amber-500 disabled:hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100 font-semibold"
                                >
                                    <span>{t('nextEpisode')}</span>
                                    <ChevronRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Colonne de droite - Section des commentaires améliorée */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-hidden flex flex-col">
                            <div className="lg:flex-1 lg:overflow-y-auto lg:pb-4 pr-2 -mr-2 scrollbar-thin scrollbar-thumb-amber-500 scrollbar-track-gray-200 dark:scrollbar-track-black">
                                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200/50 dark:border-black/50 shadow-xl">
                                    <CommentSection
                                        itemUid={episode.uid_episode}
                                        onAuthRequired={handleAuthRequired}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section des autres épisodes de la saison */}
                {episodesInSeason.length > 0 && (
                    <div className="mt-6 md:mt-4 lg:mt-6 pt-6 md:pt-0 border-t border-gray-200 dark:border-gray-700 md:border-t-0 space-y-2 md:space-y-4">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                            {t('otherEpisodes') || 'Autres épisodes de la saison'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {episodesInSeason
                                .filter(e => e.uid_episode !== episode.uid_episode) // Exclure l'épisode actuel
                                .sort((a, b) => {
                                    // Use episodeSerieService.getEpisodeNumberForSeason to get correct episode number for current season
                                    const episodeANumber = episodeSerieService.getEpisodeNumberForSeason(a, currentSeason?.uid_season || '');
                                    const episodeBNumber = episodeSerieService.getEpisodeNumberForSeason(b, currentSeason?.uid_season || '');
                                    return episodeANumber - episodeBNumber;
                                }) // Trier par numéro d'épisode
                                .map(otherEpisode => (
                                    <div
                                        key={otherEpisode.uid_episode}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('🔍 Clic sur épisode:', otherEpisode.uid_episode, otherEpisode.title);
                                            if (otherEpisode.uid_episode) {
                                                onNavigateEpisode(otherEpisode);
                                            } else {
                                                console.error('Épisode sans uid_episode:', otherEpisode);
                                            }
                                        }}
                                        className="group relative bg-gray-100/50 dark:bg-black/40 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
                                    >
                                        <div className="relative aspect-video bg-gray-300 dark:bg-gray-700">
                                            {otherEpisode.picture_path ? (
                                                <img 
                                                    src={otherEpisode.picture_path} 
                                                    alt={otherEpisode.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <PlayIcon className="w-12 h-12 text-gray-400 dark:text-gray-600" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <PlayIcon className="w-12 h-12 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                                            </div>
                                            {otherEpisode.runtime_h_m && (
                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                                    {otherEpisode.runtime_h_m}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate">
                                                {episodeSerieService.getEpisodeNumberForSeason(otherEpisode, currentSeason?.uid_season || '')}. {otherEpisode.title}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

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

export default EpisodePlayerScreen;
