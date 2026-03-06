import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Eye, Trash2, Check, X, UserPlus, Search, Loader } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/ToastContainer';

export default function ClassRegistrations({ classId }) {
    const { toast } = useToast();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Add student modal state
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedStudentToAdd, setSelectedStudentToAdd] = useState(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        loadRegistrations();
    }, [classId]);

    const loadRegistrations = async () => {
        setLoading(true);
        try {
            const response = await api.getRegistrationsByClass(classId);
            setRegistrations(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error:', error);
            setRegistrations([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (regId, status) => {
        try {
            await api.updateRegistrationStatus(regId, status);
            loadRegistrations();
            toast?.success('Cập nhật trạng thái thành công');
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const handleUpdateSoPhach = async (regId, soPhach) => {
        try {
            await api.updateSoPhach(regId, soPhach);
            // No toast needed for onBlur update to avoid spam, or subtle one
            console.log('Updated so phach');
        } catch (error) {
            toast?.error('Lỗi cập nhật số phách: ' + error.message);
        }
    };

    const handleDelete = async (regId, name) => {
        if (!confirm(`Xác nhận xóa đăng ký của "${name}"?\nThao tác này không thể hoàn tác.`)) return;
        try {
            await api.deleteRegistration(regId);
            toast?.success('Đã xóa đăng ký');
            loadRegistrations();
        } catch (error) {
            toast?.error('Lỗi xóa: ' + error.message);
        }
    };

    const handleExportExcel = async () => {
        try {
            await api.downloadExcel(classId);
            toast?.success('Đang tải xuống file Excel...');
        } catch (error) {
            toast?.error('Lỗi xuất Excel: ' + error.message);
        }
    };

    // Search students with debounce
    const handleSearchStudents = useCallback(async (keyword) => {
        if (!keyword || keyword.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await api.getAvailableStudents(classId, keyword);
            setSearchResults(response.data || []);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, [classId]);

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            handleSearchStudents(searchKeyword);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchKeyword, handleSearchStudents]);

    // Add student to class
    const handleAddStudent = async () => {
        if (!selectedStudentToAdd) return;

        try {
            const response = await api.addStudentToClass(classId, selectedStudentToAdd.id);
            toast?.success(response.message || 'Đã thêm học sinh vào lớp');
            setShowAddStudentModal(false);
            setSearchKeyword('');
            setSearchResults([]);
            setSelectedStudentToAdd(null);
            loadRegistrations(); // Refresh list
        } catch (error) {
            toast?.error(error.message || 'Lỗi thêm học sinh');
        }
    };

    // Open modal and load initial students
    const handleOpenAddModal = async () => {
        setShowAddStudentModal(true);
        setSearchKeyword('');
        // Load initial 10 students
        try {
            const response = await api.getAvailableStudents(classId, '');
            setSearchResults(response.data || []);
        } catch (error) {
            console.error('Error loading students:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải danh sách...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Danh sách học viên ({registrations.length})</h3>
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleOpenAddModal} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <UserPlus size={16} className="mr-2" /> Thêm học sinh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-green-600 border-green-200 hover:bg-green-50">
                        <Download size={16} className="mr-2" /> Xuất Excel
                    </Button>
                </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-center w-14">STT</th>
                                <th className="px-4 py-3 w-32">Số phách</th>
                                <th className="px-4 py-3 min-w-[200px]">Học viên</th>
                                <th className="px-4 py-3">Ngày sinh</th>
                                <th className="px-4 py-3">Ngày đăng ký</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3">Học phí</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {registrations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500 italic">
                                        Chưa có học viên nào đăng ký lớp học này.
                                    </td>
                                </tr>
                            ) : registrations.map((reg, index) => (
                                <tr key={reg.registration_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                                    <td className="px-4 py-3">
                                        <input
                                            defaultValue={reg.so_phach || ''}
                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-blue-500 transition-colors bg-slate-50 focus:bg-white"
                                            placeholder="..."
                                            onBlur={(e) => {
                                                if (e.target.value !== reg.so_phach) {
                                                    handleUpdateSoPhach(reg.registration_id, e.target.value);
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {reg.image_3x4 ? (
                                                <img
                                                    src={reg.image_3x4}
                                                    alt={reg.ho_ten_full}
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reg.ho_ten_full) + '&background=random';
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                                                    {reg.ho_ten_full?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-slate-900">{reg.ho_ten_full}</div>
                                                <div className="text-xs text-slate-500 font-mono">{reg.cccd}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{formatDateVN(reg.ngay_sinh)}</td>
                                    <td className="px-4 py-3 text-slate-600 text-xs text-nowrap">
                                        {reg.created_at ? formatDateVN(reg.created_at, true) : '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={reg.status || 'pending'}
                                            onChange={(e) => handleUpdateStatus(reg.registration_id, e.target.value)}
                                            className="px-2 py-1 text-xs rounded-full border-none bg-slate-100 font-medium cursor-pointer focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="pending">⏳ Chờ duyệt</option>
                                            <option value="approved">✅ Đã duyệt</option>
                                            <option value="studying">📚 Đang học</option>
                                            <option value="completed">🏆 Hoàn thành</option>
                                            <option value="certified">📜 Đã cấp bằng</option>
                                            <option value="cancelled">❌ Hủy</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        {reg.payment_status === 'paid' || reg.payment_status === 'confirmed' ? (
                                            <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-200">Đã nộp</Badge>
                                        ) : reg.payment_status === 'pending' ? (
                                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Chờ xác nhận</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200">Chưa nộp</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" onClick={() => setSelectedStudent(reg)}>
                                            <Eye size={16} />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => handleDelete(reg.registration_id, reg.ho_ten_full)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Detail Modal */}
            <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Thông tin học viên</DialogTitle>
                    </DialogHeader>
                    {selectedStudent && (
                        <div className="bg-slate-50 p-4 rounded-lg space-y-3 text-sm">
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Họ và tên:</span>
                                <span className="col-span-2 font-medium">{selectedStudent.ho_ten_full}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                                <span className="text-slate-500">CCCD:</span>
                                <span className="col-span-2 font-mono">{selectedStudent.cccd}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Ngày sinh:</span>
                                <span className="col-span-2">{formatDateVN(selectedStudent.ngay_sinh)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Nơi sinh:</span>
                                <span className="col-span-2">{selectedStudent.noi_sinh}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Giới tính:</span>
                                <span className="col-span-2">{selectedStudent.gioi_tinh}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                                <span className="text-slate-500">SĐT/Email:</span>
                                <span className="col-span-2">{selectedStudent.sdt} <br /> {selectedStudent.email}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-slate-500">Địa chỉ:</span>
                                <span className="col-span-2">{selectedStudent.dia_chi}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setSelectedStudent(null)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Student Modal */}
            <Dialog open={showAddStudentModal} onOpenChange={setShowAddStudentModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Thêm học sinh vào lớp</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <Input
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="Tìm kiếm theo tên, CCCD, SĐT, email..."
                                className="pl-10 pr-10"
                            />
                            {searching && (
                                <Loader className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={20} />
                            )}
                        </div>

                        {/* Search Results */}
                        <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                            {searchResults.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    {searchKeyword.trim().length < 2
                                        ? 'Nhập ít nhất 2 ký tự để tìm kiếm...'
                                        : 'Không tìm thấy học sinh nào'}
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {searchResults.map((student) => (
                                        <div
                                            key={student.id}
                                            onClick={() => setSelectedStudentToAdd(student)}
                                            className={`p-4 cursor-pointer transition-colors hover:bg-slate-50 ${selectedStudentToAdd?.id === student.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {student.image_3x4 ? (
                                                    <img
                                                        src={student.image_3x4}
                                                        alt={student.ho_ten_full}
                                                        className="w-12 h-12 rounded-full object-cover bg-slate-100"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                                        {student.ho_ten_full?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="font-semibold text-slate-900">{student.ho_ten_full}</div>
                                                    <div className="text-sm text-slate-500 font-mono">{student.cccd}</div>
                                                    <div className="text-xs text-slate-400">{student.email} • {student.sdt}</div>
                                                </div>
                                                {selectedStudentToAdd?.id === student.id && (
                                                    <Check size={20} className="text-blue-600" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddStudentModal(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleAddStudent}
                            disabled={!selectedStudentToAdd}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Thêm vào lớp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
