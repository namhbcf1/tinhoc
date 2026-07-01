import React from 'react';
import type { LucideIcon } from 'lucide-react';
import '../../styles/admin/AdminDashboard.css';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface AdminQuickActionsProps {
  title?: string;
  actions: QuickAction[];
}

/**
 * AdminQuickActions — matches .quick-actions / .actions-grid design from AdminDashboard.css
 */
export default function AdminQuickActions({ title = 'Thao tác nhanh', actions }: AdminQuickActionsProps) {
  return (
    <div className="quick-actions">
      <h2>{title}</h2>
      <div className="actions-grid">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className="action-btn"
              onClick={action.onClick}
            >
              <Icon className="action-icon" />
              <span className="action-text">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { QuickAction };
