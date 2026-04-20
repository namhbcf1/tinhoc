import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    Clock,
    Download,
    FileText,
    History,
    Info,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Sparkles,
    Trash2,
    RotateCcw,
    UserPlus,
    Users,
    Upload,
    X,
    XCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { buildVietnamDateTimePayload, formatDateVN, formatTime as formatTimeUtil, formatVietnamDateInputValue, toVietnamDate } from '../../../utils/dateUtils';
import { findExamTemplateOption, suggestExamTemplateId } from '../../../utils/examTemplateRules';
import { StudentDetailSheet, getImageUrl } from './MobileStudentsModule';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, clearAdminCache, getAdminCache, invalidateAdminData, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { canAccessExamFeeStatus, getStoredAdmin } from '../../../utils/adminSession';
import { MobileAdminHeroCard, MobileAdminPrimaryButton, MobileAdminSearchField, MobileAdminSecondaryButton, MobileAdminStatCard } from '../shared/mobileAdminUi';

const SCHEDULE_PRESETS = [
    {
        id: 'weekday-evening',
        label: '2-4-6 tối',
        helper: 'WEEKLY:1,3,5 • 19:00-21:00',
        rule: 'WEEKLY:1,3,5',
        time: '19:00-21:00',
    },
    {
        id: 'weekend-morning',
        label: 'Cuối tuần sáng',
        helper: 'WEEKLY:6,7 • 08:00-11:00',
        rule: 'WEEKLY:6,7',
        time: '08:00-11:00',
    },
    {
        id: 'weekday-intensive',
        label: '3 buổi/tuần',
        helper: 'WEEKLY:2,4,6 • 18:30-20:30',
        rule: 'WEEKLY:2,4,6',
        time: '18:30-20:30',
    },
];
const TIMEZONE_OPTIONS = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'UTC'];
const DEFAULT_CLASS_SEED_RULE = 'WEEKLY:1,3,5';
const DEFAULT_CLASS_SEED_TIME = '19:00-21:00';
const DEFAULT_CLASS_SEED_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_CLASS_SEED_MAX_STUDENTS = 50;

const startOfDay = (value = new Date()) => {
    const next = new Date(value);
    next.setHours(0, 0, 0, 0);
    return next;
};

const getErrorMessage = (error, fallback) => {
    if (error?.message) return error.message;
    return fallback;
};

const formatTime = (dateStr) => formatTimeUtil(dateStr);

const EXAM_PAYMENT_STATUS_OPTIONS = [
    { value: 'unknown', label: 'Chưa xác định' },
    { value: 'paid', label: 'Đã nộp học phí' },
    { value: 'unpaid', label: 'Chưa nộp học phí' },
];
const APPROVED_EXAM_PAYMENT_STATUS_OPTIONS = EXAM_PAYMENT_STATUS_OPTIONS.filter((option) => option.value !== 'unknown');

const normalizeExamPaymentStatus = (value) => (
    value === 'paid' ? 'paid' : value === 'unpaid' ? 'unpaid' : 'unknown'
);

const normalizeApprovedExamPaymentStatus = (value) => (
    normalizeExamPaymentStatus(value) === 'paid' ? 'paid' : 'unpaid'
);

const getExamPaymentStatusMeta = (value) => {
    const status = normalizeExamPaymentStatus(value);
    if (status === 'paid') {
        return {
            status,
            label: 'Đã nộp học phí',
            title: 'Đã nộp học phí',
            className: 'border-emerald-200 bg-white text-emerald-700',
        };
    }

    if (status === 'unpaid') {
        return {
            status,
            label: 'Chưa nộp học phí',
            title: 'Chưa nộp học phí',
            className: 'border-rose-200 bg-rose-50 text-rose-700',
        };
    }

    return {
        status,
        label: 'Chưa xác định',
        title: 'Chưa xác định học phí',
        className: 'border-slate-200 bg-slate-100 text-slate-600',
    };
};

const EXAM_PAYMENT_FILTER_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'paid', label: 'Đã nộp' },
    { value: 'unpaid', label: 'Chưa nộp' },
];

const matchesApprovedStudentPaymentFilter = (student, filter) => {
    if (filter === 'all') return true;
    return normalizeApprovedExamPaymentStatus(student?.payment_status) === filter;
};

const formatLongDate = (value) => {
    if (!value) return 'Chưa chọn ngày thi';
    const d = toVietnamDate(value);
    if (!d || isNaN(d.getTime())) return 'Chưa chọn ngày thi';
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

const formatShortDate = (value, opts: { withTime?: boolean } = { withTime: true }) => {
    if (!value) return 'Chưa có ngày';
    if (opts.withTime) return formatDateVN(value, true) || 'Chưa có ngày';
    return formatDateVN(value, false) || 'Chưa có ngày';
};

const formatDurationLabel = (value) => {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
        return `${parsed} phút`;
    }

    return 'Chưa khai báo thời lượng';
};

const IMPORT_ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const IMPORT_TIME_RE = /^(\d{2}):(\d{2})$/;

const isValidImportDate = (value) => {
    const match = IMPORT_ISO_DATE_RE.exec(String(value || '').trim());
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const dt = new Date(year, month - 1, day);
    return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day;
};

const isValidImportTime = (value) => {
    const match = IMPORT_TIME_RE.exec(String(value || '').trim());
    if (!match) return false;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
};

const hasConfiguredLinkedClass = (value = {}) => Boolean(
    value.class_seed_name ||
    value.class_seed_schedule_rule ||
    value.class_seed_schedule_time ||
    value.class_seed_start_date
);

const hasConfiguredZoomMeeting = (value = {}) => Boolean(
    value.zoom_link ||
    value.zoom_link_backup ||
    value.zoom_meeting_id ||
    value.zoom_passcode ||
    value.zoom_meeting_id_backup ||
    value.zoom_passcode_backup
);

const createExamFormData = (overrides = {}) => ({
    exam_name: '',
    exam_date: '',
    exam_time: '',
    duration_minutes: '',
    location: '',
    google_map_url: '',
    notes: '',
    organizer_uuid: '',
    program_uuid: '',
    level_uuid: '',
    exam_level: '',
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
    // Zoom Meeting fields
    enable_zoom_meeting: false,
    zoom_link: '',
    zoom_link_backup: '',
    zoom_meeting_id: '',
    zoom_passcode: '',
    zoom_meeting_id_backup: '',
    zoom_passcode_backup: '',
    ...overrides,
});

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

