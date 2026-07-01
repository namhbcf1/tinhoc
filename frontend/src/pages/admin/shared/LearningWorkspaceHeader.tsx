import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type LearningWorkspaceTone = 'emerald' | 'blue' | 'violet' | 'cyan';

type LearningWorkspaceStat = {
  label: string;
  value: ReactNode;
  hint?: string;
};

type LearningWorkspaceHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  eyebrow?: string;
  tone?: LearningWorkspaceTone;
  actions?: ReactNode;
  pills?: ReactNode;
  stats?: LearningWorkspaceStat[];
  children?: ReactNode;
};

const toneStyles: Record<LearningWorkspaceTone, {
  shell: string;
  iconWrap: string;
  badge: string;
  statCard: string;
  title: string;
  description: string;
  metaShell: string;
  statLabel: string;
  statHint: string;
}> = {
  emerald: {
    shell: 'border-[rgba(200,169,106,0.20)] bg-[radial-gradient(circle_at_top_right,rgba(200,169,106,0.25),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(29,111,95,0.30),transparent_32%),linear-gradient(135deg,#132238_0%,#0b1728_46%,#1d6f5f_100%)]',
    iconWrap: 'bg-[rgba(255,250,241,0.13)] text-[var(--admin-champagne)] shadow-[0_24px_48px_-24px_rgba(200,169,106,0.58)] ring-1 ring-white/14 backdrop-blur-sm',
    badge: 'border-[rgba(200,169,106,0.25)] bg-[rgba(200,169,106,0.16)] text-[var(--admin-champagne)]',
    statCard: 'border-white/12 bg-white/[0.10] backdrop-blur-md',
    title: 'text-white',
    description: 'text-white/72',
    metaShell: 'border border-white/12 bg-white/[0.10] text-white/90',
    statLabel: 'text-white/55',
    statHint: 'text-white/70',
  },
  blue: {
    shell: 'border-[rgba(200,169,106,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(200,169,106,0.22),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(49,91,128,0.34),transparent_32%),linear-gradient(135deg,#132238_0%,#193352_48%,#315b80_100%)]',
    iconWrap: 'bg-[rgba(255,250,241,0.13)] text-[var(--admin-champagne)] shadow-[0_24px_48px_-24px_rgba(49,91,128,0.58)] ring-1 ring-white/14 backdrop-blur-sm',
    badge: 'border-[rgba(200,169,106,0.25)] bg-[rgba(200,169,106,0.15)] text-[var(--admin-champagne)]',
    statCard: 'border-white/12 bg-white/[0.10] backdrop-blur-md',
    title: 'text-white',
    description: 'text-white/72',
    metaShell: 'border border-white/12 bg-white/[0.10] text-white/90',
    statLabel: 'text-white/55',
    statHint: 'text-white/70',
  },
  violet: {
    shell: 'border-[rgba(200,169,106,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(200,169,106,0.22),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(111,93,143,0.34),transparent_32%),linear-gradient(135deg,#132238_0%,#2f284f_48%,#6f5d8f_100%)]',
    iconWrap: 'bg-[rgba(255,250,241,0.13)] text-[var(--admin-champagne)] shadow-[0_24px_48px_-24px_rgba(111,93,143,0.58)] ring-1 ring-white/14 backdrop-blur-sm',
    badge: 'border-[rgba(200,169,106,0.25)] bg-[rgba(200,169,106,0.15)] text-[var(--admin-champagne)]',
    statCard: 'border-white/12 bg-white/[0.10] backdrop-blur-md',
    title: 'text-white',
    description: 'text-white/72',
    metaShell: 'border border-white/12 bg-white/[0.10] text-white/90',
    statLabel: 'text-white/55',
    statHint: 'text-white/70',
  },
  cyan: {
    shell: 'border-[rgba(200,169,106,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(200,169,106,0.22),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(44,127,134,0.34),transparent_32%),linear-gradient(135deg,#132238_0%,#123f48_48%,#2c7f86_100%)]',
    iconWrap: 'bg-[rgba(255,250,241,0.13)] text-[var(--admin-champagne)] shadow-[0_24px_48px_-24px_rgba(44,127,134,0.58)] ring-1 ring-white/14 backdrop-blur-sm',
    badge: 'border-[rgba(200,169,106,0.25)] bg-[rgba(200,169,106,0.15)] text-[var(--admin-champagne)]',
    statCard: 'border-white/12 bg-white/[0.10] backdrop-blur-md',
    title: 'text-white',
    description: 'text-white/72',
    metaShell: 'border border-white/12 bg-white/[0.10] text-white/90',
    statLabel: 'text-white/55',
    statHint: 'text-white/70',
  },
};

export function LearningWorkspaceHeader({
  icon: Icon,
  title,
  description,
  eyebrow = 'Quản lý học tập',
  tone = 'emerald',
  actions,
  pills,
  stats = [],
  children,
}: LearningWorkspaceHeaderProps) {
  const styles = toneStyles[tone];

  return (
    <section className={`relative overflow-hidden rounded-[32px] border px-5 py-5 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.38)] sm:px-6 sm:py-6 xl:px-7 ${styles.shell}`}>
      <div className="pointer-events-none absolute -right-10 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm ${styles.metaShell}`}>
              <span className={`inline-flex rounded-full border px-2 py-0.5 ${styles.badge}`}>{eyebrow}</span>
              <span>Workspace</span>
            </div>

            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[22px] ${styles.iconWrap}`}>
                <Icon size={26} strokeWidth={2.4} />
              </div>

              <div className="min-w-0">
                <h1 className={`text-[clamp(1.9rem,2.8vw,2.8rem)] font-black leading-[1.02] tracking-[-0.05em] ${styles.title}`}>
                  {title}
                </h1>
                {pills ? <div className="mt-4 flex flex-wrap gap-2">{pills}</div> : null}
              </div>
            </div>
          </div>

          {actions ? <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end xl:w-auto">{actions}</div> : null}
        </div>

        {children ? <div>{children}</div> : null}

        {stats.length ? (
          <div className={`grid gap-3 ${stats.length === 1 ? 'md:grid-cols-1' : stats.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-[24px] border px-4 py-4 shadow-[0_16px_44px_-34px_rgba(15,23,42,0.25)] ${styles.statCard}`}>
                <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${styles.statLabel}`}>{stat.label}</div>
                <div className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-white">{stat.value}</div>
                {stat.hint ? <div className={`mt-2 text-xs leading-5 ${styles.statHint}`}>{stat.hint}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LearningInfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.10] px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
      {children}
    </span>
  );
}
