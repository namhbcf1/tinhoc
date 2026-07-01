import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart2,
  BookOpen,
  Calendar,
  CreditCard,
  Home,
  Newspaper,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import api from '../../../services/api';
import '../../../styles/admin/AdminModern.css';
import '../../../styles/admin/AdminDashboard.css';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import AdminStatCard from '../../../components/admin/AdminStatCard';
import AdminQuickActions from '../../../components/admin/AdminQuickActions';
import AdminAlert from '../../../components/admin/AdminAlert';
import AdminBadge from '../../../components/admin/AdminBadge';
import AdminDetailRow from '../../../components/admin/AdminDetailRow';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, clearAdminCache, getAdminCache, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { AdminPageHeader, AdminSummaryPill } from '../shared/AdminPageHeader';


const QUICK_ACTION_ITEMS = [
  { id: 'students',       icon: Users,         label: 'Học viên' },
  { id: 'payments',       icon: CreditCard,    label: 'Học phí' },
  { id: 'exam-schedules', icon: Calendar,      label: 'Lịch thi' },
  { id: 'posts',          icon: Newspaper,     label: 'Bài viết' },
  { id: 'homepage',       icon: Home,          label: 'Trang chủ' },
];

const MOCK_ALERTS = [
  {
    id: 1,
    type: 'warning' as const,
    message: 'Có 5 học viên chưa đóng học phí tháng này.',
    actionLabel: 'Xem',
  },
  {
    id: 2,
    type: 'info' as const,
    message: 'Lịch thi mới được cập nhật cho kỳ thi sắp tới.',
    actionLabel: 'Kiểm tra',
  },
  {
    id: 3,
    type: 'success' as const,
    message: 'Tất cả giáo viên đã điểm danh đầy đủ trong tuần.',
  },
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
      <AdminPageHeader
        icon={BarChart2}
        title="Tổng quan"
        description="Theo dõi nhanh nhịp vận hành của admin và đi thẳng tới các module cần xử lý."
        pills={(
          <>
            <AdminSummaryPill>Học viên {stats?.studentCount ?? '—'}</AdminSummaryPill>
            <AdminSummaryPill>Lớp học {stats?.classCount ?? '—'}</AdminSummaryPill>
            {lastUpdated ? <AdminSummaryPill>Cập nhật {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</AdminSummaryPill> : null}
          </>
        )}
        actions={(
          <button
            onClick={() => {
              clearAdminCache(ADMIN_CACHE_KEYS.dashboardOverview);
              void load(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        )}
      />

      <div className="stats-grid">
        <AdminStatCard icon={<Users size={22} />} label="Học viên" value={stats?.studentCount ?? '—'} tone="primary" />
        <AdminStatCard icon={<BookOpen size={22} />} label="Lớp học" value={stats?.classCount ?? '—'} tone="success" />
        <AdminStatCard icon={<CreditCard size={22} />} label="Doanh thu" value={formatCurrency(stats?.revenue)} tone="warning" />
        <AdminStatCard icon={<TrendingUp size={22} />} label="Xu hướng" value="Ổn định" tone="info" />
      </div>

      <AdminQuickActions 
        actions={QUICK_ACTION_ITEMS.map(item => ({ ...item, onClick: () => handleNavigate(item.id) }))} 
      />

      <div className="dashboard-overview">
        <AdminDetailRow label="Học viên" value={stats?.studentCount ?? '—'} />
        <AdminDetailRow label="Lớp học" value={stats?.classCount ?? '—'} />
        <AdminDetailRow label="Doanh thu" value={formatCurrency(stats?.revenue)} />
        <AdminDetailRow label="Trạng thái" value={<AdminBadge variant="open">Tốt</AdminBadge>} />
        <AdminAlert alerts={MOCK_ALERTS.map(alert => ({
          ...alert,
          onAction: alert.actionLabel ? () => handleNavigate(alert.id === 1 ? 'payments' : 'exam-schedules') : undefined,
        }))} />
      </div>
    </div>
  );
}
