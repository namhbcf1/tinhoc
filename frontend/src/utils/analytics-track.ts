// @ts-nocheck
/**
 * Analytics Track — event tracking helpers for GA4 and Facebook Pixel
 */

/**
 * Track page view
 */
export function trackPageView(url, title) {
    if (typeof window === 'undefined') return;

    // GA4
    if (window.gtag) {
        window.gtag('event', 'page_view', {
            page_title: title,
            page_location: url,
            page_path: new URL(url).pathname,
        });
    }

    // Facebook Pixel
    if (window.fbq) {
        window.fbq('track', 'PageView');
    }
}

/**
 * Track custom event
 */
export function trackEvent(eventName, eventParams = {}) {
    if (typeof window === 'undefined') return;

    // GA4
    if (window.gtag) {
        window.gtag('event', eventName, eventParams);
    }

    // Facebook Pixel
    if (window.fbq) {
        window.fbq('trackCustom', eventName, eventParams);
    }

    if (import.meta.env.DEV) {
        console.log('📊 Analytics Event:', eventName, eventParams);
    }
}

/**
 * Track conversion (registration, purchase, etc.)
 */
export function trackConversion(conversionType, value = null) {
    const params = {
        event_category: 'conversion',
        event_label: conversionType,
    };

    if (value) {
        params.value = value;
        params.currency = 'VND';
    }

    trackEvent('conversion', params);

    // Facebook Pixel specific conversion
    if (window.fbq && conversionType === 'registration') {
        window.fbq('track', 'CompleteRegistration');
    }
}

/**
 * Track button/link click
 */
export function trackClick(elementName, elementType = 'button', destination = null) {
    trackEvent('click', {
        event_category: 'engagement',
        event_label: elementName,
        element_type: elementType,
        destination: destination,
    });
}

/**
 * Track form interaction
 */
export function trackFormStart(formName) {
    trackEvent('form_start', {
        event_category: 'form',
        form_name: formName,
    });
}

export function trackFormSubmit(formName, success = true) {
    trackEvent('form_submit', {
        event_category: 'form',
        form_name: formName,
        success: success,
    });
}

export function trackFormError(formName, errorField) {
    trackEvent('form_error', {
        event_category: 'form',
        form_name: formName,
        error_field: errorField,
    });
}

/**
 * Track outbound link
 */
export function trackOutboundLink(url, linkText) {
    trackEvent('outbound_click', {
        event_category: 'outbound',
        event_label: linkText,
        destination: url,
    });
}

/**
 * Track file download
 */
export function trackDownload(fileName, fileType) {
    trackEvent('file_download', {
        event_category: 'download',
        file_name: fileName,
        file_type: fileType,
    });
}

/**
 * Track scroll depth
 */
export function trackScrollDepth(percentage) {
    trackEvent('scroll_depth', {
        event_category: 'engagement',
        scroll_percentage: percentage,
    });
}

/**
 * Track video interaction
 */
export function trackVideoPlay(videoTitle) {
    trackEvent('video_play', {
        event_category: 'video',
        video_title: videoTitle,
    });
}

/**
 * Track search
 */
export function trackSearch(searchTerm, resultCount) {
    trackEvent('search', {
        search_term: searchTerm,
        result_count: resultCount,
    });
}
