import React from 'react';
import '../../styles/admin/AdminDashboard.css';

export type StatCardTone = 'primary' | 'success' | 'warning' | 'info' | 'purple' | 'danger';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: StatCardTone;
  onClick?: () => void;
}

/**
 * AdminStatCard — matches .stat-card design from AdminDashboard.css
 * Supports all 6 color tones via CSS modifier classes.
 */
export default function AdminStatCard({
  icon,
  label,
  value,
  sublabel,
  tone = 'primary',
  onClick,
}: StatCardProps) {
  const toneClass = `stat-${tone}`;

  return (
    <div
      className={`stat-card ${toneClass}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {sublabel && <p className="stat-sublabel">{sublabel}</p>}
      </div>
    </div>
  );
}
