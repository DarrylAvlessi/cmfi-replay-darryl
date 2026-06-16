import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAppContext } from '../context/AppContext';

const SPEED_PRESETS = [1, 1.25, 1.5, 2, 3];
const DOUBLE_TAP_DELAY_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 60;
const LONG_PRESS_DELAY = 500;
const LONG_PRESS_MOVE_THRESHOLD = 20;
const CONTROLS_TIMEOUT_MS = 3000;
const SAVE_INTERVAL_MS = 10000;
const SAVE_THRESHOLD_SEC = 5;
const SEEK_STEP_SEC = 10;
const KEYBOARD_SEEK_STEP_SEC = 5;
const FEEDBACK_DURATION_MS = 450;
const PLAY_PAUSE_FEEDBACK_MS = 500;
const SINGLE_TAP_DELAY_MS = 300;
const CLICK_DELAY_MS = 300;
const DOUBLE_CLICK_IGNORE_MS = 500;

interface UseVideoPlayerProps {
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
  hideControls?: boolean;
  onTimeUpdate?: (time: number) => void;
  onPipTrigger?: () => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export function useVideoPlayer({
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
  showAutoplayToggle: _showAutoplayToggle,
  hideControls: _hideControls,
  onTimeUpdate,
  onPipTrigger,
  videoRef: externalVideoRef,
}: UseVideoPlayerProps) {
  const { t, userProfile } = useAppContext();

  // --- Element refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // --- State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<null | 'rewind' | 'forward'>(null);
  const seekFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(externalAutoplayEnabled ?? true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const wasPausedBeforeTabSwitch = useRef(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const wasPlayingRef = useRef(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPosition = useRef(0);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [hoverPos, setHoverPos] = useState(0);
  const [previewHoverTime, setPreviewHoverTime] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const speedBeforeLongPressRef = useRef(1);
  const [playPauseFeedback, setPlayPauseFeedback] = useState<'play' | 'pause' | null>(null);
  const playPauseFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Device detection ---
  const isTouchDevice = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );
  const isTouch = isTouchDevice.current;

  // --- Helper: update buffered ---
  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.buffered && video.buffered.length > 0 && video.duration) {
        const end = video.buffered.end(video.buffered.length - 1);
        setBuffered(Math.min(100, (end / video.duration) * 100));
      } else {
        setBuffered(0);
      }
    } catch {
      setBuffered(0);
    }
  };

