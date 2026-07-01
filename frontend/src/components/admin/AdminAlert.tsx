import React from 'react';
import { X } from 'lucide-react';
import '../../styles/admin/AdminDashboard.css';

type AlertType = 'warning' | 'danger' | 'info' | 'success';

interface AlertItem {
  id: string | number;
  type: AlertType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AdminAlertProps {
  alerts: AlertItem[];
}

/**
 * AdminAlert — matches .alerts-section / .alert-item design from AdminDashboard.css
 * Renders a list of alert items with action buttons.
 */
export default function AdminAlert({ alerts }: AdminAlertProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alerts-section">
      <h2>Thông báo</h2>
      <div className="alerts-list">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert-item alert-${alert.type}`}>
            <div className="alert-content">
              <span className="alert-message">{alert.message}</span>
              {alert.actionLabel && alert.onAction && (
                <button
                  type="button"
                  className="alert-action"
                  onClick={alert.onAction}
                >
                  {alert.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { AlertItem, AlertType };
