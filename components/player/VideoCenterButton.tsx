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
  if (!isTouch || isLoading || disabled) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <button
        onClick={onTogglePlay}
        className="pointer-events-auto w-16 h-16 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
      >
        {isPlaying ? (
          <PauseIcon className="w-8 h-8 text-white" />
        ) : (
          <PlayIcon className="w-8 h-8 text-white ml-0.5" />
        )}
      </button>
    </div>
  );
};

export default VideoCenterButton;
