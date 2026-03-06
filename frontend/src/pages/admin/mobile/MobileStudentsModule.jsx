import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Mail, ChevronRight, X, User, Calendar, MapPin, GraduationCap, DollarSign, Clock, Filter, TrendingUp, AlertCircle, CheckCircle, BookOpen, FileText, ChevronDown, Edit2, Image as ImageIcon, CreditCard, Save, Upload, Download, Eye } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import ToastContainer from '../../../components/ui/ToastContainer';
import CCCDUploader from '../../../components/upload/CCCDUploader';

// Helper function to ensure image URLs are full URLs (same as desktop)
export const getImageUrl = (url) => {
    if (!url) return null;
    // If already a full URL (starts with http:// or https://), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // If it's a Cloudflare Images ID (UUID format), use Cloudflare Images CDN
    if (url.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const accountHash = import.meta.env.VITE_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
        if (accountHash) {
            return `https://imagedelivery.net/${accountHash}/${url}/public`;
        }
    }
    // If relative URL, prepend API base URL
    const getApiBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
        // Auto-detect if running on Cloudflare Pages or Custom Domain
        if (typeof window !== 'undefined' &&
            (window.location.hostname.includes('pages.dev') ||
                window.location.hostname.includes('cloudflare') ||
                window.location.hostname.includes('vantrangedu.com'))) {
            return 'https://vantrangedu-api.bangachieu2.workers.dev';
        }
        return '/api';
    };
    const apiBaseUrl = getApiBaseUrl();
    // Remove trailing slash from base URL if present
    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    // Ensure url starts with /
    const imagePath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${imagePath}`;
};

// Format date for display
export const formatDate = (date) => {
    if (!date) return '';
    try {
        return new Date(date).toLocaleDateString('vi-VN');
    } catch {
        return date;
    }
};

const StudentCard = ({ student, onClick }) => {
    const rawName = student.ho_ten_full || `${student.ho || ''} ${student.ten_dem || ''} ${student.ten || ''}`.trim();
    const displayName = rawName || 'Chưa có tên';
    const initial = displayName.charAt(0)?.toUpperCase() || 'U';
    const isActive = student.trang_thai === 'active' || student.is_active !== false;

    const hasUnpaidFees = student.payment_status === 'pending' || student.cong_no > 0;
    const enrolledClasses = student.enrolled_classes_count || student.so_lop_dang_hoc || 0;

    return (
        <div
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-3 active:scale-[0.98] transition-all duration-200 hover:shadow-md"
            onClick={() => onClick(student)}
        >
            <div className="flex items-start gap-4">
                <div className="relative">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm overflow-hidden ${isActive ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                        {student.image_3x4 ? (
                            <img
                                src={getImageUrl(student.image_3x4)}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <span style={{ display: student.image_3x4 ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>{initial}</span>
                    </div>
                    {isActive && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm flex items-center justify-center">
                            <CheckCircle size={10} className="text-white" />
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-800 text-base truncate pr-2">{displayName}</h3>
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

                    <div className="flex items-center gap-3 text-xs text-slate-400">
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
        </div>
    );
};

export const StudentDetailSheet = ({ student, onClose, onEdit }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [enrollments, setEnrollments] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fullImageView, setFullImageView] = useState(null);
    const [fullStudentData, setFullStudentData] = useState(student);

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

    // Use fullStudentData if available, otherwise fallback to student
    const displayStudent = fullStudentData || student;

    // Data extraction
    const rawName = displayStudent.ho_ten_full || `${displayStudent.ho || ''} ${displayStudent.ten_dem || ''} ${displayStudent.ten || ''}`.trim();
    const displayName = rawName || 'Chưa có tên';
    const phone = displayStudent.sdt || displayStudent.phone_number || '';
    const email = displayStudent.email || '';
    const dob = formatDate(displayStudent.ngay_sinh);
    const address = displayStudent.dia_chi || '';

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[92vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-5 pt-6 pb-5">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <button
                        onClick={() => onEdit(displayStudent)}
                        className="absolute top-4 right-16 p-2 rounded-full bg-emerald-500 active:scale-95 transition-transform flex items-center gap-1.5 px-3"
                    >
                        <Edit2 size={16} className="text-white" />
                        <span className="text-white text-sm font-medium">Sửa</span>
                    </button>

                    <div className="flex gap-4 items-center">
                        <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold text-blue-600 shadow-lg overflow-hidden">
                            {displayStudent.image_3x4 ? (
                                <img src={getImageUrl(displayStudent.image_3x4)} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            {!displayStudent.image_3x4 && (
                                <span>{displayName.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white mt-2 border border-white/30">
                                {displayStudent.student_code || displayStudent.cccd || 'Học viên mới'}
                            </span>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <button
                            onClick={() => phone && (window.location.href = `tel:${phone}`)}
                            disabled={!phone}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${phone ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white' : 'bg-slate-500/20 border-slate-500/30 text-white/50'}`}
                        >
                            <Phone size={20} />
                            <span className="text-xs font-medium">Gọi</span>
                        </button>

                        <button
                            onClick={() => phone && (window.location.href = `sms:${phone}`)}
                            disabled={!phone}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${phone ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white' : 'bg-slate-500/20 border-slate-500/30 text-white/50'}`}
                        >
                            <Mail size={20} />
                            <span className="text-xs font-medium">SMS</span>
                        </button>

                        <button
                            onClick={() => email && (window.location.href = `mailto:${email}`)}
                            disabled={!email}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${email ? 'bg-white/20 backdrop-blur-sm border-white/30 text-white' : 'bg-slate-500/20 border-slate-500/30 text-white/50'}`}
                        >
                            <Mail size={20} />
                            <span className="text-xs font-medium">Email</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-5 bg-white sticky top-0 z-10">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'info' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'photos' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Ảnh hồ sơ
                    </button>
                    <button
                        onClick={() => setActiveTab('classes')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'classes' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
                    >
                        Lớp học/Thi
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'payments' ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'}`}
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
                                    <InfoRow icon={<User size={16} />} label="Giới tính" value={displayStudent.gioi_tinh === 'male' ? 'Nam' : displayStudent.gioi_tinh === 'female' ? 'Nữ' : displayStudent.gioi_tinh} />
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
                                    <InfoRow icon={<Clock size={16} />} label="Ngày tạo hồ sơ" value={formatDate(displayStudent.created_at)} />
                                    <InfoRow icon={<Clock size={16} />} label="Cập nhật lần cuối" value={formatDate(displayStudent.updated_at)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'photos' && (
                        <div className="py-6 space-y-6">
                            {/* Ảnh 3x4 */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-slate-700">Ảnh thẻ 3x4</p>
                                    {displayStudent.image_3x4 && (
                                        <button
                                            onClick={() => downloadImage(getImageUrl(displayStudent.image_3x4), `${displayStudent.ho_ten_full || displayName || 'student'}_3x4.jpg`)}
                                            className="text-xs text-blue-600 font-medium flex items-center gap-1"
                                        >
                                            <Download size={14} />
                                            Tải xuống
                                        </button>
                                    )}
                                </div>
                                {displayStudent.image_3x4 ? (
                                    <div
                                        className="relative aspect-[3/4] max-w-[240px] mx-auto rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 cursor-pointer active:scale-95 transition-transform bg-white"
                                        onClick={() => setFullImageView(getImageUrl(displayStudent.image_3x4))}
                                    >
                                        <img
                                            src={getImageUrl(displayStudent.image_3x4)}
                                            alt="Ảnh 3x4"
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                const placeholder = e.target.parentElement.querySelector('.placeholder');
                                                if (placeholder) placeholder.style.display = 'flex';
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
                                        {displayStudent.image_cccd_front && (
                                            <button
                                                onClick={() => downloadImage(getImageUrl(displayStudent.image_cccd_front), `${displayStudent.ho_ten_full || displayName || 'student'}_cccd_front.jpg`)}
                                                className="text-[10px] text-blue-600"
                                            >
                                                <Download size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {displayStudent.image_cccd_front ? (
                                        <div
                                            className="relative aspect-[16/10] rounded-lg overflow-hidden shadow-md border-2 border-slate-200 cursor-pointer active:scale-95 transition-transform bg-white"
                                            onClick={() => setFullImageView(getImageUrl(displayStudent.image_cccd_front))}
                                        >
                                            <img
                                                src={getImageUrl(displayStudent.image_cccd_front)}
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
                                        {displayStudent.image_cccd_back && (
                                            <button
                                                onClick={() => downloadImage(getImageUrl(displayStudent.image_cccd_back), `${displayStudent.ho_ten_full || displayName || 'student'}_cccd_back.jpg`)}
                                                className="text-[10px] text-blue-600"
                                            >
                                                <Download size={12} />
                                            </button>
                                        )}
                                    </div>
                                    {displayStudent.image_cccd_back ? (
                                        <div
                                            className="relative aspect-[16/10] rounded-lg overflow-hidden shadow-md border-2 border-slate-200 cursor-pointer active:scale-95 transition-transform bg-white"
                                            onClick={() => setFullImageView(getImageUrl(displayStudent.image_cccd_back))}
                                        >
                                            <img
                                                src={getImageUrl(displayStudent.image_cccd_back)}
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

                                        return (
                                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-slate-800">{className}</h4>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isThi
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {isThi ? '📝 Lớp thi' : '📚 Lớp học'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span className={`px-2 py-0.5 rounded-full ${enrollment.status === 'active' || enrollment.status === 'approved'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-200 text-slate-600'
                                                                }`}>
                                                                {enrollment.status === 'active' || enrollment.status === 'approved'
                                                                    ? 'Đang học'
                                                                    : enrollment.status === 'completed'
                                                                        ? 'Đã hoàn thành'
                                                                        : 'Đã kết thúc'}
                                                            </span>
                                                            {enrollment.ngay_bat_dau && (
                                                                <span>• Từ {new Date(enrollment.ngay_bat_dau).toLocaleDateString('vi-VN')}</span>
                                                            )}
                                                            {enrollment.registration_created_at && (
                                                                <span>• ĐK: {new Date(enrollment.registration_created_at).toLocaleDateString('vi-VN')}</span>
                                                            )}
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
                <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center p-4" onClick={() => setFullImageView(null)}>
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
    );
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

// Edit Modal Component with full image upload support
const StudentEditModal = ({ student, onClose, onSave }) => {
    const toast = useToast();
    const [formData, setFormData] = useState({
        ho: student?.ho || '',
        ten_dem: student?.ten_dem || '',
        ten: student?.ten || '',
        ngay_sinh: student?.ngay_sinh || '',
        gioi_tinh: student?.gioi_tinh || 'male',
        noi_sinh: student?.noi_sinh || '',
        dan_toc: student?.dan_toc || 'Kinh',
        quoc_tich: student?.quoc_tich || 'Việt Nam',
        cccd: student?.cccd || '',
        ngay_cap_cccd: student?.ngay_cap_cccd || '',
        sdt: student?.sdt || '',
        email: student?.email || '',
        dia_chi: student?.dia_chi || '',
        don_vi_cong_tac: student?.don_vi_cong_tac || '',
        cccd_front_image_id: student?.cccd_front_image_id || '',
        cccd_back_image_id: student?.cccd_back_image_id || '',
        photo_3x4_image_id: student?.photo_3x4_image_id || ''
    });
    const [imageFront, setImageFront] = useState(student?.image_cccd_front || '');
    const [imageBack, setImageBack] = useState(student?.image_cccd_back || '');
    const [imagePortrait, setImagePortrait] = useState(student?.image_3x4 || '');
    const [saving, setSaving] = useState(false);

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
            await api.updateStudent(student.id, formData);
            onSave();
        } catch (error) {
            console.error('Failed to update student', error);
            toast.error('Lỗi: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[95vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-white">Chỉnh sửa hồ sơ</h2>
                        <p className="text-xs text-white/80 mt-0.5">Cập nhật thông tin học viên</p>
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
                                    <option value="male">Nam</option>
                                    <option value="female">Nữ</option>
                                </select>
                            </div>
                            <FormField label="Nơi sinh" value={formData.noi_sinh} onChange={(v) => setFormData({ ...formData, noi_sinh: v })} />
                            <FormField label="Dân tộc" value={formData.dan_toc} onChange={(v) => setFormData({ ...formData, dan_toc: v })} />
                            <FormField label="Quốc tịch" value={formData.quoc_tich} onChange={(v) => setFormData({ ...formData, quoc_tich: v })} />
                        </div>
                    </div>

                    {/* Giấy tờ */}
                    <div>
                        <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Giấy tờ tùy thân</h3>
                        <div className="space-y-3">
                            <FormField label="Số CCCD/CMND" value={formData.cccd} onChange={(v) => setFormData({ ...formData, cccd: v })} disabled />
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
                            {/* Ảnh 3x4 */}
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-2">Ảnh thẻ 3x4</p>
                                <CCCDUploader
                                    type="photo_3x4"
                                    onUploadSuccess={handleImageUploadSuccess('portrait')}
                                    onUploadError={handleImageUploadError}
                                    existingImageUrl={imagePortrait}
                                />
                            </div>

                            {/* CCCD Images */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs font-medium text-slate-600 mb-2 text-center">CCCD MẶT TRƯỚC</p>
                                    <CCCDUploader
                                        type="cccd_front"
                                        onUploadSuccess={handleImageUploadSuccess('front')}
                                        onUploadError={handleImageUploadError}
                                        existingImageUrl={imageFront}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-600 mb-2 text-center">CCCD MẶT SAU</p>
                                    <CCCDUploader
                                        type="cccd_back"
                                        onUploadSuccess={handleImageUploadSuccess('back')}
                                        onUploadError={handleImageUploadError}
                                        existingImageUrl={imageBack}
                                    />
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
                                Lưu thay đổi
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
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
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('name');

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await api.getStudents(500, 0);
            const studentList = Array.isArray(res) ? res : (res?.data || res?.results || []);
            setStudents(studentList);
        } catch (error) {
            console.error("Failed to fetch students", error);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (student) => {
        setSelectedStudent(null);
        setEditingStudent(student);
    };

    const handleSaveEdit = async () => {
        await fetchStudents();
        setEditingStudent(null);
    };

    // Filter and sort logic
    let processedStudents = students.filter(s => {
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

    if (sortBy === ' name') {
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

    // Statistics
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.trang_thai === 'active' || s.is_active !== false).length;
    const debtStudents = students.filter(s => s.cong_no > 0 || s.payment_status === 'pending').length;

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        setLoading(true);
        await fetchStudents();
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50">
            {/* Stats Dashboard */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 pt-4 pb-6">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-4 border border-white/30">
                        <p className="text-xs text-white/80 font-medium mb-1">Total HV</p>
                        <p className="text-2xl font-bold text-white">{totalStudents}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-4 border border-white/30">
                        <p className="text-xs text-white/80 font-medium mb-1">Đang học</p>
                        <p className="text-2xl font-bold text-white">{activeStudents}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-4 border border-white/30">
                        <p className="text-xs text-white/80 font-medium mb-1">Công nợ</p>
                        <p className="text-2xl font-bold text-white">{debtStudents}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="px-4 py-4 bg-white shadow-sm">
                <div className="flex gap-2 mb-3">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, SĐT, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                    >
                        <Filter size={18} />
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Trạng thái</label>
                            <div className="flex gap-2 flex-wrap">
                                {['all', 'active', 'inactive', 'debt'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === status
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-slate-600 border border-slate-200'
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
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 block">Sắp xếp</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
                            >
                                <option value="name">Tên A-Z</option>
                                <option value="recent">Mới nhất</option>
                            </select>
                        </div>
                    </div>
                )}

                <p className="text-xs text-slate-500 font-medium mt-2">
                    Hiển thị {processedStudents.length} / {students.length} học viên
                </p>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-blue-600 border-t-transparent"></div>
                        <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : processedStudents.length > 0 ? (
                    <div className="space-y-3">
                        {processedStudents.map(s => (
                            <StudentCard
                                key={s.id || s.cccd}
                                student={s}
                                onClick={setSelectedStudent}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <User size={64} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Không tìm thấy học viên</p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-sm text-blue-600 font-medium"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>

            {selectedStudent && (
                <StudentDetailSheet
                    student={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    onEdit={handleEdit}
                />
            )}

            {editingStudent && (
                <StudentEditModal
                    student={editingStudent}
                    onClose={() => setEditingStudent(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
    </PullToRefreshWrapper>
    );
}
