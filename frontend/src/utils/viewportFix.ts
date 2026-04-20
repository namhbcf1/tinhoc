/**
 * Fix viewport height issues on mobile browsers
 * iOS Safari and Chrome mobile don't include address bar in 100vh
 */

export function initViewportFix() {
  // Set CSS custom property for viewport height
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // Set initial value
  setVH();

  // Update on resize
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);

  // Also update when viewport changes (for mobile browsers)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVH);
  }

  // Prevent double-tap zoom on iOS
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300 && event.cancelable) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
}
