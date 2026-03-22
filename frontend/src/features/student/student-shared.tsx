import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function StudentPageShell({
  icon,
  title,
  subtitle,
  stats = [],
  action,
  compact = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  stats?: Array<{ label: string; value: string | number }>;
  action?: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>
      <section className={cn(
        'relative overflow-hidden rounded-[28px] border border-emerald-200/60 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.24),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#065f46_50%,#022c22_100%)] p-6 text-white shadow-[0_24px_60px_-32px_rgba(6,95,70,0.7)]',
        compact && 'rounded-[24px] p-5'
      )}>
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className={cn('relative z-10 flex items-start justify-between gap-4', compact && 'flex-col')}>
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur',
              compact && 'h-12 w-12'
            )}>
              {icon}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-100/80">Student Area</p>
              <h1 className={cn('mt-1 text-3xl font-black tracking-tight', compact && 'text-2xl')}>{title}</h1>
              <p className={cn('mt-2 max-w-2xl text-sm text-emerald-50/80', compact && 'text-[13px]')}>{subtitle}</p>
            </div>
          </div>
          {action ? <div className={cn('shrink-0', compact && 'w-full')}>{action}</div> : null}
        </div>
        {!!stats.length && (
          <div className={cn('relative z-10 mt-5 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-50/60">{stat.label}</p>
                <p className="mt-1 text-xl font-black tracking-tight text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {children}
    </div>
  );
}

export function StudentFilterBar({
  filters,
  activeFilter,
  onChange,
}: {
  filters: Array<{ id: string; label: string; count?: number }>;
  activeFilter: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors',
            activeFilter === filter.id
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
          )}
        >
          <span>{filter.label}</span>
          {typeof filter.count === 'number' ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-black',
                activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              )}
            >
              {filter.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function StudentSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StudentEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
      <h3 className="text-base font-black text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StudentInfoCard({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[28px] border border-slate-200/70 bg-white p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)]', className)}>
      {children}
    </div>
  );
}

export function StudentPill({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const toneClasses: Record<string, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-black', toneClasses[tone] || toneClasses.slate)}>
      {children}
    </span>
  );
}

export function StudentModal({
  open,
  title,
  onClose,
  children,
  footer,
  compact = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn(
          'absolute left-1/2 top-1/2 flex w-[min(920px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl',
          compact && 'bottom-0 left-0 top-auto w-full translate-x-0 translate-y-0 rounded-b-none rounded-t-[28px]'
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Chi tiết</p>
            <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className={cn('max-h-[70vh] overflow-y-auto p-5', compact && 'max-h-[68vh]')}>{children}</div>
        {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
