import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, List, Grid, ChevronLeft, ChevronRight, RefreshCw,
         Trash2, Download, Bell, X, AlertTriangle, Search } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { resolveImageUrl } from '../../../utils/imageUrl';
import '../../../styles/admin/AdminModern.css';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import StudentTableView   from './students/StudentTableView';
import StudentGridView    from './students/StudentGridView';
import StudentDetailModal from './students/StudentDetailModal';
import StudentFormModal   from './students/StudentFormModal';
import { ADMIN_CACHE_KEYS, ADMIN_CACHE_TTL, getAdminCache, invalidateAdminData, setAdminCache } from '../shared/admin-cache';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import { LearningInfoPill, LearningWorkspaceHeader } from '../shared/LearningWorkspaceHeader';

// ─── Bulk Delete Confirm Dialog ────────────────────────────────────────────────
function BulkDeleteDialog({ count, onConfirm, onCancel }) {
  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-[fadeIn_0.2s_ease-out]">
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
  const [searchResults,   setSearchResults]   = useState(null);
  const [viewMode,        setViewMode]        = useState('table');
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
    ngay_cap_cccd: '', don_vi_cong_tac: '', password: ''
  });

  // Bulk selection state
  const [selectedIds,       setSelectedIds]       = useState(new Set());
  const [showBulkDeleteDlg, setShowBulkDeleteDlg] = useState(false);

  useEffect(() => { void loadStudents(); }, []);
  useAdminAutoRefresh(() => loadStudents({ force: true }), { minIntervalMs: 12000 });
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  useEffect(() => {
    const keyword = searchTerm.trim();

    if (!keyword) {
      setSearchResults(null);
      setSearching(false);
      return undefined;
    }

    if (keyword.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.searchStudents(keyword);
        if (cancelled) return;
        setSearchResults(Array.isArray(response?.data) ? response.data : []);
      } catch (error) {
        if (cancelled) return;
        setSearchResults([]);
        toast?.error(error?.message || 'Lỗi tìm kiếm học viên');
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchTerm, toast]);

  const loadStudents = async ({ force = false } = {}) => {
    const cached = force ? null : getAdminCache(ADMIN_CACHE_KEYS.students, ADMIN_CACHE_TTL.students);
    if (cached) {
      setStudents(cached.students || []);
      setStudentStats(cached.studentStats || null);
      setLoading(false);
      return cached.students || [];
    }

    setLoading(true);
    setSelectedIds(new Set()); // clear selection on reload
    try {
      if (force) {
        api.invalidateCache(['/students']);
      }
      const firstPage = await api.getStudents();
      const firstBatch = Array.isArray(firstPage?.data) ? firstPage.data : [];
      const nextStats = firstPage?.meta?.stats || null;

      const nextStudents = Array.from(
        new Map(firstBatch.map((student) => [student.id, student])).values()
      );
      setStudents(nextStudents);
      setStudentStats(nextStats);
      setAdminCache(ADMIN_CACHE_KEYS.students, { students: nextStudents, studentStats: nextStats });
      return nextStudents;
    } catch (err) { console.error('[StudentsManagement] loadStudents error:', err); toast?.error('Lỗi tải dữ liệu học viên'); setStudents([]); }
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
    try {
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

  const handleDelete = async (student) => {
    if (!confirm(`Xóa học viên "${student.ho_ten_full}"?`)) return;
    try {
      await api.deleteStudent(student.id);
      invalidateAdminData({
        keys: [ADMIN_CACHE_KEYS.students, ADMIN_CACHE_KEYS.dashboardOverview, ADMIN_CACHE_KEYS.mobileDashboardOverview],
        source: 'students-management',
      });
      toast?.success('Xóa thành công!');
      void loadStudents({ force: true });
    }
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
    if (success > 0 && failed > 0) toast?.warning(`Đã xóa ${success} học viên (${failed} lỗi)`);
    else if (success > 0) toast?.success(`Đã xóa thành công ${success} học viên`);
    else if (failed  > 0) toast?.error(`Không xóa được ${failed} học viên`);
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

  const handleBulkNotify = () => {
    toast?.info(`Tính năng gửi thông báo hàng loạt đang được phát triển`);
  };

  const closeForm   = () => { setShowAddModal(false); setShowEditModal(false); };
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const localFilteredStudents = useMemo(() => {
    if (!normalizedSearch) return students;

    return students.filter((student) => {
      const haystack = [
        student.ho_ten_full,
        student.cccd,
        student.email,
        student.sdt,
        student.dia_chi,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [students, normalizedSearch]);
  const filteredStudents = useMemo(() => {
    if (!normalizedSearch) return students;
    if (normalizedSearch.length < 2) return localFilteredStudents;
    return searchResults ?? localFilteredStudents;
  }, [students, normalizedSearch, searchResults, localFilteredStudents]);
  const paged       = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages  = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const bulkCount   = selectedIds.size;
  const totalStudentsCount = studentStats?.totalStudents ?? students.length;

  return (
    <div className="admin-page">
      <LearningWorkspaceHeader
        icon={Users}
        tone="emerald"
        title="Học viên"
        description="Rà soát hồ sơ, liên hệ, đăng ký lớp học và lịch sử học tập của học viên trong một workspace gọn, dễ quét và ưu tiên thao tác quản trị thường xuyên."
        actions={(
          <>
            <button onClick={() => loadStudents({ force: true })} className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 px-4 text-slate-600 shadow-sm transition hover:bg-slate-50">
              <RefreshCw size={18} />
            </button>
            <button onClick={handleAdd} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_18px_36px_-22px_rgba(16,185,129,0.55)] transition hover:bg-emerald-700">
              <Plus size={18} />
              Thêm học viên
            </button>
          </>
        )}
        pills={(
          <>
            <LearningInfoPill>Tổng {totalStudentsCount} học viên</LearningInfoPill>
            <LearningInfoPill>Trang {currentPage}/{totalPages}</LearningInfoPill>
            {normalizedSearch ? <LearningInfoPill>Kết quả lọc {filteredStudents.length}</LearningInfoPill> : null}
            {bulkCount > 0 ? <LearningInfoPill>Đang chọn {bulkCount}</LearningInfoPill> : null}
          </>
        )}
        stats={[
          { label: 'Tổng học viên', value: totalStudentsCount, hint: 'Toàn bộ hồ sơ hiện có trong hệ thống.' },
          { label: 'Đang học', value: studentStats?.activeStudents ?? students.filter((s) => s.registrations?.some((r) => ['studying', 'active', 'approved'].includes(r.status))).length, hint: 'Học viên đang có lớp hoặc trạng thái hoạt động.' },
          { label: 'Chờ duyệt', value: studentStats?.pendingStudents ?? students.filter((s) => s.registrations?.some((r) => r.status === 'pending')).length, hint: 'Học viên còn hồ sơ đăng ký chưa được xử lý.' },
          { label: 'Có chứng chỉ', value: studentStats?.certifiedStudents ?? students.filter((s) => s.registrations?.some((r) => r.status === 'certified')).length, hint: 'Học viên đã hoàn thành và có chứng chỉ liên quan.' },
        ]}
      />

      {/* Main card */}
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_64px_-44px_rgba(15,23,42,0.28)]">

        {/* Toolbar */}
        <div className="admin-toolbar-unified">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="admin-search-shell min-w-[300px] max-w-[520px]">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên, CCCD, email, số điện thoại..."
                className="admin-search-input"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <span className="admin-toolbar-meta">
              {searching ? 'Đang tìm học viên...' : `Đang xem ${paged.length} / ${filteredStudents.length} học viên`}
            </span>
          </div>
          {/* View toggle */}
          <div className="admin-view-toggle">
            <button
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? 'active' : ''}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'active' : ''}
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
