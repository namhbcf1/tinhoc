// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, CreditCard, TrendingUp, Calendar,
    ChevronRight, Newspaper, Home
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, clearAdminCache, getAdminCache, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { MobileAdminHeroCard, MobileAdminSecondaryButton, MobileAdminStatCard } from '../shared/mobileAdminUi';

// ── Helpers ─────────────────────────────────────────────────────────────────
const BLUE = '#3b82f6';

const formatCurrency = (val) => {
    if (val === '?' || val === undefined) return '—';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND',
        notation: 'compact', maximumFractionDigits: 1
    }).format(val);
};

// ── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, iconBg, iconColor }) => (
    <div className="bg-white rounded-xl p-3 flex items-center gap-2.5 border border-slate-100 shadow-sm">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}>
            <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
            <p className="text-[11px] text-slate-500 font-medium leading-none">{label}</p>
            <p className="text-base font-extrabold text-slate-800 leading-tight mt-0.5">{value ?? '—'}</p>
        </div>
    </div>
);

// ── Quick Action ─────────────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, onClick, iconBg, iconColor }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-2 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.3)] active:scale-95 transition-all"
    >
        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] shadow-sm"
            style={{ background: iconBg }}>
            <Icon size={18} style={{ color: iconColor }} />
        </div>
        <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{label}</span>
    </button>
);

