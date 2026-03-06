/**
 * Analytics — barrel re-export
 * Init functions: analytics-init.js
 * Tracking functions: analytics-track.js
 */

export { initGA4, initClarity, initFacebookPixel, initAnalytics } from './analytics-init';

export {
    trackPageView,
    trackEvent,
    trackConversion,
    trackClick,
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackOutboundLink,
    trackDownload,
    trackScrollDepth,
    trackVideoPlay,
    trackSearch,
} from './analytics-track';

import { initAnalytics } from './analytics-init';
import {
    trackPageView,
    trackEvent,
    trackConversion,
    trackClick,
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackOutboundLink,
    trackDownload,
    trackScrollDepth,
    trackVideoPlay,
    trackSearch,
} from './analytics-track';

export default {
    init: initAnalytics,
    pageView: trackPageView,
    event: trackEvent,
    conversion: trackConversion,
    click: trackClick,
    formStart: trackFormStart,
    formSubmit: trackFormSubmit,
    formError: trackFormError,
    outboundLink: trackOutboundLink,
    download: trackDownload,
    scrollDepth: trackScrollDepth,
    videoPlay: trackVideoPlay,
    search: trackSearch,
};
