import { useState, useEffect } from 'react';
import { Video, Calendar, Clock, CheckCircle2, Loader2, BookOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

const DAYS_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d || '—'; } };
function parseScheduleLabel(rule: string, time: string) {
    if (!rule && !time) return '';
    let days = '';
    if (rule === 'DAILY') days = 'Hàng ngày';
    else if (rule?.includes(':')) {
        const [, daysStr] = rule.split(':');
        days = (daysStr || '').split(',').map((d: string) => DAYS_VN[parseInt(d)] || d).join(', ');
    }
    return [days, time].filter(Boolean).join(' • ');
}

export default function MobileMyOnlineClassesModule({ studentData }: { studentData: any }) {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<number | null>(null);
    const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => { if (studentData) load(); }, [studentData]);

    const load = async () => {
        setLoading(true);
        try {
            const cccd = studentData?.cccd || studentData?.so_cccd;
            const res = await api.getStudentOnlineClasses({}, cccd);
            const list = res?.data || res?.items || res || [];
            setClasses(Array.isArray(list) ? list.filter((c: any) => c.status === 'active' || !c.status) : []);
        } catch (_) { } finally { setLoading(false); }
    };

    const handleJoin = async (cls: any) => {
        const clsId = cls.id || cls.class_id;
        const meetLink = cls.meet_link || cls.meetLink;
        const cccd = studentData?.cccd || studentData?.so_cccd;

        setJoiningId(clsId);
        try {
            await (api as any).recordZoomAttendance(clsId, 'zoom_click', cccd);
            setJoinedIds(prev => new Set([...prev, clsId]));
        } catch (_) { /* silent */ } finally { setJoiningId(null); }
        if (meetLink) window.open(meetLink, '_blank', 'noopener,noreferrer');
    };

    return (
        <PullToRefreshWrapper onRefresh={load}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 16px)' }}>
                {/* Header */}
                <div className="mx-4 mt-3 mb-4 rounded-2xl p-4"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-bold text-base">Lớp học online</h3>
                            <p className="text-blue-200 text-xs font-medium mt-0.5">
                                {loading ? '...' : `${classes.length} lớp đang học`}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <Video size={20} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="px-4 space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            <p className="text-xs font-medium text-slate-500">Đang tải lớp học...</p>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <BookOpen size={26} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-semibold text-sm">Chưa có lớp học online</p>
                            <p className="text-slate-400 text-xs mt-1">Liên hệ giáo viên để được đăng ký</p>
                        </div>
                    ) : classes.map((cls: any) => {
                        const clsId = cls.id || cls.class_id;
                        const meetLink = cls.meet_link || cls.meetLink;
                        const isJoining = joiningId === clsId;
                        const isJoined = joinedIds.has(clsId);
                        const isExpanded = expandedId === clsId;
                        const schedule = parseScheduleLabel(cls.schedule_rule, cls.schedule_time);

                        return (
                            <div key={clsId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="h-1" style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }} />

                                <div className="p-4">
                                    {/* Tên lớp + toggle */}
                                    <button className="w-full flex items-center gap-3 text-left"
                                        onClick={() => setExpandedId(isExpanded ? null : clsId)}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black"
                                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                            {(cls.ten_lop || cls.class_name || 'L').charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{cls.ten_lop || cls.class_name}</p>
                                            {cls.ma_lop && <p className="text-xs text-blue-500 font-medium">#{cls.ma_lop}</p>}
                                        </div>
                                        {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
                                            : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                                    </button>

                                    {/* Detail */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                            {schedule && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Clock size={12} className="text-blue-400" />{schedule}
                                                </div>
                                            )}
                                            {cls.ngay_bat_dau && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Calendar size={12} className="text-blue-400" />
                                                    Khai giảng: {fmtDate(cls.ngay_bat_dau)}
                                                </div>
                                            )}
                                            {cls.teacher_name && (
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <Users size={12} className="text-blue-400" />
                                                    Giáo viên: {cls.teacher_name}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Nút Vào lớp */}
                                    {meetLink && (
                                        <button onClick={() => handleJoin(cls)} disabled={isJoining}
                                            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                                            style={{
                                                background: isJoined
                                                    ? 'linear-gradient(135deg, #10b981, #059669)'
                                                    : 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                            }}>
                                            {isJoining ? <Loader2 size={16} className="animate-spin" />
                                                : isJoined ? <CheckCircle2 size={16} />
                                                    : <Video size={16} />}
                                            {isJoining ? 'Đang ghi điểm danh...'
                                                : isJoined ? 'Đã điểm danh hôm nay ✓'
                                                    : 'Vào lớp học →'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </PullToRefreshWrapper>
    );
}
