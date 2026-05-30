// components/VideoPlayer.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import {
    PlayIcon, PauseIcon,
    VolumeHighIcon, VolumeMuteIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon,
} from './icons';

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

interface VideoPlayerProps {
    src?: string;
    poster: string;
    onUnavailable?: () => void;
    onEnded?: () => void;
    onPlayingStateChange?: (isPlaying: boolean) => void;
    initialPosition?: number;
    videoUid: string;
    isEpisode?: boolean;
    episodeRef?: any;
    autoplayEnabled?: boolean;
    showAutoplayToggle?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    src,
    poster,
    onUnavailable,
    onEnded,
    onPlayingStateChange,
    initialPosition = 0,
    videoUid,
    isEpisode = false,
    episodeRef,
    autoplayEnabled: externalAutoplayEnabled,
    showAutoplayToggle = false,
}) => {
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
    const [autoplayEnabled, setAutoplayEnabled] = useState(externalAutoplayEnabled ?? true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [buffered, setBuffered] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const wasPausedBeforeTabSwitch = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const wasPlayingRef = useRef(false);
    const [showControls, setShowControls] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedPosition = useRef(0);
    const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { userProfile } = useAppContext();
    const [unavailable, setUnavailable] = useState(false);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const [hoverPos, setHoverPos] = useState(0);
    const [previewHoverTime, setPreviewHoverTime] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const speedBeforeLongPressRef = useRef(1);
    const [playPauseFeedback, setPlayPauseFeedback] = useState<'play' | 'pause' | null>(null);
    const playPauseFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync external autoplayEnabled (from EpisodePlayerScreen state) into internal state
    useEffect(() => {
        if (externalAutoplayEnabled !== undefined) {
            setAutoplayEnabled(externalAutoplayEnabled);
        }
    }, [externalAutoplayEnabled]);

    // Fermer automatiquement le PiP et mettre en pause la lecture au chargement du composant
    useEffect(() => {
        const closePiP = async () => {
            const pipElement = document.pictureInPictureElement;
            if (pipElement) {
                try {
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
                wasPausedBeforeTabSwitch.current = video.paused;
            } else {
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
            setProgress((initialPosition / duration) * 100);
            setCurrentTime(initialPosition);
        }
    }, [initialPosition]);

    // Sauvegarder la position de lecture toutes les 10 secondes
    useEffect(() => {
        if (!userProfile?.uid || !videoUid) return;

        const saveProgress = async () => {
            if (!videoRef.current) return;
            
            const currentTime = Math.floor(videoRef.current.currentTime);
            
            if (Math.abs(currentTime - lastSavedPosition.current) >= 5) {
                try {
                    const { statsVuesService } = await import('../lib/firestore');
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

        saveIntervalRef.current = setInterval(saveProgress, 10000);

        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
            saveProgress().catch(console.error);
        };
    }, [userProfile?.uid, videoUid, isEpisode, episodeRef]);

    const showPlayPauseFeedback = (type: 'play' | 'pause') => {
        if (isTouch) return;
        setPlayPauseFeedback(type);
        if (playPauseFeedbackTimeoutRef.current) {
            clearTimeout(playPauseFeedbackTimeoutRef.current);
        }
        playPauseFeedbackTimeoutRef.current = setTimeout(() => {
            setPlayPauseFeedback(null);
        }, 500);
    };

    const togglePlay = () => {
        const wasPlaying = !videoRef.current?.paused;
        wasPlaying ? videoRef.current?.pause() : videoRef.current?.play();
        setShowControls(wasPlaying);
        showPlayPauseFeedback(wasPlaying ? 'pause' : 'play');
        if (!wasPlaying) {
            resetControlsTimeout();
            sessionStorage.setItem(`video_paused_${videoUid}`, 'true');
        } else {
            sessionStorage.removeItem(`video_paused_${videoUid}`);
        }
    };

    const isTouchDevice = useRef(typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
    const isTouch = isTouchDevice.current;

    const resetControlsTimeout = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    useEffect(() => {
        if (isPlaying) {
            const timer = setTimeout(() => {
                setShowControls(false);
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setShowControls(true);
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
            const wasPausedInStorage = sessionStorage.getItem(`video_paused_${videoUid}`) === 'true';
            if (!wasPausedBeforeTabSwitch.current && !wasPausedInStorage && autoplayEnabled) {
                setIsPlaying(true);
                videoRef.current?.play().catch(() => setIsPlaying(false));
            } else if (wasPausedInStorage) {
                sessionStorage.removeItem(`video_paused_${videoUid}`);
            }
        };

        const handleWaiting = () => setIsLoading(true);
        const handlePlaying = () => setIsLoading(false);

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

        handleVolumeChange();

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
    }, [onEnded, isScrubbing, autoplayEnabled]);

    useEffect(() => {
        if (!src || !src.trim()) {
            setUnavailable(true);
        } else {
            setUnavailable(false);
        }
    }, [src]);

    // Reload video when source changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

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
            video.play().catch(() => {});
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
    const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

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

        const target = e.target as HTMLElement;
        const isInteractive = target.closest('button, input, [role="slider"]');

        if (isInteractive) {
            lastTapRef.current = null;
            return;
        }

        if (prev && now - prev.time <= DOUBLE_TAP_DELAY_MS && Math.abs(x - prev.x) <= DOUBLE_TAP_MAX_DISTANCE_PX) {
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
            }
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

        if (isTouch) {
            e.preventDefault();
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
            }
            singleTapTimerRef.current = setTimeout(() => {
                singleTapTimerRef.current = null;
                setShowControls(true);
                resetControlsTimeout();
            }, DOUBLE_TAP_DELAY_MS);
        }
    };

    const LONG_PRESS_DELAY = 500;
    const LONG_PRESS_MOVE_THRESHOLD = 20;

    const handleContainerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!isPlaying) return;
        const touch = e.touches[0];
        if (!touch) return;

        const el = e.currentTarget;
        (el as any)._lpStart = { x: touch.clientX, y: touch.clientY };

        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = setTimeout(() => {
            setIsLongPressing(true);
            lastTapRef.current = null;
            if (videoRef.current) {
                speedBeforeLongPressRef.current = videoRef.current.playbackRate;
                videoRef.current.playbackRate = 2;
                setPlaybackRate(2);
            }
        }, LONG_PRESS_DELAY);
    };

    const handleContainerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!longPressTimerRef.current) return;
        const touch = e.touches[0];
        if (!touch) return;
        const start = (e.currentTarget as any)._lpStart;
        if (!start) return;
        const dx = Math.abs(touch.clientX - start.x);
        const dy = Math.abs(touch.clientY - start.y);
        if (dx > LONG_PRESS_MOVE_THRESHOLD || dy > LONG_PRESS_MOVE_THRESHOLD) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleContainerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (isLongPressing) {
            if (singleTapTimerRef.current) {
                clearTimeout(singleTapTimerRef.current);
                singleTapTimerRef.current = null;
            }
            setIsLongPressing(false);
            if (videoRef.current) {
                videoRef.current.playbackRate = speedBeforeLongPressRef.current;
                setPlaybackRate(speedBeforeLongPressRef.current);
            }
            e.preventDefault();
            return;
        }
        handleTouchEnd(e);
    };

    const SPEED_PRESETS = [1, 1.25, 1.5, 2, 3];

    const cyclePlaybackSpeed = () => {
        const idx = SPEED_PRESETS.indexOf(playbackRate);
        const next = SPEED_PRESETS[(idx + 1) % SPEED_PRESETS.length];
        if (videoRef.current) {
            videoRef.current.playbackRate = next;
        }
        setPlaybackRate(next);
        resetControlsTimeout();
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
        const pos = pct / 100;
        setHoverPos(pos);
        setPreviewHoverTime(nextTime);
        if (previewVideoRef.current && !isNaN(nextTime) && isFinite(nextTime) && nextTime >= 0) {
            previewVideoRef.current.currentTime = nextTime;
        }
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

    const handleSeekBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPos(pos);
        const time = pos * duration;
        setPreviewHoverTime(time);
        if (previewVideoRef.current && !isNaN(time) && isFinite(time) && time >= 0) {
            previewVideoRef.current.currentTime = time;
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
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
    };

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
            container.requestFullscreen()
                .then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation.lock('landscape').catch(() => {});
                    }
                })
                .catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            if (!document.fullscreenElement && screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Hide controls when clicking/tapping outside the player
    useEffect(() => {
        const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
            if (!containerRef.current) return;
            const target = e.target as Node;
            if (target && !containerRef.current.contains(target)) {
                setShowControls(false);
                if (controlsTimeoutRef.current) {
                    clearTimeout(controlsTimeoutRef.current);
                    controlsTimeoutRef.current = null;
                }
            }
        };
        document.addEventListener('mousedown', handleOutsideInteraction);
        document.addEventListener('touchstart', handleOutsideInteraction, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleOutsideInteraction);
            document.removeEventListener('touchstart', handleOutsideInteraction);
        };
    }, []);

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
            }, 1000);
        }
    };

    const handleVideoClick = () => {
        if (Date.now() < ignoreClickUntilRef.current) {
            return;
        }
        if (isTouch) return;
        togglePlay();
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video bg-black group overflow-hidden touch-manipulation"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleContainerTouchStart}
            onTouchMove={handleContainerTouchMove}
            onTouchEnd={handleContainerTouchEnd}
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
                <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ${isLongPressing ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                    <div className="px-4 py-2 rounded-xl bg-black/70 text-amber-400 font-bold text-lg backdrop-blur-sm border border-amber-500/30 shadow-lg">
                        2x
                    </div>
                </div>
                {playPauseFeedback && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="feedback-pop bg-black/50 rounded-full p-4 backdrop-blur-sm">
                            {playPauseFeedback === 'pause' ? (
                                <PauseIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                            ) : (
                                <PlayIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className={`absolute inset-0 transition-opacity flex flex-col justify-between ${showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex-1" onClick={isTouch ? undefined : handleVideoClick} />
                {isTouch && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            onClick={togglePlay}
                            className="pointer-events-auto w-16 h-16 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                        >
                            {isPlaying ? <PauseIcon className="w-8 h-8 text-white" /> : <PlayIcon className="w-8 h-8 text-white ml-0.5" />}
                        </button>
                    </div>
                )}

                <div className="bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                    <div className="px-2 sm:px-4 pt-2 pb-0.5">
                        <div
                            className="relative w-full h-1.5 hover:h-2.5 transition-all duration-200 bg-white/20 rounded-full cursor-pointer group"
                            onClick={handleSeek}
                            onMouseMove={handleSeekBarHover}
                            onMouseEnter={(e) => { setShowPreview(true); handleSeekBarHover(e); }}
                            onMouseLeave={() => setShowPreview(false)}
                        >
                            {/* Thumbnail Preview on Hover/Scrub — always mounted for preloading */}
                            <div
                                className={`absolute bottom-full mb-3 pointer-events-none z-30 transition-all duration-150 ${(showPreview || isScrubbing) && duration > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                                style={{
                                    left: `${Math.max(8, Math.min(92, hoverPos * 100))}%`,
                                    transform: 'translateX(-50%)',
                                }}
                            >
                                <div className="bg-black rounded-lg overflow-hidden shadow-xl border border-white/20">
                                    <video
                                        ref={previewVideoRef}
                                        src={src}
                                        className="w-40 h-[90px] object-cover"
                                        preload="auto"
                                        muted
                                        playsInline
                                        crossOrigin="anonymous"
                                    />
                                    <div className="text-white text-[11px] text-center py-0.5 px-2 bg-black/80 font-medium">
                                        {formatTime(previewHoverTime)}
                                    </div>
                                </div>
                            </div>

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
                    </div>
                    <div className="px-2 sm:px-4 pb-2 sm:pb-3">
                        <div className="flex items-center justify-between text-white text-sm font-medium">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                                <button onClick={togglePlay} className="p-1 rounded-full hover:bg-white/10 transition-colors duration-200">
                                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                                </button>
                                <button onClick={toggleMute} className="p-1 rounded-full hover:bg-white/10 transition-colors duration-200">
                                    {isMuted ? <VolumeMuteIcon className="w-5 h-5" /> : <VolumeHighIcon className="w-5 h-5" />}
                                </button>
                                <span className="text-[13px] text-white/80 font-medium tabular-nums leading-none">{formatTime(currentTime)} / {formatTime(duration)}</span>
                            </div>
                            <div className="flex items-center space-x-1 sm:space-x-2">
                                {showAutoplayToggle && (
                                    <button 
                                        onClick={toggleAutoplay}
                                        className={`relative w-11 h-5 rounded-full p-0.5 transition-colors duration-200 ${autoplayEnabled ? 'bg-amber-500' : 'bg-gray-700'}`}
                                        title={`Lecture automatique ${autoplayEnabled ? 'activée' : 'désactivée'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${autoplayEnabled ? 'translate-x-6' : 'translate-x-0'}`}>
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
                                )}
                                <button
                                    onClick={cyclePlaybackSpeed}
                                    className="px-2 py-1 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors leading-none"
                                >
                                    {playbackRate % 1 === 0 ? playbackRate.toFixed(0) : playbackRate.toFixed(2).replace(/0$/, '')}x
                                </button>
                                <button
                                    onClick={togglePip}
                                    className="p-1 rounded-full hover:bg-white/10 transition-colors duration-200"
                                    title="Mode image dans l'image"
                                >
                                    <PipIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-1 rounded-full hover:bg-white/10 transition-colors duration-200"
                                >
                                    {isFullscreen ?
                                        <FullscreenExitIcon className="w-5 h-5" /> :
                                        <FullscreenEnterIcon className="w-5 h-5" />
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

export { formatTime, VideoPlayer };
