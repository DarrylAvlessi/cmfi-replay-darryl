import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { movieService } from '../lib/db';
import { getTourById } from '../lib/tours';

const COMPLETED_TOURS_KEY = 'completedTours';
const TUTORIAL_PROMPT_KEY = 'tutorialPromptDismissed';

interface TutorialContextType {
  activeTourId: string | null;
  isTourRunning: boolean;
  completedTours: string[];
  showTutorialPrompt: boolean;
  demoVideoUid: string | null;
  startTour: (tourId: string) => Promise<void>;
  stopTour: () => void;
  markTourCompleted: (tourId: string) => void;
  isTourCompleted: (tourId: string) => boolean;
  dismissTutorialPrompt: (permanent?: boolean) => void;
  acceptTutorialPrompt: () => Promise<void>;
  registerSidebarOpener: (fn: () => void) => void;
  registerProfileTabSetter: (fn: (tab: string) => void) => void;
  openSidebar: () => void;
  setProfileTab: (tab: string) => void;
  onStepBeforeShow: (action: string) => void;
  advanceTourStep: () => void;
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  canStartTour: boolean;
  setCanStartTour: (value: boolean) => void;
  tryShowTutorialPrompt: () => void;
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
  const [demoVideoUid, setDemoVideoUid] = useState<string | null>(null);
  const [canStartTour, setCanStartTour] = useState(true);
  const sidebarOpenerRef = useRef<(() => void) | null>(null);
  const profileTabSetterRef = useRef<((tab: string) => void) | null>(null);

  const registerSidebarOpener = useCallback((fn: () => void) => {
    sidebarOpenerRef.current = fn;
  }, []);

  const registerProfileTabSetter = useCallback((fn: (tab: string) => void) => {
    profileTabSetterRef.current = fn;
  }, []);

  const openSidebar = useCallback(() => {
    sidebarOpenerRef.current?.();
  }, []);

  const setProfileTab = useCallback((tab: string) => {
    profileTabSetterRef.current?.(tab);
  }, []);

  const markTourCompleted = useCallback((tourId: string) => {
    setCompletedTours((prev) => {
      if (prev.includes(tourId)) return prev;
      const next = [...prev, tourId];
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

  const startTour = useCallback(
    async (tourId: string) => {
      const tour = getTourById(tourId);
      if (!tour) return;

      setShowTutorialPrompt(false);

      if (tourId === 'player') {
        const uid = await fetchDemoVideoUid();
        setDemoVideoUid(uid);
      }

      setCurrentStepIndex(0);
      setActiveTourId(tourId);
    },
    [canStartTour, fetchDemoVideoUid]
  );

  const dismissTutorialPrompt = useCallback((permanent = false) => {
    setShowTutorialPrompt(false);
    if (permanent) {
      localStorage.setItem(TUTORIAL_PROMPT_KEY, 'true');
    }
  }, []);

  const acceptTutorialPrompt = useCallback(async () => {
    localStorage.setItem(TUTORIAL_PROMPT_KEY, 'true');
    setShowTutorialPrompt(false);
    await startTour('getting-started');
  }, [startTour]);

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
    if (shouldShowTutorialPrompt()) {
      setShowTutorialPrompt(true);
    }
  }, [canStartTour]);

  const value = useMemo(
    () => ({
      activeTourId,
      isTourRunning: activeTourId !== null,
      completedTours,
      showTutorialPrompt,
      demoVideoUid,
      startTour,
      stopTour,
      markTourCompleted,
      isTourCompleted,
      dismissTutorialPrompt,
      acceptTutorialPrompt,
      registerSidebarOpener,
      registerProfileTabSetter,
      openSidebar,
      setProfileTab,
      onStepBeforeShow,
      advanceTourStep,
      currentStepIndex,
      setCurrentStepIndex,
      canStartTour,
      setCanStartTour,
      tryShowTutorialPrompt,
    }),
    [
      activeTourId,
      completedTours,
      showTutorialPrompt,
      demoVideoUid,
      startTour,
      stopTour,
      markTourCompleted,
      isTourCompleted,
      dismissTutorialPrompt,
      acceptTutorialPrompt,
      registerSidebarOpener,
      registerProfileTabSetter,
      openSidebar,
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

export function shouldShowTutorialPrompt(): boolean {
  if (localStorage.getItem(TUTORIAL_PROMPT_KEY) === 'true') return false;
  const completed = readCompletedTours();
  return !completed.includes('getting-started');
}

export { TUTORIAL_PROMPT_KEY };
