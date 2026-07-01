// @ts-nocheck
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';

import DashboardSidebar from '../../components/layout/DashboardSidebar';
import StudentBottomNav from '../../components/student/StudentBottomNav';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../services/api';
import { getStorageValue, removeStorageValue } from '../../utils/browser-storage.js';
import { useIsMobile } from '../../utils/deviceDetection';
import { loadStudentData, STUDENT_SESSION_UPDATED_EVENT } from '../../utils/studentDataLoader';

const StudentExams = lazy(() => import('./desktop/StudentExams'));
const AttendancePage = lazy(() => import('./desktop/AttendancePage'));
const PersonalInfo = lazy(() => import('./desktop/PersonalInfo'));
const StudentReviewsView = lazy(() => import('./desktop/StudentReviewsView'));
const StudentFeedbackView = lazy(() => import('./desktop/StudentFeedbackView'));
const StudentMyClassesView = lazy(() => import('./desktop/StudentMyClassesView'));

// Mobile dashboard — lazy-loaded only khi cần
const StudentDashboardMobile = lazy(() => import('./mobile/StudentDashboardMobile'));

const TAB_MAP: Record<string, React.LazyExoticComponent<any>> = {
  exams:         StudentExams,
  'my-classes':  StudentMyClassesView,
  attendance:    AttendancePage,
  reviews:       StudentReviewsView,
  feedback:      StudentFeedbackView,
  profile:       PersonalInfo,
};

function getTabFromPath(pathname) {
  if (pathname.includes('/schedule') || pathname.includes('/payment')) {
    return null;
  }

  if (pathname.includes('/profile')) {
    return 'profile';
  }

  if (pathname.includes('/my-classes')) {
    return 'my-classes';
  }

  if (pathname.includes('/reviews')) {
    return 'reviews';
  }

  if (pathname.includes('/feedback')) {
    return 'feedback';
  }

  if (pathname.includes('/attendance')) {
    return 'attendance';
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

  const mobile = useIsMobile();

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

  if (mobile) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--vt-ivory)]">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--vt-champagne-soft)] border-t-[var(--vt-emerald)] animate-spin" />
        </div>
      }>
        <StudentDashboardMobile />
      </Suspense>
    );
  }

  const tab = getTabFromPath(location.pathname);

  if (!tab) {
    return <Navigate to="/dashboard/exams" replace />;
  }

  if (fetchingProfile && !studentData) {
    return (
      <div className="min-h-[100dvh] bg-[var(--vt-ivory)] flex items-center justify-center">
        <div className="vt-certificate-card flex flex-col items-center gap-3 rounded-[2rem] px-8 py-7">
          <div className="w-10 h-10 rounded-full border-4 border-[var(--vt-champagne-soft)] border-t-[var(--vt-emerald)] animate-spin" />
          <p className="text-[var(--vt-muted)] text-sm font-semibold">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const ActiveModule = TAB_MAP[tab];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--vt-ivory)] flex flex-col md:flex-row font-sans text-[var(--vt-ink)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_8%,rgba(200,169,106,0.18),transparent_30%),radial-gradient(circle_at_18%_92%,rgba(29,111,95,0.10),transparent_34%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-55 bg-[linear-gradient(90deg,rgba(19,34,56,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(19,34,56,0.025)_1px,transparent_1px)] bg-[length:44px_44px]" />

      <DashboardSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        studentData={studentData}
      />

      <div className="relative z-[1] flex-1 flex flex-col min-w-0 md:ml-[280px] h-[100dvh] overflow-hidden">
        <header className="md:hidden shrink-0 h-14 pt-[env(safe-area-inset-top,0px)] bg-[rgba(255,250,241,0.9)] border-b border-[var(--vt-line)] px-4 flex items-center justify-between z-20 shadow-[0_14px_38px_rgba(19,34,56,0.08)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="w-11 h-11 -ml-1 rounded-xl text-[var(--vt-muted)] hover:bg-white/70 active:scale-95 transition-all outline-none flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[var(--vt-ink)] flex items-center justify-center text-[var(--vt-champagne)] font-black text-sm shadow-sm">
                V
              </div>
              <span className="font-black text-[15px] text-[var(--vt-ink)] tracking-[-0.03em]">
                VanTrang<span className="text-[var(--vt-emerald)]">Edu</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => { api.logoutRole('student'); window.location.href = '/login'; }}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--vt-muted)] hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto pb-[calc(66px+env(safe-area-inset-bottom,0px)+12px)] md:pb-8 w-full" data-tour="student-desktop-main">
          <Suspense fallback={<LoadingSpinner />}>
            <ActiveModule studentData={studentData} />
          </Suspense>
        </main>
      </div>

      <StudentBottomNav />
    </div>
  );
}
