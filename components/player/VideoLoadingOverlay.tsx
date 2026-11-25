import React from 'react';
import { useAppContext } from '../../context/AppContext';

interface VideoLoadingOverlayProps {
  isInitialLoading: boolean;
}

const VideoLoadingOverlay: React.FC<VideoLoadingOverlayProps> = ({ isInitialLoading }) => {
  const { t } = useAppContext();
  return (
    <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-950/35 backdrop-blur-[2px] transition-all duration-300 ${isInitialLoading ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/55 px-7 py-5 shadow-2xl backdrop-blur-xl">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-sky-300" />
          <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_16px_rgba(56,189,248,0.9)]" />
        </div>
        <span className="font-mono-meta text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">
          {t('loading')}
        </span>
      </div>
    </div>
  );
};

export default VideoLoadingOverlay;
