// @ts-nocheck
/**
 * EmptyState Component
 * Shared component for displaying empty states with optional actions
 */

export default function EmptyState({
  icon = '📭',
  title = 'Không có dữ liệu',
  message = '',
  actions = [],
  className = ''
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {actions.length > 0 && (
        <div className="empty-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={action.className || 'btn-action-primary'}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
