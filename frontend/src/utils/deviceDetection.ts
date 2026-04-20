import { useEffect, useState } from 'react';

export type DevicePlatform = 'ios' | 'android' | 'desktop';
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';
export type ViewportOrientation = 'portrait' | 'landscape';
export type ViewportBucket =
  | 'compact-phone'
  | 'phone'
  | 'large-phone'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'desktop-compact'
  | 'desktop'
  | 'desktop-wide';

export type DeviceTypeInfo = {
  platform: DevicePlatform;
  screenSize: ScreenSize;
  viewportBucket: ViewportBucket;
  orientation: ViewportOrientation;
  width: number;
  height: number;
  isMobile: boolean;
  isTouch: boolean;
  devicePixelRatio: number;
};

function roundViewportValue(value: number | undefined, fallback: number) {
  const resolved = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(Math.round(resolved), 0);
}

function getViewportDimensions() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 };
  }

  const viewport = window.visualViewport;

  return {
    width: roundViewportValue(viewport?.width, window.innerWidth),
    height: roundViewportValue(viewport?.height, window.innerHeight),
  };
}

export function detectPlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  if (/iphone|ipad|ipod/.test(userAgent) || (platform === 'macintel' && window.navigator.maxTouchPoints > 1)) {
    return 'ios';
  }

  if (/android/.test(userAgent)) {
    return 'android';
  }

  return 'desktop';
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}

export function getScreenSize(width?: number): ScreenSize {
  const resolvedWidth = typeof width === 'number' ? width : getViewportDimensions().width;
  if (resolvedWidth < 768) return 'mobile';
  if (resolvedWidth < 1024) return 'tablet';
  return 'desktop';
}

function getViewportBucket({ width, screenSize, orientation }: Pick<DeviceTypeInfo, 'width' | 'screenSize' | 'orientation'>): ViewportBucket {
  if (screenSize === 'mobile') {
    if (width <= 360) return 'compact-phone';
    if (width <= 430) return 'phone';
    return 'large-phone';
  }

  if (screenSize === 'tablet') {
    return orientation === 'portrait' ? 'tablet-portrait' : 'tablet-landscape';
  }

  if (width <= 1366) return 'desktop-compact';
  if (width >= 1720) return 'desktop-wide';
  return 'desktop';
}

