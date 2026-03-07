import React, { useState, useEffect } from 'react';
import {
    ClipboardCheck, BookOpen, Calendar, CreditCard, ChevronRight,
    Clock, GraduationCap
} from 'lucide-react';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

export default function StudentDashboardOverview({ studentData, onNavigate }) {
    const [stats, setStats] = useState({ classes: 0, exams: 0, debt: 0 });
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const cccd = studentData?.cccd || localStorage.getItem('student_cccd');
            if (!cccd) return;

            const [regsRes, examsRes, paymentsRes] = await Promise.allSettled([
                api.request(`/registrations?student_cccd=${cccd}`, { method: 'GET' }),
                api.request(`/exam-schedules/student?cccd=${cccd}`, { method: 'GET' }),
                api.request(`/payments/student?cccd=${cccd}`, { method: 'GET' }),
            ]);

            const regs = regsRes.value?.data || [];
            const exams = examsRes.value?.data || [];
            const payments = paymentsRes.value?.data || [];

            const activeClasses = regs.filter(r => ['approved', 'studying', 'active'].includes(r.status)).length;
            const debt = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

            const now = new Date();
            const upcoming = exams
                .filter(e => new Date(e.exam_date) >= now)
                .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
                .slice(0, 3);

            setStats({ classes: activeClasses, exams: exams.length, debt });
            setUpcomingExams(upcoming);
        } catch {
            // Fail silently
        } finally {
            setLoading(false);
        }
    };

    const displayName = studentData?.ho_ten_full || studentData?.fullName || 'Học viên';
    const firstName = displayName.split(' ').pop();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

    const formatCurrencyShort = (val) => {
        if (!val) return '0';
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
        return val.toString();
    };

    const statItems = [
        { label: 'Lớp đang học', value: stats.classes, color: 'emerald', icon: BookOpen, tab: 'my-classes' },
        { label: 'Lịch thi', value: stats.exams, color: 'amber', icon: ClipboardCheck, tab: 'exams' },
        { label: 'Công nợ', value: stats.debt > 0 ? formatCurrencyShort(stats.debt) : '0', color: stats.debt > 0 ? 'red' : 'green', icon: CreditCard, tab: 'payment' },
    ];

    const quickActions = [
        { label: 'Lịch thi', icon: ClipboardCheck, tab: 'exams', color: '#10b981' },
        { label: 'Lớp học', icon: BookOpen, tab: 'my-classes', color: '#059669' },
        { label: 'Lịch học', icon: Calendar, tab: 'schedule', color: '#06b6d4' },
        { label: 'Học phí', icon: CreditCard, tab: 'payment', color: '#f59e0b' },
        { label: 'Học tập', icon: GraduationCap, tab: 'exams', color: '#8b5cf6' },
    ];

    return (
        <PullToRefreshWrapper onRefresh={loadStats}>
            <div className="pb-4">
                {/* Hero greeting */}
                <div
                    className="mx-4 mt-3 mb-4 rounded-2xl p-4 overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                >
                    <div
                        className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10"
                        style={{ background: 'white', transform: 'translate(20%, -30%)' }}
                    />
                    <div
                        className="absolute bottom-0 left-20 w-20 h-20 rounded-full opacity-10"
                        style={{ background: 'white', transform: 'translateY(40%)' }}
                    />
                    <div className="relative">
                        <p className="text-emerald-200 text-xs font-medium mb-1">{greeting} 👋</p>
                        <h2 className="text-white text-xl font-bold mb-1">{firstName}</h2>
                        <p className="text-emerald-200 text-xs">
                            {studentData?.cccd ? `CCCD: ${studentData.cccd}` : 'Chào mừng trở lại'}
                        </p>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="px-4 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                        {statItems.map((s) => {
                            const Icon = s.icon;
                            const colorMap = {
                                emerald: { bg: '#d1fae5', icon: '#10b981', text: '#059669' },
                                amber:  { bg: '#fef3c7', icon: '#f59e0b', text: '#d97706' },
                                red:    { bg: '#fee2e2', icon: '#ef4444', text: '#dc2626' },
                                green:  { bg: '#d1fae5', icon: '#10b981', text: '#059669' },
                                purple: { bg: '#f5f3ff', icon: '#8b5cf6', text: '#7c3aed' },
                            };
                            const c = colorMap[s.color] || colorMap.emerald;
                            return (
                                <button
                                    key={s.tab}
                                    onClick={() => onNavigate(s.tab)}
                                    className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-sm flex items-center gap-3 active:scale-[0.97] transition-all text-left"
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: c.bg }}
                                    >
                                        <Icon size={18} style={{ color: c.icon }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xl font-extrabold leading-none mb-0.5" style={{ color: s.color === 'red' && s.value === '0' ? '#10b981' : c.text }}>
                                            {loading ? '—' : s.value}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium leading-tight">{s.label}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Quick actions */}
                <div className="px-4 mb-4">
                    <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-sm font-bold text-slate-800">Truy cập nhanh</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {quickActions.map((a) => {
                            const Icon = a.icon;
                            return (
                                <button
                                    key={a.tab}
                                    onClick={() => onNavigate(a.tab)}
                                    className="bg-white rounded-xl py-3 px-2 border border-slate-100 shadow-sm flex flex-col items-center gap-1.5 active:scale-95 transition-all"
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{ background: a.color + '15' }}
                                    >
                                        <Icon size={17} style={{ color: a.color }} />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 leading-none">{a.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming exams */}
                <div className="px-4">
                    <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-sm font-bold text-slate-800">Kỳ thi sắp tới</h3>
                        <button
                            onClick={() => onNavigate('exams')}
                            className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"
                        >
                            Xem tất cả <ChevronRight size={13} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : upcomingExams.length === 0 ? (
                        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm text-center">
                            <ClipboardCheck size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm text-slate-500 font-medium">Không có kỳ thi nào sắp tới</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcomingExams.map((exam) => {
                                const examDate = new Date(exam.exam_date);
                                const now = new Date();
                                const days = Math.ceil((examDate - now) / 86400000);
                                const isUrgent = days <= 3;
                                return (
                                    <button
                                        key={exam.id}
                                        onClick={() => onNavigate('exams')}
                                        className="w-full bg-white rounded-xl p-3.5 border shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all text-left"
                                        style={{ borderColor: isUrgent ? '#fecaca' : '#f1f5f9' }}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white"
                                            style={{ background: isUrgent ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)' }}
                                        >
                                            <span className="text-xs font-bold leading-none">{examDate.getDate()}</span>
                                            <span className="text-[9px] font-medium leading-none opacity-80">
                                                Th{examDate.getMonth() + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{exam.exam_name || 'Kỳ thi'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                <Clock size={10} />
                                                {examDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                {exam.location && ` · ${exam.location}`}
                                            </p>
                                        </div>
                                        <span
                                            className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                                            style={{
                                                background: isUrgent ? '#fee2e2' : '#d1fae5',
                                                color: isUrgent ? '#dc2626' : '#059669'
                                            }}
                                        >
                                            {days === 0 ? 'Hôm nay' : `${days}n`}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </PullToRefreshWrapper>
    );
}
