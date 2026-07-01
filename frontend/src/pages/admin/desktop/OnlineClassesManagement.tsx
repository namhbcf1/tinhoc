// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Clock, Search, Video, ExternalLink, Copy, Eye, ArrowLeft, CheckCircle, PauseCircle, XCircle, MoreVertical } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN, parseVNDate } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../../../components/ui/Dialog';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import DateInput from '../../../components/ui/DateInput';
import ClassDetailDashboard from './ClassDetailDashboard';
import { getApiBaseUrl } from '../../../utils/api-base-url.js';
import { getStorageValue } from '../../../utils/browser-storage.js';

// ========================================
// STATUS BADGE COMPONENT
// ========================================
function StatusBadge({ status }) {
    const config = {
        active: { icon: CheckCircle, label: 'Đang diễn ra', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        paused: { icon: PauseCircle, label: 'Tạm dừng', className: 'bg-amber-100 text-amber-700 border-amber-200' },
        completed: { icon: CheckCircle, label: 'Đã kết thúc', className: 'bg-blue-100 text-blue-700 border-blue-200' },
        cancelled: { icon: XCircle, label: 'Đã hủy', className: 'bg-rose-100 text-rose-700 border-rose-200' }
    };

    const { icon: Icon, label, className } = config[status] || config.active;

    return (
        <Badge className={`${className} flex items-center gap-1.5 px-2.5 py-1 font-medium border`}>
            <Icon size={14} strokeWidth={2.5} />
            {label}
        </Badge>
    );
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function OnlineClassesManagement() {
    const API_URL = getApiBaseUrl();
    const { toast } = useToast();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [viewingClass, setViewingClass] = useState(null);
    const [showClassModal, setShowClassModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [classToDelete, setClassToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [regenLoadingId, setRegenLoadingId] = useState(null);

    const [formData, setFormData] = useState({
        class_name: '',
        description: '',
        schedule_rule: 'WEEKLY:1,3,5',
        schedule_time: '19:00-21:00',
        timezone: 'Asia/Ho_Chi_Minh',
        start_date: '',
        end_date: '',
        max_students: 50
    });

    const getAdminToken = () => getStorageValue('admin_token');

    // Schedule days for form
    const [scheduleDays, setScheduleDays] = useState([1, 3, 5]); // Default: Mon, Wed, Fri

    useEffect(() => {
        loadClasses();
    }, [statusFilter]);

    const loadClasses = async () => {
        setLoading(true);
        try {
            const token = getAdminToken();
            const response = await fetch(`${API_URL}/online-classes?status=${statusFilter}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.success) {
                const loadedClasses = data.data?.classes || data.data || [];
                setClasses(Array.isArray(loadedClasses) ? loadedClasses : []);
            } else {
                throw new Error(data.message || 'Không thể tải danh sách lớp học');
            }
        } catch (error) {
            console.error('Error loading online classes:', error);
            toast?.error('Lỗi tải danh sách lớp online: ' + (error.message || 'Unknown error'));
            setClasses([]); // Reset to empty array on error
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingClass(null);
        setFormData({
            class_name: '',
            description: '',
            schedule_rule: 'WEEKLY:1,3,5',
            schedule_time: '19:00-21:00',
            timezone: 'Asia/Ho_Chi_Minh',
            start_date: '',
            end_date: '',
            max_students: 50
        });
        setScheduleDays([1, 3, 5]);
    };

    const handleCreateClass = () => {
        resetForm();
        setShowClassModal(true);
    };

    const handleEdit = (cls, e) => {
        e?.stopPropagation();
        setEditingClass(cls);

        // Parse schedule_rule to get days
        const days = cls.schedule_rule?.includes(':')
            ? cls.schedule_rule.split(':')[1].split(',').map(Number)
            : [];

        setScheduleDays(days);
        setFormData({
            class_name: cls.class_name || '',
            description: cls.description || '',
            schedule_rule: cls.schedule_rule || 'WEEKLY:1,3,5',
            schedule_time: cls.schedule_time || '19:00-21:00',
            timezone: cls.timezone || 'Asia/Ho_Chi_Minh',
            start_date: cls.start_date ? formatDateVN(cls.start_date) : '',
            end_date: cls.end_date ? formatDateVN(cls.end_date) : '',
            max_students: cls.max_students || 50
        });
        setShowClassModal(true);
    };

    const handleDeleteClick = (cls, e) => {
        e?.stopPropagation();
        setClassToDelete(cls);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!classToDelete) return;
        try {
            const token = getAdminToken();
            const response = await fetch(`${API_URL}/online-classes/${classToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                toast?.success('Đã xóa lớp học online thành công');
                loadClasses();
            } else {
                const error = await response.json();
                toast?.error('Lỗi xóa lớp: ' + (error.message || 'Unknown error'));
            }
        } catch (error) {
            toast?.error('Lỗi khi xóa lớp: ' + error.message);
        } finally {
            setShowDeleteConfirm(false);
            setClassToDelete(null);
        }
    };

    const handleScheduleDayToggle = (day) => {
        setScheduleDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate end_date >= start_date
        if (formData.start_date && formData.end_date) {
            const parseToDate = (s) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s);
                const vn = parseVNDate(s);
                return vn || null;
            };
            const sd = parseToDate(formData.start_date);
            const ed = parseToDate(formData.end_date);
            if (sd && ed && ed < sd) {
                toast?.error('Ngày kết thúc phải sau ngày bắt đầu');
                return;
            }
        }

        const schedule_rule = scheduleDays.length > 0
            ? `WEEKLY:${scheduleDays.join(',')}`
            : 'DAILY';

        const toYMD = (ddmmyyyy) => {
            if (!ddmmyyyy) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(ddmmyyyy)) return ddmmyyyy;
            const d = parseVNDate(ddmmyyyy);
            if (!d) throw new Error('Ngày không hợp lệ (dd/mm/yyyy)');
            const day = String(d.getUTCDate()).padStart(2, '0');
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const year = d.getUTCFullYear();
            return `${year}-${month}-${day}`;
        };

        const submitData = {
            ...formData,
            schedule_rule,
            start_date: toYMD(formData.start_date),
            end_date: formData.end_date ? toYMD(formData.end_date) : '',
            max_students: parseInt(formData.max_students) || 50
        };

        try {
            const token = getAdminToken();
            const url = editingClass
                ? `${API_URL}/online-classes/${editingClass.id}`
                : `${API_URL}/online-classes`;

            const response = await fetch(url, {
                method: editingClass ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // Backend may return { error, retryAfter } for rate limit (429) and { message } for app errors
                const msg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                const retry = errorData.retryAfter ? ` (thử lại sau ${errorData.retryAfter}s)` : '';
                throw new Error(msg + retry);
            }

            const data = await response.json();

            if (data.success) {
                toast?.success(editingClass ? 'Cập nhật thành công!' : 'Tạo lớp online thành công!');
                if (data.data?.google_calendar?.meet_link || data.data?.meet_link) {
                    const meetLink = data.data?.google_calendar?.meet_link || data.data?.meet_link;
                    toast?.info(`Meet link: ${meetLink}`);
                }
                setShowClassModal(false);
                resetForm();
                await loadClasses();

                // If we are in detail view, update the viewing class
                if (viewingClass && editingClass && viewingClass.id === editingClass.id) {
                    const updatedClass = classes.find(c => c.id === editingClass.id);
                    if (updatedClass) {
                        setViewingClass({ ...updatedClass, ...data.data }); // Use server response
                    }
                }
            } else {
                throw new Error(data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast?.error('Lỗi: ' + (error.message || 'Unknown error'));
        }
    };

    const copyMeetLink = (link, e) => {
        e?.stopPropagation();
        navigator.clipboard.writeText(link);
        toast?.success('Đã copy link Meet!');
    };

    const regenerateMeetLink = async (classId, e) => {
        e?.stopPropagation();
        try {
            if (regenLoadingId) return;
            setRegenLoadingId(classId);
            const token = getAdminToken();
            const response = await fetch(`${API_URL}/online-classes/${classId}/regenerate-meet`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                toast?.success('Đã tạo link Meet!');
                await loadClasses();
                if (viewingClass && viewingClass.id === classId) {
                    // Update viewing class
                    setViewingClass(prev => ({ ...prev, meet_link: data.data.meet_link }));
                }
            } else {
                if (response.status === 429) {
                    const retry = data?.retryAfter ? ` (thử lại sau ${data.retryAfter}s)` : '';
                    toast?.error(`Bạn bấm quá nhanh, vui lòng chờ${retry}`);
                } else {
                    toast?.error(data.message || 'Không tạo được link Meet');
                }
            }
        } catch (err) {
            toast?.error('Lỗi tạo link Meet: ' + err.message);
        } finally {
            setRegenLoadingId(null);
        }
    };

    const filteredClasses = classes.filter(cls =>
        cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    const formatScheduleDays = (scheduleRule) => {
        if (!scheduleRule) return 'Chưa thiết lập';
        if (scheduleRule === 'DAILY') return 'Hàng ngày';

        const [, days] = scheduleRule.split(':');
        if (!days) return scheduleRule;

        return days.split(',').map(d => dayLabels[parseInt(d)] || d).join(', ');
    };

    // ========================================
    // CLASS DETAIL VIEW (NEW)
    // ========================================
    if (viewingClass) {
        return (
            <ClassDetailDashboard
                classData={viewingClass}
                onBack={() => setViewingClass(null)}
                onUpdate={(cls) => handleEdit(cls)}
                onRegenerateMeet={() => regenerateMeetLink(viewingClass.id)}
            />
        );
    }

    // ========================================
    // MAIN LIST VIEW
    // ========================================
    return (
        <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_64px_-44px_rgba(15,23,42,0.24)]">

                <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(250,245,255,0.8)_0%,rgba(255,255,255,1)_100%)] p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[24px] border border-violet-100 bg-violet-50/65 px-4 py-4 shadow-[0_16px_44px_-34px_rgba(124,58,237,0.35)]">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Tổng số lớp</div>
                            <div className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-slate-950">{classes.length}</div>
                            <div className="mt-2 text-xs text-slate-500">Toàn bộ lớp online hiện có.</div>
                        </div>
                        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/65 px-4 py-4 shadow-[0_16px_44px_-34px_rgba(16,185,129,0.35)]">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Đang hoạt động</div>
                            <div className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-slate-950">{classes.filter(c => c.status === 'active').length}</div>
                            <div className="mt-2 text-xs text-slate-500">Các lớp đang trong vòng vận hành.</div>
                        </div>
                        <div className="rounded-[24px] border border-blue-100 bg-blue-50/65 px-4 py-4 shadow-[0_16px_44px_-34px_rgba(37,99,235,0.28)]">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Tổng học viên</div>
                            <div className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-slate-950">{classes.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)}</div>
                            <div className="mt-2 text-xs text-slate-500">Tổng số học viên đang ghi danh.</div>
                        </div>
                        <div className="rounded-[24px] border border-pink-100 bg-pink-50/65 px-4 py-4 shadow-[0_16px_44px_-34px_rgba(236,72,153,0.24)]">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Có Meet link</div>
                            <div className="mt-2 text-[30px] font-black leading-none tracking-[-0.04em] text-slate-950">{classes.filter(c => c.meet_link).length}</div>
                            <div className="mt-2 text-xs text-slate-500">Lớp đã sẵn sàng truy cập buổi học.</div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
                        <div className="relative w-full md:w-[440px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Tìm kiếm lớp học..."
                            className="h-11 rounded-2xl border-slate-200 bg-white pl-10 focus:ring-2 focus:ring-purple-100"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-11 w-full md:w-48 bg-white border-slate-200 rounded-2xl cursor-pointer"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">🟢 Đang diễn ra</option>
                            <option value="paused">⏸️ Tạm dừng</option>
                            <option value="completed">✅ Đã kết thúc</option>
                            <option value="cancelled">❌ Đã hủy</option>
                        </Select>

                        <Button onClick={handleCreateClass} className="h-11 shrink-0 rounded-2xl bg-violet-600 px-6 font-medium text-white shadow-[0_18px_36px_-24px_rgba(124,58,237,0.58)] transition-all hover:scale-[1.01] hover:bg-violet-700 active:scale-95">
                            <Plus size={20} className="mr-2" /> Tạo lớp mới
                        </Button>
                    </div>
                </div>
                </div>

                <div className="p-6 md:p-7 bg-slate-50/55 min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                            <p>Đang tải dữ liệu lớp học...</p>
                        </div>
                    ) : filteredClasses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                            <Video size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">Không tìm thấy lớp học nào.</p>
                            <Button variant="link" onClick={handleCreateClass} className="mt-2 text-purple-600">
                                + Tạo lớp học đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredClasses.map((cls) => (
                                <Card
                                    key={cls.id}
                                    className="group relative cursor-pointer overflow-hidden rounded-[26px] border-0 bg-white ring-1 ring-slate-200 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_52px_-34px_rgba(124,58,237,0.24)] hover:ring-purple-200"
                                    onClick={() => setViewingClass(cls)}
                                >
                                    {/* Cover / Gradient Bar */}
                                    <div className="h-2 w-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500"></div>

                                    <CardHeader className="pt-5 pb-2 px-5 relative z-10">
                                        <div className="flex justify-between items-start mb-3">
                                            <StatusBadge status={cls.status} />
                                            {/* Action Menu Trigger (Hover only) */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-5 right-4 bg-white shadow-sm rounded-lg p-1 border border-slate-100 flex gap-1">
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-slate-50" onClick={(e) => handleEdit(cls, e)}>
                                                    <Edit size={14} className="text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-red-50" onClick={(e) => handleDeleteClick(cls, e)}>
                                                    <Trash2 size={14} className="text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardTitle className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-purple-700 transition-colors">
                                            {cls.class_name}
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-slate-500">
                                            {cls.description || 'Lớp học online'}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="px-5 py-3 space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Calendar size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-medium uppercase">Lịch học</p>
                                                <p className="font-medium truncate">{formatScheduleDays(cls.schedule_rule)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                                <Clock size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-medium uppercase">Thời gian</p>
                                                <p className="font-medium">{cls.schedule_time || '--:--'}</p>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-slate-400" />
                                            <span className="text-sm font-semibold text-slate-700">
                                                {cls.enrollment_count || 0}
                                                <span className="text-slate-400 font-normal"> / {cls.max_students || 50}</span>
                                            </span>
                                        </div>

                                        {cls.meet_link ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 rounded-lg text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 font-medium text-xs"
                                                onClick={(e) => copyMeetLink(cls.meet_link, e)}
                                            >
                                                <Video size={14} className="mr-1.5" />
                                                Meet Link
                                            </Button>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Chưa có link</div>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
                <DialogContent className="max-w-6xl w-[95vw] p-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[90vh]">
                    <DialogHeader className="px-8 py-5 bg-white border-b border-slate-100 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl shadow-lg ${editingClass ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-purple-600 text-white shadow-purple-200'}`}>
                                {editingClass ? <Edit size={24} /> : <Plus size={24} />}
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-800">
                                    {editingClass ? 'Cập nhật Lớp học' : 'Tạo lớp học mới'}
                                </DialogTitle>
                                <p className="text-slate-500 mt-1">Thiết lập thông tin và lịch học của lớp online</p>
                            </div>
                        </div>
                        <DialogClose className="absolute right-6 top-6 rounded-full p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <XCircle size={20} />
                        </DialogClose>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* LEFT COLUMN: Basic Info */}
                                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                        <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                                        <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Thông tin chung</h4>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Tên lớp học <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={formData.class_name}
                                            onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                            required
                                            placeholder="VD: Lớp Tin học văn phòng K24"
                                            className="h-11 text-base font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Mô tả</Label>
                                        <textarea
                                            className="flex min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all resize-none"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Mô tả nội dung khóa học..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Sĩ số tối đa</Label>
                                        <div className="relative">
                                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                type="number"
                                                value={formData.max_students}
                                                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                                                placeholder="50"
                                                min="1"
                                                max="200"
                                                className="pl-10 h-10"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* RIGHT COLUMN: Schedule */}
                                <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
                                    <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                        <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                                        <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Thời gian & Lịch học</h4>
                                    </div>

                                    <div>
                                        <Label className="mb-2 block">Lịch trong tuần</Label>
                                        <div className="flex gap-2 flex-wrap">
                                            {[1, 2, 3, 4, 5, 6, 0].map(day => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => handleScheduleDayToggle(day)}
                                                    className={`
                                                        w-11 h-11 rounded-xl text-sm font-bold transition-all transform active:scale-95 shadow-sm border
                                                        ${scheduleDays.includes(day)
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200 shadow-md'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600'
                                                        }
                                                    `}
                                                >
                                                    {day === 0 ? 'CN' : 'T' + (day + 1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Giờ học <span className="text-xs font-normal text-slate-400">(HH:MM-HH:MM)</span></Label>
                                        <div className="relative">
                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={formData.schedule_time}
                                                onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                                                placeholder="19:00-21:00"
                                                pattern="^\d{2}:\d{2}-\d{2}:\d{2}$"
                                                className="pl-10 h-10 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Ngày bắt đầu</Label>
                                            <DateInput
                                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
                                                value={formData.start_date}
                                                onChange={(val) => {
                                                    const normalized = val && val.includes('T') ? formatDateVN(val) : val;
                                                    setFormData({ ...formData, start_date: normalized });
                                                }}
                                                required
                                                placeholder="dd/mm/yyyy"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ngày kết thúc</Label>
                                            <DateInput
                                                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
                                                value={formData.end_date}
                                                onChange={(val) => {
                                                    const normalized = val && val.includes('T') ? formatDateVN(val) : val;
                                                    setFormData({ ...formData, end_date: normalized });
                                                }}
                                                placeholder="dd/mm/yyyy"
                                            />
                                        </div>
                                    </div>

                                    {/* Google Meet Info */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-3 items-start">
                                        <Video className="text-blue-600 mt-0.5 shrink-0" size={18} />
                                        <div>
                                            <h4 className="font-bold text-blue-800 text-sm">Google Meet</h4>
                                            <p className="text-blue-600 text-xs mt-0.5 leading-relaxed">
                                                Hệ thống sẽ tự động tạo phòng họp và thêm vào Google Calendar.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <DialogFooter className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowClassModal(false)}
                                className="h-10 px-6 rounded-xl border-slate-300 text-slate-600 hover:bg-slate-50"
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="submit"
                                className="h-10 px-8 rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200 font-medium"
                            >
                                {editingClass ? 'Lưu thay đổi' : 'Hoàn tất & Tạo lớp'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Xác nhận xóa lớp online"
                message={`Bạn có chắc chắn muốn xóa lớp "${classToDelete?.class_name}"? Link Google Meet sẽ bị vô hiệu hóa vĩnh viễn.`}
            />
        </div>
    );
}
