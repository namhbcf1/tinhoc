import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, Clock, MapPin, Users, X, Check, XCircle, AlertCircle, Download, FileText, ChevronRight, CheckCircle } from 'lucide-react';
import api from '../../../services/api';
import { StudentDetailSheet, getImageUrl, formatDate } from './MobileStudentsModule';
import { useToast } from '../../../components/ui/ToastContainer';
import ToastContainer from '../../../components/ui/ToastContainer';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';

// Helper to format time
const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
};

const ExamFormSheet = ({ exam, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        exam_name: '',
        exam_date: '',
        exam_time: '',
        duration_minutes: 120,
        location: '',
        notes: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (exam) {
            const dateObj = new Date(exam.exam_date);
            setFormData({
                exam_name: exam.exam_name,
                exam_date: dateObj.toISOString().split('T')[0],
                exam_time: dateObj.toTimeString().slice(0, 5),
                duration_minutes: exam.duration_minutes || 120,
                location: exam.location || '',
                notes: exam.notes || '',
            });
        }
    }, [exam]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dateStr = `${formData.exam_date}T${formData.exam_time}:00`;
            const examDate = new Date(dateStr);

            const payload = {
                exam_name: formData.exam_name,
                exam_date: examDate.toISOString(),
                duration_minutes: parseInt(formData.duration_minutes),
                location: formData.location,
                notes: formData.notes,
                class_id: null
            };

            let response;
            if (exam) {
                response = await api.updateExamSchedule(exam.id, payload);
            } else {
                response = await api.createExamSchedule(payload);
            }

            if (response.success) {
                onSuccess?.();
                onClose();
            } else {
                toast.error('Có lỗi xảy ra: ' + (response.message || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50" onClick={onClose}>
            <div
                className="bg-white w-full max-h-[90vh] rounded-t-3xl shadow-xl overflow-hidden flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">
                        {exam ? 'Cập nhật lịch thi' : 'Tạo lịch thi mới'}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-slate-200 rounded-full text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-5">
                    <form id="exam-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên kỳ thi <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.exam_name}
                                onChange={e => setFormData({ ...formData, exam_name: e.target.value })}
                                placeholder="VD: Thi cuối kỳ K12..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày thi <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    value={formData.exam_date}
                                    onChange={e => setFormData({ ...formData, exam_date: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giờ thi <span className="text-red-500">*</span></label>
                                <input
                                    type="time"
                                    required
                                    value={formData.exam_time}
                                    onChange={e => setFormData({ ...formData, exam_time: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Thời lượng (phút)</label>
                                <input
                                    type="number"
                                    value={formData.duration_minutes}
                                    onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Địa điểm</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Phòng 101"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t bg-white safe-pb">
                    <button
                        type="submit"
                        form="exam-form"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-lg shadow-blue-200"
                    >
                        {loading ? 'Đang xử lý...' : (exam ? 'Lưu thay đổi' : 'Tạo lịch thi')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExamCard = ({ exam, onClick }) => {
    const title = exam.exam_name || exam.title || exam.ten_lich_thi || exam.ten || 'Chưa có tên';
    const examDate = exam.exam_date || exam.ngay_thi || exam.ngay || new Date();
    const room = exam.location || exam.room || exam.dia_diem || exam.phong_thi || 'Chưa xếp phòng';
    const dateObj = new Date(examDate);

    // Create separate Date objects for comparison
    const examDateOnly = new Date(dateObj);
    examDateOnly.setHours(0, 0, 0, 0);
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);

    const isPast = examDateOnly.getTime() < todayOnly.getTime();
    const isToday = examDateOnly.getTime() === todayOnly.getTime();
    const pendingCount = exam.pending_count || 0;
    const totalStudents = exam.total_students || exam.student_count || 0;

    return (
        <div
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-3 active:scale-[0.98] transition-all duration-200"
            onClick={() => onClick(exam)}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-bold text-slate-800 line-clamp-2 mb-2">{title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${isToday ? 'bg-emerald-100 text-emerald-700' :
                            isPast ? 'bg-slate-100 text-slate-600' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                            {isToday ? 'Hôm nay' : isPast ? 'Đã qua' : 'Sắp tới'}
                        </span>
                        {totalStudents > 0 && (
                            <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Users size={10} />
                                {totalStudents} thí sinh
                            </span>
                        )}
                        {pendingCount > 0 && (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <AlertCircle size={10} />
                                {pendingCount} chờ
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl min-w-[70px] flex-shrink-0">
                    <p className="text-xs text-blue-600 font-bold uppercase">{dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}</p>
                    <p className="text-2xl font-bold text-blue-700 my-0.5">{dateObj.getDate()}</p>
                    <p className="text-xs text-blue-600 font-medium">Th {dateObj.getMonth() + 1}</p>
                </div>
            </div>

            <div className="space-y-1.5 mt-3">
                <div className="flex items-center text-sm text-slate-600">
                    <Clock size={14} className="mr-2 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{formatTime(examDate)} • {exam.duration_minutes || 120} phút</span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                    <MapPin size={14} className="mr-2 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{room}</span>
                </div>
            </div>
        </div>
    );
};

const ExamDetailSheet = ({ exam, onClose, onRefresh, onEdit, onDelete }) => {
    const [activeTab, setActiveTab] = useState('approved');
    const [approvedList, setApprovedList] = useState([]);
    const [pendingList, setPendingList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showStudentDetail, setShowStudentDetail] = useState(false);

    useEffect(() => {
        if (exam) {
            loadStudentLists();
        }
    }, [exam]);

    const loadStudentLists = async () => {
        setLoading(true);
        try {
            const [approvedRes, pendingRes] = await Promise.all([
                api.getExamStudents(exam.id),
                api.getPendingExamStudents(exam.id)
            ]);
            setApprovedList(Array.isArray(approvedRes.data) ? approvedRes.data : (approvedRes.data?.data || []));
            setPendingList(Array.isArray(pendingRes.data) ? pendingRes.data : (pendingRes.data?.data || []));
        } catch (error) {
            console.error('Failed to load student lists', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveStudent = async (student) => {
        try {
            const res = await api.approveExamStudent(exam.id, student.student_id);
            if (res.success) {
                // Move from pending to approved
                setPendingList(prev => prev.filter(s => s.student_id !== student.student_id));
                setApprovedList(prev => [{ ...student, registration_status: 'approved' }, ...prev]);
                onRefresh?.(); // Refresh exam list to update counts
            }
        } catch (error) {
            console.error('Failed to approve student', error);
            toast.error('Lỗi duyệt thí sinh: ' + error.message);
        }
    };

    const handleApproveAll = async () => {
        if (pendingList.length === 0) return;
        try {
            const res = await api.approveAllExamStudents(exam.id);
            if (res.success) {
                // Move all pending to approved
                setApprovedList(prev => [...pendingList.map(s => ({ ...s, registration_status: 'approved' })), ...prev]);
                setPendingList([]);
                onRefresh?.();
            }
        } catch (error) {
            console.error('Failed to approve all', error);
            toast.error('Lỗi duyệt tất cả: ' + error.message);
        }
    };

    const handleRejectStudent = async (student) => {
        try {
            const res = await api.rejectExamStudent(exam.id, student.student_id);
            if (res.success) {
                setPendingList(prev => prev.filter(s => s.student_id !== student.student_id));
                onRefresh?.();
            }
        } catch (error) {
            console.error('Failed to reject student', error);
            toast.error('Lỗi từ chối thí sinh: ' + error.message);
        }
    };

    const handleRemoveStudent = async (student) => {
        if (!confirm(`Xóa ${student.ho_ten_full} khỏi danh sách?`)) return;
        try {
            const res = await api.removeStudentFromExam(exam.id, student.student_id);
            if (res.success) {
                setApprovedList(prev => prev.filter(s => s.student_id !== student.student_id));
                onRefresh?.();
            }
        } catch (error) {
            console.error('Failed to remove student', error);
            toast.error('Lỗi xóa thí sinh: ' + error.message);
        }
    };

    const handleExportExcel = async () => {
        try {
            await api.downloadExamListExcel(exam.id);
        } catch (error) {
            console.error('Failed to export', error);
            toast.error('Lỗi xuất Excel: ' + error.message);
        }
    };

    const handleOpenStudentDetail = async (student) => {
        // Fetch full student data by CCCD
        try {
            const response = await api.getStudentByCCCD(student.cccd);
            const fullStudent = response.data || response || student;
            setSelectedStudent(fullStudent);
            setShowStudentDetail(true);
        } catch (error) {
            console.error('Failed to fetch student data', error);
            setSelectedStudent(student);
            setShowStudentDetail(true);
        }
    };

    const dateObj = new Date(exam.exam_date);
    const displayList = activeTab === 'approved' ? approvedList : pendingList;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
                <div
                    className="bg-white w-full max-h-[92vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-5 pt-6 pb-5">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 transition-transform z-10"
                        >
                            <X size={20} className="text-white" />
                        </button>

                        <div className="absolute top-4 left-4 flex gap-2 z-10">
                            <button
                                onClick={onEdit}
                                className="p-2 rounded-full bg-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                                title="Chỉnh sửa"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-2 rounded-full bg-red-500/30 backdrop-blur-sm active:scale-95 transition-transform"
                                title="Xóa"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>
                            </button>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 mb-3">
                                <Calendar size={32} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">{exam.exam_name}</h2>
                            <div className="flex items-center justify-center gap-2 text-white/90 text-sm mb-3">
                                <Calendar size={14} />
                                <span>{dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                <span>•</span>
                                <Clock size={14} />
                                <span>{formatTime(exam.exam_date)}</span>
                            </div>
                            {exam.location && (
                                <div className="flex items-center justify-center gap-1.5 text-white/80 text-xs">
                                    <MapPin size={12} />
                                    <span>{exam.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                                <p className="text-xs text-white/80 font-medium mb-0.5">Tổng số</p>
                                <p className="text-xl font-bold text-white">{approvedList.length + pendingList.length}</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                                <p className="text-xs text-white/80 font-medium mb-0.5">Đã duyệt</p>
                                <p className="text-xl font-bold text-white">{approvedList.length}</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                                <p className="text-xs text-white/80 font-medium mb-0.5">Chờ duyệt</p>
                                <p className="text-xl font-bold text-white">{pendingList.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 px-5 bg-white sticky top-0 z-10">
                        <button
                            onClick={() => setActiveTab('approved')}
                            className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'approved' ? 'text-emerald-600 border-emerald-600' : 'text-slate-500 border-transparent'}`}
                        >
                            ✅ Đã duyệt ({approvedList.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 pb-3 pt-3 font-medium text-sm transition-colors border-b-2 relative ${activeTab === 'pending' ? 'text-amber-600 border-amber-600' : 'text-slate-500 border-transparent'}`}
                        >
                            ⏳ Chờ duyệt ({pendingList.length})
                            {pendingList.length > 0 && (
                                <span className="absolute top-2 right-[calc(50%-60px)] w-2 h-2 rounded-full bg-amber-500"></span>
                            )}
                        </button>
                    </div>

                    {/* Actions Bar */}
                    <div className="px-5 py-3 border-b border-slate-200 flex gap-2 flex-wrap bg-slate-50">
                        {activeTab === 'pending' && pendingList.length > 0 && (
                            <button
                                onClick={handleApproveAll}
                                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform flex items-center gap-1.5 flex-1 justify-center min-w-0"
                            >
                                <Check size={14} />
                                Duyệt tất cả
                            </button>
                        )}
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform flex items-center gap-1.5 flex-1 justify-center min-w-0"
                        >
                            <Download size={14} />
                            Export Excel
                        </button>
                    </div>

                    {/* Student List */}
                    <div className="flex-1 overflow-y-auto px-5 py-4">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-purple-600 border-t-transparent"></div>
                            </div>
                        ) : displayList.length > 0 ? (
                            <div className="space-y-3">
                                {displayList.map((student) => (
                                    <div
                                        key={student.student_id || student.id}
                                        className={`bg-white p-4 rounded-xl border-2 ${activeTab === 'pending' ? 'border-amber-200' : 'border-slate-100'} shadow-sm`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm overflow-hidden flex-shrink-0 ${activeTab === 'pending'
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                                                    : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                                    }`}
                                                onClick={() => handleOpenStudentDetail(student)}
                                            >
                                                {student.image_3x4 ? (
                                                    <img
                                                        src={getImageUrl(student.image_3x4)}
                                                        alt={student.ho_ten_full}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            const fallback = e.target.nextElementSibling;
                                                            if (fallback) fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <span style={{ display: student.image_3x4 ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                                    {student.ho_ten_full?.charAt(0)?.toUpperCase() || 'U'}
                                                </span>
                                            </div>

                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => handleOpenStudentDetail(student)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800 truncate">{student.ho_ten_full}</h4>
                                                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                                                </div>
                                                <p className="text-sm text-slate-500 truncate">{student.cccd}</p>
                                                {student.registration_date && (
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Đăng ký: {new Date(student.registration_date).toLocaleDateString('vi-VN')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                {activeTab === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleApproveStudent(student); }}
                                                            className="p-2 bg-emerald-100 text-emerald-700 rounded-lg active:scale-95 transition-transform"
                                                            title="Duyệt"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRejectStudent(student); }}
                                                            className="p-2 bg-red-100 text-red-600 rounded-lg active:scale-95 transition-transform"
                                                            title="Từ chối"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveStudent(student); }}
                                                        className="p-2 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-transform opacity-60 hover:opacity-100"
                                                        title="Xóa"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <Users size={64} className="mb-3 opacity-30" />
                                <p className="font-medium">
                                    {activeTab === 'pending' ? 'Không có thí sinh chờ duyệt' : 'Chưa có thí sinh nào'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Student Detail Sheet */}
            {showStudentDetail && selectedStudent && (
                <StudentDetailSheet
                    student={selectedStudent}
                    onClose={() => setShowStudentDetail(false)}
                    onEdit={() => { }} // Disable edit from exam view
                />
            )}
        </>
    );
};

export default function MobileExamSchedulesModule() {
    const toast = useToast();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExam, setSelectedExam] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await api.getAllExamSchedules(100, 0);
            const examList = Array.isArray(res) ? res : (res?.data || res?.results || []);
            setExams(examList);
        } catch (error) {
            console.error("Failed to fetch exams", error);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSuccess = () => {
        setIsCreating(false);
        setIsEditing(false);
        setSelectedExam(null);
        fetchExams();
    };

    const handleDeleteExam = async (examId) => {
        if (!confirm('Bạn có chắc muốn xóa lịch thi này? Dữ liệu không thể khôi phục.')) return;
        try {
            const res = await api.deleteExamSchedule(examId);
            if (res.success) {
                setSelectedExam(null);
                fetchExams();
            }
        } catch (e) {
            toast.error('Không thể xóa: ' + e.message);
        }
    };

    // Filter and search
    let filteredExams = exams.filter(e => {
        const title = (e.exam_name || e.title || e.ten_lich_thi || e.ten || '').toLowerCase();
        const matchesSearch = title.includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const examDate = new Date(e.exam_date);
        examDate.setHours(0, 0, 0, 0);

        if (filter === 'all') return true;
        if (filter === 'upcoming') return examDate >= now;
        if (filter === 'past') return examDate < now;
        return true;
    });

    // Sort by date
    filteredExams.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));

    // Stats
    const totalExams = exams.length;
    const upcomingExams = exams.filter(e => {
        const examDate = new Date(e.exam_date);
        examDate.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return examDate.getTime() >= now.getTime();
    }).length;
    const pastExams = totalExams - upcomingExams;
    const totalPending = exams.reduce((sum, e) => sum + (e.pending_count || 0), 0);

    // Pull-to-refresh callback
    const handleRefresh = async () => {
        await fetchExams();
    };

    return (
        <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50">
            {/* Stats Dashboard */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 pt-4 pb-6">
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div
                        className={`bg-white/20 backdrop-blur-sm rounded-xl px-2 py-3 border border-white/30 cursor-pointer active:scale-95 transition-transform ${filter === 'all' ? 'ring-2 ring-white' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        <p className="text-xs text-white/80 font-medium mb-0.5 text-center">Tổng</p>
                        <p className="text-2xl font-bold text-white text-center">{totalExams}</p>
                    </div>
                    <div
                        className={`bg-white/20 backdrop-blur-sm rounded-xl px-2 py-3 border border-white/30 cursor-pointer active:scale-95 transition-transform ${filter === 'upcoming' ? 'ring-2 ring-white' : ''}`}
                        onClick={() => setFilter('upcoming')}
                    >
                        <p className="text-xs text-white/80 font-medium mb-0.5 text-center">Sắp tới</p>
                        <p className="text-2xl font-bold text-white text-center">{upcomingExams}</p>
                    </div>
                    <div
                        className={`bg-white/20 backdrop-blur-sm rounded-xl px-2 py-3 border border-white/30 cursor-pointer active:scale-95 transition-transform ${filter === 'past' ? 'ring-2 ring-white' : ''}`}
                        onClick={() => setFilter('past')}
                    >
                        <p className="text-xs text-white/80 font-medium mb-0.5 text-center">Đã qua</p>
                        <p className="text-2xl font-bold text-white text-center">{pastExams}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-2 py-3 border border-white/30 relative">
                        <p className="text-xs text-white/80 font-medium mb-0.5 text-center">Chờ</p>
                        <p className="text-2xl font-bold text-white text-center">{totalPending}</p>
                        {totalPending > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                    <input
                        type="text"
                        placeholder="Tìm kỳ thi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Exam List */}
            <div className="p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-purple-600 border-t-transparent"></div>
                        <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredExams.length > 0 ? (
                    <div className="space-y-3 pb-6">
                        {filteredExams.map((e) => (
                            <ExamCard
                                key={e.id}
                                exam={e}
                                onClick={setSelectedExam}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-60">
                        <Calendar size={64} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Không tìm thấy kỳ thi nào</p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-sm text-purple-600 font-medium"
                            >
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Exam Detail Sheet */}
            {selectedExam && !isEditing && (
                <ExamDetailSheet
                    exam={selectedExam}
                    onClose={() => setSelectedExam(null)}
                    onRefresh={fetchExams}
                    onEdit={() => setIsEditing(true)}
                    onDelete={() => handleDeleteExam(selectedExam.id)}
                />
            )}

            {/* Create/Edit Form */}
            {(isCreating || isEditing) && (
                <ExamFormSheet
                    exam={isEditing ? selectedExam : null}
                    onClose={() => { setIsCreating(false); setIsEditing(false); }}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Floating Action Button */}
            <button
                onClick={() => setIsCreating(true)}
                className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center text-white active:scale-90 transition-transform z-40"
            >
                <Plus size={28} />
            </button>
        </div>

            <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        </PullToRefreshWrapper>
    );
}
