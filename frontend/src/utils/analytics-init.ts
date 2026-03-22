/**
 * Analytics Init — GA4, Clarity, Facebook Pixel initialization
 *
 * Env vars (set in .env or Cloudflare Pages dashboard):
 *   VITE_GA4_ID             — GA4 Measurement ID (e.g. G-XXXXXXXXXX)
 *   VITE_GA4_MEASUREMENT_ID — legacy alias, same purpose
 *   VITE_CLARITY_PROJECT_ID — Microsoft Clarity project ID
 *   VITE_FB_PIXEL_ID        — Facebook Pixel ID
 *
 * Any unset/placeholder var → that service is silently skipped (no errors).
 */

// Read IDs from env vars — support both new VITE_GA4_ID and legacy VITE_GA4_MEASUREMENT_ID
const GA4_ID =
    import.meta.env.VITE_GA4_ID ||
    import.meta.env.VITE_GA4_MEASUREMENT_ID ||
    null;

const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || null;
const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID || null;

/** Return true only if the ID is a real value (not empty / not placeholder) */
function isValidId(id) {
    if (!id) return false;
    if (id.includes('XXXX') || id.includes('YOUR_')) return false;
    return true;
}

/**
 * Dynamically inject a <script> tag into <head>
 * @param {string} src
 * @param {boolean} async
 */
function injectScript(src, isAsync = true) {
    if (typeof document === 'undefined') return;
    const script = document.createElement('script');
    script.src = src;
    script.async = isAsync;
    document.head.appendChild(script);
}

/**
 * Initialize Google Analytics 4
 * Loads the gtag.js script then configures the measurement ID.
 */
export function initGA4() {
    if (!isValidId(GA4_ID) || typeof window === 'undefined') return;

    // Inject the GA4 loader script (equivalent to the <script async src="gtag/js"> in HTML)
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);

    // Bootstrap window.gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
        send_page_view: false, // manual page views via trackPageView()
        cookie_flags: 'SameSite=None;Secure',
    });

    if (import.meta.env.DEV) {
        console.log('📊 GA4 initialized:', GA4_ID);
    }
}

/**
 * Initialize Microsoft Clarity
 */
export function initClarity() {
    if (!isValidId(CLARITY_ID) || typeof window === 'undefined') return;

    (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r);
        t.async = 1;
        t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);

    if (import.meta.env.DEV) {
        console.log('📊 Clarity initialized:', CLARITY_ID);
    }
}

/**
 * Initialize Facebook Pixel
 */
export function initFacebookPixel() {
    if (!isValidId(FB_PIXEL_ID) || typeof window === 'undefined') return;

    !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', FB_PIXEL_ID);
    window.fbq('track', 'PageView');
}

/**
 * Initialize all configured analytics services
 * Call once at app startup (main.jsx / App.jsx)
 */
export function initAnalytics() {
    initGA4();
    initClarity();
    initFacebookPixel();
}
