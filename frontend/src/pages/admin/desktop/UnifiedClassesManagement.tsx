import { Video } from 'lucide-react';
import OnlineClassesManagement from './OnlineClassesManagement';

export default function UnifiedClassesManagement() {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
        <div className="flex items-center gap-2 text-purple-700 font-semibold">
          <Video size={18} />
          <span>Lớp Online</span>
        </div>
      </div>

      <OnlineClassesManagement />
    </div>
  );
}

