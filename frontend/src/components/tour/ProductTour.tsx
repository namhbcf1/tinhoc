import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleHelp, SkipForward, X } from 'lucide-react';
import { trackEvent } from '../../utils/analytics-track';
import { ONBOARDING_SCENARIOS, type TourContext, type TourPlacement, type TourScenario, type TourStep } from './onboarding-scenarios';
import './ProductTour.css';

type TourStatus = 'completed' | 'skipped';

const STORAGE_PREFIX = 'vt:onboarding';
const MAX_STEPS = 100;

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }

  return { width: window.innerWidth, height: window.innerHeight };
}

function getDeviceTypeFromViewport(width: number): 'mobile' | 'desktop' {
  return width <= 768 ? 'mobile' : 'desktop';
}

function detectTourContext(pathname: string): TourContext {
  if (pathname.startsWith('/admin/dashboard')) {
    return 'admin';
  }

  if (pathname.startsWith('/dashboard')) {
    return 'student';
  }

  return 'public';
}

function isRouteEligible(pathname: string, routePrefixes: string[]) {
  return routePrefixes.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/';
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function isStepRouteActive(route: string, pathname: string, search: string, hash: string) {
  const parsed = new URL(route, 'https://tour.local');
  if (pathname !== parsed.pathname) {
    return false;
  }

  if (parsed.search && search !== parsed.search) {
    return false;
  }

  if (parsed.hash && hash !== parsed.hash) {
    return false;
  }

  return true;
}

function getTooltipPosition({
  placement,
  rect,
  viewport,
  isMobile,
}: {
  placement: TourPlacement;
  rect: DOMRect | null;
  viewport: { width: number; height: number };
  isMobile: boolean;
}) {
  const cardWidth = isMobile
    ? Math.min(viewport.width - 20, 360)
    : Math.min(380, viewport.width - 24);
  const estimatedCardHeight = 220;
  const gutter = 14;

  if (!rect || placement === 'center') {
    return {
      top: viewport.height / 2,
      left: viewport.width / 2,
      transform: 'translate(-50%, -50%)',
      maxWidth: `${cardWidth}px`,
    };
  }

  let resolvedPlacement = placement;
  if (placement === 'auto') {
    const enoughBelow = viewport.height - rect.bottom > estimatedCardHeight + gutter;
    const enoughAbove = rect.top > estimatedCardHeight + gutter;
    if (enoughBelow) {
      resolvedPlacement = 'bottom';
    } else if (enoughAbove) {
      resolvedPlacement = 'top';
    } else {
      resolvedPlacement = 'center';
    }
  }

  if (resolvedPlacement === 'center') {
    return {
      top: viewport.height / 2,
      left: viewport.width / 2,
      transform: 'translate(-50%, -50%)',
      maxWidth: `${cardWidth}px`,
    };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const safeLeft = 12;
  const safeRight = viewport.width - cardWidth - 12;

  if (resolvedPlacement === 'top') {
    const left = Math.min(Math.max(centerX - cardWidth / 2, safeLeft), safeRight);
    return {
      top: Math.max(12, rect.top - gutter),
      left,
      transform: 'translateY(-100%)',
      maxWidth: `${cardWidth}px`,
    };
  }

  if (resolvedPlacement === 'bottom') {
    const left = Math.min(Math.max(centerX - cardWidth / 2, safeLeft), safeRight);
    return {
      top: Math.min(viewport.height - 12, rect.bottom + gutter),
      left,
      transform: 'translateY(0)',
      maxWidth: `${cardWidth}px`,
    };
  }

  if (resolvedPlacement === 'left') {
    return {
      top: Math.min(Math.max(centerY - estimatedCardHeight / 2, 12), viewport.height - 12),
      left: Math.max(12, rect.left - gutter),
      transform: 'translate(-100%, -50%)',
      maxWidth: `${cardWidth}px`,
    };
  }

  return {
    top: Math.min(Math.max(centerY - estimatedCardHeight / 2, 12), viewport.height - 12),
    left: Math.min(viewport.width - 12, rect.right + gutter),
    transform: 'translate(0, -50%)',
    maxWidth: `${cardWidth}px`,
  };
}

export default function ProductTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [viewport, setViewport] = useState(getViewportSize);
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);
  const autoStartedRef = useRef<Record<string, boolean>>({});
  const autoClickByStepRef = useRef<Record<string, boolean>>({});
  const routeJumpedByStepRef = useRef<Record<string, boolean>>({});
  const viewedStepRef = useRef<Record<string, boolean>>({});

  const device = getDeviceTypeFromViewport(viewport.width);
  const context = detectTourContext(location.pathname);
  const routeFingerprint = `${location.pathname}${location.search}${location.hash}`;

  const scenario = useMemo<TourScenario | null>(() => {
    if (context === 'public') {
      return null;
    }

    return (
      ONBOARDING_SCENARIOS.find((item) => (
        item.context === context &&
        item.device === device &&
        isRouteEligible(location.pathname, item.routePrefixes)
      )) || null
    );
  }, [context, device, location.pathname]);

  const steps = useMemo<TourStep[]>(() => {
    if (!scenario) {
      return [];
    }
    return scenario.steps.slice(0, MAX_STEPS);
  }, [scenario]);

  const currentStep = steps[currentIndex];
  const hasStep = Boolean(currentStep);
  const isLastStep = currentIndex >= steps.length - 1;
  const shouldShowEntryButton = Boolean(scenario && steps.length > 0);

  const statusKey = useMemo(() => {
    if (!scenario) {
      return null;
    }
    return `${STORAGE_PREFIX}:${scenario.id}:v${scenario.version}`;
  }, [scenario]);

  const trackTourEvent = useCallback((action: string, extra: Record<string, unknown> = {}) => {
    trackEvent('onboarding_tour', {
      action,
      scenario_id: scenario?.id ?? null,
      context,
      device,
      step_index: currentIndex + 1,
      step_total: steps.length,
      step_id: currentStep?.id ?? null,
      route: routeFingerprint,
      ...extra,
    });
  }, [context, currentIndex, currentStep?.id, device, routeFingerprint, scenario?.id, steps.length]);

  const needsRouteJump = useMemo(() => {
    if (!currentStep?.route) {
      return false;
    }

    return !isStepRouteActive(
      currentStep.route,
      location.pathname,
      location.search,
      location.hash,
    );
  }, [currentStep?.route, location.hash, location.pathname, location.search]);

  const persistStatus = useCallback((status: TourStatus) => {
    if (!statusKey || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(statusKey, status);
    } catch {
      // Ignore storage errors for private browsing modes.
    }
  }, [statusKey]);

  const openTour = useCallback((source: 'manual' | 'auto' = 'manual') => {
    if (!scenario || !steps.length) {
      return;
    }

    autoClickByStepRef.current = {};
    routeJumpedByStepRef.current = {};
    viewedStepRef.current = {};
    setCurrentIndex(0);
    setIsOpen(true);
    trackTourEvent('start', { source });
  }, [scenario, steps.length, trackTourEvent]);

  const closeTour = useCallback((status?: TourStatus) => {
    if (status) {
      persistStatus(status);
      trackTourEvent(status === 'completed' ? 'complete' : 'skip_all');
    } else {
      trackTourEvent('close');
    }

    setIsOpen(false);
    setCurrentIndex(0);
    setTargetRect(null);
    activeTargetRef.current = null;
  }, [persistStatus, trackTourEvent]);

  const moveToNextStep = useCallback(() => {
    if (!steps.length || isLastStep) {
      closeTour('completed');
      return;
    }

    trackTourEvent('next');
    setCurrentIndex((previous) => Math.min(previous + 1, steps.length - 1));
  }, [closeTour, isLastStep, steps.length, trackTourEvent]);

  const moveToPreviousStep = useCallback(() => {
    trackTourEvent('back');
    setCurrentIndex((previous) => Math.max(previous - 1, 0));
  }, [trackTourEvent]);

  const jumpToRoute = useCallback((source: 'auto' | 'manual') => {
    if (!currentStep?.route) {
      return;
    }

    trackTourEvent('route_jump', {
      source,
      target_route: currentStep.route,
    });
    navigate(currentStep.route);
  }, [currentStep?.route, navigate, trackTourEvent]);

  const handlePrimaryAction = useCallback(() => {
    if (!currentStep) {
      return;
    }

    if (needsRouteJump && currentStep.route) {
      const stepKey = `${scenario?.id ?? 'unknown'}:${currentStep.id}`;
      routeJumpedByStepRef.current[stepKey] = true;
      jumpToRoute('manual');
      return;
    }

    moveToNextStep();
  }, [currentStep, jumpToRoute, moveToNextStep, needsRouteJump, scenario?.id]);

  const primaryButtonLabel = useMemo(() => {
    if (!currentStep) {
      return 'Tiếp theo';
    }

    if (needsRouteJump) {
      return currentStep.ctaLabel || 'Đi tới bước này';
    }

    return isLastStep ? 'Hoàn tất' : 'Tiếp theo';
  }, [currentStep, isLastStep, needsRouteJump]);

  useEffect(() => {
    const onResize = () => {
      setViewport(getViewportSize());
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    setTargetRect(null);
    activeTargetRef.current = null;
    setIsOpen(false);
    setCurrentIndex(0);
  }, [scenario?.id]);

  useEffect(() => {
    if (!statusKey || !scenario || !steps.length) {
      return;
    }

    if (autoStartedRef.current[statusKey]) {
      return;
    }

    autoStartedRef.current[statusKey] = true;

    let existingStatus: string | null = null;
    try {
      existingStatus = window.localStorage.getItem(statusKey);
    } catch {
      existingStatus = null;
    }

    if (existingStatus) {
      return;
    }

    const timer = window.setTimeout(() => {
      openTour('auto');
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [openTour, scenario, statusKey, steps.length]);

  useEffect(() => {
    if (!isOpen || !hasStep) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeTour('skipped');
      }
      if (event.key === 'ArrowRight') {
        handlePrimaryAction();
      }
      if (event.key === 'ArrowLeft') {
        moveToPreviousStep();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeTour, handlePrimaryAction, hasStep, isOpen, moveToPreviousStep]);

  useEffect(() => {
    if (!isOpen || !currentStep || !scenario) {
      return;
    }

    const viewKey = `${scenario.id}:${currentStep.id}:${currentIndex}:${routeFingerprint}`;
    if (!viewedStepRef.current[viewKey]) {
      viewedStepRef.current[viewKey] = true;
      trackTourEvent('step_view');
    }
  }, [currentIndex, currentStep, isOpen, routeFingerprint, scenario, trackTourEvent]);

  useEffect(() => {
    if (!isOpen || !currentStep) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const stepKey = `${scenario?.id ?? 'unknown'}:${currentStep.id}`;

    const resolveTarget = () => {
      if (cancelled) {
        return;
      }

      attempts += 1;

      if (currentStep.route && !isStepRouteActive(currentStep.route, location.pathname, location.search, location.hash)) {
        if (!routeJumpedByStepRef.current[stepKey]) {
          routeJumpedByStepRef.current[stepKey] = true;
          jumpToRoute('auto');
        }
        window.setTimeout(resolveTarget, 160);
        return;
      }

      if (!currentStep.selector) {
        activeTargetRef.current = null;
        setTargetRect(null);
        return;
      }

      const target = document.querySelector<HTMLElement>(currentStep.selector);
      if (target) {
        activeTargetRef.current = target;
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
        setTargetRect(target.getBoundingClientRect());
        return;
      }

      if (currentStep.autoClickSelector && !autoClickByStepRef.current[stepKey] && attempts >= 2) {
        const autoClickTarget = document.querySelector<HTMLElement>(currentStep.autoClickSelector);
        if (autoClickTarget) {
          autoClickTarget.click();
          autoClickByStepRef.current[stepKey] = true;
          trackTourEvent('auto_click', {
            selector: currentStep.autoClickSelector,
          });
        }
      }

      if (attempts >= 16) {
        if (currentStep.allowMissing !== false) {
          moveToNextStep();
          return;
        }
        activeTargetRef.current = null;
        setTargetRect(null);
        return;
      }

      window.setTimeout(resolveTarget, 120);
    };

    resolveTarget();
    return () => {
      cancelled = true;
    };
  }, [
    currentStep,
    isOpen,
    jumpToRoute,
    location.hash,
    location.pathname,
    location.search,
    moveToNextStep,
    scenario?.id,
    trackTourEvent,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let rafId = 0;
    const updateRect = () => {
      rafId = 0;
      const currentTarget = activeTargetRef.current;
      if (!currentTarget) {
        return;
      }
      setTargetRect(currentTarget.getBoundingClientRect());
    };

    const scheduleUpdate = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(updateRect);
    };

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
    };
  }, [isOpen, currentIndex]);

  const tooltipStyle = useMemo(() => {
    if (!currentStep || !isOpen) {
      return null;
    }

    return getTooltipPosition({
      placement: currentStep.placement ?? 'auto',
      rect: targetRect,
      viewport,
      isMobile: device === 'mobile',
    });
  }, [currentStep, device, isOpen, targetRect, viewport]);

  const spotlight = useMemo(() => {
    if (!targetRect) {
      return null;
    }

    const padding = 8;
    const top = Math.max(0, targetRect.top - padding);
    const left = Math.max(0, targetRect.left - padding);
    const right = Math.min(viewport.width, targetRect.right + padding);
    const bottom = Math.min(viewport.height, targetRect.bottom + padding);

    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }, [targetRect, viewport.height, viewport.width]);

  if (!shouldShowEntryButton) {
    return null;
  }

  return (
    <>
      {isOpen && hasStep ? (
        <div className="vt-tour-overlay" aria-live="polite" aria-label="Hướng dẫn sử dụng">
          {spotlight ? (
            <>
              <div className="vt-tour-mask" style={{ top: 0, left: 0, width: '100vw', height: `${spotlight.top}px` }} />
              <div className="vt-tour-mask" style={{ top: `${spotlight.top}px`, left: 0, width: `${spotlight.left}px`, height: `${spotlight.height}px` }} />
              <div className="vt-tour-mask" style={{ top: `${spotlight.top}px`, left: `${spotlight.right}px`, width: `${Math.max(0, viewport.width - spotlight.right)}px`, height: `${spotlight.height}px` }} />
              <div className="vt-tour-mask" style={{ top: `${spotlight.bottom}px`, left: 0, width: '100vw', height: `${Math.max(0, viewport.height - spotlight.bottom)}px` }} />
              <div
                className="vt-tour-spotlight"
                style={{
                  top: `${spotlight.top}px`,
                  left: `${spotlight.left}px`,
                  width: `${spotlight.width}px`,
                  height: `${spotlight.height}px`,
                }}
              />
            </>
          ) : (
            <div className="vt-tour-mask" style={{ inset: 0 }} />
          )}

          {tooltipStyle ? (
            <section
              className="vt-tour-card"
              style={{
                top: `${tooltipStyle.top}px`,
                left: `${tooltipStyle.left}px`,
                transform: tooltipStyle.transform,
                maxWidth: tooltipStyle.maxWidth,
              }}
            >
              <header className="vt-tour-card-header">
                <div className="vt-tour-progress">
                  Bước {currentIndex + 1}/{steps.length}
                </div>
                <button
                  type="button"
                  className="vt-tour-close"
                  onClick={() => closeTour('skipped')}
                  aria-label="Đóng hướng dẫn"
                >
                  <X size={16} />
                </button>
              </header>

              <h3 className="vt-tour-title">{currentStep.title}</h3>
              <p className="vt-tour-description">{currentStep.description}</p>

              <footer className="vt-tour-actions">
                <button
                  type="button"
                  className="vt-tour-btn vt-tour-btn-secondary"
                  onClick={() => closeTour('skipped')}
                >
                  <SkipForward size={15} />
                  Skip all
                </button>

                <div className="vt-tour-nav">
                  <button
                    type="button"
                    className="vt-tour-btn vt-tour-btn-ghost"
                    onClick={moveToPreviousStep}
                    disabled={currentIndex === 0}
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    className="vt-tour-btn vt-tour-btn-primary"
                    onClick={handlePrimaryAction}
                  >
                    {primaryButtonLabel}
                  </button>
                </div>
              </footer>
            </section>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="vt-tour-entry"
        onClick={() => openTour('manual')}
        data-tour="tour-entry-button"
      >
        <CircleHelp size={16} />
        <span>Hướng dẫn</span>
      </button>
    </>
  );
}
