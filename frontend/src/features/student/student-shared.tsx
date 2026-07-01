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
    <div className="w-full min-w-0">
      <div className={cn(
        'relative overflow-hidden border-b border-[var(--vt-line)] bg-[rgba(255,250,241,0.9)] shadow-[0_20px_55px_rgba(19,34,56,0.06)] backdrop-blur-xl',
        stickyHeader && 'sticky top-0 z-10',
        compact ? 'px-4 py-3' : 'px-5 py-4 sm:px-6 lg:px-8'
      )}>
        <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[var(--vt-champagne)] to-transparent" />
        <div aria-hidden="true" className="absolute right-[-6rem] top-[-8rem] h-52 w-52 rounded-full bg-[var(--vt-champagne-soft)] blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className={cn(
              'flex shrink-0 items-center justify-center rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-paper)] text-[var(--vt-emerald)] shadow-[var(--vt-shadow-card)]',
              compact ? 'h-9 w-9' : 'h-11 w-11'
            )}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--vt-champagne)]">Không gian học viên</p>
              <h1 className={cn(
                'font-black tracking-[-0.04em] text-[var(--vt-ink)]',
                compact ? 'text-base' : 'text-xl sm:text-2xl'
              )}>{title}</h1>
              {!compact && (
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--vt-muted)] sm:text-[13px]">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5 lg:justify-end lg:overflow-visible lg:pb-0">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--vt-line)] bg-white/75 px-3 py-2 shadow-sm"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--vt-muted)]">{stat.label}</span>
                <span className="text-sm font-black text-[var(--vt-ink)]">{stat.value}</span>
              </div>
            ))}
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </div>
      </div>

      <div className={cn(
        'mx-auto w-full max-w-7xl',
        compact ? 'space-y-4 p-4' : 'space-y-5 px-5 py-5 sm:px-6 lg:px-8 lg:py-6'
      )}>
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
            'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-black transition-all duration-200',
            activeFilter === filter.id
              ? 'border-[var(--vt-ink)] bg-[var(--vt-ink)] text-white shadow-[var(--vt-shadow-card)]'
              : 'border-[var(--vt-line)] bg-white/75 text-[var(--vt-muted)] hover:border-[var(--vt-champagne)] hover:text-[var(--vt-ink)]'
          )}
        >
          <span>{filter.label}</span>
          {typeof filter.count === 'number' ? (
            <span className={cn(
              'rounded-md px-1.5 py-0.5 text-[10px] font-extrabold',
              activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-[var(--vt-champagne-soft)] text-[var(--vt-emerald)]'
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
    <section className="space-y-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[15px] font-black tracking-[-0.02em] text-[var(--vt-ink)] sm:text-base">{title}</h2>
          {description ? (
            <p className="mt-0.5 max-w-2xl text-xs font-semibold leading-relaxed text-[var(--vt-muted)]">{description}</p>
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
    <div className="rounded-[1.35rem] border border-dashed border-[var(--vt-champagne-soft)] bg-[rgba(255,250,241,0.78)] px-6 py-10 text-center shadow-sm">
      <h3 className="text-sm font-black text-[var(--vt-ink)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-xs text-[var(--vt-muted)] leading-relaxed">{description}</p>
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
      'rounded-[1.65rem] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.82)] p-4 shadow-[var(--vt-shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--vt-champagne-soft)] hover:bg-white/90 sm:p-5',
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
    slate:   'border-[var(--vt-line)] bg-white/70 text-[var(--vt-muted)]',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber:   'border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] text-[var(--vt-ink)]',
    red:     'border-red-200 bg-red-50 text-red-700',
    blue:    'border-[var(--vt-line)] bg-[var(--vt-paper)] text-[var(--vt-emerald)]',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black',
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
        className="fixed inset-0 z-[100000] flex items-end justify-center bg-[rgba(11,23,40,0.66)] p-0 backdrop-blur-sm md:items-center md:p-4"
        onClick={onClose}
      >
        <div
          className={cn(
            'flex w-full flex-col overflow-hidden border border-[var(--vt-line)] bg-[var(--vt-paper)] shadow-2xl',
            compact
              /* mobile: bottom sheet cố định 90dvh, desktop: auto */
              ? 'rounded-t-2xl h-[90dvh] md:h-auto md:max-h-[85vh] md:rounded-2xl md:w-[min(680px,calc(100vw-2rem))]'
              : 'rounded-t-2xl h-[90dvh] md:h-auto md:max-h-[85vh] md:rounded-2xl md:w-[min(900px,calc(100vw-2rem))]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Drag handle — chỉ hiện trên mobile */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--vt-champagne-soft)]" />
        </div>

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[var(--vt-line)] px-5 py-3.5 shrink-0 bg-white/45">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--vt-champagne)]">Chi tiết</p>
            <h3 className="mt-0.5 text-base font-black tracking-[-0.03em] text-[var(--vt-ink)]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--vt-line)] bg-white/80 text-[var(--vt-muted)] hover:text-[var(--vt-ink)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 sm:p-5">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="border-t border-[var(--vt-line)] px-5 py-3.5 shrink-0 bg-white/45">
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
        <div key={i} className="rounded-[1.35rem] border border-[var(--vt-line)] bg-[var(--vt-paper)] p-4 animate-pulse">
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
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vt-line)] bg-white/80 px-3.5 py-2 text-xs font-black text-[var(--vt-muted)] shadow-sm transition-all duration-200 hover:border-[var(--vt-champagne)] hover:text-[var(--vt-ink)]"
    >
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
      {label}
    </button>
  );
}
