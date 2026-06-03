import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMiniPlayerOptions {
  enabled?: boolean;
}

export function useMiniPlayer({ enabled = true }: UseMiniPlayerOptions = {}) {
  const [isMini, setIsMini] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobileOrTablet(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !isMobileOrTablet || !enabled) {
      setIsMini(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMini(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobileOrTablet, enabled]);

  const closeMiniPlayer = useCallback(() => {
    setIsMini(false);
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return { isMini, sentinelRef, closeMiniPlayer };
}
