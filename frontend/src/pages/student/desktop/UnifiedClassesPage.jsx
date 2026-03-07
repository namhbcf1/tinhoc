import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    BookOpen,
    Calendar,
    Clock,
    MapPin,
    Search,
    Filter,
    X,
    PlayCircle,
    CheckCircle2,
    TrendingUp,
    Users,
    Award,
    ChevronRight,
    Video,
    FileText,
    Download,
    DollarSign,
    ArrowRight,
    GraduationCap,
    Plus,
    RefreshCw,
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/ToastContainer';

// ============= TABS =============
const TABS = [
    { id: 'my-classes', label: 'Lớp của tôi', icon: BookOpen },
    { id: 'register', label: 'Đăng ký lớp', icon: Plus },
];

// ============= STATUS HELPERS =============
const getStatusConfig = (status) => {
    if (['completed', 'certified'].includes(status))
        return {
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            border: 'border-purple-200',
            label: 'Hoàn thành',
            gradientHeader: 'from-purple-500 to-indigo-500',
            dot: 'bg-purple-400',
        };
    if (['studying', 'approved', 'active'].includes(status))
        return {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            label: 'Đang học',
            gradientHeader: 'from-emerald-500 to-teal-500',
            dot: 'bg-emerald-400',
        };
    if (status === 'pending')
        return {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            label: 'Chờ duyệt',
            gradientHeader: 'from-amber-500 to-orange-500',
            dot: 'bg-amber-400',
        };
    return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        label: status,
        gradientHeader: 'from-slate-400 to-slate-500',
        dot: 'bg-slate-400',
    };
};

