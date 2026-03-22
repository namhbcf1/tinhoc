import { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';

import DashboardSidebar from '../../components/layout/DashboardSidebar';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../services/api';
import { getStorageValue, removeStorageValue } from '../../utils/browser-storage.js';
import { isMobileDevice } from '../../utils/deviceDetection';
import { loadStudentData, STUDENT_SESSION_UPDATED_EVENT } from '../../utils/studentDataLoader';

const StudentExams = lazy(() => import('./desktop/StudentExams'));
const PersonalInfo = lazy(() => import('./desktop/PersonalInfo'));

// Mobile dashboard — lazy-loaded only khi cần
const StudentDashboardMobile = lazy(() => import('./mobile/StudentDashboardMobile'));

/* ⛔ CẤM: Tài liệu, Chứng chỉ, Tin nhắn, Điểm danh — KHÔNG dùng trong student dashboard */
const TAB_MAP = {
  exams: StudentExams,
  profile: PersonalInfo,
};

function getTabFromPath(pathname) {
  if (pathname.includes('/schedule') || pathname.includes('/payment')) {
    return null;
  }

  if (pathname.includes('/profile')) {
    return 'profile';
  }

  for (const key of Object.keys(TAB_MAP)) {
    if (pathname.includes(key)) return key;
  }
  return null;
}

// Đọc student_data từ cả localStorage và sessionStorage
function readStudentData() {
  try {
    const raw = getStorageValue('student_data');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      removeStorageValue('student_data');
      return null;
    }
    return parsed;
  } catch {
    removeStorageValue('student_data');
    return null;
  }
}

export default function StudentDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [studentData, setStudentData] = useState(readStudentData);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Dùng mobile layout chuyên dụng trên thiết bị di động
  const mobile = isMobileDevice();

  if (mobile) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      }>
        <StudentDashboardMobile />
      </Suspense>
    );
  }

  // Nếu student_data chưa có → thử fetch từ API bằng cccd đã lưu
  useEffect(() => {
    const cccd = getStorageValue('student_cccd');
    if (!cccd) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;
    setFetchingProfile(true);
    loadStudentData(cccd)
      .then((merged) => {
        if (cancelled) return;
        if (merged) {
          setStudentData(merged);
        } else if (!studentData) {
          navigate('/login', { replace: true });
        }
      })
      .catch(() => {
        if (!cancelled && !studentData) {
          navigate('/login', { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFetchingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleSessionUpdated = (event) => {
      const nextStudent = event?.detail;
      if (nextStudent && typeof nextStudent === 'object') {
        setStudentData(nextStudent);
      }
    };

    window.addEventListener(STUDENT_SESSION_UPDATED_EVENT, handleSessionUpdated);
    return () => window.removeEventListener(STUDENT_SESSION_UPDATED_EVENT, handleSessionUpdated);
  }, []);

  const tab = getTabFromPath(location.pathname);

  if (!tab) {
    return <Navigate to="/dashboard/exams" replace />;
  }

  if (fetchingProfile && !studentData) {
    return (
      <div className="min-h-[100dvh] bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const ActiveModule = TAB_MAP[tab];

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      <DashboardSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        studentData={studentData}
      />

      <div className="flex-1 flex flex-col min-w-0 md:ml-[280px] h-[100dvh] overflow-hidden">
        <header className="md:hidden shrink-0 h-14 bg-white border-b border-slate-100 px-4 flex items-center justify-between z-20 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-10 h-10 -ml-1 rounded-xl text-slate-500 hover:bg-slate-50 active:scale-95 transition-all outline-none flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                V
              </div>
              <span className="font-bold text-[15px] text-slate-800 tracking-tight">
                VanTrang<span className="text-emerald-600">Edu</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => { api.logoutRole('student'); window.location.href = '/login'; }}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-[78px] md:pb-6 w-full" data-tour="student-desktop-main">
          <Suspense fallback={<LoadingSpinner />}>
            <ActiveModule studentData={studentData} />
          </Suspense>
        </main>
      </div>

      <StudentBottomNav />
    </div>
  );
}
