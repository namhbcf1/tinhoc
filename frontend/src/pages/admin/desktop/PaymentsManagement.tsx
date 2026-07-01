// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  CreditCard, Search, Filter, Check, X, Eye, Clock, RefreshCw,
  DollarSign, AlertCircle, CheckCircle, XCircle, Calendar,
  Download, ChevronLeft, ChevronRight, Receipt, Wallet, PieChart
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL,
  clearAdminCache,
  getAdminCache,
  setAdminCache,
} from '../shared/admin-cache';
import '../../../styles/admin/AdminModern.css';
import { AdminPageHeader, AdminSummaryPill } from '../shared/AdminPageHeader';

const EMPTY_PAYMENT_STATS = { total: 0, confirmed: 0, pending: 0, rejected: 0, revenue: 0 };

function buildPaymentStats(data) {
  const confirmed = data.filter((payment) => payment.status === 'confirmed' || payment.status === 'paid');
  const pending = data.filter((payment) => payment.status === 'pending');
  const rejected = data.filter((payment) => payment.status === 'rejected');

  return {
    total: data.length,
    confirmed: confirmed.length,
    pending: pending.length,
    rejected: rejected.length,
    revenue: confirmed.reduce((sum, payment) => sum + (payment.amount || 0), 0),
  };
}

