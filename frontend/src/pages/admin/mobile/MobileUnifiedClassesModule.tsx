// @ts-nocheck
import { lazy, Suspense, useEffect, useState } from 'react';
import { BookOpen, Video } from 'lucide-react';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

const MobileOnlineClassesModule = lazy(() => import('./MobileOnlineClassesModule'));
const MobileClassesModule = lazy(() => import('./MobileClassesModule'));

export default function MobileUnifiedClassesModule() {
  const [mode, setMode] = useState<'online' | 'legacy'>(() => {
    if (typeof window === 'undefined') return 'online';
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('mode') === 'legacy' ? 'legacy' : 'online';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'classes');
    url.searchParams.set('mode', mode);
    window.history.replaceState({}, '', url.toString());
  }, [mode]);

  return (
    <div>
      <div className="mx-[var(--admin-mobile-page-x,10px)] mt-2">
        <div className="inline-flex w-full rounded-[18px] border border-[rgba(14,165,233,0.18)] bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setMode('online')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[13px] px-3 py-2 text-sm font-black transition ${mode === 'online' ? 'bg-violet-600 text-white' : 'text-[var(--admin-ink)] hover:bg-slate-50'}`}
          >
            <Video size={16} />
            Lớp online
          </button>
          <button
            type="button"
            onClick={() => setMode('legacy')}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[13px] px-3 py-2 text-sm font-black transition ${mode === 'legacy' ? 'bg-cyan-600 text-white' : 'text-[var(--admin-ink)] hover:bg-slate-50'}`}
          >
            <BookOpen size={16} />
            Lớp legacy
          </button>
        </div>
      </div>

      <Suspense fallback={<div className="p-6"><LoadingSpinner text="Đang chuyển workspace lớp học..." /></div>}>
        {mode === 'online' ? <MobileOnlineClassesModule /> : <MobileClassesModule />}
      </Suspense>
    </div>
  );
}