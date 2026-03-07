import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import ClassStudentsList from './ClassStudentsList';
import { formatDateVN, formatTime } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  ArrowLeft, BookOpen, Users, Calendar, Clock, MapPin,
  Video, Info, Hash, GraduationCap, ClipboardList, ChevronRight
} from 'lucide-react';

export default function TeacherClassDetail({ classId, teacher, onBack }) {
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, [loading, classInfo, activeTab]);

  // Extract actual class ID from classId (handle both "10" and "online_10" formats)
  const getActualClassId = () => {
    let actualClassId = classId;
    if (typeof classId === 'string' && classId.startsWith('online_')) {
      actualClassId = classId.replace('online_', '');
    }
    return actualClassId;
  };

  useEffect(() => {
    loadClassDetail();
  }, [classId]);

  const loadClassDetail = async () => {
    setLoading(true);
    try {
      const actualClassId = getActualClassId();

      // Load class info (avoid /classes/:id to prevent 404 on some deployments)
      // Use teacher-scoped endpoint and pick the matching class
      const myClassesResp = await api.getTeacherClasses();
      if (myClassesResp.success && Array.isArray(myClassesResp.data)) {
        const found = myClassesResp.data.find((c) => {
          const cId = String(c.class_id);
          const targetId = String(actualClassId);
          return cId === targetId;
        });
        if (found) {
          // Normalize to shape used by UI
          setClassInfo({
            id: found.class_id,
            ma_lop: found.ma_lop,
            ten_lop: found.ten_lop,
            loai: found.loai,
            ngay_bat_dau: found.ngay_bat_dau,
            ngay_ket_thuc: found.ngay_ket_thuc,
            description: found.description,
            max_students: found.max_students,
            teacher_name: found.teacher_name,
            schedule_rule: found.schedule_rule,
            schedule_time: found.schedule_time,
            meet_link: found.meet_link,
          });
        } else {
          console.error('Class not found:', { classId, actualClassId, availableClasses: myClassesResp.data.map(c => c.class_id) });
          setClassInfo(null);
        }
      } else {
        setClassInfo(null);
      }

      // Load students
      // NOTE: Teacher classes are ONLINE classes (see backend getTeacherClasses) => use online_class_enrollments
      const enrollmentsResp = await api.getOnlineClassEnrollments(actualClassId);
      if (enrollmentsResp?.success) {
        const list = Array.isArray(enrollmentsResp.data)
          ? enrollmentsResp.data
          : (Array.isArray(enrollmentsResp.data?.data) ? enrollmentsResp.data.data : []);
        setStudents(list);
      } else {
        setStudents([]);
      }

      // Load schedules - use actualClassId (numeric ID)
      // Note: Online classes don't use class_schedules table, so this may return empty
      const schedulesResponse = await api.getClassSchedules(actualClassId);
      if (schedulesResponse.success) {
        setSchedules(schedulesResponse.data || []);
      }

      // Load exams - use actualClassId (numeric ID)
      const examsResponse = await api.getExamSchedulesByClass(actualClassId);
      if (examsResponse.success) {
        setExams(examsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading class detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Đang tải thông tin lớp..." />;
  }

  if (!classInfo) {
    return <EmptyState icon="❌" title="Không tìm thấy lớp học" message="Lớp học không tồn tại hoặc bạn không có quyền xem." />;
  }

  const getDayName = (dayOfWeek) => {
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return days[dayOfWeek];
  };

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 anim-fade-up">
        <Button
          variant="outline"
          onClick={onBack || (() => navigate('/teacher/dashboard#classes'))}
          className="h-12 w-12 rounded-2xl bg-white border-slate-200 text-slate-500 hover:text-teal-600 shadow-sm transition-all hover:shadow-md shrink-0"
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Badge className="bg-teal-100 text-teal-700 border-0 text-xs font-semibold px-2 py-0.5">
              {classInfo.loai === 'exam' ? 'Thi' : classInfo.loai === 'credit' ? 'Tín chỉ' : 'Học'}
            </Badge>
            <span className="text-sm font-bold text-slate-400">#{classInfo.ma_lop || `LOP-${classInfo.id}`}</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight leading-none">{classInfo.ten_lop}</h1>
        </div>
      </div>

      {/* Stats & Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 anim-fade-up">
        {/* Class Summary */}
        <Card className="lg:col-span-8 glass-card border-0 shadow-sm overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-gradient-to-br from-teal-600 to-emerald-600 p-8 text-white flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
              <div>
                <p className="text-teal-100 text-xs font-bold uppercase tracking-widest opacity-80">Giáo viên phụ trách</p>
                <p className="text-xl font-bold">{classInfo.teacher_name || teacher?.ho_ten || 'N/A'}</p>
              </div>
            </div>

            {classInfo.meet_link && (
              <Button
                className="mt-8 bg-white text-teal-700 hover:bg-teal-50 rounded-xl font-bold shadow-lg"
                onClick={() => window.open(classInfo.meet_link, '_blank')}
              >
                <Video size={18} className="mr-2" /> Vào lớp Mirror
              </Button>
            )}
          </div>

          <CardContent className="p-8 flex-1 grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngày bắt đầu</p>
              <p className="text-lg font-bold text-slate-800">{formatDateVN(classInfo.ngay_bat_dau) || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngày kết thúc</p>
              <p className="text-lg font-bold text-slate-800">{formatDateVN(classInfo.ngay_ket_thuc) || '—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sĩ số</p>
              <p className="text-lg font-bold text-slate-800">{students.length} / {classInfo.max_students || '∞'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cơ sở</p>
              <p className="text-lg font-bold text-slate-800">Cơ sở 1 (Online)</p>
            </div>

            {classInfo.description && (
              <div className="col-span-2 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ghi chú</p>
                <p className="text-sm font-medium text-slate-600 italic leading-relaxed">"{classInfo.description}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right stats */}
        <div className="lg:col-span-4 grid grid-cols-1 gap-6">
          <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-teal-50/50 to-white">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600 shadow-sm">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Học viên active</p>
              <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            </div>
          </Card>

          <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-emerald-50/50 to-white">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Số buổi học/tuần</p>
              <p className="text-2xl font-bold text-slate-800">
                {classInfo.schedule_rule === 'DAILY' ? 7 :
                  classInfo.schedule_rule?.includes(':') ? classInfo.schedule_rule.split(':')[1].split(',').length : 0}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6 anim-fade-up">
        <div className="flex p-1 bg-slate-100/50 rounded-2xl w-fit">
          {[
            { id: 'students', label: 'Học viên', icon: Users, count: students.length },
            {
              id: 'schedules', label: 'Lịch học', icon: Calendar, count: (() => {
                if (classInfo.schedule_rule && classInfo.schedule_time) {
                  if (classInfo.schedule_rule === 'DAILY') return 7;
                  if (classInfo.schedule_rule.includes(':')) return classInfo.schedule_rule.split(':')[1].split(',').length;
                }
                return schedules.length;
              })()
            },
            { id: 'exams', label: 'Lịch thi', icon: ClipboardList, count: exams.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-teal-600' : ''} />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${activeTab === tab.id ? 'bg-teal-50 text-teal-600' : 'bg-slate-200/50 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="anim-fade-up">
          {activeTab === 'students' && (
            <ClassStudentsList classId={getActualClassId()} />
          )}

          {activeTab === 'schedules' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classInfo.schedule_rule && classInfo.schedule_time ? (
                <>
                  {classInfo.schedule_rule === 'DAILY' ? (
                    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => (
                      <Card key={dayOfWeek} className="glass-card p-6 border-0 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {getDayName(dayOfWeek).slice(0, 3)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800">{getDayName(dayOfWeek)}</h4>
                            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Clock size={14} className="text-slate-400" />
                              {classInfo.schedule_time}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <MapPin size={12} /> Online
                          </span>
                          {classInfo.meet_link && (
                            <a href={classInfo.meet_link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-600 transition-colors">
                              <Video size={18} />
                            </a>
                          )}
                        </div>
                      </Card>
                    ))
                  ) : classInfo.schedule_rule.includes(':') ? (
                    classInfo.schedule_rule.split(':')[1].split(',').map((dayStr) => (
                      <Card key={dayStr} className="glass-card p-6 border-0 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                            {getDayName(parseInt(dayStr.trim())).slice(0, 3)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800">{getDayName(parseInt(dayStr.trim()))}</h4>
                            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Clock size={14} className="text-slate-400" />
                              {classInfo.schedule_time}
                            </p>
                          </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                            <MapPin size={12} /> Online
                          </span>
                          {classInfo.meet_link && (
                            <a href={classInfo.meet_link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-600 transition-colors">
                              <Video size={18} />
                            </a>
                          )}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full">
                      <EmptyState icon="📅" title="Lịch học chưa được thiết lập" message="Vui lòng liên hệ admin để cập nhật lịch học." />
                    </div>
                  )}
                </>
              ) : schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <Card key={schedule.id} className="glass-card p-6 border-0 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                        {getDayName(schedule.day_of_week).slice(0, 3)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{getDayName(schedule.day_of_week)}</h4>
                        <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock size={14} className="text-slate-400" />
                          {schedule.start_time} - {schedule.end_time}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-50">
                      <span className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <MapPin size={12} /> {schedule.room || 'Chưa có phòng'}
                      </span>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <EmptyState icon="📅" title="Chưa có lịch học" message="Lớp này chưa có lịch học nào." />
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon="📝" title="Chưa có lịch thi" message="Lớp này chưa có lịch thi nào." />
                </div>
              ) : (
                exams.map((exam) => (
                  <Card key={exam.id} className="glass-card border-0 shadow-sm overflow-hidden flex flex-col sm:flex-row p-0">
                    <div className="sm:w-32 bg-slate-800 text-white p-6 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                        {new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(new Date(exam.exam_date))}
                      </span>
                      <span className="text-3xl font-black">{new Date(exam.exam_date).getDate()}</span>
                    </div>
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 text-lg">{exam.exam_name}</h4>
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 h-6">Sắp tới</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-xs font-bold">{formatTime(exam.exam_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-xs font-bold">{exam.duration_minutes} phút</span>
                        </div>
                      </div>

                      {exam.location && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="text-xs font-bold">{exam.location}</span>
                        </div>
                      )}

                      {exam.notes && (
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                            <Info size={12} /> Ghi chú
                          </p>
                          <p className="text-xs font-medium text-slate-600 italic">"{exam.notes}"</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}






