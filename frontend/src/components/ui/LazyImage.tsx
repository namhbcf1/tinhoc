import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * LazyImage Component
 * Native lazy loading with skeleton placeholder to prevent CLS.
 * - width + height are REQUIRED to let browser reserve space before load
 * - loading="lazy" — native, no JS double-fetch
 * - decoding="async" — non-blocking image decode
 * - Skeleton shimmer shown until image loads, preventing layout shift
 */
export default function LazyImage({
    src,
    alt,
    className = '',
    width,
    height,
    objectFit = 'cover',
    priority = false,   // set true for above-the-fold images (disables lazy + sets fetchpriority high)
    onLoad,
    ...props
}) {
    const [loaded, setLoaded] = useState(false);
    // WCAG 2.3.3: skip fade-in transition for users who prefer reduced motion
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return (
        // Wrapper reserves exact space via width/height — key CLS fix
        <span
            style={{
                display: 'inline-block',
                width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
                height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Skeleton shimmer — visible until image loads, hidden when reduced motion */}
            {!loaded && (
                <span
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
                        backgroundSize: '200% 100%',
                        // Skip shimmer animation when user prefers reduced motion
                        animation: reduceMotion ? 'none' : 'lazyimage-shimmer 1.4s infinite',
                    }}
                />
            )}
            <img
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                fetchpriority={priority ? 'high' : undefined}
                onLoad={() => { setLoaded(true); if (onLoad) onLoad(); }}
                onError={() => setLoaded(true)} // reveal on error so broken images don't stay invisible
                className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
                style={{ objectFit, display: 'block', width: '100%', height: '100%' }}
                {...props}
            />
            {/* Shimmer keyframe — injected once via style tag */}
            <style>{`@keyframes lazyimage-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </span>
    );
}

LazyImage.propTypes = {
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
    className: PropTypes.string,
    // width + height strongly recommended — prevents CLS
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    objectFit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none', 'scale-down']),
    priority: PropTypes.bool,   // true → fetchpriority=high + loading=eager (LCP images)
    onLoad: PropTypes.func,
};
