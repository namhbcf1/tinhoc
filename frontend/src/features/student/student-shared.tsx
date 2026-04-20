import type { ReactNode } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import OverlayPortal from '../../components/ui/OverlayPortal';

// ─── Page Shell ───────────────────────────────────────────────────────────────
// Giống admin: white top-bar với icon + title + badge stats + action button

export function StudentPageShell({
  icon,
  title,
  subtitle,
  stats = [],
  action,
  compact = false,
  /** Đặt false khi dùng trong mobile layout có header riêng — tránh double sticky */
  stickyHeader = true,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  stats?: Array<{ label: string; value: string | number }>;
  action?: ReactNode;
  compact?: boolean;
  stickyHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('w-full', compact ? 'space-y-0' : 'space-y-0')}>
      {/* Header bar */}
      <div className={cn(
        'bg-white border-b border-slate-200/70',
        stickyHeader && 'sticky top-0 z-10',
        compact ? 'px-4 py-3' : 'px-6 py-4'
      )}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100',
              compact ? 'w-9 h-9' : 'w-10 h-10'
            )}>
              {icon}
            </div>
            <div>
              <h1 className={cn(
                'font-extrabold tracking-tight text-slate-900',
                compact ? 'text-base' : 'text-lg'
              )}>{title}</h1>
              {!compact && (
                <p className="text-xs text-slate-400 mt-0.5 max-w-lg">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stats pills */}
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5"
              >
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <span className="text-sm font-extrabold text-slate-800">{stat.value}</span>
              </div>
            ))}
            {/* Action */}
            {action}
          </div>
        </div>

        {/* Mobile stats row */}
        {!!stats.length && (
          <div className="sm:hidden mt-3 flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 shrink-0"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <span className="text-sm font-extrabold text-slate-700">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn(compact ? 'p-4 space-y-4' : 'p-6 space-y-5')}>
        {children}
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

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
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-150',
            activeFilter === filter.id
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          <span>{filter.label}</span>
          {typeof filter.count === 'number' ? (
            <span className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
              activeFilter === filter.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
            )}>
              {filter.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-extrabold tracking-tight text-slate-800">{title}</h2>
          {description ? (
            <span className="hidden md:block text-xs text-slate-400 font-medium">— {description}</span>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <h3 className="text-sm font-extrabold text-slate-700">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-400 leading-relaxed">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

export function StudentInfoCard({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {children}
    </div>
  );
}

// ─── Pill / Badge ─────────────────────────────────────────────────────────────

export function StudentPill({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'blue';
}) {
  const toneClasses: Record<string, string> = {
    slate:   'border-slate-200   bg-slate-50   text-slate-600',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber:   'border-amber-200   bg-amber-50   text-amber-700',
    red:     'border-red-200     bg-red-50     text-red-700',
    blue:    'border-blue-200    bg-blue-50    text-blue-700',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-extrabold',
      toneClasses[tone] ?? toneClasses.slate
    )}>
      {children}
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

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
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[100000] bg-slate-950/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={onClose}
      >
        <div
          className={cn(
            'flex w-full flex-col overflow-hidden bg-white shadow-2xl',
            compact
              /* mobile: bottom sheet cố định 90dvh, desktop: auto */
              ? 'rounded-t-2xl h-[90dvh] md:h-auto md:max-h-[85vh] md:rounded-2xl md:w-[min(680px,calc(100vw-2rem))]'
              : 'rounded-t-2xl h-[90dvh] md:h-auto md:max-h-[85vh] md:rounded-2xl md:w-[min(900px,calc(100vw-2rem))]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Drag handle — chỉ hiện trên mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Chi tiết</p>
            <h3 className="mt-0.5 text-base font-extrabold tracking-tight text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="border-t border-slate-100 px-5 py-3.5 shrink-0 bg-slate-50/50">
            {footer}
          </div>
        ) : null}
        </div>
      </div>
    </OverlayPortal>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

export function StudentCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-5 w-20 rounded-lg bg-slate-100" />
            <div className="h-5 w-16 rounded-lg bg-slate-100" />
          </div>
          <div className="h-5 w-48 rounded bg-slate-200 mb-2" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="h-14 rounded-lg bg-slate-50" />
            <div className="h-14 rounded-lg bg-slate-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Refresh Button ───────────────────────────────────────────────────────────

export function StudentRefreshButton({
  onClick,
  loading,
  label = 'Làm mới',
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 shadow-sm"
    >
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
      {label}
    </button>
  );
}
