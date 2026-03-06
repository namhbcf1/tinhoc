import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import AdminMobileLayout from '../../../components/layout/AdminMobileLayout';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';

// Import Mobile Modules
import MobileDashboardOverview from './MobileDashboardOverview';
import MobileClassesModule from './MobileClassesModule';
import MobileStudentsModule from './MobileStudentsModule';
import MobilePaymentsModule from './MobilePaymentsModule';
import MobileTeachersModule from './MobileTeachersModule';
import MobileDocumentsModule from './MobileDocumentsModule';
import MobileAssignmentsModule from './MobileAssignmentsModule';
import MobileExamSchedulesModule from './MobileExamSchedulesModule';
import AdminProfile from '../desktop/AdminProfile';
import {
    MobilePostsModule,
    MobileHomepageModule,
    MobileCertificatesModule,
    MobileReportsModule,
    MobileLogsModule,
    MobileBackupModule,
    MobileAdminsModule
} from './MobileSimpleModules';

export default function AdminDashboardMobile() {
    const [activeTab, setActiveTab] = useState('dashboard');
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

        // Mobile hash handling
        const updateActiveTab = () => {
            const hash = window.location.hash;
            if (hash) {
                const tab = hash.replace('#', '').split('?')[0];
                if (tab === 'online-classes') window.location.hash = 'classes?mode=online';
                else setActiveTab(tab);
            } else {
                setActiveTab('dashboard');
            }
        };

        updateActiveTab();
        window.addEventListener('hashchange', updateActiveTab);
        return () => window.removeEventListener('hashchange', updateActiveTab);
    }, [navigate]);

    const handleLogout = () => {
        api.logoutRole('admin');
        navigate('/admin/login');
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
    };

    if (!admin) return null;

    const renderContent = () => {
        try {
            switch (activeTab) {
                case 'dashboard': return <MobileDashboardOverview onNavigate={(tab) => handleTabChange(tab)} />;
                case 'classes': return <MobileClassesModule />;
                case 'students': return <MobileStudentsModule />;
                case 'payments': return <MobilePaymentsModule />;
                case 'teachers': return <MobileTeachersModule />;
                case 'documents': return <MobileDocumentsModule />;
                case 'assignments': return <MobileAssignmentsModule />;
                case 'reports': return <MobileReportsModule />;
                case 'posts': return <MobilePostsModule />;
                case 'homepage': return <MobileHomepageModule />;
                case 'certificates': return <MobileCertificatesModule />;
                case 'admins': return admin?.role === 'super_admin' ? <MobileAdminsModule /> : <div className="p-4 text-center"><h2 className="text-lg font-bold text-slate-800">Không có quyền truy cập</h2></div>;
                case 'backup': return admin?.role === 'super_admin' ? <MobileBackupModule /> : <div className="p-4 text-center"><h2 className="text-lg font-bold text-slate-800">Không có quyền truy cập</h2></div>;
                case 'logs': return <MobileLogsModule />;
                case 'exam-schedules': return <MobileExamSchedulesModule />;
                case 'profile': return <AdminProfile admin={admin} onUpdate={() => { const adminData = localStorage.getItem('admin'); if (adminData) setAdmin(JSON.parse(adminData)); }} />;
                default: return <div className="p-4">Module {activeTab} coming soon</div>;
            }
        } catch (error) {
            console.error('Error rendering content:', error);
            return (
                <div className="p-4 text-center text-red-600">
                    <p>Lỗi tải module: {activeTab}</p>
                    <p className="text-sm text-slate-500 mt-2">{error.message}</p>
                </div>
            );
        }
    };

    try {
        return (
            <AdminMobileLayout
                admin={admin}
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                onLogout={handleLogout}
            >
                {renderContent()}
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </AdminMobileLayout>
        );
    } catch (error) {
        console.error('Fatal error in AdminDashboardMobile:', error);
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Lỗi tải trang</h2>
                    <p className="text-slate-600 mb-4">{error.message}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        Tải lại trang
                    </button>
                </div>
            </div>
        );
    }
}