export default function PaymentsManagement({ toast }) {
  const cachedPayments = getAdminCache(ADMIN_CACHE_KEYS.payments, ADMIN_CACHE_TTL.payments) || [];
  const cachedClasses = getAdminCache(ADMIN_CACHE_KEYS.paymentClasses, ADMIN_CACHE_TTL.classes) || [];

  const [payments, setPayments] = useState(cachedPayments);
  const [classes, setClasses] = useState(cachedClasses);
  const [loading, setLoading] = useState(cachedPayments.length === 0);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(cachedPayments.length ? buildPaymentStats(cachedPayments) : EMPTY_PAYMENT_STATS);

  useEffect(() => { loadPayments(); loadClasses(); }, []);

  const loadPayments = async ({ force = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.payments, ADMIN_CACHE_TTL.payments);
      if (cached) {
        setPayments(cached);
        setStats(buildPaymentStats(cached));
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.getPayments(1000, 0);
      const data = Array.isArray(response.data) ? response.data : [];
      setPayments(data);
      setStats(buildPaymentStats(data));
      setAdminCache(ADMIN_CACHE_KEYS.payments, data);
    } catch {
      setPayments([]);
      setStats(EMPTY_PAYMENT_STATS);
    } finally { setLoading(false); }
  };

  const loadClasses = async ({ force = false } = {}) => {
    if (!force) {
      const cached = getAdminCache(ADMIN_CACHE_KEYS.paymentClasses, ADMIN_CACHE_TTL.classes);
      if (cached) {
        setClasses(cached);
        return;
      }
    }

    try {
      const response = await api.getClasses();
      const nextClasses = response.data || [];
      setClasses(nextClasses);
      setAdminCache(ADMIN_CACHE_KEYS.paymentClasses, nextClasses);
    } catch { }
  };

  const handleConfirm = async (paymentId) => {
    try {
      await api.confirmPayment(paymentId);
      toast?.success('Xác nhận thanh toán thành công!');
      clearAdminCache(ADMIN_CACHE_KEYS.payments);
      loadPayments({ force: true });
    } catch (error) { toast?.error('Lỗi: ' + error.message); }
  };

  const handleReject = async (paymentId) => {
    if (!confirm('Từ chối thanh toán này?')) return;
    try {
      await api.rejectPayment(paymentId);
      toast?.success('Đã từ chối thanh toán');
      clearAdminCache(ADMIN_CACHE_KEYS.payments);
      loadPayments({ force: true });
    } catch (error) { toast?.error('Lỗi: ' + error.message); }
  };

  const formatCurrency = (value) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + ' tỷ';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + ' tr';
    if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
    return value?.toLocaleString('vi-VN') || '0';
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { class: 'warning', icon: <Clock size={14} />, text: 'Chờ xử lý' },
      confirmed: { class: 'success', icon: <CheckCircle size={14} />, text: 'Đã xác nhận' },
      paid: { class: 'success', icon: <CheckCircle size={14} />, text: 'Đã thanh toán' },
      rejected: { class: 'danger', icon: <XCircle size={14} />, text: 'Từ chối' }
    };
    const s = map[status] || { class: 'default', text: status };
    return <span className={`admin-badge ${s.class}`}>{s.icon} {s.text}</span>;
  };

  const filteredPayments = payments.filter(p => {
    if (filterClass && p.class_id !== parseInt(filterClass)) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (paymentSearch.trim()) {
      const q = paymentSearch.toLowerCase();
      const name = (p.ho_ten_full || '').toLowerCase();
      const cccd = (p.cccd || '').toLowerCase();
      if (!name.includes(q) && !cccd.includes(q)) return false;
    }
    return true;
  });

  const pageSize = 15;
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredPayments.length / pageSize);

  return (
    <div className="admin-page">
      <AdminPageHeader
        icon={CreditCard}
        title="Thanh toán"
        description="Xác nhận học phí, đọc nhanh trạng thái xử lý và bám theo doanh thu trên một màn hình vận hành gọn hơn."
        pills={(
          <>
            <AdminSummaryPill>Tổng thu {formatCurrency(stats.revenue)}</AdminSummaryPill>
            <AdminSummaryPill>Chờ xử lý {stats.pending}</AdminSummaryPill>
          </>
        )}
        actions={(
          <button
            onClick={() => {
              clearAdminCache(ADMIN_CACHE_KEYS.payments);
              clearAdminCache(ADMIN_CACHE_KEYS.paymentClasses);
              loadPayments({ force: true });
              loadClasses({ force: true });
            }}
            className="admin-btn admin-btn-outline"
            style={{ padding: '10px 16px' }}
          >
            <RefreshCw size={18} /> Làm mới
          </button>
        )}
      />

      {/* Stats Dashboard */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="admin-stat-card success" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('')}>
          <div className="admin-stat-header">
            <div className="admin-stat-icon"><DollarSign size={24} /></div>
          </div>
          <div className="admin-stat-value">{formatCurrency(stats.revenue)}</div>
          <div className="admin-stat-label">Tổng doanh thu</div>
        </div>

        <div className="admin-stat-card info" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('confirmed')}>
          <div className="admin-stat-header"><div className="admin-stat-icon"><CheckCircle size={24} /></div></div>
          <div className="admin-stat-value">{stats.confirmed}</div>
          <div className="admin-stat-label">Đã xác nhận</div>
        </div>

        <div className="admin-stat-card warning" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('pending')}>
          <div className="admin-stat-header"><div className="admin-stat-icon"><Clock size={24} /></div></div>
          <div className="admin-stat-value">{stats.pending}</div>
          <div className="admin-stat-label">Chờ xử lý</div>
        </div>

        <div className="admin-stat-card danger" style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('rejected')}>
          <div className="admin-stat-header"><div className="admin-stat-icon"><XCircle size={24} /></div></div>
          <div className="admin-stat-value">{stats.rejected}</div>
          <div className="admin-stat-label">Từ chối</div>
        </div>
      </div>

      {/* Visual Progress */}
      <div className="admin-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[16px] font-black text-[var(--admin-ink)]">
            <PieChart size={18} className="text-[var(--admin-champagne)]" /> Phân bổ trạng thái
          </h3>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-[rgba(239,227,209,0.82)] p-[2px]">
          <div className="rounded-full bg-[linear-gradient(90deg,#1d6f5f,#3b9b86)] transition-[width] duration-500" style={{ width: `${(stats.confirmed / (stats.total || 1)) * 100}%` }} />
          <div className="rounded-full bg-[linear-gradient(90deg,#c8a96a,#dcc48e)] transition-[width] duration-500" style={{ width: `${(stats.pending / (stats.total || 1)) * 100}%` }} />
          <div className="rounded-full bg-[linear-gradient(90deg,#9f3f46,#b85b5b)] transition-[width] duration-500" style={{ width: `${(stats.rejected / (stats.total || 1)) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-[13px] font-bold text-[var(--admin-text-muted)]">
          <div className="admin-subtle-pill normal-case tracking-normal"><span className="h-3 w-3 rounded bg-[var(--admin-primary)]" /> Xác nhận ({Math.round((stats.confirmed / (stats.total || 1)) * 100)}%)</div>
          <div className="admin-subtle-pill normal-case tracking-normal"><span className="h-3 w-3 rounded bg-[var(--admin-champagne)]" /> Chờ ({Math.round((stats.pending / (stats.total || 1)) * 100)}%)</div>
          <div className="admin-subtle-pill normal-case tracking-normal"><span className="h-3 w-3 rounded bg-[var(--admin-danger)]" /> Từ chối ({Math.round((stats.rejected / (stats.total || 1)) * 100)}%)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-toolbar-unified">
        <div className="admin-toolbar-meta"><Filter size={16} /> Bộ lọc</div>
        <input
          type="text"
          placeholder="Tìm theo tên hoặc CCCD..."
          value={paymentSearch}
          onChange={e => { setPaymentSearch(e.target.value); setCurrentPage(1); }}
          className="admin-search-input min-h-[44px] min-w-[220px] flex-1 rounded-[18px] border border-[rgba(19,34,56,0.14)] bg-[rgba(255,250,241,0.86)] px-4 text-sm font-semibold outline-none transition focus:border-[rgba(200,169,106,0.58)] focus:bg-white focus:ring-4 focus:ring-[rgba(200,169,106,0.14)]"
        />
        <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setCurrentPage(1); }} className="min-h-[44px] min-w-[200px] rounded-[18px] border border-[rgba(19,34,56,0.14)] bg-[rgba(255,250,241,0.86)] px-4 text-sm font-bold text-[var(--admin-text)] outline-none">
          <option value="">Tất cả lớp</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.ten_lop}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="min-h-[44px] rounded-[18px] border border-[rgba(19,34,56,0.14)] bg-[rgba(255,250,241,0.86)] px-4 text-sm font-bold text-[var(--admin-text)] outline-none">
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xử lý</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="rejected">Từ chối</option>
        </select>
        {(filterClass || filterStatus || paymentSearch) && (
          <button onClick={() => { setFilterClass(''); setFilterStatus(''); setPaymentSearch(''); }} className="admin-btn admin-btn-ghost" style={{ padding: '8px 16px' }}>
            <X size={16} /> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2><Receipt size={20} /> Danh sách thanh toán</h2>
          <span style={{ color: '#64748b', fontSize: 14 }}>{filteredPayments.length} khoản</span>
        </div>
        {loading ? (
          <AdminLoadingState
            title="Đang tải thanh toán"
            hint="Giữ lại dữ liệu đã cache để quay lại tab này gần như tức thì."
            variant="desktop-list"
            accent="emerald"
          />
        ) : filteredPayments.length === 0 ? (
          <div className="admin-empty-state"><CreditCard size={48} /><p>Chưa có thanh toán nào</p></div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Học viên</th><th>Lớp</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th><th style={{ textAlign: 'center' }}>Thao tác</th></tr></thead>
            <tbody>
              {paginatedPayments.map(payment => (
                <tr key={payment.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,var(--admin-ink),#315b80)] text-sm font-black text-[var(--admin-champagne)] shadow-[0_14px_28px_-22px_rgba(19,34,56,0.55)]">{payment.ho_ten_full?.charAt(0) || 'H'}</div>
                      <div>
                        <div className="font-bold text-[var(--admin-text)]">{payment.ho_ten_full || 'N/A'}</div>
                        <div className="text-xs font-semibold text-[var(--admin-text-light)]">{payment.cccd}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="admin-badge info">{payment.ten_lop || `Lớp #${payment.class_id}`}</span></td>
                  <td><span className="text-[15px] font-black text-[var(--admin-primary)]">{formatCurrency(payment.amount)}</span></td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td className="text-[13px] font-semibold text-[var(--admin-text-muted)]">{formatDateVN(payment.created_at)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {payment.status === 'pending' && (
                        <>
                          <button onClick={() => handleConfirm(payment.id)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#10b981' }} title="Xác nhận"><Check size={18} /></button>
                          <button onClick={() => handleReject(payment.id)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#ef4444' }} title="Từ chối"><X size={18} /></button>
                        </>
                      )}
                      <button onClick={() => setShowDetailModal(payment)} className="admin-btn admin-btn-ghost" style={{ padding: '8px' }} title="Chi tiết"><Eye size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[rgba(19,34,56,0.10)] px-6 py-4">
            <span className="text-[13px] font-bold text-[var(--admin-text-muted)]">Trang {currentPage} / {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="admin-btn admin-btn-ghost"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="admin-btn admin-btn-ghost"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="admin-modal-overlay" onClick={() => setShowDetailModal(null)}>
          <div className="admin-modal-content w-[95%] max-w-[520px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(200,169,106,0.24),transparent_30%),linear-gradient(135deg,var(--admin-ink)_0%,#0b1728_62%,#1d6f5f_100%)] px-8 py-8 text-center text-white">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/10 text-[var(--admin-champagne)] ring-1 ring-white/15">
                <Wallet size={30} />
              </div>
              <h2 className="m-0 text-[30px] font-black tracking-[-0.04em]">{formatCurrency(showDetailModal.amount)}</h2>
              <p className="mt-2 text-sm font-semibold text-white/68">Thanh toán học phí</p>
            </div>
            <div className="p-8">
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.78)] p-4">
                  <span className="font-bold text-[var(--admin-text-muted)]">Học viên</span>
                  <span className="text-right font-black text-[var(--admin-text)]">{showDetailModal.ho_ten_full}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.78)] p-4">
                  <span className="font-bold text-[var(--admin-text-muted)]">Lớp</span>
                  <span className="text-right font-black text-[var(--admin-text)]">{showDetailModal.ten_lop || `Lớp #${showDetailModal.class_id}`}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.78)] p-4">
                  <span className="font-bold text-[var(--admin-text-muted)]">Trạng thái</span>
                  {getStatusBadge(showDetailModal.status)}
                </div>
                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.78)] p-4">
                  <span className="font-bold text-[var(--admin-text-muted)]">Ngày tạo</span>
                  <span className="font-black text-[var(--admin-text)]">{formatDateVN(showDetailModal.created_at)}</span>
                </div>
                {showDetailModal.note && (
                  <div className="rounded-[18px] border border-[rgba(200,169,106,0.24)] bg-[rgba(200,169,106,0.14)] p-4">
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--admin-ink)]">Ghi chú</span>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[var(--admin-text-muted)]">{showDetailModal.note}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowDetailModal(null)} className="admin-btn admin-btn-ghost flex-1">Đóng</button>
                {showDetailModal.status === 'pending' && (
                  <button onClick={() => { handleConfirm(showDetailModal.id); setShowDetailModal(null); }} className="admin-btn admin-btn-primary flex-1">
                    <Check size={18} /> Xác nhận
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
