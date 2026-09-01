import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, type LucideIcon } from 'lucide-react';
import { useOverlayLayer, useOverlayLock } from '../../../components/ui/overlay-lock';

type MobileAdminTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';

const quietHeroTone = {
  hero: 'border-[rgba(14,165,233,0.18)] bg-[linear-gradient(180deg,#ffffff_0%,#dff3ff_58%,#bae6fd_100%)]',
  title: 'text-[var(--admin-ink)]',
  description: 'text-[var(--admin-ink)]',
  meta: 'border-[rgba(14,165,233,0.18)] bg-[rgba(14,165,233,0.12)] text-[var(--admin-ink)]',
  icon: 'bg-[rgba(14,165,233,0.14)] text-[var(--admin-ink)] ring-1 ring-[rgba(14,165,233,0.14)]',
  stat: 'border-[rgba(14,165,233,0.18)] bg-white/70 backdrop-blur-sm',
  statLabel: 'text-[var(--admin-ink)]',
  statValue: 'text-[var(--admin-ink)]',
  primaryButton: 'bg-white text-[var(--admin-ink)] ring-1 ring-[rgba(14,165,233,0.24)] hover:bg-[var(--admin-paper-deep)]',
};

const mobileToneStyles: Record<MobileAdminTone, typeof quietHeroTone> = {
  slate: quietHeroTone,
  blue: quietHeroTone,
  emerald: quietHeroTone,
  amber: quietHeroTone,
  violet: quietHeroTone,
  rose: quietHeroTone,
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
    <div className={`relative mx-[var(--admin-mobile-page-x,10px)] mt-2 overflow-hidden rounded-[20px] border px-3 pb-3 pt-2.5 shadow-[0_12px_28px_-24px_rgba(14,165,233,0.16)] ${styles.hero}`}>
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.16em] ${styles.meta}`}>
              <span>{eyebrow}</span>
              <span className="h-1 w-1 rounded-full bg-current opacity-60" />
              <span>console</span>
            </div>

            <div className="mt-2 flex items-start gap-2">
              {Icon ? (
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] shadow-none ${styles.icon}`}>
                  <Icon size={16} strokeWidth={2.35} />
                </div>
              ) : null}

              <div className="min-w-0 pt-0.5">
                <h2 className={`text-[15px] font-black leading-[1.05] tracking-[-0.055em] ${styles.title}`}>{title}</h2>
                {description ? <p className={`mt-1.5 line-clamp-2 text-[10px] font-bold leading-4 ${styles.description}`}>{description}</p> : null}
              </div>
            </div>
          </div>
        </div>

        {actions ? <div className="mt-2 flex flex-wrap gap-1.5">{actions}</div> : null}

        {children ? <div className="mt-2">{children}</div> : null}
        {stats ? <div className="mt-2 rounded-[16px] border border-[rgba(14,165,233,0.18)] bg-white/70 p-1.5 backdrop-blur-sm text-[var(--admin-ink)]">{stats}</div> : null}
        {search ? <div className="mt-2">{search}</div> : null}
        {filters ? <div className="mt-1.5">{filters}</div> : null}
        {footer ? <div className={`mt-2 rounded-[14px] border px-2.5 py-1.5 text-[9px] font-bold leading-3 ${styles.meta}`}>{footer}</div> : null}
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
    <div className="mx-[var(--admin-mobile-page-x,10px)] mb-2.5 rounded-[18px] border border-[rgba(14,165,233,0.18)] bg-[rgba(255,255,255,0.98)] p-2.5 text-[var(--admin-ink)] shadow-[0_10px_24px_-22px_rgba(14,165,233,0.16)]">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--admin-ink)]">{title}</h3>
          {description ? <p className="mt-1 text-[10px] font-bold leading-4 text-[var(--admin-ink)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div> : null}
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
    slate: 'bg-[rgba(255,255,255,0.98)] text-[var(--admin-ink)] border-[rgba(14,165,233,0.18)]',
    blue: 'bg-[rgba(255,255,255,0.98)] text-[var(--admin-ink)] border-[rgba(14,165,233,0.18)]',
    emerald: 'bg-[rgba(255,255,255,0.98)] text-[var(--admin-ink)] border-[rgba(14,165,233,0.18)]',
    amber: 'bg-[rgba(255,255,255,0.98)] text-[var(--admin-ink)] border-[rgba(37,99,235,0.18)]',
    violet: 'bg-[rgba(255,255,255,0.98)] text-[var(--admin-ink)] border-[rgba(14,165,233,0.18)]',
    rose: 'bg-[rgba(255,255,255,0.98)] text-[var(--admin-ink)] border-[rgba(14,165,233,0.18)]',
  }[tone];

  return (
    <div className={`min-h-[60px] rounded-[16px] border px-2.5 py-2 shadow-[0_8px_20px_-18px_rgba(14,165,233,0.16)] ${toneClass}`}>
      <p className="text-[7px] font-black uppercase tracking-[0.12em] opacity-100 text-[var(--admin-ink)]">{label}</p>
      <p className="mt-1.5 text-[15px] font-black leading-none tracking-[-0.05em]">{value}</p>
      {hint ? <p className="mt-1.5 text-[8px] font-bold leading-3 opacity-100 text-[var(--admin-ink)]">{hint}</p> : null}
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
      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-champagne)]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-[16px] border border-[rgba(14,165,233,0.18)] bg-[rgba(255,255,255,0.98)] pl-9 pr-8 text-[11px] font-bold text-[var(--admin-ink)] outline-none shadow-none transition placeholder:text-[rgba(16,32,51,0.58)] focus:border-[rgba(37,99,235,0.42)] focus:bg-white focus:ring-2 focus:ring-[rgba(14,165,233,0.14)]"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-[rgba(14,165,233,0.14)] p-0.5 text-[var(--admin-ink)]"
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
      className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-[13px] border border-[rgba(14,165,233,0.24)] bg-white px-2.5 py-1 text-[10px] font-black text-[var(--admin-ink)] shadow-none transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
      className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-[13px] border border-[rgba(14,165,233,0.18)] bg-[rgba(255,255,255,0.98)] px-2.5 py-1 text-[10px] font-bold text-[var(--admin-ink)] shadow-none transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
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
      className={`fixed bottom-[calc(var(--mb-bottom-nav-height)+env(safe-area-inset-bottom,0px)+12px)] right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(14,165,233,0.24)] bg-white text-[var(--admin-ink)] shadow-[0_8px_20px_-18px_rgba(14,165,233,0.16)] transition-transform active:scale-95 ${className}`}
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
        className="absolute inset-0 bg-[rgba(11,23,40,0.58)] backdrop-blur-md"
        onClick={onClose}
        aria-label="Đóng"
      />
      <div className="absolute inset-x-2 bottom-2 top-[max(env(safe-area-inset-top,0px),8px)] overflow-hidden rounded-t-[30px] rounded-b-[26px] border border-[rgba(14,165,233,0.18)] bg-[var(--admin-paper)] shadow-[0_18px_48px_-34px_rgba(14,165,233,0.16)]" style={{ height, maxHeight: 'calc(100dvh - 16px)' }}>
        <div className="flex items-center justify-between border-b border-[rgba(14,165,233,0.18)] bg-white px-3 pb-3 pt-2.5">
          <div className="min-w-0">
            <div className="mb-1 h-0.5 w-8 rounded-full bg-[rgba(37,99,235,0.42)]" />
            <h3 className="text-[15px] font-bold leading-tight text-[var(--admin-ink)]">{title}</h3>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(14,165,233,0.12)] text-[var(--admin-ink)]">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-4" style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top,0px) - 104px)' }}>
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
