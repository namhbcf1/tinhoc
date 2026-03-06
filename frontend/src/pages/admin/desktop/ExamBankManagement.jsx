import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, CheckCircle, Plus, Edit, Trash2, Search, Filter, X,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, Clock,
  TrendingUp, RefreshCw, AlertCircle, FolderOpen, BookOpen, Download, Upload,
} from 'lucide-react';
import api from '../../../services/api';
import ExamFormModal from './exam-components/ExamFormModal';
import ExcelImportModal from './exam-components/ExcelImportModal';

// ── helpers ──────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const STATUS_MAP = {
  draft: { label: 'Bản nháp', className: 'bg-gray-100 text-gray-800' },
  published: { label: 'Đã xuất bản', className: 'bg-green-100 text-green-800' },
  archived: { label: 'Đã lưu trữ', className: 'bg-yellow-100 text-yellow-800' },
};

const LEVEL_COLORS = {
  A1: 'bg-blue-100 text-blue-800', A2: 'bg-blue-200 text-blue-900',
  B1: 'bg-green-100 text-green-800', B2: 'bg-green-200 text-green-900',
  C1: 'bg-purple-100 text-purple-800', C2: 'bg-purple-200 text-purple-900',
  BASIC: 'bg-gray-100 text-gray-800',
};

const CATEGORY_COLORS = [
  { bg: 'from-blue-600 to-blue-700', badge: 'bg-blue-100 text-blue-700', light: 'bg-blue-50' },
  { bg: 'from-violet-600 to-violet-700', badge: 'bg-violet-100 text-violet-700', light: 'bg-violet-50' },
  { bg: 'from-emerald-600 to-emerald-700', badge: 'bg-emerald-100 text-emerald-700', light: 'bg-emerald-50' },
  { bg: 'from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-700', light: 'bg-amber-50' },
  { bg: 'from-rose-500 to-pink-600', badge: 'bg-rose-100 text-rose-700', light: 'bg-rose-50' },
  { bg: 'from-cyan-500 to-teal-600', badge: 'bg-cyan-100 text-cyan-700', light: 'bg-cyan-50' },
];

function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || STATUS_MAP.draft;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${info.className}`}>{info.label}</span>;
}

function LevelBadge({ level }) {
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${LEVEL_COLORS[level] || LEVEL_COLORS.BASIC}`}>{level}</span>;
}

// ── main component ────────────────────────────────────────────────────────────

