import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import AdminLayout from '../../../components/layout/AdminLayout';
import UnifiedClassesManagement from './UnifiedClassesManagement';
import StudentsManagement from './StudentsManagement';
import PaymentsManagement from './PaymentsManagement';
import PostsManagement from './PostsManagement';
import HomepageManagement from './HomepageManagement';
import ReportsPage from './ReportsPage';
import AdminManagement from './AdminManagement';
import AdminProfile from './AdminProfile';
import ActivityLogs from './ActivityLogs';
import ExamSchedulesPage from './ExamSchedulesPage';
import BackupPage from './BackupPage';
import TeachersManagement from './TeachersManagement';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import GlobalSearch from '../../../components/admin/GlobalSearch';

export default function AdminDashboardDesktop() {
  const [activeTab, setActiveTab] = useState('students');
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();
  const { toasts, removeToast, success, error, warning, info } = useToast();

  useEffect(() => {
    const adminData = localStorage.getItem('admin');
    const adminToken = localStorage.getItem('admin_token');

    if (!adminData || !adminToken) {
      navigate('/admin/login');
      return;
    }
    setAdmin(JSON.parse(adminData));

    const updateActiveTab = () => {
      const hash = window.location.hash;
      if (hash) {
        const tab = hash.replace('#', '');
        const baseTab = tab.split('?')[0];
        if (baseTab === 'online-classes') {
          window.location.hash = 'classes?mode=online';
          return;
        }
        const validTabs = [
          'classes', 'students', 'registrations', 'payments',
          'posts', 'homepage', 'settings', 'permissions',
          'logs', 'reports', 'teachers', 'admins', 'profile',
          'exam-schedules', 'backup',
        ];
        if (validTabs.includes(baseTab)) {
          setActiveTab(baseTab);
        }
      } else {
        setActiveTab('students');
      }
    };

    updateActiveTab();
    window.addEventListener('hashchange', updateActiveTab);
    return () => window.removeEventListener('hashchange', updateActiveTab);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    api.logoutRole('admin');
    navigate('/admin/login');
  }, [navigate]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  }, []);

  // Memoize toast props to prevent unnecessary re-renders of child components
  const toastProps = useMemo(() => ({ success, error, warning, info }), [success, error, warning, info]);

  // Memoize the rendered content to optimize expensive table/list re-renders
  const renderedContent = useMemo(() => {
    if (!admin) return null;

    switch (activeTab) {
      case 'classes':
        return <UnifiedClassesManagement toast={toastProps} />;
      case 'students':
        return <StudentsManagement toast={toastProps} />;
      case 'payments':
        return <PaymentsManagement toast={toastProps} />;
      case 'posts':
        return <PostsManagement toast={toastProps} />;
      case 'homepage':
        return <HomepageManagement toast={toastProps} />;
      case 'reports':
        return <ReportsPage />;
      case 'teachers':
        return <TeachersManagement />;
      case 'admins':
        return admin?.role === 'super_admin' ? <AdminManagement /> : <div role="alert" className="p-8 text-center"><h2 className="text-2xl font-bold text-slate-800">Không có quyền truy cập</h2></div>;
      case 'profile':
        return <AdminProfile admin={admin} onUpdate={() => { const adminData = localStorage.getItem('admin'); if (adminData) setAdmin(JSON.parse(adminData)); }} />;
      case 'logs':
        return <ActivityLogs />;
      case 'exam-schedules':
        return <ExamSchedulesPage />;
      case 'backup':
        return admin?.role === 'super_admin' ? <BackupPage /> : <div role="alert" className="p-8 text-center"><h2 className="text-2xl font-bold text-slate-800">Không có quyền truy cập</h2></div>;
      default:
        return <div className="p-8 text-center text-slate-500">Chức năng đang được cập nhật...</div>;
    }
  }, [activeTab, admin, toastProps, handleTabChange]);

  // Show loading spinner while admin data is being fetched (fix #14 — no null return)
  if (!admin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
      <div
        className="animate-[fadeIn_0.3s_ease-out] w-full min-w-0"
        style={{ animationFillMode: 'both' }}
        key={activeTab} // Forces re-animation on tab change
      >
        {renderedContent}
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

