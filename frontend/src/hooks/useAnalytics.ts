// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '../utils/analytics';

/**
 * useAnalytics Hook
 * Automatic route tracking and event helpers
 */
export function useAnalytics() {
    const location = useLocation();
    const previousPath = useRef(null); // null ensures first render always fires a page view

    // Track page views on route change
    useEffect(() => {
        if (location.pathname !== previousPath.current) {
            const url = window.location.href;
            const title = document.title;

            analytics.pageView(url, title);
            previousPath.current = location.pathname;
        }
    }, [location]);

    return {
        trackEvent: analytics.event,
        trackClick: analytics.click,
        trackConversion: analytics.conversion,
        trackFormStart: analytics.formStart,
        trackFormSubmit: analytics.formSubmit,
        trackFormError: analytics.formError,
        trackOutboundLink: analytics.outboundLink,
        trackDownload: analytics.download,
        trackScrollDepth: analytics.scrollDepth,
        trackVideoPlay: analytics.videoPlay,
        trackSearch: analytics.search,
    };
}

export default useAnalytics;
