import { lazy, Suspense } from 'react';
import { useDeviceType } from '../../utils/deviceDetection';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminDashboardDesktop = lazy(() => import('./desktop/AdminDashboardDesktop'));
const AdminDashboardMobile = lazy(() => import('./mobile/AdminDashboardMobile'));

export default function AdminDashboard() {
  const { isMobile } = useDeviceType();

  return (
    <Suspense fallback={<LoadingSpinner text="Đang mở trang điều hành..." size="large" />}>
      {isMobile ? <AdminDashboardMobile /> : <AdminDashboardDesktop />}
    </Suspense>
  );
}
