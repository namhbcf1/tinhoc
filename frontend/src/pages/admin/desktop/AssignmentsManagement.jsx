import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Clock, Search, FileText, Eye, CheckCircle, XCircle, AlertCircle, Download, Star } from 'lucide-react';
import { formatDateVN, parseVNDate } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../../../components/ui/Dialog';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DateInput from '../../../components/ui/DateInput';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AssignmentsManagement() {
    const { toast } = useToast();
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClassId, setFilterClassId] = useState('');

    // Submissions view
    const [viewingSubmissions, setViewingSubmissions] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [gradingSubmission, setGradingSubmission] = useState(null);
    const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '', status: 'graded' });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        class_id: '',
        due_date: '',
        max_attempts: 1,
        max_file_size: 10
    });

    useEffect(() => {
        loadClasses();
        loadAssignments();
    }, [filterClassId]);

    const loadClasses = async () => {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_URL}/online-classes?status=active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setClasses(data.data.classes || []);
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            let url = `${API_URL}/assignments?status=`;
            if (filterClassId) url += `&class_id=${filterClassId}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setAssignments(data.data.assignments || []);
            }
        } catch (error) {
            console.error('Error loading assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingAssignment(null);
        setFormData({
            title: '',
            description: '',
            class_id: classes[0]?.id || '',
            due_date: '',
            max_attempts: 1,
            max_file_size: 10
        });
    };

    const handleCreate = () => {
        resetForm();
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditingAssignment(item);
        setFormData({
            title: item.title,
            description: item.description || '',
            class_id: item.class_id,
            due_date: item.due_date ? formatDateVN(item.due_date) : '',
            max_attempts: item.max_attempts || 1,
            max_file_size: Math.round((item.max_file_size || 10485760) / 1024 / 1024)
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('admin_token');

        // Convert date
        let due_date = null;
        if (formData.due_date) {
            const d = parseVNDate(formData.due_date);
            if (d) {
                due_date = d.toISOString().split('T')[0];
            }
        }

        const payload = {
            ...formData,
            due_date,
            max_file_size: parseInt(formData.max_file_size) * 1024 * 1024, // MB to bytes
            class_id: parseInt(formData.class_id)
        };

        try {
            const url = editingAssignment
                ? `${API_URL}/assignments/${editingAssignment.id}`
                : `${API_URL}/assignments`;

            const response = await fetch(url, {
                method: editingAssignment ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success) {
                toast?.success(editingAssignment ? 'Cập nhật thành công!' : 'Tạo bài tập thành công!');
                setShowModal(false);
                loadAssignments();
            } else {
                toast?.error(data.message || 'Lỗi');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const handleDelete = async () => {
        if (!toDelete) return;
        const token = localStorage.getItem('admin_token');

        try {
            const response = await fetch(`${API_URL}/assignments/${toDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                toast?.success('Xóa thành công');
                loadAssignments();
            } else {
                toast?.error(data.message);
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setShowDeleteConfirm(false);
            setToDelete(null);
        }
    };

    // Load submissions for an assignment
    const loadSubmissions = async (assignmentId) => {
        const token = localStorage.getItem('admin_token');
        try {
            const response = await fetch(`${API_URL}/assignments/${assignmentId}/submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSubmissions(data.data.submissions || []);
            }
        } catch (error) {
            console.error('Error loading submissions:', error);
        }
    };

    const handleViewSubmissions = (assignment) => {
        setViewingSubmissions(assignment);
        loadSubmissions(assignment.id);
    };

    const handleGrade = async () => {
        if (!gradingSubmission) return;
        const token = localStorage.getItem('admin_token');

        try {
            const response = await fetch(`${API_URL}/assignments/submissions/${gradingSubmission.id}/grade`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(gradeForm)
            });

            const data = await response.json();
            if (data.success) {
                toast?.success('Chấm điểm thành công!');
                setGradingSubmission(null);
                loadSubmissions(viewingSubmissions.id);
            } else {
                toast?.error(data.message);
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const downloadSubmission = (subId) => {
        const token = localStorage.getItem('admin_token');
        window.open(`${API_URL}/assignments/submissions/${subId}/file`, '_blank');
    };

    const getClassName = (classId) => {
        return classes.find(c => c.id === classId)?.class_name || 'N/A';
    };

    const filteredAssignments = assignments.filter(a =>
        !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Submissions View
    if (viewingSubmissions) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setViewingSubmissions(null)}>
                        ← Quay lại
                    </Button>
                    <h2 className="text-xl font-bold">Bài nộp: {viewingSubmissions.title}</h2>
                </div>

                <div className="grid gap-4">
                    {submissions.length === 0 ? (
                        <Card className="p-8 text-center text-slate-500">
                            Chưa có bài nộp nào
                        </Card>
                    ) : (
                        submissions.map(sub => (
                            <Card key={sub.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold">{sub.student_name}</p>
                                        <p className="text-sm text-slate-500">CCCD: {sub.student_cccd}</p>
                                        <p className="text-xs text-slate-400">Nộp lúc: {formatDateVN(sub.submitted_at)}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {sub.status === 'graded' ? (
                                            <Badge className="bg-green-100 text-green-700">Điểm: {sub.grade}</Badge>
                                        ) : (
                                            <Badge className="bg-yellow-100 text-yellow-700">Chờ chấm</Badge>
                                        )}

                                        <Button size="sm" variant="outline" onClick={() => downloadSubmission(sub.id)}>
                                            <Download size={14} className="mr-1" /> Tải file
                                        </Button>

                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setGradingSubmission(sub);
                                                setGradeForm({ grade: sub.grade || '', feedback: sub.feedback || '', status: 'graded' });
                                            }}
                                        >
                                            <Star size={14} className="mr-1" /> Chấm điểm
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Grade Modal */}
                <Dialog open={!!gradingSubmission} onOpenChange={() => setGradingSubmission(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Chấm điểm</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 p-4">
                            <div>
                                <Label>Điểm</Label>
                                <Input
                                    value={gradeForm.grade}
                                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                                    placeholder="VD: 8/10, A, Đạt..."
                                />
                            </div>
                            <div>
                                <Label>Nhận xét</Label>
                                <textarea
                                    className="w-full border rounded-lg p-2 min-h-[80px]"
                                    value={gradeForm.feedback}
                                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                    placeholder="Nhận xét cho học viên..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setGradingSubmission(null)}>Hủy</Button>
                            <Button onClick={handleGrade}>Lưu điểm</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Main List View
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <div className="flex items-center gap-2">
                    <FileText className="text-purple-600" size={24} />
                    <h2 className="font-bold text-lg">Quản lý Bài tập</h2>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}>
                        <option value="">Tất cả lớp</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.class_name}</option>
                        ))}
                    </Select>

                    <Input
                        placeholder="Tìm bài tập..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48"
                    />

                    <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                        <Plus size={16} className="mr-2" /> Tạo bài tập
                    </Button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Đang tải...</div>
            ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed">
                    <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">Chưa có bài tập nào</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssignments.map(item => (
                        <Card key={item.id} className="hover:shadow-lg transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge className={item.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                                        {item.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                                    </Badge>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                            <Edit size={14} />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setToDelete(item); setShowDeleteConfirm(true); }}>
                                            <Trash2 size={14} className="text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="text-lg mt-2">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-slate-600">
                                <p className="line-clamp-2">{item.description || 'Không có mô tả'}</p>
                                <p><strong>Lớp:</strong> {getClassName(item.class_id)}</p>
                                <p><Calendar size={12} className="inline mr-1" /> Hạn: {item.due_date ? formatDateVN(item.due_date) : 'Không giới hạn'}</p>
                            </CardContent>
                            <CardFooter className="pt-3 border-t">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleViewSubmissions(item)}>
                                    <Eye size={14} className="mr-2" /> Xem bài nộp
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingAssignment ? 'Sửa bài tập' : 'Tạo bài tập mới'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 p-4">
                        <div>
                            <Label>Tiêu đề *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                placeholder="VD: Bài tập tuần 1"
                            />
                        </div>
                        <div>
                            <Label>Mô tả</Label>
                            <textarea
                                className="w-full border rounded-lg p-2 min-h-[80px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Hướng dẫn nộp bài..."
                            />
                        </div>
                        <div>
                            <Label>Lớp *</Label>
                            <Select
                                value={formData.class_id}
                                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                required
                            >
                                <option value="">Chọn lớp</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.class_name}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Hạn nộp</Label>
                                <DateInput
                                    value={formData.due_date}
                                    onChange={(val) => setFormData({ ...formData, due_date: val })}
                                    placeholder="dd/mm/yyyy"
                                />
                            </div>
                            <div>
                                <Label>Số lần nộp tối đa</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.max_attempts}
                                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Dung lượng tối đa (MB)</Label>
                            <Input
                                type="number"
                                min="1"
                                max="50"
                                value={formData.max_file_size}
                                onChange={(e) => setFormData({ ...formData, max_file_size: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
                            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                                {editingAssignment ? 'Lưu' : 'Tạo'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Xóa bài tập"
                message={`Xóa "${toDelete?.title}"? Tất cả bài nộp sẽ bị xóa vĩnh viễn.`}
            />
        </div>
    );
}
