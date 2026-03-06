import { useState, useEffect } from 'react';
import { Users, Search, Plus, List, Grid, ChevronLeft, ChevronRight, RefreshCw,
         Trash2, Download, Bell, X, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import '../../../styles/admin/AdminModern.css';
import StudentStatsBar    from './students/StudentStatsBar';
import StudentTableView   from './students/StudentTableView';
import StudentGridView    from './students/StudentGridView';
import StudentDetailModal from './students/StudentDetailModal';
import StudentFormModal   from './students/StudentFormModal';

// Resolve relative image URLs to absolute API URLs
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (typeof window !== 'undefined' &&
      (window.location.hostname.includes('pages.dev') ||
        window.location.hostname.includes('cloudflare') ||
        window.location.hostname.includes('vantrangedu.com'))) {
      return 'https://vantrangedu-api.bangachieu2.workers.dev';
    }
    return '/api';
  };
  const base = getApiBaseUrl().replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

// ─── Bulk Delete Confirm Dialog ────────────────────────────────────────────────
function BulkDeleteDialog({ count, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa hàng loạt</h3>
            <p className="text-sm text-slate-500 mt-0.5">Thao tác này không thể hoàn tác</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          Bạn sắp xóa <span className="font-bold text-red-600">{count} học viên</span> đã chọn.
          Tất cả dữ liệu liên quan (đăng ký, học phí) sẽ bị xóa vĩnh viễn.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="admin-btn admin-btn-outline px-5 py-2.5">
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="admin-btn px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <Trash2 size={16} /> Xóa {count} học viên
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Action Toolbar ────────────────────────────────────────────────────────
function BulkToolbar({ count, onDelete, onExport, onNotify, onClear }) {
  return (
    <div className="flex items-center gap-3 px-8 py-3 bg-emerald-50 border-b border-emerald-200 animate-[fadeIn_0.2s_ease-out]">
      <span className="text-sm font-semibold text-emerald-700 mr-1">
        Đã chọn <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs">{count}</span>
      </span>
      <div className="flex gap-2">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Trash2 size={14} /> Xóa ({count})
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Download size={14} /> Xuất ({count})
        </button>
        <button
          onClick={onNotify}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-semibold transition-colors"
        >
          <Bell size={14} /> Gửi thông báo ({count})
        </button>
      </div>
      <button
        onClick={onClear}
        title="Bỏ chọn tất cả"
        className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function StudentsManagement({ toast }) {
  const [students,        setStudents]        = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [searchKeyword,   setSearchKeyword]   = useState('');
  const [viewMode,        setViewMode]        = useState('table');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize]                            = useState(20);
  const [formData, setFormData] = useState({
    ho: '', ten_dem: '', ten: '', cccd: '', ngay_sinh: '', gioi_tinh: 'Nam',
    email: '', sdt: '', dia_chi: '', noi_sinh: '', dan_toc: 'Kinh', quoc_tich: 'Việt Nam',
    ngay_cap_cccd: '', don_vi_cong_tac: '', password: ''
  });

  // Bulk selection state
  const [selectedIds,       setSelectedIds]       = useState(new Set());
  const [showBulkDeleteDlg, setShowBulkDeleteDlg] = useState(false);

  // Debounced search: trigger auto-search 300ms after user stops typing
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  useEffect(() => { loadStudents(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    if (debouncedKeyword.trim()) {
      handleSearch(debouncedKeyword);
    } else if (debouncedKeyword === '' && students.length > 0) {
      // Only reload when user clears an existing search (not on initial mount)
      loadStudents();
    }
  }, [debouncedKeyword]);

  const loadStudents = async () => {
    setLoading(true);
    setSelectedIds(new Set()); // clear selection on reload
    try {
      // TODO: replace with server-side pagination when API supports cursor/offset+limit properly
      const res = await api.getStudents(200, 0);
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch { toast?.error('Lỗi tải dữ liệu'); setStudents([]); }
    finally { setLoading(false); }
  };

  const handleSearch = async (keyword) => {
    const q = (keyword ?? searchKeyword).trim();
    if (!q) { loadStudents(); return; }
    setLoading(true);
    try {
      const res = await api.searchStudents(q);
      setStudents(Array.isArray(res.data) ? res.data : []);
    } catch { setStudents([]); }
    finally { setLoading(false); }
  };

  const handleViewDetail = async (student) => {
    try {
      const res = await api.getStudentByCCCD(student.cccd);
      setSelectedStudent(res.data || student);
    } catch { setSelectedStudent(student); }
    setShowDetailModal(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    setFormData({
      ho: student.ho || '', ten_dem: student.ten_dem || '', ten: student.ten || '',
      cccd: student.cccd || '', ngay_sinh: formatDateVN(student.ngay_sinh) || '',
      gioi_tinh: student.gioi_tinh || 'Nam', email: student.email || '',
      sdt: student.sdt || '', dia_chi: student.dia_chi || '',
      noi_sinh: student.noi_sinh || '', dan_toc: student.dan_toc || 'Kinh',
      quoc_tich: student.quoc_tich || 'Việt Nam',
      ngay_cap_cccd: formatDateVN(student.ngay_cap_cccd) || '',
      don_vi_cong_tac: student.don_vi_cong_tac || '', password: ''
    });
    setShowEditModal(true);
  };

  const handleAdd = () => {
    setFormData({
      ho: '', ten_dem: '', ten: '', cccd: '', ngay_sinh: '', gioi_tinh: 'Nam',
      email: '', sdt: '', dia_chi: '', noi_sinh: '', dan_toc: 'Kinh',
      quoc_tich: 'Việt Nam', ngay_cap_cccd: '', don_vi_cong_tac: '', password: ''
    });
    setSelectedStudent(null);
    setShowAddModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try { await api.createStudentAdmin(formData); toast?.success('Thêm học viên thành công!'); setShowAddModal(false); loadStudents(); }
    catch (err) { toast?.error('Lỗi: ' + err.message); }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try { await api.updateStudent(selectedStudent.id, formData); toast?.success('Cập nhật thành công!'); setShowEditModal(false); loadStudents(); }
    catch (err) { toast?.error('Lỗi: ' + err.message); }
  };

  const handleDelete = async (student) => {
    if (!confirm(`Xóa học viên "${student.ho_ten_full}"?`)) return;
    try { await api.deleteStudent(student.id); toast?.success('Xóa thành công!'); loadStudents(); }
    catch (err) { toast?.error('Lỗi: ' + err.message); }
  };

  // ── Bulk selection helpers ──────────────────────────────────────────────────
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (visibleStudents) => {
    const allVisible = visibleStudents.map(s => s.id);
    const allSelected = allVisible.every(id => selectedIds.has(id));
    if (allSelected) {
      // deselect all visible
      setSelectedIds(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // select all visible
      setSelectedIds(prev => {
        const next = new Set(prev);
        allVisible.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    setShowBulkDeleteDlg(false);
    const ids = Array.from(selectedIds);
    let success = 0;
    let failed  = 0;
    for (const id of ids) {
      try { await api.deleteStudent(id); success++; }
      catch { failed++; }
    }
    if (success > 0) toast?.success(`Đã xóa ${success} học viên`);
    if (failed  > 0) toast?.error(`Không xóa được ${failed} học viên`);
    loadStudents();
  };

  // Simple CSV export for selected students
  const handleBulkExport = () => {
    const selected = students.filter(s => selectedIds.has(s.id));
    if (!selected.length) return;
    const header = ['Họ tên', 'CCCD', 'Ngày sinh', 'Giới tính', 'Email', 'SĐT', 'Địa chỉ'];
    const rows = selected.map(s => [
      s.ho_ten_full, s.cccd, s.ngay_sinh,
      (s.gioi_tinh === 'Nam' || s.gioi_tinh === 'male') ? 'Nam' : 'Nữ',
      s.email || '', s.sdt || '', s.dia_chi || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `danh-sach-hoc-vien-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success(`Đã xuất ${selected.length} học viên`);
  };

  const handleBulkNotify = () => {
    toast?.info(`Tính năng gửi thông báo hàng loạt đang được phát triển`);
  };

  const closeForm   = () => { setShowAddModal(false); setShowEditModal(false); };
  const paged       = students.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages  = Math.ceil(students.length / pageSize);
  const bulkCount   = selectedIds.size;

  return (
    <div className="admin-page">

      {/* Page header */}
      <div className="admin-header flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="flex items-center gap-3"><Users size={30} /> Quản lý Học viên</h1>
          <p>Quản lý thông tin và hồ sơ của tất cả học viên trong hệ thống</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadStudents} className="admin-btn admin-btn-outline p-2.5">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleAdd} className="admin-btn admin-btn-primary">
            <Plus size={18} /> Thêm học viên
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="admin-card mt-5 p-0 overflow-hidden border border-slate-200 shadow-sm rounded-2xl">

        {/* Stats bar */}
        <StudentStatsBar students={students} />

        {/* Search toolbar */}
        <div className="flex flex-wrap items-center gap-4 px-8 py-5 border-b border-slate-100 bg-white">
          <div className="flex-1 min-w-72 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <Search size={18} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm học viên..."
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(searchKeyword)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button onClick={() => handleSearch(searchKeyword)} className="admin-btn admin-btn-primary px-6 py-3 rounded-xl">
            <Search size={16} /> Tìm kiếm
          </button>
          <div className="w-px h-6 bg-slate-200" />
          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid size={18} />
            </button>
          </div>
        </div>

        {/* Bulk action toolbar — shown only when rows are selected */}
        {bulkCount > 0 && (
          <BulkToolbar
            count={bulkCount}
            onDelete={() => setShowBulkDeleteDlg(true)}
            onExport={handleBulkExport}
            onNotify={handleBulkNotify}
            onClear={() => setSelectedIds(new Set())}
          />
        )}

        {/* Content area */}
        {loading ? (
          <div className="admin-loading py-16">
            <div className="admin-loading-spinner" />
            <span className="mt-3 text-sm font-medium text-slate-500">Đang tải dữ liệu...</span>
          </div>
        ) : viewMode === 'table' ? (
          <StudentTableView
            students={paged}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        ) : (
          <StudentGridView students={paged} onViewDetail={handleViewDetail} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-200 bg-white">
            <span className="text-sm text-slate-500 font-medium">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="admin-btn admin-btn-outline px-3 py-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="admin-btn admin-btn-outline px-3 py-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {showDetailModal && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          getImageUrl={getImageUrl}
          onClose={() => setShowDetailModal(false)}
          onEdit={(s) => { setShowDetailModal(false); handleEdit(s); }}
        />
      )}

      {/* Add / Edit modal */}
      {(showAddModal || showEditModal) && (
        <StudentFormModal
          isEdit={showEditModal}
          formData={formData}
          setFormData={setFormData}
          selectedStudent={selectedStudent}
          getImageUrl={getImageUrl}
          onSubmit={showEditModal ? handleSubmitEdit : handleSubmitAdd}
          onClose={closeForm}
        />
      )}

      {/* Bulk delete confirm dialog */}
      {showBulkDeleteDlg && (
        <BulkDeleteDialog
          count={bulkCount}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteDlg(false)}
        />
      )}
    </div>
  );
}
