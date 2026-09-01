// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, List, Grid, ChevronLeft, ChevronRight, RefreshCw,
         Trash2, Download, Bell, X, AlertTriangle, Search, Filter, FileSpreadsheet, Upload } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { resolveImageUrl } from '../../../utils/imageUrl';
import '../../../styles/admin/AdminModern.css';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import StudentTableView   from './students/StudentTableView';
import StudentGridView    from './students/StudentGridView';
import StudentDetailModal from './students/StudentDetailModal';
import StudentFormModal   from './students/StudentFormModal';
import StudentImportModal from './students/StudentImportModal';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, getAdminCache, invalidateAdminData, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import { LearningInfoPill, LearningWorkspaceHeader } from '../shared/LearningWorkspaceHeader';

// ─── Bulk Delete Confirm Dialog ────────────────────────────────────────────────
function DeleteDialog({ student, count, busy = false, progress = null, onConfirm, onCancel }) {
  const isBulk = count > 1;
  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{isBulk ? 'Xác nhận xóa hàng loạt' : 'Xác nhận xóa học viên'}</h3>
              <p className="text-sm text-slate-500 mt-0.5">Thao tác này là xóa vĩnh viễn</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 mb-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {isBulk ? (
              <>Bạn sắp xóa <span className="font-bold text-red-600">{count} học viên</span> đã chọn.</>
            ) : (
              <>Bạn sắp xóa học viên <span className="font-bold text-red-600">{student?.ho_ten_full}</span>.</>
            )}
            {' '}Vui lòng chắc chắn trước khi tiếp tục.
          </p>
          {progress ? (
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Đã xử lý {progress.done}/{progress.total} học viên
            </div>
          ) : null}
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} disabled={busy} className="admin-btn admin-btn-outline px-5 py-2.5 disabled:opacity-50">
              Hủy
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="admin-btn px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              <Trash2 size={16} /> {busy ? 'Đang xóa...' : `Xóa ${isBulk ? count + ' học viên' : 'học viên'}`}
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
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
  const cachedStudents = getAdminCache(ADMIN_CACHE_KEYS.students, ADMIN_CACHE_TTL.students);
  const [students,        setStudents]        = useState(() => cachedStudents?.students ?? []);
  const [studentStats,    setStudentStats]    = useState(() => cachedStudents?.studentStats ?? null);
  const [loading,         setLoading]         = useState(() => cachedStudents === null);
  const [searching,       setSearching]       = useState(false);
  const [meta,            setMeta]            = useState(() => cachedStudents?.meta ?? null);
  const [viewMode,        setViewMode]        = useState('table');
  const [showFilters,     setShowFilters]     = useState(false);
  const [filters,         setFilters]         = useState({ status: '', registration_type: '', has_certificate: '', created_from: '', created_to: '' });
  const [sortState,       setSortState]       = useState({ sort_by: 'created_at', sort_dir: 'desc' });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize]                            = useState(20);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [formData, setFormData] = useState({
    ho: '', ten_dem: '', ten: '', cccd: '', ngay_sinh: '', gioi_tinh: 'Nam',
    email: '', sdt: '', dia_chi: '', noi_sinh: '', dan_toc: 'Kinh', quoc_tich: 'Việt Nam',
    ngay_cap_cccd: '', don_vi_cong_tac: '', nganh_dang_hoc: '', password: ''
  });

  // Bulk selection state
  const [selectedIds,       setSelectedIds]       = useState(new Set());
  const [deleteTarget,      setDeleteTarget]      = useState(null);
  const [showBulkDeleteDlg, setShowBulkDeleteDlg] = useState(false);
  const [deleteBusy,        setDeleteBusy]        = useState(false);
  const [bulkProgress,      setBulkProgress]      = useState(null);
  const [showImportModal,   setShowImportModal]   = useState(false);

  const queryOptions = useMemo(() => ({
    page: currentPage,
    limit: pageSize,
    q: searchTerm.trim(),
    ...filters,
    ...sortState,
  }), [currentPage, pageSize, searchTerm, filters, sortState]);

  useEffect(() => { void loadStudents(); }, [queryOptions]);
  useAdminAutoRefresh(() => loadStudents({ force: true }), { minIntervalMs: 12000 });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, sortState]);

  const loadStudents = async ({ force = false } = {}) => {
    const hasEnterpriseQuery = Boolean(queryOptions.q || queryOptions.status || queryOptions.registration_type || queryOptions.has_certificate || queryOptions.created_from || queryOptions.created_to || queryOptions.sort_by !== 'created_at' || queryOptions.sort_dir !== 'desc' || queryOptions.page !== 1 || queryOptions.limit !== pageSize);
    const cached = force || hasEnterpriseQuery ? null : getAdminCache(ADMIN_CACHE_KEYS.students, ADMIN_CACHE_TTL.students);
    if (cached) {
      setStudents(cached.students || []);
      setStudentStats(cached.studentStats || null);
      setMeta(cached.meta || null);
      setLoading(false);
      return cached.students || [];
    }

    setSearching(Boolean(queryOptions.q));
    setLoading(true);
    setSelectedIds(new Set());
    try {
      if (force) {
        api.invalidateCache(['/students']);
      }
      const firstPage = await api.getStudents(queryOptions);
      const firstBatch = Array.isArray(firstPage?.data) ? firstPage.data : [];
      const nextStats = firstPage?.meta?.stats || null;
      const nextMeta = firstPage?.meta || null;

      const nextStudents = Array.from(
        new Map(firstBatch.map((student) => [student.id, student])).values()
      );
      setStudents(nextStudents);
      setStudentStats(nextStats);
      setMeta(nextMeta);
      if (!hasEnterpriseQuery) {
        setAdminCache(ADMIN_CACHE_KEYS.students, { students: nextStudents, studentStats: nextStats, meta: nextMeta });
      }
      return nextStudents;
    } catch (err) { console.error('[StudentsManagement] loadStudents error:', err); toast?.error('Lỗi tải dữ liệu học viên'); setStudents([]); }
    finally { setLoading(false); setSearching(false); }
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
      don_vi_cong_tac: student.don_vi_cong_tac || '', nganh_dang_hoc: student.nganh_dang_hoc || '', password: ''
    });
    setShowEditModal(true);
  };

  const handleAdd = () => {
    setFormData({
      ho: '', ten_dem: '', ten: '', cccd: '', ngay_sinh: '', gioi_tinh: 'Nam',
      email: '', sdt: '', dia_chi: '', noi_sinh: '', dan_toc: 'Kinh',
      quoc_tich: 'Việt Nam', ngay_cap_cccd: '', don_vi_cong_tac: '', nganh_dang_hoc: '', password: ''
    });
    setSelectedStudent(null);
    setShowAddModal(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    try {
      const preflight = await api.validateStudentAdmin(formData);
      if (preflight?.valid === false) {
        toast?.error(Object.values(preflight.errors || {})[0] || 'Thông tin học viên chưa hợp lệ');
        return;
      }
      await api.createStudentAdmin(formData);
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
        source: 'students-management',
      });
      toast?.success('Thêm học viên thành công!');
      setShowAddModal(false);
      void loadStudents({ force: true });
    }
    catch (err) { toast?.error('Lỗi: ' + err.message); }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      const preflight = await api.validateStudentAdmin({ ...formData, id: selectedStudent.id });
      if (preflight?.valid === false) {
        toast?.error(Object.values(preflight.errors || {})[0] || 'Thông tin học viên chưa hợp lệ');
        return;
      }
      await api.updateStudent(selectedStudent.id, formData);
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
        source: 'students-management',
      });
      toast?.success('Cập nhật thành công!');
      setShowEditModal(false);
      void loadStudents({ force: true });
    }
    catch (err) { toast?.error('Lỗi: ' + err.message); }
  };

  const handleDelete = (student) => {
    setDeleteTarget(student);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.deleteStudent(deleteTarget.id);
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
        source: 'students-management',
      });
      toast?.success('Xóa thành công!');
      setDeleteTarget(null);
      void loadStudents({ force: true });
    }
    catch (err) { toast?.error('Lỗi: ' + err.message); }
    finally { setDeleteBusy(false); }
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
    const ids = Array.from(selectedIds);
    let success = 0;
    const failures = [];
    setDeleteBusy(true);
    setBulkProgress({ done: 0, total: ids.length });
    for (const id of ids) {
      try { await api.deleteStudent(id); success++; }
      catch (error) { failures.push({ id, message: error?.message || 'Không xóa được' }); }
      setBulkProgress({ done: success + failures.length, total: ids.length });
    }
    if (success > 0 && failures.length > 0) toast?.warning(`Đã xóa ${success} học viên, ${failures.length} lỗi: ${failures.slice(0, 3).map(f => f.id).join(', ')}`);
    else if (success > 0) toast?.success(`Đã xóa thành công ${success} học viên`);
    else if (failures.length > 0) toast?.error(`Không xóa được ${failures.length} học viên`);
    setDeleteBusy(false);
    setBulkProgress(null);
    setShowBulkDeleteDlg(false);
    invalidateAdminData({
      keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
      source: 'students-management',
    });
    void loadStudents({ force: true });
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

  const handleExportFiltered = async () => {
    try {
      await api.downloadStudentsExcel(exportFilters);
      toast?.success('Đã xuất Excel theo bộ lọc hiện tại');
    } catch (error) {
      toast?.error(error?.message || 'Lỗi xuất Excel học viên');
    }
  };

  const handleBulkNotify = () => {
    toast?.info(`Tính năng gửi thông báo hàng loạt đang được phát triển`);
  };

  const updateFilter = (field) => (event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ status: '', registration_type: '', has_certificate: '', created_from: '', created_to: '' });
    setSortState({ sort_by: 'created_at', sort_dir: 'desc' });
  };
  const handleSort = (sortBy) => {
    setSortState((prev) => ({
      sort_by: sortBy,
      sort_dir: prev.sort_by === sortBy && prev.sort_dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const closeForm   = () => { setShowAddModal(false); setShowEditModal(false); };
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const paged       = students;
  const totalMatches = meta?.total ?? students.length;
  const totalPages  = Math.max(1, meta?.totalPages ?? Math.ceil(totalMatches / pageSize));
  const bulkCount   = selectedIds.size;
  const totalStudentsCount = studentStats?.totalStudents ?? totalMatches;
  const activeFilters = Object.entries(filters).filter(([, value]) => value);
  const exportFilters = { q: searchTerm.trim(), ...filters, ...sortState };

  return (
    <div className="admin-page">
      <LearningWorkspaceHeader
        icon={Users}
        tone="emerald"
        title="Học viên"
        description=""
        actions={(
          <>
            <button onClick={() => loadStudents({ force: true })} className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white/90 px-3 text-slate-600 shadow-sm transition hover:bg-slate-50">
              <RefreshCw size={15} />
            </button>
            <button onClick={handleAdd} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
              <Plus size={16} />
              Thêm
            </button>
          </>
        )}
        pills={(
          <>
            <LearningInfoPill>{totalStudentsCount} học viên</LearningInfoPill>
            <LearningInfoPill>Trang {currentPage}/{totalPages}</LearningInfoPill>
          </>
        )}
        stats={[
          { label: 'Tổng', value: totalStudentsCount, hint: '' },
          { label: 'Đang học', value: studentStats?.activeStudents ?? 0, hint: '' },
          { label: 'Chờ duyệt', value: studentStats?.pendingStudents ?? 0, hint: '' },
          { label: 'Có chứng chỉ', value: studentStats?.certifiedStudents ?? 0, hint: '' },
        ]}
      />

      {/* Main card */}
      <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white p-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] max-w-[360px]">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm tên, CCCD, email..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-7 pr-7 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
              />
              {searchTerm ? (
                <button type="button" onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={13} /></button>
              ) : null}
            </div>
            <button type="button" onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Filter size={13} /> Lọc
            </button>
            <button type="button" onClick={handleExportFiltered}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button type="button" onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              <Upload size={13} /> Import Excel
            </button>
            <span className="text-xs text-slate-400">
              {searching ? 'Đang tìm...' : `${paged.length}/${totalMatches}`}
            </span>
          </div>
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button onClick={() => setViewMode('table')}
              className={`rounded-md px-2 py-1 text-xs font-semibold transition ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <List size={14} />
            </button>
            <button onClick={() => setViewMode('grid')}
              className={`rounded-md px-2 py-1 text-xs font-semibold transition ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              <Grid size={14} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              <select value={filters.status} onChange={updateFilter('status')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                <option value="">Mọi trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="studying">Đang học</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              <select value={filters.registration_type} onChange={updateFilter('registration_type')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                <option value="">Mọi đăng ký</option>
                <option value="hoc">Có lớp</option>
                <option value="thi">Có lịch thi</option>
                <option value="none">Chưa ĐK</option>
              </select>
              <select value={filters.has_certificate} onChange={updateFilter('has_certificate')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                <option value="">Chứng chỉ</option>
                <option value="true">Đã có</option>
                <option value="false">Chưa có</option>
              </select>
              <input type="date" value={filters.created_from} onChange={updateFilter('created_from')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700" />
              <input type="date" value={filters.created_to} onChange={updateFilter('created_to')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700" />
              <button type="button" onClick={resetFilters} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Xóa</button>
            </div>
            {(normalizedSearch || activeFilters.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {normalizedSearch ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Từ khóa: {searchTerm.trim()}</span> : null}
                {activeFilters.map(([key, value]) => (
                  <span key={key} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{key}: {value}</span>
                ))}
              </div>
            )}
          </div>
        )}

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
          <AdminLoadingState
            title="Đang tải danh sách học viên"
            hint="Dữ liệu học viên được phục hồi từ cache gần nhất để mở lại nhanh hơn khi đổi tab."
            variant="desktop-list"
            accent="blue"
          />
        ) : viewMode === 'table' ? (
          <StudentTableView
            students={paged}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getImageUrl={resolveImageUrl}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            sortState={sortState}
            onSort={handleSort}
          />
        ) : (
          <StudentGridView
            students={paged}
            onViewDetail={handleViewDetail}
            getImageUrl={resolveImageUrl}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
            <span className="text-xs text-slate-400">
              Trang {currentPage}/{totalPages}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronLeft size={14} /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {showDetailModal && selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          getImageUrl={resolveImageUrl}
          toast={toast}
          onRefresh={loadStudents}
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
          getImageUrl={resolveImageUrl}
          onSubmit={showEditModal ? handleSubmitEdit : handleSubmitAdd}
          onClose={closeForm}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          student={deleteTarget}
          count={1}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Bulk delete confirm dialog */}
      {showBulkDeleteDlg && (
        <DeleteDialog
          student={null}
          count={bulkCount}
          busy={deleteBusy}
          progress={bulkProgress}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteDlg(false)}
        />
      )}

      {/* Import Excel modal */}
      {showImportModal && (
        <StudentImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            invalidateAdminData({
              keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
              source: 'students-import',
            });
            void loadStudents({ force: true });
          }}
        />
      )}
    </div>
  );
}
