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

function waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const deadline = Date.now() + timeoutMs;
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
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
    demoVideoUid,
  } = useTutorial();
  const { language, t } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
    const driverRef = useRef<Driver | null>(null);
  const tourNavTokenRef = useRef(0);
  const prevNavTokenRef = useRef(0);
  const prevPathRef = useRef(location.pathname);

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
    if (!activeTourId) {
      destroyDriver();
      return;
    }

    const tour = getTourById(activeTourId);
    if (!tour) {
      stopTour();
      return;
    }

    const isMobile = window.innerWidth < 1024;
    const visibleSteps = getVisibleTourSteps(tour, isMobile);

    if (currentStepIndex >= visibleSteps.length) {
      finishTour(activeTourId);
      return;
    }

    const step = visibleSteps[currentStepIndex];
    const ctx: TourContext = { demoVideoUid };
    const targetRoute = resolveTourRoute(step.route, ctx);

    let cancelled = false;

    const runStep = async () => {
      if (step.beforeShow) {
        onStepBeforeShow(step.beforeShow);
        await wait(DOM_SETTLE_MS);
      }

      if (targetRoute && location.pathname !== targetRoute) {
        tourNavTokenRef.current++;
        navigate(targetRoute);
        await wait(DOM_SETTLE_MS + 300);
      }

      if (cancelled) return;

      let element: Element | null = null;
      if (step.element) {
        element = await waitForElement(step.element, ELEMENT_WAIT_MS);
      }

      if (cancelled) return;

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
        driveStep.element = step.element;
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
    };

    runStep();

    return () => {
      cancelled = true;
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

  useEffect(() => {
    if (!activeTourId) {
      prevPathRef.current = location.pathname;
      prevNavTokenRef.current = tourNavTokenRef.current;
      return;
    }

    const pathChanged = prevPathRef.current !== location.pathname;

    if (pathChanged) {
      if (prevNavTokenRef.current !== tourNavTokenRef.current) {
        prevNavTokenRef.current = tourNavTokenRef.current;
      } else {
        destroyDriver();
        stopTour();
      }
    }

    prevPathRef.current = location.pathname;
  }, [location.pathname, activeTourId, destroyDriver, stopTour]);

  return null;
};

export default TutorialHost;
