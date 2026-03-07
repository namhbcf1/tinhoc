import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import api from '../../services/api';

export default function AddStudentModal({ isOpen, onClose, classId, onSuccess }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadAvailableStudents();
        } else {
            // Reset state when modal closes
            setSearchTerm('');
            setStudents([]);
            setSelectedStudent(null);
            setError('');
        }
    }, [isOpen, classId]);

    useEffect(() => {
        if (searchTerm.length >= 2) {
            const timer = setTimeout(() => {
                loadAvailableStudents();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [searchTerm]);

    const loadAvailableStudents = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.getAvailableStudents(classId, searchTerm);
            if (response.success) {
                // Handle both { data: [...] } and { data: { data: [...] } } formats
                const studentList = Array.isArray(response.data)
                    ? response.data
                    : (Array.isArray(response.data?.data) ? response.data.data : []);
                setStudents(studentList);
            } else {
                setError(response.message || response.error || 'Lỗi tải danh sách học viên');
                setStudents([]);
            }
        } catch (err) {
            setError('Lỗi kết nối: ' + err.message);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async () => {
        if (!selectedStudent) return;

        setAdding(true);
        setError('');
        try {
            const response = await api.addStudentToClass(classId, selectedStudent.id);
            if (response.success) {
                onSuccess?.();
                onClose();
            } else {
                setError(response.message || 'Lỗi thêm học viên');
            }
        } catch (err) {
            setError('Lỗi: ' + err.message);
        } finally {
            setAdding(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Thêm học viên vào lớp</h2>
                            <p className="text-sm text-slate-500">Tìm và thêm học viên đã đăng ký trong hệ thống</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-6 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Tìm theo tên, CCCD, email, SĐT..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {searchTerm.length > 0 && searchTerm.length < 2 && (
                        <p className="text-xs text-slate-500 mt-2">Nhập ít nhất 2 ký tự để tìm kiếm</p>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Students List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Loader2 size={32} className="animate-spin mb-3" />
                            <p>Đang tìm kiếm...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <UserPlus size={48} className="mx-auto text-slate-300 mb-3" />
                            <p className="font-medium">
                                {searchTerm ? 'Không tìm thấy học viên nào' : 'Nhập từ khóa để tìm kiếm học viên'}
                            </p>
                            <p className="text-sm mt-1">Chỉ hiển thị học viên chưa đăng ký lớp này</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {students.map((student) => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${selectedStudent?.id === student.id
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${selectedStudent?.id === student.id
                                            ? 'bg-purple-200 text-purple-700'
                                            : 'bg-slate-200 text-slate-600'
                                            }`}>
                                            {student.ho_ten_full?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-900">{student.ho_ten_full}</div>
                                            <div className="text-sm text-slate-600 flex gap-4 mt-1">
                                                <span>CCCD: {student.cccd}</span>
                                                <span>SĐT: {student.sdt}</span>
                                            </div>
                                            {student.email && (
                                                <div className="text-xs text-slate-500 mt-0.5">{student.email}</div>
                                            )}
                                        </div>
                                        {selectedStudent?.id === student.id && (
                                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={adding}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleAddStudent}
                        disabled={!selectedStudent || adding}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {adding ? (
                            <>
                                <Loader2 size={16} className="mr-2 animate-spin" />
                                Đang thêm...
                            </>
                        ) : (
                            <>
                                <UserPlus size={16} className="mr-2" />
                                Thêm học viên
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
