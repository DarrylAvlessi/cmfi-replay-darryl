// components/VideoPlayer.tsx

import React from 'react';
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
    onPipTrigger?: () => void;
    videoRef?: React.RefObject<HTMLVideoElement>;
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
    onPipTrigger,
    videoRef: externalVideoRef,
}) => {
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
        showControls,
        showPreview,
        setShowPreview,
        hoverPos,
        previewHoverTime,
        seekFeedback,
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
        onPipTrigger,
        videoRef: externalVideoRef,
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
            <VideoLoadingOverlay isInitialLoading={isInitialLoading} />
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full"
                onClick={handleVideoClick}
                onError={handleVideoError}
            />
            <VideoFeedbackOverlay
                seekFeedback={seekFeedback}
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
                        onSeek={handleSeek}
                        onSliderChange={handleSliderChange}
                        onSliderInput={handleSliderInput}
                        onSliderMouseDown={handleSliderMouseDown}
                        onSliderMouseUp={handleSliderMouseUp}
                        onSeekBarHover={handleSeekBarHover}
                        onShowPreview={setShowPreview}
                        formatTime={formatTime}
                        previewVideoRef={previewVideoRef}
                        src={src}
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
                    />
                </div>
            </div>
        </div>
    );
};

export { formatTime, VideoPlayer };
