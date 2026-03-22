import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePullToRefresh — detects pull-down gesture on touch devices
 * and calls the provided refresh callback while showing a spinner.
 *
 * @param {Function} onRefresh   - async callback to run on pull-to-refresh
 * @param {Object}   options
 * @param {number}   options.threshold  - px to pull before triggering (default 70)
 * @param {number}   options.maxPull    - max visual overscroll px (default 100)
 * @param {Element}  options.scrollRef  - optional ref to a scrollable container
 */
export default function usePullToRefresh(onRefresh, { threshold = 70, maxPull = 100, scrollRef = null } = {}) {
  const [isPulling, setIsPulling]       = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef     = useRef(null);
  const currentYRef   = useRef(null);
  const isTouchingRef = useRef(false);

  // Is the container (or window) scrolled to the very top?
  const isAtTop = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current.scrollTop <= 0;
    return window.scrollY <= 0;
  }, [scrollRef]);

  const handleTouchStart = useCallback((e) => {
    if (!isAtTop()) return;
    startYRef.current   = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    isTouchingRef.current = true;
  }, [isAtTop]);

  const handleTouchMove = useCallback((e) => {
    if (!isTouchingRef.current || isRefreshing) return;
    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;

    if (delta <= 0 || !isAtTop()) {
      if (isPulling) { setIsPulling(false); setPullDistance(0); }
      return;
    }

    // Clamp with rubber-band feel
    const clamped = Math.min(delta * 0.5, maxPull);
    setIsPulling(true);
    setPullDistance(clamped);

    if (delta > 5) e.preventDefault();
  }, [isRefreshing, isPulling, isAtTop, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isTouchingRef.current) return;
    isTouchingRef.current = false;

    if (isPulling && pullDistance >= threshold * 0.5) {
      setIsRefreshing(true);
      setIsPulling(false);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
    startYRef.current   = null;
    currentYRef.current = null;
  }, [isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const opts = { passive: false };
    window.addEventListener('touchstart', handleTouchStart, opts);
    window.addEventListener('touchmove',  handleTouchMove,  opts);
    window.addEventListener('touchend',   handleTouchEnd,   opts);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart, opts);
      window.removeEventListener('touchmove',  handleTouchMove,  opts);
      window.removeEventListener('touchend',   handleTouchEnd,   opts);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Progress 0-1 for spinner fill/rotation
  const pullProgress = Math.min(pullDistance / threshold, 1);

  return { isPulling, pullDistance, pullProgress, isRefreshing };
}
