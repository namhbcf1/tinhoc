import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, type LucideIcon } from 'lucide-react';
import { useOverlayLayer, useOverlayLock } from '../../../components/ui/overlay-lock';

type MobileAdminTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';

const mobileToneStyles: Record<MobileAdminTone, {
  hero: string;
  title: string;
  description: string;
  meta: string;
  icon: string;
  stat: string;
  statLabel: string;
  statValue: string;
  primaryButton: string;
}> = {
  slate: {
    hero: 'border-slate-300/30 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_25%),linear-gradient(145deg,#0f172a_0%,#1e293b_100%)]',
    title: 'text-white',
    description: 'text-slate-200/80',
    meta: 'border-white/12 bg-white/[0.10] text-white/90',
    icon: 'bg-white/14 text-white ring-1 ring-white/10',
    stat: 'border-white/10 bg-white/[0.10] backdrop-blur-sm',
    statLabel: 'text-white/60',
    statValue: 'text-white',
    primaryButton: 'bg-white text-slate-900 hover:bg-slate-100',
  },
  blue: {
    hero: 'border-blue-400/20 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.24),transparent_24%),linear-gradient(145deg,#0f172a_0%,#1d4ed8_50%,#2563eb_100%)]',
    title: 'text-white',
    description: 'text-blue-50/80',
    meta: 'border-white/12 bg-white/[0.10] text-white/90',
    icon: 'bg-white/14 text-white ring-1 ring-white/10',
    stat: 'border-white/10 bg-white/[0.10] backdrop-blur-sm',
    statLabel: 'text-white/60',
    statValue: 'text-white',
    primaryButton: 'bg-white text-blue-700 hover:bg-blue-50',
  },
  emerald: {
    hero: 'border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(110,231,183,0.24),transparent_24%),linear-gradient(145deg,#022c22_0%,#047857_48%,#0f766e_100%)]',
    title: 'text-white',
    description: 'text-emerald-50/80',
    meta: 'border-white/12 bg-white/[0.10] text-white/90',
    icon: 'bg-white/14 text-white ring-1 ring-white/10',
    stat: 'border-white/10 bg-white/[0.10] backdrop-blur-sm',
    statLabel: 'text-white/60',
    statValue: 'text-white',
    primaryButton: 'bg-white text-emerald-700 hover:bg-emerald-50',
  },
  amber: {
    hero: 'border-amber-400/20 bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.22),transparent_24%),linear-gradient(145deg,#451a03_0%,#b45309_48%,#d97706_100%)]',
    title: 'text-white',
    description: 'text-amber-50/80',
    meta: 'border-white/12 bg-white/[0.10] text-white/90',
    icon: 'bg-white/14 text-white ring-1 ring-white/10',
    stat: 'border-white/10 bg-white/[0.10] backdrop-blur-sm',
    statLabel: 'text-white/60',
    statValue: 'text-white',
    primaryButton: 'bg-white text-amber-700 hover:bg-amber-50',
  },
  violet: {
    hero: 'border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(221,214,254,0.22),transparent_24%),linear-gradient(145deg,#1e1b4b_0%,#6d28d9_48%,#7c3aed_100%)]',
    title: 'text-white',
    description: 'text-violet-50/80',
    meta: 'border-white/12 bg-white/[0.10] text-white/90',
    icon: 'bg-white/14 text-white ring-1 ring-white/10',
    stat: 'border-white/10 bg-white/[0.10] backdrop-blur-sm',
    statLabel: 'text-white/60',
    statValue: 'text-white',
    primaryButton: 'bg-white text-violet-700 hover:bg-violet-50',
  },
  rose: {
    hero: 'border-rose-400/20 bg-[radial-gradient(circle_at_top_right,rgba(251,207,232,0.22),transparent_24%),linear-gradient(145deg,#4c0519_0%,#be185d_48%,#e11d48_100%)]',
    title: 'text-white',
    description: 'text-rose-50/80',
    meta: 'border-white/12 bg-white/[0.10] text-white/90',
    icon: 'bg-white/14 text-white ring-1 ring-white/10',
    stat: 'border-white/10 bg-white/[0.10] backdrop-blur-sm',
    statLabel: 'text-white/60',
    statValue: 'text-white',
    primaryButton: 'bg-white text-rose-700 hover:bg-rose-50',
  },
};

