import React from 'react';
import { PlayIcon, PauseIcon, PipIcon, FullscreenEnterIcon, FullscreenExitIcon } from '../icons';
import VolumeControl from './VolumeControl';

interface ControlsBarProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  autoplayEnabled: boolean;
  playbackRate: number;
  showVolumeSlider: boolean;
  currentTime: number;
  duration: number;
  showAutoplayToggle: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
  onToggleAutoplay: () => void;
  onCyclePlaybackSpeed: () => void;
  onShowVolumeSlider: (show: boolean) => void;
  onVolumeSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeSliderInput: (e: React.FormEvent<HTMLInputElement>) => void;
  onVolumeSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (seconds: number) => string;
}

const ControlsBar: React.FC<ControlsBarProps> = ({
  isPlaying,
  isMuted,
  volume,
  isFullscreen,
  autoplayEnabled,
  playbackRate,
  showVolumeSlider,
  currentTime,
  duration,
  showAutoplayToggle,
  onTogglePlay,
  onToggleMute,
  onTogglePip,
  onToggleFullscreen,
  onToggleAutoplay,
  onCyclePlaybackSpeed,
  onShowVolumeSlider,
  onVolumeSliderChange,
  onVolumeSliderInput,
  onVolumeSeek,
  formatTime,
}) => (
  <div className="px-2 sm:px-4 pb-2 sm:pb-3">
      <div className="flex items-center justify-between text-white text-sm font-medium">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={onTogglePlay}
            className="p-1 rounded-full hover:bg-white/15 backdrop-blur-sm transition-colors duration-200 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" /> : <PlayIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />}
          </button>
        <VolumeControl
          isMuted={isMuted}
          volume={volume}
          showVolumeSlider={showVolumeSlider}
          onShowVolumeSlider={onShowVolumeSlider}
          onToggleMute={onToggleMute}
          onVolumeSliderChange={onVolumeSliderChange}
          onVolumeSliderInput={onVolumeSliderInput}
          onVolumeSeek={onVolumeSeek}
        />
        <span className="text-[13px] text-white/90 font-medium tabular-nums leading-none drop-shadow-[0_1px_1px_rgb(0_0_0/0.6)]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        {showAutoplayToggle && (
          <button
            onClick={onToggleAutoplay}
            className={`relative w-11 h-5 rounded-full p-0.5 transition-colors duration-200 ${
              autoplayEnabled ? 'bg-amber-500' : 'bg-gray-700'
            }`}
            title={`Lecture automatique ${autoplayEnabled ? 'activée' : 'désactivée'}`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                autoplayEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {autoplayEnabled ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  <path d="M10 16l6-4-6-4v8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-gray-700">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  <path d="M9 16h2V8H9v8zm4 0h2V8h-2v8z" />
                </svg>
              )}
            </div>
          </button>
        )}
        <button
          onClick={onCyclePlaybackSpeed}
          className="px-2 py-1 rounded-full bg-black/40 text-white text-xs font-medium backdrop-blur-sm hover:bg-black/50 transition-colors leading-none drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]"
          aria-label="Playback speed"
        >
          {playbackRate % 1 === 0
            ? playbackRate.toFixed(0)
            : playbackRate.toFixed(2).replace(/0$/, '')}
          x
        </button>
        <button
          onClick={onTogglePip}
          className="p-1 rounded-full hover:bg-white/15 backdrop-blur-sm transition-colors duration-200 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
          title="Mode image dans l'image"
          aria-label="Picture in Picture"
        >
          <PipIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />
        </button>
        <button
          onClick={onToggleFullscreen}
          className="p-1 rounded-full hover:bg-white/15 backdrop-blur-sm transition-colors duration-200 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <FullscreenExitIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />
          ) : (
            <FullscreenEnterIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />
          )}
        </button>
      </div>
    </div>
  </div>
);

export default ControlsBar;
