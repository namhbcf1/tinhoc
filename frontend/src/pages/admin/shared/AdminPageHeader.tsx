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
      <div className="admin-header-main min-w-0">
        <div className={`admin-header-copy ${align === 'center' ? 'admin-header-copy-center' : ''}`}>
          <div className="admin-header-kicker">Vận hành học viện</div>
          <h1>
            {Icon ? <span className="admin-header-icon"><Icon size={26} strokeWidth={2.5} /></span> : null}
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
