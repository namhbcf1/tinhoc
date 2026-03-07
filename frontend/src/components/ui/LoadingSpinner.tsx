/**
 * LoadingSpinner Component
 * Shared component for displaying loading states
 */

export default function LoadingSpinner({
  text = 'Đang tải...',
  size = 'medium',
  className = ''
}) {
  const sizeClasses = {
    small: 'loading-small',
    medium: 'loading-medium',
    large: 'loading-large'
  };

  return (
    <div className={`loading ${sizeClasses[size]} ${className}`}>
      {text}
    </div>
  );
}
