import React, { Suspense, lazy, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, UserPlus, Phone, Mail, ChevronRight, X, User, Calendar, MapPin, GraduationCap, DollarSign, Clock, Filter, TrendingUp, AlertCircle, CheckCircle, BookOpen, FileText, ChevronDown, Edit2, Image as ImageIcon, CreditCard, Save, Upload, Download, Eye, History, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN, formatTime as formatTimeUtil } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import ToastContainer from '../../../components/ui/ToastContainer';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { applyImageFallback, resolveImageUrl } from '../../../utils/imageUrl.js';
import { useOverlayLayer } from '../../../components/ui/overlay-lock';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, clearAdminCache, getAdminCache, invalidateAdminData, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import BirthPlaceField from '../../../components/forms/BirthPlaceField';
import {
    MobileAdminHeroCard,
    MobileAdminPrimaryButton,
    MobileAdminSecondaryButton,
    MobileAdminSearchField,
    MobileAdminStatCard,
    mobileAdminContentPadding,
} from '../shared/mobileAdminUi';

const CCCDUploader = lazy(() => import('../../../components/upload/CCCDUploader'));

export const getImageUrl = resolveImageUrl;

// Format date - dùng dateUtils chung với desktop
export const formatDate = (date) => {
    if (!date) return '';
    return formatDateVN(date) || '';
};

// Format date kèm giờ phút (cho timestamp: created_at, updated_at, approved_at...)
const formatDateTime = (date) => {
    if (!date) return '';
    return formatDateVN(date, true) || '';
};

const normalizeGenderValue = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return 'Nam';
    if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'Nữ';
    if (normalized === 'khác' || normalized === 'khac' || normalized === 'other') return 'Khác';
    return 'Nam';
};

function useBodyScrollLock(isOpen) {
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);
}

const StudentCard = ({ student, onView, onEdit }) => {
    const rawName = student.ho_ten_full || `${student.ho || ''} ${student.ten_dem || ''} ${student.ten || ''}`.trim();
    const displayName = rawName || 'Chưa có tên';
    const initial = displayName.charAt(0)?.toUpperCase() || 'U';
    const avatarUrl = getImageUrl(student.image_3x4 || student.photo_3x4_image_id);
    const isActive = student.trang_thai === 'active' || student.is_active !== false;

    const hasUnpaidFees = student.payment_status === 'pending' || student.cong_no > 0;
    const enrolledClasses = student.enrolled_classes_count || student.so_lop_dang_hoc || 0;

    return (
        <div
            className="mb-3 rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.34)] transition-all duration-200 active:scale-[0.98]"
            onClick={() => onView(student)}
        >
            <div className="flex items-start gap-4">
                <div className="relative">
                    <div className={`h-16 w-16 rounded-[22px] flex items-center justify-center text-lg font-bold shadow-[0_18px_34px_-22px_rgba(37,99,235,0.55)] overflow-hidden ${isActive ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <span style={{ display: avatarUrl ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>{initial}</span>
                    </div>
                    {isActive && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm flex items-center justify-center">
                            <CheckCircle size={10} className="text-white" />
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="pr-2 text-[17px] font-black tracking-[-0.03em] text-slate-900 truncate">{displayName}</h3>
                        <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md">
                            {student.student_code || student.ma_hoc_vien || 'Mới'}
                        </span>
                        {enrolledClasses > 0 && (
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <BookOpen size={10} />
                                {enrolledClasses} lớp
                            </span>
                        )}
                        {hasUnpaidFees && (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertCircle size={10} />
                                Công nợ
                            </span>
                        )}
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        {student.sdt && (
                            <span className="flex items-center gap-1">
                                <Phone size={10} />
                                {student.sdt}
                            </span>
                        )}
                        {student.cccd && (
                            <span className="flex items-center gap-1">
                                <FileText size={10} />
                                {student.cccd.slice(-4)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Trạng thái</div>
                    <div className={`mt-1 text-sm font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>{isActive ? 'Đang học' : 'Ngưng học'}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Lớp đang học</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">{enrolledClasses || 0} lớp</div>
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onView(student);
                    }}
                    className="flex-1 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 active:scale-[0.98] transition-transform"
                >
                    Xem chi tiết
                </button>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onEdit(student);
                    }}
                    className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 active:scale-[0.98] transition-transform"
                >
                    Sửa
                </button>
            </div>
        </div>
    );
};

