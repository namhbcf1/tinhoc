import React, { useState, useEffect } from 'react';
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
    AlertCircle,
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

// ============= TABS =============
const TABS = [
    { id: 'my-classes', label: 'Lớp của tôi', icon: BookOpen },
    { id: 'register', label: 'Đăng ký lớp', icon: Plus },
];

// ============= MY CLASS CARD =============
// ============= MY CLASS CARD - PREMIUM DESIGN =============
const MyClassCard = ({ cls, onClick, onNoMeetLink }) => {
    const status = cls.registration?.status || 'pending';
    const isActive = ['studying', 'approved', 'active'].includes(status);
    const isCompleted = ['completed', 'certified'].includes(status);
    const isPending = status === 'pending';

    const getStatusConfig = () => {
        if (isCompleted) return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Hoàn thành', gradient: 'from-purple-500 to-indigo-500' };
        if (isActive) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đang học', gradient: 'from-emerald-500 to-teal-500' };
        if (isPending) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ duyệt', gradient: 'from-amber-500 to-orange-500' };
        return { bg: 'bg-slate-100', text: 'text-slate-700', label: status, gradient: 'from-slate-400 to-slate-500' };
    };

    const statusConfig = getStatusConfig();

    // Handle join class (Google Meet)
    const handleJoinClass = (e) => {
        e.stopPropagation();
        if (cls.meet_link) {
            window.open(cls.meet_link, '_blank', 'noopener,noreferrer');
        } else {
            if (onNoMeetLink) onNoMeetLink();
        }
    };

    return (
        <div
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden active:scale-[0.99] transition-all "
            onClick={() => onClick(cls)}
        >
            {/* Gradient Header */}
            <div className={`px-4 py-3 bg-gradient-to-r ${statusConfig.gradient}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center ">
                            {cls.is_online ? <Video size={20} className="text-white" /> : <BookOpen size={20} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-white/80 text-xs font-medium">{cls.ma_lop || `ONLINE-${cls.id}`}</span>
                            <h3 className="font-bold text-white text-base line-clamp-1">{cls.ten_lop || 'Lớp học online'}</h3>
                        </div>
                    </div>
                    {cls.is_online && (
                        <span className="bg-white/20 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded-2xl flex items-center gap-1 ">
                            <Video size={10} />
                            Online
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-3">
                {/* Status Badge */}
                <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                    </span>
                    {cls.progress > 0 && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
                            <TrendingUp size={12} />
                            {cls.progress}%
                        </span>
                    )}
                </div>

                {/* Teacher Info */}
                {cls.teacher_name && (
                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <GraduationCap size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase">Giáo viên</p>
                            <p className="font-semibold text-slate-700 text-sm">{cls.teacher_name}</p>
                        </div>
                    </div>
                )}

                {/* Schedule Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                        <Calendar size={14} className="text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase">Bắt đầu</p>
                            <p className="text-sm font-medium text-slate-700 truncate">{cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : 'Chưa xác định'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                        <Clock size={14} className="text-green-500 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase">Giờ học</p>
                            <p className="text-sm font-medium text-slate-700 truncate">{cls.schedule_time || cls.lich_hoc || 'Theo lịch'}</p>
                        </div>
                    </div>
                </div>

                {/* Students count & Location */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{cls.total_students || cls.current_students || 0}/{cls.max_students || '∞'} học viên</span>
                    </div>
                    <div className="flex items-center gap-1 max-w-[120px]">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{cls.schedule_location || cls.dia_diem || 'Online'}</span>
                    </div>
                </div>

                {/* Action Button */}
                {isActive && cls.is_online && (
                    <button
                        onClick={handleJoinClass}
                        className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <PlayCircle size={18} />
                        Vào học ngay
                    </button>
                )}

                {/* Pending message */}
                {isPending && (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                        <Clock size={16} className="flex-shrink-0" />
                        <span>Đang chờ Admin duyệt đăng ký chủa bạn</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============= OPEN CLASS CARD (for registration) - PREMIUM DESIGN =============
const OpenClassCard = ({ classItem, onRegister, isRegistered }) => {
    const current = classItem.so_luong_hien_tai || classItem.current_students || classItem.total_students || 0;
    const max = classItem.so_luong_toi_da || classItem.max_students || 0;
    const isFull = max > 0 && current >= max;
    const isExpired = classItem.ngay_bat_dau && new Date(classItem.ngay_bat_dau) < new Date();
    const spotsLeft = max > 0 ? max - current : null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden ">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center ">
                            {classItem.is_online ? <Video size={18} className="text-white" /> : <BookOpen size={18} className="text-white" />}
                        </div>
                        <div>
                            <span className="text-white/80 text-xs font-medium">{classItem.ma_lop || `ONLINE-${classItem.id}`}</span>
                            <h4 className="font-bold text-white text-sm line-clamp-1">{classItem.ten_lop || 'Lớp học online'}</h4>
                        </div>
                    </div>
                    {classItem.is_online && (
                        <span className="bg-white/20 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded-2xl flex items-center gap-1 ">
                            <Video size={10} />
                            Online
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Teacher Info */}
                {classItem.teacher_name && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <GraduationCap size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase">Giáo viên</p>
                            <p className="font-semibold text-slate-700 text-sm truncate">{classItem.teacher_name}</p>
                        </div>
                    </div>
                )}

                {/* Schedule Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                        <Calendar size={14} className="text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase">Khai giảng</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{formatDateVN(classItem.ngay_bat_dau) || 'Chưa xác định'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                        <Clock size={14} className="text-green-500 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase">Lịch học</p>
                            <p className="text-xs font-semibold text-slate-700 truncate">{classItem.schedule_time || classItem.lich_hoc || 'Theo lịch'}</p>
                        </div>
                    </div>
                </div>

                {/* Location & Price Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{classItem.is_online ? 'Online (Google Meet)' : classItem.dia_diem || 'Chưa cập nhật'}</span>
                    </div>
                    {classItem.hoc_phi > 0 && (
                        <span className="text-sm font-bold text-amber-600">
                            {new Intl.NumberFormat('vi-VN').format(classItem.hoc_phi)}đ
                        </span>
                    )}
                </div>

                {/* Spots Left Warning */}
                {spotsLeft !== null && spotsLeft <= 5 && spotsLeft > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>Còn <strong>{spotsLeft}</strong> chỗ trống!</span>
                    </div>
                )}

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Users size={14} />
                        <span>{current}/{max > 0 ? max : '∞'} học viên</span>
                    </div>

                    <button
                        onClick={() => onRegister(classItem)}
                        disabled={isFull || isExpired || isRegistered}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${isRegistered
                            ? 'bg-emerald-100 text-emerald-700'
                            : isFull || isExpired
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200 active:scale-95'
                            }`}
                    >
                        {isRegistered ? (
                            <>
                                <CheckCircle2 size={16} />
                                Đã đăng ký
                            </>
                        ) : isFull ? (
                            'Hết chỗ'
                        ) : isExpired ? (
                            'Đã kết thúc'
                        ) : (
                            <>
                                <PlayCircle size={16} />
                                Đăng ký ngay
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============= CLASS DETAIL SHEET =============
const ClassDetailSheet = ({ cls, onClose }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [videos, setVideos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoError, setVideoError] = useState('');

    useEffect(() => {
        if (cls && activeTab === 'videos') {
            loadVideos();
        } else if (cls && activeTab === 'documents') {
            loadDocuments();
        }
    }, [cls, activeTab]);

    const loadVideos = async () => {
        setLoading(true);
        try {
            const resp = await api.getClassVideos(cls.id);
            if (resp?.success && Array.isArray(resp.data)) {
                setVideos(resp.data || []);
            }
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

            setSelectedVideo({
                ...video,
                play_url: playResp.data.play_url,
            });
        } catch (err) {
            console.error('Error loading video:', err);
            setVideoError('Có lỗi khi tải video. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const status = cls.registration?.status || 'pending';
    const getStatusColor = () => {
        if (['completed', 'certified'].includes(status)) return 'bg-purple-100 text-purple-700';
        if (['studying', 'approved'].includes(status)) return 'bg-blue-100 text-blue-700';
        if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
        return 'bg-slate-100 text-slate-700';
    };

    const getStatusLabel = () => {
        if (status === 'pending') return 'Chờ duyệt';
        if (status === 'approved') return 'Đã duyệt';
        if (status === 'studying') return 'Đang học';
        if (status === 'completed') return 'Hoàn thành';
        if (status === 'certified') return 'Đã cấp bằng';
        return status;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[92vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col "
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative bg-gradient-to-r from-green-600 to-green-700 px-5 pt-6 pb-5">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 "
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <div className="flex gap-4 items-center">
                        <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold text-green-600 shadow-lg  tracking-tight">
                            <BookOpen size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{cls.ten_lop || 'Lớp học'}</h2>
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusColor()}`}
                            >
                                {getStatusLabel()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-slate-200 px-5 bg-white sticky top-0 z-10 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'text-green-600 border-green-600' : 'text-slate-500 border-transparent'
                            }`}
                    >
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'videos' ? 'text-green-600 border-green-600' : 'text-slate-500 border-transparent'
                            }`}
                    >
                        Video ({videos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'documents' ? 'text-green-600 border-green-600' : 'text-slate-500 border-transparent'
                            }`}
                    >
                        Tài liệu
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5">
                    {activeTab === 'info' && (
                        <div className="space-y-4 py-6">
                            <div>
                                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-3">Thông tin lớp học</h3>
                                <div className="space-y-3">
                                    <InfoRow icon={<BookOpen size={16} />} label="Tên lớp" value={cls.ten_lop} />
                                    <InfoRow icon={<Award size={16} />} label="Mã lớp" value={cls.ma_lop || `LOP-${cls.id}`} />
                                    <InfoRow
                                        icon={<Calendar size={16} />}
                                        label="Ngày bắt đầu"
                                        value={cls.ngay_bat_dau ? formatDateVN(cls.ngay_bat_dau) : 'Chưa xếp lịch'}
                                    />
                                    {cls.schedule_days && cls.schedule_days.length > 0 && (
                                        <InfoRow
                                            icon={<Calendar size={16} />}
                                            label="Lịch học"
                                            value={`${cls.schedule_days.map((d) => (d === 0 ? 'CN' : `T${d + 1}`)).join(', ')}${cls.schedule_start_time && cls.schedule_end_time ? ` (${cls.schedule_start_time} - ${cls.schedule_end_time})` : ''}`}
                                        />
                                    )}
                                    <InfoRow
                                        icon={<Clock size={16} />}
                                        label="Thời gian học"
                                        value={
                                            cls.schedule_summary ||
                                            (cls.schedule_start_time && cls.schedule_end_time
                                                ? `${cls.schedule_start_time} - ${cls.schedule_end_time}`
                                                : cls.gio_hoc || 'Chưa xếp lịch')
                                        }
                                    />
                                    <InfoRow
                                        icon={<MapPin size={16} />}
                                        label="Địa điểm"
                                        value={cls.schedule_location || cls.dia_diem || 'Chưa xếp địa điểm'}
                                    />
                                    {cls.ngay_ket_thuc && (
                                        <InfoRow icon={<Calendar size={16} />} label="Ngày kết thúc" value={formatDateVN(cls.ngay_ket_thuc)} />
                                    )}
                                    {cls.max_students && (
                                        <InfoRow
                                            icon={<Users size={16} />}
                                            label="Sĩ số"
                                            value={`${cls.total_students || cls.current_students || 0} / ${cls.max_students} học viên`}
                                        />
                                    )}
                                    {cls.hoc_phi !== undefined && (
                                        <InfoRow
                                            icon={<Award size={16} />}
                                            label="Học phí"
                                            value={cls.hoc_phi === 0 ? 'Liên hệ' : `${parseInt(cls.hoc_phi || 0).toLocaleString('vi-VN')} đ`}
                                        />
                                    )}
                                </div>
                            </div>

                            {typeof cls.progress === 'number' && (
                                <div>
                                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Tiến độ học tập</h3>
                                    <div className="space-y-3">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                                <span>Hoàn thành</span>
                                                <span className="font-bold text-green-600">{cls.progress}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                                                    style={{ width: `${cls.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {cls.registration && (
                                <div>
                                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-3">Trạng thái đăng ký</h3>
                                    <div className="space-y-3">
                                        <InfoRow icon={<CheckCircle2 size={16} />} label="Trạng thái" value={getStatusLabel()} />
                                        {cls.registration.registration_date && (
                                            <InfoRow
                                                icon={<Calendar size={16} />}
                                                label="Ngày đăng ký"
                                                value={formatDateVN(cls.registration.registration_date)}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div className="py-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
                                </div>
                            ) : videos.length > 0 ? (
                                <div className="space-y-3">
                                    {videos.map((video, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-bold text-slate-800 flex-1">{video.title || 'Video bài giảng'}</h4>
                                                <button
                                                    onClick={() => handleWatchVideo(video)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 active:scale-95"
                                                >
                                                    <PlayCircle size={14} />
                                                    Xem
                                                </button>
                                            </div>
                                            {video.description && <p className="text-xs text-slate-500 mt-1">{video.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Video size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Chưa có video bài giảng</p>
                                </div>
                            )}

                            {(selectedVideo || videoError) && (
                                <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    {videoError && <div className="py-4 text-sm text-red-600">{videoError}</div>}
                                    {selectedVideo && !videoError && (
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium text-slate-700">{selectedVideo.title || 'Video bài giảng'}</div>
                                            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                                <video key={selectedVideo.play_url} src={selectedVideo.play_url} controls className="w-full h-full" />
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Link xem có thời hạn. Nếu video không phát được, vui lòng nhấn nút "Xem" để lấy link mới.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="py-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-600 border-t-transparent" />
                                </div>
                            ) : documents.length > 0 ? (
                                <div className="space-y-3">
                                    {documents.map((doc, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileText size={24} className="text-green-600" />
                                                <div>
                                                    <p className="font-medium text-slate-800">{doc.name || 'Tài liệu'}</p>
                                                    <p className="text-xs text-slate-500">{doc.size || ''}</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-green-600">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <FileText size={48} className="mx-auto mb-2 opacity-30" />
                                    <p>Chưa có tài liệu</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============= CONFIRM REGISTER SHEET =============
const ConfirmRegisterSheet = ({ isOpen, onClose, classItem, onConfirm, studentData }) => {
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
        <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full rounded-t-3xl shadow-2xl overflow-hidden "
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>
                <div className="p-5 pb-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen size={32} className="text-blue-600" />
                        </div>
                        <p className="text-slate-600 mb-1">Bạn đang đăng ký vào lớp</p>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{classItem.ten_lop}</h3>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Học viên</span>
                            <span className="font-medium text-slate-900">{studentData?.ho_ten}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Khai giảng</span>
                            <span className="font-medium text-slate-900">{formatDateVN(classItem.ngay_bat_dau)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Học phí</span>
                            <span className="font-bold text-amber-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(classItem.hoc_phi)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                'Xác nhận đăng ký'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============= INFO ROW =============
const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
            <div className="p-2 bg-white rounded-2xl text-slate-400 flex-shrink-0 ">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="font-medium text-slate-800 break-words">{value}</p>
            </div>
        </div>
    );
};

// ============= MAIN COMPONENT =============
export default function MobileClassesModule({ studentData }) {
    const [activeTab, setActiveTab] = useState('my-classes');

    // My Classes State
    const [myClasses, setMyClasses] = useState([]);
    const [myLoading, setMyLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);
    const [mySearchTerm, setMySearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    // Register Classes State
    const [openClasses, setOpenClasses] = useState([]);
    const [registerLoading, setRegisterLoading] = useState(true);
    const [registerSearchTerm, setRegisterSearchTerm] = useState('');
    const [selectedRegisterClass, setSelectedRegisterClass] = useState(null);

    const { success, error, info, toasts, removeToast } = useToast();
    const toast = { success, error, info };

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        if (studentData?.cccd) {
            setMyLoading(true);
            setRegisterLoading(true);
            await Promise.all([loadMyClasses(), loadOpenClasses()]);
        }
    };

    // Handler for missing meet link
    const handleNoMeetLink = () => {
        info('Chưa có link học trực tuyến. Vui lòng liên hệ giáo viên.');
    };

    // Load my classes - fetch from ONLINE CLASSES API
    const loadMyClasses = async () => {
        setMyLoading(true);
        try {
            const cccd = studentData?.cccd || localStorage.getItem('student_cccd');
            if (!cccd) {
                console.warn('[MobileClassesModule] No CCCD found');
                setMyClasses([]);
                setMyLoading(false);
                return;
            }

            console.log('[MobileClassesModule] Loading ONLINE classes for CCCD:', cccd);

            const API_URL = import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev';
            const response = await fetch(`${API_URL}/online-classes?status=active`, {
                headers: { 'X-Student-CCCD': cccd }
            });
            const result = await response.json();
            console.log('[MobileClassesModule] Online classes response:', result);

            if (!result?.success || !result?.data?.classes) {
                console.log('[MobileClassesModule] No online classes data');
                setMyClasses([]);
                setMyLoading(false);
                return;
            }

            const allClasses = result.data.classes || [];
            console.log('[MobileClassesModule] All online classes:', allClasses.length);

            // Filter only ENROLLED classes
            const enrolledClasses = allClasses.filter((cls) => {
                const isEnrolled = cls.is_enrolled === true;
                const hasEnrollment = ['active', 'pending'].includes(cls.enrollment_status);
                return isEnrolled || hasEnrollment;
            });

            console.log('[MobileClassesModule] Enrolled classes:', enrolledClasses.length);

            // Transform to match component format
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
                    hoc_phi: 0,
                    max_students: cls.max_students,
                    current_students: cls.enrollment_count,
                    total_students: cls.enrollment_count,
                    meet_link: cls.meet_link,
                    teacher_name: cls.teacher_name,
                    registration: {
                        status: status,
                        enrollment_status: cls.enrollment_status
                    },
                    progress: null,
                    is_online: true,
                };
            });

            console.log('[MobileClassesModule] Final student classes:', studentClasses.length);
            setMyClasses(studentClasses);
        } catch (err) {
            console.error('[MobileClassesModule] Error loading my classes:', err);
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
            console.log('[MobileClassesModule] Loading open online classes...');

            const API_URL = import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev';
            const response = await fetch(`${API_URL}/online-classes?status=active`, {
                headers: cccd ? { 'X-Student-CCCD': cccd } : {}
            });
            const result = await response.json();
            console.log('[MobileClassesModule] Online classes response:', result);

            if (!result?.success || !result?.data?.classes) {
                console.log('[MobileClassesModule] No online classes data');
                setOpenClasses([]);
                setRegisterLoading(false);
                return;
            }

            const allClasses = result.data.classes || [];
            console.log('[MobileClassesModule] All online classes:', allClasses.length);

            // Filter classes NOT enrolled yet
            const validClasses = allClasses.filter((cls) => {
                if (cls.is_enrolled === true) return false;
                if (['active', 'pending'].includes(cls.enrollment_status)) return false;
                const isActive = cls.status === 'active';
                const currentCount = cls.enrollment_count || 0;
                const maxCount = cls.max_students || 0;
                const notFull = maxCount === 0 || currentCount < maxCount;
                return isActive && notFull;
            });

            // Transform to expected format
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

            console.log('[MobileClassesModule] Valid open classes:', transformedClasses.length);
            setOpenClasses(transformedClasses);
        } catch (err) {
            console.error('[MobileClassesModule] Failed to load open classes:', err);
            setOpenClasses([]);
        } finally {
            setRegisterLoading(false);
        }
    };

    useEffect(() => {
        console.log('[MobileClassesModule] useEffect triggered, studentData:', studentData);
        if (studentData?.cccd) {
            console.log('[MobileClassesModule] Loading classes for student:', studentData.cccd);
            loadMyClasses();
            loadOpenClasses();
        } else {
            console.warn('[MobileClassesModule] No studentData or CCCD, skipping load');
            setMyLoading(false);
            setRegisterLoading(false);
        }
    }, [studentData?.cccd]);

    // Handle register - ENROLL vào ONLINE CLASS
    const handleRegister = async (classItem) => {
        try {
            if (!studentData?.cccd) {
                error('Không tìm thấy thông tin CCCD học viên');
                return;
            }

            const API_URL = import.meta.env.VITE_API_URL || 'https://vantrangedu-api.bangachieu2.workers.dev';
            const response = await fetch(`${API_URL}/online-classes/${classItem.id}/enroll`, {
                method: 'POST',
                headers: {
                    'X-Student-CCCD': studentData.cccd,
                    'Content-Type': 'application/json'
                }
            });
            const res = await response.json();
            console.log('[MobileClassesModule] Enroll response:', res);

            if (res?.success) {
                success(res.message || 'Đăng ký thành công! Vui lòng chờ Admin duyệt.');
                setSelectedRegisterClass(null);
                loadMyClasses();
                loadOpenClasses();
            } else {
                throw new Error(res?.error || res?.message || 'Đăng ký thất bại');
            }
        } catch (err) {
            error(err.message || 'Lỗi kết nối');
        }
    };

    // Get registered class IDs
    const registeredClassIds = myClasses.map((c) => c.id);

    // Filtered my classes
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

    // Stats
    const totalClasses = myClasses.length;
    const activeClasses = myClasses.filter((c) => ['studying', 'approved'].includes(c.registration?.status)).length;
    const completedClasses = myClasses.filter((c) => ['completed', 'certified'].includes(c.registration?.status)).length;

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="bg-slate-50 min-h-screen pb-28">
            {/* Tab Switcher */}
            <div className="bg-white border-b border-slate-100 px-4 sticky z-20 -mx-4" style={{ top: 'var(--mb-header-height)' }}>
                <div className="flex gap-1 p-1.5 bg-slate-100 rounded-xl my-3">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-black transition-all ${activeTab === tab.id
                                    ? 'bg-white text-violet-700 shadow-sm'
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

            {/* TAB: My Classes */}
            {activeTab === 'my-classes' && (
                <>
                    {/* Stats Header */}
                    <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700 px-4 pt-5 pb-6 -mx-4" style={{ overflow: 'clip' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-white/20 border border-white/30 rounded-2xl">
                                <BookOpen size={22} className="text-white" />
                            </div>
                            <div>
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Quản lý</p>
                                <h2 className="text-xl font-black text-white">Lớp học của tôi</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-3 text-center">
                                <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-0.5">Tổng lớp</p>
                                <p className="text-2xl font-black text-white tracking-tight">{totalClasses}</p>
                            </div>
                            <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-3 text-center">
                                <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-0.5">Đang học</p>
                                <p className="text-2xl font-black text-white tracking-tight">{activeClasses}</p>
                            </div>
                            <div className="bg-white/15 border border-white/25 rounded-2xl px-3 py-3 text-center">
                                <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-0.5">Hoàn thành</p>
                                <p className="text-2xl font-black text-white tracking-tight">{completedClasses}</p>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="px-4 py-3 bg-white shadow-sm border-b border-slate-100 sticky z-10 -mx-4 " style={{ top: 'var(--mb-header-height)' }}>
                        <div className="flex gap-2 mb-2">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm lớp..."
                                    value={mySearchTerm}
                                    onChange={(e) => setMySearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 ${showFilters ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                            >
                                <Filter size={16} />
                            </button>
                            <button
                                onClick={loadMyClasses}
                                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 flex items-center"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        {showFilters && (
                            <div className="mt-2 p-2.5 bg-slate-50 rounded-xl">
                                <div className="flex gap-1.5 flex-wrap">
                                    {['all', 'active', 'completed', 'pending'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === status
                                                ? 'bg-green-600 text-white shadow-sm'
                                                : 'bg-white text-slate-600 border border-slate-200'
                                                }`}
                                        >
                                            {status === 'all' && 'Tất cả'}
                                            {status === 'active' && 'Đang học'}
                                            {status === 'completed' && 'Hoàn thành'}
                                            {status === 'pending' && 'Chờ duyệt'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-slate-500 font-medium mt-1.5">
                            {filteredMyClasses.length}/{myClasses.length} lớp
                        </p>
                    </div>

                    {/* Class List */}
                    <div className="px-4 py-4 -mx-4">
                        {myLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-green-600 border-t-transparent" />
                                <p className="text-sm text-slate-500 font-medium">Đang tải...</p>
                            </div>
                        ) : filteredMyClasses.length > 0 ? (
                            <div className="space-y-3">
                                {filteredMyClasses.map((cls) => (
                                    <MyClassCard key={cls.id} cls={cls} onClick={setSelectedClass} />
                                ))}
                            </div>
                        ) : myClasses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 opacity-60">
                                <BookOpen size={48} className="text-slate-300 mb-3" />
                                <p className="text-sm text-slate-500 font-medium mb-1">Chưa có lớp học</p>
                                <p className="text-xs text-slate-400 text-center px-4">
                                    Bạn chưa đăng ký lớp học nào. Chuyển sang tab "Đăng ký lớp" để đăng ký.
                                </p>
                                <button
                                    onClick={() => setActiveTab('register')}
                                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Đăng ký lớp ngay
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 opacity-60">
                                <BookOpen size={48} className="text-slate-300 mb-3" />
                                <p className="text-sm text-slate-500 font-medium">Không tìm thấy lớp học</p>
                                {mySearchTerm && (
                                    <button onClick={() => setMySearchTerm('')} className="mt-3 text-sm text-green-600 font-medium">
                                        Xóa bộ lọc
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TAB: Register Classes */}
            {activeTab === 'register' && (
                <>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 pt-4 pb-10 -mx-4 rounded-b-[2rem] shadow-lg" style={{ overflow: 'clip' }}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white ">
                                    <GraduationCap size={20} />
                                </div>
                                <div>
                                    <p className="text-white/80 text-xs">Chào mừng,</p>
                                    <h1 className="text-white text-lg font-bold">{studentData?.ho_ten || 'Học viên'}</h1>
                                </div>
                            </div>
                            <button
                                onClick={loadOpenClasses}
                                className="p-2 rounded-full bg-white/20 text-white active:scale-95 "
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm lớp học..."
                                value={registerSearchTerm}
                                onChange={(e) => setRegisterSearchTerm(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 "
                            />
                        </div>
                    </div>

                    {/* Class List */}
                    <div className="px-4 -mt-6">
                        {registerLoading ? (
                            <div className="py-20 text-center">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-slate-500 text-sm">Đang tải danh sách lớp...</p>
                            </div>
                        ) : filteredOpenClasses.length > 0 ? (
                            <div>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <h3 className="font-bold text-slate-800">Lớp đang mở đăng ký</h3>
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                        {filteredOpenClasses.length} lớp
                                    </span>
                                </div>
                                <div className="space-y-3">
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
                            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100 ">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Chưa có lớp học nào</h3>
                                <p className="text-slate-500 text-sm">
                                    Hiện tại chưa có lớp học nào đang mở đăng ký. Vui lòng quay lại sau.
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Detail Sheet for My Classes */}
            {selectedClass && <ClassDetailSheet cls={selectedClass} onClose={() => setSelectedClass(null)} />}

            {/* Confirm Register Sheet */}
            <ConfirmRegisterSheet
                isOpen={!!selectedRegisterClass}
                onClose={() => setSelectedRegisterClass(null)}
                classItem={selectedRegisterClass}
                onConfirm={handleRegister}
                studentData={studentData}
            />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
        </PullToRefreshWrapper>
    );
}
