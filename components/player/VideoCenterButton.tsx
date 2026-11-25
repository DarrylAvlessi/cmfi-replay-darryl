import React from 'react';
import { PlayIcon, PauseIcon } from '../icons';

interface VideoCenterButtonProps {
  isTouch: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  disabled?: boolean;
}

const VideoCenterButton: React.FC<VideoCenterButtonProps> = ({
  isTouch, isLoading, isPlaying, onTogglePlay, disabled = false,
}) => {
  if ((!isTouch && isPlaying) || isLoading || disabled) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <button
        onClick={onTogglePlay}
        className="pointer-events-auto flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/35 bg-slate-950/45 text-white shadow-[0_12px_48px_rgba(0,0,0,0.45),0_0_36px_rgba(37,99,235,0.26)] backdrop-blur-md transition duration-200 hover:scale-105 hover:border-sky-300/70 hover:bg-blue-600/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:h-20 sm:w-20"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <PauseIcon className="h-7 w-7 text-white sm:h-8 sm:w-8" />
        ) : (
          <PlayIcon className="ml-1 h-7 w-7 text-white sm:h-8 sm:w-8" />
        )}
      </button>
    </div>
  );
};

export default VideoCenterButton;
