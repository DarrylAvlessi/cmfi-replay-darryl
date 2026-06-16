import React from 'react';

interface VideoLoadingOverlayProps {
  isInitialLoading: boolean;
}

const VideoLoadingOverlay: React.FC<VideoLoadingOverlayProps> = ({ isInitialLoading }) => (
  <div className={`absolute inset-0 flex items-center justify-center z-10 transition-all duration-300 ${isInitialLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
    <div className="flex flex-col items-center space-y-3">
      <div className="glide-spinner">
        <div className="glide-spinner__track" style={{ width: 56, height: 56 }}>
          <div className="glide-spinner__circle" style={{ width: 56, height: 56 }} />
          <div className="glide-spinner__circle" style={{ width: 44, height: 44, margin: 6 }} />
          <div className="glide-spinner__circle" style={{ width: 32, height: 32, margin: 12 }} />
          <div className="glide-spinner__circle" style={{ width: 20, height: 20, margin: 18 }} />
        </div>
      </div>
      <span className="text-white/60 text-xs font-medium tracking-widest animate-pulse">
        CHARGEMENT
      </span>
    </div>
  </div>
);

export default VideoLoadingOverlay;
