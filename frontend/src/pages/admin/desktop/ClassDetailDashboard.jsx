import { useState, useEffect } from 'react';
import {
    ArrowLeft, Users, Calendar, BookOpen, Settings,
    MoreVertical, Clock, MapPin, Video, Copy, ExternalLink,
    CheckCircle, XCircle, AlertCircle, Plus, Search, Filter,
    FileText, Download, Upload, Trash2, Edit, Save, CheckSquare, Square,
    UserCheck, UserX
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
                                <h3 className="text-4xl font-bold">{classData.enrollment_count || 0}</h3>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
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
// ATTENDANCE TAB
// ========================================

export default function ClassDetailDashboard({ classData, onBack, onUpdate, onRegenerateMeet }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [pendingCount, setPendingCount] = useState(0);

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
                            <span className="flex items-center gap-1"><Users size={14} /> {classData.teacher_name || 'Chưa có GV'}</span>
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
                </Tabs>
            </div>
        </div>
    );
}
