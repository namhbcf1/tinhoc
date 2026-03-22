import { lazy, Suspense, useEffect } from 'react';
import { useDeviceType } from '../../utils/deviceDetection';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminDashboardDesktop = lazy(() => import('./desktop/AdminDashboardDesktop'));
const AdminDashboardMobile = lazy(() => import('./mobile/AdminDashboardMobile'));

export default function AdminDashboard() {
  const { isMobile } = useDeviceType();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const previousZoom = root.style.zoom;

    root.style.zoom = isMobile ? '70%' : '';

    return () => {
      root.style.zoom = previousZoom;
    };
  }, [isMobile]);

  return (
    <Suspense fallback={<LoadingSpinner text="Đang mở trang điều hành..." size="large" />}>
      {isMobile ? <AdminDashboardMobile /> : <AdminDashboardDesktop />}
    </Suspense>
  );
}
