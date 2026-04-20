import { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import {
  Users, CheckCircle, XCircle, Search, ChevronRight, ChevronDown,
  BookOpen, Save, ClipboardCheck, ArrowLeft, UserCheck
} from 'lucide-react';
import { formatDateVN } from '../../../utils/dateUtils';
import { Card, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

// -------------------------------------------------------
// MobileAttendanceModule — điểm danh mobile (admin version)
// Tính năng: chọn lớp, điểm danh hôm nay, xem lịch sử
// All API calls use tokenType: 'admin'
// -------------------------------------------------------

export default function MobileAttendanceModule() {
  // Danh sách lớp
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showClassPicker, setShowClassPicker] = useState(false);

  // Tab: 'mark' | 'history'
  const [activeTab, setActiveTab] = useState('mark');

  // Điểm danh hôm nay
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [presentMap, setPresentMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Lịch sử
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);

  useGSAP(() => {
    if (containerRef.current) {
      gsap.fromTo(
        '.att-anim',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out' }
      );
    }
  }, { scope: containerRef, dependencies: [loadingClasses, selectedClass, activeTab] });

  useEffect(() => {
    loadClasses();
  }, []);
  useAdminAutoRefresh(() => {
    void loadClasses();
    if (selectedClass) {
      void loadStudents();
      void loadHistory();
    }
  }, { minIntervalMs: 15000 });

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadHistory();
      setSaveSuccess(false);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await api.cachedRequest(
        '/teachers/my-classes',
        { method: 'GET', tokenType: 'admin' },
        { ttlMs: 3 * 60 * 1000 }
      );
      if (response?.success && Array.isArray(response.data)) {
        setClasses(response.data);
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedClass) return;
    setLoadingStudents(true);
    try {
      const classId = selectedClass.class_id || selectedClass.id;
      const response = await api.getRegistrationsByClass(classId);
      if (response?.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        setStudents(list);
        // Mặc định: tất cả VẮNG, admin tick có mặt
        const defaultMap = {};
        list.forEach((s) => {
          defaultMap[s.registration_id] = false;
        });
        setPresentMap(defaultMap);
      } else {
        setStudents([]);
        setPresentMap({});
      }
    } catch (err) {
      console.error('Error loading students:', err);
      setStudents([]);
      setPresentMap({});
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadHistory = async () => {
    if (!selectedClass) return;
    setLoadingHistory(true);
    try {
      const classId = selectedClass.class_id || selectedClass.id;
      const response = await api.getAttendanceByClass(classId, null, 'admin');
      if (response?.success && Array.isArray(response.data)) {
        setHistory(response.data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const togglePresent = (studentId) => {
    setPresentMap((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const markAll = (present) => {
    const newMap = {};
    students.forEach((s) => {
      newMap[s.registration_id] = present;
    });
    setPresentMap(newMap);
  };

  const handleSave = async () => {
    if (!selectedClass || saving) return;
    setSaving(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const classId = selectedClass.class_id || selectedClass.id;

      const records = students.map((s) => {
        const registrationId = s.registration_id;
        return {
          registration_id: registrationId,
          class_id: classId,
          attendance_date: dateStr,
          status: presentMap[registrationId] ? 'present' : 'absent',
        };
      });

      await api.markAttendanceBatch(records, 'admin');
      setSaveSuccess(true);
      await loadHistory();
      setActiveTab('history');
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    (s.ho_ten_full || s.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = Object.values(presentMap).filter(Boolean).length;
  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  // ===== RENDER =====

  // Pull-to-refresh callback
  const handleRefresh = async () => {
    await loadClasses();
  };

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh}>
    <div className="space-y-4 pb-24" ref={containerRef}>

      {/* Header card */}
      <div className="att-anim">
        <Card className="border-0 overflow-hidden shadow-md">
          <div className="bg-gradient-to-br from-teal-600 to-emerald-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Điểm danh</h2>
                <p className="text-teal-100 text-sm mt-0.5">{todayStr}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Class picker button */}
      <div className="att-anim">
        <p className="text-xs font-semibold text-slate-500 px-1 mb-2">Lớp đang giảng dạy</p>
        <button
          onClick={() => setShowClassPicker(true)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <BookOpen size={20} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-800">
                {selectedClass?.ten_lop || selectedClass?.class_name || 'Chọn lớp học'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedClass ? 'Nhấn để đổi lớp' : 'Chọn lớp để bắt đầu điểm danh'}
              </p>
            </div>
          </div>
          <ChevronDown size={18} className="text-slate-400" />
        </button>
      </div>

      {/* Class picker modal */}
      {showClassPicker && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[100000] bg-slate-900/30 backdrop-blur-sm flex items-end"
            onClick={() => setShowClassPicker(false)}
          >
            <div
              className="bg-white w-full max-h-[70vh] rounded-t-3xl p-6 shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-slate-800 mb-4">Chọn lớp học</h3>
            {loadingClasses ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : classes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Chưa có lớp học nào</p>
            ) : (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <button
                    key={cls.class_id || cls.id}
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowClassPicker(false);
                      setSearchTerm('');
                    }}
                    className={`w-full p-4 rounded-xl flex items-center gap-3 text-left transition-all
                      ${selectedClass?.class_id === cls.class_id
                        ? 'bg-teal-50 border border-teal-200'
                        : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                      }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {(cls.ten_lop || cls.class_name || 'L').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {cls.ten_lop || cls.class_name || 'Lớp học'}
                      </p>
                      {cls.ma_lop && (
                        <p className="text-xs text-slate-400">{cls.ma_lop}</p>
                      )}
                    </div>
                    {selectedClass?.class_id === cls.class_id && (
                      <CheckCircle size={18} className="text-teal-600 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </OverlayPortal>
      )}

      {/* Content khi đã chọn lớp */}
      {selectedClass && (
        <>
          {/* Tab switcher */}
          <div className="att-anim">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'mark', label: 'Điểm danh hôm nay', icon: UserCheck },
                { id: 'history', label: 'Lịch sử', icon: ClipboardCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                      ${activeTab === tab.id
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500'
                      }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== TAB: ĐIỂM DANH HÔM NAY ===== */}
          {activeTab === 'mark' && (
            <div className="space-y-4 att-anim">
              {/* Stats + select-all row */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-slate-500">
                  <span className="font-bold text-teal-700">{presentCount}</span>
                  <span> / {students.length} có mặt</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => markAll(true)}
                    className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                  >
                    Tất cả có mặt
                  </button>
                  <button
                    onClick={() => markAll(false)}
                    className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                  placeholder="Tìm tên sinh viên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 pl-12 rounded-2xl bg-white border-white shadow-sm text-sm"
                />
              </div>

              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
                  <p className="text-sm text-slate-400">Đang tải danh sách...</p>
                </div>
              ) : students.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Users size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-500">Chưa có sinh viên</p>
                    <p className="text-xs text-slate-400 mt-1">Lớp này chưa có học viên nào đăng ký</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredStudents.map((student) => {
                    const sid = student.registration_id;
                    const isPresent = !!presentMap[sid];
                    return (
                      <button
                        key={sid}
                        onClick={() => togglePresent(sid)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]
                          ${isPresent
                            ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                            : 'bg-white border-slate-100 shadow-sm'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar chữ cái đầu */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                            ${isPresent
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {(student.ho_ten_full || student.ho_ten || 'N').charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-slate-800 text-sm">
                              {student.ho_ten_full || student.ho_ten || 'N/A'}
                            </p>
                            {student.cccd && (
                              <p className="text-xs text-slate-400">{student.cccd}</p>
                            )}
                          </div>
                        </div>

                        {/* Toggle badge — large touch target */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0
                          ${isPresent
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-300'
                            : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {isPresent
                            ? <CheckCircle size={22} />
                            : <XCircle size={22} />
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Save button */}
              {students.length > 0 && (
                <div className="sticky bottom-20 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-14 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-500/30 transition-all active:scale-95"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        Đang lưu...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Save size={20} />
                        Lưu điểm danh ({presentCount}/{students.length} có mặt)
                      </div>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ===== TAB: LỊCH SỬ ===== */}
          {activeTab === 'history' && (
            <div className="space-y-4 att-anim">
              {saveSuccess && (
                <Card className="border-0 bg-emerald-50 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-emerald-700">
                      Điểm danh đã được lưu thành công!
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Summary stats */}
              {history.length > 0 && (() => {
                const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastDate = sorted[0].date;
                const lastRecords = history.filter(r => r.date === lastDate);
                const presentLast = lastRecords.filter(r => r.status === 'present').length;
                const absentLast = lastRecords.filter(r => r.status !== 'present').length;
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="border-0 shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle size={20} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 leading-none">{presentLast}</p>
                        <p className="text-xs text-slate-400 mt-1">Có mặt (buổi cuối)</p>
                      </div>
                    </Card>
                    <Card className="border-0 shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <XCircle size={20} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 leading-none">{absentLast}</p>
                        <p className="text-xs text-slate-400 mt-1">Vắng (buổi cuối)</p>
                      </div>
                    </Card>
                  </div>
                );
              })()}

              {loadingHistory ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : history.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <ClipboardCheck size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-500">Chưa có dữ liệu điểm danh</p>
                    <p className="text-xs text-slate-400 mt-1">Điểm danh buổi học đầu tiên ngay!</p>
                    <button
                      onClick={() => setActiveTab('mark')}
                      className="mt-4 text-sm font-semibold text-teal-600 flex items-center gap-1 mx-auto"
                    >
                      <ArrowLeft size={16} /> Bắt đầu điểm danh
                    </button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {history.map((record, idx) => (
                    <Card key={record.id || idx} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-500 text-sm">
                              {(record.student_name || record.ho_ten || 'N').charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">
                                {record.student_name || record.ho_ten || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {record.date ? formatDateVN(record.date) : ''}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`border-0 text-xs font-semibold px-3 h-7
                              ${record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                              }`}
                          >
                            {record.status === 'present' ? 'Có mặt' : 'Vắng mặt'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Placeholder khi chưa chọn lớp */}
      {!selectedClass && !loadingClasses && (
        <div className="att-anim">
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <ClipboardCheck size={44} className="text-slate-300 mx-auto mb-4" />
              <p className="font-semibold text-slate-500 text-base">Chọn lớp để bắt đầu</p>
              <p className="text-slate-400 text-sm mt-2 mb-5">
                Vui lòng chọn lớp học phía trên để xem và thực hiện điểm danh
              </p>
              <Button
                onClick={() => setShowClassPicker(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl px-6 h-11"
              >
                Chọn lớp học
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </PullToRefreshWrapper>
  );
}
