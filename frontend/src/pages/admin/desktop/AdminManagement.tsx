// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  Shield, Plus, RefreshCw, Edit2, Trash2, Lock, Unlock,
  Mail, Phone, User, Crown, CheckCircle, XCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import '../../../styles/admin/AdminModern.css';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import { AdminPageHeader, AdminSummaryPill } from '../shared/AdminPageHeader';

export default function AdminManagement() {
  const { success, error, toasts, removeToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [formData, setFormData] = useState({ username: '', password: '', email: '', phone: '', role: 'admin', status: 'active' });

  useEffect(() => { loadAdmins(); }, []);
  useAdminAutoRefresh(() => loadAdmins(), { minIntervalMs: 15000 });

  const loadAdmins = async () => {
    setLoading(true);
    try { const response = await api.getAdmins(); setAdmins(Array.isArray(response.data) ? response.data : []); } catch { setAdmins([]); } finally { setLoading(false); }
  };

  const handleCreate = () => { setEditingAdmin(null); setFormData({ username: '', password: '', email: '', phone: '', role: 'admin', status: 'active' }); setShowModal(true); };

  const handleEdit = (admin) => { setEditingAdmin(admin); setFormData({ username: admin.username, password: '', email: admin.email || '', phone: admin.phone || '', role: admin.role || 'admin', status: admin.status || 'active' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username) { error('Vui lòng nhập username'); return; }
    if (!editingAdmin && !formData.password) { error('Vui lòng nhập mật khẩu'); return; }
    try {
      if (editingAdmin) { const updateData = { ...formData }; if (!updateData.password) delete updateData.password; await api.updateAdmin(editingAdmin.id, updateData); success('Cập nhật thành công!'); }
      else { await api.createAdmin(formData); success('Tạo admin thành công!'); }
      setShowModal(false); loadAdmins();
    } catch (err) { error('Lỗi: ' + (err.message || 'Không xác định')); }
  };

  const handleToggleStatus = async (admin) => {
    try { const newStatus = admin.status === 'active' ? 'inactive' : 'active'; await api.updateAdmin(admin.id, { status: newStatus }); success(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'khóa'} admin`); loadAdmins(); } catch (err) { error('Lỗi: ' + err.message); }
  };

  const handleDelete = (admin) => {
    setConfirmDialog({
      isOpen: true, title: 'Xóa admin', message: `Xóa admin "${admin.username}"?`, type: 'danger',
      onConfirm: async () => { try { await api.deleteAdmin(admin.id); success('Xóa thành công!'); loadAdmins(); } catch (err) { error('Lỗi: ' + err.message); } }
    });
  };

  const getRoleBadge = (role) => {
    const map = { super_admin: { class: 'danger', icon: <Crown size={14} />, text: 'Super Admin' }, admin: { class: 'info', icon: <Shield size={14} />, text: 'Admin' }, moderator: { class: 'warning', icon: <User size={14} />, text: 'Moderator' } };
    const s = map[role] || { class: 'default', text: role };
    return <span className={`admin-badge ${s.class}`}>{s.icon} {s.text}</span>;
  };

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <AdminPageHeader
        icon={Shield}
        title="Quản lý admin"
        description="Theo dõi quyền, trạng thái và độ an toàn của tài khoản quản trị trong hệ thống."
        pills={(
          <>
            <AdminSummaryPill>Tổng {admins.length} admin</AdminSummaryPill>
            <AdminSummaryPill>Super Admin {admins.filter((admin) => admin.role === 'super_admin').length}</AdminSummaryPill>
          </>
        )}
      />

      <div className="admin-card unified-card">
        {/* 1. Stats */}
        <div className="admin-stats-unified">
          <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
            <div className="admin-stat-card primary"><div className="admin-stat-header"><div className="admin-stat-icon"><Shield size={22} /></div></div><div className="admin-stat-value">{admins.length}</div><div className="admin-stat-label">Tổng admin</div></div>
            <div className="admin-stat-card danger"><div className="admin-stat-header"><div className="admin-stat-icon"><Crown size={22} /></div></div><div className="admin-stat-value">{admins.filter(a => a.role === 'super_admin').length}</div><div className="admin-stat-label">Super Admin</div></div>
            <div className="admin-stat-card success"><div className="admin-stat-header"><div className="admin-stat-icon"><CheckCircle size={22} /></div></div><div className="admin-stat-value">{admins.filter(a => a.status === 'active').length}</div><div className="admin-stat-label">Hoạt động</div></div>
            <div className="admin-stat-card warning"><div className="admin-stat-header"><div className="admin-stat-icon"><XCircle size={22} /></div></div><div className="admin-stat-value">{admins.filter(a => a.status !== 'active').length}</div><div className="admin-stat-label">Bị khóa</div></div>
          </div>
        </div>

        {/* 2. Toolbar */}
        <div className="admin-toolbar-unified">
          <div style={{ flex: 1 }}>{/* Spacer or Search later */}</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={loadAdmins} className="admin-btn admin-btn-outline" style={{ padding: '8px 12px' }}><RefreshCw size={18} /></button>
            <button onClick={handleCreate} className="admin-btn admin-btn-primary" style={{ padding: '8px 16px' }}><Plus size={18} /> Thêm admin</button>
          </div>
        </div>

        {/* 3. Content */}
        <div style={{ padding: 24, background: '#fcfcfc', minHeight: 400 }}>
          {loading ? (
            <div className="admin-loading"><div className="admin-loading-spinner"></div><span>Đang tải...</span></div>
          ) : admins.length === 0 ? (
            <div className="admin-empty-state" style={{ background: 'white', borderRadius: 24, padding: 60 }}><Shield size={64} /><p>Chưa có admin nào</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {admins.map(admin => (
                <div key={admin.id} style={{ background: 'white', borderRadius: 20, padding: 0, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden', transition: 'all 0.3s' }} className="hover:shadow-lg hover:-translate-y-1">
                  <div style={{ background: admin.role === 'super_admin' ? 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: 24, color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>{admin.username?.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>{admin.username}</div>{getRoleBadge(admin.role)}</div>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: admin.status === 'active' ? '#22c55e' : '#ef4444', boxShadow: '0 0 8px ' + (admin.status === 'active' ? '#22c55e' : '#ef4444') }}></div>
                    </div>
                  </div>
                  <div style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontSize: 14 }}><Mail size={16} /> {admin.email || 'Chưa có'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#64748b', fontSize: 14 }}><Phone size={16} /> {admin.phone || 'Chưa có'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button onClick={() => handleEdit(admin)} className="admin-btn admin-btn-ghost" style={{ flex: 1, padding: '8px' }}><Edit2 size={16} /> Sửa</button>
                      <button onClick={() => handleToggleStatus(admin)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: admin.status === 'active' ? '#f59e0b' : '#10b981' }}>{admin.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}</button>
                      <button onClick={() => handleDelete(admin)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal & Dialogs */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: 24, color: 'white' }}><h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>{editingAdmin ? <Edit2 size={24} /> : <Plus size={24} />} {editingAdmin ? 'Sửa admin' : 'Thêm admin'}</h2></div>
            <div style={{ padding: 24 }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Username *</label><input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required style={inputStyle} disabled={!!editingAdmin} /></div>
                <div style={{ marginBottom: 20 }}><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>{editingAdmin ? 'Mật khẩu mới' : 'Mật khẩu *'}</label><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} placeholder={editingAdmin ? 'Để trống nếu không đổi' : ''} required={!editingAdmin} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={inputStyle} /></div>
                  <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>SĐT</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Role</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={inputStyle}><option value="admin">Admin</option><option value="super_admin">Super Admin</option><option value="moderator">Moderator</option></select></div>
                  <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Trạng thái</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle}><option value="active">Hoạt động</option><option value="inactive">Khóa</option></select></div>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}><button type="button" onClick={() => setShowModal(false)} className="admin-btn admin-btn-ghost">Hủy</button><button type="submit" className="admin-btn admin-btn-primary">{editingAdmin ? 'Cập nhật' : 'Tạo'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog({ isOpen: false })} onConfirm={confirmDialog.onConfirm || (() => { })} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type} />
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none' };
