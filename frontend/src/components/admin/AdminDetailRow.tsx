import React from 'react';
import '../../styles/admin/AdminDashboard.css';

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  labelWidth?: number;
}

/**
 * AdminDetailRow — matches .detail-row design from AdminDashboard.css
 * Left-aligned label with green left border accent.
 */
export default function AdminDetailRow({ label, value, labelWidth = 140 }: DetailRowProps) {
  return (
    <div className="detail-row">
      <strong style={{ minWidth: labelWidth }}>{label}</strong>
      <span>{value ?? '—'}</span>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

/**
 * AdminDetailItem — matches .detail-item design, for grid layouts
 */
export function AdminDetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="detail-item">
      <label>{label}</label>
      <span style={{ display: 'block', marginTop: 4 }}>{value ?? '—'}</span>
    </div>
  );
}
