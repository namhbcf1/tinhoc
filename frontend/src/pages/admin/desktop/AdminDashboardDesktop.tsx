import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import AdminLayout from '../../../components/layout/AdminLayout';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import GlobalSearch from '../../../components/admin/GlobalSearch';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdmin, getStoredAdminToken } from '../../../utils/adminSession';
import { getAdminTabsForTarget } from '../adminTabs';

const DashboardOverview = lazy(() => import('./DashboardOverview'));
const UnifiedClassesManagement = lazy(() => import('./UnifiedClassesManagement'));
const StudentsManagement = lazy(() => import('./StudentsManagement'));
const PaymentsManagement = lazy(() => import('./PaymentsManagement'));
const DocumentsManagement = lazy(() => import('./DocumentsManagement'));
const AssignmentsManagement = lazy(() => import('./AssignmentsManagement'));
const PostsManagement = lazy(() => import('./PostsManagement'));
const HomepageManagement = lazy(() => import('./HomepageManagement'));
const AdminManagement = lazy(() => import('./AdminManagement'));
const AdminProfile = lazy(() => import('./AdminProfile'));
const ActivityLogs = lazy(() => import('./ActivityLogs'));
const ExamSchedulesPage = lazy(() => import('./ExamSchedulesPage'));
const BackupPage = lazy(() => import('./BackupPage'));
const ProgramPlatformPage = lazy(() => import('./ProgramPlatformPage'));
const MyClassesPage = lazy(() => import('./MyClassesPage'));
const MySchedulePage = lazy(() => import('./MySchedulePage'));
const MyExamsPage = lazy(() => import('./MyExamsPage'));
const AdminAttendancePage = lazy(() => import('./AdminAttendancePage'));

