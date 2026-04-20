import { useState, useEffect } from 'react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { formatDateVN } from '../../../utils/dateUtils';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, BookOpen, X, Video, Loader2, CheckCircle2 } from 'lucide-react';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { useToast } from '../../../components/ui/ToastContainer';
import OverlayPortal from '../../../components/ui/OverlayPortal';

export default function MobileMyScheduleModule() {
    const { success, error } = useToast();
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState(new Date());
    const [selectedSchedule, setSelectedSchedule] = useState(null);
    const [joiningClass, setJoiningClass] = useState(false);
    const [joinedToday, setJoinedToday] = useState<Record<string, boolean>>({});

    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    useEffect(() => {
        loadSchedule();
    }, [selectedWeek]);
    useAdminAutoRefresh(() => loadSchedule(), { minIntervalMs: 15000 });

    const loadSchedule = async () => {
        setLoading(true);
        try {
            const weekStartDate = getWeekStart(selectedWeek);
            const y = weekStartDate.getFullYear();
            const m = String(weekStartDate.getMonth() + 1).padStart(2, '0');
            const d = String(weekStartDate.getDate()).padStart(2, '0');

            const response = await api.cachedRequest(
                `/teachers/schedule?week_start=${y}-${m}-${d}`,
                { method: 'GET', tokenType: 'admin' },
                true
            );

            setSchedule(response?.success && Array.isArray(response.data) ? response.data : []);
        } catch {
            setSchedule([]);
        } finally {
            setLoading(false);
        }
    };

    const changeWeek = (dir) => {
        const d = new Date(selectedWeek);
        d.setDate(d.getDate() + dir * 7);
        setSelectedWeek(d);
    };

    // Tự động tạo session hôm nay rồi mở link
    const handleJoinClass = async (s) => {
        const meetLink = s.meeting_link;
        const examId = s.source_exam_schedule_id;
        const classKey = s.id;

        // Nếu là lớp online có exam_id → tạo session + ghi điểm danh tự động
        if (examId) {
            setJoiningClass(true);
            try {
                const today = new Date();
                const pad = (n) => String(n).padStart(2, '0');
                const sessionDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
                const startTime = s.start_time || `${pad(today.getHours())}:${pad(today.getMinutes())}`;
                const endTime = s.end_time || `${pad(today.getHours() + 2)}:${pad(today.getMinutes())}`;

                await api.createExamLearningSession(examId, {
                    session_date: sessionDate,
                    start_time: startTime,
                    end_time: endTime,
                    note: 'Tự động tạo khi vào lớp',
                });
                success('Đã ghi điểm danh hôm nay ✓');
                setJoinedToday((prev) => ({ ...prev, [classKey]: true }));
            } catch (err: any) {
                // 409 = đã có session hôm nay → vẫn OK
                if (err?.status === 409 || String(err?.message).includes('đã có')) {
                    setJoinedToday((prev) => ({ ...prev, [classKey]: true }));
                } else {
                    error('Không thể ghi điểm danh: ' + (err?.message || ''));
                }
            } finally {
                setJoiningClass(false);
            }
        }

        // Mở link sau khi ghi (hoặc nếu không có exam)
        if (meetLink) {
            window.open(meetLink, '_blank', 'noopener,noreferrer');
        }
    };

    const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weekStart = getWeekStart(selectedWeek);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    return (
        <PullToRefreshWrapper onRefresh={loadSchedule}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
                {/* Week navigator */}
                <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => changeWeek(-1)}
                        className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95 transition-all"
                    >
                        <ChevronLeft size={18} className="text-slate-600" />
                    </button>

                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-800">
                            Tuần từ {formatDateVN(weekStart)}
                        </p>
                        <div className="flex gap-1 justify-center mt-1">
                            <div className="w-6 h-1 rounded-full" style={{ background: '#f97316' }} />
                            <div className="w-2 h-1 rounded-full bg-orange-200" />
                        </div>
                    </div>

                    <button
                        onClick={() => changeWeek(1)}
                        className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center active:scale-95 transition-all"
                    >
                        <ChevronRight size={18} className="text-slate-600" />
                    </button>
                </div>

                <div className="px-4 pt-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                            <p className="text-xs text-slate-500 font-medium">Đang tải lịch học...</p>
                        </div>
                    ) : schedule.length === 0 ? (
                        <div className="text-center py-14">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <CalendarIcon size={26} className="text-slate-300" />
                            </div>
                            <p className="font-semibold text-slate-500 text-sm">Không có lịch học tuần này</p>
                            <p className="text-xs text-slate-400 mt-1">Nghỉ ngơi hoặc chuẩn bị bài giảng nhé!</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {days.map((day, i) => {
                                const daySchedules = schedule.filter((s) => {
                                    const sd = new Date(s.date || s.ngay_hoc);
                                    return sd.toDateString() === day.toDateString();
                                });
                                if (daySchedules.length === 0) return null;

                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i}>
                                        {/* Day header */}
                                        <div className="flex items-center gap-3 mb-2">
                                            <div
                                                className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-sm"
                                                style={{
                                                    background: isToday ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#f8fafc',
                                                    color: isToday ? '#fff' : '#475569'
                                                }}
                                            >
                                                <span className="text-[10px] font-bold leading-none mb-0.5">{weekDays[day.getDay()]}</span>
                                                <span className="text-sm font-bold leading-none">{day.getDate()}</span>
                                            </div>
                                            <p
                                                className="text-sm font-bold"
                                                style={{ color: isToday ? '#f97316' : '#64748b' }}
                                            >
                                                {formatDateVN(day)}{isToday && ' • Hôm nay'}
                                            </p>
                                        </div>

                                        <div className="space-y-2 pl-1">
                                            {daySchedules.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedSchedule(s)}
                                                    className="w-full bg-white rounded-2xl border shadow-sm overflow-hidden active:scale-[0.98] transition-all text-left"
                                                    style={{ borderColor: isToday ? '#fed7aa' : '#f1f5f9' }}
                                                >
                                                    <div
                                                        className="w-full h-1"
                                                        style={{ background: isToday ? 'linear-gradient(90deg, #f97316, #ea580c)' : '#e2e8f0' }}
                                                    />
                                                    <div className="flex items-center gap-3 p-3.5">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                                            style={{ background: isToday ? '#fff7ed' : '#f8fafc' }}
                                                        >
                                                            <BookOpen size={18} style={{ color: isToday ? '#f97316' : '#94a3b8' }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                                {s.class_name || s.ten_lop || 'Lớp học'}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-0.5">
                                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                    <Clock size={11} style={{ color: '#f97316' }} />
                                                                    {s.start_time || s.gio_bat_dau} - {s.end_time || s.gio_ket_thuc}
                                                                </span>
                                                                {s.location && (
                                                                    <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                                                        <MapPin size={11} className="text-orange-400" />
                                                                        {s.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Detail bottom sheet */}
                {selectedSchedule && (
                    <OverlayPortal>
                        <div
                            className="fixed inset-0 z-[100000] flex items-end"
                            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                            onClick={() => setSelectedSchedule(null)}
                        >
                            <div
                                className="bg-white w-full rounded-t-3xl shadow-2xl overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 bg-slate-200 rounded-full" />
                            </div>

                            <div className="px-5 pb-8 pt-2">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl text-white"
                                            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                                        >
                                            {(selectedSchedule.class_name || 'L').charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">
                                                {selectedSchedule.class_name || selectedSchedule.ten_lop || 'Lớp học'}
                                            </h3>
                                            <span
                                                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: '#fff7ed', color: '#f97316' }}
                                            >
                                                Chi tiết buổi học
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedSchedule(null)}
                                        className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"
                                    >
                                        <X size={18} className="text-slate-500" />
                                    </button>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                            <Clock size={15} style={{ color: '#f97316' }} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Thời gian</p>
                                            <p className="text-sm font-bold text-slate-800">
                                                {selectedSchedule.start_time || selectedSchedule.gio_bat_dau} – {selectedSchedule.end_time || selectedSchedule.gio_ket_thuc}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedSchedule.location && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                                <MapPin size={15} style={{ color: '#f97316' }} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium">Địa điểm</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedSchedule.location}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Nút Vào lớp học */}
                                {(selectedSchedule.meeting_link || selectedSchedule.source_exam_schedule_id) && (
                                    <button
                                        onClick={() => handleJoinClass(selectedSchedule)}
                                        disabled={joiningClass}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] mb-3"
                                        style={{
                                            background: joinedToday[selectedSchedule.id]
                                                ? 'linear-gradient(135deg, #10b981, #059669)'
                                                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                            color: '#fff',
                                            opacity: joiningClass ? 0.7 : 1,
                                        }}
                                    >
                                        {joiningClass ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : joinedToday[selectedSchedule.id] ? (
                                            <CheckCircle2 size={18} />
                                        ) : (
                                            <Video size={18} />
                                        )}
                                        {joiningClass
                                            ? 'Đang ghi điểm danh...'
                                            : joinedToday[selectedSchedule.id]
                                                ? 'Đã điểm danh hôm nay ✓'
                                                : 'Vào lớp học →'}
                                    </button>
                                )}
                            </div>
                            </div>
                        </div>
                    </OverlayPortal>
                )}
            </div>
        </PullToRefreshWrapper>
    );
}
