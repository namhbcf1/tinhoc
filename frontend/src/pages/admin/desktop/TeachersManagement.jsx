import { useState, useEffect } from 'react';
import {
  GraduationCap, Plus, Search, Filter, Edit2, Trash2, Lock, Unlock,
  Mail, Phone, Building, ChevronLeft, ChevronRight, X, User, RefreshCw, Grid, List
} from 'lucide-react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { showError } from '../../../utils/errorHandler';
import '../../../styles/admin/AdminModern.css';

export default function TeachersManagement() {
  const { success, error, toasts, removeToast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [formData, setFormData] = useState({ teacher_code: '', ho: '', ten_dem: '', ten: '', email: '', sdt: '', password: '', department: '', position: '', status: 'active' });

  useEffect(() => { loadTeachers(); }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await api.getAllTeachers(100, 0);
      let data = [];
      if (Array.isArray(response)) data = response;
      else if (response?.data && Array.isArray(response.data)) data = response.data;
      setTeachers(data.filter(t => t && typeof t === 'object' && t.id !== undefined));
    } catch (err) { showError(err, { error }); setTeachers([]); } finally { setLoading(false); }
  };

  const handleCreate = () => { setEditingTeacher(null); setFormData({ teacher_code: '', ho: '', ten_dem: '', ten: '', email: '', sdt: '', password: '', department: '', position: '', status: 'active' }); setShowModal(true); };

  const handleEdit = (teacher) => { setEditingTeacher(teacher); setFormData({ teacher_code: teacher.teacher_code, ho: teacher.ho, ten_dem: teacher.ten_dem || '', ten: teacher.ten, email: teacher.email, sdt: teacher.sdt, password: '', department: teacher.department || '', position: teacher.position || '', status: teacher.status || 'active' }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.teacher_code || !formData.ho || !formData.ten || !formData.email || !formData.sdt) { error('Vui lòng điền đầy đủ thông tin'); return; }
    if (!editingTeacher && !formData.password) { error('Vui lòng nhập mật khẩu'); return; }
    try {
      if (editingTeacher) { const updateData = { ...formData }; if (!updateData.password) delete updateData.password; await api.updateTeacher(editingTeacher.id, updateData); success('Cập nhật thành công'); }
      else { await api.createTeacher(formData); success('Tạo thành công'); }
      setShowModal(false); loadTeachers();
    } catch (err) { showError(err, { error }); }
  };

  const handleDelete = (teacher) => {
    setConfirmDialog({
      isOpen: true, title: 'Xác nhận xóa', message: `Xóa giáo viên "${teacher.ho_ten_full}"?`, type: 'danger',
      onConfirm: async () => { try { await api.updateTeacher(teacher.id, { status: 'inactive' }); success('Xóa thành công'); loadTeachers(); } catch (err) { showError(err, { error }); } }
    });
  };

  const handleToggleStatus = async (teacher) => {
    try { const newStatus = teacher.status === 'active' ? 'inactive' : 'active'; await api.updateTeacher(teacher.id, { status: newStatus }); success(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'khóa'}`); loadTeachers(); } catch (err) { showError(err, { error }); }
  };

  const filteredTeachers = teachers.filter(t => {
    if (searchKeyword && !t.ho_ten_full?.toLowerCase().includes(searchKeyword.toLowerCase()) && !t.teacher_code?.toLowerCase().includes(searchKeyword.toLowerCase())) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredTeachers.length / pageSize);

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
        <div><h1><GraduationCap size={32} /> Quản lý Giáo viên</h1><p>Quản lý thông tin và tài khoản giáo viên</p></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={loadTeachers} className="admin-btn admin-btn-outline" style={{ padding: '10px 16px' }}><RefreshCw size={18} /></button>
          <button onClick={handleCreate} className="admin-btn admin-btn-primary"><Plus size={18} /> Thêm giáo viên</button>
        </div>
      </div>

      {/* Unified Main Content Card */}
      <div className="admin-card unified-card">

        {/* 1. Stats Section */}
        <div className="admin-stats-unified">
          <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => setFilterStatus('')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GraduationCap size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{teachers.length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Tổng giáo viên</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => setFilterStatus('active')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{teachers.filter(t => t.status === 'active').length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Đang hoạt động</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={() => setFilterStatus('inactive')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{teachers.filter(t => t.status === 'inactive').length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Ngưng hoạt động</div></div>
            </div>
          </div>
        </div>

        {/* 2. Toolbar */}
        <div className="admin-toolbar-unified">
          <div style={{ flex: 1, minWidth: 300, display: 'flex', gap: 12, background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
            <Search size={20} color="#94a3b8" />
            <input type="text" placeholder="Tìm theo mã GV, tên..." value={searchKeyword} onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', background: 'white' }}>
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã ngưng</option>
          </select>
          <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 8px' }}></div>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            <button onClick={() => setViewMode('table')} style={{ padding: '8px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', background: viewMode === 'table' ? 'white' : 'transparent', color: viewMode === 'table' ? '#0f172a' : '#64748b', boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 500 }}><List size={18} /></button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', background: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? '#0f172a' : '#64748b', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: 500 }}><Grid size={18} /></button>
          </div>
        </div>

        {/* 3. Content */}
        {loading ? (
          <div className="admin-loading" style={{ padding: 60 }}><div className="admin-loading-spinner"></div><span style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>Đang tải dữ liệu...</span></div>
        ) : viewMode === 'table' ? (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            {filteredTeachers.length === 0 ? <div className="admin-empty-state" style={{ padding: 60 }}><GraduationCap size={48} /><p>Chưa có giáo viên nào</p></div> : (
              <table className="admin-table-unified">
                <thead><tr><th>Giáo viên</th><th>Mã GV</th><th>Liên hệ</th><th>Khoa/BM</th><th>Trạng thái</th><th style={{ textAlign: 'center' }}>Thao tác</th></tr></thead>
                <tbody>{paginatedTeachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 16 }}>{teacher.ho_ten_full?.charAt(0)}</div>
                        <div><div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{teacher.ho_ten_full}</div><div style={{ fontSize: 13, color: '#64748b' }}>{teacher.position || 'Giáo viên'}</div></div>
                      </div>
                    </td>
                    <td><code style={{ background: '#f1f5f9', padding: '6px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0' }}>{teacher.teacher_code}</code></td>
                    <td><div style={{ fontSize: 14, color: '#334155' }}>{teacher.email}</div><div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{teacher.sdt}</div></td>
                    <td style={{ color: '#475569', fontWeight: 500 }}>{teacher.department || '-'}</td>
                    <td><span className={`admin-badge ${teacher.status === 'active' ? 'success' : 'danger'}`} style={{ padding: '6px 12px', fontSize: 12 }}>{teacher.status === 'active' ? 'Hoạt động' : 'Ngưng'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(teacher)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#3b82f6' }} title="Sửa"><Edit2 size={18} /></button>
                        <button onClick={() => handleToggleStatus(teacher)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: teacher.status === 'active' ? '#f59e0b' : '#10b981' }} title={teacher.status === 'active' ? 'Khóa' : 'Kích hoạt'}>{teacher.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}</button>
                        <button onClick={() => handleDelete(teacher)} className="admin-btn admin-btn-ghost" style={{ padding: '8px', color: '#ef4444' }} title="Xóa"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {totalPages > 1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderTop: '1px solid #e2e8f0', background: 'white' }}><span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Hiển thị trang {currentPage} / {totalPages}</span><div style={{ display: 'flex', gap: 8 }}><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="admin-btn admin-btn-outline" style={{ padding: '8px 14px' }}><ChevronLeft size={16} /></button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="admin-btn admin-btn-outline" style={{ padding: '8px 14px' }}><ChevronRight size={16} /></button></div></div>}
          </div>
        ) : (
          <div style={{ padding: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, background: '#fcfcfc' }}>
            {paginatedTeachers.map(teacher => (
              <div key={teacher.id} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', transition: 'all 0.3s' }} className="hover:shadow-lg hover:-translate-y-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 24 }}>{teacher.ho_ten_full?.charAt(0)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{teacher.ho_ten_full}</div><div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{teacher.position || 'Giáo viên'}</div></div>
                  <span className={`admin-badge ${teacher.status === 'active' ? 'success' : 'danger'}`}>{teacher.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 14 }}><Mail size={16} /> {teacher.email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 14 }}><Phone size={16} /> {teacher.sdt}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: 14 }}><Building size={16} /> {teacher.department || 'Chưa phân'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  <button onClick={() => handleEdit(teacher)} className="admin-btn admin-btn-outline" style={{ flex: 1, padding: '10px' }}><Edit2 size={16} /> Sửa</button>
                  <button onClick={() => handleToggleStatus(teacher)} className="admin-btn admin-btn-outline" style={{ padding: '10px', color: teacher.status === 'active' ? '#f59e0b' : '#10b981' }}>{teacher.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}</button>
                </div>
              </div>
            ))}
            {totalPages > 1 && <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', borderTop: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 8 }}><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="admin-btn admin-btn-outline" style={{ padding: '8px 14px' }}><ChevronLeft size={16} /></button><span style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', fontWeight: 600 }}>{currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="admin-btn admin-btn-outline" style={{ padding: '8px 14px' }}><ChevronRight size={16} /></button></div></div>}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)', padding: 32, borderRadius: '24px 24px 0 0', color: 'white' }}><h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>{editingTeacher ? <Edit2 size={24} /> : <Plus size={24} />} {editingTeacher ? 'Sửa giáo viên' : 'Thêm giáo viên'}</h2></div>
            <div style={{ padding: 32 }}>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <FormField label="Mã giáo viên *" value={formData.teacher_code} onChange={v => setFormData({ ...formData, teacher_code: v })} disabled={!!editingTeacher} placeholder="VD: GV001" />
                  <div><label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Trạng thái</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} style={inputStyle}><option value="active">Hoạt động</option><option value="inactive">Ngưng</option></select></div>
                  <FormField label="Họ *" value={formData.ho} onChange={v => setFormData({ ...formData, ho: v })} />
                  <FormField label="Tên đệm" value={formData.ten_dem} onChange={v => setFormData({ ...formData, ten_dem: v })} required={false} />
                  <FormField label="Tên *" value={formData.ten} onChange={v => setFormData({ ...formData, ten: v })} />
                  <FormField label="Email *" value={formData.email} onChange={v => setFormData({ ...formData, email: v })} type="email" />
                  <FormField label="SĐT *" value={formData.sdt} onChange={v => setFormData({ ...formData, sdt: v })} type="tel" />
                  <FormField label="Khoa/Bộ môn" value={formData.department} onChange={v => setFormData({ ...formData, department: v })} required={false} />
                  <FormField label="Chức vụ" value={formData.position} onChange={v => setFormData({ ...formData, position: v })} required={false} />
                  <FormField label={editingTeacher ? "Mật khẩu mới" : "Mật khẩu *"} value={formData.password} onChange={v => setFormData({ ...formData, password: v })} type="password" required={!editingTeacher} placeholder={editingTeacher ? "Để trống nếu không đổi" : ""} />
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}><button type="button" onClick={() => setShowModal(false)} className="admin-btn admin-btn-ghost">Hủy</button><button type="submit" className="admin-btn admin-btn-primary">{editingTeacher ? 'Cập nhật' : 'Tạo'}</button></div>
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
function FormField({ label, value, onChange, type = 'text', placeholder = '', required = true, disabled = false }) {
  return (<div style={{ marginBottom: 12 }}><label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151', fontSize: 13 }}>{label}</label><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} style={{ ...inputStyle, background: disabled ? '#f1f5f9' : 'white' }} /></div>);
}
