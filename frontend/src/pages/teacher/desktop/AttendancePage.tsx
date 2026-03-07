import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import EmptyState from '../../../components/ui/EmptyState';
import { formatDateVN } from '../../../utils/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { ClipboardCheck, Users, CheckCircle, XCircle, ChevronDown, Filter, Calendar, Save } from 'lucide-react';

export default function AttendancePage({ teacher }) {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);

  // State for marking attendance today
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [presentMap, setPresentMap] = useState({}); // { student_id: bool }
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' | 'history'

  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, [classes, selectedClass, attendance, activeTab]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadAttendance();
      loadStudents();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const response = await api.getTeacherClasses();
      if (response?.success && Array.isArray(response.data)) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      // Use class_id consistently (string comparison safe)
      const classId = selectedClass.class_id || selectedClass.id;
      const response = await api.getAttendanceByClass(classId);
      if (response?.success && Array.isArray(response.data)) {
        setAttendance(response.data);
      } else {
        setAttendance([]);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedClass) return;
    setLoadingStudents(true);
    try {
      let classId = selectedClass.class_id || selectedClass.id;
      // Strip "online_" prefix if present
      if (typeof classId === 'string' && classId.startsWith('online_')) {
        classId = classId.replace('online_', '');
      }
      const response = await api.getOnlineClassEnrollments(classId);
      if (response?.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        setStudents(list);
        // Default all UNCHECKED (absent) — teacher must explicitly mark present
        const defaultMap = {};
        list.forEach(s => {
          defaultMap[s.student_id || s.id] = false;
        });
        setPresentMap(defaultMap);
      } else {
        setStudents([]);
        setPresentMap({});
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
      setPresentMap({});
    } finally {
      setLoadingStudents(false);
    }
  };

  const togglePresent = (studentId) => {
    setPresentMap(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass || saving) return;
    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const classId = selectedClass.class_id || selectedClass.id;

      const records = students.map(s => {
        const sid = s.student_id || s.id;
        return {
          student_id: sid,
          class_id: classId,
          date: dateStr,
          status: presentMap[sid] ? 'present' : 'absent',
        };
      });

      await api.markAttendanceBatch(records, 'teacher');
      // Reload history after saving
      await loadAttendance();
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  // --- Stats for "last session" (most recent date in attendance records) ---
  const lastDateStats = (() => {
    if (attendance.length === 0) return { date: null, present: 0, absent: 0 };
    // Find the most recent attendance date
    const sorted = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastDate = sorted[0].date;
    const lastRecords = attendance.filter(a => a.date === lastDate);
    return {
      date: lastDate,
      present: lastRecords.filter(a => a.status === 'present').length,
      absent: lastRecords.filter(a => a.status !== 'present').length,
    };
  })();

  if (loading && !selectedClass) {
    return <LoadingSpinner text="Đang tải..." />;
  }

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Header + Class selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 anim-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Điểm danh</h1>
          <p className="text-slate-500 mt-1">Quản lý chuyên cần của học viên</p>
        </div>

        {classes.length > 0 && (
          <div className="relative w-full md:w-72">
            <select
              value={selectedClass?.class_id || ''}
              onChange={(e) => {
                const val = e.target.value;
                // Compare as strings to avoid number/string mismatch
                const cls = classes.find(c => String(c.class_id) === String(val));
                setSelectedClass(cls || null);
              }}
              className="w-full h-12 pl-4 pr-10 bg-white border border-slate-200 rounded-2xl shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-700 transition-all cursor-pointer"
            >
              <option value="">Chọn lớp học</option>
              {classes.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.ten_lop || cls.class_name}
                </option>
              ))}
            </select>
            <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* No class selected */}
      {!selectedClass ? (
        <Card className="glass-panel py-20 flex flex-col items-center justify-center text-center anim-fade-up">
          <EmptyState
            icon={<ClipboardCheck size={64} className="text-slate-300 mx-auto" />}
            title="Chọn lớp học"
            message="Vui lòng chọn lớp học từ danh sách phía trên để xem và quản lý điểm danh"
          />
        </Card>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex bg-white/50 backdrop-blur border border-slate-200/50 p-1 rounded-2xl shadow-sm w-fit anim-fade-up">
            {[
              { id: 'mark', label: 'Điểm danh hôm nay' },
              { id: 'history', label: 'Lịch sử điểm danh' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* === MARK ATTENDANCE TAB === */}
          {activeTab === 'mark' && (
            <div className="space-y-4 anim-fade-up">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  <span className="font-bold text-slate-700">{selectedClass.ten_lop}</span>
                  {' — '}
                  {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-slate-400">
                  ✅ {Object.values(presentMap).filter(Boolean).length} / {students.length} có mặt
                </p>
              </div>

              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <LoadingSpinner text="Đang tải danh sách học viên..." />
                </div>
              ) : students.length === 0 ? (
                <Card className="glass-panel py-16 flex flex-col items-center justify-center text-center">
                  <EmptyState
                    icon={<Users size={48} className="text-slate-300 mx-auto" />}
                    title="Chưa có học viên"
                    message="Lớp này chưa có học viên nào đăng ký."
                  />
                </Card>
              ) : (
                <Card className="glass-card border-0 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">STT</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Học viên</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">CCCD</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">Có mặt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((student, idx) => {
                          const sid = student.student_id || student.id;
                          const isPresent = !!presentMap[sid];
                          return (
                            <tr
                              key={sid}
                              onClick={() => togglePresent(sid)}
                              className={`cursor-pointer transition-colors ${isPresent ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-slate-50/50'}`}
                            >
                              <td className="px-6 py-4 text-sm text-slate-400 font-medium">{idx + 1}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ring-1 ${isPresent ? 'bg-emerald-100 text-emerald-600 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                                    {(student.ho_ten_full || student.ho_ten || 'N').charAt(0)}
                                  </div>
                                  <span className="font-bold text-slate-700">{student.ho_ten_full || student.ho_ten || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500 font-medium">{student.cccd || '—'}</td>
                              <td className="px-6 py-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isPresent}
                                  onChange={() => togglePresent(sid)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-5 h-5 rounded accent-teal-600 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-6 border-t border-slate-100 flex justify-end">
                    <Button
                      onClick={handleSaveAttendance}
                      disabled={saving || students.length === 0}
                      className="h-12 px-8 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                    >
                      <Save size={18} className="mr-2" />
                      {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* === HISTORY TAB === */}
          {activeTab === 'history' && (
            loading ? (
              <div className="flex flex-col items-center justify-center py-20 anim-fade-up">
                <LoadingSpinner text="Đang tải dữ liệu điểm danh..." />
              </div>
            ) : attendance.length === 0 ? (
              <Card className="glass-panel py-20 flex flex-col items-center justify-center text-center anim-fade-up">
                <EmptyState
                  icon={<Users size={64} className="text-slate-300 mx-auto" />}
                  title="Chưa có dữ liệu"
                  message="Lớp học này chưa có bất kỳ bản ghi điểm danh nào"
                />
              </Card>
            ) : (
              <div className="space-y-6 anim-fade-up">
                {/* Stats — based on most recent session */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-teal-50 to-white">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">Tổng học viên</p>
                      <p className="text-2xl font-bold text-slate-800">{new Set(attendance.map(a => a.student_id)).size || '—'}</p>
                    </div>
                  </Card>

                  <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">
                        Có mặt {lastDateStats.date ? `(${formatDateVN(lastDateStats.date)})` : '(Lần cuối)'}
                      </p>
                      <p className="text-2xl font-bold text-slate-800">{lastDateStats.present}</p>
                    </div>
                  </Card>

                  <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-rose-50 to-white">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                      <XCircle size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">
                        Vắng mặt {lastDateStats.date ? `(${formatDateVN(lastDateStats.date)})` : '(Lần cuối)'}
                      </p>
                      <p className="text-2xl font-bold text-slate-800">{lastDateStats.absent}</p>
                    </div>
                  </Card>
                </div>

                {/* Attendance history table */}
                <Card className="glass-card border-0 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Học viên</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ngày</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendance.map((record, idx) => (
                          <tr key={record.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs ring-1 ring-slate-200">
                                  {(record.student_name || record.ho_ten || 'N').charAt(0)}
                                </div>
                                <span className="font-bold text-slate-700">{record.student_name || record.ho_ten || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                <Calendar size={14} className="text-slate-400" />
                                {record.date ? formatDateVN(record.date) : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                className={`border-0 uppercase text-xs font-bold h-7 px-3
                                  ${record.status === 'present'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'}`}
                              >
                                {record.status === 'present' ? 'Có mặt' : 'Vắng mặt'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500 italic">{record.note || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
