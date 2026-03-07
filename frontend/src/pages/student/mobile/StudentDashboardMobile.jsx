import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import StudentMobileLayout from '../../../components/layout/StudentMobileLayout';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';

// Mobile Student Modules
import MobileExamsModule from './MobileExamsModule';
import MobileClassesModule from './MobileClassesModule';
import MobileScheduleModule from './MobileScheduleModule';
import MobilePaymentModule from './MobilePaymentModule';
import MobileProfileModule from './MobileProfileModule';
import StudentDashboardOverview from './StudentDashboardOverview';

/* ⛔ CẤM: Tài liệu, Chứng chỉ, Tin nhắn, Điểm danh — KHÔNG dùng trong student dashboard */

// Đọc student_data an toàn từ storage
function readStudentData() {
    try {
        const raw = localStorage.getItem('student_data') || sessionStorage.getItem('student_data');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) {
            localStorage.removeItem('student_data');
            return null;
        }
        return parsed;
    } catch {
        localStorage.removeItem('student_data');
        return null;
    }
}

export default function StudentDashboardMobile() {
    const navigate = useNavigate();
    const { toasts, removeToast } = useToast();
    const [studentData, setStudentData] = useState(readStudentData);
    const [activeTab, setActiveTab] = useState('exams');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cccd = localStorage.getItem('student_cccd') || sessionStorage.getItem('student_cccd');

        if (!studentData && !cccd) {
            navigate('/login', { replace: true });
            return;
        }

        // Refresh profile từ API nếu có cccd
        if (cccd) {
            api.getStudentByCCCD(cccd)
                .then((res) => {
                    if (res?.success && res?.data) {
                        const merged = { ...res.data, cccd };
                        localStorage.setItem('student_data', JSON.stringify(merged));
                        setStudentData(merged);
                    } else if (!studentData) {
                        navigate('/login', { replace: true });
                    }
                })
                .catch(() => {
                    if (!studentData) navigate('/login', { replace: true });
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }

        // Hash navigation
        const updateTab = () => {
            const hash = window.location.hash.replace('#', '');
            const validTabs = ['dashboard', 'exams', 'my-classes', 'schedule', 'payment', 'profile'];
            if (hash && validTabs.includes(hash)) {
                setActiveTab(hash);
            }
        };

        updateTab();
        window.addEventListener('hashchange', updateTab);
        return () => window.removeEventListener('hashchange', updateTab);
    }, []);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
    };

    const handleLogout = () => {
        api.logoutRole('student');
        navigate('/login', { replace: true });
    };

    const handleProfileUpdate = () => {
        const fresh = readStudentData();
        if (fresh) setStudentData(fresh);
    };

    if (loading && !studentData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-medium">Đang tải...</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        const props = { studentData };
        switch (activeTab) {
            case 'dashboard':   return <StudentDashboardOverview studentData={studentData} onNavigate={handleTabChange} />;
            case 'exams':       return <MobileExamsModule {...props} />;
            case 'my-classes':  return <MobileClassesModule {...props} />;
            case 'schedule':    return <MobileScheduleModule {...props} />;
            case 'payment':     return <MobilePaymentModule {...props} />;
            case 'profile':     return <MobileProfileModule studentData={studentData} onUpdate={handleProfileUpdate} />;
            default:            return <MobileExamsModule {...props} />;
        }
    };

    return (
        <StudentMobileLayout
            studentData={studentData}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onLogout={handleLogout}
        >
            {renderContent()}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </StudentMobileLayout>
    );
}
