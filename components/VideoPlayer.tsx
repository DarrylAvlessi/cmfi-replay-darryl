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
    title?: string;
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
    title,
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
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-[22px] bg-slate-950">
                <div className="broadcast-grid-bg absolute inset-0 opacity-30" />
                <div className="relative flex flex-col items-center gap-4 text-white sm:flex-row">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl leading-none text-sky-300 shadow-[0_0_40px_rgba(37,99,235,0.2)]">
                        !
                    </div>
                    <div className="text-center sm:text-left">
                        <div className="text-lg font-semibold">Video unavailable</div>
                        <button onClick={onUnavailable} className="mt-1 font-semibold text-sky-300 transition-colors hover:text-white">
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
            className="group relative aspect-video w-full touch-manipulation overflow-hidden rounded-[18px] bg-[#02040a] sm:rounded-[20px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleContainerTouchStart}
            onTouchMove={handleContainerTouchMove}
            onTouchEnd={handleContainerTouchEnd}
        >
            <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_0%,rgba(37,99,235,0.12),transparent_52%)]" />
            <VideoTopProgressBar isBuffering={isBuffering} bufferedPercent={buffered} />
            {isLive && (
                <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-600/90 px-3 py-1.5 shadow-lg shadow-rose-950/30 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    <span className="font-mono-meta text-[10px] font-bold tracking-[0.16em] text-white">{t('liveBadge')}</span>
                </div>
            )}
            <VideoLoadingOverlay isInitialLoading={isInitialLoading} />
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="h-full w-full object-contain"
                onClick={handleVideoClick}
                onError={handleVideoError}
                playsInline
                preload="metadata"
            />
            {!hideControls && (
                <div className={`pointer-events-none absolute inset-x-0 top-0 z-[5] bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent px-4 pb-14 pt-4 transition-all duration-300 sm:px-6 sm:pt-5 ${
                    showControls ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
                }`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-slate-950/85 font-display text-[11px] font-bold tracking-tight text-white shadow-lg backdrop-blur-md">
                                CM
                            </span>
                            <div className="min-w-0">
                                <p className="inline-flex max-w-full items-center rounded-md border border-white/10 bg-slate-950/75 px-2 py-1 font-mono-meta text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-200 shadow-lg backdrop-blur-md">
                                    CMFI Replay <span className="mx-1.5 text-white/45">/</span> {isEpisode ? t('episode') : t('movie')}
                                </p>
                                {title && (
                                    <p className="mt-1 max-w-[min(60vw,520px)] truncate rounded-md bg-slate-950/75 px-2 py-1 text-sm font-semibold text-white shadow-lg backdrop-blur-md sm:text-base">
                                        {title}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isBuffering && (
                            <span className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-slate-950/90 px-3 py-1.5 font-mono-meta text-[9px] font-semibold uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                                {t('buffering')}
                            </span>
                        )}
                    </div>
                </div>
            )}
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
            <div className={`absolute inset-0 z-[4] flex flex-col justify-between transition-opacity duration-300 ${showControls && !hideControls ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
                <div className="flex-1" onClick={isTouch ? undefined : handleVideoClick} />
                <VideoCenterButton
                    isTouch={isTouch}
                    isLoading={isInitialLoading}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    disabled={remoteMode && !liveDvr}
                />
                <div className="bg-gradient-to-t from-[#02040a]/95 via-[#02040a]/70 to-transparent px-3 pb-3 pt-16 sm:px-5 sm:pb-5">
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
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-2 py-1 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-3">
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
