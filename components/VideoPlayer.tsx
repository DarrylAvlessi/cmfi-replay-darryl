// components/VideoPlayer.tsx

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import VideoTopProgressBar from './player/VideoTopProgressBar';
import VideoLoadingOverlay from './player/VideoLoadingOverlay';
import VideoFeedbackOverlay from './player/VideoFeedbackOverlay';
import VideoCenterButton from './player/VideoCenterButton';
import SeekBar from './player/SeekBar';
import ControlsBar from './player/ControlsBar';

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
    hideControls?: boolean;
    onTimeUpdate?: (time: number) => void;
    videoRef?: React.RefObject<HTMLVideoElement>;
    // Watch-together guests: video follows the host; playback controls lock.
    remoteMode?: boolean;
    // Live DVR: guests in live rooms may pause/rewind (capped at liveEdge).
    liveDvr?: boolean;
    liveEdge?: number | null;
    // Behind-live pill: shown persistently (even when controls auto-hide).
    isBehindLive?: boolean;
    behindBySec?: number;
    onJumpToLive?: () => void;
    // Premiere-style live: persistent LIVE bug over the video.
    isLive?: boolean;
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
    hideControls = false,
    onTimeUpdate,
    videoRef: externalVideoRef,
    remoteMode = false,
    liveDvr = false,
    liveEdge = null,
    isBehindLive = false,
    behindBySec = 0,
    onJumpToLive,
    isLive = false,
}) => {
    const { t } = useAppContext();
    const {
        videoRef,
        containerRef,
        previewVideoRef,
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
        scrubProgress,
        showControls,
        showPreview,
        setShowPreview,
        hoverPos,
        previewHoverTime,
        seekFeedback,
        seekFeedbackStep,
        volumeFeedback,
        playPauseFeedback,
        isLongPressing,
        unavailable,
        isTouch,
        togglePlay,
        toggleMute,
        togglePip,
        toggleAutoplay,
        cyclePlaybackSpeed,
        toggleFullscreen,
        handleVolumeSliderChange,
        handleVolumeSliderInput,
        handleVolumeSeek,
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
    } = useVideoPlayer({
        src,
        poster,
        onUnavailable,
        onEnded,
        onPlayingStateChange,
        initialPosition,
        videoUid,
        isEpisode,
        episodeRef,
        autoplayEnabled: externalAutoplayEnabled,
        showAutoplayToggle,
        hideControls,
        onTimeUpdate,
        videoRef: externalVideoRef,
        remoteMode,
        liveDvr,
        liveEdge,
    });

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
            <VideoTopProgressBar isBuffering={isBuffering} bufferedPercent={buffered} />
            {isLive && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/90 backdrop-blur-sm shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-white text-[11px] font-bold tracking-widest">{t('liveBadge')}</span>
                </div>
            )}
            <VideoLoadingOverlay isInitialLoading={isInitialLoading} />
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full"
                onClick={handleVideoClick}
                onError={handleVideoError}
                playsInline
                preload="metadata"
            />
            <VideoFeedbackOverlay
                seekFeedback={seekFeedback}
                seekStep={seekFeedbackStep}
                volumeFeedback={volumeFeedback}
                volume={volume}
                isMuted={isMuted}
                isLongPressing={isLongPressing}
                playPauseFeedback={playPauseFeedback}
                isLoading={isInitialLoading || isBuffering}
            />
            <div className={`absolute inset-0 transition-opacity flex flex-col justify-between ${showControls && !hideControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex-1" onClick={isTouch ? undefined : handleVideoClick} />
                <VideoCenterButton
                    isTouch={isTouch}
                    isLoading={isInitialLoading}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    disabled={remoteMode && !liveDvr}
                />
                <div className="bg-gradient-to-t from-black/85 via-black/40 to-black/10">
                    <SeekBar
                        duration={duration}
                        progress={progress}
                        buffered={buffered}
                        hoverPos={hoverPos}
                        previewHoverTime={previewHoverTime}
                        showPreview={showPreview}
                        isScrubbing={isScrubbing}
                        onSliderInput={handleSliderInput}
                        onSliderMouseDown={handleSliderMouseDown}
                        onSliderMouseUp={handleSliderMouseUp}
                        onSeekBarHover={handleSeekBarHover}
                        onShowPreview={setShowPreview}
                        formatTime={formatTime}
                        previewVideoRef={previewVideoRef}
                        src={src}
                        disabled={remoteMode && !liveDvr}
                        scrubProgress={scrubProgress}
                        liveMode={liveDvr}
                        liveEdge={liveEdge}
                        currentTime={currentTime}
                        ariaValueText={liveDvr ? (isBehindLive ? t('behindLive', { count: String(Math.max(0, Math.round(behindBySec))) }) : t('liveBadge')) : undefined}
                    />
                    <ControlsBar
                        isPlaying={isPlaying}
                        isMuted={isMuted}
                        volume={volume}
                        isFullscreen={isFullscreen}
                        autoplayEnabled={autoplayEnabled}
                        playbackRate={playbackRate}
                        showVolumeSlider={showVolumeSlider}
                        currentTime={currentTime}
                        duration={duration}
                        showAutoplayToggle={showAutoplayToggle}
                        onTogglePlay={togglePlay}
                        onToggleMute={toggleMute}
                        onTogglePip={togglePip}
                        onToggleFullscreen={toggleFullscreen}
                        onToggleAutoplay={toggleAutoplay}
                        onCyclePlaybackSpeed={cyclePlaybackSpeed}
                        onShowVolumeSlider={setShowVolumeSlider}
                        onVolumeSliderChange={handleVolumeSliderChange}
                        onVolumeSliderInput={handleVolumeSliderInput}
                        onVolumeSeek={handleVolumeSeek}
                        formatTime={formatTime}
                        disabled={remoteMode && !liveDvr}
                        lockSpeed={remoteMode}
                        liveMode={liveDvr}
                        isBehindLive={isBehindLive}
                        behindBySec={behindBySec}
                        onJumpToLive={onJumpToLive}
                        liveBadgeText={t('liveBadge')}
                    />
                </div>
            </div>
            {isBehindLive && onJumpToLive && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-20 flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 shadow-xl">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-xs font-semibold tabular-nums">
                        -{formatTime(Math.max(0, Math.round(behindBySec)))}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onJumpToLive(); }}
                        className="px-2.5 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
                    >
                        {t('jumpToLive')}
                    </button>
                </div>
            )}
        </div>
    );
};

export { formatTime, VideoPlayer };
