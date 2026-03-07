import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import TeacherOverview from './TeacherOverview';
import TeacherSchedule from './TeacherSchedule';
import TeacherExams from './TeacherExams';
import TeacherClasses from './TeacherClasses';
import TeacherProfile from './TeacherProfile';
import AttendancePage from './AttendancePage';
import TeacherMessaging from './TeacherMessaging';
import TeacherDocuments from './TeacherDocuments';
import { useToast, default as ToastContainer } from '../../../components/ui/ToastContainer';
import { LayoutDashboard, Calendar, BookOpen, FileText, ClipboardCheck, MessageCircle, User, LogOut, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';

export default function TeacherDashboardDesktop() {
  const navigate = useNavigate();
  const { success, error, toasts, removeToast } = useToast();
  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  if (!teacher) {
    return <div className="loading">Đang tải...</div>;
  }

  const menuItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'schedule', label: 'Lịch dạy', icon: Calendar },
    { id: 'classes', label: 'Lớp học', icon: BookOpen },
    { id: 'documents', label: 'Tài liệu', icon: FileText },
    { id: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
    { id: 'messages', label: 'Nhắn tin', icon: MessageCircle },
    { id: 'profile', label: 'Cá nhân', icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <TeacherOverview teacher={teacher} onNavigate={(tab) => { setActiveTab(tab); window.location.hash = tab; }} />;
      case 'schedule':
        return <TeacherSchedule teacher={teacher} />;
      case 'classes':
        return <TeacherClasses teacher={teacher} />;
      case 'documents':
        return <TeacherDocuments teacher={teacher} />;
      case 'attendance':
        return <AttendancePage teacher={teacher} />;
      case 'messages':
        return <TeacherMessaging teacher={teacher} />;
      case 'profile':
        return <TeacherProfile teacher={teacher} onUpdate={loadTeacherProfile} />;
      default:
        return <TeacherOverview teacher={teacher} onNavigate={(tab) => { setActiveTab(tab); window.location.hash = tab; }} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar - Glassmorphism */}
      <aside
        className={`bg-white/80 backdrop-blur-xl border-r border-slate-200/50 shadow-sm transition-all duration-300 flex flex-col relative z-20 ${sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-8 bg-white border border-slate-200 text-slate-500 rounded-full p-1 shadow-sm hover:text-teal-600 hover:border-teal-200 transition-colors z-30"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-slate-100 flex items-center transition-all ${sidebarCollapsed ? 'justify-center px-4' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 flex-shrink-0">
            <GraduationCap size={24} />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-tight">Giảng Viên</h1>
              <p className="text-xs text-slate-500 truncate">{teacher.ho_ten_full}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  window.location.hash = item.id;
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-teal-600 font-medium'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon size={20} className={isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500'} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium ${sidebarCollapsed ? 'justify-center' : ''
              }`}
            title={sidebarCollapsed ? 'Đăng xuất' : ''}
          >
            <LogOut size={20} className="text-red-500" />
            {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50">
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full">
          {renderContent()}
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

