import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../../styles/admin/AdminDashboard.css';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * AdminModal — matches .modal-overlay / .modal-content design from AdminDashboard.css
 * Esc key closes, click backdrop closes, locks body scroll.
 */
export default function AdminModal({ open, onClose, title, children, maxWidth }: AdminModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="modal-content"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'clamp(14px, 1.6vw, 18px) clamp(18px, 2vw, 24px)', borderBottom: '2px solid #10b981' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 'clamp(18px, 2vw, 24px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
