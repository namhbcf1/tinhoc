import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import TeacherMobileLayout from '../../../components/layout/TeacherMobileLayout';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';

// Mobile Teacher Modules
import MobileTeacherSchedule from './MobileTeacherSchedule';
import MobileTeacherClasses from './MobileTeacherClasses';
import MobileTeacherDocuments from './MobileTeacherDocuments';
import MobileTeacherAttendance from './MobileTeacherAttendance';
import MobileTeacherMessaging from './MobileTeacherMessaging';
import MobileTeacherProfile from './MobileTeacherProfile';
import TeacherOverview from '../desktop/TeacherOverview';

export default function TeacherDashboardMobile() {
  const navigate = useNavigate();
  const { success, error, toasts, removeToast } = useToast();
  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const teacherData = localStorage.getItem('teacher');
    const teacherToken = localStorage.getItem('teacher_token');

    if (!teacherData || !teacherToken) {
      navigate('/login?tab=teacher');
      return;
    }

    try {
      const parsedData = JSON.parse(teacherData);
      setTeacher(parsedData);
      api.setToken(teacherToken, 'teacher');

      loadTeacherProfile().catch((err) => {
        if (err.status === 401 || err.status === 403) {
          api.logoutRole('teacher');
          navigate('/login?tab=teacher');
        }
      });
    } catch (err) {
      console.error('Error parsing teacher data:', err);
      navigate('/login?tab=teacher');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['overview', 'schedule', 'classes', 'documents', 'attendance', 'messages', 'profile'].includes(hash)) {
      setActiveTab(hash);
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['overview', 'schedule', 'classes', 'documents', 'attendance', 'messages', 'profile'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadTeacherProfile = async () => {
    try {
      const response = await api.getTeacherProfile();
      if (response.success && response.data) {
        setTeacher(response.data);
        localStorage.setItem('teacher', JSON.stringify(response.data));
      }
    } catch (err) {
      console.error('Error loading teacher profile:', err);
    }
  };

  const handleLogout = () => {
    api.logoutRole('teacher');
    navigate('/login?tab=teacher');
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-700 mb-2">Không tìm thấy thông tin</h2>
          <p className="text-slate-500 mb-4 text-sm">Vui lòng đăng nhập lại</p>
          <button
            onClick={() => navigate('/login?tab=teacher')}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'overview':
          return <TeacherOverview teacher={teacher} onNavigate={(tab) => handleTabChange(tab)} />;
        case 'schedule':
          return <MobileTeacherSchedule teacher={teacher} />;
        case 'classes':
          return <MobileTeacherClasses teacher={teacher} />;
        case 'documents':
          return <MobileTeacherDocuments teacher={teacher} />;
        case 'attendance':
          return <MobileTeacherAttendance teacher={teacher} />;
        case 'messages':
          return <MobileTeacherMessaging teacher={teacher} />;
        case 'profile':
          return <MobileTeacherProfile teacher={teacher} onUpdate={loadTeacherProfile} />;
        default:
          return <TeacherOverview teacher={teacher} onNavigate={(tab) => handleTabChange(tab)} />;
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


  // Pull-to-refresh callback
  const handleRefresh = async () => {
    await loadTeacherProfile();
  };

  return (
    <TeacherMobileLayout
      teacher={teacher}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      onLogout={handleLogout}
    >
      {renderContent()}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </TeacherMobileLayout>
  );
}

