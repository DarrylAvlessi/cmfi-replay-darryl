import React, { createContext, useContext, useState, useCallback } from 'react';

const LS_VOLUME = 'cmfi_playback_volume';
const LS_RATE = 'cmfi_playback_rate';
const LS_MUTED = 'cmfi_playback_muted';

interface PlaybackPreferences {
  volume: number;
  setVolume: (v: number) => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
}

const PlaybackPrefsCtx = createContext<PlaybackPreferences | null>(null);

function loadNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? parseFloat(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveNum(key: string, val: number) {
  try { localStorage.setItem(key, String(val)); } catch {}
}

export function PlaybackPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [volume, setVolumeState] = useState(() => loadNum(LS_VOLUME, 1));
  const [playbackRate, setPlaybackRateState] = useState(() => loadNum(LS_RATE, 1));
  const [isMuted, setIsMutedState] = useState(() => {
    try { return localStorage.getItem(LS_MUTED) === 'true'; } catch { return false; }
  });

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    saveNum(LS_VOLUME, v);
  }, []);

  const setPlaybackRate = useCallback((r: number) => {
    setPlaybackRateState(r);
    saveNum(LS_RATE, r);
  }, []);

  const setIsMuted = useCallback((m: boolean) => {
    setIsMutedState(m);
    try { localStorage.setItem(LS_MUTED, String(m)); } catch {}
  }, []);

  return (
    <PlaybackPrefsCtx.Provider value={{ volume, setVolume, playbackRate, setPlaybackRate, isMuted, setIsMuted }}>
      {children}
    </PlaybackPrefsCtx.Provider>
  );
}

export function usePlaybackPrefs(): PlaybackPreferences {
  const ctx = useContext(PlaybackPrefsCtx);
  if (!ctx) throw new Error('usePlaybackPrefs must be used within PlaybackPreferencesProvider');
  return ctx;
}
