import React from 'react';

interface VideoBufferingIndicatorProps {
  isBuffering: boolean;
}

const VideoBufferingIndicator: React.FC<VideoBufferingIndicatorProps> = ({ isBuffering }) => (
  <div
    className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300 ${
      isBuffering ? 'opacity-100' : 'opacity-0'
    }`}
  >
    <div className="flex items-center space-x-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-amber-500/80"
          style={{ animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
    </div>
  </div>
);

export default VideoBufferingIndicator;
