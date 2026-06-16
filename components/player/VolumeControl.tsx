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
      className="p-1 rounded-full hover:bg-white/15 backdrop-blur-sm transition-colors duration-200 drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
      aria-label={isMuted ? 'Unmute' : 'Mute'}
    >
      {isMuted || volume === 0 ? (
        <VolumeMuteIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />
      ) : volume < 0.5 ? (
        <VolumeLowIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />
      ) : (
        <VolumeHighIcon className="w-5 h-5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.7)]" />
      )}
    </button>
    <div
      className={`overflow-hidden transition-all duration-200 ${
        showVolumeSlider ? 'w-24 opacity-100 ml-1.5' : 'w-0 opacity-0'
      }`}
    >
      <div className="flex items-center w-24">
        <div
          className="relative w-full h-1 bg-black/30 rounded-full cursor-pointer group"
          onClick={onVolumeSeek}
        >
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_6px_rgb(0_0_0/0.8)] opacity-60 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100 ring-2 ring-amber-500/50" />
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
