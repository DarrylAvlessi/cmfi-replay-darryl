import React from 'react';
import { VolumeHighIcon, VolumeLowIcon, VolumeMuteIcon } from '../icons';

interface VolumeControlProps {
  isMuted: boolean;
  volume: number;
  showVolumeSlider: boolean;
  onShowVolumeSlider: (show: boolean) => void;
  onToggleMute: () => void;
  onVolumeSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeSliderInput: (e: React.FormEvent<HTMLInputElement>) => void;
  onVolumeSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  isMuted,
  volume,
  showVolumeSlider,
  onShowVolumeSlider,
  onToggleMute,
  onVolumeSliderChange,
  onVolumeSliderInput,
  onVolumeSeek,
}) => (
  <div
    className="relative flex items-center group/vol"
    onMouseEnter={() => onShowVolumeSlider(true)}
    onMouseLeave={() => onShowVolumeSlider(false)}
  >
    <button
      onClick={onToggleMute}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted || volume === 0 ? (
        <VolumeMuteIcon         className="h-4 w-4" />
      ) : volume < 0.5 ? (
        <VolumeLowIcon         className="h-4 w-4" />
      ) : (
        <VolumeHighIcon         className="h-4 w-4" />
      )}
    </button>
    <div
      className={`overflow-hidden transition-all duration-200 ${
        showVolumeSlider ? 'w-24 opacity-100 ml-1.5' : 'w-0 opacity-0'
      }`}
    >
      <div className="flex items-center w-24">
        <div
          className="group relative h-1 w-full cursor-pointer rounded-full bg-white/20"
          onClick={onVolumeSeek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-sky-300"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 scale-75 rounded-full bg-white opacity-70 shadow transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 ring-2 ring-sky-300/60" />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={onVolumeSliderChange}
            onInput={onVolumeSliderInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  </div>
);

export default VolumeControl;
