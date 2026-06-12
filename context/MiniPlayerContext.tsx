import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { MediaContent } from '../types';
import { EpisodeSerie } from '../lib/db';

export interface OverlayVideoData {
  src: string;
  poster: string;
  title: string;
  videoUid: string;
  currentTime: number;
  isPlaying: boolean;
}

export interface PlayerScreenData {
  type: 'episode' | 'movie';
  item: MediaContent;
  episode?: EpisodeSerie;
  onBack: () => void;
  onNavigateEpisode?: (direction: 'next' | 'prev' | EpisodeSerie) => void;
  onReturnHome: () => void;
}

type PlayerDataType = 'episode' | 'movie';

interface MiniPlayerContextType {
  overlayData: OverlayVideoData | null;
  isOverlayVisible: boolean;
  showOverlay: (data: OverlayVideoData) => void;
  hideOverlay: () => void;
  consumeRestoreData: () => OverlayVideoData | null;

  playerData: PlayerScreenData | null;
  setPlayerData: (data: PlayerScreenData | null) => void;
}

const MiniPlayerContext = createContext<MiniPlayerContextType | null>(null);

export function MiniPlayerProvider({ children }: { children: React.ReactNode }) {
  const [overlayData, setOverlayData] = useState<OverlayVideoData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerScreenData | null>(null);
  const restoreRef = useRef<OverlayVideoData | null>(null);

  const showOverlay = useCallback((data: OverlayVideoData) => {
    restoreRef.current = data;
    setOverlayData(data);
  }, []);

  const hideOverlay = useCallback(() => {
    setOverlayData(null);
  }, []);

  const consumeRestoreData = useCallback(() => {
    const data = restoreRef.current;
    restoreRef.current = null;
    return data;
  }, []);

  return (
    <MiniPlayerContext.Provider
      value={{
        overlayData,
        isOverlayVisible: overlayData !== null,
        showOverlay,
        hideOverlay,
        consumeRestoreData,
        playerData,
        setPlayerData,
      }}
    >
      {children}
    </MiniPlayerContext.Provider>
  );
}

export function useMiniPlayerContext() {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) throw new Error('useMiniPlayerContext must be used within MiniPlayerProvider');
  return ctx;
}
