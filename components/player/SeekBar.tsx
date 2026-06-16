import React from 'react';

interface SeekBarProps {
  duration: number;
  progress: number;
  buffered: number;
  hoverPos: number;
  previewHoverTime: number;
  showPreview: boolean;
  isScrubbing: boolean;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSliderInput: (e: React.FormEvent<HTMLInputElement>) => void;
  onSliderMouseDown: () => void;
  onSliderMouseUp: () => void;
  onSeekBarHover: (e: React.MouseEvent<HTMLDivElement>) => void;
  onShowPreview: (show: boolean) => void;
  formatTime: (seconds: number) => string;
  previewVideoRef: React.RefObject<HTMLVideoElement>;
  src?: string;
}

const SeekBar: React.FC<SeekBarProps> = ({
  duration,
  progress,
  buffered,
  hoverPos,
  previewHoverTime,
  showPreview,
  isScrubbing,
  onSeek,
  onSliderChange,
  onSliderInput,
  onSliderMouseDown,
  onSliderMouseUp,
  onSeekBarHover,
  onShowPreview,
  formatTime,
  previewVideoRef,
  src,
}) => (
  <div className="px-2 sm:px-4 pt-2 pb-0.5">
    <div
      className="relative w-full h-1.5 hover:h-2.5 transition-all duration-200 bg-black/30 rounded-full cursor-pointer group"
      onClick={onSeek}
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
        <div className="bg-black rounded-lg overflow-hidden shadow-xl border border-white/20">
          <video
            ref={previewVideoRef}
            src={src}
            className="w-40 h-[90px] object-cover"
            preload="metadata"
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
      <div className="absolute inset-y-0 left-0 bg-white/20 rounded-full transition-all duration-200" style={{ width: `${buffered}%` }} />

      {/* Progress Bar with Gradient and Glow */}
      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)] transition-all duration-100" style={{ width: `${progress}%` }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_6px_rgb(0_0_0/0.8)] opacity-60 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100 ring-2 ring-amber-500/50" />
      </div>

      {/* Invisible Input for Interaction */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        onChange={onSliderChange}
        onInput={onSliderInput}
        onMouseDown={onSliderMouseDown}
        onMouseUp={onSliderMouseUp}
        onTouchStart={onSliderMouseDown}
        onTouchEnd={onSliderMouseUp}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        aria-label="Seek"
      />
    </div>
  </div>
);

export default SeekBar;
