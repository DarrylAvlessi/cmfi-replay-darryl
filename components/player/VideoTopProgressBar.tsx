import React from 'react';

interface VideoTopProgressBarProps {
  isBuffering: boolean;
  bufferedPercent: number;
}

const VideoTopProgressBar: React.FC<VideoTopProgressBarProps> = ({ isBuffering, bufferedPercent }) => (
  <div
    className={`absolute top-0 left-0 right-0 z-20 h-0.5 transition-all duration-300 ${
      isBuffering ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <div
      className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-shimmer"
      style={{ width: `${bufferedPercent}%`, transition: 'width 0.3s ease' }}
    />
  </div>
);

export default VideoTopProgressBar;
