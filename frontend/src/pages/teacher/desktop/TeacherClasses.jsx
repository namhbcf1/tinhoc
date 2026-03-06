import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import TeacherClassDetail from './TeacherClassDetail';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { BookOpen, Calendar, Users, Video, ChevronRight, Hash, Clock } from 'lucide-react';

export default function TeacherClasses({ teacher }) {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingClassId, setViewingClassId] = useState(null);
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, [classes, viewingClassId]);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      // Use cached request - classes don't change frequently
      const response = await api.cachedRequest('/teachers/my-classes', { tokenType: 'teacher' }, true);
      if (response.success) {
        setClasses(Array.isArray(response.data) ? response.data : []);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Listen for viewClassDetail event from schedule page and check localStorage
  useEffect(() => {
    const handleViewClassDetail = (event) => {
      const { classId } = event.detail;
      if (classId) {
        setViewingClassId(classId);
        localStorage.removeItem('teacher_view_class_id');
      }
    };

    // Check localStorage for classId (from schedule page)
    const storedClassId = localStorage.getItem('teacher_view_class_id');
    if (storedClassId) {
      setViewingClassId(storedClassId);
      localStorage.removeItem('teacher_view_class_id');
    }

    window.addEventListener('viewClassDetail', handleViewClassDetail);
    return () => window.removeEventListener('viewClassDetail', handleViewClassDetail);
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      'open': { text: 'Mở', bg: 'bg-emerald-100', textCol: 'text-emerald-700' },
      'active': { text: 'Đang hoạt động', bg: 'bg-emerald-100', textCol: 'text-emerald-700' },
      'closed': { text: 'Đóng', bg: 'bg-rose-100', textCol: 'text-rose-700' },
      'ongoing': { text: 'Đang học', bg: 'bg-blue-100', textCol: 'text-blue-700' },
      'completed': { text: 'Hoàn thành', bg: 'bg-purple-100', textCol: 'text-purple-700' },
    };
    const info = statusMap[status] || { text: status, bg: 'bg-slate-100', textCol: 'text-slate-700' };
    return <Badge className={`${info.bg} ${info.textCol} border-0 text-xs font-semibold`}>{info.text}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải danh sách lớp học..." />;
  }

  if (viewingClassId) {
    return (
      <TeacherClassDetail
        classId={viewingClassId}
        teacher={teacher}
        onBack={() => setViewingClassId(null)}
      />
    );
  }

  return (
    <div className="space-y-8" ref={containerRef}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 anim-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Lớp học của tôi</h1>
          <p className="text-slate-500 mt-1">Danh sách các lớp học bạn đang phụ trách</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card className="glass-panel py-20 flex flex-col items-center justify-center text-center anim-fade-up">
          <EmptyState
            icon={<BookOpen size={48} className="text-slate-300 mx-auto" />}
            title="Chưa có lớp học"
            message="Bạn chưa được gán cho lớp học nào."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card
              key={cls.class_id}
              className="glass-card flex flex-col h-full border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group anim-fade-up"
            >
              <div className="h-2 bg-gradient-to-r from-teal-500 to-emerald-500 w-full" />
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 bg-teal-50 rounded-lg">
                    <Hash size={12} className="text-teal-600" />
                    <span className="text-xs font-bold text-teal-700">{cls.ma_lop || `LOP-${cls.class_id}`}</span>
                  </div>
                  {getStatusBadge(cls.class_status || cls.status)}
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-4 line-clamp-2 leading-tight group-hover:text-teal-700 transition-colors">
                  {cls.ten_lop}
                </h3>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                      <Calendar size={14} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bắt đầu</p>
                      <p className="text-xs font-bold truncate">
                        {cls.ngay_bat_dau ? new Date(cls.ngay_bat_dau).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="p-1.5 bg-slate-100 rounded-lg">
                      <Clock size={14} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kết thúc</p>
                      <p className="text-xs font-bold truncate">
                        {cls.ngay_ket_thuc ? new Date(cls.ngay_ket_thuc).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="flex -space-x-2">
                    {/* Mock avatars for students */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs text-slate-400 ring-1 ring-slate-100">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-teal-50 flex items-center justify-center text-[10px] font-bold text-teal-600 ring-1 ring-slate-100">
                      +
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {cls.meet_link && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 h-10 w-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(cls.meet_link, '_blank');
                        }}
                      >
                        <Video size={18} />
                      </Button>
                    )}
                    <Button
                      onClick={() => setViewingClassId(cls.class_id)}
                      className="rounded-xl bg-slate-800 hover:bg-slate-900 group-hover:bg-teal-600 font-bold transition-all px-4 h-10"
                    >
                      👁️ Chi tiết
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
