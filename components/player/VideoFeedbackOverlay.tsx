import React from 'react';
import { PlayIcon, PauseIcon, VolumeHighIcon, VolumeLowIcon, VolumeMuteIcon } from '../icons';

interface VideoFeedbackOverlayProps {
  seekFeedback: 'rewind' | 'forward' | null;
  seekStep?: number;
  isLongPressing: boolean;
  playPauseFeedback: 'play' | 'pause' | null;
  isLoading: boolean;
  volumeFeedback: 'up' | 'down' | 'mute' | null;
  volume: number;
  isMuted: boolean;
}

const VideoFeedbackOverlay: React.FC<VideoFeedbackOverlayProps> = ({
  seekFeedback, seekStep = 10, isLongPressing, playPauseFeedback, isLoading,
  volumeFeedback, volume, isMuted,
}) => (
  <div className="absolute inset-0 pointer-events-none">
    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-150 ${seekFeedback === 'rewind' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className="px-3 py-2 rounded-xl bg-black/60 text-white font-semibold text-sm backdrop-blur-sm border border-white/10 shadow-lg">
        -{seekStep}s
      </div>
    </div>
    <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-150 ${seekFeedback === 'forward' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className="px-3 py-2 rounded-xl bg-black/60 text-white font-semibold text-sm backdrop-blur-sm border border-white/10 shadow-lg">
        +{seekStep}s
      </div>
    </div>
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 ${isLongPressing ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
      <div className="px-4 py-2 rounded-xl bg-black/70 text-amber-400 font-bold text-lg backdrop-blur-sm border border-amber-500/30 shadow-lg">
        2x
      </div>
    </div>
    {volumeFeedback && (
      <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 transition-all duration-150 ${volumeFeedback ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/70 text-white backdrop-blur-sm border border-white/10 shadow-lg">
          {isMuted || volume === 0 ? (
            <VolumeMuteIcon className="w-5 h-5" />
          ) : volume < 0.5 ? (
            <VolumeLowIcon className="w-5 h-5" />
          ) : (
            <VolumeHighIcon className="w-5 h-5" />
          )}
          <span className="text-sm font-semibold tabular-nums">{Math.round(volume * 100)}%</span>
          <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-100"
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
          </div>
        </div>
      </div>
    )}
    {playPauseFeedback && !isLoading && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="feedback-pop bg-black/50 rounded-full p-4 backdrop-blur-sm">
          {playPauseFeedback === 'pause' ? (
            <PauseIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          ) : (
            <PlayIcon className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          )}
        </div>
      </div>
    )}
  </div>
);

export default VideoFeedbackOverlay;
