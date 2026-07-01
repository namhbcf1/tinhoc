// @ts-nocheck
import { useState, useEffect } from 'react';
import {
    ArrowLeft, Users, Calendar, BookOpen, Settings,
    MoreVertical, Clock, MapPin, Video, Copy, ExternalLink,
    CheckCircle, XCircle, AlertCircle, Plus, Search, Filter,
    FileText, Download, Upload, Trash2, Edit, Save, CheckSquare, Square,
    UserCheck, UserX, ClipboardList, Headphones, Mic, PenLine,
    MessageSquare, TrendingUp, ChevronDown, ChevronUp, Send, EyeOff
} from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN, getCurrentDateVN } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { useToast } from '../../../components/ui/ToastContainer';
import { Select } from '../../../components/ui/Select';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import AddStudentModal from '../../../components/modals/AddStudentModal';
import OverlayPortal from '../../../components/ui/OverlayPortal';
import StudentFeedbackManagement from './StudentFeedbackManagement';

// ========================================
// HELPER COMPONENTS
// ========================================

const ActivityIcon = ({ status }) => {
    switch (status) {
        case 'active': return <CheckCircle size={24} className="text-green-600" />;
        case 'paused': return <AlertCircle size={24} className="text-yellow-600" />;
        case 'completed': return <CheckCircle size={24} className="text-blue-600" />;
        default: return <XCircle size={24} className="text-red-600" />;
    }
};

const formatScheduleDays = (scheduleRule) => {
    if (!scheduleRule) return 'Chưa thiết lập';
    if (scheduleRule === 'DAILY') return 'Hàng ngày';
    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const [, days] = scheduleRule.split(':');
    if (!days) return scheduleRule;
    return days.split(',').map(d => dayLabels[parseInt(d)]).join(', ');
};

// ========================================
// OVERVIEW TAB
// ========================================

