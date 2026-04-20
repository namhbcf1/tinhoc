import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import AdminMobileLayout from '../../../components/layout/AdminMobileLayout';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { ADMIN_SESSION_UPDATED_EVENT, getStoredAdmin, getStoredAdminToken } from '../../../utils/adminSession';
import { getAdminTabsForTarget } from '../adminTabs';

const MobileDashboardOverview = lazy(() => import('./MobileDashboardOverview'));
const MobileClassesModule = lazy(() => import('./MobileClassesModule'));
const MobileStudentsModule = lazy(() => import('./MobileStudentsModule'));
const MobilePaymentsModule = lazy(() => import('./MobilePaymentsModule'));
const MobileDocumentsModule = lazy(() => import('./MobileDocumentsModule'));
const MobileAssignmentsModule = lazy(() => import('./MobileAssignmentsModule'));
const MobileExamSchedulesModule = lazy(() => import('./MobileExamSchedulesModule'));
const MobileAdminProfileModule = lazy(() => import('./MobileAdminProfileModule'));
const MobilePostsModule = lazy(() => import('./MobileSimpleModules').then((module) => ({ default: module.MobilePostsModule })));
const MobileHomepageModule = lazy(() => import('./MobileSimpleModules').then((module) => ({ default: module.MobileHomepageModule })));
const MobileLogsModule = lazy(() => import('./MobileSimpleModules').then((module) => ({ default: module.MobileLogsModule })));
const MobileBackupModule = lazy(() => import('./MobileSimpleModules').then((module) => ({ default: module.MobileBackupModule })));
const MobileAdminsModule = lazy(() => import('./MobileSimpleModules').then((module) => ({ default: module.MobileAdminsModule })));
const MobileMyClassesModule = lazy(() => import('./MobileMyClassesModule'));
const MobileMyScheduleModule = lazy(() => import('./MobileMyScheduleModule'));
const MobileMyExamsModule = lazy(() => import('./MobileMyExamsModule'));
const MobileAttendanceModule = lazy(() => import('./MobileAttendanceModule'));

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

    const allowedTabs = new Set(
        getAdminTabsForTarget(adminData.role, 'mobile', adminData).map((item) => item.id)
    );

    return allowedTabs.has(requestedTab) ? requestedTab : 'exam-schedules';
}

export default function AdminDashboardMobile() {
    const [activeTab, setActiveTab] = useState(() => resolveInitialAdminTab(getStoredAdmin()));
    const [admin, setAdmin] = useState(null);
    const [returnToUrl, setReturnToUrl] = useState(null);
    const navigate = useNavigate();
    const { toasts, removeToast } = useToast();

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
            const searchParams = new URLSearchParams(window.location.search);
            const hash = window.location.hash;
            const tabFromHash = hash ? hash.replace('#', '').split('?')[0] : '';
            const currentAdminData = getStoredAdmin();
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

    const handleLogout = () => {
        api.logoutRole('admin');
        navigate('/admin/login');
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        url.hash = tabId;
        window.history.replaceState({}, '', url.toString());
    };

    if (!admin) {
        return (
            <div className="p-4">
                <AdminLoadingState
                    title="Đang mở admin mobile"
                    hint="Bố cục mobile và trạng thái tab gần nhất đang được dựng lại."
                    variant="mobile-list"
                    accent="blue"
                />
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <MobileDashboardOverview onNavigate={handleTabChange} />;
            case 'classes':
                return <MobileClassesModule />;
            case 'students':
                return <MobileStudentsModule />;
            case 'payments':
                return <MobilePaymentsModule />;
            case 'documents':
                return <MobileDocumentsModule />;
            case 'assignments':
                return <MobileAssignmentsModule />;
            case 'posts':
                return <MobilePostsModule />;
            case 'homepage':
                return <MobileHomepageModule />;
            case 'admins':
                return admin?.role === 'super_admin'
                    ? <MobileAdminsModule />
                    : <DeniedState />;
            case 'backup':
                return admin?.role === 'super_admin'
                    ? <MobileBackupModule />
                    : <DeniedState />;
            case 'logs':
                return <MobileLogsModule />;
            case 'exam-schedules':
                return <MobileExamSchedulesModule />;
            case 'my-classes':
                return <MobileMyClassesModule />;
            case 'my-schedule':
                return <MobileMyScheduleModule />;
            case 'my-exams':
                return <MobileMyExamsModule />;
            case 'attendance':
                return <MobileAttendanceModule />;
            case 'profile':
                return (
                    <MobileAdminProfileModule
                        admin={admin}
                        onUpdate={(nextAdmin) => {
                            if (nextAdmin) {
                                setAdmin(nextAdmin);
                                return;
                            }
                            const adminData = getStoredAdmin();
                            if (adminData) setAdmin(adminData);
                        }}
                    />
                );
            default:
                return <MobileDashboardOverview onNavigate={handleTabChange} />;
        }
    };

    return (
        <AdminMobileLayout
            admin={admin}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onLogout={handleLogout}
        >
            {returnToUrl ? (
                <div className="mb-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <a
                        href={returnToUrl}
                        className="inline-flex items-center rounded-full border border-blue-300 bg-white px-4 py-2 font-medium text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                    >
                        Quay lại VanTrangExam
                    </a>
                </div>
            ) : null}
            <Suspense fallback={<LoadingSpinner text="Đang chuyển màn hình..." />}>
                {renderContent()}
            </Suspense>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </AdminMobileLayout>
    );
}

function DeniedState() {
    return (
        <div className="p-4 text-center">
            <h2 className="text-lg font-bold text-slate-800">Không có quyền truy cập</h2>
        </div>
    );
}
