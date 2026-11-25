import React from 'react';
import { useAppContext } from '../../context/AppContext';
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
  // Watch-together guests: lock play / autoplay / speed buttons.
  // Volume, PiP and fullscreen stay interactive.
  disabled?: boolean;
  // Live DVR guests regain the play button but speed/autoplay stay locked.
  lockSpeed?: boolean;
  // Live mode: time slot becomes a LIVE badge / negative offset + jump control.
  liveMode?: boolean;
  isBehindLive?: boolean;
  behindBySec?: number;
  onJumpToLive?: () => void;
  liveBadgeText?: string;
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
  disabled = false,
  lockSpeed = false,
  liveMode = false,
  isBehindLive = false,
  behindBySec = 0,
  onJumpToLive,
  liveBadgeText = 'LIVE',
}) => {
  const { t } = useAppContext();
  return (
    <div className="flex min-h-11 items-center justify-between gap-2 px-1 py-1 text-white sm:gap-4 sm:px-2" data-tour="player-controls">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={onTogglePlay}
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 disabled:cursor-default disabled:opacity-40"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="ml-0.5 h-4 w-4" />}
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
        {liveMode ? (
          isBehindLive && onJumpToLive ? (
            <span className="flex items-center gap-1.5 whitespace-nowrap leading-none">
              <button
                onClick={onJumpToLive}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 font-mono-meta text-[10px] font-bold tracking-wider text-white/80 transition hover:bg-white/20"
                aria-label={t('jumpToLiveAria')}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                {liveBadgeText}
              </button>
              <span className="font-mono-meta text-[11px] font-medium tabular-nums text-white/70 sm:text-xs">
                -{formatTime(Math.max(0, Math.round(behindBySec)))}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-400/20 bg-rose-500/15 px-2 py-1.5 font-mono-meta text-[10px] font-bold tracking-wider text-rose-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
              {liveBadgeText}
            </span>
          )
        ) : (
          <span className="hidden whitespace-nowrap font-mono-meta text-[11px] font-medium tabular-nums text-white/70 sm:inline sm:text-xs">
            {formatTime(currentTime)} <span className="text-white/30">/</span> {formatTime(duration)}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {showAutoplayToggle && !disabled && !lockSpeed && (
          <button
            onClick={onToggleAutoplay}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/10"
            title={`Lecture automatique ${autoplayEnabled ? 'activée' : 'désactivée'}`}
            aria-label={`Lecture automatique ${autoplayEnabled ? 'activée' : 'désactivée'}`}
            aria-pressed={autoplayEnabled}
          >
            <span className="hidden font-mono-meta text-[9px] font-semibold uppercase tracking-wider text-white/55 md:inline">Auto</span>
            <span className={`relative h-5 w-9 rounded-full p-0.5 transition-colors ${
              autoplayEnabled ? 'bg-blue-500' : 'bg-slate-600'
            }`}>
              <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                autoplayEnabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </span>
          </button>
        )}
        <button
          onClick={onCyclePlaybackSpeed}
          disabled={disabled || lockSpeed}
          className="min-w-11 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2 font-mono-meta text-[10px] font-semibold leading-none text-white/80 transition hover:border-sky-300/30 hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-40"
          aria-label={t('playbackSpeedAria')}
        >
          {playbackRate % 1 === 0
            ? playbackRate.toFixed(0)
            : playbackRate.toFixed(2).replace(/0$/, '')}
          x
        </button>
        <button
          onClick={onTogglePip}
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white sm:flex"
          title="Mode image dans l'image"
          aria-label="Picture in Picture"
        >
          <PipIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <FullscreenExitIcon className="h-4 w-4" /> : <FullscreenEnterIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

export default ControlsBar;
