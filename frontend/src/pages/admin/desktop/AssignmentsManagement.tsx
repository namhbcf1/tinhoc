// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Clock, Search, FileText, Eye, CheckCircle, XCircle, AlertCircle, Download, Star } from 'lucide-react';
import api from '../../../services/api';
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
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import { AdminPageHeader, AdminSummaryPill } from '../shared/AdminPageHeader';
import { getApiBaseUrl } from '../../../utils/api-base-url.js';
import { getStorageValue } from '../../../utils/browser-storage.js';
import {
    ADMIN_CACHE_KEYS,
    ADMIN_CACHE_TTL,
    clearAdminCachePrefix,
    getAdminCache,
    setAdminCache,
} from '../shared/admin-cache';

const API_URL = getApiBaseUrl();

export default function AssignmentsManagement() {
    const { toast } = useToast();
    const [filterClassId, setFilterClassId] = useState('');
    const assignmentCacheKey = `${ADMIN_CACHE_KEYS.assignments}:${filterClassId || 'all'}`;
    const cachedAssignments = getAdminCache(assignmentCacheKey, ADMIN_CACHE_TTL.assignments) || [];
    const cachedClasses = getAdminCache(ADMIN_CACHE_KEYS.assignmentClasses, ADMIN_CACHE_TTL.classes) || [];

    const [assignments, setAssignments] = useState(cachedAssignments);
    const [classes, setClasses] = useState(cachedClasses);
    const [loading, setLoading] = useState(cachedAssignments.length === 0);
    const [showModal, setShowModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const getAdminToken = () => getStorageValue('admin_token');

    useEffect(() => {
        loadClasses();
        loadAssignments();
    }, [filterClassId]);

    const loadClasses = async ({ force = false } = {}) => {
        if (!force) {
            const cached = getAdminCache(ADMIN_CACHE_KEYS.assignmentClasses, ADMIN_CACHE_TTL.classes);
            if (cached) {
                setClasses(cached);
                return;
            }
        }

        try {
            const token = getAdminToken();
            const response = await fetch(`${API_URL}/online-classes?status=active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                const nextClasses = data.data.classes || [];
                setClasses(nextClasses);
                setAdminCache(ADMIN_CACHE_KEYS.assignmentClasses, nextClasses);
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const loadAssignments = async ({ force = false } = {}) => {
        const currentCacheKey = `${ADMIN_CACHE_KEYS.assignments}:${filterClassId || 'all'}`;
        if (!force) {
            const cached = getAdminCache(currentCacheKey, ADMIN_CACHE_TTL.assignments);
            if (cached) {
                setAssignments(cached);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        try {
            const token = getAdminToken();
            let url = `${API_URL}/assignments?status=`;
            if (filterClassId) url += `&class_id=${filterClassId}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                const nextAssignments = data.data.assignments || [];
                setAssignments(nextAssignments);
                setAdminCache(currentCacheKey, nextAssignments);
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
        const token = getAdminToken();

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
                clearAdminCachePrefix(ADMIN_CACHE_KEYS.assignments);
                loadAssignments({ force: true });
            } else {
                toast?.error(data.message || 'Lỗi');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        }
    };

    const handleDelete = async () => {
        if (!toDelete) return;
        const token = getAdminToken();

        try {
            const response = await fetch(`${API_URL}/assignments/${toDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                toast?.success('Xóa thành công');
                clearAdminCachePrefix(ADMIN_CACHE_KEYS.assignments);
                loadAssignments({ force: true });
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
        const token = getAdminToken();
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
        const token = getAdminToken();

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

    const downloadSubmission = async (subId, fileName) => {
        try {
            await api.downloadAssignmentSubmission(subId, fileName);
        } catch (error) {
            toast?.error('Lỗi tải file: ' + error.message);
        }
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

                                        <Button size="sm" variant="outline" onClick={() => downloadSubmission(sub.id, sub.file_name)}>
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
        <div className="admin-page">
            <AdminPageHeader
                icon={FileText}
                title="Quản lý bài tập"
                description="Tạo bài tập, theo dõi bài nộp và chấm điểm trong cùng một workspace vận hành."
                pills={(
                    <>
                        <AdminSummaryPill>{filteredAssignments.length} bài tập</AdminSummaryPill>
                        <AdminSummaryPill>{classes.length} lớp đang mở</AdminSummaryPill>
                    </>
                )}
                actions={(
                    <button onClick={handleCreate} className="admin-btn admin-btn-primary">
                        <Plus size={16} /> Tạo bài tập
                    </button>
                )}
            />

            <div className="admin-toolbar-unified">
                <div className="admin-toolbar-meta"><Search size={16} /> Tìm & lọc</div>
                <Select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)} className="min-h-[44px] min-w-[220px] rounded-[18px] border border-[rgba(19,34,56,0.14)] bg-[rgba(255,250,241,0.86)] px-4 text-sm font-bold text-[var(--admin-text)] outline-none">
                    <option value="">Tất cả lớp</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.class_name}</option>
                    ))}
                </Select>

                <Input
                    placeholder="Tìm bài tập..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="min-h-[44px] min-w-[220px] flex-1 rounded-[18px] border-[rgba(19,34,56,0.14)] bg-[rgba(255,250,241,0.86)] font-semibold"
                />
            </div>

            {/* List */}
            {loading ? (
                <AdminLoadingState
                    title="Đang tải danh sách bài tập"
                    hint="Bài tập và danh sách lớp sẽ được giữ tạm để quay lại tab nhanh hơn."
                    variant="desktop-list"
                    accent="violet"
                />
            ) : filteredAssignments.length === 0 ? (
                <div className="admin-empty-state"><FileText size={48} /><p>Chưa có bài tập nào</p></div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredAssignments.map(item => (
                        <Card key={item.id} className="overflow-hidden rounded-[28px] border border-[rgba(19,34,56,0.12)] bg-[linear-gradient(180deg,rgba(255,250,241,0.96),rgba(255,250,241,0.86))] shadow-[0_20px_54px_-42px_rgba(19,34,56,0.36)] transition-all hover:-translate-y-0.5 hover:border-[rgba(200,169,106,0.34)] hover:shadow-[0_28px_70px_-46px_rgba(19,34,56,0.42)]">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-3">
                                    <Badge className={item.status === 'open' ? 'border border-[rgba(29,111,95,0.18)] bg-[rgba(29,111,95,0.10)] text-[var(--admin-primary)]' : 'border border-[rgba(19,34,56,0.12)] bg-[rgba(239,227,209,0.66)] text-[var(--admin-text-muted)]'}>
                                        {item.status === 'open' ? 'Đang mở' : 'Đã đóng'}
                                    </Badge>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="rounded-xl text-[var(--admin-text-muted)] hover:text-[var(--admin-ink)]">
                                            <Edit size={14} />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setToDelete(item); setShowDeleteConfirm(true); }} className="rounded-xl">
                                            <Trash2 size={14} className="text-[var(--admin-danger)]" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="mt-3 text-xl font-black tracking-[-0.03em] text-[var(--admin-ink)]">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm font-semibold text-[var(--admin-text-muted)]">
                                <p className="line-clamp-2 leading-6">{item.description || 'Không có mô tả'}</p>
                                <p className="rounded-[16px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.72)] px-3 py-2"><strong className="text-[var(--admin-ink)]">Lớp:</strong> {getClassName(item.class_id)}</p>
                                <p className="flex items-center gap-2 rounded-[16px] border border-[rgba(200,169,106,0.18)] bg-[rgba(200,169,106,0.12)] px-3 py-2 text-[var(--admin-ink)]"><Calendar size={14} className="text-[var(--admin-champagne)]" /> Hạn: {item.due_date ? formatDateVN(item.due_date) : 'Không giới hạn'}</p>
                            </CardContent>
                            <CardFooter className="border-t border-[rgba(19,34,56,0.10)] pt-4">
                                <Button variant="outline" size="sm" className="w-full rounded-[18px] border-[rgba(19,34,56,0.14)] bg-[rgba(255,250,241,0.78)] font-black text-[var(--admin-ink)] hover:border-[rgba(200,169,106,0.32)]" onClick={() => handleViewSubmissions(item)}>
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
                            <Button type="submit" className="bg-[var(--admin-ink)] text-[var(--admin-champagne)] hover:bg-[#0b1728]">
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
