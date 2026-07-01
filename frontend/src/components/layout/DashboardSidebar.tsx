// @ts-nocheck
import { Suspense, lazy, useEffect, useState } from 'react';
import { ExternalLink, LogOut, UserCircle, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import { STUDENT_MAIN_MENU, openStudyPlatform } from '../../features/student/student-nav';
import { getStorageValue, removeStorageValue } from '../../utils/browser-storage.js';
import { applyImageFallback, resolveImageUrl } from '../../utils/imageUrl';
import './DashboardSidebar.css';

const StudentProfileEditor = lazy(() => import('../profile/StudentProfileEditor'));

function safeReadStudentData() {
  try {
    const raw = getStorageValue('student_data');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      removeStorageValue('student_data');
      return {};
    }
    return parsed;
  } catch {
    removeStorageValue('student_data');
    return {};
  }
}

export default function DashboardSidebar({
  isOpen,
  onClose,
  studentData: studentDataProp,
}: {
  isOpen: boolean;
  onClose?: () => void;
  studentData?: any;
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [localData, setLocalData] = useState(() => studentDataProp || safeReadStudentData());
  const [currentStudent, setCurrentStudent] = useState(() => studentDataProp || safeReadStudentData());
  const displayName = localData?.ho_ten_full || localData?.fullName || localData?.ten || 'Học viên';
  const avatarUrl = resolveImageUrl(localData?.image_3x4 || localData?.photo_3x4_image_id || localData?.avatar);

  useEffect(() => {
    if (studentDataProp && Object.keys(studentDataProp).length > 0) {
      setLocalData(studentDataProp);
      setCurrentStudent(studentDataProp);
    }
  }, [studentDataProp]);

  const handleOpenProfile = async () => {
    const latestData = localData && Object.keys(localData).length > 0
      ? localData
      : safeReadStudentData();

    setCurrentStudent(latestData);
    setLocalData(latestData);
    setIsProfileOpen(true);

    const cccd = latestData.cccd || getStorageValue('student_cccd');
    if (!cccd) return;

    try {
      const response = await api.getStudentByCCCD(cccd);
      if (response.success && response.data) {
        setCurrentStudent(response.data);
        setLocalData(response.data);
      }
    } catch {
      // Keep stale profile data visible if refresh fails.
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        aria-label="Menu điều hướng"
        className={cn(
          'dashboard-sidebar fixed inset-y-0 left-0 z-40 w-[280px] bg-[linear-gradient(180deg,var(--vt-ink),#0b1728)] border-r border-white/10 text-white shadow-[18px_0_70px_rgba(19,34,56,0.18)] md:shadow-[18px_0_70px_rgba(19,34,56,0.12)] flex flex-col',
          'transition-transform duration-300 ease-in-out md:translate-x-0 will-change-transform',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        data-tour="student-desktop-sidebar"
      >
        <div className="h-[76px] shrink-0 flex items-center justify-between px-6 border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-paper)] flex items-center justify-center text-[var(--vt-ink)] shadow-lg shadow-black/20">
              <span className="font-black text-[20px]">V</span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-black text-[17px] text-white tracking-[-0.03em] leading-tight">
                VanTrang<span className="text-[var(--vt-champagne)]">Edu</span>
              </span>
              <span className="text-[11px] font-black tracking-[0.18em] text-white/45 uppercase mt-0.5">Học viên</span>
            </div>
          </div>
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 mt-6 mb-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenProfile}
            title="Bấm để cập nhật hồ sơ"
            className="p-3 bg-white/[0.06] border border-white/10 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/[0.10] hover:border-[var(--vt-champagne-soft)] transition-all duration-200 group shadow-lg shadow-black/10 text-left w-full"
            data-tour="student-desktop-profile"
          >
            <div className="w-11 h-11 rounded-[14px] bg-[var(--vt-paper)] border border-[var(--vt-champagne-soft)] flex items-center justify-center text-[var(--vt-emerald)] shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-[12px] object-cover"
                  onError={(event) => applyImageFallback(event, displayName)}
                />
              ) : (
                <UserCircle size={26} strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center">
              <p className="text-[14px] font-black text-white truncate group-hover:text-[var(--vt-champagne)] transition-colors leading-tight">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--vt-champagne)] animate-pulse" />
                <p className="text-[12px] font-semibold text-white/50 truncate mt-0.5 leading-none group-hover:text-white/70 transition-colors tracking-tight">
                  {localData.cccd ? `ID: ${String(localData.cccd).slice(-4)}` : 'Đang trực tuyến'}
                </p>
              </div>
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar" data-tour="student-desktop-nav">
          <div className="px-3 mb-3 text-[11px] font-black tracking-[0.18em] text-white/35 uppercase">
            Menu chính
          </div>
          <ul className="space-y-1">
            {STUDENT_MAIN_MENU.map((item) => (
              <li key={item.path || item.external}>
                {item.external ? (
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group relative',
                      'text-white/62 hover:bg-white/[0.08] hover:text-white'
                    )}
                    data-tour={`student-desktop-nav-${item.id}`}
                    onClick={() => {
                      openStudyPlatform();
                      if (onClose && window.innerWidth < 768) onClose();
                    }}
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200 bg-white/[0.07] text-white/45 group-hover:bg-white/[0.12] group-hover:text-[var(--vt-champagne)]">
                      <item.icon size={18} strokeWidth={2} />
                    </div>
                    <span className="flex-1 text-left leading-none tracking-tight">
                      {item.label}
                      <ExternalLink size={12} className="inline ml-1 opacity-60" aria-hidden="true" />
                      <span className="sr-only">(mở tab mới)</span>
                    </span>
                  </button>
                ) : (
                  <NavLink
                    to={item.path!}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14px] font-bold transition-all duration-200 group relative',
                      isActive
                        ? 'bg-[var(--vt-paper)] text-[var(--vt-ink)] shadow-md shadow-black/20'
                        : 'text-white/62 hover:bg-white/[0.08] hover:text-white'
                    )}
                    data-tour={`student-desktop-nav-${item.id}`}
                    onClick={() => onClose && window.innerWidth < 768 && onClose()}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={cn(
                          'flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200',
                          isActive
                            ? 'bg-[var(--vt-champagne-soft)] text-[var(--vt-ink)] shadow-inner'
                            : 'bg-white/[0.07] text-white/45 group-hover:bg-white/[0.12] group-hover:text-[var(--vt-champagne)]'
                        )}>
                          <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className="flex-1 text-left leading-none tracking-tight">{item.label}</span>
                        {isActive ? (
                          <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--vt-champagne)] animate-pulse" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-5 border-t border-white/10 shrink-0 bg-white/[0.03]">
          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 font-bold text-[14px] transition-all duration-200 hover:bg-red-500/15 hover:border-red-300/30 hover:text-red-100 focus:ring-4 focus:ring-red-100/20 shadow-sm"
            onClick={() => {
              api.logoutRole('student');
              window.location.href = '/login';
            }}
            data-tour="student-desktop-logout"
          >
            <LogOut size={18} strokeWidth={2.5} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {isProfileOpen ? (
        <Suspense fallback={null}>
          <StudentProfileEditor
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            studentData={currentStudent}
            onUpdateSuccess={() => setLocalData(safeReadStudentData())}
          />
        </Suspense>
      ) : null}
    </>
  );
}
