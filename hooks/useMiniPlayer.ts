import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMiniPlayerOptions {
  enabled?: boolean;
}

export function useMiniPlayer({ enabled = true }: UseMiniPlayerOptions = {}) {
  const [isMini, setIsMini] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) {
      setIsMini(false);
      return;
    }

    // Check initial visibility in case sentinel is already scrolled out of view
    const rect = sentinel.getBoundingClientRect();
    const isOutOfView = rect.bottom < 0 || rect.top > window.innerHeight;
    if (isOutOfView) {
      setIsMini(true);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMini(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled]);

  const closeMiniPlayer = useCallback(() => {
    setIsMini(false);
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return { isMini, sentinelRef, closeMiniPlayer };
}
