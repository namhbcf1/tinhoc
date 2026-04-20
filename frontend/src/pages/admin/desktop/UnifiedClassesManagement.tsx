import { useEffect, useState } from 'react';
import { BookOpen, Video } from 'lucide-react';
import ClassesManagement from './ClassesManagement';
import OnlineClassesManagement from './OnlineClassesManagement';
import { LearningInfoPill, LearningWorkspaceHeader } from '../shared/LearningWorkspaceHeader';

export default function UnifiedClassesManagement() {
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
    <div className="admin-page">
      <LearningWorkspaceHeader
        icon={mode === 'online' ? Video : BookOpen}
        tone={mode === 'online' ? 'violet' : 'cyan'}
        title={mode === 'online' ? 'Lớp học online' : 'Lớp học legacy'}
        description={mode === 'online'
          ? 'Quản lý lớp học trực tuyến, lịch học, link Meet và quy trình vận hành của các lớp online trong cùng một không gian tập trung.'
          : 'Quản lý lớp đào tạo legacy, hồ sơ đăng ký và tiến độ lớp truyền thống với cách trình bày rõ ràng hơn.'}
        pills={(
          <>
            <LearningInfoPill>Tab chung: Lớp học</LearningInfoPill>
            <LearningInfoPill>Chế độ hiện tại: {mode === 'online' ? 'Online workspace' : 'Legacy workspace'}</LearningInfoPill>
          </>
        )}
      >
        <div className="inline-flex rounded-[24px] border border-white/80 bg-white/85 p-1.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setMode('online')}
            className={`inline-flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition ${mode === 'online' ? 'bg-violet-600 text-white shadow-[0_18px_34px_-24px_rgba(124,58,237,0.7)]' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Video size={16} />
            Lớp online
          </button>
          <button
            type="button"
            onClick={() => setMode('legacy')}
            className={`inline-flex items-center gap-2 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition ${mode === 'legacy' ? 'bg-cyan-600 text-white shadow-[0_18px_34px_-24px_rgba(8,145,178,0.7)]' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <BookOpen size={16} />
            Lớp legacy
          </button>
        </div>
      </LearningWorkspaceHeader>

      {mode === 'online' ? <OnlineClassesManagement /> : <ClassesManagement />}
    </div>
  );
}