const ClassOverviewTab = ({ classData, onRegenerateMeet }) => {
    const { toast } = useToast();

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast?.success('Đã sao chép vào clipboard!');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none shadow-xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-purple-100 font-medium mb-1">Tổng học viên</p>
                                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold">{classData.enrollment_count || 0}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users size={24} className="text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-purple-100 text-sm">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-white mr-2">
                                {classData.max_students ? Math.round((classData.enrollment_count / classData.max_students) * 100) : 0}%
                            </span>
                            <span>đã lấp đầy</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium mb-1">Trạng thái</p>
                                <div className="flex items-center gap-2">
                                    <Badge className={`
                    ${classData.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                    ${classData.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${classData.status === 'completed' ? 'bg-blue-100 text-blue-700' : ''}
                    text-base px-3 py-1
                  `}>
                                        {classData.status === 'active' && 'Đang hoạt động'}
                                        {classData.status === 'paused' && 'Tạm dừng'}
                                        {classData.status === 'completed' && 'Hoàn thành'}
                                        {classData.status === 'cancelled' && 'Đã hủy'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-100 rounded-xl">
                                <ActivityIcon status={classData.status} />
                            </div>
                        </div>
                        <div className="mt-4 text-sm text-slate-500">
                            Cập nhật lần cuối: {classData?.updated_at
                                ? new Date(classData.updated_at).toLocaleDateString('vi-VN')
                                : 'Chưa cập nhật'}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-500 font-medium mb-1">Lịch học</p>
                                <h3 className="text-lg font-bold text-slate-800">{classData.schedule_time || 'Chưa có giờ'}</h3>
                                <p className="text-slate-600 text-sm mt-1">{formatScheduleDays(classData.schedule_rule)}</p>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Calendar size={24} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Google Meet Section */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Video className="text-red-500" /> Google Meet Class Room
                    </CardTitle>
                    <CardDescription>Link học trực tuyến cố định cho lớp này</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 w-full space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={classData.meet_link || 'Chưa tạo link Meet'}
                                    className="bg-slate-50 font-mono text-slate-600"
                                />
                                <Button variant="outline" onClick={() => copyToClipboard(classData.meet_link)} disabled={!classData.meet_link}>
                                    <Copy size={18} />
                                </Button>
                                <Button
                                    onClick={() => window.open(classData.meet_link, '_blank')}
                                    disabled={!classData.meet_link}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <ExternalLink size={18} className="mr-2" /> Mở Meet
                                </Button>
                            </div>

                            {!classData.meet_link && (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                                    <AlertCircle size={16} />
                                    <span>Lớp này chưa có link Meet. Hãy tạo ngay để học viên có thể tham gia.</span>
                                    <Button size="sm" variant="outline" className="ml-auto border-amber-200 hover:bg-amber-100" onClick={onRegenerateMeet}>
                                        Tạo Link
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// ========================================
// STUDENTS TAB
// ========================================

const StudentsTab = ({ classId }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    // Confirm dialog
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Add student modal
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        loadStudents();
    }, [classId]);

    const loadStudents = async () => {
        setLoading(true);
        try {
            // Use online class enrollments API
            const response = await api.getOnlineClassEnrollments(classId);
            if (response.success) {
                // Handle different response formats
                const studentList = Array.isArray(response.data)
                    ? response.data
                    : (Array.isArray(response.data?.data) ? response.data.data : []);
                setStudents(studentList);
            } else {
                console.error('Error:', response.error || response.message);
            }
        } catch (error) {
            console.error('Error loading students:', error);
            toast?.error('Lỗi tải danh sách học viên');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (student) => {
        setStudentToDelete(student);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;
        try {
            // Online classes use online_class_enrollments, NOT registrations.
            // Backend endpoint: DELETE /online-classes/:id/students/:studentId
            const studentId = studentToDelete.student_id || studentToDelete.id;
            const response = await api.removeStudentFromOnlineClass(classId, studentId);
            if (response.success) {
                toast?.success('Đã xóa học viên khỏi lớp');
                loadStudents();
            } else {
                toast?.error(response.message || 'Lỗi khi xóa học viên');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setShowDeleteConfirm(false);
            setStudentToDelete(null);
        }
    };

    // Enhanced search with phone normalization
    const normalizePhone = (phone) => {
        if (!phone) return '';
        return phone.replace(/[\s\-\.\(\)]/g, '').trim();
    };

    const filteredStudents = students.filter(s => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase().trim();
        const normalizedSearchPhone = normalizePhone(searchTerm);
        
        const name = (s.ho_ten_full || s.ho_ten || s.full_name || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const phone = s.phone || s.sdt || '';
        const normalizedPhone = normalizePhone(phone);
        const cccd = (s.cccd || '').toLowerCase();
        
        return (
            name.includes(searchLower) ||
            email.includes(searchLower) ||
            phone.includes(searchTerm) ||
            normalizedPhone.includes(normalizedSearchPhone) ||
            cccd.includes(searchLower)
        );
    });

    if (loading) return <div className="p-12 text-center text-slate-500"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>Đang tải danh sách học viên...</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Tìm theo tên, SĐT, email..."
                        className="pl-10 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        title="Tìm kiếm theo: tên, số điện thoại, email"
                    />
                </div>
                <Button
                    size="sm"
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={16} className="mr-2" /> Thêm học viên
                </Button>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <Users size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">
                        {searchTerm ? 'Không tìm thấy học viên nào' : 'Chưa có học viên nào trong lớp này'}
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Học viên</th>
                                <th className="px-6 py-4">Liên hệ</th>
                                <th className="px-6 py-4">Ngày đăng ký</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((student) => (
                                <tr key={student.registration_id || student.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                                                {(student.ho_ten_full || student.ho_ten || student.full_name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{student.ho_ten_full || student.ho_ten || student.full_name}</div>
                                                <div className="text-xs text-slate-500">{student.code || student.student_code || '---'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        <div>{student.email}</div>
                                        <div className="text-xs">{student.phone || student.sdt}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {student.registration_date ? formatDateVN(student.registration_date) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className={`
                                            ${student.status === 'confirmed' || student.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                                            ${student.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                                            ${student.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
                                            border-none
                                        `}>
                                            {student.status === 'confirmed' || student.status === 'active' ? 'Đã duyệt' :
                                                student.status === 'pending' ? 'Chờ duyệt' :
                                                    student.status === 'cancelled' ? 'Đã hủy' : student.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-red-600"
                                            onClick={() => handleDeleteClick(student)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Xóa học viên khỏi lớp"
                message={`Bạn có chắc chắn muốn xóa học viên "${studentToDelete?.ho_ten || studentToDelete?.full_name}" khỏi lớp này không?`}
            />

            <AddStudentModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                classId={classId}
                onSuccess={() => {
                    toast?.success('Đã thêm học viên vào lớp!');
                    loadStudents();
                }}
            />
        </div>
    );
};

// ========================================
// PENDING ENROLLMENTS TAB (Duyệt đăng ký)
// ========================================

const PendingEnrollmentsTab = ({ classId, onCountChange }) => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null); // enrollment_id being processed
    const { toast } = useToast();

    // Reject modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [enrollmentToReject, setEnrollmentToReject] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadPendingEnrollments();
    }, [classId]);

    const loadPendingEnrollments = async () => {
        setLoading(true);
        try {
            const response = await api.getPendingEnrollments(classId);
            console.log('Pending enrollments response:', response);

            // Handle different response formats
            let list = [];
            if (response.success) {
                // Could be response.data (array) or response.data.data (nested)
                if (Array.isArray(response.data)) {
                    list = response.data;
                } else if (response.data && Array.isArray(response.data.data)) {
                    list = response.data.data;
                } else if (response.data && typeof response.data === 'object') {
                    // Try to extract from object
                    list = Object.values(response.data).filter(item =>
                        item && typeof item === 'object' && item.enrollment_id
                    );
                }
            }

            setEnrollments(list);
            if (onCountChange) onCountChange(list.length);
        } catch (error) {
            console.error('Error loading pending enrollments:', error);
            toast?.error('Lỗi tải danh sách chờ duyệt');
            setEnrollments([]); // Reset to empty array on error
            if (onCountChange) onCountChange(0);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (enrollment) => {
        setProcessing(enrollment.enrollment_id);
        try {
            const response = await api.approveEnrollment(classId, enrollment.enrollment_id);
            if (response.success) {
                toast?.success(`Đã duyệt ${enrollment.ho_ten_full} vào lớp`);
                loadPendingEnrollments();
            } else {
                toast?.error(response.message || 'Lỗi khi duyệt');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectClick = (enrollment) => {
        setEnrollmentToReject(enrollment);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        if (!enrollmentToReject) return;
        setProcessing(enrollmentToReject.enrollment_id);
        try {
            const response = await api.rejectEnrollment(classId, enrollmentToReject.enrollment_id, rejectReason || null);
            if (response.success) {
                toast?.success(`Đã từ chối ${enrollmentToReject.ho_ten_full}`);
                loadPendingEnrollments();
            } else {
                toast?.error(response.message || 'Lỗi khi từ chối');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setProcessing(null);
            setShowRejectModal(false);
            setEnrollmentToReject(null);
        }
    };

    const handleApproveAll = async () => {
        if (!enrollments.length) return;
        if (!confirm(`Duyệt tất cả ${enrollments.length} học viên?`)) return;

        setLoading(true);
        try {
            // Parallel approval — significantly faster than sequential for loop
            const results = await Promise.allSettled(
                enrollments.map(enrollment =>
                    api.approveEnrollment(classId, enrollment.enrollment_id)
                )
            );
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
            toast?.success(`Đã duyệt ${successCount}/${enrollments.length} học viên`);
        } catch (e) {
            toast?.error('Lỗi khi duyệt hàng loạt');
        }
        loadPendingEnrollments();
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-500">
                <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
                Đang tải danh sách chờ duyệt...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Yêu cầu đăng ký chờ duyệt</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        {enrollments.length > 0
                            ? `Có ${enrollments.length} học viên đang chờ duyệt vào lớp`
                            : 'Không có yêu cầu nào cần duyệt'}
                    </p>
                </div>
                {enrollments.length > 1 && (
                    <Button
                        onClick={handleApproveAll}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckCircle size={16} className="mr-2" />
                        Duyệt tất cả ({enrollments.length})
                    </Button>
                )}
            </div>

            {/* Enrollments List */}
            {enrollments.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <UserCheck size={48} className="mx-auto text-green-300 mb-3" />
                    <p className="text-slate-500 font-medium">Tất cả yêu cầu đã được xử lý!</p>
                    <p className="text-sm text-slate-400 mt-1">Không có học viên nào đang chờ duyệt.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {enrollments.map((enrollment) => (
                        <div
                            key={enrollment.enrollment_id}
                            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg">
                                    {(enrollment.ho_ten_full || '?').charAt(0)}
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">{enrollment.ho_ten_full}</div>
                                    <div className="text-sm text-slate-500 flex flex-wrap gap-2">
                                        <span>{enrollment.email}</span>
                                        <span className="text-slate-300">|</span>
                                        <span>{enrollment.sdt}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Đăng ký lúc: {formatDateVN(enrollment.enrolled_at)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <Button
                                    onClick={() => handleApprove(enrollment)}
                                    disabled={processing === enrollment.enrollment_id}
                                    className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {processing === enrollment.enrollment_id ? (
                                        'Đang xử lý...'
                                    ) : (
                                        <>
                                            <UserCheck size={16} className="mr-1" />
                                            Duyệt
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleRejectClick(enrollment)}
                                    disabled={processing === enrollment.enrollment_id}
                                    className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50"
                                >
                                    <UserX size={16} className="mr-1" />
                                    Từ chối
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <OverlayPortal>
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">
                            Từ chối {enrollmentToReject?.ho_ten_full}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Lý do từ chối (tùy chọn)
                            </label>
                            <textarea
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                rows={3}
                                placeholder="VD: Không đủ điều kiện, lớp đã đầy..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setEnrollmentToReject(null);
                                }}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleConfirmReject}
                                disabled={processing}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </Button>
                        </div>
                        </div>
                    </div>
                </OverlayPortal>
            )}
        </div>
    );
};

// ========================================
// ATTENDANCE TAB
// ========================================

const AttendanceTab = ({ classId }) => {
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState(getCurrentDateVN(true));
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, [classId, selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Get students
            const studentsResp = await api.getRegistrationsByClass(classId);
            if (!studentsResp.success) throw new Error('Failed to load students');

            // Filter active students only
            const activeStudents = (studentsResp.data || []).filter(
                s => ['confirmed', 'studying', 'active', 'approved'].includes(s.status)
            );
            setStudents(activeStudents);

            // 2. Init default attendance (Absent by default — admin must actively mark present)
            const initialAttendance = {};
            activeStudents.forEach(s => {
                initialAttendance[s.registration_id] = false;
            });

            // 3. Get existing attendance
            const attendanceResp = await api.getAttendanceByClass(classId, selectedDate);
            if (attendanceResp.success && attendanceResp.data) {
                attendanceResp.data.forEach(record => {
                    initialAttendance[record.registration_id] = record.status === 'present';
                });
            }

            setAttendance(initialAttendance);

        } catch (error) {
            console.error('Error loading attendance data:', error);
            toast?.error('Lỗi tải dữ liệu điểm danh');
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = (registrationId, isPresent) => {
        setAttendance(prev => ({
            ...prev,
            [registrationId]: isPresent
        }));
    };

    const handleSubmit = async () => {
        if (!students.length) return;
        setSubmitting(true);
        try {
            const records = students.map(s => ({
                registration_id: s.registration_id,
                class_id: parseInt(classId),
                attendance_date: selectedDate,
                status: attendance[s.registration_id] ? 'present' : 'absent'
            }));

            const response = await api.markAttendanceBatch(records);
            if (response.success) {
                toast?.success('Đã lưu điểm danh thành công!');
                loadData(); // Reload to confirm
            } else {
                toast?.error('Lỗi khi lưu điểm danh');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const stats = {
        total: students.length,
        present: Object.values(attendance).filter(v => v).length,
        absent: Object.values(attendance).filter(v => !v).length
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày điểm danh</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 text-center">
                        <div className="px-4 py-2 bg-slate-50 rounded-lg">
                            <div className="text-xs text-slate-500 font-medium uppercase">Tổng số</div>
                            <div className="text-xl font-bold text-slate-900">{stats.total}</div>
                        </div>
                        <div className="px-4 py-2 bg-green-50 rounded-lg text-green-700">
                            <div className="text-xs font-medium uppercase">Có mặt</div>
                            <div className="text-xl font-bold">{stats.present}</div>
                        </div>
                        <div className="px-4 py-2 bg-red-50 rounded-lg text-red-700">
                            <div className="text-xs font-medium uppercase">Vắng</div>
                            <div className="text-xl font-bold">{stats.absent}</div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-500"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>Đang tải dữ liệu...</div>
            ) : students.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <Users size={48} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Lớp chưa có học viên nào để điểm danh</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left">Học viên</th>
                                <th className="px-6 py-3 text-center">Có mặt</th>
                                <th className="px-6 py-3 text-center">Vắng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map(student => {
                                const isPresent = attendance[student.registration_id];
                                return (
                                    <tr key={student.registration_id} className={`hover:bg-slate-50 transition-colors ${!isPresent ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{student.ho_ten || student.full_name}</div>
                                            <div className="text-xs text-slate-500">{student.code || student.student_code}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleAttendanceChange(student.registration_id, true)}
                                                className={`p-2 rounded-lg transition-all ${isPresent ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'text-slate-300 hover:bg-slate-100'}`}
                                            >
                                                <CheckSquare size={24} />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleAttendanceChange(student.registration_id, false)}
                                                className={`p-2 rounded-lg transition-all ${!isPresent ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-1' : 'text-slate-300 hover:bg-slate-100'}`}
                                            >
                                                <Square size={24} /> {/* Using Square to represent unchecked/absent state visually distinct */}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSubmit}
                    disabled={loading || submitting || students.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px] shadow-lg shadow-purple-200"
                >
                    {submitting ? 'Đang lưu...' : (
                        <>
                            <Save size={18} className="mr-2" /> Lưu điểm danh
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

// ========================================
// DOCUMENTS TAB
// ========================================

const DocumentsTab = ({ classId }) => {
    const { toast } = useToast();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        file: null
    });
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState(null);

    useEffect(() => {
        loadDocuments();
    }, [classId]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            // v2: fetch docs shared into this online class
            const response = await api.getSharedDocumentsForOnlineClass(classId);
            if (response.success) {
                setDocuments(response.data || []);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            toast?.error('Lỗi tải danh sách tài liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                toast?.error('File quá lớn! Tối đa 50MB');
                return;
            }
            setUploadForm(prev => ({ ...prev, file }));
        }
    };

    const handleUpload = async () => {
        if (!uploadForm.file || !uploadForm.title.trim()) {
            toast?.error('Vui lòng nhập tên tài liệu và chọn file');
            return;
        }

        setUploading(true);
        try {
            // v2 flow: upload doc into library (internal) then share into this class
            const uploadRes = await api.uploadDocumentWithPermission({
                title: uploadForm.title,
                description: uploadForm.description,
                doc_type: 'class',
                access_type: 'admin',
                class_ids: [],
                student_ids: [],
                cccd: '',
                valid_from: '',
                valid_until: '',
                file: uploadForm.file,
                visibility: 'internal',
            });

            if (!uploadRes?.success || !uploadRes?.document_id) {
                throw new Error(uploadRes?.message || uploadRes?.error || 'Upload failed');
            }

            await api.shareDocument(uploadRes.document_id, [{ type: 'online_class', id: classId }]);
            toast?.success('Đã tải lên và chia sẻ vào lớp!');
            setUploadForm({ title: '', description: '', file: null });
            setShowUploadForm(false);
            loadDocuments();
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc) => {
        try {
            await api.downloadDocument(doc.id, doc.file_name);
            toast?.success('Đang tải xuống...');
        } catch (error) {
            toast?.error('Lỗi tải xuống: ' + error.message);
        }
    };

    const handleDeleteClick = (doc) => {
        setDocumentToDelete(doc);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!documentToDelete) return;
        try {
            const response = await api.deleteDocument(documentToDelete.id);
            if (response.success) {
                toast?.success('Đã xóa tài liệu');
                loadDocuments();
            } else {
                toast?.error(response.message || 'Lỗi xóa tài liệu');
            }
        } catch (error) {
            toast?.error('Lỗi: ' + error.message);
        } finally {
            setShowDeleteConfirm(false);
            setDocumentToDelete(null);
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (fileName) => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        if (['pdf'].includes(ext)) return '📄';
        if (['doc', 'docx'].includes(ext)) return '📝';
        if (['xls', 'xlsx'].includes(ext)) return '📊';
        if (['ppt', 'pptx'].includes(ext)) return '📽️';
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
        if (['zip', 'rar', '7z'].includes(ext)) return '📦';
        return '📎';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Tài liệu lớp học</h3>
                    <p className="text-sm text-slate-500 mt-1">Quản lý tài liệu, bài giảng, và tài nguyên học tập</p>
                </div>
                <Button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    <Upload size={16} className="mr-2" />
                    {showUploadForm ? 'Hủy' : 'Tải lên tài liệu'}
                </Button>
            </div>

            {/* Upload Form */}
            {showUploadForm && (
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Tên tài liệu <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="VD: Bài giảng tuần 1, Đề thi mẫu..."
                                value={uploadForm.title}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Mô tả</label>
                            <textarea
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                rows={3}
                                placeholder="Mô tả ngắn về tài liệu..."
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Chọn file <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-medium
                                    file:bg-purple-50 file:text-purple-700
                                    hover:file:bg-purple-100
                                    cursor-pointer"
                            />
                            {uploadForm.file && (
                                <p className="text-xs text-slate-500 mt-2">
                                    {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                                </p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowUploadForm(false);
                                    setUploadForm({ title: '', description: '', file: null });
                                }}
                                disabled={uploading}
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={uploading || !uploadForm.file || !uploadForm.title.trim()}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {uploading ? 'Đang tải lên...' : 'Tải lên'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Documents List */}
            {loading ? (
                <div className="p-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    Đang tải danh sách tài liệu...
                </div>
            ) : documents.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                    <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-800">Chưa có tài liệu nào</h3>
                    <p className="text-slate-500 mt-2">Tải lên tài liệu đầu tiên cho lớp học này</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-4xl">{getFileIcon(doc.file_name)}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate">{doc.title}</h4>
                                        {doc.description && (
                                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                            <span>{formatFileSize(doc.file_size)}</span>
                                            <span>•</span>
                                            <span>{formatDateVN(doc.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDownload(doc)}
                                        className="flex-1"
                                    >
                                        <Download size={14} className="mr-1" />
                                        Tải xuống
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteClick(doc)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Xóa tài liệu"
                message={`Bạn có chắc chắn muốn xóa tài liệu "${documentToDelete?.title}" không? Hành động này không thể hoàn tác.`}
            />
        </div>
    );
};

// ========================================
// REVIEWS TAB — Báo cáo đánh giá học viên
// ========================================

const SKILL_OPTIONS = ['reading', 'listening', 'speaking', 'writing'];
const SKILL_LABELS_MAP: Record<string, string> = { reading: 'Reading', listening: 'Listening', speaking: 'Speaking', writing: 'Writing' };
const SKILL_ICONS_MAP: Record<string, any> = { reading: BookOpen, listening: Headphones, speaking: Mic, writing: PenLine };
const SKILL_STATUS_OPTIONS = [
    { value: '', label: '— Không chọn —' },
    { value: 'good', label: 'Tốt' },
    { value: 'needs_work', label: 'Cần cải thiện' },
    { value: 'weak', label: 'Cần chú ý' },
];
const HW_STATUS_OPTIONS = [
    { value: 'du', label: 'Đủ' },
    { value: 'thieu_video', label: 'Thiếu video' },
    { value: 'khong_nop', label: 'Không nộp' },
    { value: 'duoc_nghi', label: 'Được nghỉ' },
];
const STATUS_BADGES: Record<string, string> = {
    draft: 'bg-amber-50 text-amber-700 border border-amber-200',
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};
const STATUS_LABELS: Record<string, string> = { draft: 'Nháp', published: 'Đã gửi' };

function initSkillRows() {
    return SKILL_OPTIONS.map((skill) => ({ skill, score_raw: '', score_num: '', skill_status: '', comments: '', sort_order: 0 }));
}

function ReviewEditorModal({ classId, student, existing, onSaved, onClose }: any) {
    const { showToast } = useToast();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(() => ({
        period_label: existing?.period_label || '',
        report_title: existing?.report_title || '',
        overall_summary: existing?.overall_summary || '',
        recommendations: existing?.recommendations || '',
        skills: existing?.skills?.length
            ? SKILL_OPTIONS.map((sk) => {
                const found = existing.skills.find((s: any) => s.skill === sk);
                return found
                    ? { skill: sk, score_raw: found.score_raw || '', score_num: found.score_num ?? '', skill_status: found.skill_status || '', comments: found.comments || '' }
                    : { skill: sk, score_raw: '', score_num: '', skill_status: '', comments: '' };
            })
            : initSkillRows(),
        test_scores: existing?.test_scores || [],
        homework_tracking: existing?.homework_tracking || [],
    }));

    const setField = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));
    const setSkillField = (idx: number, key: string, val: any) => setForm((f) => {
        const skills = [...f.skills];
        skills[idx] = { ...skills[idx], [key]: val };
        return { ...f, skills };
    });

    const addScoreRow = () => setForm((f) => ({
        ...f,
        test_scores: [...f.test_scores, { skill_label: '', max_score: '', student_score: '', score_notes: '' }],
    }));
    const removeScoreRow = (idx: number) => setForm((f) => ({ ...f, test_scores: f.test_scores.filter((_: any, i: number) => i !== idx) }));
    const setScoreField = (idx: number, key: string, val: any) => setForm((f) => {
        const test_scores = [...f.test_scores];
        test_scores[idx] = { ...test_scores[idx], [key]: val };
        return { ...f, test_scores };
    });

    const addHwRow = () => setForm((f) => ({
        ...f,
        homework_tracking: [...f.homework_tracking, { date: '', status: 'du' }],
    }));
    const removeHwRow = (idx: number) => setForm((f) => ({ ...f, homework_tracking: f.homework_tracking.filter((_: any, i: number) => i !== idx) }));
    const setHwField = (idx: number, key: string, val: any) => setForm((f) => {
        const hw = [...f.homework_tracking];
        hw[idx] = { ...hw[idx], [key]: val };
        return { ...f, homework_tracking: hw };
    });

    const handleSave = async (publish = false) => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                skills: form.skills.map((s: any, i: number) => ({
                    ...s,
                    score_num: s.score_num !== '' ? parseFloat(s.score_num) : null,
                    skill_status: s.skill_status || null,
                    sort_order: i,
                })),
                test_scores: form.test_scores.map((r: any, i: number) => ({
                    ...r,
                    max_score: r.max_score !== '' ? parseFloat(r.max_score) : null,
                    student_score: r.student_score !== '' ? parseFloat(r.student_score) : null,
                    sort_order: i,
                })),
            };
            const res = await (api as any).upsertClassReview(classId, student.id, payload);
            if (!res || res.error) throw new Error(res?.error?.message || 'Lỗi lưu báo cáo');
            const reviewId = res.data?.id || res.id;
            if (publish && reviewId) {
                await (api as any).publishReview(reviewId);
            }
            showToast(publish ? 'Đã lưu & gửi báo cáo!' : 'Đã lưu nháp!', 'success');
            onSaved();
        } catch (err: any) {
            showToast(err?.message || 'Lỗi khi lưu báo cáo', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Báo cáo học viên</p>
                        <h3 className="text-base font-extrabold text-slate-900">{student.ho_ten_full || student.student_name}</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
                        <XCircle size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Thông tin cơ bản */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Kỳ học</label>
                            <Input value={form.period_label} onChange={(e) => setField('period_label', e.target.value)} placeholder="VD: Sau 5 buổi + 2 tuần BTVN" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Tiêu đề báo cáo</label>
                            <Input value={form.report_title} onChange={(e) => setField('report_title', e.target.value)} placeholder="VD: Báo cáo B2 VSTEP" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1.5"><TrendingUp size={12} /> Nhận xét tổng quan</label>
                        <textarea className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" rows={3} value={form.overall_summary} onChange={(e) => setField('overall_summary', e.target.value)} placeholder="Nhận xét chung về sự tiến bộ của học viên..." />
                    </div>

                    {/* 4 Kỹ năng */}
                    <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600 mb-3"><BookOpen size={13} className="text-emerald-500" /> Đánh giá kỹ năng</h4>
                        <div className="space-y-3">
                            {form.skills.map((skill: any, idx: number) => {
                                const Icon = SKILL_ICONS_MAP[skill.skill] || BookOpen;
                                return (
                                    <div key={skill.skill} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon size={14} className="text-slate-500" />
                                            <span className="font-bold text-sm text-slate-800">{SKILL_LABELS_MAP[skill.skill]}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Điểm (VD: 18/40)</label>
                                                <Input value={skill.score_raw} onChange={(e) => setSkillField(idx, 'score_raw', e.target.value)} placeholder="18/40" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Đánh giá</label>
                                                <Select value={skill.skill_status} onChange={(e) => setSkillField(idx, 'skill_status', e.target.value)}>
                                                    {SKILL_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Nhận xét</label>
                                                <Input value={skill.comments} onChange={(e) => setSkillField(idx, 'comments', e.target.value)} placeholder="Ghi chú ngắn..." />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bảng điểm test */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600"><FileText size={13} className="text-blue-500" /> Bảng điểm test đầu ra</h4>
                            <button type="button" onClick={addScoreRow} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                <Plus size={13} /> Thêm dòng
                            </button>
                        </div>
                        {form.test_scores.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">Chưa có dòng nào. Nhấn "+ Thêm dòng" để bắt đầu.</p>
                        ) : (
                            <div className="space-y-2">
                                {form.test_scores.map((row: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-center">
                                        <Input value={row.skill_label} onChange={(e) => setScoreField(idx, 'skill_label', e.target.value)} placeholder="Kỹ năng (VD: Reading)" />
                                        <Input type="number" value={row.max_score} onChange={(e) => setScoreField(idx, 'max_score', e.target.value)} placeholder="Tối đa" />
                                        <Input type="number" value={row.student_score} onChange={(e) => setScoreField(idx, 'student_score', e.target.value)} placeholder="Đạt" />
                                        <Input value={row.score_notes} onChange={(e) => setScoreField(idx, 'score_notes', e.target.value)} placeholder="Ghi chú" />
                                        <button type="button" onClick={() => removeScoreRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* BTVN */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600"><ClipboardList size={13} className="text-purple-500" /> Theo dõi bài tập về nhà</h4>
                            <button type="button" onClick={addHwRow} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                <Plus size={13} /> Thêm ngày
                            </button>
                        </div>
                        {form.homework_tracking.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">Chưa có dòng nào.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {form.homework_tracking.map((entry: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                        <Input type="date" value={entry.date} onChange={(e) => setHwField(idx, 'date', e.target.value)} className="flex-1 text-xs" />
                                        <Select value={entry.status} onChange={(e) => setHwField(idx, 'status', e.target.value)}>
                                            {HW_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </Select>
                                        <button type="button" onClick={() => removeHwRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Đề xuất */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1.5"><MessageSquare size={12} /> Đề xuất &amp; kế hoạch tiếp theo</label>
                        <textarea className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400" rows={3} value={form.recommendations} onChange={(e) => setField('recommendations', e.target.value)} placeholder="Gợi ý cho học viên về các bước tiếp theo..." />
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
                    <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                        <Save size={14} className="mr-1" /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
                    </Button>
                    <Button onClick={() => handleSave(true)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Send size={14} className="mr-1" /> {saving ? 'Đang gửi...' : 'Lưu & Gửi học viên'}
                    </Button>
                </div>
                </div>
            </div>
        </OverlayPortal>
    );
}

function ReviewsTab({ classId, classStudents }: { classId: number; classStudents: any[] }) {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [editorStudent, setEditorStudent] = useState<any>(null);
    const [editorExisting, setEditorExisting] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchReviews = async () => {
        setLoadingReviews(true);
        try {
            const res = await (api as any).listClassReviews(classId);
            const list = Array.isArray(res) ? res : (res?.data ?? []);
            setReviews(list);
        } catch {
            setReviews([]);
        } finally {
            setLoadingReviews(false);
        }
    };

    useEffect(() => { fetchReviews(); }, [classId]);

    const openEditor = async (student: any) => {
        try {
            const res = await (api as any).getClassReview(classId, student.id);
            setEditorExisting(res?.data ?? res ?? null);
        } catch {
            setEditorExisting(null);
        }
        setEditorStudent(student);
    };

    const handleTogglePublish = async (review: any) => {
        setActionLoading(review.id);
        try {
            if (review.status === 'published') {
                await (api as any).unpublishReview(review.id);
                showToast('Đã thu hồi báo cáo', 'info');
            } else {
                await (api as any).publishReview(review.id);
                showToast('Đã gửi báo cáo cho học viên!', 'success');
            }
            fetchReviews();
        } catch (err: any) {
            showToast(err?.message || 'Lỗi cập nhật trạng thái', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await (api as any).deleteReview(deleteId);
            showToast('Đã xóa báo cáo', 'success');
            setDeleteId(null);
            fetchReviews();
        } catch (err: any) {
            showToast(err?.message || 'Lỗi xóa báo cáo', 'error');
        }
    };

    const reviewMap = Object.fromEntries(reviews.map((r) => [r.student_id, r]));
    const draftCount = reviews.filter((r) => r.status === 'draft').length;
    const publishedCount = reviews.filter((r) => r.status === 'published').length;

    return (
        <div className="space-y-6">
            {/* Summary stats */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tổng học viên</span>
                    <span className="text-sm font-extrabold text-slate-800">{classStudents.length}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                    <Send size={12} className="text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Đã gửi</span>
                    <span className="text-sm font-extrabold text-emerald-700">{publishedCount}</span>
                </div>
                {draftCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                        <Edit size={12} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">Nháp</span>
                        <span className="text-sm font-extrabold text-amber-700">{draftCount}</span>
                    </div>
                )}
            </div>

            {/* Students table */}
            {loadingReviews ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
            ) : classStudents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Lớp chưa có học viên nào.</div>
            ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Học viên</th>
                                <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Kỳ học</th>
                                <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Trạng thái</th>
                                <th className="text-center px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Cập nhật</th>
                                <th className="text-right px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classStudents.map((student: any) => {
                                const sId = student.id || student.student_id;
                                const review = reviewMap[sId];
                                return (
                                    <tr key={sId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                        <td className="px-5 py-3">
                                            <span className="font-semibold text-slate-800">{student.ho_ten_full || student.student_name || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-500 text-xs">
                                            {review?.period_label || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {review ? (
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGES[review.status]}`}>
                                                    {review.status === 'published' ? <CheckCircle size={10} /> : <Edit size={10} />}
                                                    {STATUS_LABELS[review.status]}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300">Chưa có</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-slate-400">
                                            {review?.updated_at ? new Date(review.updated_at).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEditor({ ...student, id: sId })}
                                                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <Edit size={12} /> {review ? 'Sửa' : 'Tạo'}
                                                </button>
                                                {review && (
                                                    <>
                                                        <button
                                                            disabled={actionLoading === review.id}
                                                            onClick={() => handleTogglePublish(review)}
                                                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${review.status === 'published' ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                                                        >
                                                            {review.status === 'published' ? <><EyeOff size={12} /> Thu hồi</> : <><Send size={12} /> Gửi</>}
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(review.id)}
                                                            className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {editorStudent && (
                <ReviewEditorModal
                    classId={classId}
                    student={editorStudent}
                    existing={editorExisting}
                    onSaved={() => { setEditorStudent(null); setEditorExisting(null); fetchReviews(); }}
                    onClose={() => { setEditorStudent(null); setEditorExisting(null); }}
                />
            )}

            <ConfirmDialog
                isOpen={!!deleteId}
                title="Xóa báo cáo"
                message="Bạn có chắc muốn xóa báo cáo này? Hành động không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}

// ========================================
// ATTENDANCE TAB
// ========================================

export default function ClassDetailDashboard({ classData, onBack, onUpdate, onRegenerateMeet }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [pendingCount, setPendingCount] = useState(0);
    const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);

    // Fetch enrolled students for Reviews tab — dùng online-class enrollments
    useEffect(() => {
        (api as any).getOnlineClassEnrollments(classData.id).then((res: any) => {
            const list = res?.data?.data || res?.data || res || [];
            const active = (Array.isArray(list) ? list : []).filter(
                (r: any) => !r.enrollment_status || ['approved', 'active', 'completed', 'enrolled'].includes(r.enrollment_status)
            );
            setEnrolledStudents(active.map((r: any) => ({
                id: r.id ?? r.student_id,
                student_id: r.id ?? r.student_id,
                ho_ten_full: r.ho_ten_full || r.student_name || '—',
                student_name: r.ho_ten_full || r.student_name || '—',
            })));
        }).catch(() => setEnrolledStudents([]));
    }, [classData.id]);

    // Fetch pending count immediately on mount
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const response = await api.getPendingEnrollments(classData.id);
                if (response.success) {
                    const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                    setPendingCount(list.length);
                }
            } catch (error) {
                console.error('Error fetching pending count:', error);
            }
        };
        fetchPendingCount();
    }, [classData.id]);

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onBack} className="rounded-full hover:bg-slate-100 -ml-2">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            {classData.class_name}
                            <Badge variant="outline" className="ml-2 font-normal text-xs text-slate-500 border-slate-300">
                                {classData.status}
                            </Badge>
                        </h1>
                        <p className="text-sm text-slate-500 flex items-center gap-4 mt-0.5">
                            <span className="flex items-center gap-1"><Clock size={14} /> {classData.schedule_time}</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="hidden sm:flex" onClick={() => onUpdate(classData)}>
                        <Edit size={16} className="mr-2" /> Chỉnh sửa
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                    <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm inline-flex h-auto sticky top-[80px] z-10 flex-wrap">
                        <TabsTrigger value="overview" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 font-medium">
                            <div className="flex items-center gap-2">
                                <BookOpen size={18} />
                                Tổng quan
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 font-medium relative">
                            <div className="flex items-center gap-2">
                                <UserCheck size={18} />
                                Duyệt đăng ký
                                {pendingCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                        {pendingCount}
                                    </span>
                                )}
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="students" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 font-medium">
                            <div className="flex items-center gap-2">
                                <Users size={18} />
                                Học viên
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 font-medium">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} />
                                Điểm danh
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 font-medium">
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                Tài liệu
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="reviews" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 font-medium">
                            <div className="flex items-center gap-2">
                                <ClipboardList size={18} />
                                Báo cáo
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="feedback" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-medium">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={18} />
                                Feedback học viên
                            </div>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="focus-visible:outline-none">
                        <ClassOverviewTab classData={classData} onRegenerateMeet={onRegenerateMeet} />
                    </TabsContent>

                    <TabsContent value="pending" className="focus-visible:outline-none">
                        <PendingEnrollmentsTab classId={classData.id} onCountChange={setPendingCount} />
                    </TabsContent>

                    <TabsContent value="students" className="focus-visible:outline-none">
                        <StudentsTab classId={classData.id} />
                    </TabsContent>

                    <TabsContent value="attendance" className="focus-visible:outline-none">
                        <AttendanceTab classId={classData.id} />
                    </TabsContent>

                    <TabsContent value="resources" className="focus-visible:outline-none">
                        <DocumentsTab classId={classData.id} />
                    </TabsContent>

                    <TabsContent value="reviews" className="focus-visible:outline-none">
                        <ReviewsTab classId={classData.id} classStudents={enrolledStudents} />
                    </TabsContent>

                    <TabsContent value="feedback" className="focus-visible:outline-none">
                        <StudentFeedbackManagement classId={classData.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