export default function ExamBankManagement({ toast, onOpenQuestions }) {
  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [aggregates, setAggregates] = useState({ totalExams: 0, publishedExams: 0, totalAttempts: 0, completedAttempts: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

  const [categories, setCategories] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Group exams by category
  const groupedExams = useMemo(() => {
    const map = new Map();
    for (const exam of exams) {
      const key = exam.categoryName || 'Chưa phân loại';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(exam);
    }
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === 'Chưa phân loại') return 1;
        if (b === 'Chưa phân loại') return -1;
        return a.localeCompare(b, 'vi');
      })
      .map(([categoryName, examList]) => ({ categoryName, exams: examList }));
  }, [exams]);

  const fetchExams = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await api.getExams({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        level: levelFilter || undefined,
        categoryId: categoryFilter || undefined,
        sortBy, sortOrder,
        page: pagination.page, pageSize: pagination.pageSize,
      });
      setExams(response.exams || response.data || []);
      const pg = response.pagination || {};
      setPagination(prev => ({ ...prev, total: pg.total || 0, totalPages: pg.totalPages || 0 }));
      if (response.aggregates) setAggregates(response.aggregates);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đề thi');
      toast?.error(err.message || 'Không thể tải danh sách đề thi');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, levelFilter, categoryFilter, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  useEffect(() => { setPagination(prev => ({ ...prev, page: 1 })); }, [debouncedSearch]);
  useEffect(() => { fetchExams(); }, [fetchExams]);

  useEffect(() => {
    api.getCategories?.()
      .then(res => setCategories(res || []))
      .catch(() => {});
  }, []);

  const handleCreateExam = async (data) => {
    await api.createExam(data);
    toast?.success('Tạo đề thi thành công!');
    fetchExams();
  };

  const handleUpdateExam = async (data) => {
    if (!selectedExam) return;
    await api.updateExam(String(selectedExam.id), data);
    toast?.success('Cập nhật đề thi thành công!');
    fetchExams();
  };

  const handleDelete = async (exam) => {
    if ((exam.totalAttempts || 0) > 0) {
      toast?.error('Không thể xóa đề thi đã có lượt thi. Vui lòng lưu trữ (archive) thay vì xóa.');
      return;
    }
    setDeleteConfirmId(exam.id);
    setSelectedExam(exam);
  };

  const confirmDelete = async () => {
    if (!selectedExam) return;
    try {
      setIsDeleting(true);
      await api.deleteExam(String(selectedExam.id));
      toast?.success('Xóa đề thi thành công!');
      setDeleteConfirmId(null);
      setSelectedExam(null);
      fetchExams();
    } catch (err) {
      toast?.error(err.message || 'Không thể xóa đề thi');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleCategory = (name) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch(''); setStatusFilter(''); setLevelFilter(''); setCategoryFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = [statusFilter, levelFilter, categoryFilter].filter(Boolean).length;
  const completionRate = aggregates.totalAttempts > 0
    ? Math.round((aggregates.completedAttempts / aggregates.totalAttempts) * 100) : 0;
  const totalExams = aggregates.totalExams || pagination.total;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 border-l-4 border-blue-600 pl-3">QUẢN LÝ ĐỀ THI</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Tạo đề thi mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tổng đề thi', value: totalExams, icon: BookOpen, gradient: 'from-blue-500 to-blue-600', textColor: 'text-blue-100' },
          { label: 'Đã xuất bản', value: aggregates.publishedExams, icon: CheckCircle, gradient: 'from-emerald-500 to-emerald-600', textColor: 'text-emerald-100' },
          { label: 'Tổng lượt thi', value: aggregates.totalAttempts, icon: Users, gradient: 'from-violet-500 to-violet-600', textColor: 'text-violet-100' },
          { label: 'Hoàn thành', value: `${completionRate}%`, icon: TrendingUp, gradient: 'from-amber-500 to-orange-500', textColor: 'text-amber-100' },
        ].map(({ label, value, icon: Icon, gradient, textColor }) => (
          <div key={label} className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-white shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`${textColor} text-xs font-medium uppercase tracking-wide`}>{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text" placeholder="Tìm kiếm theo tiêu đề hoặc mã đề thi..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" /> Bộ lọc
            {activeFilterCount > 0 && <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">{activeFilterCount}</span>}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
            <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả cấp độ</option>
              {['A1','A2','B1','B2','C1','C2','BASIC'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Tất cả bộ môn</option>
              {categories.map(cat => <option key={cat.id} value={String(cat.id)}>{cat.name}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="created_at">Sắp xếp theo ngày</option>
              <option value="title">Sắp xếp theo tiêu đề</option>
              <option value="duration">Sắp xếp theo thời gian</option>
              <option value="status">Sắp xếp theo trạng thái</option>
            </select>
            <button onClick={() => setSortOrder(p => p === 'ASC' ? 'DESC' : 'ASC')} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50" title={sortOrder === 'ASC' ? 'Tăng dần' : 'Giảm dần'}>
              {sortOrder === 'ASC' ? '↑' : '↓'}
            </button>
            {(search || statusFilter || levelFilter || categoryFilter) && (
              <button onClick={resetFilters} className="px-3 py-2 text-red-600 border border-red-300 rounded-lg text-sm hover:bg-red-50 flex items-center gap-2">
                <X className="w-4 h-4" /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Đang tải danh sách đề thi...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchExams} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Thử lại</button>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">Chưa có đề thi nào</p>
          <p className="text-gray-400 text-sm mb-4">
            {search || statusFilter || levelFilter ? 'Không tìm thấy đề thi phù hợp với bộ lọc' : 'Bắt đầu bằng cách tạo đề thi mới'}
          </p>
          {!search && !statusFilter && !levelFilter && (
            <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4 inline mr-2" />Tạo đề thi mới
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {groupedExams.map((group, groupIndex) => {
              const isCollapsed = collapsedCategories.has(group.categoryName);
              const color = CATEGORY_COLORS[groupIndex % CATEGORY_COLORS.length];
              return (
                <div key={group.categoryName} className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <button onClick={() => toggleCategory(group.categoryName)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-sm`}>
                        <FolderOpen className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-800">{group.categoryName}</h3>
                      <span className={`px-2.5 py-0.5 ${color.badge} rounded-full text-xs font-semibold`}>{group.exams.length} đề</span>
                    </div>
                    <div className={`w-7 h-7 rounded-full ${isCollapsed ? 'bg-gray-100' : color.light} flex items-center justify-center`}>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronUp className="w-4 h-4 text-gray-600" />}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="border-t border-gray-100">
                      {group.exams.map((exam, i) => {
                        const cr = exam.totalAttempts > 0 ? Math.round((exam.completedAttempts / exam.totalAttempts) * 100) : 0;
                        const statusDot = exam.status === 'published' ? 'bg-emerald-500' : exam.status === 'archived' ? 'bg-amber-400' : 'bg-gray-300';
                        return (
                          <div key={exam.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/80 transition-all group ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                            <div className={`w-1 h-10 rounded-full ${statusDot} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 text-sm truncate">{exam.title}</h4>
                                <StatusBadge status={exam.status} />
                                <LevelBadge level={exam.level} />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.duration} phút</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{exam.totalAttempts || 0} lượt</span>
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{exam.sectionCount || 0} phần</span>
                                {exam.totalAttempts > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${cr}%` }} />
                                    </div>
                                    <span className="text-emerald-600 font-medium">{cr}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {onOpenQuestions && (
                                <button
                                  onClick={() => onOpenQuestions(exam)}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 border border-emerald-200 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" /> Câu hỏi
                                </button>
                              )}
                              <button onClick={() => { setSelectedExam(exam); setIsEditModalOpen(true); }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 border border-blue-200 transition-colors">
                                <Edit className="w-3.5 h-3.5" /> Sửa
                              </button>
                              <button onClick={() => handleDelete(exam)} className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 border border-red-200 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Hiển thị {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} trong tổng số {pagination.total} đề thi
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm">Trang {pagination.page} / {pagination.totalPages}</span>
                <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteConfirmId(null)} />
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-gray-900">Xác nhận xóa đề thi</h3>
            </div>
            <p className="text-gray-600 text-sm mb-6">Bạn có chắc chắn muốn xóa đề thi <strong>"{selectedExam?.title}"</strong>? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Hủy</button>
              <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExamFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreateExam} exam={null} title="Tạo đề thi mới" />
      <ExamFormModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedExam(null); }}
        onSubmit={handleUpdateExam}
        exam={selectedExam ? {
          title: selectedExam.title, description: selectedExam.description, code: selectedExam.code,
          level: selectedExam.level, duration: selectedExam.duration, status: selectedExam.status,
          layoutMode: selectedExam.layoutMode || 'LANGUAGE',
          categoryId: selectedExam.categoryId ? String(selectedExam.categoryId) : '',
        } : null}
        title="Chỉnh sửa đề thi"
      />
      <ExcelImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={() => { fetchExams(); toast?.success('Import đề thi thành công!'); }} />
    </div>
  );
}