function resolveInitialAdminTab(adminData) {
  if (typeof window === 'undefined') {
    return 'exam-schedules';
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const tabFromHash = hash ? hash.replace('#', '').split('?')[0] : '';
  const tabFromSearch = searchParams.get('tab') || '';
  const baseTab = tabFromHash || tabFromSearch;

  if (!baseTab) {
    return 'exam-schedules';
  }

  const requestedTab = baseTab === 'online-classes' ? 'classes' : baseTab;
  if (!adminData) {
    return 'exam-schedules';
  }

  const validTabs = new Set(
    getAdminTabsForTarget(adminData.role, 'desktop', adminData).map((item) => item.id)
  );

  return validTabs.has(requestedTab) ? requestedTab : 'exam-schedules';
}

export default function AdminDashboardDesktop() {
  const [activeTab, setActiveTab] = useState(() => resolveInitialAdminTab(getStoredAdmin()));
  const [admin, setAdmin] = useState(null);
  const [returnToUrl, setReturnToUrl] = useState(null);
  const navigate = useNavigate();
  const { toasts, removeToast, success, error, warning, info } = useToast();

  useEffect(() => {
    const hydrateAdmin = () => {
      const adminData = getStoredAdmin();
      const adminToken = getStoredAdminToken();

      if (!adminData || !adminToken) {
        setAdmin(null);
        navigate('/admin/login');
        return false;
      }

      setAdmin(adminData);
      return true;
    };

    if (!hydrateAdmin()) {
      return;
    }

    const updateActiveTab = () => {
      const currentAdminData = getStoredAdmin();
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const tabFromHash = hash ? hash.replace('#', '').split('?')[0] : '';
      setReturnToUrl(searchParams.get('return_to'));

      if (tabFromHash === 'online-classes') {
        window.location.hash = 'classes?mode=online';
        setActiveTab('classes');
        return;
      }

      setActiveTab(resolveInitialAdminTab(currentAdminData));
    };

    const handleSessionUpdated = () => {
      hydrateAdmin();
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === 'admin' || event.key === 'admin_token') {
        hydrateAdmin();
      }
    };

    updateActiveTab();
    window.addEventListener(ADMIN_SESSION_UPDATED_EVENT, handleSessionUpdated);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('hashchange', updateActiveTab);
    return () => {
      window.removeEventListener(ADMIN_SESSION_UPDATED_EVENT, handleSessionUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('hashchange', updateActiveTab);
    };
  }, [navigate]);

  const handleLogout = useCallback(() => {
    api.logoutRole('admin');
    navigate('/admin/login');
  }, [navigate]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    url.hash = tabId;
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Memoize toast props to prevent unnecessary re-renders of child components
  const toastProps = useMemo(() => ({ success, error, warning, info }), [success, error, warning, info]);

  // Memoize the rendered content to optimize expensive table/list re-renders
  const renderedContent = useMemo(() => {
    if (!admin) return null;

    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview toast={toastProps} onNavigate={handleTabChange} />;
      case 'classes':
        return <UnifiedClassesManagement toast={toastProps} />;
      case 'students':
        return <StudentsManagement toast={toastProps} />;
      case 'payments':
        return <PaymentsManagement toast={toastProps} />;
      case 'documents':
        return <DocumentsManagement />;
      case 'assignments':
        return <AssignmentsManagement />;
      case 'posts':
        return <PostsManagement toast={toastProps} />;
      case 'homepage':
        return <HomepageManagement toast={toastProps} />;
      case 'admins':
        return admin?.role === 'super_admin' ? <AdminManagement /> : <div role="alert" className="p-8 text-center"><h2 className="text-2xl font-bold text-slate-800">Không có quyền truy cập</h2></div>;
      case 'profile':
        return <AdminProfile admin={admin} onUpdate={(nextAdmin) => { if (nextAdmin) setAdmin(nextAdmin); }} />;
      case 'logs':
        return <ActivityLogs />;
      case 'exam-schedules':
        return <ExamSchedulesPage />;
      case 'program-platform':
        return <ProgramPlatformPage />;
      case 'my-classes':
        return <MyClassesPage toast={toastProps} />;
      case 'my-schedule':
        return <MySchedulePage toast={toastProps} />;
      case 'my-exams':
        return <MyExamsPage toast={toastProps} />;
      case 'attendance':
        return <AdminAttendancePage toast={toastProps} />;
      case 'backup':
        return admin?.role === 'super_admin' ? <BackupPage /> : <div role="alert" className="p-8 text-center"><h2 className="text-2xl font-bold text-slate-800">Không có quyền truy cập</h2></div>;
      default:
        return <div className="p-8 text-center text-slate-500">Chức năng đang được cập nhật...</div>;
    }
  }, [activeTab, admin, toastProps, handleTabChange]);

  // Show loading spinner while admin data is being fetched (fix #14 — no null return)
  if (!admin) {
    return (
      <div className="p-6">
        <AdminLoadingState
          title="Đang khôi phục phiên quản trị"
          hint="Phiên đăng nhập và module gần nhất đang được dựng lại để chuyển tab mượt hơn."
          variant="dashboard"
          accent="blue"
        />
      </div>
    );
  }

  return (
    <AdminLayout
      admin={admin}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onLogout={handleLogout}
    >
      {returnToUrl ? (
        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Phiên quản trị này được mở từ workspace khác. Bạn có thể quay lại luồng trước đó bất cứ lúc nào.</span>
            <a
              href={returnToUrl}
              className="inline-flex items-center rounded-full border border-blue-300 bg-white px-4 py-2 font-medium text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
            >
              Quay lại VanTrangExam
            </a>
          </div>
        </div>
      ) : null}
      <div
        className="animate-[fadeIn_0.3s_ease-out] w-full min-w-0"
        style={{ animationFillMode: 'both' }}
        key={activeTab} // Forces re-animation on tab change
      >
        <Suspense fallback={<LoadingSpinner text="Đang chuyển module..." />}>
          {renderedContent}
        </Suspense>
      </div>
      {/* Global search palette — Ctrl+K shortcut, mounted at root level */}
      <GlobalSearch onNavigate={handleTabChange} />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AdminLayout>
  );
}
