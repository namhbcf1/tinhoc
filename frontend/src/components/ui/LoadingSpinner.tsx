import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const sizeMap = {
  small: {
    shell: 'min-h-[140px]',
    card: 'max-w-[280px] px-4 py-4 rounded-[24px]',
    ring: 'h-12 w-12',
    icon: 20,
  },
  medium: {
    shell: 'min-h-[42vh]',
    card: 'max-w-[360px] px-6 py-6 rounded-[30px]',
    ring: 'h-16 w-16',
    icon: 26,
  },
  large: {
    shell: 'min-h-[58vh]',
    card: 'max-w-[420px] px-7 py-7 rounded-[34px]',
    ring: 'h-20 w-20',
    icon: 30,
  },
} as const;

export default function LoadingSpinner({
  text = 'Đang tải...',
  size = 'medium',
  className = '',
}: {
  text?: string;
  size?: keyof typeof sizeMap;
  className?: string;
}) {
  const ui = sizeMap[size] ?? sizeMap.medium;

  return (
    <div className={cn('relative flex w-full items-center justify-center px-4', ui.shell, className)}>
      <div className={cn('relative overflow-hidden border border-white/75 bg-white/88 shadow-[0_32px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl', ui.card)}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_46%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-200/70 blur-2xl" />
            <div className={cn('relative flex items-center justify-center rounded-full border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]', ui.ring)}>
              <LoaderCircle size={ui.icon} className="animate-spin text-emerald-600" />
            </div>
          </div>

          {text ? (
            <div className="space-y-2">
              <p className="text-sm font-black tracking-tight text-slate-900">{text}</p>
              <p className="text-xs font-medium text-slate-500">Hệ thống đang chuẩn bị dữ liệu và khôi phục nội dung gần nhất.</p>
            </div>
          ) : null}

          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.25s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-violet-500" />
          </div>

          <div className="w-full max-w-[220px] space-y-2">
            <div className="h-2.5 animate-pulse rounded-full bg-slate-200" />
            <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-slate-200 [animation-delay:120ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
