import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type AdminPageHeaderProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  pills?: ReactNode;
  align?: 'start' | 'center';
};

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  pills,
  align = 'start',
}: AdminPageHeaderProps) {
  return (
    <div className="admin-header admin-header-split">
      <div className="min-w-0">
        <div className={`admin-header-copy ${align === 'center' ? 'admin-header-copy-center' : ''}`}>
          <h1>
            {Icon ? <Icon size={30} /> : null}
            {title}
          </h1>
          {description ? <p>{description}</p> : null}
        </div>
        {pills ? <div className="admin-inline-pills mt-4">{pills}</div> : null}
      </div>
      {actions ? <div className="admin-header-actions">{actions}</div> : null}
    </div>
  );
}

type AdminSummaryPillProps = {
  children: ReactNode;
};

export function AdminSummaryPill({ children }: AdminSummaryPillProps) {
  return <span className="admin-subtle-pill">{children}</span>;
}
