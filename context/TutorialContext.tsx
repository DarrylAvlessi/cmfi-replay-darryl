import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { movieService } from '../lib/db';
import { getTourById } from '../lib/tours';

const COMPLETED_TOURS_KEY = 'completedTours';
const TUTORIAL_PROMPT_KEY = 'tutorialPromptDismissed';
const PER_TOUR_PROMPT_PREFIX = 'tourPromptDismissed_';

interface TutorialContextType {
  activeTourId: string | null;
  isTourRunning: boolean;
  completedTours: string[];
  showTutorialPrompt: boolean;
  pendingTourId: string | null;
  demoVideoUid: string | null;
  playerTourAvailable: boolean;
  startTour: (tourId: string) => Promise<void>;
  stopTour: () => void;
  markTourCompleted: (tourId: string) => void;
  isTourCompleted: (tourId: string) => boolean;
  dismissTutorialPrompt: (permanent?: boolean) => void;
  acceptTutorialPrompt: () => Promise<void>;
  registerSidebarOpener: (fn: () => void) => void;
  registerSidebarCloser: (fn: () => void) => void;
  registerProfileTabSetter: (fn: (tab: string) => void) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setProfileTab: (tab: string) => void;
  onStepBeforeShow: (action: string) => void;
  advanceTourStep: () => void;
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  canStartTour: boolean;
  setCanStartTour: (value: boolean) => void;
  tryShowTutorialPrompt: () => void;
  tryShowTourPrompt: (tourId: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

function readCompletedTours(): string[] {
  try {
    const raw = localStorage.getItem(COMPLETED_TOURS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>(readCompletedTours);
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false);
  const [pendingTourId, setPendingTourId] = useState<string | null>(null);
  const [demoVideoUid, setDemoVideoUid] = useState<string | null>(null);
  const [playerTourAvailable, setPlayerTourAvailable] = useState(false);
  const [canStartTour, setCanStartTour] = useState(true);
  const sidebarOpenerRef = useRef<(() => void) | null>(null);
  const sidebarCloserRef = useRef<(() => void) | null>(null);
  const profileTabSetterRef = useRef<((tab: string) => void) | null>(null);

  const registerSidebarOpener = useCallback((fn: () => void) => {
    sidebarOpenerRef.current = fn;
  }, []);

  const registerSidebarCloser = useCallback((fn: () => void) => {
    sidebarCloserRef.current = fn;
  }, []);

  const registerProfileTabSetter = useCallback((fn: (tab: string) => void) => {
    profileTabSetterRef.current = fn;
  }, []);

  const openSidebar = useCallback(() => {
    sidebarOpenerRef.current?.();
  }, []);

  const closeSidebar = useCallback(() => {
    sidebarCloserRef.current?.();
  }, []);

  const setProfileTab = useCallback((tab: string) => {
    profileTabSetterRef.current?.(tab);
  }, []);

  const SUB_TOUR_IDS = ['app-tour', 'getting-started', 'search', 'profile', 'player'];

  const markTourCompleted = useCallback((tourId: string) => {
    setCompletedTours((prev) => {
      const toAdd = tourId === 'app-tour' ? SUB_TOUR_IDS : [tourId];
      const next = [...prev];
      for (const id of toAdd) {
        if (!next.includes(id)) next.push(id);
      }
      localStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isTourCompleted = useCallback(
    (tourId: string) => completedTours.includes(tourId),
    [completedTours]
  );

  const stopTour = useCallback(() => {
    setActiveTourId(null);
    setCurrentStepIndex(0);
  }, []);

  const fetchDemoVideoUid = useCallback(async (): Promise<string | null> => {
    try {
      const movies = await movieService.getPopularMovies(1);
      return movies[0]?.uid ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetchDemoVideoUid().then((uid) => {
      if (uid) {
        setDemoVideoUid(uid);
        setPlayerTourAvailable(true);
      }
    });
  }, [fetchDemoVideoUid]);

  const startTour = useCallback(
    async (tourId: string) => {
      const tour = getTourById(tourId);
      if (!tour) return;

      setShowTutorialPrompt(false);

      if (tourId === 'player' && !playerTourAvailable) return;

      setCurrentStepIndex(0);
      setActiveTourId(tourId);
    },
    [canStartTour, playerTourAvailable]
  );

  const dismissTutorialPrompt = useCallback((permanent = false) => {
    const tourId = pendingTourId ?? 'app-tour';
    setShowTutorialPrompt(false);
    setPendingTourId(null);
    if (permanent) {
      localStorage.setItem(`${PER_TOUR_PROMPT_PREFIX}${tourId}`, 'true');
      if (tourId === 'getting-started') {
        localStorage.setItem(TUTORIAL_PROMPT_KEY, 'true');
      }
    }
  }, [pendingTourId]);

  const acceptTutorialPrompt = useCallback(async () => {
    const tourId = pendingTourId ?? 'app-tour';
    localStorage.setItem(`${PER_TOUR_PROMPT_PREFIX}${tourId}`, 'true');
    if (tourId === 'getting-started') {
      localStorage.setItem(TUTORIAL_PROMPT_KEY, 'true');
    }
    setShowTutorialPrompt(false);
    setPendingTourId(null);
    await startTour(tourId);
  }, [pendingTourId, startTour]);

  const onStepBeforeShow = useCallback(
    (action: string) => {
      if (action === 'openSidebar') openSidebar();
      if (action === 'profileHistoryTab') setProfileTab('history');
      if (action === 'profileAccountTab') setProfileTab('account');
    },
    [openSidebar, setProfileTab]
  );

  const advanceTourStep = useCallback(() => {
    setCurrentStepIndex((prev) => prev + 1);
  }, []);

  const tryShowTutorialPrompt = useCallback(() => {
    if (!canStartTour) return;
    if (shouldShowTourPrompt('app-tour')) {
      setShowTutorialPrompt(true);
    }
  }, [canStartTour]);

  const tryShowTourPrompt = useCallback((tourId: string) => {
    if (!canStartTour) return;
    if (activeTourId !== null) return;
    if (tourId === 'player' && !playerTourAvailable) return;
    if (!shouldShowTourPrompt(tourId)) return;
    setPendingTourId(tourId);
    setShowTutorialPrompt(true);
  }, [canStartTour, activeTourId, playerTourAvailable]);

  const value = useMemo(
    () => ({
      activeTourId,
      isTourRunning: activeTourId !== null,
      completedTours,
      showTutorialPrompt,
      pendingTourId,
      demoVideoUid,
      playerTourAvailable,
      startTour,
      stopTour,
      markTourCompleted,
      isTourCompleted,
      dismissTutorialPrompt,
      acceptTutorialPrompt,
      registerSidebarOpener,
      registerSidebarCloser,
      registerProfileTabSetter,
      openSidebar,
      closeSidebar,
      setProfileTab,
      onStepBeforeShow,
      advanceTourStep,
      currentStepIndex,
      setCurrentStepIndex,
      canStartTour,
      setCanStartTour,
      tryShowTutorialPrompt,
      tryShowTourPrompt,
    }),
    [
      activeTourId,
      completedTours,
      showTutorialPrompt,
      pendingTourId,
      demoVideoUid,
      playerTourAvailable,
      startTour,
      stopTour,
      markTourCompleted,
      isTourCompleted,
      dismissTutorialPrompt,
      acceptTutorialPrompt,
      registerSidebarOpener,
      registerSidebarCloser,
      registerProfileTabSetter,
      openSidebar,
      closeSidebar,
      setProfileTab,
      onStepBeforeShow,
      advanceTourStep,
      currentStepIndex,
      canStartTour,
      tryShowTutorialPrompt,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
};

export function useTutorial(): TutorialContextType {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return ctx;
}

export function shouldShowTourPrompt(tourId: string): boolean {
  if (tourId === 'getting-started' || tourId === 'app-tour') {
    if (localStorage.getItem(TUTORIAL_PROMPT_KEY) === 'true') return false;
  }
  if (localStorage.getItem(`${PER_TOUR_PROMPT_PREFIX}${tourId}`) === 'true') return false;
  const completed = readCompletedTours();
  return !completed.includes(tourId);
}

export function shouldShowTutorialPrompt(): boolean {
  return shouldShowTourPrompt('getting-started');
}

export { TUTORIAL_PROMPT_KEY, PER_TOUR_PROMPT_PREFIX };
