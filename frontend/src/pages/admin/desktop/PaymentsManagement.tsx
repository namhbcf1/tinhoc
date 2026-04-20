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
      <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(226,232,240,0.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><PieChart size={18} color="#16a34a" /> Phân bổ trạng thái</h3>
        </div>
        <div style={{ display: 'flex', gap: 4, height: 12, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9' }}>
          <div style={{ width: `${(stats.confirmed / (stats.total || 1)) * 100}%`, background: 'linear-gradient(90deg, #10b981, #22c55e)', transition: 'width 0.5s ease' }}></div>
          <div style={{ width: `${(stats.pending / (stats.total || 1)) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', transition: 'width 0.5s ease' }}></div>
          <div style={{ width: `${(stats.rejected / (stats.total || 1)) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 0.5s ease' }}></div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 3 }}></div> Xác nhận ({Math.round((stats.confirmed / (stats.total || 1)) * 100)}%)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#f59e0b', borderRadius: 3 }}></div> Chờ ({Math.round((stats.pending / (stats.total || 1)) * 100)}%)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 3 }}></div> Từ chối ({Math.round((stats.rejected / (stats.total || 1)) * 100)}%)</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        <Filter size={20} color="#64748b" />
        <input
          type="text"
          placeholder="Tìm theo tên hoặc CCCD..."
          value={paymentSearch}
          onChange={e => { setPaymentSearch(e.target.value); setCurrentPage(1); }}
          style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, minWidth: 220, outline: 'none' }}
        />
        <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setCurrentPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, minWidth: 200 }}>
          <option value="">Tất cả lớp</option>
          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.ten_lop}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>{payment.ho_ten_full?.charAt(0) || 'H'}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{payment.ho_ten_full || 'N/A'}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{payment.cccd}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="admin-badge info">{payment.ten_lop || `Lớp #${payment.class_id}`}</span></td>
                  <td><span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>{formatCurrency(payment.amount)}</span></td>
                  <td>{getStatusBadge(payment.status)}</td>
                  <td style={{ color: '#64748b', fontSize: 13 }}>{formatDateVN(payment.created_at)}</td>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ color: '#64748b', fontSize: 13 }}>Trang {currentPage} / {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="admin-btn admin-btn-ghost"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="admin-btn admin-btn-ghost"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setShowDetailModal(null)}>
          <div style={{ background: 'white', borderRadius: 24, width: '95%', maxWidth: 500, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: 32, color: 'white', textAlign: 'center' }}>
              <Wallet size={48} style={{ marginBottom: 12, opacity: 0.9 }} />
              <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{formatCurrency(showDetailModal.amount)}</h2>
              <p style={{ opacity: 0.8, margin: '8px 0 0' }}>Thanh toán học phí</p>
            </div>
            <div style={{ padding: 32 }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8fafc', borderRadius: 12 }}>
                  <span style={{ color: '#64748b' }}>Học viên</span>
                  <span style={{ fontWeight: 600 }}>{showDetailModal.ho_ten_full}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8fafc', borderRadius: 12 }}>
                  <span style={{ color: '#64748b' }}>Lớp</span>
                  <span style={{ fontWeight: 600 }}>{showDetailModal.ten_lop || `Lớp #${showDetailModal.class_id}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8fafc', borderRadius: 12 }}>
                  <span style={{ color: '#64748b' }}>Trạng thái</span>
                  {getStatusBadge(showDetailModal.status)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: '#f8fafc', borderRadius: 12 }}>
                  <span style={{ color: '#64748b' }}>Ngày tạo</span>
                  <span style={{ fontWeight: 600 }}>{formatDateVN(showDetailModal.created_at)}</span>
                </div>
                {showDetailModal.note && (
                  <div style={{ padding: 16, background: '#fef3c7', borderRadius: 12 }}>
                    <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>Ghi chú:</span>
                    <p style={{ margin: '4px 0 0', color: '#78350f' }}>{showDetailModal.note}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => setShowDetailModal(null)} className="admin-btn admin-btn-ghost" style={{ flex: 1 }}>Đóng</button>
                {showDetailModal.status === 'pending' && (
                  <button onClick={() => { handleConfirm(showDetailModal.id); setShowDetailModal(null); }} className="admin-btn admin-btn-primary" style={{ flex: 1 }}>
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