export const StudentDetailSheet = ({ student, onClose, onEdit, onDelete, onRefresh, toast }) => {
    useBodyScrollLock(Boolean(student));
    const [activeTab, setActiveTab] = useState('info');
    const [enrollments, setEnrollments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fullImageView, setFullImageView] = useState(null);
    const [fullStudentData, setFullStudentData] = useState(student);
    const [editHistory, setEditHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [actionKey, setActionKey] = useState('');

    // Fetch full student data with images when modal opens
    useEffect(() => {
        const fetchFullStudentData = async () => {
            if (student?.cccd) {
                try {
                    const response = await api.getStudentByCCCD(student.cccd);
                    const studentData = response.data || response || student;
                    setFullStudentData(studentData);
                } catch (error) {
                    console.error('Failed to fetch full student data:', error);
                    // Keep original student data if fetch fails
                    setFullStudentData(student);
                }
            }
        };
        fetchFullStudentData();
    }, [student?.cccd]);

    useEffect(() => {
        const loadHistory = async () => {
            const studentId = fullStudentData?.id || student?.id;
            if (!studentId) {
                setEditHistory([]);
                return;
            }

            setHistoryLoading(true);
            try {
                const response = await api.getStudentEditHistory(studentId, 12, 0);
                const raw = Array.isArray(response?.data) ? response.data : [];
                // Lọc bỏ entries mà giá trị cũ/mới giống nhau (data rác)
                const filtered = raw.filter((item) => {
                    const oldVal = (item.old_value ?? '').toString().trim();
                    const newVal = (item.new_value ?? '').toString().trim();
                    return oldVal !== newVal;
                });
                setEditHistory(filtered);
            } catch (error) {
                console.error('Failed to load edit history:', error);
                setEditHistory([]);
            } finally {
                setHistoryLoading(false);
            }
        };

        loadHistory();
    }, [fullStudentData?.id, student?.id]);

    useEffect(() => {
        // Use registrations from fullStudentData (includes both hoc and thi classes)
        if (fullStudentData && activeTab === 'classes') {
            const registrations = fullStudentData.registrations || [];
            setEnrollments(registrations);
        } else if (fullStudentData && activeTab === 'payments') {
            loadPayments();
        }
    }, [fullStudentData, activeTab]);

    const loadPayments = async () => {
        setLoading(true);
        try {
            const studentId = fullStudentData?.id || student?.id;
            if (!studentId) return;
            const res = await api.getPayments({ student_id: studentId, limit: 10 });
            setPayments(Array.isArray(res) ? res : (res?.data || []));
        } catch (error) {
            console.error('Failed to load payments', error);
        } finally {
            setLoading(false);
        }
    };

    // Download image function
    const downloadImage = async (src, filename) => {
        if (!src) return;
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open image in new tab
            window.open(src, '_blank');
        }
    };

    const refreshDetail = async (showSuccessMessage = false) => {
        if (!student?.cccd) return;

        setRefreshing(true);
        try {
            const response = await api.getStudentByCCCD(student.cccd);
            const nextStudent = response?.data || response || student;
            setFullStudentData(nextStudent);
            await onRefresh?.();
            if (showSuccessMessage) {
                if (toast?.success) toast.success('Đã cập nhật trạng thái học viên');
            }
        } catch (error) {
            console.error('Failed to refresh student detail:', error);
            if (toast?.error) toast.error(error?.message || 'Không thể tải lại dữ liệu học viên');
        } finally {
            setRefreshing(false);
        }
    };

    const handleApproveRegistration = async (registration) => {
        const currentKey = `${registration.class_type || 'hoc'}-${registration.registration_id || registration.class_id}`;
        setActionKey(currentKey);
        try {
            if (registration.class_type === 'thi') {
                await api.approveExamStudent(registration.class_id, fullStudentData?.id || student?.id);
            } else {
                await api.updateRegistrationStatus(registration.registration_id, 'approved');
            }
            await refreshDetail(true);
        } catch (error) {
            console.error('Failed to approve registration:', error);
            if (toast?.error) toast.error(error?.message || 'Duyệt học viên thất bại');
        } finally {
            setActionKey('');
        }
    };

    // Use fullStudentData if available, otherwise fallback to student
    const displayStudent = fullStudentData || student;
    const registrations = Array.isArray(displayStudent?.registrations) ? displayStudent.registrations : [];
    const pendingRegistrations = registrations.filter((registration) => registration?.status === 'pending');
    const activeRegistrations = registrations.filter((registration) => ['approved', 'active', 'studying'].includes(registration?.status));

    // Data extraction
    const rawName = displayStudent.ho_ten_full || `${displayStudent.ho || ''} ${displayStudent.ten_dem || ''} ${displayStudent.ten || ''}`.trim();
    const displayName = rawName || 'Chưa có tên';
    const phone = displayStudent.sdt || displayStudent.phone_number || '';
    const email = displayStudent.email || '';
    const dob = formatDate(displayStudent.ngay_sinh);
    const address = displayStudent.dia_chi || '';
    const portraitUrl = getImageUrl(displayStudent.image_3x4 || displayStudent.photo_3x4_image_id);
    const cccdFrontUrl = getImageUrl(displayStudent.image_cccd_front || displayStudent.cccd_front_image_id);
    const cccdBackUrl = getImageUrl(displayStudent.image_cccd_back || displayStudent.cccd_back_image_id);
    const overlayLayer = useOverlayLayer(true);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal((
        <div className="fixed inset-0 z-[10020] flex items-end bg-black/60 backdrop-blur-[1px]" style={{ zIndex: overlayLayer }} onClick={onClose}>
            <div
                className="bg-white w-full h-[100dvh] max-h-[100dvh] shadow-2xl overflow-hidden flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-4 pt-2 pb-2">
                    <div className="mb-2 flex items-center justify-end gap-1.5">
                        <button
                            onClick={() => refreshDetail()}
                            disabled={refreshing}
                            className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-semibold text-white backdrop-blur-sm transition-transform active:scale-95 disabled:opacity-50"
                        >
                            <span className="flex items-center gap-1.5">
                                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                                Làm mới
                            </span>
                        </button>
                        {onEdit ? (
                            <button
                                onClick={() => onEdit(displayStudent)}
                            className="rounded-full bg-emerald-500 px-2.5 py-1 text-[9px] font-semibold text-white transition-transform active:scale-95"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Edit2 size={13} />
                                    Sửa
                                </span>
                            </button>
                        ) : null}
                        {onDelete ? (
                            <button
                                onClick={() => onDelete(displayStudent)}
                            className="rounded-full bg-rose-500 px-2.5 py-1 text-[9px] font-semibold text-white transition-transform active:scale-95"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Trash2 size={13} />
                                    Xóa
                                </span>
                            </button>
                        ) : null}
                        <button
                            onClick={onClose}
                            className="rounded-full bg-white/20 p-2 backdrop-blur-sm transition-transform active:scale-95"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white text-base font-bold text-blue-600 shadow-lg">
                            {portraitUrl ? (
                                <img src={portraitUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            {!portraitUrl && (
                                <span>{displayName.charAt(0)}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="line-clamp-2 text-xl font-bold leading-tight text-white">{displayName}</h2>
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                                {displayStudent.student_code || displayStudent.cccd || 'Học viên mới'}
                            </span>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                        <button
                            onClick={() => phone && (window.location.href = `tel:${phone}`)}
                            disabled={!phone}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all active:scale-95 ${phone ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white' : 'bg-slate-500/20 border-slate-500/30 text-white/50'}`}
                        >
                            <Phone size={16} />
                            <span className="text-[9px] font-medium">Gọi</span>
                        </button>

                        <button
                            onClick={() => phone && (window.location.href = `sms:${phone}`)}
                            disabled={!phone}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all active:scale-95 ${phone ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white' : 'bg-slate-500/20 border-slate-500/30 text-white/50'}`}
                        >
                            <Mail size={16} />
                            <span className="text-[9px] font-medium">SMS</span>
                        </button>

                        <button
                            onClick={() => email && (window.location.href = `mailto:${email}`)}
                            disabled={!email}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-1.5 transition-all active:scale-95 ${email ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white' : 'bg-slate-500/20 border-slate-500/30 text-white/50'}`}
                        >
                            <Mail size={16} />
                            <span className="text-[9px] font-medium">Email</span>
                        </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <div className="rounded-xl border border-white/20 bg-white/15 px-2.5 py-1.5 text-white backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/75">Tổng đăng ký</p>
                            <p className="mt-1 text-base font-black leading-none">{registrations.length}</p>
                        </div>
                        <div className="rounded-xl border border-white/20 bg-white/15 px-2.5 py-1.5 text-white backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/75">Đang hiệu lực</p>
                            <p className="mt-1 text-base font-black leading-none">{activeRegistrations.length}</p>
                        </div>
                        <div className="rounded-xl border border-white/20 bg-white/15 px-2.5 py-1.5 text-white backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/75">Chờ duyệt</p>
                            <p className="mt-1 text-base font-black leading-none">{pendingRegistrations.length}</p>
                        </div>
                        <div className="rounded-xl border border-white/20 bg-white/15 px-2.5 py-1.5 text-white backdrop-blur-sm">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/75">Lịch sử sửa</p>
                            <p className="mt-1 text-base font-black leading-none">{editHistory.length}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-white px-4">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 pb-2 pt-2 font-medium text-[12px] transition-colors border-b-2 ${activeTab === 'info' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex-1 pb-2 pt-2 font-medium text-[12px] transition-colors border-b-2 ${activeTab === 'photos' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Ảnh hồ sơ
                    </button>
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`flex-1 pb-2 pt-2 font-medium text-[12px] transition-colors border-b-2 ${activeTab === 'classes' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Lớp học/Thi
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`flex-1 pb-2 pt-2 font-medium text-[12px] transition-colors border-b-2 ${activeTab === 'payments' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Học phí
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto px-5">
                    {activeTab === 'info' && (
                        <div className="space-y-4 py-6">
                            {/* Thông tin cá nhân */}
                            <div>
                                <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">Thông tin cá nhân</h3>
                                <div className="space-y-3">
                                    <InfoRow icon={<User size={16} />} label="Họ và tên" value={`${displayStudent.ho || ''} ${displayStudent.ten_dem || ''} ${displayStudent.ten || ''}`.trim()} />
                                    <InfoRow icon={<Calendar size={16} />} label="Ngày sinh" value={dob} />
                                    <InfoRow icon={<User size={16} />} label="Giới tính" value={normalizeGenderValue(displayStudent.gioi_tinh)} />
                                    <InfoRow icon={<MapPin size={16} />} label="Nơi sinh" value={displayStudent.noi_sinh} />
                                    <InfoRow icon={<User size={16} />} label="Dân tộc" value={displayStudent.dan_toc || 'Kinh'} />
                                    <InfoRow icon={<User size={16} />} label="Quốc tịch" value={displayStudent.quoc_tich || 'Việt Nam'} />
                                </div>
                            </div>

                            {/* Giấy tờ */}
                            <div>
                                <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Giấy tờ tùy thân</h3>
                                <div className="space-y-3">
                                    <InfoRow icon={<CreditCard size={16} />} label="Số CCCD/CMND" value={displayStudent.cccd} />
                                    <InfoRow icon={<Calendar size={16} />} label="Ngày cấp CCCD" value={formatDate(displayStudent.ngay_cap_cccd)} />
                                </div>
                            </div>

                            {/* Liên hệ */}
                            <div>
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Liên hệ</h3>
                                <div className="space-y-3">
                                    <InfoRow icon={<Phone size={16} />} label="Số điện thoại" value={phone} />
                                    <InfoRow icon={<Mail size={16} />} label="Email" value={email} />
                                    <InfoRow icon={<MapPin size={16} />} label="Địa chỉ" value={address} />
                                    <InfoRow icon={<BookOpen size={16} />} label="Đơn vị công tác" value={displayStudent.don_vi_cong_tac} />
                                </div>
                            </div>

                            {/* Thông tin hệ thống */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Thông tin hệ thống</h3>
                                <div className="space-y-3">
                                    <InfoRow icon={<Clock size={16} />} label="Ngày tạo hồ sơ" value={formatDateTime(displayStudent.created_at)} />
                                    <InfoRow icon={<Clock size={16} />} label="Cập nhật lần cuối" value={formatDateTime(displayStudent.updated_at)} />
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-xs font-bold text-violet-600 uppercase tracking-wide">Lịch sử chỉnh sửa</h3>
                                    </div>
                                    <div className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                                        {editHistory.length} mục
                                    </div>
                                </div>

                                {historyLoading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 2 }).map((_, index) => (
                                            <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3">
                                                <div className="h-3 w-24 rounded bg-slate-200" />
                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                    <div className="h-16 rounded-xl bg-slate-100" />
                                                    <div className="h-16 rounded-xl bg-slate-100" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : editHistory.length > 0 ? (
                                    <div className="space-y-3">
                                        {editHistory.map((item, index) => (
                                            <HistoryEntryCard
                                                key={`${item.changed_at || 'history'}-${item.field_name || 'field'}-${index}`}
                                                item={item}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                                        <History size={28} className="mx-auto text-slate-300" />
                                        <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có lịch sử sửa đổi</p>
                                        <p className="mt-1 text-xs text-slate-500">Khi hồ sơ được chỉnh sửa, chi tiết sẽ hiển thị tại đây.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'photos' && (
                        <div className="py-6 space-y-6">
                            {/* Ảnh 3x4 */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-slate-700">Ảnh thẻ 3x4</p>
                                    {portraitUrl && (
                                        <button
                                            onClick={() => downloadImage(portraitUrl, `${displayStudent.ho_ten_full || displayName || 'student'}_3x4.jpg`)}
                                            className="text-xs text-blue-600 font-medium flex items-center gap-1"
                                        >
                                            <Download size={14} />
                                            Tải xuống
                                        </button>
                                    )}
                                </div>
                                {portraitUrl ? (
                                    <div
                                        className="relative aspect-[3/4] max-w-[240px] mx-auto rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 cursor-pointer active:scale-95 transition-transform bg-white"
                                        onClick={() => setFullImageView(portraitUrl)}
                                    >
                                        <img
                                            src={portraitUrl}
                                            alt="Ảnh 3x4"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                applyImageFallback(e, displayStudent.ho_ten_full || displayName || 'Hoc vien');
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center">
                                            <Eye size={24} className="text-white opacity-0 hover:opacity-100 transition-opacity drop-shadow-lg" />
                                        </div>
                                        <div className="placeholder hidden absolute inset-0 bg-slate-50 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                                            <User size={48} className="mb-2 opacity-50" />
                                            <p className="text-sm font-medium">Lỗi tải ảnh</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="aspect-[3/4] max-w-[240px] mx-auto rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300">
                                        <User size={48} className="mb-2 opacity-50" />
                                        <p className="text-sm font-medium">Chưa có ảnh</p>
                                    </div>
                                )}
                            </div>

                            {/* CCCD Images */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-600 text-center flex-1">CCCD MẶT TRƯỚC</p>
                                        {cccdFrontUrl && (
                                            <button
                                                onClick={() => downloadImage(cccdFrontUrl, `${displayStudent.ho_ten_full || displayName || 'student'}_cccd_front.jpg`)}
                                                className="text-[10px] text-blue-600"
                                            >
                                                <Download size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {cccdFrontUrl ? (
                                        <div
                                            className="relative aspect-[16/10] rounded-lg overflow-hidden shadow-md border-2 border-slate-200 cursor-pointer active:scale-95 transition-transform bg-white"
                                            onClick={() => setFullImageView(cccdFrontUrl)}
                                        >
                                            <img
                                                src={cccdFrontUrl}
                                                alt="CCCD Front"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    const placeholder = e.target.parentElement.querySelector('.placeholder');
                                                    if (placeholder) placeholder.style.display = 'flex';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center">
                                                <Eye size={20} className="text-white opacity-0 hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                            <div className="placeholder hidden absolute inset-0 bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-300">
                                                <CreditCard size={32} className="text-slate-300" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-[16/10] rounded-lg bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-300">
                                            <CreditCard size={32} className="text-slate-300" />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-bold text-slate-600 text-center flex-1">CCCD MẶT SAU</p>
                                        {cccdBackUrl && (
                                            <button
                                                onClick={() => downloadImage(cccdBackUrl, `${displayStudent.ho_ten_full || displayName || 'student'}_cccd_back.jpg`)}
                                                className="text-[10px] text-blue-600"
                                            >
                                                <Download size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {cccdBackUrl ? (
                                        <div
                                            className="relative aspect-[16/10] rounded-lg overflow-hidden shadow-md border-2 border-slate-200 cursor-pointer active:scale-95 transition-transform bg-white"
                                            onClick={() => setFullImageView(cccdBackUrl)}
                                        >
                                            <img
                                                src={cccdBackUrl}
                                                alt="CCCD Back"
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    const placeholder = e.target.parentElement.querySelector('.placeholder');
                                                    if (placeholder) placeholder.style.display = 'flex';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center">
                                                <Eye size={20} className="text-white opacity-0 hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                            <div className="placeholder hidden absolute inset-0 bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-300">
                                                <CreditCard size={32} className="text-slate-300" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-[16/10] rounded-lg bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-300">
                                            <CreditCard size={32} className="text-slate-300" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'classes' && (
                        <div className="py-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                                </div>
                            ) : enrollments.length > 0 ? (
                                <div className="space-y-3">
                                    {enrollments.map((enrollment, idx) => {
                                        const classType = enrollment.class_type || 'hoc';
                                        const isThi = classType === 'thi';
                                        const className = enrollment.class_name || enrollment.ten_lop || (isThi ? 'Lớp thi' : 'Lớp học');
                                        const registrationKey = `${classType}-${enrollment.registration_id || enrollment.class_id || idx}`;
                                        const rawStatus = enrollment.status || enrollment.registration_status || 'pending';
                                        const status = String(rawStatus).toLowerCase();
                                        const statusClass =
                                            status === 'approved' || status === 'active' || status === 'studying'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : status === 'completed'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : status === 'rejected'
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : 'bg-amber-100 text-amber-700';
                                        const statusLabel =
                                            status === 'approved' || status === 'active' || status === 'studying'
                                                ? 'Đã duyệt'
                                                : status === 'completed'
                                                    ? 'Hoàn thành'
                                                    : status === 'rejected'
                                                        ? 'Đã từ chối'
                                                        : 'Chờ duyệt';
                                        const paymentStatus = enrollment.payment_status || enrollment.hoc_phi_status;
                                        const paymentLabel =
                                            paymentStatus === 'paid'
                                                ? 'Đã thanh toán'
                                                : paymentStatus === 'partial'
                                                    ? 'Thanh toán một phần'
                                                    : paymentStatus === 'pending'
                                                        ? 'Chưa thanh toán'
                                                        : '';
                                        const createdAt = enrollment.registration_created_at || enrollment.created_at;
                                        const approvedAt = enrollment.approved_at;
                                        const createdBy = enrollment.created_by_name || enrollment.created_by || 'Hệ thống';
                                        const approvedBy = enrollment.approved_by_name || enrollment.approved_by || 'Chưa có';
                                        const canApprove = status === 'pending';

                                        return (
                                            <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="truncate text-base font-bold text-slate-900">{className}</h4>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${isThi ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {isThi ? 'Lớp thi' : 'Lớp học'}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass}`}>
                                                                {statusLabel}
                                                            </span>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {paymentLabel ? (
                                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                                                    {paymentLabel}
                                                                </span>
                                                            ) : null}
                                                            {enrollment.ngay_bat_dau ? (
                                                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                                                                    Bắt đầu {formatDate(enrollment.ngay_bat_dau)}
                                                                </span>
                                                            ) : null}
                                                            {enrollment.ngay_ket_thuc ? (
                                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                                                    Kết thúc {formatDate(enrollment.ngay_ket_thuc)}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {canApprove ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApproveRegistration(enrollment)}
                                                            disabled={actionKey === registrationKey}
                                                            className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-60"
                                                        >
                                                            {actionKey === registrationKey ? 'Đang duyệt...' : 'Duyệt nhanh'}
                                                        </button>
                                                    ) : null}
                                                </div>

                                                <div className="mt-3 grid gap-2">
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Dấu vết đăng ký</p>
                                                        <div className="mt-1 space-y-1 text-xs text-slate-600">
                                                            <p>Ngày tạo: {createdAt ? formatDateTime(createdAt) : 'Chưa rõ'}</p>
                                                            <p>Người tạo: {createdBy}</p>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Dấu vết phê duyệt</p>
                                                        <div className="mt-1 space-y-1 text-xs text-slate-600">
                                                            <p>Ngày duyệt: {approvedAt ? formatDateTime(approvedAt) : 'Chưa duyệt'}</p>
                                                            <p>Người duyệt: {approvedBy}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <GraduationCap size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Chưa đăng ký lớp nào</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="py-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                                </div>
                            ) : payments.length > 0 ? (
                                <div className="space-y-3">
                                    {payments.map((payment, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount || payment.so_tien || 0)}</p>
                                                <p className="text-xs text-slate-500">{payment.description || payment.ghi_chu || 'Học phí'}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${payment.status === 'completed' || payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {payment.status === 'completed' || payment.status === 'paid' ? 'Đã thu' : 'Chờ'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <DollarSign size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Chưa có giao dịch</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Full Image View Modal */}
            {fullImageView && (
                <div className="fixed inset-0 z-[10030] bg-black flex items-center justify-center p-4" onClick={() => setFullImageView(null)}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setFullImageView(null); }}
                        className="absolute top-4 right-4 p-3 rounded-full bg-white/20 backdrop-blur-sm"
                    >
                        <X size={24} className="text-white" />
                    </button>
                    <img
                        src={fullImageView}
                        alt="Full view"
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    ), document.body);
};

const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
            <div className="p-2 bg-white rounded-lg text-slate-400 flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="font-medium text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
};

const HistoryEntryCard = ({ item }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {item.field_name || 'Trường dữ liệu'}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDateTime(item.changed_at) || 'Không rõ thời gian'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    {item.admin_full_name || item.admin_username || 'Hệ thống'}
                </p>
            </div>
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Lịch sử
            </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-500">Trước đó</div>
                <div className="mt-1 text-sm text-slate-700">{item.old_value || 'Trống'}</div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">Sau chỉnh sửa</div>
                <div className="mt-1 text-sm text-slate-700">{item.new_value || 'Trống'}</div>
            </div>
        </div>
    </div>
);

// Edit Modal Component with full image upload support
const StudentEditModal = ({ student, onClose, onSave }) => {
    useBodyScrollLock(true);
    const toast = useToast();
    const overlayLayer = useOverlayLayer(true);
    const isEditMode = Boolean(student?.id);
    const buildInitialFormData = (studentData) => ({
        ho: studentData?.ho || '',
        ten_dem: studentData?.ten_dem || '',
        ten: studentData?.ten || '',
        ngay_sinh: studentData?.ngay_sinh || '',
        gioi_tinh: normalizeGenderValue(studentData?.gioi_tinh),
        noi_sinh: studentData?.noi_sinh || '',
        dan_toc: studentData?.dan_toc || 'Kinh',
        quoc_tich: studentData?.quoc_tich || 'Việt Nam',
        cccd: studentData?.cccd || '',
        ngay_cap_cccd: studentData?.ngay_cap_cccd || '',
        sdt: studentData?.sdt || '',
        email: studentData?.email || '',
        dia_chi: studentData?.dia_chi || '',
        don_vi_cong_tac: studentData?.don_vi_cong_tac || '',
        cccd_front_image_id: studentData?.cccd_front_image_id || '',
        cccd_back_image_id: studentData?.cccd_back_image_id || '',
        photo_3x4_image_id: studentData?.photo_3x4_image_id || ''
    });
    const [formData, setFormData] = useState(buildInitialFormData(student));
    const [imageFront, setImageFront] = useState(student?.image_cccd_front || '');
    const [imageBack, setImageBack] = useState(student?.image_cccd_back || '');
    const [imagePortrait, setImagePortrait] = useState(student?.image_3x4 || '');
    const [saving, setSaving] = useState(false);
    const uploaderFallback = (
        <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Đang tải trình upload...
        </div>
    );

    useEffect(() => {
        setFormData(buildInitialFormData(student));
        setImageFront(student?.image_cccd_front || '');
        setImageBack(student?.image_cccd_back || '');
        setImagePortrait(student?.image_3x4 || '');
    }, [student]);

    // Handle image upload success
    const handleImageUploadSuccess = (field) => (result) => {
        console.log('Image upload success:', { field, result });
        const imageIdField = field === 'front' ? 'cccd_front_image_id' :
            field === 'back' ? 'cccd_back_image_id' : 'photo_3x4_image_id';

        if (result && result.imageId) {
            setFormData(prev => ({ ...prev, [imageIdField]: result.imageId }));

            // Auto-save image ID to student
            if (student?.id) {
                api.updateStudent(student.id, { [imageIdField]: result.imageId })
                    .then(response => {
                        const studentData = response.data || response;
                        const imageUrl = studentData[field === 'front' ? 'image_cccd_front' :
                            field === 'back' ? 'image_cccd_back' : 'image_3x4'];
                        if (imageUrl) {
                            if (field === 'front') setImageFront(imageUrl);
                            else if (field === 'back') setImageBack(imageUrl);
                            else if (field === 'portrait') setImagePortrait(imageUrl);
                        }
                    })
                    .catch(error => console.error('Error auto-saving image:', error));
            }
        }
    };

    const handleImageUploadError = (error) => {
        console.error('Image upload error:', error);
        toast.error('Lỗi upload ảnh: ' + (error.message || 'Unknown error'));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditMode) {
                await api.updateStudent(student.id, formData);
                toast.success('Đã cập nhật hồ sơ học viên');
            } else {
                await api.createStudentAdmin(formData);
                toast.success('Đã tạo học viên mới');
            }
            onSave();
        } catch (error) {
            console.error('Failed to save student', error);
            toast.error('Lỗi: ' + (error.message || 'Không thể lưu học viên'));
        } finally {
            setSaving(false);
        }
    };

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal((
        <div className="fixed inset-0 z-[10020] bg-black/60 flex items-end" style={{ zIndex: overlayLayer }} onClick={onClose}>
            <div
                className="bg-white w-full h-[100dvh] max-h-[100dvh] shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white">{isEditMode ? 'Chỉnh sửa hồ sơ' : 'Tạo học viên mới'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                    {/* Thông tin cá nhân */}
                    <div>
                        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">Thông tin cá nhân</h3>
                        <div className="space-y-3">
                            <FormField label="Họ" value={formData.ho} onChange={(v) => setFormData({ ...formData, ho: v })} />
                            <FormField label="Tên đệm" value={formData.ten_dem} onChange={(v) => setFormData({ ...formData, ten_dem: v })} />
                            <FormField label="Tên" value={formData.ten} onChange={(v) => setFormData({ ...formData, ten: v })} required />
                            <FormField label="Ngày sinh (dd/mm/yyyy)" value={formData.ngay_sinh} onChange={(v) => setFormData({ ...formData, ngay_sinh: v })} />
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                                <select
                                    value={formData.gioi_tinh}
                                    onChange={(e) => setFormData({ ...formData, gioi_tinh: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <BirthPlaceField
                                label="Nơi sinh"
                                value={formData.noi_sinh}
                                onChange={(v) => setFormData({ ...formData, noi_sinh: v })}
                                hint="Trong nước chọn theo danh sách 34 tỉnh/thành."
                                wrapperClassName="space-y-1"
                                labelClassName="block text-sm font-medium text-slate-700"
                                toggleWrapperClassName=""
                                radioGroupClassName="flex flex-wrap gap-4"
                                radioOptionClassName="inline-flex items-center gap-2 text-sm text-slate-700"
                                inputClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                selectClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                hintClassName="text-xs text-slate-500"
                            />
                            <FormField label="Dân tộc" value={formData.dan_toc} onChange={(v) => setFormData({ ...formData, dan_toc: v })} />
                            <FormField label="Quốc tịch" value={formData.quoc_tich} onChange={(v) => setFormData({ ...formData, quoc_tich: v })} />
                        </div>
                    </div>

                    {/* Giấy tờ */}
                    <div>
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Giấy tờ tùy thân</h3>
                        <div className="space-y-3">
                            <FormField label="Số CCCD/CMND" value={formData.cccd} onChange={(v) => setFormData({ ...formData, cccd: v })} required disabled={isEditMode} />
                            <FormField label="Ngày cấp CCCD (dd/mm/yyyy)" value={formData.ngay_cap_cccd} onChange={(v) => setFormData({ ...formData, ngay_cap_cccd: v })} />
                        </div>
                    </div>

                    {/* Liên hệ */}
                    <div>
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Liên hệ</h3>
                        <div className="space-y-3">
                            <FormField label="Số điện thoại" value={formData.sdt} onChange={(v) => setFormData({ ...formData, sdt: v })} type="tel" />
                            <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} type="email" />
                            <FormField label="Địa chỉ" value={formData.dia_chi} onChange={(v) => setFormData({ ...formData, dia_chi: v })} />
                            <FormField label="Đơn vị công tác" value={formData.don_vi_cong_tac} onChange={(v) => setFormData({ ...formData, don_vi_cong_tac: v })} />
                        </div>
                    </div>

                    {/* Ảnh hồ sơ */}
                    <div>
                        <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3">Ảnh hồ sơ</h3>
                        <div className="space-y-4">
                            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                Admin có thể đổi ảnh CCCD/3x4 trực tiếp trên mobile. Ảnh mới sẽ được lưu khi bấm nút lưu ở cuối form.
                            </div>

                            {/* Ảnh 3x4 */}
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-2">Ảnh thẻ 3x4</p>
                                <Suspense fallback={uploaderFallback}>
                                    <CCCDUploader
                                        type="photo_3x4"
                                        onUploadSuccess={handleImageUploadSuccess('portrait')}
                                        onUploadError={handleImageUploadError}
                                        existingImageUrl={imagePortrait}
                                    />
                                </Suspense>
                            </div>

                            {/* CCCD Images */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs font-medium text-slate-600 mb-2 text-center">CCCD MẶT TRƯỚC</p>
                                    <Suspense fallback={uploaderFallback}>
                                        <CCCDUploader
                                            type="cccd_front"
                                            onUploadSuccess={handleImageUploadSuccess('front')}
                                            onUploadError={handleImageUploadError}
                                            existingImageUrl={imageFront}
                                        />
                                    </Suspense>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-600 mb-2 text-center">CCCD MẶT SAU</p>
                                    <Suspense fallback={uploaderFallback}>
                                        <CCCDUploader
                                            type="cccd_back"
                                            onUploadSuccess={handleImageUploadSuccess('back')}
                                            onUploadError={handleImageUploadError}
                                            existingImageUrl={imageBack}
                                        />
                                    </Suspense>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="border-t border-slate-200 px-5 py-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium active:scale-95 transition-transform"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                {isEditMode ? 'Lưu thay đổi' : 'Tạo học viên'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    ), document.body);
};

const FormField = ({ label, value, onChange, type = 'text', required = false, disabled = false }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
        </div>
    );
};

export default function MobileStudentsModule() {
    const toast = useToast();
    const cachedStudents = getAdminCache(ADMIN_CACHE_KEYS.students, ADMIN_CACHE_TTL.students);
    const [students, setStudents] = useState(() => cachedStudents?.students ?? []);
    const [studentStats, setStudentStats] = useState(() => cachedStudents?.studentStats ?? null);
    const [loading, setLoading] = useState(() => cachedStudents === null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [creatingStudent, setCreatingStudent] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('name');

    useEffect(() => {
        void fetchStudents();
    }, []);
    useAdminAutoRefresh(() => fetchStudents({ force: true }), { minIntervalMs: 12000 });

    const fetchStudents = async ({ force = false } = {}) => {
        const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.students, ADMIN_CACHE_TTL.students);
        if (cached) {
            setStudents(cached.students || []);
            setStudentStats(cached.studentStats || null);
            setLoading(false);
            return cached.students || [];
        }

        try {
            if (force) {
                api.invalidateCache(['/students']);
            }
            const res = await api.getStudents();
            const studentList = Array.isArray(res) ? res : (res?.data || res?.results || []);
            setStudents(studentList);
            setStudentStats(res?.meta?.stats || null);
            setAdminCache(ADMIN_CACHE_KEYS.students, {
                students: studentList,
                studentStats: res?.meta?.stats || null,
            });
            return studentList;
        } catch (error) {
            console.error('Failed to fetch students', error);
            setStudents([]);
            setStudentStats(null);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (student) => {
        setSelectedStudent(null);
        setCreatingStudent(false);
        setEditingStudent(student);
    };

    const handleCreateStudent = () => {
        setSelectedStudent(null);
        setEditingStudent(null);
        setCreatingStudent(true);
    };

    const handleViewStudent = (student) => {
        setCreatingStudent(false);
        setEditingStudent(null);
        setSelectedStudent(student);
    };

    const handleSaveEdit = async () => {
        invalidateAdminData({
            keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
            source: 'mobile-students-management',
        });
        await fetchStudents({ force: true });
        setEditingStudent(null);
        setCreatingStudent(false);
    };

    const handleDeleteStudent = async (student) => {
        if (!student?.id) return;
        if (!window.confirm(`Xóa học viên "${student.ho_ten_full || student.cccd || 'này'}"?`)) return;

        try {
            const response = await api.deleteStudent(student.id);
            if (response?.success === false) {
                toast.error(response?.message || 'Không thể xóa học viên');
                return;
            }

            toast.success('Đã xóa học viên');
            if (selectedStudent?.id === student.id) setSelectedStudent(null);
            if (editingStudent?.id === student.id) setEditingStudent(null);
            invalidateAdminData({
                keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
                source: 'mobile-students-management',
            });
            await fetchStudents({ force: true });
        } catch (error) {
            console.error('Failed to delete student', error);
            toast.error(error?.message || 'Không thể xóa học viên');
        }
    };

    let processedStudents = students.filter((s) => {
        const name = (s.ho_ten_full || `${s.ho || ''} ${s.ten_dem || ''} ${s.ten || ''}`.trim()).toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase()) ||
            (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.sdt && s.sdt.includes(searchTerm)) ||
            (s.cccd && s.cccd.includes(searchTerm));

        if (!matchesSearch) return false;

        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return s.trang_thai === 'active' || s.is_active !== false;
        if (filterStatus === 'inactive') return s.trang_thai === 'inactive' || s.is_active === false;
        if (filterStatus === 'debt') return s.cong_no > 0 || s.payment_status === 'pending';

        return true;
    });

    if (sortBy === 'name') {
        processedStudents.sort((a, b) => {
            const nameA = (a.ho_ten_full || `${a.ho || ''} ${a.ten || ''}`).toLowerCase();
            const nameB = (b.ho_ten_full || `${b.ho || ''} ${b.ten || ''}`).toLowerCase();
            return nameA.localeCompare(nameB);
        });
    } else if (sortBy === 'recent') {
        processedStudents.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });
    }

    const totalStudents = studentStats?.totalStudents ?? students.length;
    const activeStudents = studentStats?.activeStudents ?? students.filter((s) => s.trang_thai === 'active' || s.is_active !== false).length;
    const debtStudents = students.filter((s) => s.cong_no > 0 || s.payment_status === 'pending').length;

    const handleRefresh = async () => {
        setLoading(true);
        clearAdminCache(ADMIN_CACHE_KEYS.students);
        await fetchStudents({ force: true });
    };

    const handleExportCSV = () => {
        const list = processedStudents.length > 0 ? processedStudents : students;
        const header = ['Họ và tên', 'CCCD/CMND', 'Ngày sinh', 'SĐT', 'Email', 'Trạng thái'];
        const rows = list.map((s) => [
            s.ho_ten_full || `${s.ho || ''} ${s.ten_dem || ''} ${s.ten || ''}`.trim() || '',
            s.cccd || '',
            s.ngay_sinh ? new Date(s.ngay_sinh).toLocaleDateString('vi-VN') : '',
            s.sdt || '',
            s.email || '',
            s.trang_thai === 'active' ? 'Đang học' : s.trang_thai === 'inactive' ? 'Ngưng học' : '',
        ]);
        const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `danh-sach-hoc-vien-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
            <div className="min-h-screen bg-[#f3f6fb] pb-6">
                <MobileAdminHeroCard
                    eyebrow="Quản lý học tập"
                    icon={User}
                    tone="emerald"
                    title="Học viên"
                    description="Giữ số liệu, tìm kiếm và bộ lọc trong cùng một cụm để admin không phải quét qua nhiều block đầu trang."
                    actions={(
                        <>
                            <MobileAdminSecondaryButton onClick={handleRefresh} className="px-3.5">
                                <RefreshCw size={16} />
                                Làm mới
                            </MobileAdminSecondaryButton>
                            <MobileAdminPrimaryButton onClick={handleCreateStudent} className="px-3.5">
                                <UserPlus size={16} />
                                Tạo học viên
                            </MobileAdminPrimaryButton>
                        </>
                    )}
                    stats={(
                        <div className="grid grid-cols-3 gap-2">
                            <MobileAdminStatCard label="Tổng HV" value={totalStudents} tone="blue" />
                            <MobileAdminStatCard label="Đang học" value={activeStudents} tone="emerald" />
                            <MobileAdminStatCard label="Công nợ" value={debtStudents} tone="amber" />
                        </div>
                    )}
                    search={(
                        <MobileAdminSearchField
                            value={searchTerm}
                            onChange={setSearchTerm}
                            onClear={() => setSearchTerm('')}
                            placeholder="Tìm theo tên, SĐT, email hoặc CCCD"
                        />
                    )}
                    filters={(
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition ${
                                        showFilters ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    <Filter size={16} />
                                    Bộ lọc
                                </button>
                                <MobileAdminSecondaryButton type="button" onClick={handleExportCSV} className="border-emerald-200 bg-emerald-50 text-emerald-700 px-3.5 text-[11px] font-black uppercase tracking-[0.1em]">
                                    <Download size={16} />
                                    CSV
                                </MobileAdminSecondaryButton>
                            </div>

                            {showFilters ? (
                                <div className="rounded-[24px] bg-slate-50 p-3 space-y-3">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Trạng thái</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['all', 'active', 'inactive', 'debt'].map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => setFilterStatus(status)}
                                                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                                        filterStatus === status
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'border border-slate-200 bg-white text-slate-600'
                                                    }`}
                                                >
                                                    {status === 'all' && 'Tất cả'}
                                                    {status === 'active' && 'Đang học'}
                                                    {status === 'inactive' && 'Ngưng học'}
                                                    {status === 'debt' && 'Có công nợ'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Sắp xếp</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                                        >
                                            <option value="name">Tên A-Z</option>
                                            <option value="recent">Mới nhất</option>
                                        </select>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                    footer={<span>Hiển thị {processedStudents.length} / {students.length} học viên</span>}
                />

                <div className="px-4 pt-3" style={{ paddingBottom: mobileAdminContentPadding(24) }}>
                    {loading ? (
                        <AdminLoadingState
                            title="Đang tải danh sách học viên"
                            hint="Danh sách học viên được lấy lại từ cache cục bộ để giảm cảm giác chờ mỗi lần quay về tab này."
                            variant="mobile-list"
                            accent="blue"
                        />
                    ) : processedStudents.length > 0 ? (
                        <div className="space-y-3">
                            {processedStudents.map((s) => (
                                <StudentCard
                                    key={s.id || s.cccd}
                                    student={s}
                                    onView={handleViewStudent}
                                    onEdit={handleEdit}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-5 py-16 text-center shadow-sm">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-400">
                                <User size={30} />
                            </div>
                            <h3 className="mt-5 text-xl font-black text-slate-900">Không tìm thấy học viên</h3>
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
                                    onClick={handleCreateStudent}
                                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                                >
                                    Tạo học viên
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedStudent && (
                    <StudentDetailSheet
                        student={selectedStudent}
                        onClose={() => setSelectedStudent(null)}
                        onEdit={handleEdit}
                        onDelete={handleDeleteStudent}
                        onRefresh={() => fetchStudents({ force: true })}
                        toast={toast}
                    />
                )}

                {(editingStudent || creatingStudent) && (
                    <StudentEditModal
                        student={editingStudent}
                        onClose={() => {
                            setEditingStudent(null);
                            setCreatingStudent(false);
                        }}
                        onSave={handleSaveEdit}
                    />
                )}
            </div>
            <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        </PullToRefreshWrapper>
    );
}