const detectExcelPreviewFormat = (exam) => {
    const tokens = [
        exam?.organizer_name,
        exam?.program_name,
        exam?.exam_name,
        exam?.exam_type,
        exam?.exam_level,
        exam?.level_name,
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

const buildExamStudentSheetTitle = (examName) => {
    const normalized = String(examName || '').trim();
    if (!normalized) return 'DANH SÁCH THÍ SINH';
    return `DANH SÁCH THÍ SINH - ${normalized}`;
};

const buildExcelPreviewData = ({ exam, students }) => {
    const sortedStudents = [...(students || [])].sort(compareStudentsForExcelPreview);
    const previewFormat = detectExcelPreviewFormat(exam);
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
            leftHeaders: ['STT', 'Họ và tên đệm', 'Tên', 'Giới tính', 'Ngày sinh', 'Tháng sinh', 'Năm sinh', 'Số CMND/ Hộ chiếu', 'Điện thoại', 'Email', 'Đơn vị công tác/ Trường học', 'Vị trí công tác', 'Trình độ', 'Ngày thi', 'Mục đích', 'Nguồn'],
            rightHeaders: ['Kiểm tra hồ sơ', 'Ngày thi', 'Giờ thi', 'Địa điểm thi'],
            rows: sortedStudents.map((student, index) => {
                const { ho, ten } = getStudentNameParts(student);
                const date = toVietnamDate(student?.ngay_sinh);
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
        formatLabel: previewFormat === 'ptit' ? 'PTIT / Tin học' : 'Danh sách thí sinh mặc định',
        sheetTitle: buildExamStudentSheetTitle(exam?.exam_name),
        titleLines: [
            'CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO',
            'THEO THÔNG TƯ 03/2014/TT-BTTTT',
            buildExamStudentSheetTitle(exam?.exam_name),
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

const MobileExcelPreviewVept = ({ preview }) => (
    <div className="min-w-[1120px] overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-[11px] text-slate-700">
            <tbody>
                <tr>
                    <th colSpan={20} className="border border-slate-300 px-3 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-slate-900">
                        {preview.sheetTitle}
                    </th>
                </tr>
                <tr>
                    <td colSpan={8} className="border border-slate-300 px-2 py-2 font-semibold">{preview.organizationLine}</td>
                    <td colSpan={12} className="border border-slate-300 px-2 py-2" />
                </tr>
                <tr>
                    <td colSpan={4} className="border border-slate-300 px-2 py-2 font-semibold">{preview.representativeLine}</td>
                    <td colSpan={4} className="border border-slate-300 px-2 py-2 font-semibold">{preview.phoneLine}</td>
                    <td colSpan={8} className="border border-slate-300 px-2 py-2" />
                    <td colSpan={4} className="border border-rose-300 bg-rose-100 px-2 py-2 text-center font-black uppercase tracking-[0.08em] text-rose-700">{preview.centerLine}</td>
                </tr>
                <tr>
                    {preview.leftHeaders.map((header) => (
                        <th key={header} className="border border-amber-300 bg-amber-100 px-2 py-2 text-center font-bold leading-snug text-slate-900">
                            {header}
                        </th>
                    ))}
                    {preview.rightHeaders.map((header) => (
                        <th key={header} className="border border-rose-300 bg-rose-100 px-2 py-2 text-center font-bold leading-snug text-slate-900">
                            {header}
                        </th>
                    ))}
                </tr>
                {preview.rows.length ? preview.rows.map((row, rowIndex) => (
                    <tr key={`mobile-vept-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {row.map((value, columnIndex) => (
                            <td
                                key={`mobile-vept-cell-${rowIndex}-${columnIndex}`}
                                className={`border border-slate-200 px-2 py-2 align-top ${[0, 3, 4, 5, 7, 8, 12, 13, 16, 17, 18, 19].includes(columnIndex) ? 'text-center' : 'text-left'}`}
                            >
                                {renderPreviewCell(value)}
                            </td>
                        ))}
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={20} className="border border-slate-200 px-4 py-8 text-center text-slate-500">Không có dữ liệu để preview.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const MobileExcelPreviewExamList = ({ preview }) => (
    <div className="min-w-[860px] overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-[11px] text-slate-700">
            <tbody>
                {preview.titleLines.map((line, index) => (
                    <tr key={`mobile-exam-title-${index}`}>
                        <th colSpan={13} className={`px-3 py-2 text-center font-black uppercase tracking-[0.08em] text-slate-900 ${index === 2 ? 'text-sm' : 'text-[13px]'}`}>
                            {line}
                        </th>
                    </tr>
                ))}
                <tr>
                    <td colSpan={5} className="px-2 py-2" />
                    <td colSpan={8} className="px-2 py-2 text-left italic text-slate-600">{preview.infoLines[0]}</td>
                </tr>
                <tr>
                    <td colSpan={5} className="px-2 py-2" />
                    <td colSpan={8} className="px-2 py-2 text-left italic text-slate-600">{preview.infoLines[1]}</td>
                </tr>
                <tr>
                    <td colSpan={13} className="px-2 py-2" />
                </tr>
                <tr className="bg-slate-200">
                    {preview.headers.slice(0, 9).map((header) => (
                        <th key={header} rowSpan={2} className="border border-slate-400 bg-slate-200 px-2 py-2 text-center font-bold leading-snug text-slate-900">
                            {header}
                        </th>
                    ))}
                    <th colSpan={2} className="border border-slate-400 bg-slate-200 px-2 py-2 text-center font-bold leading-snug text-slate-900">
                        {preview.headers[9]}
                    </th>
                    {preview.headers.slice(10).map((header) => (
                        <th key={header} rowSpan={2} className="border border-slate-400 bg-slate-200 px-2 py-2 text-center font-bold leading-snug text-slate-900">
                            {header}
                        </th>
                    ))}
                </tr>
                <tr className="bg-slate-100">
                    <th className="border border-slate-400 bg-slate-100 px-2 py-2 text-center font-bold text-slate-900">{preview.subHeaders[0]}</th>
                    <th className="border border-slate-400 bg-slate-100 px-2 py-2 text-center font-bold text-slate-900">{preview.subHeaders[1]}</th>
                </tr>
                {preview.rows.length ? preview.rows.map((row, rowIndex) => (
                    <tr key={`mobile-exam-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {row.map((value, columnIndex) => (
                            <td
                                key={`mobile-exam-cell-${rowIndex}-${columnIndex}`}
                                className={`border border-slate-200 px-2 py-2 align-top ${[0, 1, 2, 5, 7, 8, 9, 10, 11, 12].includes(columnIndex) ? 'text-center' : 'text-left'}`}
                            >
                                {renderPreviewCell(value)}
                            </td>
                        ))}
                    </tr>
                )) : (
                    <tr>
                        <td colSpan={13} className="border border-slate-200 px-4 py-8 text-center text-slate-500">Không có dữ liệu để preview.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const MobileExcelPreviewFullInfo = ({ preview }) => {
    const centerIndexes = new Set(Array.isArray(preview?.centerColumnIndexes) ? preview.centerColumnIndexes : []);
    const totalColumns = Array.isArray(preview?.headers) ? preview.headers.length : 0;

    return (
        <div className="min-w-[1120px] overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-sm">
            <table className="min-w-full border-collapse text-[11px] text-slate-700">
                <tbody>
                    <tr>
                        <th colSpan={Math.max(totalColumns, 1)} className="border border-slate-300 bg-emerald-50 px-3 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-slate-900">
                            {preview?.sheetTitle || 'DANH SÁCH THÍ SINH'}
                        </th>
                    </tr>
                    {(preview?.infoLines || []).map((line, index) => (
                        <tr key={`mobile-full-info-line-${index}`}>
                            <td colSpan={Math.max(totalColumns, 1)} className="border border-slate-200 px-2 py-2 text-slate-600">
                                {line}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-blue-600">
                        {(preview?.headers || []).map((header) => (
                            <th key={header} className="border border-slate-300 px-2 py-2 text-center font-bold text-white">
                                {header}
                            </th>
                        ))}
                    </tr>
                    {(preview?.rows || []).length ? preview.rows.map((row, rowIndex) => (
                        <tr key={`mobile-full-info-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {row.map((value, columnIndex) => (
                                <td
                                    key={`mobile-full-info-cell-${rowIndex}-${columnIndex}`}
                                    className={`border border-slate-200 px-2 py-2 align-top ${centerIndexes.has(columnIndex) ? 'text-center' : 'text-left'}`}
                                >
                                    {renderPreviewCell(value)}
                                </td>
                            ))}
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={Math.max(totalColumns, 1)} className="border border-slate-200 px-4 py-8 text-center text-slate-500">
                                Không có dữ liệu để preview.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

const getExamTitle = (exam) => exam?.exam_name || exam?.title || exam?.ten_lich_thi || exam?.ten || 'Chưa có tên kỳ thi';

const getExamLocation = (exam) => exam?.location || exam?.room || exam?.dia_diem || exam?.phong_thi || 'Chưa xếp địa điểm';

const getExamDate = (exam) => {
    const raw = exam?.exam_date || exam?.ngay_thi || exam?.ngay;
    if (!raw) return new Date();
    const d = toVietnamDate(raw);
    return d && !isNaN(d.getTime()) ? d : new Date();
};

const getExamStudentCount = (exam) => Number(exam?.approved_count || 0) + Number(exam?.pending_count || 0);

const getExamPendingCount = (exam) => Number(exam?.pending_count || 0);

const getExamStatusMeta = (dateValue) => {
    const examDay = startOfDay(dateValue);
    const today = startOfDay();

    if (examDay.getTime() === today.getTime()) {
        return {
            key: 'today',
            label: 'Hôm nay',
            badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
            cardClass: 'border-emerald-200/70 shadow-emerald-100/60',
            accentClass: 'bg-emerald-500',
        };
    }

    if (examDay.getTime() < today.getTime()) {
        return {
            key: 'past',
            label: 'Đã qua',
            badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
            cardClass: 'border-slate-200 shadow-slate-100/60',
            accentClass: 'bg-slate-400',
        };
    }

    return {
        key: 'upcoming',
        label: 'Sắp tới',
        badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
        cardClass: 'border-blue-200/70 shadow-blue-100/60',
        accentClass: 'bg-blue-500',
    };
};

const SummaryStat = ({ label, value, icon: Icon, tone = 'slate' }) => {
    const styles = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        slate: 'bg-slate-50 text-slate-700 border-slate-100',
    };

    return (
        <div className={`rounded-xl border px-2.5 py-2 ${styles[tone] || styles.slate}`}>
            <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/85 shadow-sm">
                    <Icon size={15} />
                </div>
                <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] opacity-75">{label}</div>
                    <div className="mt-0.5 text-base font-black leading-none tracking-tight">{value}</div>
                </div>
            </div>
        </div>
    );
};

const FilterChip = ({ active, label, count, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-black transition-all ${
            active
                ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-200'
                : 'border-slate-200 bg-white text-slate-600'
        }`}
    >
        <span>{label}</span>
        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {count}
        </span>
    </button>
);

const SheetActionButton = ({ icon: Icon, label, tone = 'slate', onClick }) => {
    const tones = {
        slate: 'bg-white/15 text-white border-white/20',
        danger: 'bg-rose-500/25 text-white border-rose-200/20',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] backdrop-blur-sm transition-transform active:scale-95 ${tones[tone] || tones.slate}`}
        >
            <Icon size={14} />
            <span>{label}</span>
        </button>
    );
};

const StudentRow = ({ student, pending, conflict, processing, paymentProcessing, canManagePaymentStatus, onOpen, onApprove, onReject, onRemove, onHistory, onChangePaymentStatus }) => {
    const avatarUrl = getImageUrl(
      student.image_3x4 ||
      student.photo_3x4_image_id ||
      student.image_cccd_front ||
      student.cccd_front_image_id
    );
    const paymentStatusMeta = getExamPaymentStatusMeta(
        pending ? 'unknown' : normalizeApprovedExamPaymentStatus(student.payment_status)
    );
    return (
    <div className={`rounded-[24px] border bg-white p-3 shadow-sm ${pending ? 'border-amber-200/80' : 'border-slate-200/80'}`}>
        <div className="flex items-start gap-2.5">
            <button
                type="button"
                onClick={onOpen}
                className={`h-12 w-12 overflow-hidden rounded-[18px] border-2 text-sm font-black shadow-sm ${
                    pending
                        ? 'border-amber-200 bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                        : 'border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-500 text-white'
                }`}
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={student.ho_ten_full}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                            event.currentTarget.style.display = 'none';
                            const fallback = event.currentTarget.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                ) : null}
                <span
                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                    className="h-full w-full items-center justify-center"
                >
                    {student.ho_ten_full?.charAt(0)?.toUpperCase() || 'U'}
                </span>
            </button>

            <div className="min-w-0 flex-1">
                <button type="button" onClick={onOpen} className="w-full text-left">
                    <div className="flex items-center gap-2">
                        <h4 className="truncate text-[14px] font-bold text-slate-900">{student.ho_ten_full || 'Chưa có tên'}</h4>
                        <ChevronRight size={14} className="shrink-0 text-slate-300" />
                    </div>
                    <p className="mt-1 truncate text-[13px] text-slate-500">{student.cccd || 'Chưa có CCCD'}</p>
                </button>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {student.registration_date && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                            Đăng ký {formatDateVN(student.registration_date, true)}
                        </span>
                    )}
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        pending ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        {pending ? 'Chờ duyệt' : 'Đã duyệt'}
                    </span>
                    {canManagePaymentStatus ? (
                        pending ? (
                            <span
                                title={paymentStatusMeta.title}
                                className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${paymentStatusMeta.className}`}
                            >
                                {paymentStatusMeta.label}
                            </span>
                        ) : (
                            <div
                                className={`inline-flex items-center rounded-full border bg-white p-1 ${paymentProcessing ? 'opacity-60' : ''}`}
                                onClick={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                            >
                                {APPROVED_EXAM_PAYMENT_STATUS_OPTIONS.map((option) => {
                                    const optionMeta = getExamPaymentStatusMeta(option.value);
                                    const active = option.value === paymentStatusMeta.status;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            disabled={paymentProcessing}
                                            title={option.label}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onChangePaymentStatus(option.value);
                                            }}
                                            className={`rounded-full px-2 py-1 text-[10px] font-semibold transition active:scale-95 ${active ? optionMeta.className : 'border-transparent bg-white text-slate-500'}`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    ) : null}
                    {conflict ? (
                        <button
                            type="button"
                            onClick={onHistory}
                            className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-700"
                        >
                            Trùng đăng ký
                        </button>
                    ) : null}
                    {!pending && student.approved_at && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600">
                            Duyệt {formatDateVN(student.approved_at, true)}
                        </span>
                    )}
                    {!pending && student.approved_by_name && (
                        <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-600">
                            {student.approved_by_name}
                        </span>
                    )}
                    {!pending && student.zoom_checked_in_at && (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            🎥 Zoom {formatDateVN(student.zoom_checked_in_at, true)}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1.5">
                {pending ? (
                    <>
                        <button
                            type="button"
                            onClick={onApprove}
                            disabled={processing}
                            className="rounded-[18px] bg-emerald-100 p-2 text-emerald-700 transition-transform active:scale-95 disabled:opacity-50"
                            title="Duyệt thí sinh"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={onReject}
                            disabled={processing}
                            className="rounded-[18px] bg-rose-100 p-2 text-rose-600 transition-transform active:scale-95 disabled:opacity-50"
                            title="Từ chối thí sinh"
                        >
                            <XCircle size={16} />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={processing}
                        className="rounded-[18px] bg-rose-50 p-2 text-rose-500 transition-transform active:scale-95 disabled:opacity-50"
                        title="Xóa khỏi kỳ thi"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    </div>
    );
};

const OverlaySheet = ({ open, onClose, title, description, tone = 'slate', children, footer }) => {
    if (!open) return null;

    const toneMap = {
        slate: 'from-slate-800 to-slate-950 text-white',
        blue: 'from-blue-700 to-blue-900 text-white',
        rose: 'from-rose-600 to-rose-900 text-white',
        amber: 'from-amber-500 to-orange-600 text-white',
    };

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000] flex items-end bg-slate-950/55" onClick={onClose}>
                <div
                    className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                <div className={`bg-gradient-to-r px-5 pb-4 pt-5 ${toneMap[tone] || toneMap.slate}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-black">{title}</h3>
                            {description ? <p className="mt-1 text-sm text-white/80">{description}</p> : null}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-white/15"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50">{children}</div>

                {footer ? (
                    <div className="border-t border-slate-200 bg-white px-4 py-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                        {footer}
                    </div>
                ) : null}
                </div>
            </div>
        </OverlayPortal>
    );
};

const ExamFormSheet = ({ exam, onClose, onSuccess, onError }) => {
    const [organizerOptions, setOrganizerOptions] = useState([]);
    const [programOptions, setProgramOptions] = useState([]);
    const [levelOptions, setLevelOptions] = useState([]);
    const [templateOptions, setTemplateOptions] = useState([]);
    const [programPlatformLoading, setProgramPlatformLoading] = useState(false);
    const [programPlatformError, setProgramPlatformError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(Boolean(exam));
    const [formData, setFormData] = useState(createExamFormData());
    const [hasManualTemplateSelection, setHasManualTemplateSelection] = useState(false);

    useEffect(() => {
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

                const failures = [];

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
            } catch (error) {
                console.error('Failed to load program platform', error);
                setProgramPlatformError('Không tải được danh mục lịch thi. Vui lòng thử lại.');
            } finally {
                setProgramPlatformLoading(false);
            }
        };

        loadProgramPlatform();
    }, []);

    useEffect(() => {
        setHasManualTemplateSelection(false);

        if (!exam) return;

        setFormData(createExamFormData({
            exam_name: getExamTitle(exam),
            exam_date: formatVietnamDateInputValue(exam.exam_date),
            exam_time: formatTimeUtil(exam.exam_date),
            duration_minutes: exam.duration_minutes != null ? String(exam.duration_minutes) : '',
            location: getExamLocation(exam) === 'Chưa xếp địa điểm' ? '' : getExamLocation(exam),
            google_map_url: exam.google_map_url || '',
            notes: exam.notes || '',
            organizer_uuid: exam.organizer_uuid || '',
            program_uuid: exam.program_uuid || '',
            level_uuid: exam.level_uuid || '',
            exam_level: exam.exam_level || '',
            template_id: exam.template_id ? String(exam.template_id) : '',
            enable_linked_class: hasConfiguredLinkedClass(exam),
            class_seed_name: exam.class_seed_name || `${getExamTitle(exam)} - Lớp ôn tập`,
            class_seed_description: exam.class_seed_description || exam.notes || '',
            class_seed_schedule_rule: exam.class_seed_schedule_rule || DEFAULT_CLASS_SEED_RULE,
            class_seed_schedule_time: exam.class_seed_schedule_time || DEFAULT_CLASS_SEED_TIME,
            class_seed_timezone: exam.class_seed_timezone || DEFAULT_CLASS_SEED_TIMEZONE,
            class_seed_start_date: formatVietnamDateInputValue(exam.class_seed_start_date || exam.exam_date),
            class_seed_end_date: exam.class_seed_end_date || '',
            class_seed_max_students: exam.class_seed_max_students || DEFAULT_CLASS_SEED_MAX_STUDENTS,
            // Zoom Meeting
            enable_zoom_meeting: hasConfiguredZoomMeeting(exam),
            zoom_link: exam.zoom_link || '',
            zoom_link_backup: exam.zoom_link_backup || '',
            zoom_meeting_id: exam.zoom_meeting_id || '',
            zoom_passcode: exam.zoom_passcode || '',
            zoom_meeting_id_backup: exam.zoom_meeting_id_backup || '',
            zoom_passcode_backup: exam.zoom_passcode_backup || '',
        }));
    }, [exam]);

    const updateField = (key, value) => {
        if (key === 'template_id') {
            setHasManualTemplateSelection(true);
        }

        setFormData((current) => {
            const next = { ...current, [key]: value };

            if (!exam && key === 'exam_name') {
                if (!current.class_seed_name || current.class_seed_name === `${current.exam_name} - Lớp ôn tập`) {
                    next.class_seed_name = value ? `${value} - Lớp ôn tập` : '';
                }
            }

            if (key === 'exam_date' && (!current.class_seed_start_date || current.class_seed_start_date === current.exam_date)) {
                next.class_seed_start_date = value;
            }

            if (key === 'organizer_uuid' && current.organizer_uuid !== value) {
                next.program_uuid = '';
                next.level_uuid = '';
                next.exam_level = '';
            }

            if (key === 'program_uuid' && current.program_uuid !== value) {
                const nextProgram = programOptions.find((item) => String(item.uuid) === String(value));
                next.level_uuid = '';
                next.exam_level = '';
                if (nextProgram?.deliveryMode === 'external_redirect') {
                    next.enable_linked_class = false;
                    next.class_seed_name = '';
                    next.class_seed_description = '';
                }
            }

            if (key === 'level_uuid') {
                const nextLevel = levelOptions.find((item) => String(item.uuid) === String(value));
                next.exam_level = nextLevel?.code || '';
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

    const summaryDateText = useMemo(() => {
        if (!formData.exam_date) return 'Chọn ngày và giờ để xem trước';
        const composed = `${formData.exam_date}T${formData.exam_time || '00:00'}:00`;
        return `${formatLongDate(composed)}${formData.exam_time ? ` • ${formData.exam_time}` : ''}`;
    }, [formData.exam_date, formData.exam_time]);

    const selectedOrganizer = useMemo(
        () => organizerOptions.find((item) => String(item.uuid) === String(formData.organizer_uuid)),
        [organizerOptions, formData.organizer_uuid]
    );

    const selectedProgram = useMemo(
        () => programOptions.find((item) => String(item.uuid) === String(formData.program_uuid)),
        [programOptions, formData.program_uuid]
    );

    const selectedLevel = useMemo(
        () => levelOptions.find((item) => String(item.uuid) === String(formData.level_uuid)),
        [levelOptions, formData.level_uuid]
    );

    const selectedTemplate = useMemo(
        () => findExamTemplateOption(templateOptions, formData.template_id),
        [templateOptions, formData.template_id]
    );

    const filteredProgramOptions = useMemo(() => {
        if (!formData.organizer_uuid) {
            return programOptions;
        }

        return programOptions.filter((item) => String(item.organizerUuid) === String(formData.organizer_uuid));
    }, [formData.organizer_uuid, programOptions]);

    const filteredLevelOptions = useMemo(() => {
        if (!formData.program_uuid) {
            return [];
        }

        return levelOptions.filter((item) => String(item.programUuid) === String(formData.program_uuid));
    }, [formData.program_uuid, levelOptions]);

    const usesExternalExamLink = useMemo(
        () => selectedProgram?.deliveryMode === 'external_redirect',
        [selectedProgram]
    );
    const linkedClassEnabled = !usesExternalExamLink && Boolean(formData.enable_linked_class);

    useEffect(() => {
        if (!templateOptions.length) {
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
            const shouldKeepSavedEditTemplate = Boolean(exam && currentTemplateId);
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
        exam,
        hasManualTemplateSelection,
        formData.organizer_uuid,
        formData.program_uuid,
        organizerOptions,
        programOptions,
        templateOptions,
    ]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (programPlatformLoading) {
            onError?.('Đang tải danh mục lịch thi. Vui lòng chờ tải xong rồi thử lại.');
            return;
        }

        if (organizerOptions.length === 0 || programOptions.length === 0) {
            onError?.(programPlatformError || 'Chưa tải được đơn vị tổ chức hoặc chương trình thi. Vui lòng thử lại.');
            return;
        }

        setLoading(true);

        try {
            if (!formData.organizer_uuid) {
                throw new Error('Vui lòng chọn đơn vị tổ chức');
            }

            if (!formData.program_uuid) {
                throw new Error('Vui lòng chọn chương trình thi');
            }

            if (filteredLevelOptions.length > 0 && !formData.level_uuid) {
                throw new Error('Vui lòng chọn trình độ');
            }

            if (formData.duration_minutes !== '') {
                const parsedDuration = Number.parseInt(String(formData.duration_minutes), 10);
                if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
                    throw new Error('Thời lượng phải là số dương hợp lệ');
                }
            }

            if (linkedClassEnabled) {
                if (!formData.class_seed_name?.trim()) {
                    throw new Error('Vui lòng nhập tên lớp linked');
                }

                if (!formData.class_seed_schedule_rule?.trim() || !formData.class_seed_schedule_time?.trim()) {
                    throw new Error('Vui lòng nhập đủ lịch học cho lớp linked');
                }

                if (!formData.class_seed_start_date) {
                    throw new Error('Vui lòng chọn ngày bắt đầu lớp linked');
                }
            }

            const examDatePayload = buildVietnamDateTimePayload(formData.exam_date, formData.exam_time);
            if (!examDatePayload) {
                throw new Error('Ngày giờ thi không hợp lệ');
            }
            const durationMinutes = formData.duration_minutes === ''
                ? null
                : Number.parseInt(String(formData.duration_minutes), 10);
            const payload = {
                exam_name: formData.exam_name,
                exam_date: examDatePayload,
                duration_minutes: durationMinutes,
                location: formData.location,
                google_map_url: formData.google_map_url?.trim() || null,
                notes: formData.notes,
                organizer_uuid: formData.organizer_uuid || null,
                program_uuid: formData.program_uuid || null,
                level_uuid: formData.level_uuid || null,
                exam_level: selectedLevel?.code || formData.exam_level || null,
                template_id: formData.template_id ? Number.parseInt(String(formData.template_id), 10) : undefined,
                class_id: null,
                enable_linked_class: linkedClassEnabled,
                class_seed: linkedClassEnabled
                    ? {
                        name: formData.class_seed_name,
                        description: formData.class_seed_description || null,
                        schedule_rule: formData.class_seed_schedule_rule,
                        schedule_time: formData.class_seed_schedule_time,
                        timezone: formData.class_seed_timezone || DEFAULT_CLASS_SEED_TIMEZONE,
                        start_date: formData.class_seed_start_date,
                        end_date: formData.class_seed_end_date || null,
                        max_students: Math.max(1, Number(formData.class_seed_max_students) || DEFAULT_CLASS_SEED_MAX_STUDENTS),
                    }
                    : null,
                // Zoom Meeting
                enable_zoom_meeting: formData.enable_zoom_meeting,
                zoom_link: formData.enable_zoom_meeting ? (formData.zoom_link?.trim() || null) : null,
                zoom_link_backup: formData.enable_zoom_meeting ? (formData.zoom_link_backup?.trim() || null) : null,
                zoom_link_backup_2: null,
                zoom_link_backup_3: null,
                zoom_meeting_id: formData.enable_zoom_meeting ? (formData.zoom_meeting_id?.trim() || null) : null,
                zoom_passcode: formData.enable_zoom_meeting ? (formData.zoom_passcode?.trim() || null) : null,
                zoom_meeting_id_backup: formData.enable_zoom_meeting ? (formData.zoom_meeting_id_backup?.trim() || null) : null,
                zoom_passcode_backup: formData.enable_zoom_meeting ? (formData.zoom_passcode_backup?.trim() || null) : null,
            };

            const response = exam
                ? await api.updateExamSchedule(exam.id, payload)
                : await api.createExamSchedule(payload);

            if (response?.success) {
                onSuccess?.();
                return;
            }

            onError?.(response?.message || 'Không thể lưu lịch thi');
        } catch (error) {
            console.error(error);
            onError?.(getErrorMessage(error, 'Không thể lưu lịch thi'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000] flex items-end bg-slate-950/55" onClick={onClose}>
                <div
                    className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#3b82f6_100%)] px-4 pb-3 pt-4 text-white">
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100">
                                {exam ? 'Chỉnh sửa kỳ thi' : 'Tạo kỳ thi mới'}
                            </p>
                            <h3 className="mt-1.5 text-xl font-black tracking-tight">
                                {exam ? 'Cập nhật lịch thi' : 'Tạo kỳ thi mới'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm"
                        >
                            <X size={18} />
                        </button>
                    </div>

                        <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                        <h4 className="text-lg font-black leading-tight">
                            {formData.exam_name || '...'}
                        </h4>
                        <p className="mt-2 text-sm text-blue-50/90">{summaryDateText}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {selectedOrganizer?.name ? (
                                <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold">{selectedOrganizer.name}</span>
                            ) : null}
                            {selectedProgram?.name ? (
                                <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold">{selectedProgram.name}</span>
                            ) : null}
                            {selectedLevel?.code ? (
                                <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">{selectedLevel.code}</span>
                            ) : null}
                            {selectedTemplate?.display_name ? (
                                <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold">{selectedTemplate.display_name}</span>
                            ) : null}
                            <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold">
                                {formatDurationLabel(formData.duration_minutes)}
                            </span>
                            {formData.location ? (
                                <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold">{formData.location}</span>
                            ) : null}
                            {formData.google_map_url ? (
                                <span className="rounded-full bg-cyan-100 px-3 py-1.5 font-semibold text-cyan-800">Google Maps</span>
                            ) : null}
                            {linkedClassEnabled && formData.class_seed_name ? (
                                <span className="rounded-full bg-white/15 px-3 py-1.5 font-semibold">Linked lớp ôn tập</span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
                    <form id="mobile-exam-form" onSubmit={handleSubmit} className="space-y-4">
                        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Khung chính</p>
                                <h4 className="mt-1 text-lg font-black text-slate-900">Thông tin kỳ thi</h4>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tên kỳ thi</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.exam_name}
                                        onChange={(event) => updateField('exam_name', event.target.value)}
                                        placeholder="Ví dụ: Thi cuối kỳ lớp B1"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                {programPlatformError ? (
                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                        {programPlatformError}
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Đơn vị tổ chức</label>
                                        <select
                                            required
                                            value={formData.organizer_uuid}
                                            onChange={(event) => updateField('organizer_uuid', event.target.value)}
                                            disabled={programPlatformLoading}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        >
                                            <option value="">{programPlatformLoading ? 'Đang tải đơn vị' : 'Chọn đơn vị'}</option>
                                            {organizerOptions.map((item) => (
                                                <option key={item.uuid} value={item.uuid}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Chương trình thi</label>
                                        <select
                                            required
                                            value={formData.program_uuid}
                                            onChange={(event) => updateField('program_uuid', event.target.value)}
                                            disabled={programPlatformLoading || !formData.organizer_uuid}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        >
                                            <option value="">{programPlatformLoading ? 'Đang tải chương trình' : 'Chọn chương trình'}</option>
                                            {filteredProgramOptions.map((item) => (
                                                <option key={item.uuid} value={item.uuid}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Trình độ</label>
                                        <select
                                            value={formData.level_uuid}
                                            onChange={(event) => updateField('level_uuid', event.target.value)}
                                            disabled={programPlatformLoading || !formData.program_uuid || filteredLevelOptions.length === 0}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        >
                                            <option value="">
                                                {programPlatformLoading
                                                    ? 'Đang tải trình độ'
                                                    : filteredLevelOptions.length
                                                        ? 'Chọn trình độ'
                                                        : 'Không có trình độ'}
                                            </option>
                                            {filteredLevelOptions.map((item) => (
                                                <option key={item.uuid} value={item.uuid}>{item.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ngày thi</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.exam_date}
                                            onChange={(event) => updateField('exam_date', event.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mẫu Excel</label>
                                    <select
                                        value={formData.template_id}
                                        onChange={(event) => updateField('template_id', event.target.value)}
                                        disabled={programPlatformLoading}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="">{programPlatformLoading ? 'Đang tải mẫu' : 'Không dùng mẫu riêng'}</option>
                                        {templateOptions.map((item) => (
                                            <option key={item.id} value={String(item.id)}>{item.display_name || item.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Giờ thi</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.exam_time}
                                            onChange={(event) => updateField('exam_time', event.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Thời lượng</label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={formData.duration_minutes}
                                            onChange={(event) => updateField('duration_minutes', event.target.value)}
                                            placeholder="Có thể bỏ trống"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Địa điểm / hình thức</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(event) => updateField('location', event.target.value)}
                                            placeholder="Ví dụ: Eduglobal, Trực tuyến qua Zoom"
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Link Google Maps (tuỳ chọn)</label>
                                    <input
                                        type="url"
                                        value={formData.google_map_url}
                                        onChange={(event) => updateField('google_map_url', event.target.value)}
                                        placeholder="https://maps.app.goo.gl/... hoặc google.com/maps..."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                    <p className="mt-1.5 text-xs text-slate-500">Học viên sẽ có nút mở bản đồ trực tiếp.</p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(event) => updateField('notes', event.target.value)}
                                        rows={3}
                                        placeholder="Ghi chú cho admin, giám thị hoặc lớp ôn tập liên quan. Giữ nguyên xuống dòng khi hiển thị."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>
                            </div>
                        </section>

                        {usesExternalExamLink ? (
                            <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm">
                                VEPT/Versant dùng link riêng, không tạo lớp đào tạo nội bộ. VSTEP và Tin học mới cần linked class để ôn tập.
                            </section>
                        ) : null}

                        {/* ===== ZOOM MEETING SECTION ===== */}
                        <section className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-500">Trực tuyến</p>
                                    <h4 className="mt-1 text-lg font-black text-slate-900">Zoom Meeting</h4>
                                </div>
                                <label className="flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-sky-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.enable_zoom_meeting)}
                                        onChange={(event) => updateField('enable_zoom_meeting', event.target.checked)}
                                    />
                                    Bật Zoom
                                </label>
                            </div>

                            {formData.enable_zoom_meeting ? (
                                <div className="space-y-4">
                                    {/* Link chính */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Link tham gia</label>
                                        <input
                                            type="url"
                                            value={formData.zoom_link}
                                            onChange={(event) => updateField('zoom_link', event.target.value)}
                                            placeholder="https://zoom.us/j/..."
                                            className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                        />
                                    </div>

                                    {/* Meeting ID + Passcode chính */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Meeting ID</label>
                                            <input
                                                type="text"
                                                value={formData.zoom_meeting_id}
                                                onChange={(event) => updateField('zoom_meeting_id', event.target.value)}
                                                placeholder="123 456 7890"
                                                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Passcode</label>
                                            <input
                                                type="text"
                                                value={formData.zoom_passcode}
                                                onChange={(event) => updateField('zoom_passcode', event.target.value)}
                                                placeholder="Mật khẩu"
                                                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                            />
                                        </div>
                                    </div>

                                    {/* Divider dự phòng */}
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-sky-100" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">Dự phòng</span>
                                        <div className="h-px flex-1 bg-sky-100" />
                                    </div>

                                    {/* Link dự phòng */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Link dự phòng</label>
                                        <input
                                            type="url"
                                            value={formData.zoom_link_backup}
                                            onChange={(event) => updateField('zoom_link_backup', event.target.value)}
                                            placeholder="https://zoom.us/j/... (backup)"
                                            className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                        />
                                    </div>

                                    {/* Meeting ID + Passcode dự phòng */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Meeting ID dự phòng</label>
                                            <input
                                                type="text"
                                                value={formData.zoom_meeting_id_backup}
                                                onChange={(event) => updateField('zoom_meeting_id_backup', event.target.value)}
                                                placeholder="123 456 7890"
                                                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Passcode dự phòng</label>
                                            <input
                                                type="text"
                                                value={formData.zoom_passcode_backup}
                                                onChange={(event) => updateField('zoom_passcode_backup', event.target.value)}
                                                placeholder="Mật khẩu"
                                                className="w-full rounded-2xl border border-sky-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">Bật Zoom để nhập link và thông tin phòng họp cho thí sinh.</p>
                            )}
                        </section>
                        {/* ===== END ZOOM MEETING SECTION ===== */}

                        <section className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-500">Tự động hóa</p>
                                    <h4 className="mt-1 text-lg font-black text-slate-900">Lớp ôn tập linked</h4>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <label className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-emerald-700">
                                        <input
                                            type="checkbox"
                                            checked={linkedClassEnabled}
                                            onChange={(event) => updateField('enable_linked_class', event.target.checked)}
                                        />
                                        Mở linked
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAdvanced((current) => !current)}
                                        className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-emerald-700"
                                    >
                                        {showAdvanced ? 'Thu gọn' : 'Mở rộng'}
                                    </button>
                                </div>
                            </div>

                            {linkedClassEnabled ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tên lớp ôn tập *</label>
                                    <input
                                        type="text"
                                        required={linkedClassEnabled}
                                        value={formData.class_seed_name}
                                        onChange={(event) => updateField('class_seed_name', event.target.value)}
                                        placeholder="Ví dụ: Lớp ôn thi B1"
                                        className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">Preset lịch học</label>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {SCHEDULE_PRESETS.map((preset) => {
                                            const active = formData.class_seed_schedule_rule === preset.rule && formData.class_seed_schedule_time === preset.time;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => applySchedulePreset(preset)}
                                                    className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition ${
                                                        active
                                                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                                                            : 'border-emerald-200 bg-white text-slate-700'
                                                    }`}
                                                >
                                                    <div className="text-sm font-bold">{preset.label}</div>
                                                    <div className={`text-[11px] ${active ? 'text-white/85' : 'text-slate-500'}`}>{preset.helper}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Quy tắc lịch *</label>
                                        <input
                                            type="text"
                                            required={linkedClassEnabled}
                                            value={formData.class_seed_schedule_rule}
                                            onChange={(event) => updateField('class_seed_schedule_rule', event.target.value.toUpperCase())}
                                            placeholder="WEEKLY:1,3,5"
                                            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Khung giờ học *</label>
                                        <input
                                            type="text"
                                            required={linkedClassEnabled}
                                            value={formData.class_seed_schedule_time}
                                            onChange={(event) => updateField('class_seed_schedule_time', event.target.value)}
                                            placeholder="19:00-21:00"
                                            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ngày bắt đầu *</label>
                                        <input
                                            type="date"
                                            required={linkedClassEnabled}
                                            value={formData.class_seed_start_date}
                                            onChange={(event) => updateField('class_seed_start_date', event.target.value)}
                                            className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mô tả lớp</label>
                                    <textarea
                                        value={formData.class_seed_description}
                                        onChange={(event) => updateField('class_seed_description', event.target.value)}
                                        rows={3}
                                        placeholder="Mục tiêu lớp, nội dung ôn tập hoặc nhắc nhở cho giáo viên"
                                        className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                </div>

                                {showAdvanced ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ngày kết thúc</label>
                                            <input
                                                type="date"
                                                value={formData.class_seed_end_date}
                                                onChange={(event) => updateField('class_seed_end_date', event.target.value)}
                                                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Sĩ số tối đa</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.class_seed_max_students}
                                                onChange={(event) => updateField('class_seed_max_students', event.target.value)}
                                                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Múi giờ</label>
                                            <select
                                                value={formData.class_seed_timezone}
                                                onChange={(event) => updateField('class_seed_timezone', event.target.value)}
                                                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                            >
                                                {TIMEZONE_OPTIONS.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            ) : (
                            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-4 text-sm text-emerald-800">
                                Linked class đang tắt. Lịch thi sẽ được lưu độc lập, không tạo lớp online cho teacher workspace.
                            </div>
                            )}
                        </section>
                    </form>
                </div>

                <div
                    className="border-t border-slate-200 bg-white px-4 pb-4 pt-4"
                    style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <button
                        type="submit"
                        form="mobile-exam-form"
                        disabled={loading || programPlatformLoading}
                        className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-black text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)] transition-transform active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Đang lưu lịch thi...' : programPlatformLoading ? 'Đang tải danh mục...' : exam ? 'Lưu thay đổi' : 'Tạo lịch thi'}
                    </button>
                </div>
                </div>
            </div>
        </OverlayPortal>
    );
};

const ExamCard = ({ exam, onOpen }) => {
    const title = getExamTitle(exam);
    const dateObj = getExamDate(exam);
    const location = getExamLocation(exam);
    const pendingCount = getExamPendingCount(exam);
    const studentCount = getExamStudentCount(exam);
    const status = getExamStatusMeta(dateObj);

    return (
        <button
            type="button"
            onClick={() => onOpen(exam)}
            className={`relative w-full overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3.5 text-left shadow-[0_20px_46px_-30px_rgba(15,23,42,0.34)] transition-transform active:scale-[0.98] ${status.cardClass}`}
        >
            <div className="flex items-start gap-3.5">
                <div className="flex w-[58px] shrink-0 flex-col items-center rounded-[18px] border border-blue-200/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_26%),linear-gradient(135deg,#1d4ed8_0%,#2563eb_55%,#3b82f6_100%)] py-2.5 text-white shadow-[0_18px_34px_-20px_rgba(37,99,235,0.6)]">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/60">
                        {dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </p>
                    <p className="text-[24px] font-black leading-none tracking-[-0.04em]">{String(dateObj.getDate()).padStart(2, '0')}</p>
                    <p className="text-[9px] font-semibold text-white/60">T{dateObj.getMonth() + 1}/{dateObj.getFullYear()}</p>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide shadow-sm ${status.badgeClass}`}>
                            {status.label}
                        </span>
                        {pendingCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-semibold text-amber-700 shadow-sm">
                                {pendingCount} chờ duyệt
                            </span>
                        )}
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-[16px] font-black leading-snug tracking-[-0.03em] text-slate-900">
                        {title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748b]">
                        <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 shadow-sm">
                            <Clock size={12} className="text-blue-500" />
                            {formatDateVN(exam.exam_date)} {formatTimeUtil(exam.exam_date)}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 shadow-sm">
                            <MapPin size={12} className="text-blue-500" />
                            <span className="max-w-[120px] truncate">{location}</span>
                        </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-[18px] border border-slate-100 bg-white px-3 py-2 shadow-sm">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5d6d84]">
                            <Users size={13} className="text-blue-500" />
                            {studentCount} thí sinh
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
                            Chi tiết <ChevronRight size={12} />
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
};

const ExamDetailSheet = ({ exam, onClose, onRefresh, onEdit, onDelete, onError }) => {
    const toast = useToast();
    const currentAdmin = getStoredAdmin();
    const canManagePaymentStatus = canAccessExamFeeStatus(currentAdmin);
    const [activeTab, setActiveTab] = useState('approved');
    const [approvedList, setApprovedList] = useState([]);
    const [pendingList, setPendingList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showStudentDetail, setShowStudentDetail] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentPaymentFilter, setStudentPaymentFilter] = useState('all');
    const [processingStudentId, setProcessingStudentId] = useState(null);
    const [paymentProcessingStudentId, setPaymentProcessingStudentId] = useState(null);
    const [conflictStudentIds, setConflictStudentIds] = useState(new Set());
    const [conflicts, setConflicts] = useState([]);
    const [conflictsLoading, setConflictsLoading] = useState(false);
    const [showConflictsSheet, setShowConflictsSheet] = useState(false);
    const [showAddStudentsSheet, setShowAddStudentsSheet] = useState(false);
    const [addStudentsQuery, setAddStudentsQuery] = useState('');
    const [addStudentsLoading, setAddStudentsLoading] = useState(false);
    const [addStudentsResults, setAddStudentsResults] = useState([]);
    const [selectedAddStudentIds, setSelectedAddStudentIds] = useState(new Set());
    const [addingStudents, setAddingStudents] = useState(false);
    const [addStudentsSummary, setAddStudentsSummary] = useState('');
    const [showHistorySheet, setShowHistorySheet] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyRows, setHistoryRows] = useState([]);
    const [historyStudent, setHistoryStudent] = useState(null);
    const [showExcelPreviewSheet, setShowExcelPreviewSheet] = useState(false);
    const [excelPreviewLoading, setExcelPreviewLoading] = useState(false);
    const [excelPreviewData, setExcelPreviewData] = useState(null);

    // Điểm danh học tập
    const [learningAttendance, setLearningAttendance] = useState(null);
    const [learningAttendanceLoading, setLearningAttendanceLoading] = useState(false);
    const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
    const [createSessionForm, setCreateSessionForm] = useState({ session_date: '', start_time: '07:00', end_time: '11:00', note: '' });
    const [createSessionLoading, setCreateSessionLoading] = useState(false);
    const [attendanceSaving, setAttendanceSaving] = useState(null); // `${sessionId}_${studentId}`
    const [showImportScheduleModal, setShowImportScheduleModal] = useState(false);
    const [importScheduleStep, setImportScheduleStep] = useState('upload');
    const [importScheduleFile, setImportScheduleFile] = useState<File | null>(null);
    const [importScheduleRows, setImportScheduleRows] = useState<any[]>([]);
    const [importScheduleLoading, setImportScheduleLoading] = useState(false);
    const [importScheduleSubmitting, setImportScheduleSubmitting] = useState(false);

    useEffect(() => {
        if (!exam) return;
        setStudentPaymentFilter('all');
        loadStudentLists();
    }, [exam]);

    const normalizeList = (response) => (
        Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.data)
                ? response.data.data
                : Array.isArray(response)
                    ? response
                    : []
    );

    const fetchConflicts = async ({ showLoader = false, surfaceError = false } = {}) => {
        if (showLoader) setConflictsLoading(true);
        try {
            const response = await api.getExamRegistrationConflicts();
            const rows = response?.success === false ? [] : normalizeList(response);
            setConflicts(rows);
            setConflictStudentIds(new Set(rows.map((item) => Number(item.student_id))));
            return rows;
        } catch (error) {
            console.error('Failed to load conflicts', error);
            if (surfaceError) onError?.(getErrorMessage(error, 'Không tải được danh sách trùng đăng ký'));
            setConflicts([]);
            setConflictStudentIds(new Set());
            return [];
        } finally {
            if (showLoader) setConflictsLoading(false);
        }
    };

    const loadStudentLists = async () => {
        setLoading(true);
        setExcelPreviewData(null);
        setExcelPreviewLoading(false);
        setShowExcelPreviewSheet(false);
        try {
            const [approvedRes, pendingRes, conflictRows] = await Promise.all([
                api.getExamStudents(exam.id, { withZoomCheckin: true }),
                api.getPendingExamStudents(exam.id),
                fetchConflicts(),
            ]);

            const approvedData = normalizeList(approvedRes);
            const pendingData = normalizeList(pendingRes);
            setApprovedList(approvedData);
            setPendingList(pendingData);
            setConflicts(conflictRows);

            if (!pendingData.length && activeTab === 'pending') {
                setActiveTab('approved');
            } else if (pendingData.length && activeTab !== 'approved' && activeTab !== 'pending') {
                setActiveTab('pending');
            } else if (!approvedData.length && pendingData.length) {
                setActiveTab('pending');
            }
        } catch (error) {
            console.error('Failed to load student lists', error);
            onError?.('Không tải được danh sách thí sinh');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveStudent = async (student) => {
        setProcessingStudentId(student.student_id);
        try {
            const response = await api.approveExamStudent(exam.id, student.student_id);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể duyệt thí sinh');
                return;
            }

            await loadStudentLists();
            onRefresh?.();
        } catch (error) {
            console.error('Failed to approve student', error);
            onError?.(getErrorMessage(error, 'Không thể duyệt thí sinh'));
        } finally {
            setProcessingStudentId(null);
        }
    };

    const handleApproveAll = async () => {
        if (!pendingList.length) return;

        try {
            const response = await api.approveAllExamStudents(exam.id);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể duyệt toàn bộ');
                return;
            }

            await loadStudentLists();
            onRefresh?.();
        } catch (error) {
            console.error('Failed to approve all', error);
            onError?.(getErrorMessage(error, 'Không thể duyệt toàn bộ'));
        }
    };

    const handleRejectStudent = async (student) => {
        setProcessingStudentId(student.student_id);
        try {
            const response = await api.rejectExamStudent(exam.id, student.student_id);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể từ chối thí sinh');
                return;
            }

            await loadStudentLists();
            onRefresh?.();
        } catch (error) {
            console.error('Failed to reject student', error);
            onError?.(getErrorMessage(error, 'Không thể từ chối thí sinh'));
        } finally {
            setProcessingStudentId(null);
        }
    };

    const handleRemoveStudent = async (student) => {
        if (!window.confirm(`Xóa ${student.ho_ten_full} khỏi danh sách kỳ thi này?`)) return;

        setProcessingStudentId(student.student_id);
        try {
            const response = await api.removeStudentFromExam(exam.id, student.student_id);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể xóa thí sinh');
                return;
            }

            await loadStudentLists();
            onRefresh?.();
        } catch (error) {
            console.error('Failed to remove student', error);
            onError?.(getErrorMessage(error, 'Không thể xóa thí sinh'));
        } finally {
            setProcessingStudentId(null);
        }
    };

    const syncStudentPaymentStatus = (studentId, paymentStatus) => {
        const normalizedStatus = normalizeExamPaymentStatus(paymentStatus);
        const applyStatus = (students) => students.map((student) => (
            Number(student.student_id || student.id) === Number(studentId)
                ? { ...student, payment_status: normalizedStatus }
                : student
        ));

        setApprovedList((prev) => applyStatus(prev));
        setPendingList((prev) => applyStatus(prev));
        setSelectedStudent((prev) => (
            prev && Number(prev.student_id || prev.id) === Number(studentId)
                ? { ...prev, payment_status: normalizedStatus }
                : prev
        ));
    };

    const handleStudentPaymentStatusChange = async (student, nextStatus) => {
        if (!canManagePaymentStatus) return;

        const studentId = Number(student.student_id || student.id);
        const normalizedNextStatus = normalizeExamPaymentStatus(nextStatus);
        if (normalizeExamPaymentStatus(student.payment_status) === normalizedNextStatus) return;
        setPaymentProcessingStudentId(studentId);

        try {
            const response = await (api as any).updateExamStudentPaymentStatus(exam.id, studentId, normalizedNextStatus);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể cập nhật học phí');
                return;
            }

            syncStudentPaymentStatus(studentId, response?.data?.payment_status || normalizedNextStatus);
            toast.success(`Đã cập nhật học phí của ${student.ho_ten_full} thành ${getExamPaymentStatusMeta(normalizedNextStatus).label.toLowerCase()}`);
        } catch (error) {
            console.error('Failed to update payment status', error);
            onError?.(getErrorMessage(error, 'Không thể cập nhật học phí'));
        } finally {
            setPaymentProcessingStudentId(null);
        }
    };

    const handleExportExcel = async () => {
        try {
            await api.downloadExamListExcel(exam.id);
        } catch (error) {
            console.error('Failed to export', error);
            onError?.(getErrorMessage(error, 'Không thể xuất danh sách Excel'));
        }
    };

    const loadExcelPreviewFromBackend = async () => {
        setExcelPreviewLoading(true);
        try {
            const response = await api.getExamListExcelPreview(exam.id);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể tải preview Excel');
                return false;
            }
            setExcelPreviewData(response.data || null);
            return true;
        } catch (error) {
            console.error('Failed to load preview', error);
            onError?.(getErrorMessage(error, 'Không thể tải preview Excel'));
            return false;
        } finally {
            setExcelPreviewLoading(false);
        }
    };

    const handleOpenExcelPreview = async () => {
        if (!approvedList.length) {
            onError?.('Không có dữ liệu để preview Excel');
            return;
        }

        const loaded = await loadExcelPreviewFromBackend();
        if (loaded) {
            setShowExcelPreviewSheet(true);
        }
    };

    const handleOpenStudentDetail = async (student) => {
        try {
            const response = await api.getStudentByCCCD(student.cccd);
            setSelectedStudent(response?.data || response || student);
        } catch (error) {
            console.error('Failed to fetch student detail', error);
            setSelectedStudent(student);
        } finally {
            setShowStudentDetail(true);
        }
    };

    const openAddStudentsSheet = () => {
        setAddStudentsQuery('');
        setAddStudentsResults([]);
        setSelectedAddStudentIds(new Set());
        setAddStudentsSummary('');
        setShowAddStudentsSheet(true);
    };

    const closeAddStudentsSheet = () => {
        setShowAddStudentsSheet(false);
        setAddStudentsQuery('');
        setAddStudentsResults([]);
        setSelectedAddStudentIds(new Set());
        setAddStudentsSummary('');
    };

    const handleSearchAddStudents = async () => {
        const query = String(addStudentsQuery || '').trim();
        if (query.length < 2) {
            onError?.('Nhập ít nhất 2 ký tự để tìm học viên');
            return;
        }

        setAddStudentsLoading(true);
        try {
            const response = await api.searchStudents(query);
            const rawResults = response?.success === false ? [] : normalizeList(response);
            const existingIds = new Set(
                [...approvedList, ...pendingList]
                    .map((student) => Number(student.student_id || student.id))
                    .filter(Boolean)
            );
            const filtered = rawResults.filter((student) => !existingIds.has(Number(student.id)));
            setSelectedAddStudentIds(new Set());
            setAddStudentsResults(filtered);
            setAddStudentsSummary(filtered.length ? '' : 'Không còn học viên phù hợp để thêm vào kỳ thi này.');
        } catch (error) {
            console.error('Failed to search students', error);
            onError?.(getErrorMessage(error, 'Không thể tìm kiếm học viên'));
        } finally {
            setAddStudentsLoading(false);
        }
    };

    const toggleSelectAddStudent = (studentId) => {
        setSelectedAddStudentIds((current) => {
            const next = new Set(current);
            if (next.has(studentId)) next.delete(studentId);
            else next.add(studentId);
            return next;
        });
    };

    const handleAddSelectedStudents = async (force = false) => {
        const ids = Array.from(selectedAddStudentIds || []);
        if (!ids.length) {
            onError?.('Chưa chọn học viên nào');
            return;
        }

        setAddingStudents(true);
        try {
            const response = await api.addStudentsToExamWithForce(exam.id, ids, force);
            if (!response?.success) {
                onError?.(response?.message || 'Không thể thêm thí sinh');
                return;
            }

            const results = Array.isArray(response?.results) ? response.results : [];
            const addedCount = results.filter((item) => item.status === 'success').length;
            const blockedCount = results.filter((item) => item.status === 'blocked').length;
            const failedCount = results.filter((item) => item.status === 'error').length;
            const summary = `Đã thêm ${addedCount}${blockedCount ? `, bị chặn ${blockedCount}` : ''}${failedCount ? `, lỗi ${failedCount}` : ''}.`;
            setAddStudentsSummary(summary);
            if (results.length) {
                const retryIds = results
                    .filter((item) => item.status !== 'success')
                    .map((item) => Number(item.student_id || item.id))
                    .filter(Boolean);
                setSelectedAddStudentIds(new Set(retryIds));
            }

            await loadStudentLists();
            onRefresh?.();

            if (blockedCount > 0 && !force) {
                onError?.(`${summary} Có hồ sơ bị chặn vì trùng đăng ký. Bạn có thể kiểm tra lịch sử hoặc thêm cưỡng bức.`);
            } else {
                closeAddStudentsSheet();
            }
        } catch (error) {
            console.error('Failed to add students', error);
            onError?.(getErrorMessage(error, 'Không thể thêm thí sinh vào kỳ thi'));
        } finally {
            setAddingStudents(false);
        }
    };

    const handleOpenConflicts = async () => {
        setShowConflictsSheet(true);
        await fetchConflicts({ showLoader: true, surfaceError: true });
    };

    const handleViewDuplicateHistory = async (student) => {
        if (!student?.student_id) return;

        setHistoryStudent(student);
        setHistoryRows([]);
        setShowHistorySheet(true);
        setHistoryLoading(true);

        try {
            const response = await api.getStudentExamRegistrationHistory(student.student_id);
            const rows = response?.success === false ? [] : normalizeList(response);
            setHistoryRows(rows);
        } catch (error) {
            console.error('Failed to load registration history', error);
            onError?.(getErrorMessage(error, 'Không thể tải lịch sử đăng ký'));
        } finally {
            setHistoryLoading(false);
        }
    };

    const displayList = activeTab === 'approved' ? approvedList : pendingList;

    // ── Điểm danh học tập handlers ──
    const loadLearningAttendance = async () => {
        if (!exam?.id) return;
        setLearningAttendanceLoading(true);
        try {
            const res = await api.getExamLearningAttendance(exam.id);
            if (res?.success) setLearningAttendance(res.data);
        } catch (err) {
            console.error('Error loading learning attendance:', err);
        } finally {
            setLearningAttendanceLoading(false);
        }
    };

    const handleCreateSession = async () => {
        if (!exam?.id || !createSessionForm.session_date) return;
        setCreateSessionLoading(true);
        try {
            const res = await api.createExamLearningSession(exam.id, createSessionForm);
            if (res?.success) {
                setShowCreateSessionModal(false);
                setCreateSessionForm({ session_date: '', start_time: '07:00', end_time: '11:00', note: '' });
                await loadLearningAttendance();
            } else {
                onError?.(res?.message || 'Lỗi tạo buổi học');
            }
        } catch (err) {
            onError?.('Lỗi: ' + (err?.message || 'Không xác định'));
        } finally {
            setCreateSessionLoading(false);
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (!exam?.id) return;
        if (!window.confirm('Xóa buổi học này? Tất cả dữ liệu điểm danh của buổi này sẽ bị xóa.')) return;
        try {
            const res = await api.deleteExamLearningSession(exam.id, sessionId);
            if (res?.success) await loadLearningAttendance();
            else onError?.(res?.message || 'Lỗi xóa buổi học');
        } catch (err) {
            onError?.('Lỗi: ' + (err?.message || 'Không xác định'));
        }
    };

    const handleToggleAttendance = async (sessionId, studentId, currentStatus, isCounted = true) => {
        const key = `${sessionId}_${studentId}`;
        if (attendanceSaving === key || !isCounted) return;
        setAttendanceSaving(key);
        const nextStatus = currentStatus === 'present' ? 'absent' : 'present';
        try {
            await api.updateExamLearningAttendance(exam.id, sessionId, studentId, { status: nextStatus });
            await loadLearningAttendance();
        } catch (err) {
            onError?.('Lỗi cập nhật điểm danh: ' + (err?.message || 'Không xác định'));
        } finally {
            setAttendanceSaving(null);
        }
    };

    const resetImportScheduleModal = () => {
        setImportScheduleStep('upload');
        setImportScheduleFile(null);
        setImportScheduleRows([]);
        setImportScheduleLoading(false);
        setImportScheduleSubmitting(false);
    };

    const openImportScheduleModal = () => {
        resetImportScheduleModal();
        setShowImportScheduleModal(true);
    };

    const closeImportScheduleModal = () => {
        setShowImportScheduleModal(false);
        resetImportScheduleModal();
    };

    const handlePreviewImportSchedule = async () => {
        if (!exam?.id) return;
        if (!importScheduleFile) {
            onError?.('Vui lòng chọn ảnh lịch học');
            return;
        }

        setImportScheduleLoading(true);
        try {
            const res = await (api as any).previewExamLearningSessionsImport(exam.id, importScheduleFile);
            if (!res?.success) {
                onError?.(res?.message || res?.error || 'Không thể OCR ảnh');
                return;
            }

            const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
            setImportScheduleRows(rows);
            setImportScheduleStep('preview');

            if (!rows.length) {
                onError?.('Chưa nhận diện được dòng lịch học nào');
            }
        } catch (err: any) {
            onError?.(err?.message || 'Lỗi OCR preview');
        } finally {
            setImportScheduleLoading(false);
        }
    };

    const handleImportRowFieldChange = (index, field, value) => {
        setImportScheduleRows((prev) => prev.map((row, rowIndex) => {
            if (rowIndex !== index) return row;

            const next = { ...row, [field]: value };
            const dateOk = isValidImportDate(next.session_date);
            const startOk = isValidImportTime(next.start_time);
            const endOk = isValidImportTime(next.end_time);
            const timeOrderOk = startOk && endOk ? String(next.start_time) < String(next.end_time) : false;
            const editedFromDuplicate =
                row.status === 'duplicate' &&
                (field === 'session_date' || field === 'start_time' || field === 'end_time');
            const nextStatus = dateOk && startOk && endOk && timeOrderOk
                ? (editedFromDuplicate ? 'ready' : (row.status === 'duplicate' ? 'duplicate' : 'ready'))
                : 'needs_review';

            return {
                ...next,
                status: nextStatus,
                warnings: nextStatus === 'needs_review'
                    ? ['Cần kiểm tra lại ngày/giờ']
                    : [],
            };
        }));
    };

    const handleCommitImportSchedule = async () => {
        if (!exam?.id) return;
        if (!importScheduleRows.length) {
            onError?.('Không có dòng để import');
            return;
        }
        if (importScheduleRows.some((row) => row.status === 'needs_review')) {
            onError?.('Vẫn còn dòng needs_review');
            return;
        }

        setImportScheduleSubmitting(true);
        try {
            const payloadRows = importScheduleRows.map((row) => ({
                row_id: row.row_id,
                session_date: row.session_date,
                start_time: row.start_time,
                end_time: row.end_time,
                note: row.note || null,
                status: row.status,
            }));
            const res = await (api as any).commitExamLearningSessionsImport(exam.id, payloadRows);
            if (!res?.success) {
                onError?.(res?.message || res?.error || 'Không thể import');
                return;
            }

            await loadLearningAttendance();
            await onRefresh?.();
            closeImportScheduleModal();
        } catch (err: any) {
            onError?.(err?.message || 'Lỗi xác nhận import');
        } finally {
            setImportScheduleSubmitting(false);
        }
    };

    const filteredStudents = useMemo(() => {
        const keyword = studentSearch.trim().toLowerCase();
        return displayList.filter((student) => {
            const name = (student.ho_ten_full || '').toLowerCase();
            const cccd = (student.cccd || '').toLowerCase();
            const matchesSearch = !keyword || name.includes(keyword) || cccd.includes(keyword);
            if (!matchesSearch) return false;

            if (activeTab !== 'approved' || !canManagePaymentStatus) {
                return true;
            }

            return matchesApprovedStudentPaymentFilter(student, studentPaymentFilter);
        });
    }, [activeTab, canManagePaymentStatus, displayList, studentPaymentFilter, studentSearch]);

    const studentSummary = useMemo(() => {
        const paid = approvedList.reduce((total, student) => (
            normalizeApprovedExamPaymentStatus(student?.payment_status) === 'paid' ? total + 1 : total
        ), 0);

        return {
            total: approvedList.length + pendingList.length,
            approved: approvedList.length,
            pending: pendingList.length,
            paid,
        };
    }, [approvedList, pendingList]);

    const currentConflictCount = useMemo(() => {
        const ids = new Set(
            [...approvedList, ...pendingList]
                .map((student) => Number(student.student_id || student.id))
                .filter(Boolean)
        );
        let total = 0;
        conflictStudentIds.forEach((id) => {
            if (ids.has(id)) total += 1;
        });
        return total;
    }, [approvedList, pendingList, conflictStudentIds]);

    const hasImportNeedsReviewRows = useMemo(
        () => importScheduleRows.some((row) => row.status === 'needs_review'),
        [importScheduleRows]
    );

    const examDate = getExamDate(exam);
    const status = getExamStatusMeta(examDate);

    return (
        <>
            <OverlayPortal>
                <div className="fixed inset-0 z-[100000] flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-4 lg:p-6" onClick={onClose}>
                    <div
                        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-[min(94dvh,940px)] sm:max-h-[94dvh] sm:max-w-[1080px] sm:rounded-[32px]"
                        onClick={(event) => event.stopPropagation()}
                    >
                    <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_60%,#2563eb_100%)] px-4 pb-2.5 pt-2.5 text-white sm:px-6 sm:pb-4 sm:pt-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-blue-100">Chi tiết lịch thi</p>
                                <h2 className="mt-1 line-clamp-2 text-[14px] font-black leading-snug sm:text-[1.25rem]">{getExamTitle(exam)}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/15 sm:h-10 sm:w-10"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${status.badgeClass}`}>
                                {status.label}
                            </span>
                            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-semibold">
                                {formatDateVN(exam.exam_date)} • {formatTimeUtil(exam.exam_date)}
                            </span>
                            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-semibold">
                                {formatDurationLabel(exam.duration_minutes)}
                            </span>
                            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-semibold">
                                {getExamLocation(exam)}
                            </span>
                        </div>

                        <div className={`mt-2.5 grid gap-2 ${canManagePaymentStatus ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm sm:p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-100">Tổng số</div>
                                <div className="mt-1 text-[15px] font-black sm:text-lg">{studentSummary.total}</div>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm sm:p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-100">Đã duyệt</div>
                                <div className="mt-1 text-[15px] font-black sm:text-lg">{studentSummary.approved}</div>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm sm:p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-100">Chờ duyệt</div>
                                <div className="mt-1 text-[15px] font-black sm:text-lg">{studentSummary.pending}</div>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm sm:p-3">
                                <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-100">{canManagePaymentStatus ? 'Học phí' : 'Địa điểm'}</div>
                                {canManagePaymentStatus ? (
                                    <>
                                        <div className="mt-1 text-[15px] font-black sm:text-lg">{studentSummary.paid}/{studentSummary.approved}</div>
                                        <div className="mt-1 text-[10px] text-blue-100/80">đã nộp / đã duyệt</div>
                                    </>
                                ) : (
                                    <div className="mt-1 line-clamp-2 text-[11px] font-semibold sm:text-sm">{getExamLocation(exam)}</div>
                                )}
                            </div>
                        </div>

                        {currentConflictCount > 0 ? (
                            <div className="mt-3 rounded-[18px] border border-rose-200/25 bg-rose-500/20 px-3 py-2 text-sm text-white/95">
                                Có {currentConflictCount} thí sinh trong kỳ thi này đang bị trùng đăng ký ở kỳ thi khác.
                            </div>
                        ) : null}

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <SheetActionButton icon={UserPlus} label="Thêm HV" onClick={openAddStudentsSheet} />
                            <SheetActionButton icon={Info} label="Kiểm tra trùng" onClick={handleOpenConflicts} />
                            <SheetActionButton icon={Pencil} label="Sửa" onClick={onEdit} />
                            <SheetActionButton icon={Trash2} label="Xóa" tone="danger" onClick={onDelete} />
                        </div>
                    </div>

                    <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            <FilterChip
                                active={activeTab === 'approved'}
                                label="Đã duyệt"
                                count={approvedList.length}
                                onClick={() => setActiveTab('approved')}
                            />
                            <FilterChip
                                active={activeTab === 'pending'}
                                label="Chờ duyệt"
                                count={pendingList.length}
                                onClick={() => setActiveTab('pending')}
                            />
                            <FilterChip
                                active={activeTab === 'attendance'}
                                label="Điểm danh"
                                count={null}
                                onClick={() => {
                                    setActiveTab('attendance');
                                    if (!learningAttendance) loadLearningAttendance();
                                }}
                            />
                        </div>

                        {activeTab !== 'attendance' && (
                        <>
                        <div className="relative mt-3">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={studentSearch}
                                onChange={(event) => setStudentSearch(event.target.value)}
                                placeholder="Tìm thí sinh theo tên hoặc CCCD"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                            />
                            {studentSearch ? (
                                <button
                                    type="button"
                                    onClick={() => setStudentSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-1 text-slate-500"
                                >
                                    <X size={14} />
                                </button>
                            ) : null}
                        </div>

                        {activeTab === 'approved' && canManagePaymentStatus ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {EXAM_PAYMENT_FILTER_OPTIONS.map((option) => {
                                    const active = studentPaymentFilter === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setStudentPaymentFilter(option.value)}
                                            className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${active
                                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-white text-slate-600'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        <div className="mt-3 flex gap-2">
                            {activeTab === 'pending' && pendingList.length ? (
                                <button
                                    type="button"
                                    onClick={handleApproveAll}
                                    className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-sm transition-transform active:scale-[0.985]"
                                >
                                    Duyệt tất cả
                                </button>
                            ) : null}
                            {activeTab === 'approved' ? (
                                <button
                                    type="button"
                                    onClick={handleOpenExcelPreview}
                                    disabled={excelPreviewLoading}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700 shadow-sm transition-transform active:scale-[0.985] disabled:opacity-60"
                                >
                                    <Info size={15} />
                                    <span>{excelPreviewLoading ? 'Đang tải preview...' : 'Preview Excel'}</span>
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-sm transition-transform active:scale-[0.985]"
                            >
                                <Download size={15} />
                                <span>Xuất Excel</span>
                            </button>
                        </div>
                        </>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {activeTab === 'attendance' ? (
                            /* ── TAB ĐIỂM DANH HỌC TẬP ── */
                            learningAttendanceLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4 py-16">
                                    <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-emerald-600 border-t-transparent" />
                                    <p className="text-sm font-medium text-slate-500">Đang tải điểm danh...</p>
                                </div>
                            ) : !learningAttendance ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                    <ClipboardCheck size={48} className="text-slate-300" />
                                    <p className="font-semibold text-slate-700">Chưa tải dữ liệu</p>
                                    <button
                                        type="button"
                                        onClick={loadLearningAttendance}
                                        className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                                    >
                                        Tải điểm danh học tập
                                    </button>
                                </div>
                            ) : learningAttendance.sessions?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                    <ClipboardCheck size={48} className="text-slate-300" />
                                    <p className="text-sm font-medium text-slate-600">
                                        {learningAttendance.online_class_id
                                            ? `Lớp "${learningAttendance.class_name}" chưa có buổi học nào.`
                                            : 'Kỳ thi này chưa được gắn với lớp học trực tuyến.'}
                                    </p>
                                    {learningAttendance.online_class_id ? (
                                        <div className="flex flex-wrap items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateSessionModal(true)}
                                                className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
                                            >
                                                <Plus size={16} /> Tạo buổi học đầu tiên
                                            </button>
                                            <button
                                                type="button"
                                                onClick={openImportScheduleModal}
                                                className="flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700"
                                            >
                                                <Upload size={16} /> Import ảnh
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="space-y-4 pb-4">
                                    {/* Header lớp + actions */}
                                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                        <ClipboardCheck size={18} className="flex-shrink-0 text-emerald-600" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-emerald-800">
                                                {learningAttendance.class_name || 'Lớp học trực tuyến'}
                                            </p>
                                            <p className="text-xs text-emerald-600">
                                                {learningAttendance.sessions.length} buổi · {learningAttendance.students?.length ?? 0} HV
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowCreateSessionModal(true)}
                                                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                                            >
                                                <Plus size={13} /> Buổi học
                                            </button>
                                            <button
                                                type="button"
                                                onClick={openImportScheduleModal}
                                                className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700"
                                            >
                                                <Upload size={13} /> Import
                                            </button>
                                            <button
                                                type="button"
                                                onClick={loadLearningAttendance}
                                                className="rounded-xl border border-emerald-200 bg-white px-2 py-1.5 text-emerald-700"
                                            >
                                                <RefreshCw size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Bảng điểm danh - scroll ngang */}
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <table className="min-w-full border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50">
                                                    <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 text-left font-bold text-slate-700 min-w-[140px]">
                                                        Học viên
                                                    </th>
                                                    <th className="px-2 py-3 text-center font-bold text-slate-700 min-w-[55px]">
                                                        <div>Tổng</div>
                                                        <div className="text-[10px] font-normal text-slate-400">có mặt</div>
                                                    </th>
                                                    {learningAttendance.sessions.map((sess, idx) => (
                                                        <th key={sess.id} className="px-2 py-3 text-center font-semibold text-slate-700 min-w-[72px]">
                                                            <div className="text-[10px] text-slate-400">Buổi {idx + 1}</div>
                                                            <div className="font-medium">
                                                                {sess.session_date
                                                                    ? new Date(sess.session_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                                                                    : '—'}
                                                            </div>
                                                            {sess.start_time && (
                                                                <div className="text-[9px] text-slate-400">{sess.start_time}{sess.end_time ? `–${sess.end_time}` : ''}</div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSession(sess.id)}
                                                                className="mt-0.5 text-[9px] font-medium text-red-400 active:text-red-600"
                                                            >
                                                                Xóa
                                                            </button>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {!learningAttendance.students?.length ? (
                                                    <tr>
                                                        <td colSpan={2 + learningAttendance.sessions.length} className="py-10 text-center text-slate-400">
                                                            Chưa có học viên nào.
                                                        </td>
                                                    </tr>
                                                ) : learningAttendance.students.map((student, rowIdx) => (
                                                    <tr key={student.student_id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2.5 border-r border-slate-100">
                                                            <div className="font-semibold text-slate-800 truncate max-w-[130px]">{student.ho_ten_full}</div>
                                                            {student.cccd && <div className="text-[10px] text-slate-400 font-mono">{student.cccd}</div>}
                                                        </td>
                                                        <td className="px-2 py-2.5 text-center">
                                                            <span className={`text-xs font-bold ${
                                                                student.present_count + (student.late_count ?? 0) === (student.expected_session_count ?? learningAttendance.sessions.length)
                                                                    ? 'text-emerald-600'
                                                                    : student.present_count + (student.late_count ?? 0) === 0
                                                                        ? 'text-red-500'
                                                                        : 'text-amber-600'
                                                            }`}>
                                                                {student.present_count + (student.late_count ?? 0)}/{student.expected_session_count ?? learningAttendance.sessions.length}
                                                            </span>
                                                        </td>
                                                        {learningAttendance.sessions.map((sess) => {
                                                            const att = student.sessions?.find((a) => a.session_id === sess.id);
                                                            const isCounted = att?.is_counted !== false;
                                                            const status = att?.status ?? null;
                                                            const key = `${sess.id}_${student.student_id}`;
                                                            const isSaving = attendanceSaving === key;
                                                            return (
                                                                <td key={sess.id} className="px-2 py-2.5 text-center">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isSaving || !isCounted}
                                                                        onClick={() => handleToggleAttendance(sess.id, student.student_id, status, isCounted)}
                                                                        className={`h-8 w-8 rounded-xl text-xs font-bold transition-all active:scale-[0.9] ${
                                                                            isSaving ? 'animate-pulse bg-slate-100 text-slate-400'
                                                                            : !isCounted ? 'bg-slate-100 text-slate-300'
                                                                            : status === 'present' ? 'bg-emerald-100 text-emerald-700'
                                                                            : status === 'late' ? 'bg-amber-100 text-amber-700'
                                                                            : status === 'absent' ? 'bg-red-100 text-red-600'
                                                                            : 'bg-slate-100 text-slate-400'
                                                                        }`}
                                                                        title={isCounted ? undefined : 'Buổi này nằm trước ngày đăng ký hoặc ngoài cửa sổ tính điểm danh'}
                                                                    >
                                                                        {isSaving ? '…'
                                                                            : status === 'present' ? '✓'
                                                                            : status === 'late' ? 'T'
                                                                            : status === 'absent' ? '✗'
                                                                            : '—'}
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-16">
                                <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
                                <p className="text-sm font-medium text-slate-500">Đang tải danh sách thí sinh...</p>
                            </div>
                        ) : filteredStudents.length ? (
                            <div className="space-y-3 pb-4">
                                {filteredStudents.map((student) => {
                                    const studentId = Number(student.student_id || student.id);
                                    const hasConflict = conflictStudentIds.has(studentId);
                                    return (
                                        <StudentRow
                                            key={student.student_id || student.id}
                                            student={student}
                                            pending={activeTab === 'pending'}
                                            conflict={hasConflict}
                                            processing={processingStudentId === student.student_id}
                                            paymentProcessing={paymentProcessingStudentId === studentId}
                                            canManagePaymentStatus={canManagePaymentStatus}
                                            onOpen={() => handleOpenStudentDetail(student)}
                                            onApprove={() => handleApproveStudent(student)}
                                            onReject={() => handleRejectStudent(student)}
                                            onRemove={() => handleRemoveStudent(student)}
                                            onHistory={() => handleViewDuplicateHistory(student)}
                                            onChangePaymentStatus={(nextStatus) => handleStudentPaymentStatusChange(student, nextStatus)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                {activeTab === 'pending' ? (
                                    <AlertCircle size={56} className="text-amber-300" />
                                ) : (
                                    <CheckCircle2 size={56} className="text-emerald-300" />
                                )}
                                <div className="text-lg font-black text-slate-900">
                                    {studentSearch
                                        ? 'Không tìm thấy thí sinh phù hợp'
                                        : activeTab === 'pending'
                                            ? 'Không còn hồ sơ chờ duyệt'
                                            : 'Chưa có thí sinh đã duyệt'}
                                </div>
                                <p className="max-w-[280px] text-sm text-slate-500">
                                    {studentSearch
                                        ? 'Thử đổi từ khóa hoặc xóa tìm kiếm để xem toàn bộ danh sách.'
                                        : activeTab === 'pending'
                                            ? 'Kỳ thi này hiện không có hồ sơ chờ xác nhận.'
                                            : 'Danh sách đã duyệt sẽ xuất hiện tại đây sau khi thí sinh được thêm vào kỳ thi.'}
                                </p>
                            </div>
                        )}
                    </div>
                    </div>
                </div>
            </OverlayPortal>

            <OverlaySheet
                open={showAddStudentsSheet}
                onClose={closeAddStudentsSheet}
                title="Thêm thí sinh"
                description="Tìm theo tên, CCCD hoặc SĐT rồi chọn nhiều học viên để đưa vào kỳ thi."
                tone="blue"
                footer={
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={closeAddStudentsSheet}
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddSelectedStudents(false)}
                            disabled={addingStudents}
                            className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                        >
                            {addingStudents ? 'Đang thêm...' : 'Thêm thường'}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddSelectedStudents(true)}
                            disabled={addingStudents}
                            className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                        >
                            Thêm cưỡng bức
                        </button>
                    </div>
                }
            >
                <div className="border-b border-slate-200 bg-white px-4 py-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={addStudentsQuery}
                            onChange={(event) => setAddStudentsQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') handleSearchAddStudents();
                            }}
                            placeholder="Nhập tên, CCCD hoặc SĐT..."
                            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                        <button
                            type="button"
                            onClick={handleSearchAddStudents}
                            disabled={addStudentsLoading}
                            className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-60"
                        >
                            {addStudentsLoading ? 'Đang tìm...' : 'Tìm'}
                        </button>
                    </div>
                    {addStudentsSummary ? (
                        <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                            {addStudentsSummary}
                        </div>
                    ) : null}
                </div>

                <div className="p-4">
                    {addStudentsLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
                            <p className="text-sm text-slate-500">Đang tìm học viên...</p>
                        </div>
                    ) : addStudentsResults.length ? (
                        <div className="space-y-3">
                            {addStudentsResults.map((student) => {
                                const selected = selectedAddStudentIds.has(student.id);
                                return (
                                    <button
                                        key={student.id}
                                        type="button"
                                        onClick={() => toggleSelectAddStudent(student.id)}
                                        className={`flex w-full items-center justify-between gap-3 rounded-[24px] border bg-white p-4 text-left shadow-sm transition ${
                                            selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-bold text-slate-900">{student.ho_ten_full || 'Chưa có tên'}</div>
                                            <div className="mt-1 truncate text-xs text-slate-500">
                                                CCCD: {student.cccd || '---'} • SĐT: {student.sdt || '---'}
                                            </div>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                            selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {selected ? 'Đã chọn' : 'Chọn'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Users size={48} className="text-slate-300" />
                            <div className="text-lg font-black text-slate-900">Chưa có kết quả phù hợp</div>
                            <p className="max-w-[280px] text-sm text-slate-500">
                                Nhập ít nhất 2 ký tự rồi bấm tìm để chọn học viên thêm vào kỳ thi.
                            </p>
                        </div>
                    )}
                </div>
            </OverlaySheet>

            <OverlaySheet
                open={showConflictsSheet}
                onClose={() => setShowConflictsSheet(false)}
                title="Sinh viên trùng đăng ký"
                description="Danh sách học viên đang có nhiều hơn một đăng ký thi đang giữ chỗ."
                tone="rose"
                footer={
                    <button
                        type="button"
                        onClick={() => setShowConflictsSheet(false)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                        Đóng
                    </button>
                }
            >
                <div className="p-4">
                    {conflictsLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-rose-500 border-t-transparent" />
                            <p className="text-sm text-slate-500">Đang tải danh sách trùng đăng ký...</p>
                        </div>
                    ) : conflicts.length ? (
                        <div className="space-y-3">
                            {conflicts.map((item) => (
                                <div key={item.student_id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-bold text-slate-900">{item.ho_ten_full || 'Chưa có tên'}</div>
                                            <div className="mt-1 text-xs text-slate-500">CCCD: {item.cccd || '---'}</div>
                                        </div>
                                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">
                                            {(item.active_registrations || []).length} đăng ký
                                        </span>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                        {(item.active_registrations || []).map((registration, index) => (
                                            <div key={`${item.student_id}-${registration.exam_id || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                <div className="text-sm font-semibold text-slate-900">
                                                    {registration.exam_name || `Kỳ thi #${registration.exam_id}`}
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                    <span>ID: {registration.exam_id || '---'}</span>
                                                    <span>Trạng thái: {registration.registration_status || '---'}</span>
                                                    <span>Ngày thi: {registration.exam_date ? `${formatDateVN(registration.exam_date)} ${formatTimeUtil(registration.exam_date)}` : '---'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleViewDuplicateHistory(item)}
                                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
                                    >
                                        <History size={14} />
                                        Xem lịch sử
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Info size={48} className="text-slate-300" />
                            <div className="text-lg font-black text-slate-900">Không phát hiện hồ sơ trùng</div>
                            <p className="max-w-[280px] text-sm text-slate-500">
                                Hiện tại không có học viên nào giữ chỗ ở nhiều kỳ thi cùng lúc.
                            </p>
                        </div>
                    )}
                </div>
            </OverlaySheet>

            <OverlaySheet
                open={showHistorySheet}
                onClose={() => setShowHistorySheet(false)}
                title="Lịch sử đăng ký"
                description={historyStudent ? `${historyStudent.ho_ten_full || 'Học viên'}${historyStudent.cccd ? ` • ${historyStudent.cccd}` : ''}` : ''}
                tone="amber"
                footer={
                    <button
                        type="button"
                        onClick={() => setShowHistorySheet(false)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                        Đóng
                    </button>
                }
            >
                <div className="p-4">
                    {historyLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-amber-500 border-t-transparent" />
                            <p className="text-sm text-slate-500">Đang tải lịch sử đăng ký...</p>
                        </div>
                    ) : historyRows.length ? (
                        <div className="space-y-3">
                            {historyRows.map((row) => {
                                const isCurrentExam = Number(row.exam_id) === Number(exam.id);
                                return (
                                    <div key={row.registration_id || `${row.exam_id}-${row.registration_created_at}`} className={`rounded-[24px] border bg-white p-4 shadow-sm ${isCurrentExam ? 'border-blue-300' : 'border-slate-200'}`}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-bold text-slate-900">
                                                    {row.exam_name || `Kỳ thi #${row.exam_id}`}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {row.class_name || 'Chưa gắn lớp ôn tập'}
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                isCurrentExam ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {row.registration_status || '---'}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                            <span>Ngày thi: {row.exam_date ? `${formatDateVN(row.exam_date)} ${formatTimeUtil(row.exam_date)}` : '---'}</span>
                                            <span>Đăng ký: {row.registration_created_at ? formatDateVN(row.registration_created_at, true) : '---'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <History size={48} className="text-slate-300" />
                            <div className="text-lg font-black text-slate-900">Chưa có lịch sử đăng ký</div>
                            <p className="max-w-[280px] text-sm text-slate-500">
                                Không tìm thấy bản ghi đăng ký nào cho học viên này.
                            </p>
                        </div>
                    )}
                </div>
            </OverlaySheet>

            <OverlaySheet
                open={showExcelPreviewSheet}
                onClose={() => setShowExcelPreviewSheet(false)}
                title="Preview Excel"
                description={excelPreviewData?.sheetTitle || excelPreviewData?.titleLines?.[2] || buildExamStudentSheetTitle(exam?.exam_name)}
                tone="blue"
                footer={
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowExcelPreviewSheet(false)}
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                            Đóng
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                        >
                            Tải Excel
                        </button>
                    </div>
                }
            >
                <div className="border-b border-slate-200 bg-white px-4 py-4">
                    <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Tổng thí sinh: {approvedList.length}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Ngày thi: {formatDateVN(exam?.exam_date, true) || 'Chưa có'}</span>
                    </div>
                </div>

                <div className="overflow-x-auto bg-slate-100 px-4 py-4">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 shadow-sm">
                        <FileText size={14} />
                        Preview theo bố cục file xuất
                    </div>

                    {excelPreviewLoading ? (
                        <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                                Đang tải preview từ dữ liệu export...
                            </div>
                        </div>
                    ) : !excelPreviewData ? (
                        <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-500">
                            Không có dữ liệu để preview.
                        </div>
                    ) : excelPreviewData.kind === 'vept' ? (
                        <MobileExcelPreviewVept preview={excelPreviewData} />
                    ) : excelPreviewData.kind === 'vantrang_full' ? (
                        <MobileExcelPreviewFullInfo preview={excelPreviewData} />
                    ) : (
                        <MobileExcelPreviewExamList preview={excelPreviewData} />
                    )}
                </div>
            </OverlaySheet>

            {showStudentDetail && selectedStudent ? (
                <StudentDetailSheet
                    student={selectedStudent}
                    onClose={() => setShowStudentDetail(false)}
                    onRefresh={async () => {
                        await loadStudentLists();
                        await onRefresh?.();
                    }}
                />
            ) : null}

            {showImportScheduleModal && (
                <OverlayPortal>
                    <div className="fixed inset-0 z-[100000] flex items-end bg-slate-950/55" onClick={closeImportScheduleModal}>
                        <div
                            className="w-full h-[100dvh] max-h-[100dvh] overflow-y-auto bg-white p-5 pb-8 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Điểm danh học tập</p>
                                <h3 className="text-lg font-black text-slate-900">Import lịch từ ảnh</h3>
                                <p className="text-[11px] text-slate-500">{importScheduleStep === 'upload' ? 'Bước 1/2' : 'Bước 2/2'}</p>
                            </div>
                            <button type="button" onClick={closeImportScheduleModal}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        {importScheduleStep === 'upload' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ảnh lịch học</label>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) => setImportScheduleFile(e.target.files?.[0] || null)}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                    />
                                    {importScheduleFile ? (
                                        <p className="mt-1 text-xs text-slate-500">{importScheduleFile.name}</p>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
                                    <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-emerald-800">
                                        ready: {importScheduleRows.filter((row) => row.status === 'ready').length}
                                    </span>
                                    <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-amber-800">
                                        needs_review: {importScheduleRows.filter((row) => row.status === 'needs_review').length}
                                    </span>
                                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700">
                                        duplicate: {importScheduleRows.filter((row) => row.status === 'duplicate').length}
                                    </span>
                                </div>

                                {importScheduleRows.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                                        Không có dòng lịch học.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {importScheduleRows.map((row, index) => (
                                            <div key={row.row_id || `import_row_${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                        row.status === 'ready'
                                                            ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                                                            : row.status === 'duplicate'
                                                                ? 'border border-slate-200 bg-slate-100 text-slate-700'
                                                                : 'border border-amber-200 bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {row.status}
                                                    </span>
                                                    {row.auto_corrected ? (
                                                        <span className="rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                                                            auto-corrected
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {Array.isArray(row.warnings) && row.warnings.length > 0 ? (
                                                    <p className="mb-2 text-[11px] text-amber-700">{row.warnings[0]}</p>
                                                ) : null}
                                                {Array.isArray(row.corrections) && row.corrections.length > 0 ? (
                                                    <p className="mb-2 text-[11px] text-sky-700">{row.corrections[0]}</p>
                                                ) : null}

                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Ngày</label>
                                                        <input
                                                            type="date"
                                                            value={row.session_date || ''}
                                                            onChange={(e) => handleImportRowFieldChange(index, 'session_date', e.target.value)}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Bắt đầu</label>
                                                            <input
                                                                type="time"
                                                                value={row.start_time || ''}
                                                                onChange={(e) => handleImportRowFieldChange(index, 'start_time', e.target.value)}
                                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Kết thúc</label>
                                                            <input
                                                                type="time"
                                                                value={row.end_time || ''}
                                                                onChange={(e) => handleImportRowFieldChange(index, 'end_time', e.target.value)}
                                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[11px] font-semibold text-slate-600">Ghi chú</label>
                                                        <input
                                                            type="text"
                                                            value={row.note || ''}
                                                            onChange={(e) => handleImportRowFieldChange(index, 'note', e.target.value)}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                                        />
                                                    </div>
                                                    {row.source_text ? (
                                                        <p className="text-[10px] text-slate-400">{row.source_text}</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={importScheduleStep === 'upload' ? closeImportScheduleModal : () => setImportScheduleStep('upload')}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700"
                            >
                                {importScheduleStep === 'upload' ? 'Đóng' : 'Quay lại'}
                            </button>
                            {importScheduleStep === 'upload' ? (
                                <button
                                    type="button"
                                    onClick={handlePreviewImportSchedule}
                                    disabled={importScheduleLoading || !importScheduleFile}
                                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-60"
                                >
                                    {importScheduleLoading ? 'Đang OCR...' : 'OCR & preview'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleCommitImportSchedule}
                                    disabled={importScheduleSubmitting || importScheduleRows.length === 0 || hasImportNeedsReviewRows}
                                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-60"
                                >
                                    {importScheduleSubmitting ? 'Đang lưu...' : 'Xác nhận'}
                                </button>
                            )}
                        </div>
                        </div>
                    </div>
                </OverlayPortal>
            )}

            {/* ── Modal tạo buổi học mới ── */}
            {showCreateSessionModal && (
                <OverlayPortal>
                    <div className="fixed inset-0 z-[100000] flex items-end bg-slate-950/55" onClick={() => setShowCreateSessionModal(false)}>
                        <div
                            className="w-full h-[100dvh] max-h-[100dvh] overflow-y-auto bg-white p-5 pb-8 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">Điểm danh học tập</p>
                                <h3 className="text-lg font-black text-slate-900">Tạo buổi học mới</h3>
                            </div>
                            <button type="button" onClick={() => setShowCreateSessionModal(false)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ngày học <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={createSessionForm.session_date}
                                    onChange={(e) => setCreateSessionForm((f) => ({ ...f, session_date: e.target.value }))}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Giờ bắt đầu</label>
                                    <input
                                        type="time"
                                        value={createSessionForm.start_time}
                                        onChange={(e) => setCreateSessionForm((f) => ({ ...f, start_time: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">Giờ kết thúc</label>
                                    <input
                                        type="time"
                                        value={createSessionForm.end_time}
                                        onChange={(e) => setCreateSessionForm((f) => ({ ...f, end_time: e.target.value }))}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú</label>
                                <input
                                    type="text"
                                    value={createSessionForm.note}
                                    onChange={(e) => setCreateSessionForm((f) => ({ ...f, note: e.target.value }))}
                                    placeholder="Ghi chú buổi học (tùy chọn)"
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button type="button" onClick={() => setShowCreateSessionModal(false)}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700">
                                Hủy
                            </button>
                            <button type="button" onClick={handleCreateSession}
                                disabled={createSessionLoading || !createSessionForm.session_date}
                                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-60">
                                {createSessionLoading ? 'Đang tạo...' : 'Tạo buổi học'}
                            </button>
                        </div>
                        </div>
                    </div>
                </OverlayPortal>
            )}
        </>
    );
};

export default function MobileExamSchedulesModule() {
    const toast = useToast();
    const cachedExams = getAdminCache(ADMIN_CACHE_KEYS.examSchedules, ADMIN_CACHE_TTL.examSchedules);
    const [exams, setExams] = useState(() => cachedExams ?? []);
    const [loading, setLoading] = useState(() => cachedExams === null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('upcoming');
    const [selectedExam, setSelectedExam] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showGlobalConflicts, setShowGlobalConflicts] = useState(false);
    const [globalConflictsLoading, setGlobalConflictsLoading] = useState(false);
    const [globalConflicts, setGlobalConflicts] = useState([]);
    const [showTrashSheet, setShowTrashSheet] = useState(false);
    const [trashLoading, setTrashLoading] = useState(false);
    const [trashActionId, setTrashActionId] = useState(null);
    const [trashExams, setTrashExams] = useState([]);

    useEffect(() => {
        fetchExams();
    }, []);
    useAdminAutoRefresh(() => fetchExams({ force: true }), { minIntervalMs: 12000 });

    const fetchExams = async ({ force = false } = {}) => {
        const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.examSchedules, ADMIN_CACHE_TTL.examSchedules);
        if (cached !== null) {
            setExams(cached);
            setLoading(false);
            return cached;
        }

        setLoading(true);
        try {
            const response = await api.getAllExamSchedules(100, 0);
            const examList = Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                    ? response.data
                    : Array.isArray(response?.results)
                        ? response.results
                        : [];
            setExams(examList);
            setAdminCache(ADMIN_CACHE_KEYS.examSchedules, examList);
            return examList;
        } catch (error) {
            console.error('Failed to fetch exams', error);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const filterCounts = useMemo(() => {
        const today = startOfDay();
        const counts = {
            all: exams.length,
            today: 0,
            upcoming: 0,
            pending: 0,
            past: 0,
        };

        exams.forEach((exam) => {
            const examDay = startOfDay(getExamDate(exam));
            if (examDay.getTime() === today.getTime()) counts.today += 1;
            if (examDay.getTime() >= today.getTime()) counts.upcoming += 1;
            if (examDay.getTime() < today.getTime()) counts.past += 1;
            if (getExamPendingCount(exam) > 0) counts.pending += 1;
        });

        return counts;
    }, [exams]);

    const totalPendingStudents = useMemo(
        () => exams.reduce((sum, exam) => sum + getExamPendingCount(exam), 0),
        [exams],
    );

    const nextExam = useMemo(() => {
        const today = startOfDay();
        return exams
            .filter((exam) => startOfDay(getExamDate(exam)).getTime() >= today.getTime())
            .sort((a, b) => getExamDate(a) - getExamDate(b))[0] || null;
    }, [exams]);

    const filteredExams = useMemo(() => {
        const today = startOfDay();
        const keyword = searchTerm.trim().toLowerCase();

        const matched = exams.filter((exam) => {
            const title = getExamTitle(exam).toLowerCase();
            const location = getExamLocation(exam).toLowerCase();
            const matchSearch = !keyword || title.includes(keyword) || location.includes(keyword);

            if (!matchSearch) return false;

            const examDay = startOfDay(getExamDate(exam));

            if (filter === 'all') return true;
            if (filter === 'today') return examDay.getTime() === today.getTime();
            if (filter === 'upcoming') return examDay.getTime() >= today.getTime();
            if (filter === 'past') return examDay.getTime() < today.getTime();
            if (filter === 'pending') return getExamPendingCount(exam) > 0;

            return true;
        });

        return matched.sort((left, right) => {
            if (filter === 'pending') {
                const pendingDiff = getExamPendingCount(right) - getExamPendingCount(left);
                if (pendingDiff !== 0) return pendingDiff;
            }

            if (filter === 'past') {
                return getExamDate(right) - getExamDate(left);
            }

            return getExamDate(left) - getExamDate(right);
        });
    }, [exams, filter, searchTerm]);

    const handleCreateSuccess = () => {
        setIsCreating(false);
        setIsEditing(false);
        setSelectedExam(null);
        invalidateAdminData({
            keys: [ADMIN_CACHE_KEYS.examSchedules],
            source: 'mobile-exam-schedules',
        });
        void fetchExams({ force: true });
    };

    const handleDeleteExam = async (examId) => {
        if (!window.confirm('Chuyển lịch thi này vào thùng rác? Bạn vẫn có thể khôi phục trong vòng 7 ngày.')) return;

        try {
            const response = await api.deleteExamSchedule(examId);
            if (!response?.success) {
                toast.error(response?.message || 'Không thể xóa lịch thi');
                return;
            }
            setSelectedExam(null);
            invalidateAdminData({
                keys: [ADMIN_CACHE_KEYS.examSchedules],
                source: 'mobile-exam-schedules',
            });
            toast.success(response?.message || 'Đã chuyển lịch thi vào thùng rác');
            await Promise.all([
                fetchExams({ force: true }),
                showTrashSheet ? loadTrashExams() : Promise.resolve(),
            ]);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Không thể xóa lịch thi'));
        }
    };

    const loadTrashExams = async () => {
        setTrashLoading(true);
        try {
            const response = await api.getTrashExamSchedules();
            if (response?.success) {
                setTrashExams(Array.isArray(response.data) ? response.data : []);
            } else {
                setTrashExams([]);
                toast.error(response?.message || 'Không tải được thùng rác');
            }
        } catch (error) {
            console.error('Failed to load trash exams', error);
            setTrashExams([]);
            toast.error(getErrorMessage(error, 'Không tải được thùng rác'));
        } finally {
            setTrashLoading(false);
        }
    };

    const handleOpenTrash = async () => {
        setShowTrashSheet(true);
        await loadTrashExams();
    };

    const handleRestoreExam = async (examId) => {
        setTrashActionId(examId);
        try {
            const response = await api.restoreExamSchedule(examId);
            if (!response?.success) {
                toast.error(response?.message || 'Không thể khôi phục lịch thi');
                return;
            }

            invalidateAdminData({
                keys: [ADMIN_CACHE_KEYS.examSchedules],
                source: 'mobile-exam-schedules',
            });
            toast.success(response?.message || 'Khôi phục lịch thi thành công');
            await Promise.all([
                fetchExams({ force: true }),
                loadTrashExams(),
            ]);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Không thể khôi phục lịch thi'));
        } finally {
            setTrashActionId(null);
        }
    };

    const handlePermanentDeleteExam = async (exam) => {
        if (!window.confirm(`Xóa vĩnh viễn "${getExamTitle(exam)}" khỏi thùng rác?`)) return;

        setTrashActionId(exam.id);
        try {
            const response = await api.permanentDeleteExamSchedule(exam.id);
            if (!response?.success) {
                toast.error(response?.message || 'Không thể xóa vĩnh viễn lịch thi');
                return;
            }

            invalidateAdminData({
                keys: [ADMIN_CACHE_KEYS.examSchedules],
                source: 'mobile-exam-schedules',
            });
            toast.success(response?.message || 'Đã xóa vĩnh viễn lịch thi');
            await loadTrashExams();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Không thể xóa vĩnh viễn lịch thi'));
        } finally {
            setTrashActionId(null);
        }
    };

    const handleOpenGlobalConflicts = async () => {
        setShowGlobalConflicts(true);
        setGlobalConflictsLoading(true);
        try {
            const response = await api.getExamRegistrationConflicts();
            const rows = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.data?.data)
                    ? response.data.data
                    : Array.isArray(response)
                        ? response
                        : [];
            setGlobalConflicts(rows);
        } catch (error) {
            console.error('Failed to load global conflicts', error);
            toast.error(getErrorMessage(error, 'Không tải được danh sách trùng đăng ký'));
            setGlobalConflicts([]);
        } finally {
            setGlobalConflictsLoading(false);
        }
    };

    const filterOptions = [
        { id: 'all', label: 'Tất cả', count: filterCounts.all },
        { id: 'upcoming', label: 'Sắp tới', count: filterCounts.upcoming },
        { id: 'today', label: 'Hôm nay', count: filterCounts.today },
        { id: 'pending', label: 'Cần duyệt', count: filterCounts.pending },
        { id: 'past', label: 'Đã qua', count: filterCounts.past },
    ];
    const activeFilterMeta = filterOptions.find((option) => option.id === filter) || filterOptions[0];

    return (
        <PullToRefreshWrapper onRefresh={() => {
            clearAdminCache(ADMIN_CACHE_KEYS.examSchedules);
            return fetchExams({ force: true });
        }}>
            <div className="min-h-screen bg-[#f3f6fb] pb-6">
                <MobileAdminHeroCard
                    eyebrow="Quản lý học tập"
                    icon={Calendar}
                    tone="blue"
                    title="Lịch thi"
                    description="Giữ tìm kiếm, bộ lọc, kỳ thi sắp tới và số liệu xử lý trong cùng một hero để thao tác trên mobile nhanh hơn như desktop."
                    actions={(
                        <>
                            <MobileAdminSecondaryButton onClick={handleOpenTrash} className="px-3.5">
                                <Trash2 size={16} />
                                Rác
                            </MobileAdminSecondaryButton>
                            <MobileAdminSecondaryButton onClick={handleOpenGlobalConflicts} className="px-3.5">
                                <Info size={16} />
                                Trùng
                            </MobileAdminSecondaryButton>
                            <MobileAdminPrimaryButton onClick={() => setIsCreating(true)} className="px-3.5">
                                <Plus size={16} />
                                Tạo
                            </MobileAdminPrimaryButton>
                        </>
                    )}
                    stats={(
                        <div className="grid grid-cols-2 gap-2">
                            <MobileAdminStatCard label="Tổng kỳ thi" value={filterCounts.all} tone="blue" />
                            <MobileAdminStatCard label="Hôm nay" value={filterCounts.today} tone="violet" />
                            <MobileAdminStatCard label="Sắp tới" value={filterCounts.upcoming} tone="emerald" />
                            <MobileAdminStatCard label="Hồ sơ chờ" value={totalPendingStudents} tone="amber" />
                        </div>
                    )}
                    search={(
                        <MobileAdminSearchField
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onClear={() => setSearchTerm('')}
                            placeholder="Tìm theo tên kỳ thi hoặc địa điểm"
                        />
                    )}
                    filters={(
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {filterOptions.map((option) => (
                                <FilterChip
                                    key={option.id}
                                    active={filter === option.id}
                                    label={option.label}
                                    count={option.count}
                                    onClick={() => setFilter(option.id)}
                                />
                            ))}
                        </div>
                    )}
                    footer={<span>{activeFilterMeta.label} • Hiển thị {filteredExams.length} / {filterCounts.all} kỳ thi</span>}
                >
                    {nextExam ? (
                        <div className="rounded-[24px] border border-white/12 bg-white/[0.10] p-3 backdrop-blur-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/70">
                                        <Sparkles size={14} />
                                        <span>Kỳ thi gần nhất</span>
                                    </div>
                                    <h2 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-white">{getExamTitle(nextExam)}</h2>
                                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                                        <span className="rounded-full bg-white/12 px-2.5 py-1 font-semibold text-white/90">
                                            {formatDateVN(nextExam.exam_date)} • {formatTimeUtil(nextExam.exam_date)}
                                        </span>
                                        <span className="rounded-full bg-white/12 px-2.5 py-1 font-semibold text-white/90">
                                            {formatDurationLabel(nextExam.duration_minutes)}
                                        </span>
                                        <span className="rounded-full bg-white/12 px-2.5 py-1 font-semibold text-white/90">
                                            {getExamStudentCount(nextExam)} thí sinh
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/78">
                                        <MapPin size={13} />
                                        <span className="truncate">{getExamLocation(nextExam)}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedExam(nextExam)}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700"
                                >
                                    Mở
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[24px] border border-white/12 bg-white/[0.10] p-3 text-white/88 backdrop-blur-sm">
                            <div className="text-sm font-black text-white">Chưa có kỳ thi sắp tới</div>
                            <div className="mt-1 text-[13px] text-white/70">Tạo lịch mới để bắt đầu.</div>
                        </div>
                    )}
                </MobileAdminHeroCard>

                <div className="px-4 pb-[calc(var(--mb-bottom-nav-height)+24px)] pt-3">
                    <div className="mb-2 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Danh sách kỳ thi</p>
                            <h2 className="mt-1 text-lg font-black text-slate-900">{filteredExams.length} kỳ thi</h2>
                        </div>
                        <div className="text-right text-[11px] font-semibold text-slate-500">
                            <div>{activeFilterMeta.label}</div>
                        </div>
                    </div>

                    {loading ? (
                        <AdminLoadingState
                            title="Đang tải lịch thi"
                            hint="Lịch thi là tab mặc định nên được giữ trong cache ngắn để vào admin nhanh hơn đáng kể."
                            variant="mobile-list"
                            accent="rose"
                        />
                    ) : filteredExams.length ? (
                        <div className="space-y-3">
                            {filteredExams.map((exam) => (
                                <ExamCard key={exam.id} exam={exam} onOpen={setSelectedExam} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-5 py-16 text-center shadow-sm">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-400">
                                <Calendar size={30} />
                            </div>
                            <h3 className="mt-5 text-xl font-black text-slate-900">Không tìm thấy kỳ thi</h3>
                            <p className="mx-auto mt-2 max-w-[280px] text-sm text-slate-500">
                                Thử đổi bộ lọc hoặc tạo mới.
                            </p>
                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                {searchTerm ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                                    >
                                        Xóa từ khóa
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => setFilter('all')}
                                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                                >
                                    Xem tất cả
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedExam && !isEditing ? (
                    <ExamDetailSheet
                        exam={selectedExam}
                        onClose={() => setSelectedExam(null)}
                        onRefresh={fetchExams}
                        onEdit={() => setIsEditing(true)}
                        onDelete={() => handleDeleteExam(selectedExam.id)}
                        onError={toast.error}
                    />
                ) : null}

                {(isCreating || isEditing) ? (
                    <ExamFormSheet
                        exam={isEditing ? selectedExam : null}
                        onClose={() => {
                            setIsCreating(false);
                            setIsEditing(false);
                        }}
                        onSuccess={handleCreateSuccess}
                        onError={toast.error}
                    />
                ) : null}

                <OverlaySheet
                    open={showGlobalConflicts}
                    onClose={() => setShowGlobalConflicts(false)}
                    title="Sinh viên trùng đăng ký"
                    description="Danh sách học viên đang có nhiều hơn một đăng ký thi đang giữ chỗ."
                    tone="rose"
                    footer={
                        <button
                            type="button"
                            onClick={() => setShowGlobalConflicts(false)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                        >
                            Đóng
                        </button>
                    }
                >
                    <div className="p-4">
                        {globalConflictsLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16">
                                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-rose-500 border-t-transparent" />
                                <p className="text-sm text-slate-500">Đang tải danh sách trùng đăng ký...</p>
                            </div>
                        ) : globalConflicts.length ? (
                            <div className="space-y-3">
                                {globalConflicts.map((item) => (
                                    <div key={item.student_id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-bold text-slate-900">{item.ho_ten_full || 'Chưa có tên'}</div>
                                                <div className="mt-1 text-xs text-slate-500">CCCD: {item.cccd || '---'}</div>
                                            </div>
                                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-rose-700">
                                                {(item.active_registrations || []).length} đăng ký
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {(item.active_registrations || []).map((registration, index) => (
                                                <div key={`${item.student_id}-${registration.exam_id || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <div className="text-sm font-semibold text-slate-900">
                                                        {registration.exam_name || `Kỳ thi #${registration.exam_id}`}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                                        <span>ID: {registration.exam_id || '---'}</span>
                                                        <span>Trạng thái: {registration.registration_status || '---'}</span>
                                                        <span>Ngày thi: {registration.exam_date ? `${formatDateVN(registration.exam_date)} ${formatTimeUtil(registration.exam_date)}` : '---'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <Info size={48} className="text-slate-300" />
                                <div className="text-lg font-black text-slate-900">Không phát hiện hồ sơ trùng</div>
                                <p className="max-w-[280px] text-sm text-slate-500">
                                    Hiện tại không có học viên nào giữ chỗ ở nhiều kỳ thi cùng lúc.
                                </p>
                            </div>
                        )}
                    </div>
                </OverlaySheet>

                <OverlaySheet
                    open={showTrashSheet}
                    onClose={() => setShowTrashSheet(false)}
                    title="Thùng rác lịch thi"
                    description="Lịch thi xóa mềm được giữ tối đa 7 ngày để có thể khôi phục."
                    tone="slate"
                    footer={
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={loadTrashExams}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                            >
                                Tải lại
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTrashSheet(false)}
                                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                            >
                                Đóng
                            </button>
                        </div>
                    }
                >
                    <div className="p-4">
                        {trashLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16">
                                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-500 border-t-transparent" />
                                <p className="text-sm text-slate-500">Đang tải thùng rác...</p>
                            </div>
                        ) : trashExams.length ? (
                            <div className="space-y-3">
                                {trashExams.map((exam) => (
                                    <div key={exam.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="text-sm font-black text-slate-900">{getExamTitle(exam)}</div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                                Thi: {formatShortDate(exam.exam_date)}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                                                Xóa: {formatShortDate(exam.deleted_at)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRestoreExam(exam.id)}
                                                disabled={trashActionId === exam.id}
                                                className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-black text-emerald-700 disabled:opacity-50"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <RotateCcw size={15} />
                                                    {trashActionId === exam.id ? 'Đang khôi phục...' : 'Khôi phục'}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePermanentDeleteExam(exam)}
                                                disabled={trashActionId === exam.id}
                                                className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-black text-rose-700 disabled:opacity-50"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <Trash2 size={15} />
                                                    Xóa vĩnh viễn
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <Trash2 size={48} className="text-slate-300" />
                                <div className="text-lg font-black text-slate-900">Thùng rác đang trống</div>
                                <p className="max-w-[280px] text-sm text-slate-500">
                                    Chưa có lịch thi nào bị chuyển vào thùng rác.
                                </p>
                            </div>
                        )}
                    </div>
                </OverlaySheet>

                <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
            </div>
        </PullToRefreshWrapper>
    );
}
