import React from 'react';
import '../../styles/admin/AdminDashboard.css';

export type BadgeVariant = 'open' | 'closed' | 'completed' | 'pending';

const VARIANT_MAP: Record<BadgeVariant, string> = {
  open: 'badge-open',
  closed: 'badge-closed',
  completed: 'badge-completed',
  pending: 'badge-pending',
};

const LABEL_MAP: Record<BadgeVariant, string> = {
  open: 'Mở',
  closed: 'Đóng',
  completed: 'Hoàn tất',
  pending: 'Chờ',
};

interface AdminBadgeProps {
  variant?: BadgeVariant;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * AdminBadge — matches .badge design from AdminDashboard.css
 * Preconfigured variants: open, closed, completed, pending
 */
export default function AdminBadge({ variant = 'open', label, className, children }: AdminBadgeProps) {
  const cssClass = `${VARIANT_MAP[variant]} badge${className ? ' ' + className : ''}`;
  return (
    <span className={cssClass}>
      {children || label || LABEL_MAP[variant]}
    </span>
  );
}
