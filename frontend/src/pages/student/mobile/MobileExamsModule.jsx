import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, X, AlertCircle, CheckCircle, Zap, Video, BookOpen, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN, formatTime } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDaysUntil = (examDate) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(examDate); d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / 86400000);
};

const getDateTheme = (examDate) => {
    const days = getDaysUntil(examDate);
    if (days === 0) return { bg: 'from-emerald-500 to-teal-500', calBg: 'bg-gradient-to-br from-emerald-500 to-teal-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Hôm nay', urgent: true };
    if (days > 0 && days <= 3) return { bg: 'from-red-500 to-rose-500', calBg: 'bg-gradient-to-br from-red-500 to-rose-500', badge: 'bg-red-100 text-red-700 border-red-200', label: `${days} ngày nữa`, urgent: true };
    if (days > 0 && days <= 7) return { bg: 'from-amber-500 to-orange-500', calBg: 'bg-gradient-to-br from-amber-500 to-orange-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: `${days} ngày nữa`, urgent: false };
    if (days > 0) return { bg: 'from-violet-600 to-purple-700', calBg: 'bg-gradient-to-br from-violet-600 to-purple-700', badge: 'bg-violet-100 text-violet-700 border-violet-200', label: `${days} ngày nữa`, urgent: false };
    return { bg: 'from-slate-400 to-slate-500', calBg: 'bg-gradient-to-br from-slate-400 to-slate-500', badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Đã qua', urgent: false };
};

// ─── Exam Card ────────────────────────────────────────────────────────────────
const ExamCard = ({ exam, onClick, onRegister, onCancel, loading }) => {
    const title = exam.exam_name || exam.title || 'Chưa có tên';
    const examDate = exam.exam_date || new Date();
    const room = exam.location || exam.room || 'Chưa có phòng';
    const dateObj = new Date(examDate);
    const days = getDaysUntil(examDate);
    const isPast = days < 0;
    const status = exam.registration_status || exam.trang_thai || null;
    const theme = getDateTheme(examDate);
    // Zoom badge chỉ hiện khi đã được duyệt
    const isApproved = status === 'approved' || status === 'registered';
    const isZoom = !!exam.zoom_link && isApproved;

    const regBadge = () => {
        if (status === 'approved' || status === 'registered') return { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '✓ Đã duyệt' };
        if (status === 'pending') return { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: '⏳ Chờ duyệt' };
        if (status === 'completed') return { cls: 'bg-blue-100 text-blue-700 border-blue-200', label: '✓ Hoàn thành' };
        return null;
    };
    const badge = regBadge();

    return (
        <div
            className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm active:scale-[0.97] transition-all duration-200"
            onClick={() => onClick(exam)}
        >
            {/* Color top bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${theme.bg}`} />

            <div className="p-4">
                {/* Header */}
                <div className="flex gap-3.5 mb-3">
                    {/* Calendar widget */}
                    <div className={`${theme.calBg} flex-shrink-0 w-14 rounded-2xl flex flex-col items-center justify-center py-3 shadow-md`}>
                        <span className="text-white text-[9px] font-black uppercase opacity-80">
                            {dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}
                        </span>
                        <span className="text-white text-2xl font-black leading-none my-0.5">{dateObj.getDate()}</span>
                        <span className="text-white text-[9px] font-black opacity-80">Th{dateObj.getMonth() + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-800 text-sm leading-snug line-clamp-2 mb-2">{title}</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {/* Countdown badge */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border ${theme.badge}`}>
                                {theme.urgent && !isPast && <Zap size={9} strokeWidth={3} />}
                                {theme.label}
                            </span>
                            {badge && (
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${badge.cls}`}>{badge.label}</span>
                            )}
                            {isZoom && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                                    <Video size={9} /> Online
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={12} className="text-slate-400 flex-shrink-0" />
                        <span>{formatTime(examDate)} • {exam.duration_minutes || 120} phút</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{room}</span>
                    </div>
                    {exam.class_name && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <BookOpen size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{exam.class_name}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isPast && (
                    <div className="pt-3 border-t border-slate-100">
                        {status === 'pending' ? (
                            <div className="space-y-2">
                                <div className="py-2.5 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-xl text-center">⏳ Đang chờ duyệt</div>
                                <button onClick={(e) => { e.stopPropagation(); onCancel(exam); }} disabled={loading}
                                    className="w-full py-2 text-xs font-black text-red-500 border border-red-200 rounded-xl active:bg-red-50 disabled:opacity-50">
                                    Hủy đăng ký
                                </button>
                            </div>
                        ) : (status === 'approved' || status === 'registered') ? (
                            <button onClick={(e) => { e.stopPropagation(); onCancel(exam); }} disabled={loading}
                                className="w-full py-2.5 text-xs font-black text-red-500 border border-red-200 rounded-xl active:bg-red-50 disabled:opacity-50">
                                Hủy đăng ký
                            </button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); onRegister(exam); }} disabled={loading}
                                className="w-full py-2.5 text-xs font-black text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl shadow-md shadow-violet-100 active:opacity-80 disabled:opacity-50">
                                Đăng ký thi
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Detail Bottom Sheet ───────────────────────────────────────────────────────
const ExamDetailSheet = ({ exam, onClose, onRegister, onCancel, loading }) => {
    const dateObj = new Date(exam.exam_date);
    const status = exam.registration_status || exam.trang_thai || null;
    const isPast = getDaysUntil(exam.exam_date) < 0;
    const theme = getDateTheme(exam.exam_date);
    const days = getDaysUntil(exam.exam_date);
    // Zoom chỉ hiện khi đã được duyệt
    const isApproved = status === 'approved' || status === 'registered';
    const hasZoom = !!exam.zoom_link && isApproved;

    const statusCfg = () => {
        if (status === 'approved' || status === 'registered') return { icon: <CheckCircle size={20} className="text-emerald-500" />, label: 'Đã duyệt', desc: 'Bạn đã được xác nhận tham gia', cls: 'bg-emerald-50 border-emerald-200' };
        if (status === 'pending') return { icon: <AlertCircle size={20} className="text-amber-500" />, label: 'Chờ duyệt', desc: 'Đang chờ xác nhận từ giáo vụ', cls: 'bg-amber-50 border-amber-200' };
        if (status === 'completed') return { icon: <CheckCircle size={20} className="text-blue-500" />, label: 'Hoàn thành', desc: 'Kỳ thi đã kết thúc', cls: 'bg-blue-50 border-blue-200' };
        return { icon: <AlertCircle size={20} className="text-slate-400" />, label: 'Chưa đăng ký', desc: 'Bấm nút bên dưới để đăng ký', cls: 'bg-slate-50 border-slate-200' };
    };
    const sc = statusCfg();

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-h-[92vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}>
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className={`bg-gradient-to-br ${theme.bg} px-5 pt-4 pb-5 relative overflow-hidden flex-shrink-0`}>
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                    <button onClick={onClose} className="absolute top-3 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm">
                        <X size={18} className="text-white" />
                    </button>
                    <div className="flex items-start gap-4 relative z-10">
                        {/* Calendar date */}
                        <div className="flex-shrink-0 bg-white/20 border border-white/30 rounded-2xl px-3 py-2.5 flex flex-col items-center shadow-md min-w-[52px]">
                            <span className="text-white/80 text-[9px] font-black">{dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                            <span className="text-white text-3xl font-black leading-none my-0.5">{dateObj.getDate()}</span>
                            <span className="text-white/80 text-[9px] font-black">Th{dateObj.getMonth() + 1}/{dateObj.getFullYear()}</span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h2 className="text-white font-black text-base leading-snug mb-2 pr-8">{exam.exam_name || 'Kỳ thi'}</h2>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80 text-xs font-semibold">
                                <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(exam.exam_date)}</span>
                                {exam.location && <span className="flex items-center gap-1"><MapPin size={11} /> {exam.location}</span>}
                                {!isPast && <span className="flex items-center gap-1 font-black text-white"><Zap size={11} /> {days === 0 ? 'Hôm nay!' : `${days} ngày nữa`}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
                    {/* Status */}
                    <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${sc.cls}`}>
                        {sc.icon}
                        <div>
                            <p className="font-black text-slate-800 text-sm">{sc.label}</p>
                            <p className="text-xs text-slate-500">{sc.desc}</p>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Thông tin kỳ thi</p>
                        <div className="space-y-2.5">
                            {[
                                { icon: <Clock size={14} />, label: 'Giờ thi', value: formatTime(exam.exam_date) },
                                { icon: <Calendar size={14} />, label: 'Ngày thi', value: formatDateVN(exam.exam_date) },
                                { icon: <Clock size={14} />, label: 'Thời gian', value: `${exam.duration_minutes || 120} phút` },
                                { icon: <MapPin size={14} />, label: 'Địa điểm', value: exam.location || 'Chưa cập nhật' },
                                ...(exam.class_name ? [{ icon: <BookOpen size={14} />, label: 'Lớp', value: exam.class_name }] : []),
                                ...(exam.exam_type ? [{ icon: <AlertCircle size={14} />, label: 'Loại thi', value: exam.exam_type }] : []),
                            ].map(({ icon, label, value }) => (
                                <div key={label} className="flex items-center justify-between text-sm gap-3">
                                    <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">{icon}<span>{label}</span></div>
                                    <span className="font-bold text-slate-800 text-right">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    {exam.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <p className="font-black text-amber-800 text-xs mb-2 flex items-center gap-1.5"><AlertCircle size={14} />Lưu ý</p>
                            <p className="text-amber-700 text-sm leading-relaxed">{exam.notes}</p>
                        </div>
                    )}

                    {/* Zoom — chỉ hiện khi đã được duyệt */}
                    {hasZoom && (
                        <div className="rounded-2xl overflow-hidden border border-blue-200">
                            {/* Header bar */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Video size={16} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm leading-none">Zoom Meeting</p>
                                    <p className="text-blue-200 text-[10px] mt-0.5">Thi trực tuyến</p>
                                </div>
                            </div>
                            {/* Info + button */}
                            <div className="bg-white p-4 space-y-3">
                                {exam.zoom_meeting_id && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Meeting ID</span>
                                        <span className="font-black text-slate-800 text-sm tracking-wider">{exam.zoom_meeting_id}</span>
                                    </div>
                                )}
                                {exam.zoom_passcode && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Passcode</span>
                                        <span className="font-black text-slate-800 text-sm tracking-wider">{exam.zoom_passcode}</span>
                                    </div>
                                )}
                                <a
                                    href={exam.zoom_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl text-sm active:opacity-80 transition-opacity shadow-md shadow-blue-100"
                                >
                                    <Video size={16} />
                                    Vào phòng thi ngay
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Hint khi có zoom nhưng chưa approved */}
                    {!!exam.zoom_link && !isApproved && !isPast && (
                        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
                            <Video size={16} className="text-blue-400 flex-shrink-0" />
                            <p className="text-xs text-blue-600">Link phòng thi online sẽ hiển thị sau khi đăng ký được duyệt</p>
                        </div>
                    )}
                </div>

                {/* Action footer — safe area bottom */}
                {!isPast && (
                    <div className="p-4 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-slate-100 bg-white flex-shrink-0">
                        {status === 'pending' ? (
                            <div className="space-y-2.5">
                                <div className="py-3 text-sm font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                                    ⏳ Đang chờ duyệt
                                </div>
                                <button onClick={() => onCancel(exam)} disabled={loading}
                                    className="w-full py-3.5 text-sm font-black text-red-500 border border-red-200 rounded-2xl active:bg-red-50 disabled:opacity-50">
                                    Hủy đăng ký
                                </button>
                            </div>
                        ) : isApproved ? (
                            <div className="space-y-2.5">
                                {/* Nút Zoom to ngay trong footer nếu có */}
                                {hasZoom && (
                                    <a
                                        href={exam.zoom_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl text-sm active:opacity-80 shadow-md shadow-blue-100"
                                    >
                                        <Video size={17} />
                                        Vào phòng thi
                                    </a>
                                )}
                                <button onClick={() => onCancel(exam)} disabled={loading}
                                    className="w-full py-3 text-sm font-black text-red-400 border border-red-200 rounded-2xl active:bg-red-50 disabled:opacity-50">
                                    Hủy đăng ký
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => onRegister(exam)} disabled={loading}
                                className="w-full py-3.5 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-lg shadow-violet-100 active:opacity-80 disabled:opacity-50">
                                {loading ? 'Đang xử lý...' : 'Đăng ký thi'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Mobile Component ────────────────────────────────────────────────────
export default function MobileExamsModule({ studentData }) {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [filter, setFilter] = useState('upcoming');
    const [selectedExam, setSelectedExam] = useState(null);
    const [confirmState, setConfirmState] = useState({ open: false, type: null, exam: null });

    const toast = useToast();

    useEffect(() => { fetchExams(); }, []);

    const handleRefresh = async () => {
        setLoading(true);
        await fetchExams();
    };

    const fetchExams = async () => {
        setLoading(true);
        try {
            const response = await api.getStudentExams();
            if (response?.success && Array.isArray(response.data)) {
                const sorted = response.data.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
                setExams(sorted);
            } else {
                setExams([]);
            }
        } catch (error) {
            console.error('Failed to fetch exams', error);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = (exam) => {
        setConfirmState({ open: true, type: 'register', exam });
    };

    const confirmRegister = async () => {
        const exam = confirmState.exam;
        setActionLoading(true);
        try {
            await api.registerExam(exam.id);
            toast.success('Đăng ký thành công! Vui lòng chờ xác nhận.');
            await fetchExams();
            setSelectedExam(null);
        } catch (error) {
            toast.error('Lỗi đăng ký: ' + (error.message || 'Unknown error'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = (exam) => {
        setConfirmState({ open: true, type: 'cancel', exam });
    };

    const confirmCancel = async () => {
        const exam = confirmState.exam;
        setActionLoading(true);
        try {
            await api.cancelExam(exam.id);
            toast.success('Đã hủy đăng ký thành công.');
            await fetchExams();
            setSelectedExam(null);
        } catch (error) {
            toast.error('Lỗi hủy đăng ký: ' + (error.message || 'Unknown error'));
        } finally {
            setActionLoading(false);
        }
    };

    const now = new Date(); now.setHours(0, 0, 0, 0);
    const filteredExams = exams.filter(e => {
        const d = new Date(e.exam_date); d.setHours(0, 0, 0, 0);
        if (filter === 'upcoming') return d >= now;
        if (filter === 'past') return d < now;
        return true;
    });

    const totalExams = exams.length;
    const upcomingExams = exams.filter(e => { const d = new Date(e.exam_date); d.setHours(0, 0, 0, 0); return d >= now; }).length;
    const registeredExams = exams.filter(e => ['approved', 'registered', 'pending'].includes(e.registration_status)).length;

    const handleConfirmAction = confirmState.type === 'register' ? confirmRegister : confirmCancel;
    const confirmMsg = confirmState.type === 'register'
        ? 'Bạn sẽ đăng ký tham gia kỳ thi này. Tiếp tục?'
        : 'Bạn sẽ hủy đăng ký kỳ thi này. Tiếp tục?';
    const confirmTitle = confirmState.type === 'register' ? 'Đăng ký kỳ thi' : 'Hủy đăng ký';

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50 pb-28">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-purple-700 to-pink-700 px-5 pt-6 pb-8">
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-10 left-4 w-32 h-32 rounded-full bg-pink-500/10 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">
                                <Calendar size={24} className="text-white" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Lịch thi & Đăng ký</p>
                                <h1 className="text-white font-black text-xl tracking-tight">Lịch thi</h1>
                            </div>
                        </div>
                        <button onClick={fetchExams} className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center active:scale-90 transition-transform">
                            <RefreshCw size={16} className={`text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { label: 'Tổng', value: loading ? '...' : totalExams },
                            { label: 'Sắp tới', value: loading ? '...' : upcomingExams },
                            { label: 'Đã ĐK', value: loading ? '...' : registeredExams },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white/15 border border-white/25 rounded-2xl px-3 py-2.5 text-center">
                                <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-1">{label}</p>
                                <p className="text-white font-black text-xl leading-none">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-2">
                        {[
                            { key: 'upcoming', label: 'Sắp tới', count: upcomingExams },
                            { key: 'all', label: 'Tất cả', count: totalExams },
                            { key: 'past', label: 'Đã qua', count: totalExams - upcomingExams },
                        ].map(({ key, label, count }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black border transition-all active:scale-95 ${filter === key ? 'bg-white text-violet-700 border-white shadow-md' : 'bg-white/15 text-white border-white/25'
                                    }`}
                            >
                                {label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${filter === key ? 'bg-violet-100 text-violet-700' : 'bg-white/20 text-white'}`}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-pulse">
                                <div className="h-1.5 bg-slate-200" />
                                <div className="p-4">
                                    <div className="flex gap-3.5 mb-3">
                                        <div className="w-14 h-18 bg-slate-100 rounded-2xl flex-shrink-0" style={{ height: '68px' }} />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 rounded-full w-4/5" />
                                            <div className="h-3 bg-slate-100 rounded-full w-2/5" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                                        <div className="h-3 bg-slate-100 rounded-full w-2/5" />
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="h-9 bg-slate-100 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredExams.length > 0 ? (
                    <div className="space-y-3">
                        {filteredExams.map((e) => (
                            <ExamCard
                                key={e.id} exam={e}
                                onClick={setSelectedExam}
                                onRegister={handleRegister}
                                onCancel={handleCancel}
                                loading={actionLoading}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center mb-5">
                            <Calendar size={40} className="text-violet-300" strokeWidth={1.5} />
                        </div>
                        <h3 className="font-black text-slate-800 text-lg mb-2">
                            {filter === 'past' ? 'Không có kỳ thi đã qua' :
                                filter === 'upcoming' ? 'Chưa có kỳ thi sắp tới' :
                                    'Chưa có kỳ thi nào'}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {filter === 'upcoming' ? 'Các lịch thi mới sẽ được cập nhật sớm' : 'Chưa có dữ liệu phù hợp'}
                        </p>
                    </div>
                )}
            </div>

            {selectedExam && (
                <ExamDetailSheet
                    exam={selectedExam}
                    onClose={() => setSelectedExam(null)}
                    onRegister={handleRegister}
                    onCancel={handleCancel}
                    loading={actionLoading}
                />
            )}

            <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

            <ConfirmDialog
                isOpen={confirmState.open}
                onClose={() => setConfirmState({ open: false, type: null, exam: null })}
                onConfirm={handleConfirmAction}
                title={confirmTitle}
                message={confirmMsg}
                confirmText={confirmState.type === 'register' ? 'Đăng ký' : 'Hủy đăng ký'}
                cancelText="Bỏ qua"
                type={confirmState.type === 'register' ? 'info' : 'danger'}
            />
        </div>
        </PullToRefreshWrapper>
    );
}