// ── Recent Student Row ────────────────────────────────────────────────────────
const StudentRow = ({ student, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-50 active:bg-slate-50 transition-all last:border-b-0 text-left"
    >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
            style={{ background: BLUE }}>
            {(student.ho_ten_full || 'H').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{student.ho_ten_full || 'Chưa có tên'}</p>
            <p className="text-xs text-slate-400 truncate">{student.email || student.cccd || '—'}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{student.created_at ? formatDateVN(student.created_at, true) : ''}</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
    </button>
);

// ── Main Component ───────────────────────────────────────────────────────────
export default function MobileDashboardOverview({ onNavigate }) {
    const cachedOverview = getAdminCache(ADMIN_CACHE_KEYS.mobileDashboardOverview, ADMIN_CACHE_TTL.dashboardOverview);
    const [stats, setStats] = useState(() => cachedOverview?.stats ?? null);
    const [loading, setLoading] = useState(() => cachedOverview === null);
    const [recentStudents, setRecentStudents] = useState(() => cachedOverview?.recentStudents ?? []);

    const load = async (force = false) => {
        const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.mobileDashboardOverview, ADMIN_CACHE_TTL.dashboardOverview);
        if (cached) {
            setStats(cached.stats ?? null);
            setRecentStudents(cached.recentStudents ?? []);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [students, classes, paymentStats] = await Promise.allSettled([
                api.getStudents(100, 0),
                api.getClasses(),
                api.getPaymentStats(),
            ]);

            const studentData = students.status === 'fulfilled' ? students.value : null;
            const studentCount = studentData?.total ?? studentData?.data?.length ?? (students.status === 'fulfilled' ? '?' : '?');
            const classCount = classes.status === 'fulfilled'
                ? (Array.isArray(classes.value) ? classes.value.length : classes.value?.data?.length ?? 0) : '?';
            const revenue = paymentStats.status === 'fulfilled'
                ? (paymentStats.value?.data?.total_revenue ?? paymentStats.value?.total_revenue ?? 0) : '?';
            // Lấy 5 học viên đăng ký gần nhất từ data đã load
            const allStudents = studentData?.data ?? [];
            const recent = [...allStudents]
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                .slice(0, 5);

            setStats({ studentCount, classCount, revenue });
            setRecentStudents(recent);
            setAdminCache(ADMIN_CACHE_KEYS.mobileDashboardOverview, {
                stats: { studentCount, classCount, revenue },
                recentStudents: recent,
            });
        } catch (err) {
            console.error('Failed to load dashboard stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);
    useAdminAutoRefresh(() => load(true), { minIntervalMs: 10000 });

    return (
        <PullToRefreshWrapper onRefresh={() => {
            clearAdminCache(ADMIN_CACHE_KEYS.mobileDashboardOverview);
            return load(true);
        }}>
            <div style={{ paddingBottom: 'calc(var(--mb-bottom-nav-height, 70px) + 12px)' }}>
                <MobileAdminHeroCard
                    eyebrow="Tổng quan"
                    icon={TrendingUp}
                    tone="blue"
                    title="Admin mobile"
                    description="Nhìn nhanh số liệu, truy cập nhanh module quan trọng và nắm được học viên mới ngay trên một hero thống nhất hơn với desktop."
                    actions={(
                        <MobileAdminSecondaryButton onClick={() => {
                            clearAdminCache(ADMIN_CACHE_KEYS.mobileDashboardOverview);
                            void load(true);
                        }} className="px-3.5">
                            <TrendingUp size={16} />
                            Làm mới
                        </MobileAdminSecondaryButton>
                    )}
                    footer={<span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
                />

                <div className="px-4 grid grid-cols-2 gap-2 mb-3">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl p-3 h-14 animate-pulse border border-slate-100" />
                        ))
                    ) : (
                        <>
                            <MobileAdminStatCard label="Học viên" value={stats?.studentCount} tone="blue" />
                            <MobileAdminStatCard label="Lớp học" value={stats?.classCount} tone="emerald" />
                            <MobileAdminStatCard label="Doanh thu" value={formatCurrency(stats?.revenue)} tone="violet" />
                            <MobileAdminStatCard label="Hoạt động" value="Live" tone="amber" />
                        </>
                    )}
                </div>

                {/* ── Quick Actions ── */}
                <div className="px-4 mb-4">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-2 ml-1">
                        Truy cập nhanh
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <QuickAction icon={Users}        label="Học viên"  onClick={() => onNavigate?.('students')}       iconBg="#dbeafe" iconColor="#3b82f6" />
                        <QuickAction icon={BookOpen}     label="Lớp học"   onClick={() => onNavigate?.('classes')}        iconBg="#d1fae5" iconColor="#10b981" />
                        <QuickAction icon={CreditCard}   label="Học phí"   onClick={() => onNavigate?.('payments')}       iconBg="#ede9fe" iconColor="#8b5cf6" />
                        <QuickAction icon={Calendar}     label="Lịch thi"  onClick={() => onNavigate?.('exam-schedules')} iconBg="#fef3c7" iconColor="#f59e0b" />
                        <QuickAction icon={Newspaper}    label="Bài viết"  onClick={() => onNavigate?.('posts')}          iconBg="#e0f2fe" iconColor="#0284c7" />
                        <QuickAction icon={Home}         label="Trang chủ" onClick={() => onNavigate?.('homepage')}       iconBg="#dcfce7" iconColor="#16a34a" />
                    </div>
                </div>

                {/* ── Recent Students ── */}
                <div className="px-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] ml-1">
                            Mới đăng ký
                        </h3>
                        <button
                            onClick={() => onNavigate?.('students')}
                            className="text-xs font-semibold text-blue-600 active:opacity-70"
                        >
                            Xem tất cả
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-14 px-4 flex items-center gap-3 border-b border-slate-50">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
                                        <div className="h-2.5 bg-slate-100 rounded animate-pulse w-1/2" />
                                    </div>
                                </div>
                            ))
                        ) : recentStudents.length > 0 ? (
                            recentStudents.slice(0, 5).map((student) => (
                                <StudentRow
                                    key={student.id}
                                    student={student}
                                    onClick={() => onNavigate?.('students')}
                                />
                            ))
                        ) : (
                            <div className="py-10 text-center text-slate-400 text-sm">
                                Chưa có học viên mới
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </PullToRefreshWrapper>
    );
}
