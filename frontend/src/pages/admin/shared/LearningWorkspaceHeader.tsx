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
    <section className={`relative overflow-hidden rounded-[20px] border px-4 py-4 shadow-sm sm:px-5 sm:py-5 ${styles.shell}`}>
      <div className="relative flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] ${styles.iconWrap}`}>
              <Icon size={20} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h1 className={`text-[clamp(1.2rem,1.8vw,1.6rem)] font-black leading-tight tracking-tight ${styles.title}`}>
                {title}
              </h1>
              {pills ? <div className="mt-1.5 flex flex-wrap gap-1.5">{pills}</div> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {children ? <div>{children}</div> : null}

        {stats.length ? (
          <div className={`grid gap-2 ${stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-[16px] border px-3 py-3 ${styles.statCard}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${styles.statLabel}`}>{stat.label}</div>
                <div className="mt-1 text-[22px] font-black leading-none tracking-tight text-white">{stat.value}</div>
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
