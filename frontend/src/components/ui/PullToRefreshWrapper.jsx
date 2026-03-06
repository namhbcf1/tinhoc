import usePullToRefresh from '../../hooks/usePullToRefresh';

/**
 * PullToRefreshWrapper — wraps mobile page content and shows a spinner
 * when the user pulls down from the top. Designed for touch devices.
 *
 * Usage:
 *   <PullToRefreshWrapper onRefresh={handleRefresh}>
 *     <div>page content</div>
 *   </PullToRefreshWrapper>
 */
export default function PullToRefreshWrapper({ onRefresh, children, className = '' }) {
  const { isPulling, pullDistance, pullProgress, isRefreshing } = usePullToRefresh(onRefresh);

  const spinnerVisible = isPulling || isRefreshing;
  const translateY = isPulling ? pullDistance : 0;
  const spinnerOpacity = Math.max(0.2, pullProgress);
  const spinnerScale = `scale(${0.4 + pullProgress * 0.6})`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Pull indicator spinner */}
      {spinnerVisible && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
          style={{ height: `${Math.max(pullDistance, isRefreshing ? 44 : 0)}px`, opacity: spinnerOpacity }}
        >
          <div
            className={`w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-100 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: spinnerScale }}
          >
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582M20 20v-5h-.581M4.582 9a8 8 0 0115.357 2M19.418 15a8 8 0 01-15.357-2" />
            </svg>
          </div>
        </div>
      )}

      {/* Content slides down while pulling */}
      <div
        style={{
          transform: isPulling ? `translateY(${translateY}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
