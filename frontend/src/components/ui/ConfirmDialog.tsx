import { useEffect, useRef, useId } from 'react';
import './ConfirmDialog.css';

/**
 * ConfirmDialog — WCAG 2.2 accessible confirmation dialog
 * - role="alertdialog" (destructive/warning) or role="dialog" (info)
 * - aria-modal="true", aria-labelledby, aria-describedby
 * - Escape key closes dialog
 * - Initial focus on cancel button (safest default for destructive actions)
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger' // 'danger', 'warning', 'info'
}) {
  const titleId = useId();
  const descId = useId();
  const cancelBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management and Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element
    previousFocusRef.current = document.activeElement;

    // Move focus to cancel button (safe default for destructive dialogs)
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on close
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // alertdialog for danger/warning actions — requires user response before continuing
  const dialogRole = type === 'info' ? 'dialog' : 'alertdialog';

  return (
    <div
      className="confirm-dialog-overlay"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        role={dialogRole}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-dialog-header confirm-dialog-${type}`}>
          <h3 id={titleId}>{title}</h3>
        </div>
        <div className="confirm-dialog-body">
          <p id={descId}>{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button
            ref={cancelBtnRef}
            onClick={onClose}
            className="btn btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn btn-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