// ============= MY CLASS CARD =============
const MyClassCard = ({ cls, onClick }) => {
    const status = cls.registration?.status || 'pending';
    const isActive = ['studying', 'approved', 'active'].includes(status);
    const isCompleted = ['completed', 'certified'].includes(status);
    const isPending = status === 'pending';
    const cfg = getStatusConfig(status);

    const handleJoinClass = (e) => {
        e.stopPropagation();
        if (cls.meet_link) {
            window.open(cls.meet_link, '_blank', 'noopener,noreferrer');
        } else {
            alert('Chưa có link học trực tuyến. Vui lòng liên hệ giáo viên.');
        }
    };

    return (
        <div
            className="group bg-white rounded-[32px] border border-slate-200/60 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500 cursor-pointer overflow-hidden anim-fade-up flex flex-col h-full"
            onClick={() => onClick(cls)}
        >
            {/* Gradient Header */}
            <div className={`bg-gradient-to-r ${cfg.gradientHeader} px-6 py-5 relative overflow-hidden`}>
                {/* Decorative blur circles */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                <div className="absolute -bottom-6 -left-2 w-16 h-16 bg-white/10 rounded-full blur-xl" />
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            {cls.is_online ? <Video size={22} className="text-white" /> : <BookOpen size={22} className="text-white" />}
                        </div>
                        <div>
                            <span className="text-white/70 text-xs font-medium tracking-wide">{cls.ma_lop || `ONLINE-${cls.id}`}</span>
                            <h3 className="font-bold text-white text-base leading-tight line-clamp-1">{cls.ten_lop || 'Lớp học online'}</h3>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 flex-1">
                {/* Status row */}
                <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                    {cls.is_online && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-medium">
                            <Video size={11} />
                            Online
                        </span>
                    )}
                </div>

                {/* Teacher */}
                {cls.teacher_name && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <GraduationCap size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Giáo viên</p>
                            <p className="text-sm font-semibold text-slate-700">{cls.teacher_name}</p>
                        </div>
                    </div>
                )}

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                        <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Bắt đầu</p>
                            <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                {cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : 'Chưa xác định'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                        <Clock size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Giờ học</p>
                            <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                {cls.schedule_time || cls.lich_hoc || 'Theo lịch'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Students count */}
                {cls.max_students && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users size={13} />
                        <span>{cls.total_students || cls.current_students || 0}/{cls.max_students} học viên</span>
                    </div>
                )}

                {/* Footer actions */}
                <div className="mt-auto pt-1">
                    {isActive && cls.is_online && (
                        <button
                            onClick={handleJoinClass}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-200 hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
                        >
                            <PlayCircle size={16} />
                            Vào học ngay
                        </button>
                    )}
                    {isPending && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                            <Clock size={14} className="flex-shrink-0" />
                            <span>Đang chờ Admin duyệt đăng ký của bạn</span>
                        </div>
                    )}
                    {isCompleted && (
                        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700">
                            <CheckCircle2 size={14} className="flex-shrink-0" />
                            <span>Đã hoàn thành khóa học</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============= OPEN CLASS CARD =============
const OpenClassCard = ({ classItem, onRegister, isRegistered }) => {
    const current = classItem.current_students || classItem.total_students || 0;
    const max = classItem.max_students || 0;
    const isFull = max > 0 && current >= max;
    const spotsLeft = max > 0 ? max - current : null;
    const now = new Date();
    const openAt = classItem.open_at ? new Date(classItem.open_at) : null;
    const closeAt = classItem.close_at ? new Date(classItem.close_at) : null;
    const isExpired = openAt && closeAt && (now < openAt || now > closeAt);

    const fillPct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

    return (
        <div className="group bg-white rounded-[32px] border border-slate-200/60 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500 overflow-hidden anim-fade-up flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-5 relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-[20px]" />
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                            {classItem.is_online ? <Video size={22} className="text-white" /> : <BookOpen size={22} className="text-white" />}
                        </div>
                        <div>
                            <span className="text-white/70 text-xs font-medium tracking-wide">{classItem.ma_lop || `ONLINE-${classItem.id}`}</span>
                            <h4 className="font-bold text-white text-base leading-tight line-clamp-1">{classItem.ten_lop || 'Lớp học online'}</h4>
                        </div>
                    </div>
                    {classItem.is_online && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/15 backdrop-blur text-white text-xs font-medium rounded-2xl">
                            <Video size={11} />
                            Online
                        </span>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 flex-1">
                {/* Teacher */}
                {classItem.teacher_name && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <GraduationCap size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Giáo viên</p>
                            <p className="text-sm font-semibold text-slate-700">{classItem.teacher_name}</p>
                        </div>
                    </div>
                )}

                {/* Schedule */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                        <Calendar size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Khai giảng</p>
                            <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                {formatDateVN(classItem.ngay_bat_dau) || 'Chưa xác định'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
                        <Clock size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Lịch học</p>
                            <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                {classItem.schedule_time || classItem.lich_hoc || 'Theo lịch'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Location & Price row */}
                <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{classItem.is_online ? 'Online (Google Meet)' : classItem.dia_diem || 'Chưa cập nhật'}</span>
                    </div>
                    {classItem.hoc_phi > 0 && (
                        <span className="font-bold text-amber-600 text-sm">
                            {new Intl.NumberFormat('vi-VN').format(classItem.hoc_phi)}đ
                        </span>
                    )}
                </div>

                {/* Capacity progress bar */}
                {max > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                            <div className="flex items-center gap-1">
                                <Users size={12} />
                                <span>{current}/{max} học viên</span>
                            </div>
                            {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
                                <span className="text-amber-600 font-semibold">Còn {spotsLeft} chỗ!</span>
                            )}
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${fillPct >= 90 ? 'bg-red-400' : fillPct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${fillPct}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Action button */}
                <div className="mt-auto pt-2">
                    <button
                        onClick={() => onRegister(classItem)}
                        disabled={isFull || isExpired || isRegistered}
                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                            ${isRegistered
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                                : isFull || isExpired
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg hover:shadow-blue-200 hover:from-blue-600 hover:to-indigo-600'
                            }`}
                    >
                        {isRegistered ? (
                            <><CheckCircle2 size={15} /> Đã đăng ký</>
                        ) : isFull ? (
                            'Hết chỗ'
                        ) : isExpired ? (
                            'Đã kết thúc'
                        ) : (
                            <><PlayCircle size={15} /> Đăng ký ngay</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============= INFO ROW =============
const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl">
            <div className="p-2 bg-white rounded-2xl text-slate-400 flex-shrink-0 shadow-sm">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
};

// ============= CLASS DETAIL MODAL =============
const ClassDetailModal = ({ cls, onClose }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [videos, setVideos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoError, setVideoError] = useState('');

    useEffect(() => {
        if (cls && activeTab === 'videos') loadVideos();
        else if (cls && activeTab === 'documents') loadDocuments();
    }, [cls, activeTab]);

    const loadVideos = async () => {
        setLoading(true);
        try {
            if (cls.is_online) { setVideos([]); return; }
            const resp = await api.getClassVideos(cls.id || cls.class_id);
            if (resp?.success && Array.isArray(resp.data)) setVideos(resp.data || []);
        } catch (error) {
            console.error('Failed to load videos', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        try {
            setDocuments([]);
        } catch (error) {
            console.error('Failed to load documents', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWatchVideo = async (video) => {
        try {
            setVideoError('');
            setSelectedVideo(null);
            setLoading(true);
            const playResp = await api.playVideo(video.id);
            if (!playResp?.success || !playResp.data?.play_url) {
                setVideoError('Không lấy được link xem video. Vui lòng thử lại sau.');
                return;
            }
            setSelectedVideo({ ...video, play_url: playResp.data.play_url });
        } catch (err) {
            console.error('Error loading video:', err);
            setVideoError('Có lỗi khi tải video. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const status = cls.registration?.status || 'pending';
    const cfg = getStatusConfig(status);

    const getStatusLabel = () => {
        if (status === 'pending') return 'Chờ duyệt';
        if (status === 'approved') return 'Đã duyệt';
        if (status === 'studying') return 'Đang học';
        if (status === 'completed') return 'Hoàn thành';
        if (status === 'certified') return 'Đã cấp bằng';
        return status;
    };

    const MODAL_TABS = [
        { id: 'info', label: 'Thông tin' },
        { id: 'videos', label: `Video (${videos.length})` },
        { id: 'documents', label: 'Tài liệu' },
    ];

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={`bg-gradient-to-r ${cfg.gradientHeader} px-8 py-6 relative overflow-hidden flex-shrink-0`}>
                    <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-[30px]" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-md">
                                <BookOpen size={28} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">{cls.ten_lop || 'Lớp học'}</h2>
                                <span className={`inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                    {getStatusLabel()}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 bg-white/15 hover:bg-white/25 rounded-2xl flex items-center justify-center text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Modal Inner Tabs */}
                <div className="flex border-b border-slate-100/80 bg-slate-50/50 flex-shrink-0 px-8 pt-2">
                    {MODAL_TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-5 py-3.5 text-sm font-semibold transition-all border-b-2 mr-1 ${activeTab === t.id
                                ? 'border-emerald-500 text-emerald-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-8">
                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">Thông tin lớp học</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoRow icon={<BookOpen size={15} />} label="Tên lớp" value={cls.ten_lop} />
                                    <InfoRow icon={<Award size={15} />} label="Mã lớp" value={cls.ma_lop || `LOP-${cls.id}`} />
                                    <InfoRow
                                        icon={<Calendar size={15} />}
                                        label="Ngày bắt đầu"
                                        value={cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : 'Chưa xếp lịch'}
                                    />
                                    {cls.schedule_days && cls.schedule_days.length > 0 && (
                                        <InfoRow
                                            icon={<Calendar size={15} />}
                                            label="Lịch học"
                                            value={`${cls.schedule_days.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ')}${cls.schedule_start_time && cls.schedule_end_time ? ` (${cls.schedule_start_time} - ${cls.schedule_end_time})` : ''}`}
                                        />
                                    )}
                                    {(!cls.schedule_days || cls.schedule_days.length === 0) && (
                                        <InfoRow
                                            icon={<Clock size={15} />}
                                            label="Thời gian học"
                                            value={
                                                cls.schedule_summary ||
                                                (cls.schedule_start_time && cls.schedule_end_time
                                                    ? `${cls.schedule_start_time} - ${cls.schedule_end_time}`
                                                    : cls.gio_hoc || 'Chưa xếp lịch')
                                            }
                                        />
                                    )}
                                    <InfoRow icon={<MapPin size={15} />} label="Địa điểm" value={cls.schedule_location || cls.dia_diem || 'Chưa xếp địa điểm'} />
                                    {cls.ngay_ket_thuc && (
                                        <InfoRow icon={<Calendar size={15} />} label="Ngày kết thúc" value={formatDateVN(cls.ngay_ket_thuc)} />
                                    )}
                                    {cls.max_students && (
                                        <InfoRow
                                            icon={<Users size={15} />}
                                            label="Sĩ số"
                                            value={`${cls.current_students || 0} / ${cls.max_students} học viên`}
                                        />
                                    )}
                                    {cls.hoc_phi !== undefined && (
                                        <InfoRow
                                            icon={<Award size={15} />}
                                            label="Học phí"
                                            value={cls.hoc_phi === 0 ? 'Liên hệ' : `${parseInt(cls.hoc_phi || 0).toLocaleString('vi-VN')} đ`}
                                        />
                                    )}
                                </div>
                            </div>

                            {typeof cls.progress === 'number' && (
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Tiến độ học tập</p>
                                    <div className="bg-slate-50 p-4 rounded-2xl">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-500">Hoàn thành</span>
                                            <span className="font-bold text-emerald-600">{cls.progress}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                                style={{ width: `${cls.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {cls.registration && (
                                <div>
                                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">Trạng thái đăng ký</p>
                                    <div className="space-y-2">
                                        <InfoRow icon={<CheckCircle2 size={15} />} label="Trạng thái" value={getStatusLabel()} />
                                        {cls.registration.registration_date && (
                                            <InfoRow
                                                icon={<Calendar size={15} />}
                                                label="Ngày đăng ký"
                                                value={formatDateVN(cls.registration.registration_date)}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Videos Tab */}
                    {activeTab === 'videos' && (
                        <div>
                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-emerald-500 border-t-transparent" />
                                </div>
                            ) : videos.length > 0 ? (
                                <div className="space-y-3">
                                    {videos.map((video, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                    <PlayCircle size={20} className="text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{video.title || 'Video bài giảng'}</p>
                                                    {video.description && <p className="text-xs text-slate-500 mt-0.5">{video.description}</p>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleWatchVideo(video)}
                                                className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                                            >
                                                <PlayCircle size={14} />
                                                Xem
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400">
                                    <Video size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Chưa có video bài giảng</p>
                                </div>
                            )}
                            {(selectedVideo || videoError) && (
                                <div className="mt-6 p-4 bg-slate-50 rounded-2xl">
                                    {videoError && <p className="text-sm text-red-500 py-2">{videoError}</p>}
                                    {selectedVideo && !videoError && (
                                        <div className="space-y-3">
                                            <p className="text-sm font-semibold text-slate-700">{selectedVideo.title || 'Video bài giảng'}</p>
                                            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                                                <video key={selectedVideo.play_url} src={selectedVideo.play_url} controls className="w-full h-full" />
                                            </div>
                                            <p className="text-xs text-slate-400">Link xem có thời hạn. Nếu video không phát, nhấn nút "Xem" để lấy link mới.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Documents Tab */}
                    {activeTab === 'documents' && (
                        <div>
                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-emerald-500 border-t-transparent" />
                                </div>
                            ) : documents.length > 0 ? (
                                <div className="space-y-2">
                                    {documents.map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                    <FileText size={20} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{doc.name || 'Tài liệu'}</p>
                                                    {doc.size && <p className="text-xs text-slate-500">{doc.size}</p>}
                                                </div>
                                            </div>
                                            <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-slate-400">
                                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Chưa có tài liệu</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============= CONFIRM REGISTER MODAL =============
const ConfirmRegisterModal = ({ isOpen, onClose, classItem, onConfirm, studentData }) => {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm(classItem);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !classItem) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top accent bar */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <div className="p-8">
                    {/* Icon */}
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <BookOpen size={30} className="text-blue-500" />
                    </div>
                    <p className="text-center text-slate-500 text-sm mb-1">Bạn đang đăng ký vào lớp</p>
                    <h3 className="text-center text-xl font-bold text-slate-800 mb-6 tracking-tight">{classItem.ten_lop}</h3>

                    {/* Info summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-6">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Học viên</span>
                            <span className="font-semibold text-slate-800">{studentData?.ho_ten}</span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Khai giảng</span>
                            <span className="font-semibold text-slate-800">{formatDateVN(classItem.ngay_bat_dau)}</span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Học phí</span>
                            <span className="font-bold text-amber-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(classItem.hoc_phi)}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-60 text-sm flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : 'Xác nhận đăng ký'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============= MAIN COMPONENT =============
export default function UnifiedClassesPage({ studentData, onRegisterSuccess }) {
    const [activeTab, setActiveTab] = useState('my-classes');

    // My Classes State
    const [myClasses, setMyClasses] = useState([]);
    const [myLoading, setMyLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [mySearchTerm, setMySearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Register Classes State
    const [openClasses, setOpenClasses] = useState([]);
    const [registerLoading, setRegisterLoading] = useState(true);
    const [registerSearchTerm, setRegisterSearchTerm] = useState('');
    const [selectedRegisterClass, setSelectedRegisterClass] = useState(null);

    const { success, error } = useToast();
    const containerRef = useRef(null);
    // Guard against double-invoke (React strict mode) and missing prop
    const hasFetchedRef = useRef(false);

    // Resolve cccd once - fallback to localStorage when prop not provided
    const cccd = studentData?.cccd || localStorage.getItem('student_cccd');

    // Get registered class IDs
    const registeredClassIds = myClasses.map((c) => c.id);

    // Filtered my classes - SAME LOGIC AS MOBILE
    const filteredMyClasses = myClasses.filter((c) => {
        if (!c) return false;
        const name = (c.ten_lop || c.class_name || '').toLowerCase();
        const matchesSearch =
            !mySearchTerm ||
            name.includes(mySearchTerm.toLowerCase()) ||
            (c.ma_lop && c.ma_lop.toLowerCase().includes(mySearchTerm.toLowerCase()));
        if (!matchesSearch) return false;
        if (filterStatus === 'all') return true;
        const status = c.registration?.status || c.status;
        if (filterStatus === 'active') return ['studying', 'approved'].includes(status);
        if (filterStatus === 'completed') return ['completed', 'certified'].includes(status);
        if (filterStatus === 'pending') return status === 'pending';
        return true;
    });

    // Filtered open classes
    const filteredOpenClasses = openClasses.filter(
        (c) =>
            c.ten_lop?.toLowerCase().includes(registerSearchTerm.toLowerCase()) ||
            c.ma_lop?.toLowerCase().includes(registerSearchTerm.toLowerCase())
    );

    useGSAP(() => {
        if (myClasses.length > 0 || openClasses.length > 0) {
            gsap.fromTo(
                '.anim-fade-up',
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
            );
        }
    }, { scope: containerRef, dependencies: [activeTab, myClasses.length, openClasses.length, filteredMyClasses.length, filteredOpenClasses.length] });

    // Load my classes - fetch from ONLINE CLASSES API (Admin uses online_classes table)
    const loadMyClasses = async () => {
        setMyLoading(true);
        try {
            const cccd = studentData?.cccd || localStorage.getItem('student_cccd');
            if (!cccd) {
                setMyClasses([]);
                setMyLoading(false);
                return;
            }
            const API_URL = import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev';
            const response = await fetch(`${API_URL}/online-classes?status=active`, {
                headers: { 'X-Student-CCCD': cccd }
            });
            const result = await response.json();
            if (!result?.success || !result?.data?.classes) {
                setMyClasses([]);
                setMyLoading(false);
                return;
            }
            const allClasses = result.data.classes || [];
            const enrolledClasses = allClasses.filter((cls) => {
                const isEnrolled = cls.is_enrolled === true;
                const hasEnrollment = ['active', 'pending'].includes(cls.enrollment_status);
                return isEnrolled || hasEnrollment;
            });
            const studentClasses = enrolledClasses.map((cls) => {
                let status = cls.enrollment_status || 'pending';
                if (status === 'active') status = 'studying';
                return {
                    id: cls.id,
                    class_id: cls.id,
                    ten_lop: cls.class_name || 'Lớp học online',
                    ma_lop: cls.ma_lop || `ONLINE-${cls.id}`,
                    ngay_bat_dau: cls.start_date,
                    ngay_ket_thuc: cls.end_date,
                    dia_diem: 'Online',
                    schedule_location: 'Online',
                    lich_hoc: cls.schedule_rule,
                    schedule_time: cls.schedule_time,
                    schedule_summary: cls.schedule_time || null,
                    hoc_phi: 0,
                    max_students: cls.max_students,
                    current_students: cls.enrollment_count,
                    total_students: cls.enrollment_count,
                    meet_link: cls.meet_link,
                    teacher_name: cls.teacher_name,
                    registration: { status: status, enrollment_status: cls.enrollment_status },
                    progress: null,
                    is_online: true,
                };
            });
            setMyClasses(studentClasses);
        } catch (err) {
            console.error('[UnifiedClassesPage] Error loading my classes:', err);
            setMyClasses([]);
        } finally {
            setMyLoading(false);
        }
    };

    // Load open classes for registration - FETCH ONLINE CLASSES
    const loadOpenClasses = async () => {
        setRegisterLoading(true);
        try {
            const cccd = studentData?.cccd || localStorage.getItem('student_cccd');
            const API_URL = import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev';
            const response = await fetch(`${API_URL}/online-classes?status=active`, {
                headers: cccd ? { 'X-Student-CCCD': cccd } : {}
            });
            const result = await response.json();
            if (!result?.success || !result?.data?.classes) {
                setOpenClasses([]);
                setRegisterLoading(false);
                return;
            }
            const allClasses = result.data.classes || [];
            const validClasses = allClasses.filter((cls) => {
                if (cls.is_enrolled === true) return false;
                if (['active', 'pending'].includes(cls.enrollment_status)) return false;
                const isActive = cls.status === 'active';
                const currentCount = cls.enrollment_count || 0;
                const maxCount = cls.max_students || 0;
                const notFull = maxCount === 0 || currentCount < maxCount;
                return isActive && notFull;
            });
            const transformedClasses = validClasses.map((cls) => ({
                id: cls.id,
                ten_lop: cls.class_name || 'Lớp học online',
                ma_lop: cls.ma_lop || `ONLINE-${cls.id}`,
                ngay_bat_dau: cls.start_date,
                ngay_ket_thuc: cls.end_date,
                dia_diem: 'Online',
                schedule_location: 'Online',
                lich_hoc: cls.schedule_rule,
                schedule_time: cls.schedule_time,
                schedule_summary: cls.schedule_time || null,
                hoc_phi: 0,
                max_students: cls.max_students,
                current_students: cls.enrollment_count,
                total_students: cls.enrollment_count,
                teacher_name: cls.teacher_name,
                status: cls.status,
                is_online: true,
            }));
            setOpenClasses(transformedClasses);
        } catch (err) {
            console.error('[UnifiedClassesPage] Failed to load open classes:', err);
            setOpenClasses([]);
        } finally {
            setRegisterLoading(false);
        }
    };

    useEffect(() => {
        // Prevent double-invoke from React strict mode re-mounting
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        if (cccd) {
            loadMyClasses();
            loadOpenClasses();
        } else {
            setMyLoading(false);
            setRegisterLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cccd]);

    // Handle register - ENROLL vào ONLINE CLASS
    const handleRegister = async (classItem) => {
        try {
            if (!cccd) {
                error('Không tìm thấy thông tin CCCD học viên');
                return;
            }
            const API_URL = import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev';
            const response = await fetch(`${API_URL}/online-classes/${classItem.id}/enroll`, {
                method: 'POST',
                headers: {
                    'X-Student-CCCD': cccd,
                    'Content-Type': 'application/json'
                }
            });
            const res = await response.json();
            if (res?.success) {
                success(res.message || 'Đăng ký thành công! Admin sẽ duyệt trong vòng 24h. Bạn sẽ nhận thông báo khi được duyệt.');
                setSelectedRegisterClass(null);
                loadMyClasses();
                loadOpenClasses();
                if (onRegisterSuccess) onRegisterSuccess();
            } else {
                throw new Error(res?.message || 'Đăng ký thất bại');
            }
        } catch (err) {
            error(err.message || 'Lỗi kết nối');
        }
    };

    // Stats
    const totalClasses = myClasses.length;
    const activeClasses = myClasses.filter((c) => ['studying', 'approved'].includes(c.registration?.status)).length;
    const completedClasses = myClasses.filter((c) => ['completed', 'certified'].includes(c.registration?.status)).length;

    return (
        <div className="space-y-6" ref={containerRef}>

            {/* ===== PILL TAB SWITCHER ===== */}
            <div className="flex gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm w-fit mx-auto">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const count = tab.id === 'my-classes' ? totalClasses : filteredOpenClasses.length;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600'
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                            {/* Count badge */}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 text-slate-500'
                                }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ===== TAB: MY CLASSES ===== */}
            {activeTab === 'my-classes' && (
                <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100 anim-fade-up">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-white/80">Tổng lớp</p>
                                <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <BookOpen size={18} />
                                </div>
                            </div>
                            <p className="text-4xl font-black tracking-tight">{totalClasses}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-100 anim-fade-up">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-white/80">Đang học</p>
                                <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <p className="text-4xl font-black tracking-tight">{activeClasses}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-100 anim-fade-up">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-white/80">Hoàn thành</p>
                                <div className="w-9 h-9 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <Award size={18} />
                                </div>
                            </div>
                            <p className="text-4xl font-black tracking-tight">{completedClasses}</p>
                        </div>
                    </div>

                    {/* Search & Filter bar */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 anim-fade-up">
                        <div className="flex gap-3 items-center">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm lớp theo tên hoặc mã..."
                                    value={mySearchTerm}
                                    onChange={(e) => setMySearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all bg-slate-50"
                                />
                            </div>
                            <div className="relative">
                                <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-slate-50 appearance-none cursor-pointer"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="active">Đang học</option>
                                    <option value="completed">Hoàn thành</option>
                                    <option value="pending">Chờ duyệt</option>
                                </select>
                            </div>
                            <button
                                onClick={loadMyClasses}
                                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-slate-50"
                            >
                                <RefreshCw size={15} />
                                Làm mới
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 ml-0.5">
                            Hiển thị <span className="font-semibold text-slate-600">{filteredMyClasses.length}</span>/{myClasses.length} lớp
                        </p>
                    </div>

                    {/* Class list */}
                    {myLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 overflow-hidden h-64">
                                    <div className="h-20 bg-slate-100" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-4 bg-slate-100 rounded-full w-1/3" />
                                        <div className="h-10 bg-slate-100 rounded-xl" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-12 bg-slate-100 rounded-xl" />
                                            <div className="h-12 bg-slate-100 rounded-xl" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredMyClasses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredMyClasses.map((cls) => (
                                <MyClassCard key={cls.id} cls={cls} onClick={setSelectedClass} />
                            ))}
                        </div>
                    ) : myClasses.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <BookOpen size={36} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Bạn chưa có lớp nào</h3>
                            <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                                Nhấn vào tab "Đăng ký lớp" để tìm lớp phù hợp!
                            </p>
                            <button
                                onClick={() => setActiveTab('register')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-200 transition-all"
                            >
                                <Plus size={16} />
                                Đăng ký lớp ngay
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Search size={36} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Không tìm thấy lớp học</h3>
                            {mySearchTerm && (
                                <button
                                    onClick={() => { setMySearchTerm(''); setFilterStatus('all'); }}
                                    className="mt-3 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ===== TAB: REGISTER CLASSES ===== */}
            {activeTab === 'register' && (
                <>
                    {/* Hero search banner */}
                    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 relative overflow-hidden anim-fade-up">
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                        <div className="absolute bottom-0 left-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center">
                                        <GraduationCap size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-sm">Xin chào,</p>
                                        <h2 className="text-white text-lg font-bold">{studentData?.ho_ten || 'Học viên'}</h2>
                                    </div>
                                </div>
                                <button
                                    onClick={loadOpenClasses}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-sm font-medium rounded-2xl transition-colors backdrop-blur"
                                >
                                    <RefreshCw size={15} />
                                    Làm mới
                                </button>
                            </div>
                            {/* Search input in banner */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={17} />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm lớp học..."
                                    value={registerSearchTerm}
                                    onChange={(e) => setRegisterSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/15 backdrop-blur border border-white/20 text-white placeholder-white/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Open class list */}
                    {registerLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-100 overflow-hidden h-72">
                                    <div className="h-20 bg-slate-100" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-10 bg-slate-100 rounded-xl" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="h-12 bg-slate-100 rounded-xl" />
                                            <div className="h-12 bg-slate-100 rounded-xl" />
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full" />
                                        <div className="h-10 bg-slate-100 rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredOpenClasses.length > 0 ? (
                        <div>
                            <div className="flex items-center justify-between mb-4 anim-fade-up">
                                <h3 className="font-bold text-slate-800">Lớp đang mở đăng ký</h3>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-bold">
                                    {filteredOpenClasses.length} lớp
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredOpenClasses.map((item) => (
                                    <OpenClassCard
                                        key={item.id}
                                        classItem={item}
                                        onRegister={() => setSelectedRegisterClass(item)}
                                        isRegistered={registeredClassIds.includes(item.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center anim-fade-up">
                            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <BookOpen size={36} className="text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có lớp học nào</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                Hiện tại chưa có lớp học nào đang mở đăng ký. Vui lòng quay lại sau.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ===== DETAIL MODAL ===== */}
            {selectedClass && <ClassDetailModal cls={selectedClass} onClose={() => setSelectedClass(null)} />}

            {/* ===== CONFIRM REGISTER MODAL ===== */}
            <ConfirmRegisterModal
                isOpen={!!selectedRegisterClass}
                onClose={() => setSelectedRegisterClass(null)}
                classItem={selectedRegisterClass}
                onConfirm={handleRegister}
                studentData={studentData}
            />
        </div>
    );
}
