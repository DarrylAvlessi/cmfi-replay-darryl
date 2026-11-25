import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface SeekBarProps {
  duration: number;
  progress: number;
  buffered: number;
  hoverPos: number;
  previewHoverTime: number;
  showPreview: boolean;
  isScrubbing: boolean;
  onSliderInput: (e: React.FormEvent<HTMLInputElement>) => void;
  onSliderMouseDown: () => void;
  onSliderMouseUp: () => void;
  onSeekBarHover: (e: React.MouseEvent<HTMLDivElement>) => void;
  onShowPreview: (show: boolean) => void;
  formatTime: (seconds: number) => string;
  previewVideoRef: React.RefObject<HTMLVideoElement>;
  src?: string;
  disabled?: boolean;
  // Live DVR mode: bar spans [0, liveEdge] (expands with the stream).
  liveMode?: boolean;
  liveEdge?: number | null;
  currentTime?: number;
  ariaValueText?: string;
  // While scrubbing, the thumb/input render this drag-local value so live
  // edge ticks can't fight the user's finger.
  scrubProgress?: number | null;
}

const SeekBar: React.FC<SeekBarProps> = React.memo(function SeekBar({
  duration,
  progress,
  buffered,
  hoverPos,
  previewHoverTime,
  showPreview,
  isScrubbing,
  onSliderInput,
  onSliderMouseDown,
  onSliderMouseUp,
  onSeekBarHover,
  onShowPreview,
  formatTime,
  previewVideoRef,
  src,
  disabled = false,
  liveMode = false,
  liveEdge = null,
  currentTime = 0,
  ariaValueText,
  scrubProgress = null,
}) {
  const { t } = useAppContext();
  // Edge-anchored scaling: thumb sits at the far right when at the live edge.
  const edgeScale = liveMode && liveEdge && liveEdge > 0 ? liveEdge : 0;
  const displayProgress = edgeScale > 0
    ? Math.max(0, Math.min(100, (currentTime / edgeScale) * 100))
    : progress;
  const shownProgress = scrubProgress ?? displayProgress;
  const displayBuffered = edgeScale > 0 && duration > 0
    ? Math.max(0, Math.min(100, ((buffered / 100) * duration) / edgeScale * 100))
    : buffered;
  return (
  <div className="px-1 pt-2 pb-2 sm:px-2">
    <div
      className={`group relative w-full rounded-full transition-all duration-200 ${liveMode ? 'h-1 hover:h-1.5 bg-white/20' : 'h-1.5 hover:h-2 bg-white/20'} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      onMouseMove={onSeekBarHover}
      onMouseEnter={(e) => { onShowPreview(true); onSeekBarHover(e); }}
      onMouseLeave={() => onShowPreview(false)}
    >
      {/* Thumbnail Preview on Hover/Scrub */}
      <div
        className={`absolute bottom-full mb-3 pointer-events-none z-30 transition-all duration-150 ${
          (showPreview || isScrubbing) && duration > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          left: `${Math.max(8, Math.min(92, hoverPos * 100))}%`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="overflow-hidden rounded-xl border border-white/20 bg-slate-950 shadow-2xl">
          <video
            ref={previewVideoRef}
            src={src}
            className="w-40 h-[90px] object-cover"
            preload="metadata"
            muted
            playsInline
            crossOrigin="anonymous"
          />
          <div className="bg-slate-950/90 px-2 py-1 text-center font-mono-meta text-[10px] font-medium text-white">
            {formatTime(previewHoverTime)}
          </div>
        </div>
      </div>

      {/* Buffered Bar */}
      <div className="absolute inset-y-0 left-0 rounded-full bg-white/25 transition-all duration-200" style={{ width: `${displayBuffered}%` }} />

      {/* Progress Bar with Broadcast Cobalt-Cyan Gradient (crimson in live mode) */}
      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${liveMode ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_14px_rgba(225,29,72,0.65)]' : 'bg-gradient-to-r from-blue-600 to-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.55)]'}`} style={{ width: `${shownProgress}%` }}>
        <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 scale-75 rounded-full bg-white opacity-70 shadow-[0_0_8px_rgba(56,189,248,0.7)] ring-2 ring-sky-300/60 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
      </div>

      {/* Invisible Input for Interaction */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={shownProgress}
        onInput={onSliderInput}
        onMouseDown={onSliderMouseDown}
        onMouseUp={onSliderMouseUp}
        onTouchStart={onSliderMouseDown}
        onTouchEnd={onSliderMouseUp}
        disabled={disabled}
        className={`absolute inset-0 w-full h-full opacity-0 z-10 ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        aria-label={t('seekAria')}
        aria-valuetext={ariaValueText}
      />
    </div>
  </div>
  );
});

export default SeekBar;
