import React, { createContext, useContext, useState, useCallback } from 'react';
import { MediaContent } from '../types';
import { EpisodeSerie } from '../lib/db';

export interface PlayerScreenData {
  type: 'episode' | 'movie';
  item: MediaContent;
  episode?: EpisodeSerie;
  onBack: () => void;
  onNavigateEpisode?: (direction: 'next' | 'prev' | EpisodeSerie) => void;
  onReturnHome: () => void;
}

interface MiniPlayerContextType {
  playerData: PlayerScreenData | null;
  setPlayerData: (data: PlayerScreenData | null) => void;
  isCollapsed: boolean;
  collapse: () => void;
  restore: () => void;
  fullyClose: () => void;
}

const MiniPlayerContext = createContext<MiniPlayerContextType | null>(null);

export function MiniPlayerProvider({ children }: { children: React.ReactNode }) {
  const [playerData, setPlayerData] = useState<PlayerScreenData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const restore = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const fullyClose = useCallback(() => {
    setIsCollapsed(false);
    setPlayerData(null);
  }, []);

  return (
    <MiniPlayerContext.Provider
      value={{
        playerData,
        setPlayerData,
        isCollapsed,
        collapse,
        restore,
        fullyClose,
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
