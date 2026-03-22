import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

type AdminLoadingVariant = 'dashboard' | 'desktop-list' | 'mobile-list';
type AdminLoadingAccent = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';

const accentClassMap: Record<AdminLoadingAccent, { glow: string; chip: string; dot: string }> = {
  emerald: {
    glow: 'from-emerald-400 via-teal-400 to-cyan-400',
    chip: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  blue: {
    glow: 'from-blue-400 via-sky-400 to-cyan-400',
    chip: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  violet: {
    glow: 'from-violet-400 via-fuchsia-400 to-pink-400',
    chip: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
  },
  amber: {
    glow: 'from-amber-400 via-orange-400 to-yellow-400',
    chip: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  rose: {
    glow: 'from-rose-400 via-pink-400 to-orange-400',
    chip: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
  },
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-slate-200/85', className)} />;
}

export default function AdminLoadingState({
  title = 'Đang tải dữ liệu',
  hint = 'Bộ đệm đang phục hồi phiên trước để bạn không phải chờ tải lại toàn bộ.',
  variant = 'desktop-list',
  accent = 'emerald',
  className = '',
}: {
  title?: string;
  hint?: string;
  variant?: AdminLoadingVariant;
  accent?: AdminLoadingAccent;
  className?: string;
}) {
  const accentStyles = accentClassMap[accent];

  return (
    <div className={cn('relative overflow-hidden rounded-[32px] border border-white/70 bg-white/88 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl', className)}>
      <div className={cn('pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-30 blur-3xl', accentStyles.glow)} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]', accentStyles.chip)}>
              <Sparkles size={12} />
              Đang đồng bộ
            </span>
            <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{hint}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
            <span className={cn('h-2.5 w-2.5 rounded-full animate-pulse', accentStyles.dot)} />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Cache warm</span>
          </div>
        </div>

        {variant === 'dashboard' ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-4">
                  <div className="flex items-center justify-between">
                    <SkeletonBlock className="h-10 w-10 rounded-2xl" />
                    <SkeletonBlock className="h-3 w-16 rounded-full" />
                  </div>
                  <SkeletonBlock className="mt-5 h-8 w-24" />
                  <SkeletonBlock className="mt-3 h-3 w-20 rounded-full" />
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="rounded-[24px] border border-slate-200/80 bg-white p-4">
                      <SkeletonBlock className="h-3 w-24 rounded-full" />
                      <SkeletonBlock className="mt-4 h-9 w-28" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-4">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <div className="mt-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between rounded-[20px] border border-slate-200/70 bg-white px-4 py-3">
                      <SkeletonBlock className="h-3 w-24 rounded-full" />
                      <SkeletonBlock className="h-4 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {variant === 'desktop-list' ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[26px] border border-slate-200/80 bg-slate-50/75 p-4">
                  <div className="flex items-center gap-3">
                    <SkeletonBlock className="h-11 w-11 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock className="h-5 w-16" />
                      <SkeletonBlock className="h-3 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-4">
              <div className="flex flex-wrap gap-3">
                <SkeletonBlock className="h-12 min-w-[240px] flex-1 rounded-2xl" />
                <SkeletonBlock className="h-12 w-48 rounded-2xl" />
                <SkeletonBlock className="h-12 w-28 rounded-2xl" />
              </div>

              <div className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
                    <SkeletonBlock className="h-11 w-11 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock className="h-4 w-48" />
                      <SkeletonBlock className="h-3 w-32 rounded-full" />
                    </div>
                    <SkeletonBlock className="h-8 w-24 rounded-full" />
                    <SkeletonBlock className="h-8 w-20 rounded-full" />
                    <SkeletonBlock className="h-9 w-28 rounded-2xl" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {variant === 'mobile-list' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-3">
                  <SkeletonBlock className="h-3 w-12 rounded-full" />
                  <SkeletonBlock className="mt-3 h-8 w-10" />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <SkeletonBlock className="h-14 w-14 rounded-[22px]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBlock className="h-4 w-32" />
                      <div className="flex gap-2">
                        <SkeletonBlock className="h-5 w-16 rounded-full" />
                        <SkeletonBlock className="h-5 w-20 rounded-full" />
                      </div>
                      <SkeletonBlock className="h-3 w-40 rounded-full" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <SkeletonBlock className="h-10 flex-1 rounded-2xl" />
                    <SkeletonBlock className="h-10 w-24 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
