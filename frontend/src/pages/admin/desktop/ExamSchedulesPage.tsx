import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { showError } from '../../../utils/errorHandler';
import { buildVietnamDateTimePayload, formatDateVN, formatTime, toVietnamDate } from '../../../utils/dateUtils';
import { findExamTemplateOption, suggestExamTemplateId } from '../../../utils/examTemplateRules';
import { resolveImageUrl } from '../../../utils/imageUrl';
import DateInput from '../../../components/ui/DateInput';
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL,
  getAdminCache,
  invalidateAdminData,
  setAdminCache,
} from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

// UI Components
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar, Edit, Trash2, Search, PlusCircle, Users, Clock, MapPin, Info, Download, UserX, Phone, Mail, CheckCircle, XCircle, User, CheckCheck, RotateCcw, ClipboardCheck, RefreshCw
} from 'lucide-react';

import EmptyState from '../../../components/ui/EmptyState';
import StudentDetailModal from './students/StudentDetailModal';

let xlsxModulePromise = null;

const SCHEDULE_PRESETS = [
  {
    id: 'weekday-evening',
    label: '2-4-6 tối',
    helper: 'WEEKLY:1,3,5 • 19:00-21:00',
    rule: 'WEEKLY:1,3,5',
    time: '19:00-21:00',
  },
  {
    id: 'weekday-intensive',
    label: '3-5-7 tối',
    helper: 'WEEKLY:2,4,6 • 18:30-20:30',
    rule: 'WEEKLY:2,4,6',
    time: '18:30-20:30',
  },
  {
    id: 'weekend-morning',
    label: 'Cuối tuần sáng',
    helper: 'WEEKLY:6,7 • 08:00-11:00',
    rule: 'WEEKLY:6,7',
    time: '08:00-11:00',
  },
];
const TIMEZONE_OPTIONS = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'UTC'];
const DEFAULT_CLASS_SEED_RULE = 'WEEKLY:1,3,5';
const DEFAULT_CLASS_SEED_TIME = '19:00-21:00';
const DEFAULT_CLASS_SEED_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_CLASS_SEED_MAX_STUDENTS = 50;


const WEEKLY_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const WEEKLY_DAY_LABELS = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
  7: 'CN',
};

const parseExamDateTime = (value) => {
  const parsed = toVietnamDate(value);
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const startOfCalendarDay = (value = new Date()) => {
  const parsed = value instanceof Date ? new Date(value) : parseExamDateTime(value);
  const safeDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  safeDate.setHours(0, 0, 0, 0);
  return safeDate;
};

const getExamTimestamp = (value) => parseExamDateTime(value)?.getTime() ?? 0;

const formatExamDateInputValue = (value) => {
  const date = parseExamDateTime(value);
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getExamStatusMeta = (value) => {
  const examDay = startOfCalendarDay(value);
  const today = startOfCalendarDay();

  if (examDay.getTime() === today.getTime()) {
    return {
      key: 'today',
      label: 'Hôm nay',
      accentClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    };
  }

  if (examDay.getTime() < today.getTime()) {
    return {
      key: 'past',
      label: 'Đã qua',
      accentClass: 'bg-slate-300',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
  }

  return {
    key: 'upcoming',
    label: 'Sắp tới',
    accentClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
  };
};

const getPendingCount = (exam) => Number(exam?.pending_count || 0);
const getApprovedCount = (exam) => Number(exam?.approved_count || 0);
const getTotalStudentCount = (exam) => getPendingCount(exam) + getApprovedCount(exam);

const getScheduleDaysFromRule = (rule) => {
  if (!rule || !String(rule).toUpperCase().startsWith('WEEKLY:')) return [];
  const [, rawDays] = String(rule).split(':');
  if (!rawDays) return [];

  return rawDays
    .split(',')
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 7);
};

const describeScheduleRule = (rule) => {
  if (!rule) return 'Chưa thiết lập lịch học';
  const normalized = String(rule).trim().toUpperCase();
  if (normalized === 'DAILY') return 'Học hằng ngày';

  const days = getScheduleDaysFromRule(normalized);
  if (!days.length) return normalized;

  return days.map((day) => WEEKLY_DAY_LABELS[day] || day).join(' • ');
};

const parseScheduleTimeRange = (value) => {
  if (!value || !String(value).includes('-')) {
    return { start: '', end: '' };
  }

  const [start, end] = String(value).split('-');
  return {
    start: start?.trim() || '',
    end: end?.trim() || '',
  };
};

const formatSchedulePreview = (rule, timeRange) => {
  const scheduleLabel = describeScheduleRule(rule);
  if (!timeRange) return scheduleLabel;
  return `${scheduleLabel} • ${timeRange}`;
};

const composePreviewDateTime = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const [year, month, day] = String(dateValue).split('-').map(Number);
  if (!year || !month || !day) return null;

  const [hours = 0, minutes = 0] = String(timeValue || '00:00').split(':').map(Number);
  const result = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

const hasConfiguredLinkedClass = (value = {}) => Boolean(
  value.class_seed_name ||
  value.class_seed_schedule_rule ||
  value.class_seed_schedule_time ||
  value.class_seed_start_date
);

const hasConfiguredZoomMeeting = (value: any = {}) => Boolean(
  value.zoom_link ||
  value.zoom_link_backup ||
  value.zoom_meeting_id ||
  value.zoom_passcode ||
  value.zoom_meeting_id_backup ||
  value.zoom_passcode_backup
);

const formatDurationLabel = (value) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return `${parsed} phút`;
  }

  return 'Chưa khai báo thời lượng';
};

const createExamFormData = (overrides = {}) => ({
  exam_name: '',
  exam_date: '',
  exam_time: '',
  duration_minutes: '',
  location: '',
  notes: '',
  zoom_link: '',
  zoom_link_backup: '',
  zoom_meeting_id: '',
  zoom_passcode: '',
  zoom_meeting_id_backup: '',
  zoom_passcode_backup: '',
  enable_zoom_meeting: false,
  organizer_uuid: '',
  program_uuid: '',
  level_uuid: '',
  exam_level: '',
  exam_category_id: '',
  exam_type_id: '',
  template_id: '',
  enable_linked_class: false,
  class_seed_name: '',
  class_seed_description: '',
  class_seed_schedule_rule: DEFAULT_CLASS_SEED_RULE,
  class_seed_schedule_time: DEFAULT_CLASS_SEED_TIME,
  class_seed_timezone: DEFAULT_CLASS_SEED_TIMEZONE,
  class_seed_start_date: '',
  class_seed_end_date: '',
  class_seed_max_students: DEFAULT_CLASS_SEED_MAX_STUDENTS,
  ...overrides,
});

const normalizeIdentityValue = (value) => String(value ?? '').trim().toLowerCase();

const normalizePreviewToken = (value) => String(value || '').trim().toUpperCase();

const splitStudentName = (fullName) => {
  if (!fullName) return { ho: '', ten: '' };
  const parts = String(fullName).trim().split(/\s+/);
  if (parts.length <= 1) return { ho: '', ten: parts[0] || '' };
  const ten = parts.pop() || '';
  return { ho: parts.join(' '), ten };
};

const getStudentNameParts = (student = {}) => {
  const split = splitStudentName(student?.ho_ten_full);
  return {
    ho: String(student?.ho || split.ho || '').trim(),
    tenDem: String(student?.ten_dem || '').trim(),
    ten: String(student?.ten || split.ten || '').trim(),
  };
};

const compareStudentsForExcelPreview = (left, right) => {
  const leftName = getStudentNameParts(left);
  const rightName = getStudentNameParts(right);

  const compareByFirstName = leftName.ten.localeCompare(rightName.ten, 'vi', { sensitivity: 'base' });
  if (compareByFirstName !== 0) return compareByFirstName;

  const compareBySurname = leftName.ho.localeCompare(rightName.ho, 'vi', { sensitivity: 'base' });
  if (compareBySurname !== 0) return compareBySurname;

  const compareByMiddleName = leftName.tenDem.localeCompare(rightName.tenDem, 'vi', { sensitivity: 'base' });
  if (compareByMiddleName !== 0) return compareByMiddleName;

  return String(left?.cccd || left?.student_id || left?.id || '').localeCompare(
    String(right?.cccd || right?.student_id || right?.id || ''),
    'vi',
    { sensitivity: 'base' }
  );
};

const detectExcelPreviewFormat = (exam, template) => {
  const tokens = [
    template?.name,
    template?.display_name,
    exam?.organizer_name,
    exam?.program_name,
    exam?.exam_name,
    exam?.exam_type,
  ];

  const normalizedTokens = tokens.map((value) => normalizePreviewToken(value)).filter(Boolean);

  if (normalizedTokens.some((value) => value.includes('VEPT') || value.includes('VSTEP') || value.includes('VERSANT'))) {
    return 'vept';
  }

  if (normalizedTokens.some((value) => value.includes('PTIT') || value.includes('TIN HOC') || value.includes('TIN HỌC') || value.includes('CNTT'))) {
    return 'ptit';
  }

  return 'default-exam-list';
};

const buildExcelPreviewData = ({ exam, students, template }) => {
  const sortedStudents = [...(students || [])].sort(compareStudentsForExcelPreview);
  const previewFormat = detectExcelPreviewFormat(exam, template);
  const examDateLabel = formatDateVN(exam?.exam_date, true) || formatDateVN(exam?.exam_date) || 'Chưa có';

  if (previewFormat === 'vept') {
    return {
      kind: 'vept',
      formatLabel: 'VEPT / VSTEP',
      sheetTitle: 'DANH SÁCH ĐĂNG KÝ THI VERSANT ENGLISH PLACEMENT TEST (VEPT)',
      organizationLine: `Tên Đơn vị/ Trường học đăng ký: ${exam?.organizer_name || exam?.program_name || ''}`,
      representativeLine: 'Đại diện đăng ký:',
      phoneLine: 'Số điện thoại:',
      centerLine: 'Phần dành cho trung tâm',
      leftHeaders: ['STT', 'Họ và tên đệm', 'Tên', 'Giới tính', 'Ngày sinh', 'Tháng sinh', 'Năm sinh', 'Số CMND/ Hộ chiếu', 'Điện thoại', 'Email (Thí sinh điền đúng thông tin để nhận kết quả thi)', 'Đơn vị công tác/ Trường học', 'Vị trí công tác', 'Nhu cầu đăng ký trình độ (A1, A2, B1, B2, C1, C2)', 'Nhu cầu đăng ký thi ngày', 'Mục đích tham dự thi', 'Nguồn đăng kí'],
      rightHeaders: ['Kiểm tra hồ sơ dự thi', 'Ngày thi', 'Giờ thi', 'Địa điểm thi'],
      rows: sortedStudents.map((student, index) => {
        const { ho, ten } = getStudentNameParts(student);
        const date = parseExamDateTime(student?.ngay_sinh);
        return [
          index + 1,
          ho,
          ten,
          student?.gioi_tinh || '',
          date ? String(date.getDate()).padStart(2, '0') : '',
          date ? String(date.getMonth() + 1).padStart(2, '0') : '',
          date ? String(date.getFullYear()) : '',
          student?.cccd || '',
          student?.sdt || '',
          student?.email || '',
          student?.don_vi_cong_tac || '',
          '',
          exam?.exam_level || exam?.level_name || '',
          examDateLabel,
          '',
          '',
          '',
          '',
          '',
          exam?.location || '',
        ];
      }),
    };
  }

  return {
    kind: 'exam-list',
    formatLabel: previewFormat === 'ptit' ? 'PTIT / Tin học' : 'Danh sách dự thi mặc định',
    sheetTitle: exam?.exam_name || 'Danh sách dự thi',
    titleLines: [
      'CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO',
      'THEO THÔNG TƯ 03/2014/TT-BTTTT',
      previewFormat === 'ptit' && exam?.exam_name ? `DANH SÁCH DỰ THI - ${exam.exam_name}` : 'DANH SÁCH DỰ THI',
    ],
    infoLines: [
      `Thời gian: ${examDateLabel}`,
      `Địa điểm thi: ${exam?.location || 'Chưa xác định'}`,
    ],
    headers: ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', 'KÝ TÊN', 'GHI CHÚ'],
    subHeaders: ['LT', 'TH'],
    rows: sortedStudents.map((student, index) => {
      const { ho, ten } = getStudentNameParts(student);
      return [
        index + 1,
        '',
        student?.cccd || '',
        ho,
        ten,
        formatDateVN(student?.ngay_sinh) || '',
        student?.noi_sinh || '',
        student?.gioi_tinh || '',
        student?.dan_toc || '',
        '',
        '',
        '',
        '',
      ];
    }),
  };
};

const renderPreviewCell = (value, fallback = '-') => {
  if (value === 0) return '0';
  if (value) return value;
  return <span className="text-slate-300">{fallback}</span>;
};

