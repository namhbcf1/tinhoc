// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import {
  Users, Calendar, Clock, MapPin, Info, UserCheck, FileText,
  Copy, ExternalLink, Search, Save, Download, Trash2, Upload,
  RefreshCw, CheckCircle, AlertCircle, Video, X, BookOpen
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN, getCurrentDateVN } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';
import { MobileAdminBottomSheet } from '../shared/mobileAdminUi';

// ========================================
// STATUS HELPERS
// ========================================

const CLASS_STATUS_MAP = {
  open: { label: 'Đang mở', cls: 'bg-green-100 text-green-700' },
  closed: { label: 'Đã đóng', cls: 'bg-red-100 text-red-700' },
  finished: { label: 'Kết thúc', cls: 'bg-slate-100 text-slate-700' },
};

const REG_STATUS_MAP = {
  pending: { label: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Đã duyệt', cls: 'bg-green-100 text-green-700' },
  confirmed: { label: 'Đã duyệt', cls: 'bg-green-100 text-green-700' },
  active: { label: 'Đã duyệt', cls: 'bg-green-100 text-green-700' },
  studying: { label: 'Đang học', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Hoàn thành', cls: 'bg-purple-100 text-purple-700' },
  rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Đã hủy', cls: 'bg-red-100 text-red-700' },
};

const SESSION_TYPE_LABELS = {
  lesson: 'Buổi học',
  exam: 'Bài test / thi',
  final_assessment: 'Đánh giá cuối khóa',
  assignment_review: 'Bài thu hoạch',
  other: 'Khác',
};

const FILE_COLORS = {
  pdf: '#ef4444', doc: '#3b82f6', docx: '#3b82f6', xls: '#22c55e', xlsx: '#22c55e',
  ppt: '#f97316', pptx: '#f97316', jpg: '#8b5cf6', jpeg: '#8b5cf6', png: '#8b5cf6',
  gif: '#8b5cf6', zip: '#64748b', rar: '#64748b', mp4: '#ec4899', mp3: '#06b6d4',
};

const getFileExt = (name = '') => {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const getFileColor = (name = '') => FILE_COLORS[getFileExt(name)] || '#64748b';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const StatusBadge = ({ status, map }) => {
  const cfg = (map || {})[status] || { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
};

const EmptyState = ({ icon: Icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <Icon size={44} className="text-slate-300 mb-3" />
    <p className="font-medium text-slate-500">{title}</p>
    {hint ? <p className="text-sm text-slate-400 mt-1">{hint}</p> : null}
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-14">
    <RefreshCw size={22} className="animate-spin text-blue-600" />
  </div>
);

// ========================================
// THÔNG TIN LỚP
// ========================================

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2 py-2">
    <span className="text-sm text-slate-500 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-800 text-right">{value || '—'}</span>
  </div>
);

function InfoSection({ cls }) {
  const { success } = useToast();
  const current = cls.current_students || cls.total_students || 0;
  const max = cls.max_students || 0;
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;

  const copyToClipboard = (text) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
    success('Đã sao chép vào clipboard!');
  };

  const formatDays = (days) => {
    if (!days || !days.length) return 'Chưa thiết lập';
    return days.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ');
  };

  const scheduleSummary =
    cls.schedule_summary ||
    (cls.schedule_days?.length
      ? `${formatDays(cls.schedule_days)}${cls.schedule_start_time && cls.schedule_end_time ? ` (${cls.schedule_start_time} - ${cls.schedule_end_time})` : ''}`
      : 'Chưa xếp lịch');

  return (
    <div className="space-y-2">
      {/* Sĩ số */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-500">Sĩ số lớp</span>
          <span className="text-base font-bold text-slate-800">
            {current} <span className="text-slate-400 text-sm font-normal">/ {max > 0 ? max : '∞'}</span>
          </span>
        </div>
        {max > 0 && (
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
        )}
        {cls.pending_count > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
            <AlertCircle size={13} /> {cls.pending_count} yêu cầu đăng ký đang chờ duyệt
          </div>
        )}
      </div>

      {/* Thông tin cơ bản */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h4 className="mb-1 text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Info size={14} className="text-blue-600" /> Thông tin cơ bản
        </h4>
        <div className="divide-y divide-slate-50">
          <InfoRow label="Mã lớp" value={cls.ma_lop ? <span className="font-mono">{cls.ma_lop}</span> : ''} />
          <InfoRow label="Loại" value={cls.class_type === 'hoc' ? 'Đào tạo' : cls.class_type === 'thi' ? 'Thi / Sát hạch' : (cls.class_type || '')} />
          <InfoRow
            label="Trạng thái"
            value={<StatusBadge status={cls.status || 'open'} map={CLASS_STATUS_MAP} />}
          />
          <InfoRow label="Học phí" value={cls.hoc_phi === 0 || cls.hoc_phi === '0' ? 'Liên hệ' : `${parseInt(cls.hoc_phi || 0).toLocaleString('vi-VN')}đ`} />
          <InfoRow label="Khai giảng" value={cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : ''} />
          <InfoRow label="Kết thúc" value={cls.ngay_ket_thuc ? formatDateVN(cls.ngay_ket_thuc) : ''} />
          {cls.open_at ? <InfoRow label="Mở đăng ký" value={formatDateVN(cls.open_at, true)} /> : null}
          {cls.close_at ? <InfoRow label="Đóng đăng ký" value={formatDateVN(cls.close_at, true)} /> : null}
        </div>
      </div>

      {/* Lịch học */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h4 className="mb-1 text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar size={14} className="text-blue-600" /> Lịch học
        </h4>
        <div className="divide-y divide-slate-50">
          <InfoRow label="Lịch học" value={scheduleSummary} />
          <InfoRow label="Địa điểm / Link" value={cls.schedule_location || cls.dia_diem || ''} />
          {cls.gio_hoc ? <InfoRow label="Giờ học" value={cls.gio_hoc} /> : null}
        </div>
      </div>

      {/* Google Meet */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h4 className="mb-1 text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Video size={14} className="text-red-500" /> Google Meet Class Room
        </h4>
        {cls.meet_link ? (
          <>
            <p className="mb-2 font-mono text-xs text-slate-600 break-all">{cls.meet_link}</p>
            <div className="flex gap-2">
              <button
                onClick={() => copyToClipboard(cls.meet_link)}
                className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 active:bg-slate-200"
              >
                <Copy size={14} /> Sao chép
              </button>
              <button
                onClick={() => window.open(cls.meet_link, '_blank')}
                className="flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white active:bg-red-700"
              >
                <ExternalLink size={14} /> Mở Meet
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400">Lớp này chưa có link Meet.</p>
        )}
      </div>

      {/* Ghi chú */}
      {cls.notes && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
          <h4 className="mb-1.5 text-sm font-bold text-amber-700 flex items-center gap-1.5">
            <AlertCircle size={14} /> Ghi chú
          </h4>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{cls.notes}</p>
        </div>
      )}
    </div>
  );
}

// ========================================
// HỌC VIÊN
// ========================================

function StudentsSection({ classId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let res = await api.getRegistrationsByClass(classId);
        let list = res?.success && Array.isArray(res.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        if (!list.length) {
          res = await api.getOnlineClassEnrollments(classId);
          list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
        }
        setStudents(list);
      } catch (e) {
        console.error('Error loading students:', e);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [classId]);

  const filtered = students.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const name = (s.ho_ten_full || s.ho_ten || s.full_name || s.student_name || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    const phone = s.phone || s.sdt || '';
    const cccd = (s.cccd || s.student_code || '').toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || cccd.includes(q);
  });

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm theo tên, SĐT, email..."
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <p className="px-1 text-xs font-semibold text-slate-500">
        {filtered.length} học viên{searchTerm ? ` (kết quả cho "${searchTerm}")` : ''}
      </p>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={searchTerm ? 'Không tìm thấy học viên nào' : 'Chưa có học viên nào trong lớp'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => {
            const name = student.ho_ten_full || student.ho_ten || student.full_name || student.student_name || 'Học viên';
            const code = student.code || student.student_code || student.cccd || '';
            return (
              <div key={student.registration_id || student.id || student.student_id} className="flex items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-600">
                    {name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                    {code ? <p className="truncate text-xs text-slate-400">{code}</p> : null}
                  </div>
                </div>
                <StatusBadge status={student.status} map={REG_STATUS_MAP} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========================================
// ĐIỂM DANH
// ========================================

function AttendanceSection({ classId }) {
  const { success, error } = useToast();
  const [selectedDate, setSelectedDate] = useState(getCurrentDateVN(true));
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void loadData();
  }, [classId, selectedDate]);

  useEffect(() => {
    void loadHistory();
  }, [classId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const studentsResp = await api.getRegistrationsByClass(classId);
      let list = [];
      if (studentsResp?.success) {
        list = Array.isArray(studentsResp.data) ? studentsResp.data : (Array.isArray(studentsResp.data?.data) ? studentsResp.data.data : []);
      }
      const active = list.filter((s) => ['confirmed', 'studying', 'active', 'approved'].includes(s.status));
      setStudents(active);

      const initial = {};
      active.forEach((s) => { initial[s.registration_id] = false; });

      const attResp = await api.getAttendanceByClass(classId, selectedDate, 'admin');
      if (attResp?.success && attResp.data) {
        attResp.data.forEach((r) => { initial[r.registration_id] = r.status === 'present'; });
      }
      setAttendance(initial);
    } catch (e) {
      console.error('Error loading attendance:', e);
      setStudents([]);
      setAttendance({});
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getAttendanceByClass(classId, null, 'admin');
      if (res?.success && Array.isArray(res.data)) {
        setHistory(res.data);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error('Error loading attendance history:', e);
      setHistory([]);
    }
  };

  const togglePresent = (rid) => {
    setAttendance((prev) => ({ ...prev, [rid]: !prev[rid] }));
  };

  const setAll = (value) => {
    const m = {};
    students.forEach((s) => { m[s.registration_id] = value; });
    setAttendance(m);
  };

  const handleSave = async () => {
    if (!students.length || saving) return;
    setSaving(true);
    try {
      const records = students.map((s) => ({
        registration_id: s.registration_id,
        class_id: parseInt(classId),
        attendance_date: selectedDate,
        status: attendance[s.registration_id] ? 'present' : 'absent',
      }));
      await api.markAttendanceBatch(records, 'admin');
      success('Đã lưu điểm danh!');
      void loadHistory();
      void loadData();
    } catch (e) {
      error('Lỗi lưu điểm danh: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: students.length,
    present: Object.values(attendance).filter(Boolean).length,
  };

  const filtered = students.filter((s) =>
    (s.ho_ten_full || s.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const byDate = {};
  history.forEach((r) => {
    const d = r.date || r.attendance_date || '';
    if (!d) return;
    if (!byDate[d]) byDate[d] = { present: 0, absent: 0 };
    if (r.status === 'present') byDate[d].present += 1;
    else byDate[d].absent += 1;
  });
  const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <div className="space-y-2">
      {/* Date + stats */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <label className="mb-1.5 block text-sm font-semibold text-slate-600">Ngày điểm danh</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mb-3 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 py-2">
            <div className="text-base font-bold text-slate-800">{stats.total}</div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Tổng số</div>
          </div>
          <div className="rounded-xl bg-emerald-50 py-2 text-emerald-700">
            <div className="text-base font-bold">{stats.present}</div>
            <div className="text-[10px] font-semibold uppercase">Có mặt</div>
          </div>
          <div className="rounded-xl bg-red-50 py-2 text-red-700">
            <div className="text-base font-bold">{stats.total - stats.present}</div>
            <div className="text-[10px] font-semibold uppercase">Vắng</div>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <EmptyState icon={UserCheck} title="Lớp chưa có học viên nào để điểm danh" />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm học viên..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <button onClick={() => setAll(true)} className="rounded-xl bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 active:bg-emerald-100">
              Có mặt tất cả
            </button>
            <button onClick={() => setAll(false)} className="rounded-xl bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 active:bg-red-100">
              Bỏ chọn
            </button>
          </div>

          {/* Student toggles */}
          <div className="space-y-2">
            {filtered.map((student) => {
              const rid = student.registration_id;
              const isPresent = !!attendance[rid];
              return (
                <button
                  key={rid}
                  onClick={() => togglePresent(rid)}
                  className={`w-full flex items-center justify-between gap-2 rounded-2xl border p-2.5 text-left transition-all active:scale-[0.98] ${isPresent ? 'border-emerald-200 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white shadow-sm'}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isPresent ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {(student.ho_ten_full || student.ho_ten || 'N').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{student.ho_ten_full || student.ho_ten || 'N/A'}</p>
                      {student.cccd ? <p className="truncate text-xs text-slate-400">{student.cccd}</p> : null}
                    </div>
                  </div>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${isPresent ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-300' : 'bg-slate-100 text-slate-400'}`}>
                    {isPresent ? <CheckCircle size={20} /> : <X size={20} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 py-2.5 font-bold text-white shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <Save size={18} /> Lưu điểm danh ({stats.present}/{stats.total} có mặt)
              </>
            )}
          </button>
        </>
      )}

      {/* History */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h4 className="mb-2 text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar size={14} className="text-teal-600" /> Lịch sử điểm danh
        </h4>
        {dates.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có dữ liệu điểm danh cho lớp này.</p>
        ) : (
          <div className="space-y-2">
            {dates.map((d) => (
              <div key={d} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{formatDateVN(d)}</span>
                <div className="flex gap-1.5 text-xs font-semibold">
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-700">{byDate[d].present} có mặt</span>
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-red-700">{byDate[d].absent} vắng</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// TÀI LIỆU
// ========================================

function DocumentsSection({ classId }) {
  const { success, error } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', file: null });
  const [confirmId, setConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      let res = await api.getSharedDocumentsForOfflineClass(classId);
      let list = res?.success && Array.isArray(res.data) ? res.data : [];
      if (!list.length) {
        res = await api.getSharedDocumentsForOnlineClass(classId);
        list = res?.success && Array.isArray(res.data) ? res.data : [];
      }
      setDocuments(list);
    } catch (e) {
      console.error('Error loading documents:', e);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, [classId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        error('File quá lớn! Tối đa 50MB');
        return;
      }
      setUploadForm((prev) => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title.trim()) {
      error('Vui lòng nhập tên tài liệu và chọn file');
      return;
    }
    setUploading(true);
    try {
      const uploadRes = await api.uploadDocumentWithPermission({
        title: uploadForm.title,
        description: uploadForm.description,
        doc_type: 'class',
        access_type: 'admin',
        class_ids: [],
        student_ids: [],
        cccd: '',
        valid_from: '',
        valid_until: '',
        file: uploadForm.file,
        visibility: 'internal',
      });
      if (!uploadRes?.success || !uploadRes?.document_id) {
        throw new Error(uploadRes?.message || uploadRes?.error || 'Upload failed');
      }
      await api.shareDocument(uploadRes.document_id, [{ type: 'offline_class', id: Number(classId) }]);
      success('Đã tải lên và chia sẻ vào lớp!');
      setUploadForm({ title: '', description: '', file: null });
      setShowUpload(false);
      void loadDocuments();
    } catch (e) {
      error('Lỗi: ' + (e.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await api.downloadDocument(doc.id, doc.file_name);
    } catch (e) {
      error('Lỗi tải xuống: ' + (e.message || ''));
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteDocument(confirmId);
      success('Đã xóa tài liệu');
      setConfirmId(null);
      void loadDocuments();
    } catch (e) {
      error('Lỗi xóa tài liệu');
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowUpload((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50 py-2 text-sm font-semibold text-blue-700 active:bg-blue-100"
      >
        <Upload size={16} /> {showUpload ? 'Hủy tải lên' : 'Tải lên tài liệu'}
      </button>

      {/* Upload form */}
      {showUpload && (
        <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Tên tài liệu *</label>
            <input
              type="text"
              value={uploadForm.title}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="VD: Bài giảng tuần 1"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">Mô tả</label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="Mô tả ngắn (tùy chọn)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500"
            >
              {uploadForm.file ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: getFileColor(uploadForm.file.name) }}>
                    {getFileExt(uploadForm.file.name).toUpperCase().slice(0, 3) || 'FILE'}
                  </span>
                  <span className="truncate font-medium text-slate-700">{uploadForm.file.name}</span>
                  <span className="text-xs text-slate-400">({formatFileSize(uploadForm.file.size)})</span>
                </span>
              ) : (
                'Nhấn để chọn file *'
              )}
            </button>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadForm.file || !uploadForm.title.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2 font-bold text-white shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-60"
          >
            {uploading ? 'Đang tải lên...' : 'Tải lên'}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : documents.length === 0 ? (
        <EmptyState icon={FileText} title="Chưa có tài liệu nào" hint="Tải lên tài liệu đầu tiên cho lớp học này" />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: getFileColor(doc.file_name) }}>
                  {getFileExt(doc.file_name).toUpperCase().slice(0, 3) || 'FILE'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{doc.title}</p>
                  <p className="truncate text-xs text-slate-400">{doc.file_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatFileSize(doc.file_size)} • {formatDateVN(doc.created_at)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-slate-50 pt-3">
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 active:bg-emerald-100"
                >
                  <Download size={14} /> Tải xuống
                </button>
                <button
                  onClick={() => setConfirmId(doc.id)}
                  className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 active:bg-red-100"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {confirmId !== null && (
        <div className="fixed inset-0 z-[100100] flex items-center justify-center bg-black/50 p-3" onClick={() => setConfirmId(null)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-center font-bold text-slate-800">Xóa tài liệu?</p>
            <p className="mt-1 text-center text-sm text-slate-500">Hành động này không thể hoàn tác.</p>
            <div className="mt-2.5 flex gap-2">
              <button onClick={() => setConfirmId(null)} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700">
                Hủy
              </button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white">
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// LỊCH HỌC (SESSIONS)
// ========================================

function SchedulesSection({ classId }) {
  const [sessions, setSessions] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, l] = await Promise.all([
          api.getClassSessions(classId),
          api.getClassSchedules(classId).catch(() => ({ success: false, data: [] })),
        ]);
        setSessions(s?.success && Array.isArray(s.data) ? s.data : []);
        setLegacy(l?.success && Array.isArray(l.data) ? l.data : []);
      } catch (e) {
        console.error('Error loading schedules:', e);
        setSessions([]);
        setLegacy([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [classId]);

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.session_date || b.date || 0) - new Date(a.session_date || a.date || 0)
  );
  const sortedLegacy = [...legacy].sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );

  const hasAny = sessions.length > 0 || legacy.length > 0;

  return (
    <div className="space-y-2">
      {loading ? (
        <LoadingState />
      ) : !hasAny ? (
        <EmptyState icon={Calendar} title="Chưa có lịch học nào" hint="Lớp này chưa được xếp lịch học" />
      ) : (
        <>
          {sortedSessions.length > 0 && (
            <div className="space-y-2">
              <h4 className="px-1 text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen size={14} className="text-blue-600" /> Buổi học
              </h4>
              {sortedSessions.map((session) => {
                const typeLabel = SESSION_TYPE_LABELS[session.session_type] || session.session_type || 'Buổi học';
                return (
                  <div key={session.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {session.title || formatDateVN(session.session_date || session.date)}
                      </span>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{typeLabel}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {formatDateVN(session.session_date || session.date)}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {session.start_time} - {session.end_time}</span>
                      {session.room ? <span className="flex items-center gap-1"><MapPin size={12} /> {session.room}</span> : null}
                      {session.meeting_link ? (
                        <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600">
                          <ExternalLink size={12} /> Link
                        </a>
                      ) : null}
                    </div>
                    {session.content_outline ? (
                      <p className="mt-2 text-xs text-slate-500 line-clamp-2">{session.content_outline}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {sortedLegacy.length > 0 && (
            <div className="space-y-2">
              <h4 className="px-1 text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-teal-600" /> Lịch học định kỳ
              </h4>
              {sortedLegacy.map((schedule) => (
                <div key={schedule.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-teal-500" />
                    <span className="text-sm font-semibold text-slate-800">{formatDateVN(schedule.date)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                    <Clock size={13} />
                    <span>{schedule.start_time} - {schedule.end_time}</span>
                  </div>
                  {schedule.location ? (
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={13} />
                      <span>{schedule.location}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ========================================
// MAIN MODULE
// ========================================

export default function MobileClassDetailModule({ cls, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('info');

  if (!cls || typeof cls !== 'object') return null;

  const tabs = [
    { id: 'info', label: 'Thông tin', icon: Info },
    { id: 'students', label: 'Học viên', icon: Users },
    { id: 'attendance', label: 'Điểm danh', icon: UserCheck },
    { id: 'documents', label: 'Tài liệu', icon: FileText },
    { id: 'schedules', label: 'Lịch học', icon: Calendar },
  ];

  const current = cls.current_students || cls.total_students || 0;
  const max = cls.max_students || 0;
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;

  return (
    <MobileAdminBottomSheet isOpen={isOpen} onClose={onClose} title={cls.ten_lop || 'Chi tiết lớp học'} height="100dvh">
      {/* Hero */}
      <div className="mb-2.5 overflow-hidden rounded-[22px] bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shadow-lg shadow-blue-200/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {cls.class_type === 'hoc' ? 'Đào tạo' : cls.class_type === 'thi' ? 'Thi / Sát hạch' : 'Lớp học'}
              </span>
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold font-mono">{cls.ma_lop}</span>
              {cls.status && <StatusBadge status={cls.status} map={CLASS_STATUS_MAP} />}
            </div>
            <h2 className="mt-2 text-sm font-black leading-tight tracking-[-0.02em] line-clamp-2">{cls.ten_lop}</h2>
            {cls.ngay_bat_dau && (
              <p className="mt-1 text-xs text-blue-100">
                {formatDateVN(cls.ngay_bat_dau)}{cls.ngay_ket_thuc ? ` - ${formatDateVN(cls.ngay_ket_thuc)}` : ''}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-black leading-none">{current}<span className="text-sm font-semibold text-blue-200">/{max > 0 ? max : '∞'}</span></p>
            <p className="mt-1 text-[10px] font-semibold uppercase text-blue-100">Học viên</p>
          </div>
        </div>
        {max > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-4 mb-2.5 flex gap-1.5 overflow-x-auto border-b border-[rgba(14,165,233,0.18)] bg-[var(--admin-paper)] px-3 pb-2.5 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'info' && <InfoSection cls={cls} />}
      {activeTab === 'students' && <StudentsSection classId={cls.id} />}
      {activeTab === 'attendance' && <AttendanceSection classId={cls.id} />}
      {activeTab === 'documents' && <DocumentsSection classId={cls.id} />}
      {activeTab === 'schedules' && <SchedulesSection classId={cls.id} />}
    </MobileAdminBottomSheet>
  );
}