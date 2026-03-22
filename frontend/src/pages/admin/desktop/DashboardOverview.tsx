import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart2,
  BookOpen,
  Calendar,
  CreditCard,
  Home,
  Loader,
  Newspaper,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '../../../services/api';
import '../../../styles/admin/AdminModern.css';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, clearAdminCache, getAdminCache, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

function OverviewStatCard({ icon: Icon, label, value, tone }: {
  icon: any; label: string; value: any; tone: string;
}) {
  return (
    <div className={`admin-stat-card ${tone}`}>
      <div className="admin-stat-header">
        <div className="admin-stat-icon">
          <Icon size={22} />
        </div>
      </div>
      <div className="admin-stat-value">{value ?? '—'}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

function SnapshotRow({ label, value, tone = 'text-slate-900' }: {
  label: string; value: any; tone?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${tone}`}>{value}</span>
    </div>
  );
}

const QUICK_ACTIONS = [
  { id: 'students',       icon: Users,         label: 'Học viên',  bg: 'bg-blue-50',    color: 'text-blue-600' },
  { id: 'payments',       icon: CreditCard,    label: 'Học phí',   bg: 'bg-purple-50',  color: 'text-purple-600' },
  { id: 'exam-schedules', icon: Calendar,       label: 'Lịch thi',  bg: 'bg-amber-50',   color: 'text-amber-600' },
  { id: 'posts',          icon: Newspaper,      label: 'Bài viết',  bg: 'bg-sky-50',     color: 'text-sky-600' },
  { id: 'homepage',       icon: Home,           label: 'Trang chủ', bg: 'bg-emerald-50', color: 'text-emerald-600' },
];

interface DashboardStats {
  studentCount: number | string;
  classCount: number | string;
  revenue: number | string;
}

export default function DashboardOverview({ toast, onNavigate }: { toast?: any; onNavigate?: (id: string) => void }) {
  const cachedOverview = getAdminCache<{ stats: DashboardStats; lastUpdated: string }>(ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_TTL.dashboardOverview);
  const [stats, setStats] = useState<DashboardStats | null>(() => cachedOverview?.stats ?? null);
  const [loading, setLoading] = useState(() => cachedOverview === null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => cachedOverview?.lastUpdated ? new Date(cachedOverview.lastUpdated) : null);

  const load = useCallback(async (isRefresh = false) => {
    const cached = !isRefresh
      ? getAdminCache<{ stats: DashboardStats; lastUpdated: string }>(ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_TTL.dashboardOverview)
      : null;

    if (cached) {
      setStats(cached.stats);
      setLastUpdated(cached.lastUpdated ? new Date(cached.lastUpdated) : null);
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [students, classes, paymentStats] = await Promise.allSettled([
        (api as any).getStudents(1, 0),
        (api as any).getClasses(),
        (api as any).getPaymentStats(),
      ]);

      const studentCount = students.status === 'fulfilled'
        ? (students.value?.total ?? students.value?.data?.length ?? 0)
        : '?';
      const classCount = classes.status === 'fulfilled'
        ? (Array.isArray(classes.value) ? classes.value.length : (classes.value?.data?.length ?? 0))
        : '?';
      const revenue = paymentStats.status === 'fulfilled'
        ? (paymentStats.value?.data?.total_revenue ?? paymentStats.value?.total_revenue ?? 0)
        : '?';

      const nextStats = { studentCount, classCount, revenue };
      const updatedAt = new Date();
      setStats(nextStats);
      setLastUpdated(updatedAt);
      setAdminCache(ADMIN_CACHE_KEYS.dashboardOverview, {
        stats: nextStats,
        lastUpdated: updatedAt.toISOString(),
      });
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
      toast?.error?.('Không thể tải dữ liệu tổng quan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useAdminAutoRefresh(() => load(true), { minIntervalMs: 10000 });

  const formatCurrency = (val: any) => {
    if (val === '?') return '?';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(val);
  };

  const handleNavigate = (tabId: string) => {
    if (onNavigate) {
      onNavigate(tabId);
    } else {
      window.location.hash = tabId;
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <AdminLoadingState
          title="Đang mở bảng điều hành"
          hint="Dữ liệu tổng quan được lấy từ bộ đệm trước, chỉ làm mới khi bạn chủ động hoặc cache hết hạn."
          variant="dashboard"
          accent="emerald"
        />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="flex items-center justify-between gap-4">
          <h1>
            <BarChart2 size={28} />
            Tổng quan
          </h1>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs font-medium text-slate-400">
                {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => {
                clearAdminCache(ADMIN_CACHE_KEYS.dashboardOverview);
                void load(true);
              }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 0 }}>
        <OverviewStatCard icon={Users} label="Học viên" value={stats?.studentCount} tone="primary" />
        <OverviewStatCard icon={BookOpen} label="Lớp học" value={stats?.classCount} tone="success" />
        <OverviewStatCard icon={CreditCard} label="Doanh thu" value={formatCurrency(stats?.revenue)} tone="info" />
        <OverviewStatCard icon={TrendingUp} label="Xu hướng" value="Ổn định" tone="warning" />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 grid-cols-3 md:grid-cols-5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleNavigate(action.id)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-emerald-200 active:scale-95"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
                <Icon size={18} className={action.color} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="admin-card admin-section-stack">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Học viên</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{stats?.studentCount ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lớp học</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{stats?.classCount ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="admin-card admin-section-stack">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Vận hành</h3>
          <SnapshotRow label="Học viên" value={stats?.studentCount ?? '—'} />
          <SnapshotRow label="Lớp học" value={stats?.classCount ?? '—'} />
          <SnapshotRow label="Doanh thu" value={formatCurrency(stats?.revenue)} tone="text-emerald-700" />
          <SnapshotRow label="Trạng thái" value="Tốt" tone="text-blue-700" />
        </div>
      </div>
    </div>
  );
}
