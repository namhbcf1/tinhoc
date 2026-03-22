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
  // Track nếu đang thực sự kéo xuống để chỉ preventDefault khi cần
  const isPullingRef  = useRef(false);

  // Is the container (or window) scrolled to the very top?
  const isAtTop = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current.scrollTop <= 0;
    // Kiểm tra mobile-content scroll container
    const mobileContent = document.querySelector('.mobile-content');
    if (mobileContent) return mobileContent.scrollTop <= 0;
    return window.scrollY <= 0;
  }, [scrollRef]);

  const handleTouchStart = useCallback((e) => {
    if (!isAtTop()) return;
    startYRef.current   = e.touches[0].clientY;
    currentYRef.current = e.touches[0].clientY;
    isTouchingRef.current = true;
    isPullingRef.current  = false;
  }, [isAtTop]);

  const handleTouchMove = useCallback((e) => {
    if (!isTouchingRef.current || isRefreshing) return;
    currentYRef.current = e.touches[0].clientY;
    const delta = currentYRef.current - startYRef.current;

    if (delta <= 0 || !isAtTop()) {
      if (isPullingRef.current) {
        isPullingRef.current = false;
        setIsPulling(false);
        setPullDistance(0);
      }
      return;
    }

    // Chỉ kéo nếu pull đủ xa (> 10px) để tránh nhầm với tap
    if (delta < 10) return;

    // Clamp với rubber-band feel
    const clamped = Math.min(delta * 0.5, maxPull);
    isPullingRef.current = true;
    setIsPulling(true);
    setPullDistance(clamped);

    // CHỈ preventDefault khi đang thực sự kéo để tránh block click
    e.preventDefault();
  }, [isRefreshing, isAtTop, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isTouchingRef.current) return;
    isTouchingRef.current = false;

    if (isPullingRef.current && pullDistance >= threshold * 0.5) {
      isPullingRef.current = false;
      setIsRefreshing(true);
      setIsPulling(false);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      isPullingRef.current = false;
      setIsPulling(false);
      setPullDistance(0);
    }
    startYRef.current   = null;
    currentYRef.current = null;
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    // passive: true cho touchstart/end để không block scrolling
    // touchmove cần passive: false để có thể preventDefault khi kéo
    const passiveOpts    = { passive: true };
    const nonPassiveOpts = { passive: false };

    window.addEventListener('touchstart', handleTouchStart, passiveOpts);
    window.addEventListener('touchmove',  handleTouchMove,  nonPassiveOpts);
    window.addEventListener('touchend',   handleTouchEnd,   passiveOpts);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart, passiveOpts);
      window.removeEventListener('touchmove',  handleTouchMove,  nonPassiveOpts);
      window.removeEventListener('touchend',   handleTouchEnd,   passiveOpts);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Progress 0-1 for spinner fill/rotation
  const pullProgress = Math.min(pullDistance / threshold, 1);

  return { isPulling, pullDistance, pullProgress, isRefreshing };
}
