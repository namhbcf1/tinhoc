// @ts-nocheck
import { useState, useEffect } from 'react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { BookOpen, Calendar, MapPin, ChevronRight, Video, Loader2, CheckCircle2 } from 'lucide-react';
import { formatDateVN } from '../../../utils/dateUtils';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { useToast } from '../../../components/ui/ToastContainer';

export default function MobileMyClassesModule() {
    const { success, error } = useToast();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | number | null>(null);
    const [joinedIds, setJoinedIds] = useState<Set<string | number>>(new Set());

    useEffect(() => {
        loadClasses();
    }, []);
    useAdminAutoRefresh(() => loadClasses(), { minIntervalMs: 15000 });

    const loadClasses = async () => {
        setLoading(true);
        try {
            const response = await api.cachedRequest(
                '/teachers/my-classes',
                { method: 'GET', tokenType: 'admin' },
                { ttlMs: 3 * 60 * 1000 }
            );
            if (response?.success && Array.isArray(response.data)) {
                setClasses(response.data);
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinClass = async (cls) => {
        const clsKey = cls.online_class_id || cls.class_id || cls.id;
        const examId = cls.source_exam_schedule_id;
        const meetLink = cls.meet_link;

        if (examId) {
            setJoiningId(clsKey);
            try {
                const today = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const sessionDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                // Lấy giờ từ schedule_time nếu có, VD: "08:00-10:00"
                let startTime = `${pad(today.getHours())}:${pad(today.getMinutes())}`;
                let endTime = `${pad(today.getHours() + 2)}:00`;
                if (cls.schedule_time && cls.schedule_time.includes('-')) {
                    const [s, e] = cls.schedule_time.split('-').map((t) => t.trim());
                    startTime = s;
                    endTime = e;
                }

                await api.createExamLearningSession(examId, {
                    session_date: sessionDate,
                    start_time: startTime,
                    end_time: endTime,
                    note: 'Tự động tạo khi vào lớp',
                });
                success('Đã ghi điểm danh hôm nay ✓');
                setJoinedIds((prev) => new Set([...prev, clsKey]));
            } catch (err: any) {
                if (err?.status === 409 || String(err?.message).includes('đã có')) {
                    setJoinedIds((prev) => new Set([...prev, clsKey]));
                } else {
                    error('Không thể ghi điểm danh: ' + (err?.message || ''));
                }
            } finally {
                setJoiningId(null);
            }
        }

        if (meetLink) {
            window.open(meetLink, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <PullToRefreshWrapper onRefresh={loadClasses}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
                {/* Header summary */}
                <div
                    className="mx-4 mt-3 mb-4 rounded-2xl p-4"
                    style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-bold text-base">Lớp học của tôi</h3>
                            <p className="text-orange-200 text-xs font-medium mt-0.5">
                                {loading ? '...' : `Đang phụ trách ${classes.length} lớp`}
                            </p>
                        </div>
                        <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            <BookOpen size={20} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="px-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                            <p className="text-xs font-medium text-slate-500">Đang tải lớp học...</p>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <BookOpen size={26} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-semibold text-sm">Chưa có lớp học nào</p>
                        </div>
                    ) : (
                        classes.map((cls) => (
                            <div
                                key={cls.id || cls.class_id}
                                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all"
                            >
                                {/* Color accent top bar */}
                                <div className="h-1" style={{ background: 'linear-gradient(90deg, #f97316, #ea580c)' }} />

                                <div className="p-4 flex items-start gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg text-white"
                                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                                    >
                                        {(cls.ten_lop || cls.class_name || 'L').charAt(0)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight truncate">
                                            {cls.ten_lop || cls.class_name || 'Lớp học'}
                                        </h3>
                                        {cls.ma_lop && (
                                            <p className="text-xs text-orange-600 font-medium mt-0.5">#{cls.ma_lop}</p>
                                        )}
                                        <div className="mt-2 space-y-1">
                                            {cls.ngay_bat_dau && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Calendar size={12} className="text-orange-400" />
                                                    <span>Khai giảng: {formatDateVN(cls.ngay_bat_dau)}</span>
                                                </div>
                                            )}
                                            {cls.dia_diem && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <MapPin size={12} className="text-orange-400" />
                                                    <span className="truncate">{cls.dia_diem}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Nút Vào lớp học cho lớp online */}
                                    {(cls.meet_link || cls.source_exam_schedule_id) ? (() => {
                                        const clsKey = cls.online_class_id || cls.class_id || cls.id;
                                        const isJoining = joiningId === clsKey;
                                        const isJoined = joinedIds.has(clsKey);
                                        return (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleJoinClass(cls); }}
                                                disabled={isJoining}
                                                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl font-bold text-xs text-white transition-all active:scale-95"
                                                style={{
                                                    background: isJoined
                                                        ? 'linear-gradient(135deg, #10b981, #059669)'
                                                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                    opacity: isJoining ? 0.7 : 1,
                                                }}
                                            >
                                                {isJoining ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : isJoined ? (
                                                    <CheckCircle2 size={18} />
                                                ) : (
                                                    <Video size={18} />
                                                )}
                                                <span style={{ fontSize: 9 }}>
                                                    {isJoined ? 'Đã vào' : 'Vào lớp'}
                                                </span>
                                            </button>
                                        );
                                    })() : (
                                        <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </PullToRefreshWrapper>
    );
}
