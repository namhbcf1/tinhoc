import React, { useState, useEffect, useMemo } from 'react';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import {
    FileText, Plus, Edit2, Trash2, Calendar, Search, Eye, CheckCircle, XCircle,
    AlertCircle, Download, X, Clock, Users, Star, Filter, RefreshCw, ChevronRight
} from 'lucide-react';
import { useToast } from '../../../components/ui/ToastContainer';
import { useAssignmentsManagement } from '../shared/hooks/useAssignmentsManagement';
import { formatDateVN } from '../../../utils/dateUtils';

// ============= BOTTOM SHEET =============
const BottomSheet = ({ isOpen, onClose, title, children, height = 'auto' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />
            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: height === 'auto' ? '90vh' : height }}
            >
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const getStatusConfig = (status) => {
    const config = {
        draft: { label: 'Nháp', color: 'bg-slate-100 text-slate-700', icon: FileText },
        active: { label: 'Đang mở', color: 'bg-green-100 text-green-700', icon: CheckCircle },
        closed: { label: 'Đã đóng', color: 'bg-red-100 text-red-700', icon: XCircle },
    };
    return config[status] || { label: status, color: 'bg-slate-100 text-slate-700', icon: FileText };
};

// ============= ASSIGNMENT CARD =============
const AssignmentCard = ({ assignment, className, onView, onEdit, onDelete }) => {
    const { label, color, icon: Icon } = getStatusConfig(assignment.status);
    const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date();

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <FileText size={22} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                        <h4 className="font-bold text-slate-800 truncate pr-2">{assignment.title}</h4>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0 ${color}`}>
                            <Icon size={10} /> {label}
                        </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-2 line-clamp-2">{assignment.description || 'Không có mô tả'}</p>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            <Users size={12} /> {className || 'Lớp học'}
                        </span>
                        {assignment.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                                <Calendar size={12} /> {formatDateVN(assignment.due_date)}
                            </span>
                        )}
                    </div>

                    {assignment.submission_count !== undefined && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                                {assignment.submission_count || 0} bài nộp
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-50">
                <button
                    onClick={() => onView(assignment)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg"
                >
                    <Eye size={12} /> Xem
                </button>
                <button
                    onClick={() => onEdit(assignment)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg"
                >
                    <Edit2 size={12} /> Sửa
                </button>
                <button
                    onClick={() => onDelete(assignment)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                >
                    <Trash2 size={12} /> Xóa
                </button>
            </div>
        </div>
    );
};

// ============= ASSIGNMENT FORM SHEET =============
const AssignmentFormSheet = ({ isOpen, onClose, editingItem, classes, onSuccess }) => {
    const { success, error } = useToast();
    const { createAssignment, updateAssignment } = useAssignmentsManagement();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '', description: '', class_id: '', due_date: '', max_score: 100, status: 'active'
    });

    useEffect(() => {
        if (editingItem) {
            setFormData({
                title: editingItem.title || '',
                description: editingItem.description || '',
                class_id: editingItem.class_id || '',
                due_date: editingItem.due_date ? formatDateVN(editingItem.due_date) : '',
                max_score: editingItem.max_score || 100,
                status: editingItem.status || 'active'
            });
        } else {
            setFormData({ title: '', description: '', class_id: '', due_date: '', max_score: 100, status: 'active' });
        }
    }, [editingItem, isOpen]);

    const handleDateInput = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
        if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
        if (value.length > 10) value = value.slice(0, 10);
        setFormData({ ...formData, due_date: value });
    };

    const parseVNDate = (vnDate) => {
        if (!vnDate) return null;
        const match = vnDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return null;
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const submitData = {
                ...formData,
                due_date: parseVNDate(formData.due_date),
                max_score: parseInt(formData.max_score) || 100
            };

            if (editingItem) {
                await updateAssignment(editingItem.id, submitData);
                success('Cập nhật thành công');
            } else {
                await createAssignment(submitData);
                success('Tạo bài tập thành công');
            }
            onSuccess?.();
            onClose();
        } catch (err) {
            error(err.message || 'Lỗi xử lý');
        } finally {
            setLoading(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title={editingItem ? 'Cập nhật bài tập' : 'Tạo bài tập mới'} height="90vh">
            <div className="p-4 space-y-4 pb-8">
                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Tiêu đề *</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nhập tiêu đề bài tập"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Mô tả</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="Mô tả chi tiết bài tập..."
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Lớp học *</label>
                    <select
                        value={formData.class_id}
                        onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.ten_lop}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Hạn nộp</label>
                        <input
                            type="text"
                            value={formData.due_date}
                            onChange={handleDateInput}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="dd/mm/yyyy"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Điểm tối đa</label>
                        <input
                            type="number"
                            value={formData.max_score}
                            onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="100"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Trạng thái</label>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="draft">Nháp</option>
                        <option value="active">Đang mở</option>
                        <option value="closed">Đã đóng</option>
                    </select>
                </div>

                <div className="pt-4 sticky bottom-0 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Đang xử lý...' : (editingItem ? 'Cập nhật' : 'Tạo bài tập')}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= SUBMISSIONS SHEET =============
const SubmissionsSheet = ({ isOpen, onClose, assignment }) => {
    const { getAssignmentSubmissions } = useAssignmentsManagement();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && assignment?.id) {
            loadSubmissions();
        }
    }, [isOpen, assignment?.id]);

    const loadSubmissions = async () => {
        setLoading(true);
        try {
            const data = await getAssignmentSubmissions(assignment.id);
            setSubmissions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Load submissions error:', err);
            setSubmissions([]);
        } finally {
            setLoading(false);
        }
    };

    if (!assignment) return null;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title={`Bài nộp - ${assignment.title}`} height="85vh">
            <div className="p-4 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw size={24} className="animate-spin text-indigo-600" />
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <FileText size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Chưa có bài nộp nào</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map(sub => (
                            <div key={sub.id} className="bg-white p-4 rounded-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-800">{sub.student_name || 'Học viên'}</span>
                                    {sub.score !== null && (
                                        <span className="flex items-center gap-1 text-amber-600 font-bold">
                                            <Star size={14} /> {sub.score}/{assignment.max_score || 100}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Clock size={12} /> {formatDateVN(sub.submitted_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </BottomSheet>
    );
};

// ============= CONFIRM DELETE =============
const ConfirmDeleteSheet = ({ isOpen, onClose, item, onConfirm }) => {
    const { success, error } = useToast();
    const { deleteAssignment } = useAssignmentsManagement();
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await deleteAssignment(item.id);
            success('Xóa thành công');
            onConfirm?.();
            onClose();
        } catch (err) {
            error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" height="auto">
            <div className="p-4 pb-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32} className="text-red-600" />
                    </div>
                    <p className="text-slate-700">Xóa bài tập</p>
                    <p className="font-bold text-slate-900 text-lg">"{item.title}"?</p>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl">
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                        {loading ? 'Đang xóa...' : 'Xóa'}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= MAIN COMPONENT =============
export default function MobileAssignmentsModule() {
    const { assignments, classes, loading, filterAssignments, getStats, loadAssignments } = useAssignmentsManagement();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [viewingItem, setViewingItem] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    const getClassName = (classId) => {
        const cls = classes.find(c => c.id === classId);
        return cls?.ten_lop || 'Lớp học';
    };

    const filteredAssignments = useMemo(() => {
        return filterAssignments(searchTerm, filterStatus);
    }, [assignments, searchTerm, filterStatus, filterAssignments]);

    const stats = getStats();

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowForm(true);
    };

    const handleCreate = () => {
        setEditingItem(null);
        setShowForm(true);
    };

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await loadSubmissions();
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 pt-4 pb-6 safe-area-inset-top">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Quản lý Bài tập</h2>
                    <button onClick={handleCreate} className="p-2 bg-white/20 rounded-xl text-white">
                        <Plus size={22} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                    <input
                        type="text"
                        placeholder="Tìm bài tập..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg ${showFilters ? 'bg-white/30' : ''}`}
                    >
                        <Filter size={18} className="text-white/80" />
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {[
                            { value: '', label: 'Tất cả' },
                            { value: 'active', label: 'Đang mở' },
                            { value: 'closed', label: 'Đã đóng' },
                            { value: 'draft', label: 'Nháp' },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilterStatus(f.value)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filterStatus === f.value ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="px-4 -mt-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                            <p className="text-xs text-slate-500">Tổng</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-green-600">{stats.active}</p>
                            <p className="text-xs text-slate-500">Đang mở</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-red-600">{stats.closed}</p>
                            <p className="text-xs text-slate-500">Đã đóng</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-4 pb-24">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw size={32} className="animate-spin text-indigo-600" />
                        <p className="text-slate-500">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredAssignments.length > 0 ? (
                    <div className="space-y-3">
                        {filteredAssignments.map((item) => (
                            <AssignmentCard
                                key={item.id}
                                assignment={item}
                                className={getClassName(item.class_id)}
                                onView={setViewingItem}
                                onEdit={handleEdit}
                                onDelete={setDeleteItem}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <FileText size={64} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Không có bài tập nào</p>
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={handleCreate}
                className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition-transform z-40"
            >
                <Plus size={26} />
            </button>

            {/* Sheets */}
            <AssignmentFormSheet
                isOpen={showForm}
                onClose={() => { setShowForm(false); setEditingItem(null); }}
                editingItem={editingItem}
                classes={classes}
                onSuccess={loadAssignments}
            />

            <SubmissionsSheet
                isOpen={!!viewingItem}
                onClose={() => setViewingItem(null)}
                assignment={viewingItem}
            />

            <ConfirmDeleteSheet
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                item={deleteItem}
                onConfirm={loadAssignments}
            />
        </div>
    </PullToRefreshWrapper>
    );
}
