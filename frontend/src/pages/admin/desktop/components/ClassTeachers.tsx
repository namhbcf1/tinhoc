import { useState, useEffect } from 'react';
import { Plus, Trash2, UserPlus, User } from 'lucide-react';
import api from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Label } from '../../../components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/Dialog';
import { useToast } from '../../../components/ui/ToastContainer';

export default function ClassTeachers({ classId }) {
    const { toast } = useToast();
    const [teachers, setTeachers] = useState([]);
    const [availableTeachers, setAvailableTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        teacher_id: '',
        role: 'teacher'
    });

    useEffect(() => {
        loadClassTeachers();
        loadAllTeachers();
    }, [classId]);

    const loadClassTeachers = async () => {
        setLoading(true);
        try {
            const response = await api.getClassTeachers(classId);
            setTeachers(response.success && Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error loading class teachers:', error);
            // Don't show toast on load error to avoid spam if just empty
            setTeachers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadAllTeachers = async () => {
        try {
            const response = await api.getAllTeachers(1000, 0); // Fetch all (up to 1000)
            if (response.success && Array.isArray(response.data)) {
                setAvailableTeachers(response.data);
            }
        } catch (error) {
            console.error('Error loading all teachers:', error);
        }
    };

    const handleAddTeacher = () => {
        setFormData({
            teacher_id: '',
            role: 'teacher'
        });
        setShowModal(true);
    };

    const handleRemoveTeacher = async (assignmentId, teacherName) => {
        if (!confirm(`Bạn có chắc chắn muốn gỡ giáo viên "${teacherName}" khỏi lớp này?`)) return;

        try {
            await api.removeTeacherFromClass(assignmentId);
            toast?.success('Đã gỡ giáo viên khỏi lớp');
            loadClassTeachers();
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.teacher_id) {
            toast?.error('Vui lòng chọn giáo viên');
            return;
        }

        try {
            await api.assignTeacherToClass(classId, formData.teacher_id, formData.role);
            toast?.success('Đã gán giáo viên thành công');
            setShowModal(false);
            loadClassTeachers();
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const getRoleName = (role) => {
        switch (role) {
            case 'teacher': return 'Giáo viên chính';
            case 'assistant': return 'Trợ giảng';
            case 'coordinator': return 'Quản lý lớp';
            default: return role;
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'teacher': return 'bg-blue-100 text-blue-700';
            case 'assistant': return 'bg-purple-100 text-purple-700';
            case 'coordinator': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải danh sách giáo viên...</div>;

    // Filter out teachers already assigned
    const unassignedTeachers = availableTeachers.filter(
        t => !teachers.some(assigned => assigned.teacher_id === t.id)
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} className="text-blue-600" />
                    Đội ngũ giảng dạy
                </h3>
                <Button onClick={handleAddTeacher} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                    <Plus size={16} className="mr-2" /> Thêm giáo viên
                </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-4 py-3">Giáo viên</th>
                            <th className="px-4 py-3">Vai trò</th>
                            <th className="px-4 py-3">Liên hệ</th>
                            <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {teachers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <User size={32} className="text-slate-300" />
                                        <p>Chưa có giáo viên nào được gán vào lớp này.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : teachers.map((item) => (
                            <tr key={item.assignment_id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            {item.ten?.charAt(0) || 'G'}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">{item.ho_ten_full}</div>
                                            <div className="text-xs text-slate-500">{item.teacher_code}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(item.role)}`}>
                                        {getRoleName(item.role)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-slate-600 text-xs">{item.email}</div>
                                    <div className="text-slate-600 text-xs">{item.sdt}</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleRemoveTeacher(item.assignment_id, item.ho_ten_full)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gán giáo viên vào lớp</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Chọn giáo viên</Label>
                            {unassignedTeachers.length > 0 ? (
                                <select
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                    value={formData.teacher_id}
                                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                                    required
                                >
                                    <option value="">-- Chọn giáo viên --</option>
                                    {unassignedTeachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.ho_ten_full} ({t.teacher_code})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-red-500 italic p-2 bg-red-50 rounded border border-red-100">
                                    Tất cả giáo viên hiện có đã được gán vào lớp này rồi.
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Vai trò</Label>
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="teacher">Giáo viên chính</option>
                                <option value="assistant">Trợ giảng</option>
                                <option value="coordinator">Quản lý lớp</option>
                            </select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                            <Button type="submit" className="bg-blue-600 text-white" disabled={unassignedTeachers.length === 0}>
                                Gán giáo viên
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
