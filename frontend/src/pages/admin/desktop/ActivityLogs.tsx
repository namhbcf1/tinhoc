// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Activity, RefreshCw, Filter, Calendar, User, Settings, Eye,
  UserPlus, Edit, Trash2, LogIn, LogOut, X, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import '../../../styles/admin/AdminModern.css';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { AdminPageHeader, AdminSummaryPill } from '../shared/AdminPageHeader';

export default function ActivityLogs({ toast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => { loadLogs(); }, []);
  useAdminAutoRefresh(() => loadLogs(), { minIntervalMs: 15000 });

  const loadLogs = async () => {
    setLoading(true);
    try { const response = await api.getActivityLogs(null, 500, 0); setLogs(Array.isArray(response.data) ? response.data : []); } catch { setLogs([]); } finally { setLoading(false); }
  };

  const getActionInfo = (action) => {
    const map = {
      create: { icon: <UserPlus size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)', text: 'Tạo mới' },
      update: { icon: <Edit size={16} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: 'Cập nhật' },
      delete: { icon: <Trash2 size={16} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', text: 'Xóa' },
      login: { icon: <LogIn size={16} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', text: 'Đăng nhập' },
      logout: { icon: <LogOut size={16} />, color: '#64748b', bg: 'rgba(100,116,139,0.1)', text: 'Đăng xuất' },
      view: { icon: <Eye size={16} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', text: 'Xem' },
      settings: { icon: <Settings size={16} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: 'Cài đặt' }
    };
    return map[action] || { icon: <Activity size={16} />, color: '#64748b', bg: 'rgba(100,116,139,0.1)', text: action };
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return formatDateVN(dateStr);
  };

  const filteredLogs = filterAction ? logs.filter(l => l.action === filterAction) : logs;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div className="admin-page">
      <AdminPageHeader
        icon={Activity}
        title="Nhật ký hoạt động"
        description="Theo dõi các hành động quan trọng để tìm nguyên nhân lỗi và kiểm soát thay đổi trong hệ thống."
        pills={(
          <>
            <AdminSummaryPill>Tổng log {logs.length}</AdminSummaryPill>
            <AdminSummaryPill>Đang lọc {filteredLogs.length}</AdminSummaryPill>
          </>
        )}
        actions={<button onClick={loadLogs} className="admin-btn admin-btn-outline" style={{ padding: '10px 16px' }}><RefreshCw size={18} /> Làm mới</button>}
      />

      {/* Stats */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="admin-stat-card primary"><div className="admin-stat-header"><div className="admin-stat-icon"><Activity size={22} /></div></div><div className="admin-stat-value">{logs.length}</div><div className="admin-stat-label">Tổng log</div></div>
        <div className="admin-stat-card success"><div className="admin-stat-header"><div className="admin-stat-icon"><UserPlus size={22} /></div></div><div className="admin-stat-value">{logs.filter(l => l.action === 'create').length}</div><div className="admin-stat-label">Tạo mới</div></div>
        <div className="admin-stat-card info"><div className="admin-stat-header"><div className="admin-stat-icon"><Edit size={22} /></div></div><div className="admin-stat-value">{logs.filter(l => l.action === 'update').length}</div><div className="admin-stat-label">Cập nhật</div></div>
        <div className="admin-stat-card danger"><div className="admin-stat-header"><div className="admin-stat-icon"><Trash2 size={22} /></div></div><div className="admin-stat-value">{logs.filter(l => l.action === 'delete').length}</div><div className="admin-stat-label">Xóa</div></div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center', background: 'white', padding: 20, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
        <Filter size={20} color="#64748b" />
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setCurrentPage(1); }} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}>
          <option value="">Tất cả hành động</option>
          {uniqueActions.map(action => <option key={action} value={action}>{getActionInfo(action).text}</option>)}
        </select>
        {filterAction && <button onClick={() => setFilterAction('')} className="admin-btn admin-btn-ghost" style={{ marginLeft: 'auto', padding: '8px 16px' }}><X size={16} /> Xóa lọc</button>}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="admin-loading"><div className="admin-loading-spinner"></div><span>Đang tải...</span></div>
      ) : logs.length === 0 ? (
        <div className="admin-empty-state" style={{ background: 'white', borderRadius: 24, padding: 60 }}><Activity size={64} /><p>Chưa có log nào</p></div>
      ) : (
        <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(226,232,240,0.8)' }}>
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, #e2e8f0 0%, transparent 100%)' }}></div>

            {paginatedLogs.map((log, index) => {
              const actionInfo = getActionInfo(log.action);
              return (
                <div key={log.id || index} style={{ display: 'flex', gap: 20, marginBottom: 24, position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: actionInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: actionInfo.color, flexShrink: 0, zIndex: 1, border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>{actionInfo.icon}</div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{log.admin_username || 'System'}</span>
                      <span style={{ padding: '4px 12px', borderRadius: 20, background: actionInfo.bg, color: actionInfo.color, fontSize: 12, fontWeight: 600 }}>{actionInfo.text}</span>
                      <span style={{ color: '#94a3b8', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {formatTimeAgo(log.created_at)}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{log.description || `Thực hiện ${log.action} trên ${log.entity_type || 'hệ thống'}`}</div>
                    {log.details && (
                      <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 10, fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                        {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid #e2e8f0', marginTop: 24 }}>
              <span style={{ color: '#64748b', fontSize: 13 }}>Trang {currentPage} / {totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="admin-btn admin-btn-ghost"><ChevronLeft size={16} /></button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="admin-btn admin-btn-ghost"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
