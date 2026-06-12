import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMiniPlayerContext } from '../context/MiniPlayerContext';
import { useDraggable } from '../hooks/useDraggable';
import { PlayIcon, PauseIcon } from './icons';

const MiniPlayerOverlay: React.FC = () => {
  const { overlayData, isOverlayVisible, hideOverlay, consumeRestoreData } = useMiniPlayerContext();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { position: dragPosition, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, hasDraggedRef } = useDraggable();
  const [isPaused, setIsPaused] = React.useState(false);

  useEffect(() => {
    if (!isOverlayVisible || !overlayData) return;
    const video = videoRef.current;
    if (!video) return;

    video.src = overlayData.src;
    video.currentTime = overlayData.currentTime;
    video.muted = false;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        setIsPaused(true);
      });
    }
    setIsPaused(!overlayData.isPlaying);

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [isOverlayVisible, overlayData]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    hideOverlay();
  };

  const handleRestore = () => {
    if (!overlayData || hasDraggedRef.current) return;
    hideOverlay();
    navigate(`/watch/${overlayData.videoUid}`);
  };

  if (!isOverlayVisible || !overlayData) return null;

  return (
    <div
      className="fixed z-[9999] w-48 md:w-64 aspect-video rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-black"
      style={{
        position: 'fixed',
        ...(dragPosition ? { left: dragPosition.x, top: dragPosition.y } : { bottom: 16, right: 16 }),
        touchAction: 'none',
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleRestore}
        className="absolute inset-0 z-10"
        style={{ touchAction: 'none' }}
      />
      <video
        ref={videoRef}
        className="w-full h-full object-cover pointer-events-none"
        poster={overlayData.poster}
      />

      <button
        onClick={handleTogglePlay}
        className="absolute bottom-2 left-2 z-20 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
      >
        {isPaused ? (
          <PlayIcon className="w-3.5 h-3.5" />
        ) : (
          <PauseIcon className="w-3.5 h-3.5" />
        )}
      </button>

      <button
        onClick={handleClose}
        className="absolute top-1.5 right-1.5 z-20 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
      >
        ✕
      </button>
    </div>
  );
};

export default MiniPlayerOverlay;
