import { useState, useCallback } from 'react';
import Toast from './Toast';

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = toastIdCounter++;
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message, duration) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message, duration) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message, duration) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  return { toasts, removeToast, success, error, warning, info };
};

const ToastContainer = ({ toasts, removeToast }) => {
  // Safety check: ensure toasts is always an array
  const safeToasts = Array.isArray(toasts) ? toasts : [];
  
  if (safeToasts.length === 0) {
    return null;
  }
  
  return (
    // WCAG: region landmark so screen readers can navigate to notifications
    <div
      className="toast-container"
      aria-label="Thông báo"
      aria-relevant="additions removals"
    >
      {safeToasts.map(toast => {
        if (!toast || !toast.id) {
          return null;
        }
        return (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast && removeToast(toast.id)}
          />
        );
      })}
    </div>
  );
};

export default ToastContainer;