  // --- Helper: reset controls timeout ---
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_TIMEOUT_MS);
  };

  // --- Feedback helpers ---
  const showSeekFeedback = (type: 'rewind' | 'forward') => {
    setSeekFeedback(type);
    if (seekFeedbackTimeoutRef.current) {
      clearTimeout(seekFeedbackTimeoutRef.current);
    }
    seekFeedbackTimeoutRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, FEEDBACK_DURATION_MS);
  };

  const showPlayPauseFeedback = (type: 'play' | 'pause') => {
    if (isTouch) return;
    setPlayPauseFeedback(type);
    if (playPauseFeedbackTimeoutRef.current) {
      clearTimeout(playPauseFeedbackTimeoutRef.current);
    }
    playPauseFeedbackTimeoutRef.current = setTimeout(() => {
      setPlayPauseFeedback(null);
    }, PLAY_PAUSE_FEEDBACK_MS);
  };

  // --- Handlers ---
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

  const handleRewind = () => {
    resetControlsTimeout();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime -= SEEK_STEP_SEC;
    setCurrentTime(video.currentTime);
    if (video.duration) setProgress((video.currentTime / video.duration) * 100);
    updateBuffered();
  };

  const handleFastForward = () => {
    resetControlsTimeout();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime += SEEK_STEP_SEC;
    setCurrentTime(video.currentTime);
    if (video.duration) setProgress((video.currentTime / video.duration) * 100);
    updateBuffered();
  };

  const toggleMute = () => {
    resetControlsTimeout();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  const handleVolumeSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetControlsTimeout();
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    if (v.muted && val > 0) v.muted = false;
  };

  const handleVolumeSliderInput = (e: React.FormEvent<HTMLInputElement>) => {
    resetControlsTimeout();
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.currentTarget.value);
    v.volume = val;
    if (v.muted && val > 0) v.muted = false;
  };

  const handleVolumeSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    resetControlsTimeout();
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, x));
    v.volume = clamped;
    if (v.muted && clamped > 0) v.muted = false;
  };

  const togglePip = async () => {
    resetControlsTimeout();
    if (!videoRef.current) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      if (!document.hidden && onPipTrigger) {
        onPipTrigger();
        return;
      }
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
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    });
  };

  const cyclePlaybackSpeed = () => {
    const idx = SPEED_PRESETS.indexOf(playbackRate);
    const next = SPEED_PRESETS[(idx + 1) % SPEED_PRESETS.length];
    if (videoRef.current) {
      videoRef.current.playbackRate = next;
    }
    setPlaybackRate(next);
    resetControlsTimeout();
  };

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
        .catch((err: any) => console.error(err));
    } else {
      document.exitFullscreen();
    }
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

  // --- Touch handlers ---
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

    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, input, [role="slider"]');

    if (isInteractive) {
      lastTapRef.current = null;
      return;
    }

    if (
      prev &&
      now - prev.time <= DOUBLE_TAP_DELAY_MS &&
      Math.abs(x - prev.x) <= DOUBLE_TAP_MAX_DISTANCE_PX
    ) {
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
      ignoreClickUntilRef.current = now + DOUBLE_CLICK_IGNORE_MS;
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
      }, SINGLE_TAP_DELAY_MS);
    }
  };

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

  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoClick = (e: React.MouseEvent) => {
    if (Date.now() < ignoreClickUntilRef.current) return;
    if (isTouch) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      const isLeft = x < rect.width / 2;
      if (isLeft) {
        handleRewind();
        showSeekFeedback('rewind');
      } else {
        handleFastForward();
        showSeekFeedback('forward');
      }
      ignoreClickUntilRef.current = Date.now() + DOUBLE_CLICK_IGNORE_MS;
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        togglePlay();
      }, CLICK_DELAY_MS);
    }
  };

  // --- Effects ---

  // Sync external autoplayEnabled
  useEffect(() => {
    if (externalAutoplayEnabled !== undefined) {
      setAutoplayEnabled(externalAutoplayEnabled);
    }
  }, [externalAutoplayEnabled]);

  // Close PiP on mount
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

  // Sync internal videoRef to external ref
  useEffect(() => {
    if (externalVideoRef) {
      (externalVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
        videoRef.current;
    }
  });

  // Tab visibility → auto PiP
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.hidden) {
        wasPausedBeforeTabSwitch.current = video.paused;
        if (!video.paused && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
          try {
            await video.requestPictureInPicture();
          } catch (err) {
            console.error("Erreur lors de l'activation automatique du PiP :", err);
          }
        }
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

  // Set initial position
  useEffect(() => {
    if (videoRef.current && initialPosition > 0) {
      videoRef.current.currentTime = initialPosition;
      setProgress((initialPosition / duration) * 100);
      setCurrentTime(initialPosition);
    }
  }, [initialPosition]);

  // Save progress every 10s
  useEffect(() => {
    if (!userProfile?.uid || !videoUid) return;

    const saveProgress = async () => {
      if (!videoRef.current) return;
      const currentTime = Math.floor(videoRef.current.currentTime);

      if (Math.abs(currentTime - lastSavedPosition.current) >= SAVE_THRESHOLD_SEC) {
        try {
          const { statsVuesService } = await import('../lib/db');
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

    saveIntervalRef.current = setInterval(saveProgress, SAVE_INTERVAL_MS);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      saveProgress().catch(console.error);
    };
  }, [userProfile?.uid, videoUid, isEpisode, episodeRef]);

  // Controls auto-hide
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

  // Video event listeners
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
      setIsInitialLoading(false);
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setIsBuffering(true);
      }
    };
    const handlePlaying = () => setIsBuffering(false);
    const handleStalled = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setIsBuffering(true);
      }
    };
    const handleProgress = () => {
      updateBuffered();
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
        if (onTimeUpdate) onTimeUpdate(video.currentTime);
        if (!isScrubbing) {
          setProgress((video.currentTime / video.duration) * 100);
        }
      }
      updateBuffered();
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
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('progress', handleProgress);

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
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('progress', handleProgress);
    };
  }, [onEnded, isScrubbing, autoplayEnabled, onTimeUpdate, videoUid, onPlayingStateChange]);

  // Autoplay logic when initial loading completes
  useEffect(() => {
    if (!isInitialLoading && videoRef.current) {
      const wasPausedInStorage =
        sessionStorage.getItem(`video_paused_${videoUid}`) === 'true';
      if (!wasPausedBeforeTabSwitch.current && !wasPausedInStorage && autoplayEnabled) {
        setIsPlaying(true);
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else if (wasPausedInStorage) {
        sessionStorage.removeItem(`video_paused_${videoUid}`);
      }
    }
  }, [isInitialLoading]);

  // Set unavailable on src change
  useEffect(() => {
    if (!src || !src.trim()) {
      setUnavailable(true);
    } else {
      setUnavailable(false);
    }
  }, [src]);

  // Reload on src change
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
    setIsInitialLoading(true);
    setIsBuffering(false);
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
    setBuffered(0);
    setUnavailable(!src || !src.trim());
    try {
      video.pause();
      video.load();
      video.play().catch(() => {});
    } catch {}
  }, [src]);

  // PiP src change observer
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

  // Fullscreen change listener
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

  // Outside click → hide controls
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const v = videoRef.current;
      if (!v) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        v.currentTime = Math.max(0, v.currentTime - KEYBOARD_SEEK_STEP_SEC);
      } else if (e.code === 'ArrowRight') {
        v.currentTime = Math.min(
          v.duration || v.currentTime + KEYBOARD_SEEK_STEP_SEC,
          v.currentTime + KEYBOARD_SEEK_STEP_SEC,
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, []);

  const handleVideoError = () => {
    setUnavailable(true);
  };

  return {
    // Refs
    videoRef,
    containerRef,
    previewVideoRef,
    // State
    isPlaying,
    isInitialLoading,
    isBuffering,
    isMuted,
    volume,
    showVolumeSlider,
    setShowVolumeSlider,
    isFullscreen,
    autoplayEnabled,
    playbackRate,
    progress,
    duration,
    currentTime,
    buffered,
    isScrubbing,
    showControls,
    showPreview,
    setShowPreview,
    hoverPos,
    previewHoverTime,
    seekFeedback,
    playPauseFeedback,
    isLongPressing,
    unavailable,
    // Computed
    isTouch,
    // Handlers
    togglePlay,
    toggleMute,
    togglePip,
    toggleAutoplay,
    cyclePlaybackSpeed,
    toggleFullscreen,
    handleVolumeSliderChange,
    handleVolumeSliderInput,
    handleVolumeSeek,
    handleSeek,
    handleSliderChange,
    handleSliderInput,
    handleSliderMouseDown,
    handleSliderMouseUp,
    handleSeekBarHover,
    handleVideoClick,
    handleContainerTouchStart,
    handleContainerTouchMove,
    handleContainerTouchEnd,
    handleMouseMove,
    handleMouseLeave,
    resetControlsTimeout,
    handleVideoError,
  };
}
