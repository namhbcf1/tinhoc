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
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

export default function AdminAttendancePage({ toast }) {
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
  useAdminAutoRefresh(() => {
    void loadClasses();
    if (selectedClass) {
      void loadStudents();
      void loadAttendance();
    }
  }, { minIntervalMs: 15000 });

  useEffect(() => {
    if (selectedClass) {
      loadAttendance();
      loadStudents();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      const response = await api.cachedRequest('/teachers/my-classes', { tokenType: 'admin' }, true);
      if (response?.success && Array.isArray(response.data)) {
        setClasses(response.data);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      // Use class_id consistently (string comparison safe)
      const classId = selectedClass.class_id || selectedClass.id;
      const response = await api.getAttendanceByClass(classId, null, 'admin');
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
      const classId = selectedClass.class_id || selectedClass.id;
      const response = await api.getRegistrationsByClass(classId);
      if (response?.success) {
        const list = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        setStudents(list);
        // Default all UNCHECKED (absent) \u2014 teacher must explicitly mark present
        const defaultMap = {};
        list.forEach(s => {
          defaultMap[s.registration_id] = false;
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
        const registrationId = s.registration_id;
        return {
          registration_id: registrationId,
          class_id: classId,
          attendance_date: dateStr,
          status: presentMap[registrationId] ? 'present' : 'absent',
        };
      });

      await api.markAttendanceBatch(records, 'admin');
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
    return <LoadingSpinner text="\u0110ang t\u1ea3i..." />;
  }

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Header + Class selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 anim-fade-up">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">\u0110i\u1ec3m danh</h1>
          <p className="text-slate-500 mt-1">Qu\u1ea3n l\u00fd chuy\u00ean c\u1ea7n c\u1ee7a h\u1ecdc vi\u00ean</p>
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
              <option value="">Ch\u1ecdn l\u1edbp h\u1ecdc</option>
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
            title="Ch\u1ecdn l\u1edbp h\u1ecdc"
            message="Vui l\u00f2ng ch\u1ecdn l\u1edbp h\u1ecdc t\u1eeb danh s\u00e1ch ph\u00eda tr\u00ean \u0111\u1ec3 xem v\u00e0 qu\u1ea3n l\u00fd \u0111i\u1ec3m danh"
          />
        </Card>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex bg-white/50 backdrop-blur border border-slate-200/50 p-1 rounded-2xl shadow-sm w-fit anim-fade-up">
            {[
              { id: 'mark', label: '\u0110i\u1ec3m danh h\u00f4m nay' },
              { id: 'history', label: 'L\u1ecbch s\u1eed \u0111i\u1ec3m danh' },
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
                  {' \u2014 '}
                  {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-slate-400">
                  \u2705 {Object.values(presentMap).filter(Boolean).length} / {students.length} c\u00f3 m\u1eb7t
                </p>
              </div>

              {loadingStudents ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <LoadingSpinner text="\u0110ang t\u1ea3i danh s\u00e1ch h\u1ecdc vi\u00ean..." />
                </div>
              ) : students.length === 0 ? (
                <Card className="glass-panel py-16 flex flex-col items-center justify-center text-center">
                  <EmptyState
                    icon={<Users size={48} className="text-slate-300 mx-auto" />}
                    title="Ch\u01b0a c\u00f3 h\u1ecdc vi\u00ean"
                    message="L\u1edbp n\u00e0y ch\u01b0a c\u00f3 h\u1ecdc vi\u00ean n\u00e0o \u0111\u0103ng k\u00fd."
                  />
                </Card>
              ) : (
                <Card className="glass-card border-0 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">STT</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">H\u1ecdc vi\u00ean</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">CCCD</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide text-center">C\u00f3 m\u1eb7t</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((student, idx) => {
                          const sid = student.registration_id;
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
                              <td className="px-6 py-4 text-sm text-slate-500 font-medium">{student.cccd || '\u2014'}</td>
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
                      {saving ? '\u0110ang l\u01b0u...' : 'L\u01b0u \u0111i\u1ec3m danh'}
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
                <LoadingSpinner text="\u0110ang t\u1ea3i d\u1eef li\u1ec7u \u0111i\u1ec3m danh..." />
              </div>
            ) : attendance.length === 0 ? (
              <Card className="glass-panel py-20 flex flex-col items-center justify-center text-center anim-fade-up">
                <EmptyState
                  icon={<Users size={64} className="text-slate-300 mx-auto" />}
                  title="Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u"
                  message="L\u1edbp h\u1ecdc n\u00e0y ch\u01b0a c\u00f3 b\u1ea5t k\u1ef3 b\u1ea3n ghi \u0111i\u1ec3m danh n\u00e0o"
                />
              </Card>
            ) : (
              <div className="space-y-6 anim-fade-up">
                {/* Stats \u2014 based on most recent session */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-teal-50 to-white">
                    <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">T\u1ed5ng h\u1ecdc vi\u00ean</p>
                      <p className="text-2xl font-bold text-slate-800">{new Set(attendance.map(a => a.student_id)).size || '\u2014'}</p>
                    </div>
                  </Card>

                  <Card className="glass-card p-6 border-0 shadow-sm flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">
                        C\u00f3 m\u1eb7t {lastDateStats.date ? `(${formatDateVN(lastDateStats.date)})` : '(L\u1ea7n cu\u1ed1i)'}
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
                        V\u1eafng m\u1eb7t {lastDateStats.date ? `(${formatDateVN(lastDateStats.date)})` : '(L\u1ea7n cu\u1ed1i)'}
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
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">H\u1ecdc vi\u00ean</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ng\u00e0y</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Tr\u1ea1ng th\u00e1i</th>
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Ghi ch\u00fa</th>
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
                                {record.status === 'present' ? 'C\u00f3 m\u1eb7t' : 'V\u1eafng m\u1eb7t'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-500 italic">{record.note || '\u2014'}</span>
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