export function getDeviceTypeInfo(): DeviceTypeInfo {
  if (typeof window === 'undefined') {
    return {
      platform: 'desktop',
      screenSize: 'desktop',
      viewportBucket: 'desktop',
      orientation: 'landscape',
      width: 1440,
      height: 900,
      isMobile: false,
      isTouch: false,
      devicePixelRatio: 1,
    };
  }

  const { width, height } = getViewportDimensions();
  const platform = detectPlatform();
  const screenSize = getScreenSize(width);
  const orientation: ViewportOrientation = width > height ? 'landscape' : 'portrait';
  const isTouch = window.navigator.maxTouchPoints > 0;
  const isMobile = screenSize === 'mobile' || ((platform === 'ios' || platform === 'android') && width < 1024);

  return {
    platform,
    screenSize,
    viewportBucket: getViewportBucket({ width, screenSize, orientation }),
    orientation,
    width,
    height,
    isMobile,
    isTouch,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

function setRootVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function applyAdaptiveRootVars(info: DeviceTypeInfo) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  root.dataset.platform = info.platform;
  root.dataset.screenSize = info.screenSize;
  root.dataset.viewportBucket = info.viewportBucket;
  root.dataset.orientation = info.orientation;

  let rootFontSize = 16;
  let spaceScale = 1;
  let fontScale = 1;
  let touchScale = 1;
  let radiusScale = 1;
  let layoutScale = 1;
  let bottomNavHeight = 70;

  if (info.screenSize === 'mobile') {
    if (info.width <= 360) {
      rootFontSize = 13;
      spaceScale = 0.62;
      fontScale = 0.72;
      touchScale = 0.9;
      radiusScale = 0.78;
      layoutScale = 0.72;
      bottomNavHeight = 64;
    } else if (info.width <= 390) {
      rootFontSize = 13.5;
      spaceScale = 0.66;
      fontScale = 0.76;
      touchScale = 0.93;
      radiusScale = 0.82;
      layoutScale = 0.76;
      bottomNavHeight = 66;
    } else if (info.width <= 430) {
      rootFontSize = 14;
      spaceScale = 0.72;
      fontScale = 0.82;
      touchScale = 0.96;
      radiusScale = 0.88;
      layoutScale = 0.82;
      bottomNavHeight = 68;
    } else {
      rootFontSize = 14.5;
      spaceScale = 0.78;
      fontScale = 0.88;
      touchScale = 0.98;
      radiusScale = 0.92;
      layoutScale = 0.88;
      bottomNavHeight = 70;
    }

    if (info.height <= 740) {
      rootFontSize -= 0.25;
      spaceScale = Math.max(spaceScale - 0.03, 0.64);
      layoutScale = Math.max(layoutScale - 0.03, 0.76);
    }

    if (info.orientation === 'landscape') {
      rootFontSize = Math.min(rootFontSize, 14);
      spaceScale = Math.max(spaceScale - 0.05, 0.64);
      layoutScale = Math.max(layoutScale - 0.05, 0.74);
      bottomNavHeight = Math.max(bottomNavHeight - 4, 64);
    }
  } else if (info.screenSize === 'tablet') {
    rootFontSize = info.orientation === 'portrait' ? 15.5 : 16;
    spaceScale = info.orientation === 'portrait' ? 0.88 : 0.94;
    fontScale = info.orientation === 'portrait' ? 0.94 : 0.98;
    touchScale = 1;
    radiusScale = 0.96;
    layoutScale = info.orientation === 'portrait' ? 0.92 : 0.96;
    bottomNavHeight = 74;
  }

  let adminSidebarWidth = 292;
  let adminTopbarHeight = 74;
  let adminPagePaddingX = 24;
  let adminPagePaddingY = 24;
  let adminPageMaxWidth = 1760;
  let adminSidebarHeaderHeight = 84;

  if (info.screenSize === 'desktop') {
    if (info.viewportBucket === 'desktop-compact') {
      adminSidebarWidth = 272;
      adminTopbarHeight = 68;
      adminPagePaddingX = 20;
      adminPagePaddingY = 20;
      adminPageMaxWidth = 1560;
      adminSidebarHeaderHeight = 78;
    } else if (info.viewportBucket === 'desktop-wide') {
      adminSidebarWidth = 308;
      adminTopbarHeight = 80;
      adminPagePaddingX = 30;
      adminPagePaddingY = 28;
      adminPageMaxWidth = 1840;
      adminSidebarHeaderHeight = 88;
    }
  }

  setRootVar('--vt-mobile-root-font-size', `${rootFontSize}px`);
  setRootVar('--mb-space-scale', String(spaceScale));
  setRootVar('--mb-font-scale', String(fontScale));
  setRootVar('--mb-touch-scale', String(touchScale));
  setRootVar('--mb-radius-scale', String(radiusScale));
  setRootVar('--mb-layout-scale', String(layoutScale));
  setRootVar('--mb-bottom-nav-height', `${bottomNavHeight}px`);

  setRootVar('--vt-admin-sidebar-width', `${adminSidebarWidth}px`);
  setRootVar('--vt-admin-topbar-height', `${adminTopbarHeight}px`);
  setRootVar('--vt-admin-page-padding-x', `${adminPagePaddingX}px`);
  setRootVar('--vt-admin-page-padding-y', `${adminPagePaddingY}px`);
  setRootVar('--vt-admin-page-padding-bottom', '48px');
  setRootVar('--vt-admin-page-max-width', `${adminPageMaxWidth}px`);
  setRootVar('--vt-admin-sidebar-header-height', `${adminSidebarHeaderHeight}px`);
}

export function initAdaptiveViewport() {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  let rafId = 0;

  const apply = () => {
    rafId = 0;
    applyAdaptiveRootVars(getDeviceTypeInfo());
  };

  const scheduleApply = () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(apply);
  };

  apply();

  window.addEventListener('resize', scheduleApply);
  window.addEventListener('orientationchange', scheduleApply);
  window.visualViewport?.addEventListener('resize', scheduleApply);
  window.visualViewport?.addEventListener('scroll', scheduleApply);

  return () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    window.removeEventListener('resize', scheduleApply);
    window.removeEventListener('orientationchange', scheduleApply);
    window.visualViewport?.removeEventListener('resize', scheduleApply);
    window.visualViewport?.removeEventListener('scroll', scheduleApply);
  };
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => getDeviceTypeInfo().isMobile);

  useEffect(() => {
    const update = () => setIsMobile(getDeviceTypeInfo().isMobile);

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  return isMobile;
}

export function useIsMobileMatchMedia() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return isMobile;
}

export function useDeviceType() {
  const [deviceType, setDeviceType] = useState<DeviceTypeInfo>(() => getDeviceTypeInfo());

  useEffect(() => {
    const updateDeviceType = () => {
      setDeviceType(getDeviceTypeInfo());
    };

    updateDeviceType();

    window.addEventListener('resize', updateDeviceType);
    window.addEventListener('orientationchange', updateDeviceType);
    window.visualViewport?.addEventListener('resize', updateDeviceType);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('orientationchange', updateDeviceType);
      window.visualViewport?.removeEventListener('resize', updateDeviceType);
    };
  }, []);

  return deviceType;
}
