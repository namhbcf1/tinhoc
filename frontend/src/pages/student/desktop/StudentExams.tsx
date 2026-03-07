import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    Calendar, Clock, MapPin, X, AlertCircle, CheckCircle,
    GraduationCap, Video, ChevronRight, Zap, RefreshCw, BookOpen
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN, formatTime } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getDaysUntil = (examDate) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(examDate); d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / 86400000);
};

const getDateTheme = (examDate) => {
    const days = getDaysUntil(examDate);
    if (days === 0) return { bg: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Hôm nay', urgent: true };
    if (days > 0 && days <= 3) return { bg: 'from-red-500 to-rose-500', badge: 'bg-red-100 text-red-700 border-red-200', label: `${days} ngày nữa`, urgent: true };
    if (days > 0 && days <= 7) return { bg: 'from-amber-500 to-orange-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: `${days} ngày nữa`, urgent: false };
    if (days > 0) return { bg: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-700 border-violet-200', label: `${days} ngày nữa`, urgent: false };
    return { bg: 'from-slate-400 to-slate-500', badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Đã qua', urgent: false };
};

const getRegBadge = (status) => {
    if (status === 'approved' || status === 'registered') return { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '✓ Đã duyệt', icon: CheckCircle };
    if (status === 'completed') return { cls: 'bg-blue-100 text-blue-700 border-blue-200', label: '✓ Hoàn thành', icon: CheckCircle };
    if (status === 'pending') return { cls: 'bg-amber-100 text-amber-700 border-amber-200', label: '⏳ Chờ duyệt', icon: AlertCircle };
    return null;
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden animate-pulse">
        <div className="h-1.5 bg-slate-200" />
        <div className="p-5">
            <div className="flex gap-4 mb-4">
                <div className="w-16 h-20 bg-slate-100 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                    <div className="h-5 bg-slate-100 rounded-full w-4/5" />
                    <div className="h-4 bg-slate-100 rounded-full w-2/5" />
                    <div className="h-4 bg-slate-100 rounded-full w-3/5" />
                </div>
            </div>
            <div className="space-y-2 mb-4">
                <div className="h-4 bg-slate-100 rounded-full w-1/2" />
                <div className="h-4 bg-slate-100 rounded-full w-2/5" />
            </div>
            <div className="h-10 bg-slate-100 rounded-2xl" />
        </div>
    </div>
);

// ─── Exam Card ────────────────────────────────────────────────────────────────
const ExamCard = ({ exam, onClick, onRegister, onCancel, loading }) => {
    const title = exam.exam_name || exam.title || 'Chưa có tên';
    const examDate = exam.exam_date || new Date();
    const room = exam.location || exam.room || 'Chưa có phòng';
    const dateObj = new Date(examDate);
    const isPast = getDaysUntil(examDate) < 0;
    const days = getDaysUntil(examDate);
    const status = exam.registration_status || exam.trang_thai || null;
    const theme = getDateTheme(examDate);
    const badge = getRegBadge(status);
    // Zoom badge chỉ hiện khi đã được duyệt
    const isApproved = status === 'approved' || status === 'registered';
    const isZoom = !!exam.zoom_link && isApproved;

    return (
        <div
            className="anim-fade-up bg-white rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 overflow-hidden flex flex-col cursor-pointer group transition-all duration-300 hover:-translate-y-1.5"
            onClick={() => onClick(exam)}
            style={{ opacity: 1 }}
        >
            {/* Color accent bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${theme.bg}`} />

            <div className="p-5 flex-1 flex flex-col">
                {/* Header row */}
                <div className="flex gap-4 mb-4">
                    {/* Calendar widget */}
                    <div className={`flex-shrink-0 w-16 rounded-2xl bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center py-3 shadow-md`}>
                        <span className="text-white text-[10px] font-black uppercase tracking-wide opacity-80">
                            {dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}
                        </span>
                        <span className="text-white text-3xl font-black leading-none my-1 tracking-tight">
                            {dateObj.getDate()}
                        </span>
                        <span className="text-white text-[10px] font-bold opacity-80">
                            Th {dateObj.getMonth() + 1}
                        </span>
                    </div>

                    {/* Title + badges */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-black text-base text-slate-800 leading-snug line-clamp-2 mb-2.5 group-hover:text-violet-700 transition-colors tracking-tight">
                            {title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {/* Countdown badge */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${theme.badge}`}>
                                {theme.urgent && !isPast && <Zap size={10} strokeWidth={3} />}
                                {theme.label}
                            </span>
                            {badge && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border ${badge.cls}`}>
                                    {badge.label}
                                </span>
                            )}
                            {isZoom && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                                    <Video size={10} /> Online
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detail rows */}
                <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2.5 text-sm text-slate-500">
                        <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                            <Clock size={13} className="text-slate-400" />
                        </div>
                        <span>{formatTime(examDate)} • {exam.duration_minutes || 120} phút</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-slate-500">
                        <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                            <MapPin size={13} className="text-slate-400" />
                        </div>
                        <span className="truncate">{room}</span>
                    </div>
                    {exam.class_name && (
                        <div className="flex items-center gap-2.5 text-sm text-slate-500">
                            <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                                <BookOpen size={13} className="text-slate-400" />
                            </div>
                            <span className="truncate">{exam.class_name}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isPast ? (
                    <div className="mt-auto pt-3 border-t border-slate-100">
                        {status === 'pending' ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl">
                                    <span>⏳</span> Đang chờ duyệt
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCancel(exam); }}
                                    disabled={loading}
                                    className="w-full py-2 text-xs font-black text-red-500 border border-red-200 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Hủy đăng ký
                                </button>
                            </div>
                        ) : (status === 'approved' || status === 'registered') ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(exam); }}
                                disabled={loading}
                                className="w-full py-2.5 text-sm font-black text-red-500 border border-red-200 hover:bg-red-50 rounded-2xl transition-colors disabled:opacity-50"
                            >
                                Hủy đăng ký
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRegister(exam); }}
                                disabled={loading}
                                className="w-full py-2.5 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-2xl transition-all shadow-md shadow-violet-100 disabled:opacity-50 hover:shadow-violet-200"
                            >
                                Đăng ký thi
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="mt-auto pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-center gap-2 py-2 text-xs font-black text-slate-400">
                            <CheckCircle size={14} /> Kỳ thi đã kết thúc
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Exam Detail Modal ────────────────────────────────────────────────────────
const ExamDetailModal = ({ exam, onClose, onRegister, onCancel, loading }) => {
    const dateObj = new Date(exam.exam_date);
    const status = exam.registration_status || exam.trang_thai || null;
    const isPast = getDaysUntil(exam.exam_date) < 0;
    const theme = getDateTheme(exam.exam_date);
    const days = getDaysUntil(exam.exam_date);
    // Zoom chỉ hiện khi đã được duyệt
    const isApproved = status === 'approved' || status === 'registered';
    const hasZoom = !!exam.zoom_link && isApproved;

    const statusConfig = () => {
        if (status === 'approved' || status === 'registered')
            return { icon: <CheckCircle size={20} className="text-emerald-500" />, label: 'Đã duyệt', desc: 'Bạn đã được xác nhận tham gia kỳ thi', cls: 'bg-emerald-50 border-emerald-200' };
        if (status === 'pending')
            return { icon: <AlertCircle size={20} className="text-amber-500" />, label: 'Chờ duyệt', desc: 'Đang chờ xác nhận từ giáo vụ', cls: 'bg-amber-50 border-amber-200' };
        if (status === 'completed')
            return { icon: <CheckCircle size={20} className="text-blue-500" />, label: 'Hoàn thành', desc: 'Kỳ thi đã hoàn tất', cls: 'bg-blue-50 border-blue-200' };
        return { icon: <AlertCircle size={20} className="text-slate-400" />, label: 'Chưa đăng ký', desc: 'Bấm "Đăng ký thi" để đăng ký tham gia', cls: 'bg-slate-50 border-slate-200' };
    };
    const sc = statusConfig();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl bg-white"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={`bg-gradient-to-br ${theme.bg} p-6 relative overflow-hidden`}>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            {/* Big calendar date */}
                            <div className="flex-shrink-0 w-18 rounded-2xl bg-white/20 border border-white/30 flex flex-col items-center justify-center py-3 px-4 shadow-lg">
                                <span className="text-white text-[10px] font-black uppercase tracking-wide opacity-80">
                                    {dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}
                                </span>
                                <span className="text-white text-4xl font-black leading-none tracking-tight my-1">{dateObj.getDate()}</span>
                                <span className="text-white/80 text-xs font-bold">Th {dateObj.getMonth() + 1}/{dateObj.getFullYear()}</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white leading-snug mb-2 tracking-tight">
                                    {exam.exam_name || 'Kỳ thi'}
                                </h2>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/80 text-xs font-semibold">
                                    <span className="flex items-center gap-1.5"><Clock size={12} /> {formatTime(exam.exam_date)}</span>
                                    {exam.location && <span className="flex items-center gap-1.5"><MapPin size={12} /> {exam.location}</span>}
                                    {!isPast && <span className="flex items-center gap-1.5 font-black text-white"><Zap size={12} /> {days === 0 ? 'Hôm nay!' : `${days} ngày nữa`}</span>}
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white flex-shrink-0 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                    {/* Status banner */}
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border ${sc.cls}`}>
                        {sc.icon}
                        <div>
                            <p className="font-black text-slate-800 text-sm">{sc.label}</p>
                            <p className="text-xs text-slate-500">{sc.desc}</p>
                        </div>
                    </div>

                    {/* Exam info */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Thông tin kỳ thi</h3>
                        <div className="space-y-3">
                            {[
                                { icon: <Clock size={15} />, label: 'Thời gian thi', value: `${formatTime(exam.exam_date)} — ${exam.duration_minutes || 120} phút` },
                                { icon: <Calendar size={15} />, label: 'Ngày thi', value: formatDateVN(exam.exam_date) },
                                { icon: <MapPin size={15} />, label: 'Địa điểm', value: exam.location || 'Chưa cập nhật' },
                                ...(exam.exam_type ? [{ icon: <GraduationCap size={15} />, label: 'Loại thi', value: exam.exam_type }] : []),
                                ...(exam.class_name ? [{ icon: <BookOpen size={15} />, label: 'Lớp', value: exam.class_name }] : []),
                            ].map(({ icon, label, value }) => (
                                <div key={label} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm flex-shrink-0">{icon}<span>{label}</span></div>
                                    <span className="font-bold text-slate-800 text-sm text-right">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    {exam.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <h3 className="font-black text-amber-900 text-sm mb-2 flex items-center gap-2">
                                <AlertCircle size={16} /> Lưu ý quan trọng
                            </h3>
                            <p className="text-sm text-amber-800 leading-relaxed">{exam.notes}</p>
                        </div>
                    )}

                    {/* Zoom link — chỉ hiện khi đã được duyệt */}
                    {hasZoom && (
                        <div className="rounded-2xl overflow-hidden border border-blue-200">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Video size={18} className="text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm leading-none">Zoom Meeting</p>
                                    <p className="text-blue-200 text-xs mt-0.5">Phòng thi trực tuyến</p>
                                </div>
                            </div>
                            {/* Info */}
                            <div className="bg-white px-5 py-4 space-y-3">
                                {exam.zoom_meeting_id && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Meeting ID</span>
                                        <span className="font-black text-slate-800 tracking-wider">{exam.zoom_meeting_id}</span>
                                    </div>
                                )}
                                {exam.zoom_passcode && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Passcode</span>
                                        <span className="font-black text-slate-800 tracking-wider">{exam.zoom_passcode}</span>
                                    </div>
                                )}
                                <a href={exam.zoom_link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-xl hover:opacity-90 transition-opacity text-sm shadow-md shadow-blue-100">
                                    <Video size={16} /> Vào phòng thi ngay
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Hint khi có zoom nhưng chưa approved */}
                    {!!exam.zoom_link && !isApproved && !isPast && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                            <Video size={16} className="text-blue-400 flex-shrink-0" />
                            <p className="text-sm text-blue-600">Link phòng thi online sẽ hiển thị sau khi đăng ký được duyệt.</p>
                        </div>
                    )}
                </div>

                {/* Action footer */}
                {!isPast && (
                    <div className="p-5 border-t border-slate-100 bg-white">
                        {status === 'pending' ? (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-center gap-2 py-3 text-sm font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl">
                                    <span>⏳</span> Đang chờ duyệt đăng ký
                                </div>
                                <button onClick={() => onCancel(exam)} disabled={loading}
                                    className="w-full py-3 text-sm font-black text-red-500 border border-red-200 hover:bg-red-50 rounded-2xl transition-colors disabled:opacity-50">
                                    Hủy đăng ký
                                </button>
                            </div>
                        ) : isApproved ? (
                            <div className="space-y-2.5">
                                {hasZoom && (
                                    <a href={exam.zoom_link} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-2xl hover:opacity-90 transition-opacity text-sm shadow-md shadow-blue-100">
                                        <Video size={17} /> Vào phòng thi
                                    </a>
                                )}
                                <button onClick={() => onCancel(exam)} disabled={loading}
                                    className="w-full py-3 text-sm font-black text-red-400 border border-red-200 hover:bg-red-50 rounded-2xl transition-colors disabled:opacity-50">
                                    Hủy đăng ký
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => onRegister(exam)} disabled={loading}
                                className="w-full py-3 text-sm font-black text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-2xl transition-all shadow-lg shadow-violet-100 disabled:opacity-50">
                                {loading ? 'Đang xử lý...' : 'Đăng ký thi'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentExams({ studentData }) {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [filter, setFilter] = useState('upcoming');
    const [selectedExam, setSelectedExam] = useState(null);
    const { success, error } = useToast();
    const containerRef = useRef(null);

    useGSAP(() => {
        gsap.fromTo('.anim-fade-up',
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' }
        );
        // Fallback ensure visible
        setTimeout(() => document.querySelectorAll('.anim-fade-up').forEach(el => { el.style.opacity = '1'; }), 800);
    }, { scope: containerRef, dependencies: [exams, filter] });

    useEffect(() => { fetchExams(); }, []);

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
        } catch (err) {
            console.error('Failed to fetch exams', err);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (exam) => {
        setActionLoading(true);
        try {
            await api.registerExam(exam.id);
            success('Đăng ký thành công! Vui lòng chờ xác nhận.');
            await fetchExams();
            setSelectedExam(null);
        } catch (err) { error('Lỗi đăng ký: ' + (err.message || 'Unknown error')); }
        finally { setActionLoading(false); }
    };

    const handleCancel = async (exam) => {
        setActionLoading(true);
        try {
            await api.cancelExam(exam.id);
            success('Đã hủy đăng ký thành công.');
            await fetchExams();
            setSelectedExam(null);
        } catch (err) { error('Lỗi hủy đăng ký: ' + (err.message || 'Unknown error')); }
        finally { setActionLoading(false); }
    };

    // Filtering
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

    const filterTabs = [
        { id: 'upcoming', label: 'Sắp tới', count: upcomingExams },
        { id: 'all', label: 'Tất cả', count: totalExams },
        { id: 'past', label: 'Đã qua', count: exams.length - upcomingExams },
    ];

    return (
        <div className="space-y-6" ref={containerRef}>

            {/* ── Hero Banner ── */}
            <div className="anim-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-purple-700 to-pink-700 p-7 shadow-2xl" style={{ opacity: 1 }}>
                <div className="absolute -top-14 -right-14 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 left-10 w-40 h-40 bg-pink-500/15 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-lg">
                                <Calendar size={26} className="text-white" strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-0.5">Quản lý</p>
                                <h1 className="text-3xl font-black text-white tracking-tight leading-none">Lịch thi</h1>
                                <p className="text-white/60 text-sm mt-1">Xem lịch và đăng ký kỳ thi của bạn</p>
                            </div>
                        </div>
                        {/* Stat pills */}
                        <div className="flex gap-3 flex-shrink-0">
                            <div className="bg-white/15 border border-white/25 rounded-2xl px-4 py-3 text-center">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-0.5">Sắp tới</p>
                                <p className="text-white text-2xl font-black leading-none">{loading ? '—' : upcomingExams}</p>
                            </div>
                            <div className="bg-white/15 border border-white/25 rounded-2xl px-4 py-3 text-center">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-0.5">Đã ĐK</p>
                                <p className="text-white text-2xl font-black leading-none">{loading ? '—' : registeredExams}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {filterTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black transition-all duration-200 border ${filter === tab.id
                                        ? 'bg-white text-violet-700 border-white shadow-lg'
                                        : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
                                    }`}
                            >
                                {tab.label}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${filter === tab.id ? 'bg-violet-100 text-violet-700' : 'bg-white/20 text-white'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                        <button
                            onClick={fetchExams}
                            className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/20 transition-colors"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Exam Grid ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </div>
            ) : filteredExams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div className="anim-fade-up flex flex-col items-center justify-center py-24 gap-5" style={{ opacity: 1 }}>
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 flex items-center justify-center">
                        <Calendar size={40} className="text-violet-300" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-slate-700 font-black text-xl mb-2">
                            {filter === 'past' ? 'Không có kỳ thi đã qua' :
                                filter === 'upcoming' ? 'Chưa có kỳ thi sắp tới' :
                                    'Chưa có kỳ thi nào'}
                        </h3>
                        <p className="text-slate-400 text-sm">Các kỳ thi sẽ hiển thị tại đây sau khi được cập nhật</p>
                    </div>
                </div>
            )}

            {/* ── Detail Modal ── */}
            {selectedExam && (
                <ExamDetailModal
                    exam={selectedExam}
                    onClose={() => setSelectedExam(null)}
                    onRegister={handleRegister}
                    onCancel={handleCancel}
                    loading={actionLoading}
                />
            )}
        </div>
    );
}
