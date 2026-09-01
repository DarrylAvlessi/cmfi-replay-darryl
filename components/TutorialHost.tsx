import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver, DriveStep, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tutorial.css';
import { useTutorial } from '../context/TutorialContext';
import { useAppContext } from '../context/AppContext';
import {
  getTourById,
  getVisibleTourSteps,
  getTourStepText,
  resolveTourRoute,
  TourContext,
} from '../lib/tours';

const DOM_SETTLE_MS = 500;
const ELEMENT_WAIT_MS = 4000;
const ELEMENT_POLL_MS = 100;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(el: Element): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return el.getClientRects().length > 0;
}

function findVisibleElement(selector: string): Element | null {
  const nodes = document.querySelectorAll(selector);
  for (const node of nodes) {
    if (isVisible(node)) return node;
  }
  return null;
}

function waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = findVisibleElement(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const interval = setInterval(() => {
      const el = findVisibleElement(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() >= deadline) {
        clearInterval(interval);
        resolve(null);
      }
    }, ELEMENT_POLL_MS);
  });
}

const TutorialHost: React.FC = () => {
  const {
    activeTourId,
    currentStepIndex,
    setCurrentStepIndex,
    stopTour,
    markTourCompleted,
    advanceTourStep,
    onStepBeforeShow,
    closeSidebar,
    demoVideoUid,
  } = useTutorial();
  const { language, t } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  
    const driverRef = useRef<Driver | null>(null);
  const tourNavTokenRef = useRef(0);
  const prevNavTokenRef = useRef(0);
  const prevPathRef = useRef(location.pathname);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destroyDriver = useCallback(() => {
    if (driverRef.current) {
      driverRef.current.destroy();
      driverRef.current = null;
    }
  }, []);

  const finishTour = useCallback(
    (tourId: string) => {
      destroyDriver();
      markTourCompleted(tourId);
      stopTour();
    },
    [destroyDriver, markTourCompleted, stopTour]
  );

  useEffect(() => {
    const pathChanged = prevPathRef.current !== location.pathname;

    if (activeTourId && pathChanged) {
      if (prevNavTokenRef.current === tourNavTokenRef.current) {
        destroyDriver();
        stopTour();
        prevPathRef.current = location.pathname;
        return;
      }
      prevNavTokenRef.current = tourNavTokenRef.current;
    }
    prevPathRef.current = location.pathname;

    if (!activeTourId) {
      destroyDriver();
      prevNavTokenRef.current = tourNavTokenRef.current;
      return;
    }

    const tour = getTourById(activeTourId);
    if (!tour) {
      stopTour();
      return;
    }

    const isMobile = window.innerWidth < 1024;
    const ctx: TourContext = { demoVideoUid };
    const visibleSteps = getVisibleTourSteps(tour, isMobile, ctx);

    if (currentStepIndex >= visibleSteps.length) {
      finishTour(activeTourId);
      return;
    }

    const step = visibleSteps[currentStepIndex];
    const targetRoute = resolveTourRoute(step.route, ctx);

    let cancelled = false;

    const runStep = async () => {
      if (targetRoute && location.pathname !== targetRoute) {
        tourNavTokenRef.current++;
        closeSidebar();
        navigate(targetRoute);
        await wait(DOM_SETTLE_MS + 300);
      }

      if (cancelled) return;

      if (step.beforeShow) {
        onStepBeforeShow(step.beforeShow);
        await wait(DOM_SETTLE_MS);
      }

      if (cancelled) return;

      let element: Element | null = null;
      if (step.element) {
        element = await waitForElement(step.element, ELEMENT_WAIT_MS);

        // Route-scoped beforeShow handlers (e.g. switching a profile tab) may
        // not be registered until the destination screen mounts (lazy routes).
        // Re-apply the action and retry so the target element can appear.
        if (!element && step.beforeShow) {
          onStepBeforeShow(step.beforeShow);
          await wait(DOM_SETTLE_MS);
          if (cancelled) return;
          element = await waitForElement(step.element, ELEMENT_WAIT_MS);
        }
      }

      if (cancelled) return;

      // If a step declares a target element but it never appears in the DOM
      // (e.g. removing from an empty favorites list), skip the step instead of
      // falling back to an invisible dummy element and showing an orphaned popover.
      if (step.element && !element) {
        destroyDriver();
        if (currentStepIndex >= visibleSteps.length - 1) {
          finishTour(activeTourId);
        } else {
          advanceTourStep();
        }
        return;
      }

      destroyDriver();

      const totalSteps = visibleSteps.length;
      const stepNumber = currentStepIndex + 1;
      const isLast = currentStepIndex >= visibleSteps.length - 1;

      const driveStep: DriveStep = {
        popover: {
          title: getTourStepText(step, language, 'title'),
          description: getTourStepText(step, language, 'description'),
          popoverClass: 'tutorial-popover',
          showButtons: ['next', 'previous', 'close'],
          nextBtnText: isLast ? t('tourComplete') : t('nextStep'),
          prevBtnText: t('prevStep'),
          progressText: `${stepNumber} / ${totalSteps}`,
          disableButtons: [],
          onNextClick: () => {
            destroyDriver();
            if (isLast) {
              finishTour(activeTourId);
            } else {
              advanceTourStep();
            }
          },
          onPrevClick: () => {
            destroyDriver();
            if (currentStepIndex > 0) {
              setCurrentStepIndex(currentStepIndex - 1);
            }
          },
          onCloseClick: () => {
            destroyDriver();
            stopTour();
          },
        },
      };

      if (element && step.element) {
        driveStep.element = element;
      }

      const driverObj = driver({
        animate: true,
        overlayOpacity: 0.65,
        stagePadding: 8,
        stageRadius: 12,
        allowClose: true,
        disableActiveInteraction: true,
        showProgress: true,
        steps: [driveStep],
        onDestroyStarted: () => {
          if (driverObj.isActive()) {
            driverObj.destroy();
          }
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();

      refreshTimerRef.current = setTimeout(() => {
        if (driverRef.current?.isActive()) {
          driverRef.current.refresh();
        }
      }, 2500);
    };

    runStep();

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      destroyDriver();
    };
  }, [
    activeTourId,
    currentStepIndex,
    demoVideoUid,
    language,
    location.pathname,
    navigate,
    destroyDriver,
    finishTour,
    stopTour,
    advanceTourStep,
    setCurrentStepIndex,
    onStepBeforeShow,
    t,
  ]);

  return null;
};

export default TutorialHost;
