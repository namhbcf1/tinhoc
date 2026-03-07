import { useState, useEffect } from 'react';

/**
 * Detect device platform (iOS, Android, or Desktop)
 */
export function detectPlatform() {
    if (typeof window === 'undefined') return 'desktop';
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform?.toLowerCase() || '';
    
    // iOS detection
    if (/iphone|ipad|ipod/.test(userAgent) || 
        (platform === 'macintel' && window.navigator.maxTouchPoints > 1)) {
        return 'ios';
    }
    
    // Android detection
    if (/android/.test(userAgent)) {
        return 'android';
    }
    
    return 'desktop';
}

/**
 * Detect if device is mobile (iOS or Android)
 */
export function isMobileDevice() {
    if (typeof window === 'undefined') return false;
    const platform = detectPlatform();
    return platform === 'ios' || platform === 'android';
}

/**
 * Detect screen size category
 */
export function getScreenSize() {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
}

/**
 * Hook to detect if the device is mobile
 * Uses window.innerWidth <= 768px as breakpoint
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => {
        // Initial check (SSR-safe)
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 768;
    });

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        // Initial check
        checkMobile();

        // Listen for resize events
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    return isMobile;
}

/**
 * Alternative: Use matchMedia for more precise detection
 * This is more performant and follows CSS media query logic
 */
export function useIsMobileMatchMedia() {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(max-width: 768px)').matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        const handleChange = (e) => {
            setIsMobile(e.matches);
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
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

/**
 * Hook to get device type information
 * Returns: { platform: 'ios' | 'android' | 'desktop', screenSize: 'mobile' | 'tablet' | 'desktop', isMobile: boolean }
 */
export function useDeviceType() {
    const [deviceType, setDeviceType] = useState(() => {
        if (typeof window === 'undefined') {
            return { platform: 'desktop', screenSize: 'desktop', isMobile: false };
        }
        
        const platform = detectPlatform();
        const screenSize = getScreenSize();
        const isMobile = screenSize === 'mobile' || (platform === 'ios' || platform === 'android');
        
        return { platform, screenSize, isMobile };
    });

    useEffect(() => {
        const updateDeviceType = () => {
            const platform = detectPlatform();
            const screenSize = getScreenSize();
            const isMobile = screenSize === 'mobile' || (platform === 'ios' || platform === 'android');
            
            setDeviceType({ platform, screenSize, isMobile });
        };

        // Initial check
        updateDeviceType();

        // Listen for resize events
        window.addEventListener('resize', updateDeviceType);
        window.addEventListener('orientationchange', updateDeviceType);

        return () => {
            window.removeEventListener('resize', updateDeviceType);
            window.removeEventListener('orientationchange', updateDeviceType);
        };
    }, []);

    return deviceType;
}

