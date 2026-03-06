import React from 'react';
import { useDeviceType } from '../../utils/deviceDetection';
import AdminDashboardDesktop from './desktop/AdminDashboardDesktop';
import AdminDashboardMobile from './mobile/AdminDashboardMobile';

export default function AdminDashboard() {
  const { isMobile } = useDeviceType();

  if (isMobile) {
    return <AdminDashboardMobile />;
  }

  return <AdminDashboardDesktop />;
}
