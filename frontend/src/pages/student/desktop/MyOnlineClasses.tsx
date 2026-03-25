import { useState, useEffect } from 'react';
import { Video, Calendar, Clock, CheckCircle2, Loader2, BookOpen, ExternalLink, Users } from 'lucide-react';
import api from '../../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
};

const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function parseScheduleLabel(rule: string, time: string) {
    if (!rule) return time || '';
    let days = '';
    if (rule === 'DAILY') days = 'Hàng ngày';
    else if (rule.includes(':')) {
        const [, daysStr] = rule.split(':');
        days = (daysStr || '').split(',').map((d: string) => DAYS_VN[parseInt(d)] || d).join(', ');
    }
    return [days, time].filter(Boolean).join(' • ');
}

// ─── Card ─────────────────────────────────────────────────────────────────────
const ClassCard = ({ cls, onJoin, joining, joined }: any) => {
    const meetLink = cls.meet_link || cls.meetLink;
    const schedule = parseScheduleLabel(cls.schedule_rule, cls.schedule_time);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* Top bar */}
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }} />

            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                        {(cls.ten_lop || cls.class_name || 'L').charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-base truncate">{cls.ten_lop || cls.class_name}</h3>
                        {cls.ma_lop && <p className="text-xs text-blue-600 font-medium mt-0.5">#{cls.ma_lop}</p>}

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {schedule && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Clock size={12} className="text-blue-400" />{schedule}
                                </span>
                            )}
                            {cls.ngay_bat_dau && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Calendar size={12} className="text-blue-400" />
                                    Từ {fmtDate(cls.ngay_bat_dau)}
                                </span>
                            )}
                            {cls.teacher_name && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                    <Users size={12} className="text-blue-400" />{cls.teacher_name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nút Vào lớp học */}
                {meetLink && (
                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={() => onJoin(cls)}
                            disabled={joining}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                            style={{
                                background: joined
                                    ? 'linear-gradient(135deg, #10b981, #059669)'
                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)'
                            }}
                        >
                            {joining ? <Loader2 size={16} className="animate-spin" />
                                : joined ? <CheckCircle2 size={16} />
                                    : <Video size={16} />}
                            {joining ? 'Đang ghi điểm danh...'
                                : joined ? 'Đã điểm danh hôm nay ✓'
                                    : 'Vào lớp học →'}
                        </button>
                        <a href={meetLink} target="_blank" rel="noopener noreferrer"
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-colors">
                            <ExternalLink size={16} />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyOnlineClasses({ studentData }: { studentData: any }) {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());
    const [error, setError] = useState('');

    useEffect(() => {
        if (studentData) loadClasses();
    }, [studentData]);

    const loadClasses = async () => {
        setLoading(true);
        try {
            const cccd = studentData?.cccd || studentData?.so_cccd;
            const res = await api.getStudentOnlineClasses({}, cccd);
            const list = res?.data || res?.items || res || [];
            setClasses(Array.isArray(list) ? list.filter((c: any) => c.status === 'active' || !c.status) : []);
        } catch (err: any) {
            setError(err?.message || 'Không thể tải danh sách lớp học');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (cls: any) => {
        const clsId = cls.id || cls.class_id || cls.online_class_id;
        const meetLink = cls.meet_link || cls.meetLink;
        const cccd = studentData?.cccd || studentData?.so_cccd;

        setJoiningId(clsId);
        try {
            await (api as any).recordZoomAttendance(clsId, 'zoom_click', cccd);
            setJoinedIds(prev => new Set([...prev, clsId]));
        } catch (_) {
            // Silent — vẫn mở link dù API lỗi
        } finally {
            setJoiningId(null);
        }
        if (meetLink) window.open(meetLink, '_blank', 'noopener,noreferrer');
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-32" />
            ))}
        </div>
    );

    if (error) return (
        <div className="bg-red-50 text-red-600 rounded-2xl p-5 text-sm font-medium">{error}</div>
    );

    if (classes.length === 0) return (
        <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={30} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-semibold">Bạn chưa tham gia lớp học online nào</p>
            <p className="text-slate-400 text-sm mt-1">Liên hệ giáo viên để được đăng ký lớp</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 font-medium">
                    Đang học <span className="text-blue-600 font-bold">{classes.length}</span> lớp online
                </p>
                <span className="text-xs text-slate-400">Click "Vào lớp học" để tự động điểm danh</span>
            </div>
            {classes.map((cls: any) => {
                const clsId = cls.id || cls.class_id || cls.online_class_id;
                return (
                    <ClassCard
                        key={clsId}
                        cls={cls}
                        onJoin={handleJoin}
                        joining={joiningId === clsId}
                        joined={joinedIds.has(clsId)}
                    />
                );
            })}
        </div>
    );
}