export function MobileAdminHeroCard({
  eyebrow = 'Admin',
  icon: Icon,
  title,
  description,
  actions,
  stats,
  search,
  filters,
  footer,
  tone = 'blue',
  children,
}: {
  eyebrow?: string;
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  stats?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
  tone?: MobileAdminTone;
  children?: ReactNode;
}) {
  const styles = mobileToneStyles[tone];

  return (
    <div className={`relative mx-4 mt-2 overflow-hidden rounded-[24px] border p-3 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.36)] ${styles.hero}`}>
      <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="min-w-0">
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${styles.meta}`}>
            <span>{eyebrow}</span>
            <span>mobile</span>
          </div>

          <div className="mt-2 flex items-start gap-2">
            {Icon ? (
              <div className={`flex h-9 w-9 items-center justify-center rounded-[14px] shadow-sm backdrop-blur-sm ${styles.icon}`}>
                <Icon size={17} strokeWidth={2.3} />
              </div>
            ) : null}

            <div className="min-w-0">
              <h2 className={`text-[16px] font-black tracking-[-0.04em] ${styles.title}`}>{title}</h2>
            </div>
          </div>
        </div>

        {actions ? <div className="mt-2.5 flex flex-wrap gap-1.5">{actions}</div> : null}

        {children ? <div className="mt-2.5">{children}</div> : null}
        {stats ? <div className="mt-2.5">{stats}</div> : null}
        {search ? <div className="mt-2.5">{search}</div> : null}
        {filters ? <div className="mt-2">{filters}</div> : null}
        {footer ? <div className={`mt-2.5 rounded-xl px-2.5 py-1.5 text-[10px] font-medium ${styles.meta}`}>{footer}</div> : null}
      </div>
    </div>
  );
}

export function MobileAdminSectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-4 mb-3 rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.28)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-800">{title}</h3>
          {description ? <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function MobileAdminStatCard({
  label,
  value,
  tone = 'slate',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'slate' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
  hint?: ReactNode;
}) {
  const toneClass = {
    slate: 'bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900 border-slate-200',
    blue: 'bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] text-blue-900 border-blue-200',
    emerald: 'bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_100%)] text-emerald-900 border-emerald-200',
    amber: 'bg-[linear-gradient(180deg,#fffbeb_0%,#fef3c7_100%)] text-amber-900 border-amber-200',
    violet: 'bg-[linear-gradient(180deg,#f5f3ff_0%,#ede9fe_100%)] text-violet-900 border-violet-200',
    rose: 'bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_100%)] text-rose-900 border-rose-200',
  }[tone];

  return (
    <div className={`rounded-[18px] border px-3 py-2.5 shadow-[0_14px_24px_-24px_rgba(15,23,42,0.35)] ${toneClass}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1.5 text-[18px] font-black leading-none tracking-[-0.04em]">{value}</p>
      {hint ? <p className="mt-1.5 text-[10px] font-medium opacity-70">{hint}</p> : null}
    </div>
  );
}

export function MobileAdminSearchField({
  value,
  onChange,
  onClear,
  placeholder = 'Tìm kiếm...',
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-[18px] border border-white/10 bg-white/[0.96] pl-10 pr-10 text-[13px] text-slate-900 outline-none shadow-[0_10px_22px_-22px_rgba(15,23,42,0.3)] transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-1 text-slate-500"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function MobileAdminPrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[16px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-3 py-1.5 text-[12px] font-black text-white shadow-[0_16px_28px_-22px_rgba(29,78,216,0.58)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MobileAdminSecondaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[16px] border border-white/10 bg-white/[0.96] px-3 py-1.5 text-[12px] font-semibold text-slate-700 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.32)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MobileAdminFloatingAction({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`fixed bottom-[calc(var(--mb-bottom-nav-height)+env(safe-area-inset-bottom,0px)+18px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_100%)] text-white shadow-[0_22px_40px_-20px_rgba(29,78,216,0.58)] transition-transform active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function MobileAdminBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = '100dvh',
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  height?: string;
}) {
  useOverlayLock(isOpen);
  const overlayLayer = useOverlayLayer(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sheetTree = (
    <div className="fixed inset-0" style={{ zIndex: overlayLayer }}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div className="absolute inset-0 bg-white shadow-2xl" style={{ height, maxHeight: '100dvh' }}>
        <div className="flex items-center justify-between border-b border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] text-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60">Admin mobile</div>
            <h3 className="mt-1 text-[15px] font-black tracking-tight text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto bg-[#f4f7fb] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4" style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top,0px) - 88px)' }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return sheetTree;
  }

  return createPortal(sheetTree, document.body);
}

export function mobileAdminContentPadding(extra = 20) {
  return `calc(var(--mb-bottom-nav-height,70px) + env(safe-area-inset-bottom,0px) + ${extra}px)`;
}
