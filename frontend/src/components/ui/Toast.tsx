// @ts-nocheck
import { useEffect } from 'react';
import './Toast.css';

/**
 * Toast — WCAG 2.2 accessible notification
 * - role="alert" + aria-live="assertive" for error/warning (announced immediately)
 * - role="status" + aria-live="polite" for success/info (announced at next break)
 * - aria-atomic="true" ensures screen reader reads the full message
 */
const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // WCAG: errors/warnings are urgent → assertive; info/success → polite
  const isUrgent = type === 'error' || type === 'warning';
  const role = isUrgent ? 'alert' : 'status';
  const ariaLive = isUrgent ? 'assertive' : 'polite';

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div
      className={`toast toast-${type}`}
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      <div className="toast-content">
        <span className="toast-icon" aria-hidden="true">
          {iconMap[type] ?? 'ℹ️'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Đóng thông báo"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
