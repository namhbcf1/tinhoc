import PropTypes from 'prop-types';

/**
 * Skeleton Loader Components
 * Animated placeholders for loading states
 * WCAG 2.2: aria-hidden="true" — pure decorative loading UI, not meaningful content
 * The pulse animation is governed by the global prefers-reduced-motion media query in index.css
 */

const baseClass = 'animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]';

export function SkeletonCard({ className = '' }) {
    return (
        <div
            className={`border border-slate-100 rounded-xl p-6 space-y-4 ${className}`}
            aria-hidden="true"
            aria-label="Đang tải..."
        >
            <div className={`h-48 rounded-lg ${baseClass}`} />
            <div className="space-y-3">
                <div className={`h-4 w-1/4 rounded ${baseClass}`} />
                <div className={`h-6 w-3/4 rounded ${baseClass}`} />
                <div className={`h-4 w-full rounded ${baseClass}`} />
                <div className={`h-4 w-2/3 rounded ${baseClass}`} />
            </div>
        </div>
    );
}

export function SkeletonText({ lines = 3, className = '' }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`h-4 rounded ${baseClass}`}
                    style={{ width: i === lines - 1 ? '66%' : '100%' }}
                />
            ))}
        </div>
    );
}

export function SkeletonImage({ className = '', aspectRatio = 'aspect-video' }) {
    return <div className={`${aspectRatio} rounded-lg ${baseClass} ${className}`} />;
}

export function SkeletonAvatar({ size = 'md', className = '' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24',
    };

    return <div className={`rounded-full ${sizeClasses[size]} ${baseClass} ${className}`} />;
}

export function SkeletonButton({ className = '' }) {
    return <div className={`h-10 w-32 rounded-lg ${baseClass} ${className}`} />;
}

export function SkeletonNewsCard({ className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-slate-100 overflow-hidden ${className}`}>
            <SkeletonImage className="h-48" />
            <div className="p-5 space-y-3">
                <div className={`h-3 w-24 rounded ${baseClass}`} />
                <div className={`h-6 w-full rounded ${baseClass}`} />
                <div className={`h-4 w-full rounded ${baseClass}`} />
                <div className={`h-4 w-3/4 rounded ${baseClass}`} />
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                        <SkeletonAvatar size="sm" />
                        <div className={`h-3 w-20 rounded ${baseClass}`} />
                    </div>
                    <div className={`h-3 w-16 rounded ${baseClass}`} />
                </div>
            </div>
        </div>
    );
}

// PropTypes
SkeletonCard.propTypes = { className: PropTypes.string };
SkeletonText.propTypes = { lines: PropTypes.number, className: PropTypes.string };
SkeletonImage.propTypes = { className: PropTypes.string, aspectRatio: PropTypes.string };
SkeletonAvatar.propTypes = {
    size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
    className: PropTypes.string,
};
SkeletonButton.propTypes = { className: PropTypes.string };
SkeletonNewsCard.propTypes = { className: PropTypes.string };

export default {
    Card: SkeletonCard,
    Text: SkeletonText,
    Image: SkeletonImage,
    Avatar: SkeletonAvatar,
    Button: SkeletonButton,
    NewsCard: SkeletonNewsCard,
};
