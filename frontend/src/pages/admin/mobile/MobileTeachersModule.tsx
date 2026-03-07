import React, { useState, useEffect, useRef } from 'react';
import {
    GraduationCap, Search, Plus, Edit2, Trash2, Lock, Unlock,
    Mail, Phone, Building, X, ChevronRight, RefreshCw, Filter, User
} from 'lucide-react';
import { useToast } from '../../../components/ui/ToastContainer';
import { useTeachersManagement } from '../shared/hooks/useTeachersManagement';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

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
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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

// ============= TEACHER CARD =============
const TeacherCard = ({ teacher, onEdit, onToggleStatus, onDelete }) => {
    const isActive = teacher.status === 'active';
    const initials = teacher.ho_ten_full?.charAt(0) || teacher.ho?.charAt(0) || 'G';

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                    {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800 truncate">{teacher.ho_ten_full}</h4>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{teacher.position || 'Giáo viên'}</p>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Mail size={12} />
                            <span className="truncate">{teacher.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone size={12} />
                            <span>{teacher.sdt}</span>
                        </div>
                        {teacher.department && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Building size={12} />
                                <span>{teacher.department}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                <span className="text-xs text-slate-400 font-mono">{teacher.teacher_code}</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(teacher)}
                        className="p-2 text-blue-600 bg-blue-50 rounded-lg active:bg-blue-100"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onToggleStatus(teacher)}
                        className={`p-2 rounded-lg active:opacity-80 ${isActive ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'}`}
                    >
                        {isActive ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button
                        onClick={() => onDelete(teacher)}
                        className="p-2 text-red-600 bg-red-50 rounded-lg active:bg-red-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============= TEACHER FORM SHEET =============
const TeacherFormSheet = ({ isOpen, onClose, editingTeacher, onSuccess }) => {
    const { success, error } = useToast();
    const { createTeacher, updateTeacher } = useTeachersManagement();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        teacher_code: '', ho: '', ten_dem: '', ten: '',
        email: '', sdt: '', password: '',
        department: '', position: '', status: 'active'
    });

    useEffect(() => {
        if (editingTeacher) {
            setFormData({
                teacher_code: editingTeacher.teacher_code || '',
                ho: editingTeacher.ho || '',
                ten_dem: editingTeacher.ten_dem || '',
                ten: editingTeacher.ten || '',
                email: editingTeacher.email || '',
                sdt: editingTeacher.sdt || '',
                password: '',
                department: editingTeacher.department || '',
                position: editingTeacher.position || '',
                status: editingTeacher.status || 'active'
            });
        } else {
            setFormData({
                teacher_code: '', ho: '', ten_dem: '', ten: '',
                email: '', sdt: '', password: '',
                department: '', position: '', status: 'active'
            });
        }
    }, [editingTeacher, isOpen]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (editingTeacher) {
                await updateTeacher(editingTeacher.id, formData);
                success('Cập nhật thành công');
            } else {
                await createTeacher(formData);
                success('Tạo thành công');
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
        <BottomSheet isOpen={isOpen} onClose={onClose} title={editingTeacher ? 'Cập nhật giáo viên' : 'Thêm giáo viên'} height="95vh">
            <div className="p-4 space-y-4 pb-8">
                {/* Name Fields */}
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Họ *</label>
                        <input
                            type="text"
                            value={formData.ho}
                            onChange={(e) => setFormData({ ...formData, ho: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nguyễn"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Tên đệm</label>
                        <input
                            type="text"
                            value={formData.ten_dem}
                            onChange={(e) => setFormData({ ...formData, ten_dem: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Văn"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1 block">Tên *</label>
                        <input
                            type="text"
                            value={formData.ten}
                            onChange={(e) => setFormData({ ...formData, ten: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="A"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Mã GV *</label>
                        <input
                            type="text"
                            value={formData.teacher_code}
                            onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                            disabled={!!editingTeacher}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 font-mono"
                            placeholder="GV001"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Trạng thái</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Ngưng</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Email *</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="teacher@example.com"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">Số điện thoại *</label>
                    <input
                        type="tel"
                        value={formData.sdt}
                        onChange={(e) => setFormData({ ...formData, sdt: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0123456789"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Khoa/Bộ môn</label>
                        <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Khoa CNTT"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600 mb-1.5 block">Chức vụ</label>
                        <input
                            type="text"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Giảng viên"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-slate-600 mb-1.5 block">
                        {editingTeacher ? 'Mật khẩu mới' : 'Mật khẩu *'}
                    </label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={editingTeacher ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'}
                    />
                </div>

                {/* Submit */}
                <div className="pt-4 sticky bottom-0 bg-white">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? 'Đang xử lý...' : (editingTeacher ? 'Cập nhật' : 'Thêm giáo viên')}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
};

// ============= CONFIRM DELETE =============
const ConfirmDeleteSheet = ({ isOpen, onClose, teacher, onConfirm }) => {
    const { success, error } = useToast();
    const { deleteTeacher } = useTeachersManagement();
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await deleteTeacher(teacher.id);
            success('Xóa thành công');
            onConfirm?.();
            onClose();
        } catch (err) {
            error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!teacher) return null;

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" height="auto">
            <div className="p-4 pb-8">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 size={32} className="text-red-600" />
                    </div>
                    <p className="text-slate-700">Xóa giáo viên</p>
                    <p className="font-bold text-slate-900 text-lg">"{teacher.ho_ten_full}"?</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                    >
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
export default function MobileTeachersModule() {
    const { success, error } = useToast();
    const { teachers, loading, filterTeachers, getStats, toggleTeacherStatus, loadTeachers } = useTeachersManagement();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [deleteTeacher, setDeleteTeacher] = useState(null);

    const filteredTeachers = filterTeachers(searchTerm, filterStatus);
    const stats = getStats();

    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);
        setShowForm(true);
    };

    const handleCreate = () => {
        setEditingTeacher(null);
        setShowForm(true);
    };

    const handleToggleStatus = async (teacher) => {
        try {
            await toggleTeacherStatus(teacher.id, teacher.status);
            success(`Đã ${teacher.status === 'active' ? 'khóa' : 'kích hoạt'}`);
        } catch (err) {
            error('Lỗi: ' + err.message);
        }
    };

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await loadTeachers();
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 pt-4 pb-6 safe-area-inset-top">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Quản lý Giáo viên</h2>
                    <button
                        onClick={handleCreate}
                        className="p-2 bg-white/20 rounded-xl text-white active:bg-white/30"
                    >
                        <Plus size={22} />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, mã GV, email..."
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

                {/* Filter Pills */}
                {showFilters && (
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
                        {[
                            { value: '', label: 'Tất cả' },
                            { value: 'active', label: 'Hoạt động' },
                            { value: 'inactive', label: 'Ngưng' },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilterStatus(f.value)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterStatus === f.value
                                    ? 'bg-white text-blue-600'
                                    : 'bg-white/20 text-white'
                                    }`}
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
                            <p className="text-xs text-slate-500">Hoạt động</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
                            <p className="text-xs text-slate-500">Ngưng</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="p-4 pb-24">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw size={32} className="animate-spin text-blue-600" />
                        <p className="text-slate-500">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredTeachers.length > 0 ? (
                    <div className="space-y-3">
                        {filteredTeachers.map((teacher) => (
                            <TeacherCard
                                key={teacher.id}
                                teacher={teacher}
                                onEdit={handleEdit}
                                onToggleStatus={handleToggleStatus}
                                onDelete={setDeleteTeacher}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <GraduationCap size={64} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Không có giáo viên nào</p>
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={handleCreate}
                className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-lg shadow-purple-300 flex items-center justify-center active:scale-95 transition-transform z-40"
            >
                <Plus size={26} />
            </button>

            {/* Sheets */}
            <TeacherFormSheet
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingTeacher(null);
                }}
                editingTeacher={editingTeacher}
                onSuccess={loadTeachers}
            />

            <ConfirmDeleteSheet
                isOpen={!!deleteTeacher}
                onClose={() => setDeleteTeacher(null)}
                teacher={deleteTeacher}
                onConfirm={loadTeachers}
            />
        </div>
    </PullToRefreshWrapper>
    );
}
