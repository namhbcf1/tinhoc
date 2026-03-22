import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import StudentMobileLayout from '../../../components/layout/StudentMobileLayout';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { STUDENT_MAIN_MENU } from '../../../features/student/student-nav';
import { getStorageValue, removeStorageValue } from '../../../utils/browser-storage.js';
import { loadStudentData, STUDENT_SESSION_UPDATED_EVENT } from '../../../utils/studentDataLoader';

const MobileExamsModule = lazy(() => import('./MobileExamsModule'));
const MobileProfileModule = lazy(() => import('./MobileProfileModule'));

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

export default function StudentDashboardMobile() {
    const navigate = useNavigate();
    const { toasts, removeToast } = useToast();
    const [studentData, setStudentData] = useState(readStudentData);
    const [activeTab, setActiveTab] = useState('exams');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cccd = getStorageValue('student_cccd');

        if (!studentData && !cccd) {
            navigate('/login', { replace: true });
            return;
        }

        if (cccd) {
            loadStudentData(cccd)
                .then((merged) => {
                    if (merged) {
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

        const updateTab = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash === 'dashboard') {
                window.location.hash = 'exams';
                return;
            }

            if (hash === 'schedule' || hash === 'payment' || hash === 'my-classes' || hash === 'register-class') {
                window.location.hash = 'exams';
                return;
            }

            const validTabs = [...STUDENT_MAIN_MENU.filter((item) => !item.external).map((item) => item.id), 'profile'];
            if (hash && validTabs.includes(hash)) {
                setActiveTab(hash);
                return;
            }

            setActiveTab('exams');
        };

        updateTab();
        window.addEventListener('hashchange', updateTab);
        return () => window.removeEventListener('hashchange', updateTab);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
    };

    const handleLogout = () => {
        api.logoutRole('student');
        navigate('/login', { replace: true });
    };

    const handleProfileUpdate = (nextStudentData = null) => {
        if (nextStudentData && typeof nextStudentData === 'object') {
            setStudentData(nextStudentData);
            return;
        }
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

    const props = { studentData };

    const renderContent = () => {
        switch (activeTab) {
            case 'exams':
                return <MobileExamsModule {...props} />;
            case 'profile':
                return <MobileProfileModule studentData={studentData} onUpdate={handleProfileUpdate} />;
            default:
                return <MobileExamsModule {...props} />;
        }
    };

    return (
        <StudentMobileLayout
            studentData={studentData}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onLogout={handleLogout}
        >
            <Suspense fallback={<LoadingSpinner />}>
                {renderContent()}
            </Suspense>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </StudentMobileLayout>
    );
}