const ExcelPreviewVeptTable = ({ preview }) => (
  <div className="min-w-[1680px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
    <table className="min-w-full border-collapse text-[13px] text-slate-700">
      <tbody>
        <tr>
          <th colSpan={20} className="border border-slate-300 bg-white px-4 py-3 text-center text-lg font-black uppercase tracking-[0.08em] text-slate-900">
            {preview.sheetTitle}
          </th>
        </tr>
        <tr>
          <td colSpan={8} className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            {preview.organizationLine}
          </td>
          <td colSpan={12} className="border border-slate-300 bg-white px-3 py-2" />
        </tr>
        <tr>
          <td colSpan={4} className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            {preview.representativeLine}
          </td>
          <td colSpan={4} className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
            {preview.phoneLine}
          </td>
          <td colSpan={8} className="border border-slate-300 bg-white px-3 py-2" />
          <td colSpan={4} className="border border-rose-300 bg-rose-100 px-3 py-2 text-center text-sm font-black uppercase tracking-[0.08em] text-rose-700">
            {preview.centerLine}
          </td>
        </tr>
        <tr>
          {preview.leftHeaders.map((header) => (
            <th key={header} className="border border-amber-300 bg-amber-100 px-2 py-3 text-center text-[12px] font-bold leading-snug text-slate-900">
              {header}
            </th>
          ))}
          {preview.rightHeaders.map((header) => (
            <th key={header} className="border border-rose-300 bg-rose-100 px-2 py-3 text-center text-[12px] font-bold leading-snug text-slate-900">
              {header}
            </th>
          ))}
        </tr>
        {preview.rows.length ? (
          preview.rows.map((row, rowIndex) => (
            <tr key={`vept-preview-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.map((value, columnIndex) => (
                <td
                  key={`vept-preview-cell-${rowIndex}-${columnIndex}`}
                  className={`border border-slate-200 px-2 py-2 align-top ${[0, 3, 4, 5, 7, 8, 12, 13, 16, 17, 18, 19].includes(columnIndex) ? 'text-center' : 'text-left'}`}
                >
                  {renderPreviewCell(value)}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={20} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
              Không có dữ liệu để preview.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const ExcelPreviewExamListTable = ({ preview }) => (
  <div className="min-w-[1220px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
    <table className="min-w-full border-collapse text-[13px] text-slate-700">
      <tbody>
        {preview.titleLines.map((line, index) => (
          <tr key={`exam-preview-title-${index}`}>
            <th
              colSpan={13}
              className={`border border-transparent px-4 py-2 text-center font-black uppercase tracking-[0.08em] text-slate-900 ${
                index === 2 ? 'text-lg' : 'text-base'
              }`}
            >
              {line}
            </th>
          </tr>
        ))}
        <tr>
          <td colSpan={5} className="px-3 py-2" />
          <td colSpan={8} className="px-3 py-2 text-left text-sm italic text-slate-600">
            {preview.infoLines[0]}
          </td>
        </tr>
        <tr>
          <td colSpan={5} className="px-3 py-2" />
          <td colSpan={8} className="px-3 py-2 text-left text-sm italic text-slate-600">
            {preview.infoLines[1]}
          </td>
        </tr>
        <tr>
          <td colSpan={13} className="px-3 py-2" />
        </tr>
        <tr className="bg-slate-200">
          {preview.headers.slice(0, 9).map((header) => (
            <th key={header} rowSpan={2} className="border border-slate-400 bg-slate-200 px-2 py-3 text-center text-[12px] font-bold leading-snug text-slate-900">
              {header}
            </th>
          ))}
          <th colSpan={2} className="border border-slate-400 bg-slate-200 px-2 py-3 text-center text-[12px] font-bold leading-snug text-slate-900">
            {preview.headers[9]}
          </th>
          {preview.headers.slice(10).map((header) => (
            <th key={header} rowSpan={2} className="border border-slate-400 bg-slate-200 px-2 py-3 text-center text-[12px] font-bold leading-snug text-slate-900">
              {header}
            </th>
          ))}
        </tr>
        <tr className="bg-slate-100">
          <th className="border border-slate-400 bg-slate-100 px-2 py-2 text-center text-[12px] font-bold text-slate-900">
            {preview.subHeaders[0]}
          </th>
          <th className="border border-slate-400 bg-slate-100 px-2 py-2 text-center text-[12px] font-bold text-slate-900">
            {preview.subHeaders[1]}
          </th>
        </tr>
        {preview.rows.length ? (
          preview.rows.map((row, rowIndex) => (
            <tr key={`exam-preview-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.map((value, columnIndex) => (
                <td
                  key={`exam-preview-cell-${rowIndex}-${columnIndex}`}
                  className={`border border-slate-200 px-2 py-2 align-top ${[0, 1, 2, 5, 7, 8, 9, 10, 11, 12].includes(columnIndex) ? 'text-center' : 'text-left'}`}
                >
                  {renderPreviewCell(value)}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={13} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
              Không có dữ liệu để preview.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const findOptionByIdentity = (options = [], value, extraKeys = []) => {
  const normalized = normalizeIdentityValue(value);
  if (!normalized) return null;

  return options.find((item: any) => {
    const candidates = ['uuid', 'code', 'name', ...extraKeys]
      .map((key) => normalizeIdentityValue(item?.[key]))
      .filter(Boolean);
    return candidates.includes(normalized);
  }) || null;
};

const matchesStudentSearch = (student, keyword) => {
  if (!keyword) return true;

  const haystack = [
    student?.ho_ten_full,
    student?.cccd,
    student?.sdt,
    student?.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(keyword);
};

const loadXlsxModule = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx-js-style').then((module) => module.default ?? module);
  }
  return xlsxModulePromise;
};

export default function ExamSchedulesPage() {
  const { success, error, toasts, removeToast } = useToast();
  const cachedExams = getAdminCache(ADMIN_CACHE_KEYS.examSchedules, ADMIN_CACHE_TTL.examSchedules) || [];
  const cachedExamCategories = getAdminCache(ADMIN_CACHE_KEYS.examCategories, ADMIN_CACHE_TTL.examTaxonomy) || [];

  const [exams, setExams] = useState(cachedExams);
  const [loading, setLoading] = useState(cachedExams.length === 0);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [conflictStudentIds, setConflictStudentIds] = useState(new Set());

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashActionId, setTrashActionId] = useState(null);
  const [trashExams, setTrashExams] = useState([]);

  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [addStudentsQuery, setAddStudentsQuery] = useState('');
  const [addStudentsLoading, setAddStudentsLoading] = useState(false);
  const [addStudentsResults, setAddStudentsResults] = useState([]);
  const [selectedAddStudentIds, setSelectedAddStudentIds] = useState(() => new Set());
  const [addingStudents, setAddingStudents] = useState(false);

  const [filter, setFilter] = useState('upcoming');
  const [examCategoryOptions, setExamCategoryOptions] = useState(cachedExamCategories); // từ DB chung (vantrangexam)
  const [organizerOptions, setOrganizerOptions] = useState([]);
  const [programOptions, setProgramOptions] = useState([]);
  const [levelOptions, setLevelOptions] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [programPlatformLoading, setProgramPlatformLoading] = useState(false);
  const [programPlatformError, setProgramPlatformError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasManualTemplateSelection, setHasManualTemplateSelection] = useState(false);

  const [formData, setFormData] = useState(createExamFormData());

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [submitting, setSubmitting] = useState(false);

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentList, setStudentList] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [selectedExamForList, setSelectedExamForList] = useState(null);
  const [studentListLoading, setStudentListLoading] = useState(false);
  const [studentTab, setStudentTab] = useState('approved'); // 'approved' | 'pending' | 'attendance'
  const [approving, setApproving] = useState(null); // student_id being approved
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showStudentDetailModal, setShowStudentDetailModal] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [showExcelPreviewModal, setShowExcelPreviewModal] = useState(false);

  // Điểm danh học tập
  const [learningAttendance, setLearningAttendance] = useState<{ online_class_id: number | null; class_name: string | null; sessions: any[]; students: any[] } | null>(null);
  const [learningAttendanceLoading, setLearningAttendanceLoading] = useState(false);

  const formPreviewDate = useMemo(
    () => composePreviewDateTime(formData.exam_date, formData.exam_time),
    [formData.exam_date, formData.exam_time]
  );

  const scheduleDays = useMemo(
    () => getScheduleDaysFromRule(formData.class_seed_schedule_rule),
    [formData.class_seed_schedule_rule]
  );

  const scheduleTimeRange = useMemo(
    () => parseScheduleTimeRange(formData.class_seed_schedule_time),
    [formData.class_seed_schedule_time]
  );

  const examSummary = useMemo(() => {
    const today = startOfCalendarDay();

    return exams.reduce((summary, exam) => {
      const examDay = startOfCalendarDay(exam.exam_date);
      summary.total += 1;
      summary.pending += getPendingCount(exam);

      if (examDay.getTime() === today.getTime()) {
        summary.today += 1;
      } else if (examDay.getTime() < today.getTime()) {
        summary.past += 1;
      } else {
        summary.upcoming += 1;
      }

      return summary;
    }, {
      total: 0,
      today: 0,
      upcoming: 0,
      past: 0,
      pending: 0,
    });
  }, [exams]);

  const normalizedStudentSearch = studentSearchTerm.trim().toLowerCase();

  const filteredApprovedStudents = useMemo(
    () => studentList.filter((student) => matchesStudentSearch(student, normalizedStudentSearch)),
    [studentList, normalizedStudentSearch]
  );

  const filteredPendingStudents = useMemo(
    () => pendingStudents.filter((student) => matchesStudentSearch(student, normalizedStudentSearch)),
    [pendingStudents, normalizedStudentSearch]
  );

  useEffect(() => {
    loadExams();
    loadExamCategories();
    loadProgramPlatform();
  }, []);
  useAdminAutoRefresh(async () => {
    await Promise.all([
      loadExams({ force: true, silent: true }),
      loadExamCategories({ force: true }),
    ]);
  }, { minIntervalMs: 12000 });

  // Load exam categories từ DB chung (teacher vantrangexam tạo → admin thấy)
  const loadExamCategories = async ({ force = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.examCategories, ADMIN_CACHE_TTL.examTaxonomy);
      if (cached) {
        setExamCategoryOptions(cached);
        return;
      }
    }

    try {
      const res = await api.getExamCategories();
      if (res?.success && Array.isArray(res.data)) {
        setExamCategoryOptions(res.data);
        setAdminCache(ADMIN_CACHE_KEYS.examCategories, res.data);
      }
    } catch (err) {
      console.error('Failed to load exam categories:', err);
    }
  };

  const loadProgramPlatform = async () => {
    setProgramPlatformLoading(true);
    setProgramPlatformError('');

    try {
      const [organizersRes, programsRes, levelsRes, templatesRes] = await Promise.allSettled([
        api.getProgramOrganizers(),
        api.getPrograms(),
        api.getProgramLevels(),
        api.getTemplates(),
      ]);

      const failures: string[] = [];

      if (organizersRes.status === 'fulfilled') {
        setOrganizerOptions(Array.isArray(organizersRes.value?.data) ? organizersRes.value.data : []);
      } else {
        setOrganizerOptions([]);
        failures.push('đơn vị tổ chức');
      }

      if (programsRes.status === 'fulfilled') {
        setProgramOptions(Array.isArray(programsRes.value?.data) ? programsRes.value.data : []);
      } else {
        setProgramOptions([]);
        failures.push('chương trình thi');
      }

      if (levelsRes.status === 'fulfilled') {
        setLevelOptions(Array.isArray(levelsRes.value?.data) ? levelsRes.value.data : []);
      } else {
        setLevelOptions([]);
        failures.push('trình độ');
      }

      if (templatesRes.status === 'fulfilled') {
        setTemplateOptions(Array.isArray(templatesRes.value?.data) ? templatesRes.value.data : []);
      } else {
        setTemplateOptions([]);
        failures.push('mẫu Excel');
      }

      if (failures.length > 0) {
        setProgramPlatformError(`Không tải được ${failures.join(', ')}. Vui lòng thử lại.`);
      }
    } catch (err) {
      console.error('Failed to load program platform:', err);
      setProgramPlatformError('Không tải được danh mục lịch thi. Vui lòng thử lại.');
    } finally {
      setProgramPlatformLoading(false);
    }
  };

  useEffect(() => {
    if (!showModal || programPlatformLoading) {
      return;
    }

    if (organizerOptions.length > 0 && programOptions.length > 0) {
      return;
    }

    loadProgramPlatform();
  }, [showModal, programPlatformLoading, organizerOptions.length, programOptions.length]);

  const loadExams = async ({ force = false, silent = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.examSchedules, ADMIN_CACHE_TTL.examSchedules);
      if (cached) {
        setExams(cached);
        if (!silent) setLoading(false);
        return;
      }
    }

    if (!silent) setLoading(true);
    try {
      const response = await api.getAllExamSchedules(200, 0);
      if (response && response.success) {
        const nextExams = response.data || [];
        setExams(nextExams);
        setAdminCache(ADMIN_CACHE_KEYS.examSchedules, nextExams);
        return nextExams;
      } else {
        setExams([]);
        if (response && response.message) {
          error(response.message);
        }
        return [];
      }
    } catch (err) {
      console.error('Error loading exams:', err);
      setExams([]);
      showError(err, { error });
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadTrashExams = async () => {
    setTrashLoading(true);
    try {
      const response = await api.getTrashExamSchedules();
      if (response?.success) {
        setTrashExams(response.data || []);
      } else {
        setTrashExams([]);
        error(response?.message || 'Không thể tải thùng rác');
      }
    } catch (err) {
      console.error('Error loading trash exams:', err);
      setTrashExams([]);
      showError(err, { error });
    } finally {
      setTrashLoading(false);
    }
  };

  const handleViewStudents = async (exam) => {
    setStudentListLoading(true);
    setSelectedExamForList(exam);
    setShowStudentsModal(true);
    setStudentTab('approved');
    setStudentSearchTerm('');
    setStudentList([]);
    setPendingStudents([]);
    setConflictStudentIds(new Set());
    setLearningAttendance(null); // reset khi đổi sang exam khác

    try {
      // Load both approved and pending in parallel
      const [approvedRes, pendingRes] = await Promise.all([
        api.getExamStudents(exam.id, { withZoomCheckin: true }),
        api.getPendingExamStudents(exam.id)
      ]);

      if (approvedRes.success) {
        setStudentList(approvedRes.data || []);
      }
      if (pendingRes.success) {
        setPendingStudents(pendingRes.data || []);
      }

      // Also check conflicts so we can warn in the list UI
      try {
        const conflictsRes = await api.getExamRegistrationConflicts();
        const conflictList = conflictsRes?.success ? (conflictsRes.data || []) : [];
        const conflictSet = new Set((conflictList || []).map(x => Number(x.student_id)));
        setConflictStudentIds(conflictSet);

        const approvedIds = new Set((approvedRes.data || []).map(s => Number(s.student_id)));
        const pendingIds = new Set((pendingRes.data || []).map(s => Number(s.student_id)));
        let hit = 0;
        conflictSet.forEach(id => {
          if (approvedIds.has(id) || pendingIds.has(id)) hit++;
        });
        if (hit > 0) {
          error(`Cảnh báo: có ${hit} thí sinh đang bị trùng đăng ký thi. Bấm "Kiểm tra trùng đăng ký" để xem chi tiết.`);
        }
      } catch {
        // Ignore conflict check errors to avoid blocking the modal
      }
    } catch (err) {
      showError(err);
    } finally {
      setStudentListLoading(false);
    }
  };

  const loadLearningAttendance = async (examId: number) => {
    setLearningAttendanceLoading(true);
    try {
      const res = await (api as any).getExamLearningAttendance(examId);
      if (res?.success) {
        setLearningAttendance(res.data);
      }
    } catch (err) {
      console.error('Error loading learning attendance:', err);
    } finally {
      setLearningAttendanceLoading(false);
    }
  };

  const refreshSelectedExamStudents = async () => {
    if (!selectedExamForList?.id) return;
    try {
      const [approvedRes, pendingRes, conflictsRes, nextExams] = await Promise.all([
        api.getExamStudents(selectedExamForList.id, { withZoomCheckin: true }),
        api.getPendingExamStudents(selectedExamForList.id),
        api.getExamRegistrationConflicts().catch(() => null),
        loadExams({ force: true, silent: true }),
      ]);

      const approvedData = approvedRes?.success ? (approvedRes.data || []) : [];
      const pendingData = pendingRes?.success ? (pendingRes.data || []) : [];
      setStudentList(approvedData);
      setPendingStudents(pendingData);

      const conflictList = conflictsRes?.success ? (conflictsRes.data || []) : [];
      setConflictStudentIds(new Set(conflictList.map((item) => Number(item.student_id))));

      if (Array.isArray(nextExams)) {
        const updatedExam = nextExams.find((item) => Number(item.id) === Number(selectedExamForList.id));
        if (updatedExam) {
          setSelectedExamForList(updatedExam);
        }
      }
    } catch (err) {
      console.error('Error refreshing exam students:', err);
    }
  };

  const handleOpenTrash = async () => {
    setShowTrashModal(true);
    await loadTrashExams();
  };

  const openAddStudentsModal = () => {
    setShowAddStudentsModal(true);
    setAddStudentsQuery('');
    setAddStudentsResults([]);
    setSelectedAddStudentIds(new Set());
  };

  const handleSearchAddStudents = async () => {
    const q = String(addStudentsQuery || '').trim();
    if (q.length < 2) {
      error('Nhập ít nhất 2 ký tự để tìm kiếm');
      return;
    }

    setAddStudentsLoading(true);
    try {
      const res = await api.searchStudents(q);
      if (res?.success) {
        const existingIds = new Set(
          [...studentList, ...pendingStudents]
            .map((student) => Number(student.student_id || student.id))
            .filter(Boolean)
        );
        const filtered = (res.data || []).filter((student) => !existingIds.has(Number(student.id)));
        setAddStudentsResults(filtered);
      } else {
        setAddStudentsResults([]);
        error(res?.message || 'Không thể tìm kiếm học viên');
      }
    } catch (err) {
      console.error('Error searching students:', err);
      showError(err, { error });
    } finally {
      setAddStudentsLoading(false);
    }
  };

  const toggleSelectAddStudent = (id) => {
    setSelectedAddStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelectedStudents = async (force = false) => {
    if (!selectedExamForList?.id) return;
    const ids = Array.from(selectedAddStudentIds || []);
    if (ids.length === 0) {
      error('Chưa chọn học viên nào');
      return;
    }

    setAddingStudents(true);
    try {
      const res = await api.addStudentsToExamWithForce(selectedExamForList.id, ids, force);
      if (res?.success) {
        const results = res.results || [];
        const ok = results.filter(r => r.status === 'success').length;
        const blocked = results.filter(r => r.status === 'blocked').length;
        const failed = results.filter(r => r.status === 'error').length;

        success(`Đã thêm: ${ok}. Bị chặn: ${blocked}. Lỗi: ${failed}.`);
        await refreshSelectedExamStudents();
        setShowAddStudentsModal(false);
      } else {
        error(res?.message || 'Không thể thêm thí sinh');
      }
    } catch (err) {
      console.error('Error adding students to exam:', err);
      showError(err, { error });
    } finally {
      setAddingStudents(false);
    }
  };

  const handleViewDuplicateHistory = async (student) => {
    if (!student?.student_id) return;
    setHistoryStudent(student);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryRows([]);

    try {
      const res = await api.getStudentExamRegistrationHistory(student.student_id);
      if (res?.success) {
        setHistoryRows(res.data || []);
      } else {
        error(res?.message || 'Không thể lấy lịch sử đăng ký');
      }
    } catch (err) {
      console.error('Error loading student registration history:', err);
      showError(err, { error });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApproveStudent = async (student) => {
    setApproving(student.student_id);
    try {
      const response = await api.approveExamStudent(selectedExamForList.id, student.student_id);
      if (response.success) {
        success(`Đã duyệt thí sinh ${student.ho_ten_full}`);
        await refreshSelectedExamStudents();
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setApproving(null);
    }
  };

  const handleRejectStudent = (student) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Từ chối thí sinh',
      message: `Bạn có chắc chắn muốn từ chối thí sinh "${student.ho_ten_full}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.rejectExamStudent(selectedExamForList.id, student.student_id);
          if (response.success) {
            success('Đã từ chối thí sinh');
            await refreshSelectedExamStudents();
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const handleApproveAll = async () => {
    if (pendingStudents.length === 0) return;
    setApproving('all');
    try {
      const response = await api.approveAllExamStudents(selectedExamForList.id);
      if (response.success) {
        success(`Đã duyệt tất cả ${pendingStudents.length} thí sinh`);
        await refreshSelectedExamStudents();
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setApproving(null);
    }
  };

  const handleRemoveStudent = (student) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa thí sinh khỏi kỳ thi',
      message: `Bạn có chắc chắn muốn xóa thí sinh "${student.ho_ten_full}" khỏi kỳ thi "${selectedExamForList?.exam_name}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.removeStudentFromExam(selectedExamForList.id, student.student_id);
          if (response.success) {
            success('Đã xóa thí sinh khỏi kỳ thi');
            await refreshSelectedExamStudents();
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const filteredExams = useMemo(() => {
    let result = [...exams];
    const today = startOfCalendarDay();

    if (filter === 'upcoming') {
      result = result.filter((exam) => startOfCalendarDay(exam.exam_date).getTime() >= today.getTime());
    } else if (filter === 'past') {
      result = result.filter((exam) => startOfCalendarDay(exam.exam_date).getTime() < today.getTime());
    }

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.trim().toLowerCase();
      result = result.filter((exam) => {
        const haystack = [
          exam.exam_name,
          exam.location,
          exam.notes,
          exam.exam_type,
          exam.exam_level,
          exam.organizer_name,
          exam.program_name,
          exam.level_name,
          exam.class_seed_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(lowerSearch);
      });
    }

    return result.sort((a, b) => {
      const timeA = getExamTimestamp(a.exam_date);
      const timeB = getExamTimestamp(b.exam_date);
      return filter === 'past' ? timeB - timeA : timeA - timeB;
    });
  }, [exams, filter, searchTerm]);

  const examCategoryLabelById = useMemo(() => {
    return new Map(
      examCategoryOptions.map((item: any) => [Number(item.id), item.name])
    );
  }, [examCategoryOptions]);

  const selectedOrganizer = useMemo(
    () => findOptionByIdentity(organizerOptions, formData.organizer_uuid),
    [formData.organizer_uuid, organizerOptions]
  );

  const selectedProgram = useMemo(
    () => findOptionByIdentity(programOptions, formData.program_uuid),
    [formData.program_uuid, programOptions]
  );

  const selectedLevel = useMemo(
    () => findOptionByIdentity(levelOptions, formData.level_uuid),
    [formData.level_uuid, levelOptions]
  );

  const selectedTemplate = useMemo(
    () => findExamTemplateOption(templateOptions, formData.template_id),
    [templateOptions, formData.template_id]
  );

  const selectedExamTemplate = useMemo(
    () => findExamTemplateOption(templateOptions, selectedExamForList?.template_id),
    [templateOptions, selectedExamForList?.template_id]
  );

  const excelPreviewData = useMemo(
    () => buildExcelPreviewData({
      exam: selectedExamForList,
      students: studentList,
      template: selectedExamTemplate,
    }),
    [selectedExamForList, studentList, selectedExamTemplate]
  );

  const filteredProgramOptions = useMemo(() => {
    const organizerUuid = selectedOrganizer?.uuid || formData.organizer_uuid;
    if (!organizerUuid) {
      return programOptions;
    }

    return programOptions.filter(
      (item: any) => String(item.organizerUuid) === String(organizerUuid)
    );
  }, [selectedOrganizer, formData.organizer_uuid, programOptions]);

  const filteredLevelOptions = useMemo(() => {
    const programUuid = selectedProgram?.uuid || formData.program_uuid;
    if (!programUuid) {
      return [];
    }

    return levelOptions.filter(
      (item: any) => String(item.programUuid) === String(programUuid)
    );
  }, [selectedProgram, formData.program_uuid, levelOptions]);

  const usesExternalExamLink = useMemo(
    () => selectedProgram?.deliveryMode === 'external_redirect',
    [selectedProgram]
  );
  const zoomMeetingEnabled = Boolean(formData.enable_zoom_meeting);
  const linkedClassForcedByZoom = !usesExternalExamLink && zoomMeetingEnabled;
  const linkedClassEnabled = !usesExternalExamLink && (Boolean(formData.enable_linked_class) || linkedClassForcedByZoom);

  useEffect(() => {
    if (!showModal || templateOptions.length === 0) {
      return;
    }

    const suggestedTemplateId = suggestExamTemplateId({
      selectedOrganizerUuid: formData.organizer_uuid,
      selectedProgramUuid: formData.program_uuid,
      organizers: organizerOptions,
      programs: programOptions,
      templates: templateOptions,
    });

    setFormData((current) => {
      const currentTemplateId = current.template_id ? String(current.template_id) : '';
      const shouldKeepSavedEditTemplate = Boolean(editingExam && currentTemplateId);
      const shouldKeepManualSelection = Boolean(hasManualTemplateSelection && currentTemplateId);

      if (shouldKeepSavedEditTemplate || shouldKeepManualSelection) {
        return current;
      }

      const nextTemplateId = suggestedTemplateId || '';
      if (currentTemplateId === nextTemplateId) {
        return current;
      }

      return {
        ...current,
        template_id: nextTemplateId,
      };
    });
  }, [
    showModal,
    editingExam,
    hasManualTemplateSelection,
    formData.organizer_uuid,
    formData.program_uuid,
    organizerOptions,
    programOptions,
    templateOptions,
  ]);

  const updateFormField = (key, value) => {
    if (key === 'template_id') {
      setHasManualTemplateSelection(true);
    }

    setFormData((current) => {
      const next = { ...current, [key]: value };

      if (
        !editingExam &&
        key === 'exam_name' &&
        (!current.class_seed_name || current.class_seed_name === `${current.exam_name} - Lớp ôn tập`)
      ) {
        next.class_seed_name = value ? `${value} - Lớp ôn tập` : '';
      }

      if (
        key === 'exam_date' &&
        (!current.class_seed_start_date || current.class_seed_start_date === current.exam_date)
      ) {
        next.class_seed_start_date = value;
      }

      if (key === 'organizer_uuid' && current.organizer_uuid !== value) {
        next.program_uuid = '';
        next.level_uuid = '';
      }

      if (key === 'program_uuid' && current.program_uuid !== value) {
        const nextProgram = programOptions.find((item: any) => String(item.uuid) === String(value));
        next.level_uuid = '';
        next.exam_level = '';
        if (nextProgram?.deliveryMode === 'external_redirect') {
          next.enable_linked_class = false;
          next.class_seed_name = '';
          next.class_seed_description = '';
        }
      }

      if (key === 'level_uuid') {
        const nextLevel = levelOptions.find((item: any) => String(item.uuid) === String(value));
        next.exam_level = nextLevel?.code || '';
      }

      if (key === 'enable_zoom_meeting' && value === true && !usesExternalExamLink) {
        next.enable_linked_class = true;

        if (!next.class_seed_name?.trim()) {
          next.class_seed_name = next.exam_name?.trim()
            ? `${next.exam_name.trim()} - Lớp ôn tập`
            : '';
        }

        if (!next.class_seed_schedule_rule?.trim()) {
          next.class_seed_schedule_rule = DEFAULT_CLASS_SEED_RULE;
        }

        if (!next.class_seed_schedule_time?.trim()) {
          next.class_seed_schedule_time = DEFAULT_CLASS_SEED_TIME;
        }

        if (!next.class_seed_start_date) {
          next.class_seed_start_date = next.exam_date || '';
        }
      }

      return next;
    });
  };

  const applySchedulePreset = (preset) => {
    setFormData((current) => ({
      ...current,
      class_seed_schedule_rule: preset.rule,
      class_seed_schedule_time: preset.time,
    }));
  };

  const toggleScheduleDay = (day) => {
    setFormData((current) => {
      const nextDays = new Set(getScheduleDaysFromRule(current.class_seed_schedule_rule));
      if (nextDays.has(day)) {
        nextDays.delete(day);
      } else {
        nextDays.add(day);
      }

      const orderedDays = Array.from(nextDays).sort((a, b) => a - b);
      return {
        ...current,
        class_seed_schedule_rule: orderedDays.length ? `WEEKLY:${orderedDays.join(',')}` : '',
      };
    });
  };

  const updateScheduleTimeBoundary = (boundary, nextValue) => {
    setFormData((current) => {
      const currentRange = parseScheduleTimeRange(current.class_seed_schedule_time);
      const nextRange = {
        ...currentRange,
        [boundary]: nextValue,
      };

      return {
        ...current,
        class_seed_schedule_time: `${nextRange.start || ''}-${nextRange.end || ''}`,
      };
    });
  };

  const handleCreate = () => {
    setEditingExam(null);
    setHasManualTemplateSelection(false);
    setFormData(createExamFormData());
    setShowModal(true);
  };

  const handleOpenConflicts = async () => {
    setShowConflictsModal(true);
    setConflictsLoading(true);
    setConflicts([]);
    try {
      const res = await api.getExamRegistrationConflicts();
      if (res?.success) {
        setConflicts(res.data || []);
      } else {
        error(res?.message || 'Không thể lấy dữ liệu trùng');
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setConflictsLoading(false);
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setHasManualTemplateSelection(false);
    const dateStr = formatExamDateInputValue(exam.exam_date);

    setFormData(createExamFormData({
      exam_name: exam.exam_name,
      exam_date: dateStr,
      exam_time: formatTime(exam.exam_date),
      duration_minutes: exam.duration_minutes != null ? String(exam.duration_minutes) : '',
      location: exam.location || '',
      notes: exam.notes || '',
      zoom_link: exam.zoom_link || '',
      zoom_link_backup: exam.zoom_link_backup || '',
      zoom_meeting_id: exam.zoom_meeting_id || '',
      zoom_passcode: exam.zoom_passcode || '',
      zoom_meeting_id_backup: exam.zoom_meeting_id_backup || '',
      zoom_passcode_backup: exam.zoom_passcode_backup || '',
      enable_zoom_meeting: hasConfiguredZoomMeeting(exam),
      organizer_uuid: exam.organizer_uuid || '',
      program_uuid: exam.program_uuid || '',
      level_uuid: exam.level_uuid || '',
      exam_level: exam.level_code || exam.exam_level || '',
      exam_category_id: exam.exam_category_id ? String(exam.exam_category_id) : '',
      exam_type_id: exam.exam_type_id ? String(exam.exam_type_id) : '',
      template_id: exam.template_id ? String(exam.template_id) : '',
      enable_linked_class: hasConfiguredLinkedClass(exam),
      class_seed_name: exam.class_seed_name || `${exam.exam_name} - Lớp ôn tập`,
      class_seed_description: exam.class_seed_description || exam.notes || '',
      class_seed_schedule_rule: exam.class_seed_schedule_rule || DEFAULT_CLASS_SEED_RULE,
      class_seed_schedule_time: exam.class_seed_schedule_time || DEFAULT_CLASS_SEED_TIME,
      class_seed_timezone: exam.class_seed_timezone || DEFAULT_CLASS_SEED_TIMEZONE,
      class_seed_start_date: exam.class_seed_start_date || dateStr,
      class_seed_end_date: exam.class_seed_end_date || '',
      class_seed_max_students: exam.class_seed_max_students || DEFAULT_CLASS_SEED_MAX_STUDENTS,
    }));
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (programPlatformLoading) {
      error('Đang tải danh mục lịch thi. Vui lòng chờ tải xong rồi thử lại.');
      return;
    }

    if (organizerOptions.length === 0 || programOptions.length === 0) {
      error(programPlatformError || 'Chưa tải được đơn vị tổ chức hoặc chương trình thi. Vui lòng tải lại danh mục.');
      return;
    }

    // Validation
    if (!formData.exam_name?.trim()) {
      error('Vui lòng nhập tên kỳ thi');
      return;
    }
    if (!formData.exam_date) {
      error('Vui lòng chọn ngày thi');
      return;
    }
    if (!formData.exam_time) {
      error('Vui lòng chọn giờ bắt đầu');
      return;
    }
    const organizerUuid = selectedOrganizer?.uuid || formData.organizer_uuid || '';
    const programUuid = selectedProgram?.uuid || formData.program_uuid || '';
    const levelUuid = selectedLevel?.uuid || formData.level_uuid || '';

    if (!organizerUuid) {
      error('Vui lòng chọn đơn vị tổ chức');
      return;
    }
    if (!programUuid) {
      error('Vui lòng chọn chương trình thi');
      return;
    }
    if (filteredLevelOptions.length > 0 && !levelUuid) {
      error('Vui lòng chọn trình độ');
      return;
    }
    if (formData.duration_minutes !== '') {
      const parsedDuration = Number.parseInt(String(formData.duration_minutes), 10);
      if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
        error('Thời lượng phải là số dương hợp lệ');
        return;
      }
    }
    if (linkedClassEnabled && !formData.class_seed_name?.trim()) {
      error('Vui lòng nhập tên lớp học tự động');
      return;
    }
    if (linkedClassEnabled && !formData.class_seed_schedule_rule?.trim()) {
      error('Vui lòng nhập quy tắc lịch học');
      return;
    }
    if (linkedClassEnabled && !formData.class_seed_schedule_time?.trim()) {
      error('Vui lòng nhập khung giờ học');
      return;
    }
    if (linkedClassEnabled && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(formData.class_seed_schedule_time.trim())) {
      error('Khung giờ học phải có định dạng HH:MM-HH:MM');
      return;
    }
    if (
      linkedClassEnabled &&
      formData.class_seed_schedule_rule.trim().toUpperCase().startsWith('WEEKLY:') &&
      getScheduleDaysFromRule(formData.class_seed_schedule_rule).length === 0
    ) {
      error('Vui lòng chọn ít nhất một ngày học cho lớp ôn tập');
      return;
    }
    if (linkedClassEnabled && !formData.class_seed_start_date) {
      error('Vui lòng chọn ngày bắt đầu lớp học');
      return;
    }

    setSubmitting(true);
    try {
      const examDatePayload = buildVietnamDateTimePayload(formData.exam_date, formData.exam_time);
      if (!examDatePayload) {
        error('Ngày thi không hợp lệ');
        setSubmitting(false);
        return;
      }

      const durationMinutes = formData.duration_minutes === ''
        ? null
        : Number.parseInt(String(formData.duration_minutes), 10);
      const payload = {
        exam_name: formData.exam_name.trim(),
        exam_date: examDatePayload,
        duration_minutes: durationMinutes,
        location: formData.location?.trim() || '',
        notes: formData.notes?.trim() || '',
        class_id: null,
        enable_zoom_meeting: zoomMeetingEnabled,
        zoom_link: zoomMeetingEnabled ? (formData.zoom_link?.trim() || null) : null,
        zoom_link_backup: zoomMeetingEnabled ? (formData.zoom_link_backup?.trim() || null) : null,
        zoom_link_backup_2: null,
        zoom_link_backup_3: null,
        zoom_meeting_id: zoomMeetingEnabled ? (formData.zoom_meeting_id?.trim() || null) : null,
        zoom_passcode: zoomMeetingEnabled ? (formData.zoom_passcode?.trim() || null) : null,
        zoom_meeting_id_backup: zoomMeetingEnabled ? (formData.zoom_meeting_id_backup?.trim() || null) : null,
        zoom_passcode_backup: zoomMeetingEnabled ? (formData.zoom_passcode_backup?.trim() || null) : null,
        organizer_uuid: organizerUuid || null,
        program_uuid: programUuid || null,
        level_uuid: levelUuid || null,
        exam_level: selectedLevel?.code || formData.exam_level?.trim() || null,
        exam_category_id: formData.exam_category_id ? parseInt(formData.exam_category_id, 10) : undefined,
        exam_type_id: formData.exam_type_id ? parseInt(formData.exam_type_id, 10) : undefined,
        template_id: formData.template_id ? parseInt(formData.template_id, 10) : undefined,
        enable_linked_class: linkedClassEnabled,
        class_seed: linkedClassEnabled
          ? {
              name: formData.class_seed_name?.trim(),
              description: formData.class_seed_description?.trim() || null,
              schedule_rule: formData.class_seed_schedule_rule?.trim().toUpperCase(),
              schedule_time: formData.class_seed_schedule_time?.trim(),
              timezone: formData.class_seed_timezone?.trim() || DEFAULT_CLASS_SEED_TIMEZONE,
              start_date: formData.class_seed_start_date,
              end_date: formData.class_seed_end_date || null,
              max_students: parseInt(formData.class_seed_max_students, 10) || DEFAULT_CLASS_SEED_MAX_STUDENTS,
            }
          : null,
      };

      let response;
      if (editingExam) {
        response = await api.updateExamSchedule(editingExam.id, payload);
        if (response.success) {
          success('Cập nhật lịch thi thành công');
        }
      } else {
        response = await api.createExamSchedule(payload);
        if (response.success) {
          success('Tạo lịch thi thành công');
        }
      }

      if (response?.success) {
        setShowModal(false);
        invalidateAdminData({
          keys: [ADMIN_CACHE_KEYS.examSchedules],
          source: 'exam-schedules',
        });
        loadExams({ force: true });
      } else {
        error(response?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showError(err, { error });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (exam) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Chuyển vào thùng rác',
      message: `Bạn có chắc chắn muốn chuyển kỳ thi "${exam.exam_name}" vào thùng rác? Bạn vẫn có thể khôi phục trong vòng 7 ngày.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.deleteExamSchedule(exam.id);
          if (response.success) {
            success(response?.message || 'Đã chuyển lịch thi vào thùng rác');
            if (Number(selectedExamForList?.id) === Number(exam.id)) {
              setShowStudentsModal(false);
              setSelectedExamForList(null);
            }
            invalidateAdminData({
              keys: [ADMIN_CACHE_KEYS.examSchedules],
              source: 'exam-schedules',
            });
            await loadExams({ force: true });
            if (showTrashModal) {
              await loadTrashExams();
            }
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const handleRestoreExam = async (examId) => {
    setTrashActionId(examId);
    try {
      const response = await api.restoreExamSchedule(examId);
      if (response?.success) {
        success(response?.message || 'Khôi phục lịch thi thành công');
        invalidateAdminData({
          keys: [ADMIN_CACHE_KEYS.examSchedules],
          source: 'exam-schedules',
        });
        await Promise.all([
          loadExams({ force: true, silent: true }),
          loadTrashExams(),
        ]);
      } else {
        error(response?.message || 'Không thể khôi phục lịch thi');
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setTrashActionId(null);
    }
  };

  const handlePermanentDeleteExam = (exam) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa vĩnh viễn lịch thi',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn "${exam.exam_name}" khỏi thùng rác? Thao tác này không thể hoàn tác.`,
      type: 'danger',
      onConfirm: async () => {
        setTrashActionId(exam.id);
        try {
          const response = await api.permanentDeleteExamSchedule(exam.id);
          if (response?.success) {
            success(response?.message || 'Đã xóa vĩnh viễn lịch thi');
            invalidateAdminData({
              keys: [ADMIN_CACHE_KEYS.examSchedules],
              source: 'exam-schedules',
            });
            await loadTrashExams();
          } else {
            error(response?.message || 'Không thể xóa vĩnh viễn lịch thi');
          }
        } catch (err) {
          showError(err, { error });
        } finally {
          setTrashActionId(null);
        }
      },
    });
  };

  const exportStudentListToExcel = async () => {
    if (!selectedExamForList?.id) {
      error('Không xác định được kỳ thi để xuất.');
      return;
    }

    if (!studentList.length) {
      error('Không có dữ liệu để xuất.');
      return;
    }

    try {
      // Always delegate to backend so the saved template_id is the single source of truth.
      await api.downloadExamListExcel(selectedExamForList.id);
    } catch (err) {
      showError(err, { error });
    }
  };

  const handleOpenExcelPreview = () => {
    if (!selectedExamForList?.id) {
      error('Không xác định được kỳ thi để preview.');
      return;
    }

    if (!studentList.length) {
      error('Không có dữ liệu để preview.');
      return;
    }

    setShowExcelPreviewModal(true);
  };

  const handleOpenStudentDetail = async (student) => {
    try {
      const response = await api.getStudentByCCCD(student.cccd);
      setSelectedStudentDetail(response?.data || response || student);
    } catch (err) {
      console.error('Failed to load student detail:', err);
      setSelectedStudentDetail(student);
    } finally {
      setShowStudentDetailModal(true);
    }
  };

  // ── VSTEP / VEPT FORMAT ──────────────────────────────────────────────────
  // Copy đúng giao diện file "danh sách thi.xlsx":
  //   Row 1: DANH SÁCH ĐĂNG KÝ THI VERSANT... (merge A1:L1)
  //   Row 2: Tên Đơn vị... (merge A2:H2)
  //   Row 3: Đại diện | SĐT (E3) | Phần dành cho trung tâm (Q3)
  //   Row 4: 20 headers (A–T) — A–P vàng nhạt, Q–T đỏ nhạt
  //   Row 5+: data thí sinh
  const exportVstepFormat = async () => {
    const XLSX = await loadXlsxModule();
    const examDate = parseExamDateTime(selectedExamForList?.exam_date) || new Date();

    const splitName = (fullName) => {
      if (!fullName) return { ho: '', ten: '' };
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) return { ho: '', ten: parts[0] };
      const ten = parts.pop();
      return { ho: parts.join(' '), ten };
    };

    // ── Styles ──
    const font = (opts = {}) => ({ name: 'Times New Roman', sz: 11, ...opts });

    const titleStyle = {
      font: font({ bold: true, sz: 13 }),
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    const labelStyle = {
      font: font({ sz: 11 }),
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    // Header vàng (cột A–P: phần thí sinh điền)
    const hdYellow = {
      font: font({ bold: true, sz: 10, color: { rgb: '000000' } }),
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFFF99' } },
      border: {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } },
      },
    };
    // Header đỏ nhạt (cột Q–T: phần trung tâm)
    const hdRed = {
      font: font({ bold: true, sz: 10, color: { rgb: '000000' } }),
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFCCCC' } },
      border: {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } },
      },
    };
    // Ô data thường
    const dataStyle = (align = 'left') => ({
      font: font({ sz: 11 }),
      alignment: { horizontal: align, vertical: 'center', wrapText: false },
      border: {
        top:    { style: 'thin', color: { rgb: 'AAAAAA' } },
        bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
        left:   { style: 'thin', color: { rgb: 'AAAAAA' } },
        right:  { style: 'thin', color: { rgb: 'AAAAAA' } },
      },
    });

    const wb = XLSX.utils.book_new();
    const ws = {};

    // ── Row 1: Tiêu đề ──
    ws['A1'] = { v: 'DANH SÁCH ĐĂNG KÝ THI VERSANT ENGLISH PLACEMENT TEST (VEPT)', t: 's', s: titleStyle };

    // ── Row 2: Đơn vị ──
    ws['A2'] = { v: 'Tên Đơn vị/ Trường học đăng ký: ', t: 's', s: labelStyle };

    // ── Row 3: Đại diện | SĐT | Phần trung tâm ──
    ws['A3'] = { v: 'Đại diện đăng ký: ', t: 's', s: labelStyle };
    ws['E3'] = { v: 'Số điện thoại:', t: 's', s: labelStyle };
    ws['Q3'] = { v: 'Phần dành cho trung tâm', t: 's', s: { font: font({ bold: true, sz: 11 }), alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: 'FFCCCC' } } } };

    // ── Row 4: Headers 20 cột ──
    const headersLeft  = ['STT','Họ và tên đệm','Tên','Giới tính','Ngày sinh','Tháng sinh ','Năm sinh','Số CMND/ Hộ chiếu','Điện thoại','Email (Thí sinh điền đúng thông tin để nhận kết quả thi)','Đơn vị công tác/ Trường học','Vị trí công tác','Nhu cầu đăng ký trình độ (A1, A2, B1, B2, C1, C2)','Nhu cầu đăng ký thi ngày','Mục đích tham dự thi (Ghi rõ làm đầu vào, đầu ra sinh viên, thạc sĩ, tiến sĩ…)','Nguồn đăng kí '];
    const headersRight = ['Kiểm tra hồ sơ dự thi','Ngày thi','Giờ thi','Địa điểm thi'];

    headersLeft.forEach((h, i) => {
      ws[`${XLSX.utils.encode_col(i)}4`] = { v: h, t: 's', s: hdYellow };
    });
    headersRight.forEach((h, i) => {
      ws[`${XLSX.utils.encode_col(16 + i)}4`] = { v: h, t: 's', s: hdRed };
    });

    // ── Data rows từ row 5 ── sort theo Tên A→Z
    const sorted = [...studentList].sort((a, b) => {
      const tenA = splitName(a.ho_ten_full).ten || '';
      const tenB = splitName(b.ho_ten_full).ten || '';
      return tenA.localeCompare(tenB, 'vi', { sensitivity: 'base' });
    });

    sorted.forEach((s, idx) => {
      const { ho, ten } = splitName(s.ho_ten_full);
      const dob = s.ngay_sinh ? parseExamDateTime(s.ngay_sinh) || new Date(s.ngay_sinh) : null;
      const row = 5 + idx;
      const dc = dataStyle('center');
      const dl = dataStyle('left');

      ws[`A${row}`] = { v: idx + 1,                                                    t: 'n', s: dc };
      ws[`B${row}`] = { v: ho,                                                          t: 's', s: dl };
      ws[`C${row}`] = { v: ten,                                                         t: 's', s: dl };
      ws[`D${row}`] = { v: s.gioi_tinh || '',                                           t: 's', s: dc };
      ws[`E${row}`] = { v: dob ? String(dob.getDate()).padStart(2, '0') : '',           t: 's', s: dc };
      ws[`F${row}`] = { v: dob ? String(dob.getMonth() + 1).padStart(2, '0') : '',     t: 's', s: dc };
      ws[`G${row}`] = { v: dob ? String(dob.getFullYear()) : '',                        t: 's', s: dc };
      ws[`H${row}`] = { v: s.cccd || '',                                                t: 's', s: dc };
      ws[`I${row}`] = { v: s.sdt || '',                                                 t: 's', s: dc };
      ws[`J${row}`] = { v: s.email || '',                                               t: 's', s: dl };
      ws[`K${row}`] = { v: '',                                                          t: 's', s: dl }; // Đơn vị
      ws[`L${row}`] = { v: '',                                                          t: 's', s: dc }; // Vị trí
      ws[`M${row}`] = { v: selectedExamForList?.exam_level || '',                       t: 's', s: dc }; // Trình độ
      ws[`N${row}`] = { v: '',                                                          t: 's', s: dc }; // Ngày đăng ký thi
      ws[`O${row}`] = { v: '',                                                          t: 's', s: dl }; // Mục đích
      ws[`P${row}`] = { v: '',                                                          t: 's', s: dc }; // Nguồn
      ws[`Q${row}`] = { v: '',                                                          t: 's', s: dc }; // Kiểm tra HS
      ws[`R${row}`] = { v: '',                                                          t: 's', s: dc }; // Ngày thi
      ws[`S${row}`] = { v: '',                                                          t: 's', s: dc }; // Giờ thi
      ws[`T${row}`] = { v: '',                                                          t: 's', s: dc }; // Địa điểm
    });

    const lastRow = 4 + sorted.length;
    ws['!ref'] = `A1:T${lastRow}`;

    // Merge đúng như file gốc
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // A1:L1 — tiêu đề
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7  } }, // A2:H2 — đơn vị
      { s: { r: 2, c: 16 }, e: { r: 2, c: 19 } }, // Q3:T3 — phần trung tâm
    ];

    // Col widths đúng như file gốc (A–T = 20 cột)
    ws['!cols'] = [
      { wch: 5  }, // A  STT
      { wch: 20 }, // B  Họ và tên đệm
      { wch: 8  }, // C  Tên
      { wch: 9  }, // D  Giới tính
      { wch: 7  }, // E  Ngày sinh
      { wch: 8  }, // F  Tháng sinh
      { wch: 7  }, // G  Năm sinh
      { wch: 16 }, // H  CMND
      { wch: 13 }, // I  Điện thoại
      { wch: 34 }, // J  Email
      { wch: 26 }, // K  Đơn vị
      { wch: 16 }, // L  Vị trí
      { wch: 20 }, // M  Trình độ
      { wch: 18 }, // N  Ngày đăng ký
      { wch: 36 }, // O  Mục đích
      { wch: 14 }, // P  Nguồn
      { wch: 18 }, // Q  Kiểm tra HS
      { wch: 12 }, // R  Ngày thi
      { wch: 10 }, // S  Giờ thi
      { wch: 20 }, // T  Địa điểm
    ];

    // Row heights
    ws['!rows'] = [
      { hpt: 30 }, // Row 1 — tiêu đề
      { hpt: 18 }, // Row 2 — đơn vị
      { hpt: 18 }, // Row 3 — đại diện
      { hpt: 60 }, // Row 4 — header (cao để wrap text)
    ];
    for (let i = 5; i <= lastRow; i++) ws['!rows'][i - 1] = { hpt: 18 };

    // Freeze header
    ws['!freeze'] = { xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const safeExamName = (selectedExamForList?.exam_name || 'vept').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    XLSX.writeFile(wb, `VEPT_${safeExamName}_${examDate.toISOString().split('T')[0]}.xlsx`);
    success('Xuất Excel VEPT thành công!');
  };

  // ── PTIT / TIN HỌC FORMAT ────────────────────────────────────────────────
  // Format gốc: CHỨNG CHỈ ỨNG DỤNG CNTT — THEO THÔNG TƯ 03/2014
  const exportPtitFormat = async () => {
    const XLSX = await loadXlsxModule();
    const examDate = parseExamDateTime(selectedExamForList?.exam_date) || new Date();
    const examDateStr = `Thời gian: ngày ${String(examDate.getDate()).padStart(2, '0')} tháng ${String(examDate.getMonth() + 1).padStart(2, '0')} năm ${examDate.getFullYear()}`;

    // Split ho_ten_full into ho and ten
    const splitName = (fullName) => {
      if (!fullName) return { ho: '', ten: '' };
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) return { ho: '', ten: parts[0] };
      const ten = parts.pop();
      const ho = parts.join(' ');
      return { ho, ten };
    };

    // Professional Styles với màu sắc đẹp và chuyên nghiệp
    const styles = {
      title1: {
        font: { bold: true, sz: 14, name: 'Times New Roman', color: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'E7F3FF' } }
      },
      title2: {
        font: { bold: true, sz: 13, name: 'Times New Roman', color: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'E7F3FF' } }
      },
      title3: {
        font: { bold: true, sz: 16, name: 'Times New Roman', color: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'D0E8FF' } }
      },
      italic: {
        font: { italic: true, sz: 11, name: 'Times New Roman', color: { rgb: '333333' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      },
      header: {
        font: { bold: true, sz: 11, name: 'Times New Roman', color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: '4472C4' } },
        border: {
          top: { style: 'medium', color: { rgb: '1F4E78' } },
          bottom: { style: 'medium', color: { rgb: '1F4E78' } },
          left: { style: 'medium', color: { rgb: '1F4E78' } },
          right: { style: 'medium', color: { rgb: '1F4E78' } }
        }
      },
      subHeader: {
        font: { bold: true, sz: 10, name: 'Times New Roman', color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: '5B9BD5' } },
        border: {
          top: { style: 'thin', color: { rgb: '1F4E78' } },
          bottom: { style: 'thin', color: { rgb: '1F4E78' } },
          left: { style: 'thin', color: { rgb: '1F4E78' } },
          right: { style: 'thin', color: { rgb: '1F4E78' } }
        }
      },
      dataCenter: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'FFFFFF' } }
      },
      dataLeft: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'FFFFFF' } }
      },
      dataCenterAlt: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'F2F2F2' } }
      },
      dataLeftAlt: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'F2F2F2' } }
      }
    };

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = {};

    // Row 1: CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO
    ws['A1'] = { v: 'CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO', t: 's', s: styles.title1 };

    // Row 2: THEO THÔNG TƯ 03/2014/TT-BTTTT
    ws['A2'] = { v: 'THEO THÔNG TƯ 03/2014/TT-BTTTT', t: 's', s: styles.title2 };

    // Row 3: DANH SÁCH DỰ THI...
    ws['A3'] = { v: `DANH SÁCH DỰ THI ${selectedExamForList?.exam_name?.toUpperCase() || ''}`, t: 's', s: styles.title3 };

    // Row 4: Thời gian
    ws['F4'] = { v: examDateStr, t: 's', s: styles.italic };

    // Row 5: Hội đồng thi
    ws['F5'] = { v: `Hội đồng thi: ${selectedExamForList?.location || 'PTIT HÀ NỘI'}`, t: 's', s: styles.italic };

    // Row 7: Headers
    const headers = ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      ws[`${col}7`] = { v: h, t: 's', s: styles.header };
    });

    // Row 8: Sub-headers + empty cells with border
    const cols = 'ABCDEFGHIJKLM'.split('');
    cols.forEach(col => {
      if (col === 'J') {
        ws[`${col}8`] = { v: 'LT', t: 's', s: styles.subHeader };
      } else if (col === 'K') {
        ws[`${col}8`] = { v: 'TH', t: 's', s: styles.subHeader };
      } else {
        ws[`${col}8`] = { v: '', t: 's', s: styles.subHeader };
      }
    });

    // Sort data by column E (TÊN) A to Z before adding to sheet
    const sortedData = [...studentList].sort((a, b) => {
      const nameA = splitName(a.ho_ten_full).ten || '';
      const nameB = splitName(b.ho_ten_full).ten || '';
      return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    });

    // Data rows (from row 9) với alternating row colors - sử dụng sortedData
    sortedData.forEach((s, idx) => {
      const { ho, ten } = splitName(s.ho_ten_full);
      const ngaySinh = s.ngay_sinh ? formatDateVN(s.ngay_sinh) : '';
      const row = 9 + idx;
      const isEven = idx % 2 === 0;
      const cellStyleCenter = isEven ? styles.dataCenter : styles.dataCenterAlt;
      const cellStyleLeft = isEven ? styles.dataLeft : styles.dataLeftAlt;

      ws[`A${row}`] = { v: idx + 1, t: 'n', s: cellStyleCenter };
      ws[`B${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`C${row}`] = { v: s.cccd || '', t: 's', s: cellStyleCenter };
      ws[`D${row}`] = { v: ho, t: 's', s: cellStyleLeft };
      ws[`E${row}`] = { v: ten, t: 's', s: cellStyleLeft };
      ws[`F${row}`] = { v: ngaySinh, t: 's', s: cellStyleCenter };
      ws[`G${row}`] = { v: s.noi_sinh || '', t: 's', s: cellStyleLeft };
      ws[`H${row}`] = { v: s.gioi_tinh || '', t: 's', s: cellStyleCenter };
      ws[`I${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`J${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`K${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`L${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`M${row}`] = { v: '', t: 's', s: cellStyleCenter };
    });

    // Set range với sortedData length
    const lastRow = 8 + sortedData.length;
    ws['!ref'] = `A1:M${lastRow}`;

    // Merge cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },  // Row 1: A1:M1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },  // Row 2: A2:M2
      { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },  // Row 3: A3:M3
      { s: { r: 3, c: 5 }, e: { r: 3, c: 12 } },  // Row 4: F4:M4
      { s: { r: 4, c: 5 }, e: { r: 4, c: 12 } },  // Row 5: F5:M5
      { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },  // Row 7: J7:K7 (MÔN THI header)
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // A: STT
      { wch: 12 },  // B: SỐ PHÁCH
      { wch: 15 },  // C: SỐ CMT
      { wch: 18 },  // D: HỌ
      { wch: 10 },  // E: TÊN
      { wch: 12 },  // F: NGÀY SINH
      { wch: 28 },  // G: NƠI SINH
      { wch: 10 },  // H: GIỚI TÍNH
      { wch: 10 },  // I: DÂN TỘC
      { wch: 5 },   // J: LT
      { wch: 5 },   // K: TH
      { wch: 12 },  // L: KÝ TÊN
      { wch: 12 },  // M: GHI CHÚ
    ];

    // Row heights với chiều cao tối ưu
    ws['!rows'] = [
      { hpt: 25 },  // Row 1 - Title
      { hpt: 22 },  // Row 2 - Subtitle
      { hpt: 32 },  // Row 3 - Main title (taller)
      { hpt: 20 },  // Row 4 - Date
      { hpt: 20 },  // Row 5 - Location
      { hpt: 10 },  // Row 6 - Empty spacer
      { hpt: 35 },  // Row 7 - Header (taller for wrap text)
      { hpt: 25 },  // Row 8 - Sub-header
    ];

    // Set default row height for data rows
    for (let i = 9; i <= lastRow; i++) {
      ws['!rows'][i - 1] = { hpt: 20 };
    }

    // NO AutoFilter - removed to hide dropdown arrows

    // Freeze panes - freeze header rows
    ws['!freeze'] = { xSplit: 0, ySplit: 8, topLeftCell: 'A9', activePane: 'bottomLeft', state: 'frozen' };

    // Print settings
    ws['!margins'] = {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };

    // Page setup
    ws['!pageSetup'] = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalDpi: 600,
      verticalDpi: 600
    };

    // Print titles (repeat header rows)
    ws['!printTitles'] = {
      rows: '1:8'
    };

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách dự thi');

    const today = new Date();
    const safeExamName = (selectedExamForList?.exam_name || 'exam').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    XLSX.writeFile(wb, `DSDUTHI_${safeExamName}_${today.toISOString().split('T')[0]}.xlsx`);
    success('Xuất Excel thành công!');
  };

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,1)_100%)] p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Calendar size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">Lịch thi</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Điều phối toàn bộ kỳ thi, linked class và luồng duyệt thí sinh trên một màn duy nhất.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleOpenTrash} variant="outline" className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4">
                <Trash2 size={16} />
                Thùng rác
              </Button>
              <Button onClick={handleOpenConflicts} variant="outline" className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4">
                <Info size={16} />
                Kiểm tra trùng đăng ký
              </Button>
              <Button onClick={handleCreate} className="h-11 gap-2 rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800">
                <PlusCircle size={16} />
                Tạo lịch thi
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tổng lịch</div>
                  <div className="mt-1 text-2xl font-black leading-none text-slate-900">{examSummary.total}</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilter('upcoming')}
              className="rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Sắp tới</div>
                  <div className="mt-1 text-2xl font-black leading-none text-slate-900">{examSummary.today + examSummary.upcoming}</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className="rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Info size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Hôm nay</div>
                  <div className="mt-1 text-2xl font-black leading-none text-slate-900">{examSummary.today}</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilter('all')}
              className="rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Chờ duyệt</div>
                  <div className="mt-1 text-2xl font-black leading-none text-slate-900">{examSummary.pending}</div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative w-full xl:max-w-md">
                <Label htmlFor="exam-search" className="sr-only">Tìm kiếm lịch thi</Label>
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="exam-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm theo tên kỳ thi, chương trình, trình độ, linked class hoặc địa điểm..."
                  className="h-11 rounded-xl border-slate-200 bg-white pl-10 pr-10"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 transition hover:text-slate-700"
                  >
                    Xóa
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'upcoming', label: 'Sắp tới', count: examSummary.today + examSummary.upcoming },
                  { key: 'past', label: 'Đã qua', count: examSummary.past },
                  { key: 'all', label: 'Tất cả', count: examSummary.total },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                      filter === item.key
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {item.label}
                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${filter === item.key ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-slate-500">
              Hiển thị <span className="font-semibold text-slate-900">{filteredExams.length}</span> / {examSummary.total} lịch thi
            </div>
          </div>
        </div>

        <div className="bg-slate-50/60 p-6">
          {loading ? (
            <AdminLoadingState
              title="Đang tải lịch thi"
              hint="Lịch thi, loại thi và danh mục thi ít đổi sẽ được giữ cache để tab mặc định mở lại nhanh hơn."
              variant="desktop-list"
              accent="blue"
            />
          ) : filteredExams.length === 0 ? (
            <EmptyState
              icon={<Calendar size={48} className="text-slate-300" />}
              title="Không tìm thấy lịch thi"
              message="Thử đổi bộ lọc, xóa từ khóa tìm kiếm hoặc tạo lịch thi mới để bắt đầu."
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredExams.map((exam) => {
                const status = getExamStatusMeta(exam.exam_date);
                const examDate = parseExamDateTime(exam.exam_date);
                const totalStudents = getTotalStudentCount(exam);
                const approvedCount = getApprovedCount(exam);
                const pendingCount = getPendingCount(exam);
                const schedulePreview = formatSchedulePreview(exam.class_seed_schedule_rule, exam.class_seed_schedule_time);
                const programLabel = exam.program_name || examCategoryLabelById.get(Number(exam.exam_category_id));
                const levelLabel = exam.level_name || exam.exam_level;

                return (
                  <article
                    key={exam.id}
                    className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_24px_48px_rgba(15,23,42,0.10)]"
                  >
                    <span className={`absolute inset-x-0 top-0 h-1.5 ${status.accentClass}`} />

                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-[84px] flex-col items-center rounded-[24px] bg-slate-950 px-3 py-3 text-white shadow-lg shadow-slate-200">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                            {examDate ? examDate.toLocaleDateString('vi-VN', { weekday: 'short' }) : '---'}
                          </p>
                          <p className="mt-1 text-[32px] font-black leading-none">{examDate ? String(examDate.getDate()).padStart(2, '0') : '--'}</p>
                          <p className="mt-1 text-[11px] font-semibold text-white/75">
                            Thg {examDate ? examDate.getMonth() + 1 : '--'}
                          </p>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${status.badgeClass}`}>
                            {status.label}
                          </span>
                          {pendingCount > 0 ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                              {pendingCount} chờ duyệt
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <h3 className="line-clamp-2 text-[20px] font-black leading-tight tracking-tight text-slate-900">
                          {exam.exam_name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {programLabel ? (
                            <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                              {programLabel}
                            </Badge>
                          ) : null}
                          {levelLabel ? (
                            <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                              {levelLabel}
                            </Badge>
                          ) : null}
                          {exam.exam_type ? (
                            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                              {exam.exam_type}
                            </Badge>
                          ) : null}
                          {exam.class_seed_name ? (
                            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                              Có linked class
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="shrink-0 text-slate-400" />
                          <span>{formatDateVN(exam.exam_date)} • {formatTime(exam.exam_date)} • {formatDurationLabel(exam.duration_minutes)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="shrink-0 text-slate-400" />
                          <span className="whitespace-pre-wrap break-words">{exam.location || 'Chưa cập nhật địa điểm'}</span>
                        </div>
                        {exam.notes ? (
                          <div className="flex items-start gap-2 text-slate-500">
                            <Info size={15} className="mt-0.5 shrink-0 text-slate-300" />
                            <span className="whitespace-pre-wrap break-words leading-relaxed">{exam.notes}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-[22px] bg-slate-50 px-3 py-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Tổng thí sinh</div>
                          <div className="mt-1 text-2xl font-black leading-none text-slate-900">{totalStudents}</div>
                        </div>
                        <div className="rounded-[22px] bg-slate-50 px-3 py-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Đã duyệt</div>
                          <div className="mt-1 text-2xl font-black leading-none text-slate-900">{approvedCount}</div>
                        </div>
                      </div>

                      {exam.class_seed_name ? (
                        <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Linked class</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">{exam.class_seed_name}</div>
                          <div className="mt-1 text-sm text-slate-600">{schedulePreview}</div>
                        </div>
                      ) : exam.delivery_mode === 'external_redirect' ? (
                        <div className="rounded-[22px] border border-blue-100 bg-blue-50/70 p-3">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-600">External redirect</div>
                          <div className="mt-1 text-sm text-slate-700">
                            {exam.redirect_url || 'Program này dùng link riêng, không sinh linked class.'}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-xl px-3 text-blue-700 hover:bg-white hover:text-blue-800"
                        onClick={() => handleViewStudents(exam)}
                      >
                        <Users size={16} className="mr-2" />
                        Quản lý thí sinh
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Chỉnh sửa lịch thi ${exam.exam_name}`}
                          title="Chỉnh sửa lịch thi"
                          className="h-9 w-9 rounded-xl hover:bg-white hover:text-blue-600"
                          onClick={() => handleEdit(exam)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Xóa lịch thi ${exam.exam_name}`}
                          title="Xóa lịch thi"
                          className="h-9 w-9 rounded-xl hover:bg-white hover:text-red-500"
                          onClick={() => handleDelete(exam)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Exam Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !submitting && setShowModal(open)}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[600px] rounded-xl" style={{ width: '95%', maxWidth: '600px', borderRadius: '16px', maxHeight: '90vh' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '24px 28px', color: 'white', flexShrink: 0 }}>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              {editingExam ? <Edit size={22} /> : <PlusCircle size={22} />}
              {editingExam ? 'Cập nhật Lịch Thi' : 'Tạo Lịch Thi Mới'}
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1 text-sm">Điền các thông tin chi tiết cho kỳ thi.</DialogDescription>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="space-y-5" style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">Xem nhanh trước khi lưu</div>
                <h4 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                  {formData.exam_name || 'Tên kỳ thi sẽ xuất hiện ở đây'}
                </h4>
                <p className="mt-2 text-sm text-slate-600">
                  {formPreviewDate ? `${formatDateVN(formPreviewDate, true)} • ${formatDurationLabel(formData.duration_minutes)}` : 'Chọn ngày thi và giờ bắt đầu để xem preview'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {selectedOrganizer?.name ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{selectedOrganizer.name}</span>
                  ) : null}
                  {selectedProgram?.name ? (
                    <span className="rounded-full bg-blue-100 px-3 py-1.5 font-semibold text-blue-700">{selectedProgram.name}</span>
                  ) : null}
                  {selectedLevel?.name || formData.exam_level ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-700">{formData.exam_level}</span>
                  ) : null}
                  {selectedTemplate?.display_name ? (
                    <span className="rounded-full bg-violet-100 px-3 py-1.5 font-semibold text-violet-700">{selectedTemplate.display_name}</span>
                  ) : null}
                  {formData.location ? (
                    <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-600 shadow-sm">{formData.location}</span>
                  ) : null}
                  {linkedClassEnabled && formData.class_seed_name ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-700">Linked: {formData.class_seed_name}</span>
                  ) : null}
                  {linkedClassEnabled && formData.class_seed_schedule_time ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">
                      {formatSchedulePreview(formData.class_seed_schedule_rule, formData.class_seed_schedule_time)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <Label htmlFor="exam_name" className="text-sm font-medium text-gray-700">Tên kỳ thi <span className="text-red-500">*</span></Label>
                <Input
                  id="exam_name"
                  value={formData.exam_name}
                  onChange={e => updateFormField('exam_name', e.target.value)}
                  placeholder="Ví dụ: Thi Tin học Quốc tế đợt 1..."
                  className="mt-1.5"
                  disabled={submitting}
                  autoFocus
                />
              </div>

              {programPlatformError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <div>{programPlatformError}</div>
                  <button
                    type="button"
                    onClick={() => loadProgramPlatform()}
                    className="mt-2 font-semibold text-amber-900 underline underline-offset-2"
                    disabled={programPlatformLoading}
                  >
                    {programPlatformLoading ? 'Đang tải lại...' : 'Tải lại danh mục'}
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="organizer_uuid" className="text-sm font-medium text-gray-700">Đơn vị tổ chức <span className="text-red-500">*</span></Label>
                  <select
                    id="organizer_uuid"
                    value={formData.organizer_uuid}
                    onChange={e => updateFormField('organizer_uuid', e.target.value)}
                    disabled={submitting || programPlatformLoading}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="">{programPlatformLoading ? '-- Đang tải đơn vị --' : '-- Chọn đơn vị --'}</option>
                    {organizerOptions.map((item: any) => (
                      <option key={item.uuid} value={item.uuid}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="program_uuid" className="text-sm font-medium text-gray-700">Chương trình thi <span className="text-red-500">*</span></Label>
                  <select
                    id="program_uuid"
                    value={formData.program_uuid}
                    onChange={e => updateFormField('program_uuid', e.target.value)}
                    disabled={submitting || programPlatformLoading || !formData.organizer_uuid}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="">{programPlatformLoading ? '-- Đang tải chương trình --' : '-- Chọn chương trình --'}</option>
                    {filteredProgramOptions.map((item: any) => (
                      <option key={item.uuid} value={item.uuid}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="level_uuid" className="text-sm font-medium text-gray-700">
                    Trình độ {filteredLevelOptions.length > 0 ? <span className="text-red-500">*</span> : null}
                  </Label>
                  <select
                    id="level_uuid"
                    value={formData.level_uuid}
                    onChange={e => updateFormField('level_uuid', e.target.value)}
                    disabled={submitting || programPlatformLoading || !formData.program_uuid || filteredLevelOptions.length === 0}
                    className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="">
                      {programPlatformLoading
                        ? '-- Đang tải trình độ --'
                        : filteredLevelOptions.length > 0
                          ? '-- Chọn trình độ --'
                          : '-- Program này chưa có level --'}
                    </option>
                    {filteredLevelOptions.map((item: any) => (
                      <option key={item.uuid} value={item.uuid}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="template_id" className="text-sm font-medium text-gray-700">Mẫu Excel</Label>
                <select
                  id="template_id"
                  value={formData.template_id}
                  onChange={e => updateFormField('template_id', e.target.value)}
                  disabled={submitting || programPlatformLoading}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <option value="">{programPlatformLoading ? '-- Đang tải mẫu --' : '-- Không dùng mẫu riêng --'}</option>
                  {templateOptions.map((item: any) => (
                    <option key={item.id} value={String(item.id)}>{item.display_name || item.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exam_date" className="text-sm font-medium text-gray-700">Ngày thi <span className="text-red-500">*</span></Label>
                  <DateInput
                    id="exam_date"
                    value={formData.exam_date}
                    onChange={(val) => updateFormField('exam_date', val)}
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="exam_time" className="text-sm font-medium text-gray-700">Giờ bắt đầu <span className="text-red-500">*</span></Label>
                  <Input
                    id="exam_time"
                    type="time"
                    value={formData.exam_time}
                    onChange={e => updateFormField('exam_time', e.target.value)}
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration_minutes" className="text-sm font-medium text-gray-700">Thời lượng (phút)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={e => updateFormField('duration_minutes', e.target.value)}
                    min="1"
                    step="1"
                    placeholder="Có thể bỏ trống"
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">Địa điểm / hình thức</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={e => updateFormField('location', e.target.value)}
                    placeholder="Ví dụ: Eduglobal, Trực tuyến qua Zoom..."
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Ghi chú</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => updateFormField('notes', e.target.value)}
                  placeholder="Nội dung chi tiết, dặn dò... giữ nguyên xuống dòng khi hiển thị"
                  rows={3}
                  disabled={submitting}
                  className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {usesExternalExamLink ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  <div className="font-semibold">
                    {selectedProgram?.name || 'Chương trình này'} dùng luồng external redirect, không tạo linked class.
                  </div>
                  <div className="mt-1">
                    {selectedProgram?.redirectUrl
                      ? `Link mặc định: ${selectedProgram.redirectUrl}`
                      : 'Bạn có thể cấu hình redirect_url trong mục Chương trình tổng.'}
                  </div>
                </div>
              ) : null}

              {!usesExternalExamLink ? (
                <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Lớp linked cho teacher workspace</p>
                      <p className="mt-1 text-xs text-emerald-700/80">
                        Sau khi lưu lịch thi, hệ thống sẽ đồng bộ sang lớp online linked để giáo viên dùng chung tài liệu và bài tập ôn tập.
                      </p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">
                      <input
                        type="checkbox"
                        checked={linkedClassEnabled}
                        onChange={e => updateFormField('enable_linked_class', e.target.checked)}
                        disabled={submitting || linkedClassForcedByZoom}
                      />
                      Mở linked class
                    </label>
                  </div>

                  {linkedClassForcedByZoom ? (
                    <div className="rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-xs text-emerald-800">
                      Zoom đang bật nên linked class được tự động mở để teacher workspace luôn đồng bộ.
                    </div>
                  ) : null}

                  {linkedClassEnabled ? (
                    <>
                      <div>
                        <Label htmlFor="class_seed_name" className="text-sm font-medium text-gray-700">Tên lớp học <span className="text-red-500">*</span></Label>
                        <Input
                          id="class_seed_name"
                          value={formData.class_seed_name}
                          onChange={e => updateFormField('class_seed_name', e.target.value)}
                          placeholder="Ví dụ: VSTEP B1 - Lớp ôn 31.03"
                          className="mt-1.5"
                          disabled={submitting}
                          required={linkedClassEnabled}
                        />
                      </div>

                      <div>
                        <Label htmlFor="class_seed_description" className="text-sm font-medium text-gray-700">Mô tả lớp</Label>
                        <textarea
                          id="class_seed_description"
                          value={formData.class_seed_description}
                          onChange={e => updateFormField('class_seed_description', e.target.value)}
                          placeholder="Mô tả ngắn về lớp học, mục tiêu ôn tập, đối tượng..."
                          rows={3}
                          disabled={submitting}
                          className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Preset lịch học</div>
                        <div className="flex flex-wrap gap-2">
                          {SCHEDULE_PRESETS.map((preset) => {
                            const active = formData.class_seed_schedule_rule === preset.rule && formData.class_seed_schedule_time === preset.time;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => applySchedulePreset(preset)}
                                className={`rounded-2xl border px-3 py-2 text-left transition ${
                                  active
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                                    : 'border-emerald-200 bg-white text-slate-700 hover:border-emerald-300'
                                }`}
                              >
                                <div className="text-sm font-bold">{preset.label}</div>
                                <div className={`text-[11px] ${active ? 'text-white/85' : 'text-slate-500'}`}>{preset.helper}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">Ngày học trong tuần <span className="text-red-500">*</span></div>
                        <div className="flex flex-wrap gap-2">
                          {WEEKLY_DAY_OPTIONS.map((day) => {
                            const active = scheduleDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleScheduleDay(day)}
                                className={`h-10 min-w-12 rounded-xl border px-3 text-sm font-bold transition ${
                                  active
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-emerald-200 bg-white text-slate-600 hover:border-emerald-300'
                                }`}
                              >
                                {WEEKLY_DAY_LABELS[day]}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-slate-500">
                          Hệ thống đang lưu dưới dạng <span className="font-semibold">{formData.class_seed_schedule_rule || 'chưa có'}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="class_seed_schedule_start" className="text-sm font-medium text-gray-700">Giờ bắt đầu học <span className="text-red-500">*</span></Label>
                          <Input
                            id="class_seed_schedule_start"
                            type="time"
                            value={scheduleTimeRange.start}
                            onChange={(e) => updateScheduleTimeBoundary('start', e.target.value)}
                            className="mt-1.5"
                            disabled={submitting}
                            required={linkedClassEnabled}
                          />
                        </div>
                        <div>
                          <Label htmlFor="class_seed_schedule_end" className="text-sm font-medium text-gray-700">Giờ kết thúc học <span className="text-red-500">*</span></Label>
                          <Input
                            id="class_seed_schedule_end"
                            type="time"
                            value={scheduleTimeRange.end}
                            onChange={(e) => updateScheduleTimeBoundary('end', e.target.value)}
                            className="mt-1.5"
                            disabled={submitting}
                            required={linkedClassEnabled}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="class_seed_schedule_rule" className="text-sm font-medium text-gray-700">Quy tắc nâng cao</Label>
                        <Input
                          id="class_seed_schedule_rule"
                          value={formData.class_seed_schedule_rule}
                          onChange={e => updateFormField('class_seed_schedule_rule', e.target.value.toUpperCase())}
                          placeholder="WEEKLY:1,3,5 hoặc DAILY"
                          className="mt-1.5"
                          disabled={submitting}
                          required={linkedClassEnabled}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Chỉ sửa thủ công khi cần cú pháp đặc biệt. Lịch hiện tại: <span className="font-semibold">{formatSchedulePreview(formData.class_seed_schedule_rule, formData.class_seed_schedule_time)}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="class_seed_start_date" className="text-sm font-medium text-gray-700">Ngày bắt đầu lớp <span className="text-red-500">*</span></Label>
                          <DateInput
                            id="class_seed_start_date"
                            value={formData.class_seed_start_date}
                            onChange={val => updateFormField('class_seed_start_date', val)}
                            className="mt-1.5"
                            disabled={submitting}
                            required={linkedClassEnabled}
                          />
                        </div>
                        <div>
                          <Label htmlFor="class_seed_end_date" className="text-sm font-medium text-gray-700">Ngày kết thúc lớp</Label>
                          <DateInput
                            id="class_seed_end_date"
                            value={formData.class_seed_end_date}
                            onChange={val => updateFormField('class_seed_end_date', val)}
                            className="mt-1.5"
                            disabled={submitting}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="class_seed_max_students" className="text-sm font-medium text-gray-700">Sĩ số tối đa</Label>
                        <Input
                          id="class_seed_max_students"
                          type="number"
                          min="1"
                          value={formData.class_seed_max_students}
                          onChange={e => updateFormField('class_seed_max_students', e.target.value)}
                          className="mt-1.5"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <Label htmlFor="class_seed_timezone" className="text-sm font-medium text-gray-700">Múi giờ</Label>
                        <select
                          id="class_seed_timezone"
                          value={formData.class_seed_timezone}
                          onChange={e => updateFormField('class_seed_timezone', e.target.value)}
                          className="mt-1.5 flex h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          disabled={submitting}
                        >
                          {TIMEZONE_OPTIONS.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-4 text-sm text-emerald-800">
                      Linked class đang tắt. Lịch thi sẽ được lưu độc lập và không tạo lớp online linked cho giáo viên.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                    Zoom Meeting (tuỳ chọn)
                  </div>
                  <label className="flex shrink-0 items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800">
                    <input
                      type="checkbox"
                      checked={zoomMeetingEnabled}
                      onChange={e => updateFormField('enable_zoom_meeting', e.target.checked)}
                      disabled={submitting}
                    />
                    Mở Zoom
                  </label>
                </div>
                {zoomMeetingEnabled ? (
                  <>
                    <div>
                      <Label htmlFor="zoom_link" className="text-sm font-medium text-gray-700">Link tham gia</Label>
                      <Input
                        id="zoom_link"
                        value={formData.zoom_link}
                        onChange={e => updateFormField('zoom_link', e.target.value)}
                        placeholder="https://us06web.zoom.us/j/..."
                        className="mt-1.5"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zoom_link_backup" className="text-sm font-medium text-gray-700">Link dự phòng</Label>
                      <Input
                        id="zoom_link_backup"
                        value={formData.zoom_link_backup}
                        onChange={e => updateFormField('zoom_link_backup', e.target.value)}
                        placeholder="https://us06web.zoom.us/j/... (dự phòng)"
                        className="mt-1.5"
                        disabled={submitting}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="zoom_meeting_id" className="text-sm font-medium text-gray-700">Meeting ID</Label>
                        <Input
                          id="zoom_meeting_id"
                          value={formData.zoom_meeting_id}
                          onChange={e => updateFormField('zoom_meeting_id', e.target.value)}
                          placeholder="813 8780 6613"
                          className="mt-1.5"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="zoom_passcode" className="text-sm font-medium text-gray-700">Passcode</Label>
                        <Input
                          id="zoom_passcode"
                          value={formData.zoom_passcode}
                          onChange={e => updateFormField('zoom_passcode', e.target.value)}
                          placeholder="767013"
                          className="mt-1.5"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="zoom_meeting_id_backup" className="text-sm font-medium text-gray-700">Meeting ID dự phòng</Label>
                        <Input
                          id="zoom_meeting_id_backup"
                          value={formData.zoom_meeting_id_backup}
                          onChange={e => updateFormField('zoom_meeting_id_backup', e.target.value)}
                          placeholder="835 2818 4752"
                          className="mt-1.5"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="zoom_passcode_backup" className="text-sm font-medium text-gray-700">Passcode dự phòng</Label>
                        <Input
                          id="zoom_passcode_backup"
                          value={formData.zoom_passcode_backup}
                          onChange={e => updateFormField('zoom_passcode_backup', e.target.value)}
                          placeholder="476358"
                          className="mt-1.5"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm text-blue-800">
                    Zoom meeting đang tắt. Kỳ thi vẫn có thể lưu bình thường mà không cần link họp.
                    Zoom Meeting (tuỳ chọn) hỗ trợ 1 link chính + 1 link dự phòng để chuyển phòng nhanh.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-4" style={{ flexShrink: 0, padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
              <Button type="button" variant="outline" disabled={submitting} onClick={() => setShowModal(false)}>Hủy</Button>
              <Button type="submit" disabled={submitting || programPlatformLoading} className="min-w-[120px]">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Đang lưu...
                  </span>
                ) : programPlatformLoading ? (
                  'Đang tải danh mục...'
                ) : (
                  editingExam ? 'Lưu thay đổi' : 'Tạo lịch thi'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student List Modal */}
      <Dialog open={showStudentsModal} onOpenChange={setShowStudentsModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[1000px] h-[90vh] max-h-[800px] rounded-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Users size={22} /> Danh sách thí sinh
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-1">
              Kỳ thi: <span className="font-semibold text-white">{selectedExamForList?.exam_name}</span>
            </DialogDescription>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setStudentTab('approved')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${studentTab === 'approved'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <CheckCircle size={18} />
              Đã duyệt ({studentList.length})
            </button>
            <button
              onClick={() => setStudentTab('pending')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${studentTab === 'pending'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Clock size={18} />
              Chờ duyệt ({pendingStudents.length})
              {pendingStudents.length > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingStudents.length}</span>
              )}
            </button>
            <button
              onClick={() => {
                setStudentTab('attendance');
                if (!learningAttendance && selectedExamForList?.id) {
                  loadLearningAttendance(selectedExamForList.id);
                }
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${studentTab === 'attendance'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <ClipboardCheck size={18} />
              Điểm danh học tập
            </button>
          </div>

          {/* Toolbar — chỉ hiện khi không ở tab điểm danh */}
          {studentTab !== 'attendance' && (
          <div className="border-b bg-gray-50 px-5 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-gray-600">
                {studentTab === 'approved' ? (
                  <span>Hiển thị <strong>{filteredApprovedStudents.length}</strong> / {studentList.length} thí sinh đã được duyệt</span>
                ) : (
                  <span>Hiển thị <strong>{filteredPendingStudents.length}</strong> / {pendingStudents.length} thí sinh đang chờ duyệt</span>
                )}
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-80">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={studentSearchTerm}
                    onChange={(event) => setStudentSearchTerm(event.target.value)}
                    placeholder="Tìm theo tên, CCCD, SĐT, email..."
                    className="h-10 rounded-xl border-slate-200 bg-white pl-9 pr-9"
                  />
                  {studentSearchTerm ? (
                    <button
                      type="button"
                      onClick={() => setStudentSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 transition hover:text-slate-700"
                    >
                      Xóa
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <Button
                    onClick={openAddStudentsModal}
                    variant="outline"
                    size="sm"
                    disabled={!selectedExamForList?.id}
                  >
                    <PlusCircle size={16} className="mr-1" />
                    Thêm thí sinh
                  </Button>
                  {studentTab === 'pending' && pendingStudents.length > 0 && (
                    <Button
                      onClick={handleApproveAll}
                      size="sm"
                      disabled={approving === 'all'}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {approving === 'all' ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          Đang duyệt...
                        </span>
                      ) : (
                        <>
                          <CheckCheck size={16} className="mr-1" />
                          Duyệt tất cả
                        </>
                      )}
                    </Button>
                  )}
                  {studentTab === 'approved' && (
                    <>
                      <Button onClick={handleOpenExcelPreview} variant="outline" size="sm" disabled={studentList.length === 0}>
                        <Info size={16} className="mr-1" />
                        Preview Excel
                      </Button>
                      <Button onClick={exportStudentListToExcel} variant="outline" size="sm" disabled={studentList.length === 0}>
                        <Download size={16} className="mr-1" />
                        Xuất Excel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Content - scrollable */}
          <div className="overflow-y-auto p-5 bg-gray-50" style={{ maxHeight: '50vh' }}>
            {studentListLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : studentTab === 'attendance' ? (
              /* ======= TAB ĐIỂM DANH HỌC TẬP ======= */
              learningAttendanceLoading ? (
                <div className="flex justify-center py-20"><LoadingSpinner /></div>
              ) : !learningAttendance ? (
                <EmptyState
                  icon={<ClipboardCheck size={48} className="text-gray-300" />}
                  title="Chưa tải dữ liệu điểm danh"
                  message="Nhấn vào tab Điểm danh học tập để tải."
                />
              ) : learningAttendance.sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardCheck size={48} className="text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium mb-1">
                    {learningAttendance.online_class_id
                      ? `Lớp học trực tuyến "${learningAttendance.class_name}" chưa có buổi học nào.`
                      : 'Kỳ thi này chưa được gắn với lớp học trực tuyến.'}
                  </p>
                  <p className="text-xs text-gray-400">Dữ liệu điểm danh sẽ hiển thị ở đây khi có buổi học.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header thông tin lớp */}
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <ClipboardCheck size={20} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{learningAttendance.class_name || 'Lớp học trực tuyến'}</p>
                      <p className="text-xs text-emerald-600">{learningAttendance.sessions.length} buổi học · {learningAttendance.students.length} học viên</p>
                    </div>
                    <button
                      onClick={() => loadLearningAttendance(selectedExamForList.id)}
                      className="ml-auto flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      <RefreshCw size={14} /> Làm mới
                    </button>
                  </div>

                  {/* Bảng điểm danh */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="sticky left-0 bg-gray-50 z-10 px-4 py-3 text-left font-semibold text-gray-700 min-w-[180px]">Học viên</th>
                          <th className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[80px]">Tổng<br /><span className="text-xs font-normal text-gray-500">Có mặt</span></th>
                          {learningAttendance.sessions.map((sess, idx) => (
                            <th key={sess.id} className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px] whitespace-nowrap">
                              <div className="text-xs text-gray-500">Buổi {idx + 1}</div>
                              <div className="text-xs font-medium">
                                {sess.session_date
                                  ? new Date(sess.session_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                                  : '—'}
                              </div>
                              {sess.start_time && (
                                <div className="text-[10px] text-gray-400">{sess.start_time}{sess.end_time ? `–${sess.end_time}` : ''}</div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {learningAttendance.students.length === 0 ? (
                          <tr>
                            <td colSpan={2 + learningAttendance.sessions.length} className="py-10 text-center text-gray-400">
                              Chưa có học viên nào.
                            </td>
                          </tr>
                        ) : (
                          learningAttendance.students.map((student, rowIdx) => (
                            <tr key={student.student_id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              {/* Cột tên */}
                              <td className="sticky left-0 bg-inherit z-10 px-4 py-3 border-r border-gray-100">
                                <div className="font-medium text-gray-900 truncate max-w-[160px]">{student.ho_ten_full}</div>
                                {student.cccd && <div className="text-[11px] text-gray-400 font-mono">{student.cccd}</div>}
                              </td>
                              {/* Cột tổng có mặt */}
                              <td className="px-3 py-3 text-center border-r border-gray-100">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold
                                  ${student.present_count + student.late_count === learningAttendance.sessions.length
                                    ? 'bg-green-100 text-green-700'
                                    : student.present_count + student.late_count === 0
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-yellow-100 text-yellow-700'}`}>
                                  {student.present_count + student.late_count}/{learningAttendance.sessions.length}
                                </span>
                              </td>
                              {/* Cột từng buổi */}
                              {student.sessions.map((att) => {
                                const { bg, icon, title } = att.status === 'present'
                                  ? { bg: 'bg-green-100 text-green-700', icon: '✓', title: 'Có mặt' }
                                  : att.status === 'late'
                                  ? { bg: 'bg-yellow-100 text-yellow-700', icon: '⏰', title: 'Muộn' }
                                  : att.status === 'absent'
                                  ? { bg: 'bg-red-100 text-red-600', icon: '✗', title: 'Vắng mặt' }
                                  : att.zoom_join_source === 'zoom_click'
                                  ? { bg: 'bg-blue-100 text-blue-600', icon: 'Z', title: 'Check-in Zoom' }
                                  : { bg: 'bg-gray-100 text-gray-400', icon: '–', title: 'Chưa có dữ liệu' };
                                return (
                                  <td key={att.session_id} className="px-3 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${bg}`}
                                      title={title}
                                    >
                                      {icon}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Chú thích */}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 pt-1">
                    <span className="flex items-center gap-1"><span className="inline-flex w-5 h-5 rounded-full bg-green-100 text-green-700 items-center justify-center font-bold text-[10px]">✓</span> Có mặt</span>
                    <span className="flex items-center gap-1"><span className="inline-flex w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 items-center justify-center font-bold text-[10px]">⏰</span> Muộn</span>
                    <span className="flex items-center gap-1"><span className="inline-flex w-5 h-5 rounded-full bg-red-100 text-red-600 items-center justify-center font-bold text-[10px]">✗</span> Vắng</span>
                    <span className="flex items-center gap-1"><span className="inline-flex w-5 h-5 rounded-full bg-blue-100 text-blue-600 items-center justify-center font-bold text-[10px]">Z</span> Zoom</span>
                    <span className="flex items-center gap-1"><span className="inline-flex w-5 h-5 rounded-full bg-gray-100 text-gray-400 items-center justify-center font-bold text-[10px]">–</span> Chưa ghi nhận</span>
                  </div>
                </div>
              )
            ) : studentTab === 'approved' ? (
              /* Approved Students */
              filteredApprovedStudents.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle size={48} className="text-gray-300" />}
                  title={studentSearchTerm ? 'Không tìm thấy thí sinh phù hợp' : 'Chưa có thí sinh được duyệt'}
                  message={studentSearchTerm ? 'Thử đổi từ khóa tìm kiếm hoặc xóa bộ lọc.' : 'Các thí sinh sau khi được duyệt sẽ hiển thị ở đây.'}
                />
              ) : (
                <div className="grid gap-3">
                  {filteredApprovedStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStudentDetail(student)}
                    >
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {student.image_3x4 ? (
                          <img
                            src={resolveImageUrl(student.image_3x4)}
                            alt={student.ho_ten_full}
                            className="w-16 h-20 object-cover rounded-lg border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border-2 border-gray-200">
                            <User size={28} className="text-blue-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 truncate">{student.ho_ten_full}</h4>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Đã duyệt</Badge>
                          {conflictStudentIds.has(Number(student.student_id)) && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleViewDuplicateHistory(student);
                              }}
                              className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
                            >
                              Trùng đăng ký
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.cccd}>
                            <Info size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.cccd || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.sdt}>
                            <Phone size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.sdt || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                            <span>{formatDateVN(student.ngay_sinh) || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.email}>
                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.email || '---'}</span>
                          </div>
                        </div>
                        {/* Audit trail */}
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                          <span>Đăng ký: {student.registration_date ? formatDateVN(student.registration_date, true) : '---'}</span>
                          {student.approved_at && (
                            <span>Duyệt lúc: {formatDateVN(student.approved_at, true)}</span>
                          )}
                          {student.approved_by_name && (
                            <span>Người duyệt: <span className="text-gray-500 font-medium">{student.approved_by_name}</span></span>
                          )}
                          {student.zoom_checked_in_at ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <span>🎥</span>
                              <span>Vào Zoom: {formatDateVN(student.zoom_checked_in_at, true)}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveStudent(student);
                          }}
                        >
                          <UserX size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Pending Students */
              filteredPendingStudents.length === 0 ? (
                <EmptyState
                  icon={<Clock size={48} className="text-gray-300" />}
                  title={studentSearchTerm ? 'Không tìm thấy thí sinh phù hợp' : 'Không có thí sinh chờ duyệt'}
                  message={studentSearchTerm ? 'Thử đổi từ khóa tìm kiếm hoặc xóa bộ lọc.' : 'Tất cả thí sinh đã được xử lý.'}
                />
              ) : (
                <div className="grid gap-3">
                  {filteredPendingStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className="bg-white border-2 border-orange-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleOpenStudentDetail(student)}
                    >
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {student.image_3x4 ? (
                          <img
                            src={resolveImageUrl(student.image_3x4)}
                            alt={student.ho_ten_full}
                            className="w-16 h-20 object-cover rounded-lg border-2 border-orange-200"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center border-2 border-orange-200">
                            <User size={28} className="text-orange-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 truncate">{student.ho_ten_full}</h4>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Chờ duyệt</Badge>
                          {conflictStudentIds.has(Number(student.student_id)) && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleViewDuplicateHistory(student);
                              }}
                              className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2"
                            >
                              Trùng đăng ký
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.cccd}>
                            <Info size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.cccd || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.sdt}>
                            <Phone size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.sdt || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                            <span>{formatDateVN(student.ngay_sinh) || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.email}>
                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.email || '---'}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Đăng ký: {student.registration_date ? formatDateVN(student.registration_date, true) : '---'}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleApproveStudent(student);
                          }}
                          disabled={approving === student.student_id}
                        >
                          {approving === student.student_id ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <CheckCircle size={16} className="mr-1" />
                              Duyệt
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 border-red-300 hover:bg-red-50"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRejectStudent(student);
                          }}
                          disabled={approving === student.student_id}
                        >
                          <XCircle size={16} className="mr-1" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end">
            <Button variant="outline" onClick={() => setShowStudentsModal(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showExcelPreviewModal} onOpenChange={setShowExcelPreviewModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex w-full max-w-[1180px] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-lg">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold text-white">Preview Excel</DialogTitle>
            <DialogDescription className="mt-1 text-emerald-50">
              {excelPreviewData?.formatLabel || 'Danh sách thí sinh'} - {selectedExamForList?.exam_name}
            </DialogDescription>
          </div>

          <div className="border-b bg-emerald-50/60 px-6 py-4 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-700">
                Mẫu: {selectedExamTemplate?.display_name || selectedExamTemplate?.name || excelPreviewData?.formatLabel || 'Mặc định'}
              </span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                Tổng thí sinh: {studentList.length}
              </span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                Ngày thi: {formatDateVN(selectedExamForList?.exam_date, true) || 'Chưa có'}
              </span>
            </div>
          </div>

          <div className="max-h-[62vh] overflow-auto bg-slate-100 p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">Preview theo bố cục file xuất</span>
              <span className="rounded-full bg-white px-3 py-1 text-slate-600 shadow-sm">Có merge ô và header nhóm</span>
            </div>

            {excelPreviewData?.kind === 'vept' ? (
              <ExcelPreviewVeptTable preview={excelPreviewData} />
            ) : (
              <ExcelPreviewExamListTable preview={excelPreviewData} />
            )}
          </div>

          <DialogFooter className="border-t bg-white px-6 py-4">
            <Button variant="outline" onClick={() => setShowExcelPreviewModal(false)}>
              Đóng
            </Button>
            <Button onClick={exportStudentListToExcel} disabled={studentList.length === 0}>
              <Download size={16} className="mr-2" />
              Tải Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showStudentDetailModal && selectedStudentDetail ? (
        <StudentDetailModal
          student={selectedStudentDetail}
          getImageUrl={resolveImageUrl}
          onClose={() => setShowStudentDetailModal(false)}
          onRefresh={refreshSelectedExamStudents}
          toast={{ success, error }}
        />
      ) : null}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      <Dialog open={showConflictsModal} onOpenChange={setShowConflictsModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[900px] h-[80vh] rounded-xl">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Info size={20} /> Sinh viên trùng đăng ký
            </DialogTitle>
            <DialogDescription className="text-slate-200 mt-1">
              Danh sách sinh viên đang có nhiều hơn 1 đăng ký thi ở trạng thái đang giữ chỗ.
            </DialogDescription>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {conflictsLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : conflicts.length === 0 ? (
              <EmptyState
                icon={<Info size={48} className="text-gray-300" />}
                title="Không có dữ liệu trùng"
                message="Hiện tại không phát hiện sinh viên nào đăng ký trùng."
              />
            ) : (
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <div key={c.student_id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{c.ho_ten_full}</div>
                        <div className="text-sm text-slate-500">CCCD: {c.cccd || '---'}</div>
                      </div>
                      <Badge variant="destructive" className="rounded-full">
                        {c.active_registrations?.length || 0} đăng ký
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {(c.active_registrations || []).map((r, idx) => (
                        <div key={`${c.student_id}-${r.exam_id}-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="font-medium text-slate-800">
                            {r.exam_name || `Kỳ thi #${r.exam_id}`}
                          </div>
                          <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span>ID: {r.exam_id}</span>
                            <span>Trạng thái: {r.registration_status}</span>
                            <span>Ngày thi: {r.exam_date ? formatDateVN(r.exam_date, true) : '---'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end">
            <Button variant="outline" onClick={() => setShowConflictsModal(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[900px] h-[75vh] rounded-xl">
          <div className="bg-gradient-to-r from-rose-600 to-rose-800 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold text-white">
              Lịch sử đăng ký
            </DialogTitle>
            <DialogDescription className="text-rose-100 mt-1">
              {historyStudent?.ho_ten_full ? `${historyStudent.ho_ten_full}` : '---'}
              {historyStudent?.cccd ? ` • CCCD: ${historyStudent.cccd}` : ''}
            </DialogDescription>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {historyLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : historyRows.length === 0 ? (
              <EmptyState
                icon={<Info size={48} className="text-gray-300" />}
                title="Không có lịch sử"
                message="Không tìm thấy đăng ký nào."
              />
            ) : (
              <div className="space-y-3">
                {historyRows.map((r) => (
                  <div key={r.registration_id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {r.class_name || '---'}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {r.exam_name || `Kỳ thi #${r.exam_id}`}
                        </div>
                      </div>
                      <Badge variant="destructive" className="rounded-full">
                        {r.registration_status || '---'}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span>Ngày thi: {r.exam_date ? formatDateVN(r.exam_date, true) : '---'}</span>
                      <span>Đăng ký lúc: {r.registration_created_at ? formatDateVN(r.registration_created_at, true) : '---'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end">
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrashModal} onOpenChange={setShowTrashModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[920px] h-[75vh] rounded-xl">
          <div className="bg-gradient-to-r from-slate-800 to-slate-950 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Trash2 size={20} /> Thùng rác lịch thi
            </DialogTitle>
            <DialogDescription className="text-slate-200 mt-1">
              Lịch thi đã xóa mềm sẽ được giữ tối đa 7 ngày trước khi dọn tự động.
            </DialogDescription>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {trashLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : trashExams.length === 0 ? (
              <EmptyState
                icon={<Trash2 size={48} className="text-gray-300" />}
                title="Thùng rác đang trống"
                message="Chưa có lịch thi nào bị chuyển vào thùng rác."
              />
            ) : (
              <div className="space-y-3">
                {trashExams.map((exam) => (
                  <div key={exam.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-900">{exam.exam_name}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                            Thi: {formatDateVN(exam.exam_date, true) || '---'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                            Xóa lúc: {formatDateVN(exam.deleted_at, true) || '---'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                            {exam.location || 'Chưa có địa điểm'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="gap-2"
                          disabled={trashActionId === exam.id}
                          onClick={() => handleRestoreExam(exam.id)}
                        >
                          <RotateCcw size={15} />
                          {trashActionId === exam.id ? 'Đang khôi phục...' : 'Khôi phục'}
                        </Button>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          disabled={trashActionId === exam.id}
                          onClick={() => handlePermanentDeleteExam(exam)}
                        >
                          <Trash2 size={15} />
                          Xóa vĩnh viễn
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-between gap-2">
            <Button variant="outline" onClick={loadTrashExams} disabled={trashLoading}>
              Tải lại
            </Button>
            <Button variant="outline" onClick={() => setShowTrashModal(false)}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddStudentsModal} onOpenChange={setShowAddStudentsModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[900px] h-[75vh] rounded-xl">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold text-white">
              Thêm thí sinh
            </DialogTitle>
            <DialogDescription className="text-slate-200 mt-1">
              Tìm theo tên / CCCD / SĐT để chọn học viên và thêm vào kỳ thi.
            </DialogDescription>
          </div>

          <div className="p-5 bg-gray-50 border-b">
            <div className="flex gap-2">
              <Input
                value={addStudentsQuery}
                onChange={(e) => setAddStudentsQuery(e.target.value)}
                placeholder="Nhập tên, CCCD hoặc SĐT..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchAddStudents();
                }}
              />
              <Button onClick={handleSearchAddStudents} disabled={addStudentsLoading}>
                {addStudentsLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Search size={16} className="mr-1" />
                    Tìm
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {addStudentsLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : addStudentsResults.length === 0 ? (
              <EmptyState
                icon={<Users size={48} className="text-gray-300" />}
                title="Chưa có kết quả"
                message="Nhập từ khóa và bấm Tìm để chọn học viên."
              />
            ) : (
              <div className="space-y-2">
                {addStudentsResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSelectAddStudent(s.id)}
                    className={`w-full text-left bg-white border rounded-xl p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow ${selectedAddStudentIds.has(s.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{s.ho_ten_full}</div>
                      <div className="text-sm text-slate-500 truncate">CCCD: {s.cccd || '---'} • SĐT: {s.sdt || '---'}</div>
                    </div>
                    <Badge variant={selectedAddStudentIds.has(s.id) ? 'default' : 'outline'}>
                      {selectedAddStudentIds.has(s.id) ? 'Đã chọn' : 'Chọn'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end gap-2">
            <Button variant="outline" disabled={addingStudents} onClick={() => setShowAddStudentsModal(false)}>Đóng</Button>
            <Button
              onClick={() => handleAddSelectedStudents(false)}
              disabled={addingStudents}
              className="min-w-[140px]"
            >
              {addingStudents ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Đang thêm...
                </span>
              ) : (
                'Thêm vào kỳ thi'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
