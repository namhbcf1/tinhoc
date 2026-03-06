import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../services/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { showError } from '../../../utils/errorHandler';
import { formatDateVN, formatTime } from '../../../utils/dateUtils';
import DateInput from '../../../components/ui/DateInput';
import XLSX from 'xlsx-js-style';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Badge } from '../../../components/ui/Badge';
import {
  Calendar, Edit, Trash2, Search, PlusCircle, Users, Clock, MapPin, Info, MoreVertical, X, Download, UserX, FileText, Phone, Mail, CheckCircle, XCircle, User, CheckCheck
} from 'lucide-react';

import EmptyState from '../../../components/ui/EmptyState';

// Custom hook for detecting outside clicks
const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export default function ExamSchedulesPage() {
  const { success, error, toasts, removeToast } = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [conflictStudentIds, setConflictStudentIds] = useState(new Set());

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);

  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [addStudentsQuery, setAddStudentsQuery] = useState('');
  const [addStudentsLoading, setAddStudentsLoading] = useState(false);
  const [addStudentsResults, setAddStudentsResults] = useState([]);
  const [selectedAddStudentIds, setSelectedAddStudentIds] = useState(() => new Set());
  const [addingStudents, setAddingStudents] = useState(false);

  const [filter, setFilter] = useState('upcoming');
  const [examCategoryOptions, setExamCategoryOptions] = useState([]); // từ DB chung (vantrangexam)
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    exam_name: '',
    exam_date: '',
    exam_time: '',
    duration_minutes: 120,
    location: '',
    notes: '',
    zoom_link: '',
    zoom_meeting_id: '',
    zoom_passcode: '',
    exam_type: '',
  });

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [submitting, setSubmitting] = useState(false);

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentList, setStudentList] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [selectedExamForList, setSelectedExamForList] = useState(null);
  const [studentListLoading, setStudentListLoading] = useState(false);
  const [studentTab, setStudentTab] = useState('approved'); // 'approved' | 'pending'
  const [approving, setApproving] = useState(null); // student_id being approved

  useEffect(() => {
    loadExams();
    loadExamCategories();
  }, []);

  // Load exam categories từ DB chung (teacher vantrangexam tạo → admin thấy)
  const loadExamCategories = async () => {
    try {
      const res = await api.request('/exam-categories');
      if (res?.success && Array.isArray(res.data)) {
        setExamCategoryOptions(res.data);
      }
    } catch (err) {
      console.error('Failed to load exam categories:', err);
    }
  };

  const loadExams = async () => {
    setLoading(true);
    try {
      const response = await api.getUpcomingExams(100); // Fetch more
      if (response && response.success) {
        setExams(response.data || []);
      } else {
        setExams([]);
        if (response && response.message) {
          error(response.message);
        }
      }
    } catch (err) {
      console.error('Error loading exams:', err);
      setExams([]);
      showError(err, { error });
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = async (exam) => {
    setStudentListLoading(true);
    setSelectedExamForList(exam);
    setShowStudentsModal(true);
    setStudentTab('approved');
    setStudentList([]);
    setPendingStudents([]);
    setConflictStudentIds(new Set());

    try {
      // Load both approved and pending in parallel
      const [approvedRes, pendingRes] = await Promise.all([
        api.getExamStudents(exam.id),
        api.getPendingExamStudents(exam.id)
      ]);

      if (approvedRes.success) {
        setStudentList(approvedRes.data || []);
      }
      if (pendingRes.success) {
        setPendingStudents(pendingRes.data || []);
      }

      // Also check conflicts so we can warn in the list UI
      try {
        const conflictsRes = await api.getExamRegistrationConflicts();
        const conflictList = conflictsRes?.success ? (conflictsRes.data || []) : [];
        const conflictSet = new Set((conflictList || []).map(x => Number(x.student_id)));
        setConflictStudentIds(conflictSet);

        const approvedIds = new Set((approvedRes.data || []).map(s => Number(s.student_id)));
        const pendingIds = new Set((pendingRes.data || []).map(s => Number(s.student_id)));
        let hit = 0;
        conflictSet.forEach(id => {
          if (approvedIds.has(id) || pendingIds.has(id)) hit++;
        });
        if (hit > 0) {
          error(`Cảnh báo: có ${hit} thí sinh đang bị trùng đăng ký thi. Bấm "Kiểm tra trùng đăng ký" để xem chi tiết.`);
        }
      } catch {
        // Ignore conflict check errors to avoid blocking the modal
      }
    } catch (err) {
      showError(err);
    } finally {
      setStudentListLoading(false);
    }
  };

  const refreshSelectedExamStudents = async () => {
    if (!selectedExamForList?.id) return;
    try {
      const [approvedRes, pendingRes] = await Promise.all([
        api.getExamStudents(selectedExamForList.id),
        api.getPendingExamStudents(selectedExamForList.id),
      ]);

      if (approvedRes?.success) setStudentList(approvedRes.data || []);
      if (pendingRes?.success) setPendingStudents(pendingRes.data || []);
    } catch (err) {
      console.error('Error refreshing exam students:', err);
    }
  };

  const openAddStudentsModal = () => {
    setShowAddStudentsModal(true);
    setAddStudentsQuery('');
    setAddStudentsResults([]);
    setSelectedAddStudentIds(new Set());
  };

  const handleSearchAddStudents = async () => {
    const q = String(addStudentsQuery || '').trim();
    if (q.length < 2) {
      error('Nhập ít nhất 2 ký tự để tìm kiếm');
      return;
    }

    setAddStudentsLoading(true);
    try {
      const res = await api.searchStudents(q);
      if (res?.success) {
        setAddStudentsResults(res.data || []);
      } else {
        setAddStudentsResults([]);
        error(res?.message || 'Không thể tìm kiếm học viên');
      }
    } catch (err) {
      console.error('Error searching students:', err);
      showError(err, { error });
    } finally {
      setAddStudentsLoading(false);
    }
  };

  const toggleSelectAddStudent = (id) => {
    setSelectedAddStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelectedStudents = async (force = false) => {
    if (!selectedExamForList?.id) return;
    const ids = Array.from(selectedAddStudentIds || []);
    if (ids.length === 0) {
      error('Chưa chọn học viên nào');
      return;
    }

    setAddingStudents(true);
    try {
      const res = await api.addStudentsToExamWithForce(selectedExamForList.id, ids, force);
      if (res?.success) {
        const results = res.results || [];
        const ok = results.filter(r => r.status === 'success').length;
        const blocked = results.filter(r => r.status === 'blocked').length;
        const failed = results.filter(r => r.status === 'error').length;

        success(`Đã thêm: ${ok}. Bị chặn: ${blocked}. Lỗi: ${failed}.`);
        await refreshSelectedExamStudents();
        setShowAddStudentsModal(false);
      } else {
        error(res?.message || 'Không thể thêm thí sinh');
      }
    } catch (err) {
      console.error('Error adding students to exam:', err);
      showError(err, { error });
    } finally {
      setAddingStudents(false);
    }
  };

  const handleViewDuplicateHistory = async (student) => {
    if (!student?.student_id) return;
    setHistoryStudent(student);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryRows([]);

    try {
      const res = await api.getStudentExamRegistrationHistory(student.student_id);
      if (res?.success) {
        setHistoryRows(res.data || []);
      } else {
        error(res?.message || 'Không thể lấy lịch sử đăng ký');
      }
    } catch (err) {
      console.error('Error loading student registration history:', err);
      showError(err, { error });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApproveStudent = async (student) => {
    setApproving(student.student_id);
    try {
      const response = await api.approveExamStudent(selectedExamForList.id, student.student_id);
      if (response.success) {
        success(`Đã duyệt thí sinh ${student.ho_ten_full}`);
        // Move from pending to approved
        setPendingStudents(prev => prev.filter(s => s.student_id !== student.student_id));
        setStudentList(prev => [{ ...student, registration_status: 'approved' }, ...prev]);
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setApproving(null);
    }
  };

  const handleRejectStudent = (student) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Từ chối thí sinh',
      message: `Bạn có chắc chắn muốn từ chối thí sinh "${student.ho_ten_full}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.rejectExamStudent(selectedExamForList.id, student.student_id);
          if (response.success) {
            success('Đã từ chối thí sinh');
            setPendingStudents(prev => prev.filter(s => s.student_id !== student.student_id));
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const handleApproveAll = async () => {
    if (pendingStudents.length === 0) return;
    setApproving('all');
    try {
      const response = await api.approveAllExamStudents(selectedExamForList.id);
      if (response.success) {
        success(`Đã duyệt tất cả ${pendingStudents.length} thí sinh`);
        // Move all pending to approved
        setStudentList(prev => [...pendingStudents.map(s => ({ ...s, registration_status: 'approved' })), ...prev]);
        setPendingStudents([]);
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setApproving(null);
    }
  };

  const handleRemoveStudent = (student) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa thí sinh khỏi kỳ thi',
      message: `Bạn có chắc chắn muốn xóa thí sinh "${student.ho_ten_full}" khỏi kỳ thi "${selectedExamForList?.exam_name}"?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.removeStudentFromExam(selectedExamForList.id, student.student_id);
          if (response.success) {
            success('Đã xóa thí sinh khỏi kỳ thi');
            setStudentList(prev => prev.filter(s => s.student_id !== student.student_id));
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const filteredExams = useMemo(() => {
    let result = [...exams];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (filter === 'upcoming') {
      result = result.filter(e => {
        const examDate = new Date(e.exam_date);
        examDate.setHours(0, 0, 0, 0);
        return examDate.getTime() >= now.getTime();
      });
    } else if (filter === 'past') {
      result = result.filter(e => {
        const examDate = new Date(e.exam_date);
        examDate.setHours(0, 0, 0, 0);
        return examDate.getTime() < now.getTime();
      });
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.exam_name.toLowerCase().includes(lowerSearch) ||
        (e.location && e.location.toLowerCase().includes(lowerSearch))
      );
    }

    return result.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
  }, [exams, filter, searchTerm]);

  const handleCreate = () => {
    setEditingExam(null);
    setFormData({
      exam_name: '',
      exam_date: '',
      exam_time: '',
      duration_minutes: 120,
      location: '',
      notes: '',
      zoom_link: '',
      zoom_meeting_id: '',
      zoom_passcode: '',
      exam_type: '',
    });
    setShowModal(true);
  };

  const handleOpenConflicts = async () => {
    setShowConflictsModal(true);
    setConflictsLoading(true);
    setConflicts([]);
    try {
      const res = await api.getExamRegistrationConflicts();
      if (res?.success) {
        setConflicts(res.data || []);
      } else {
        error(res?.message || 'Không thể lấy dữ liệu trùng');
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setConflictsLoading(false);
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    const dateObj = new Date(exam.exam_date);
    // Format date as yyyy-mm-dd for native date input
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setFormData({
      exam_name: exam.exam_name,
      exam_date: dateStr,
      exam_time: formatTime(dateObj),
      duration_minutes: exam.duration_minutes || 120,
      location: exam.location || '',
      notes: exam.notes || '',
      zoom_link: exam.zoom_link || '',
      zoom_meeting_id: exam.zoom_meeting_id || '',
      zoom_passcode: exam.zoom_passcode || '',
      exam_type: exam.exam_type || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.exam_name?.trim()) {
      error('Vui lòng nhập tên kỳ thi');
      return;
    }
    if (!formData.exam_date) {
      error('Vui lòng chọn ngày thi');
      return;
    }
    if (!formData.exam_time) {
      error('Vui lòng chọn giờ bắt đầu');
      return;
    }

    setSubmitting(true);
    try {
      // Parse date from native input (yyyy-mm-dd)
      const [year, month, day] = formData.exam_date.split('-').map(Number);
      const [hours, minutes] = formData.exam_time.split(':').map(Number);

      // Create Date object
      const examDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

      if (isNaN(examDate.getTime())) {
        error('Ngày thi không hợp lệ');
        setSubmitting(false);
        return;
      }

      const payload = {
        exam_name: formData.exam_name.trim(),
        exam_date: examDate.toISOString(),
        duration_minutes: parseInt(formData.duration_minutes) || 120,
        location: formData.location?.trim() || '',
        notes: formData.notes?.trim() || '',
        class_id: null,
        zoom_link: formData.zoom_link?.trim() || null,
        zoom_meeting_id: formData.zoom_meeting_id?.trim() || null,
        zoom_passcode: formData.zoom_passcode?.trim() || null,
        exam_type: formData.exam_type?.trim() || null,
      };

      let response;
      if (editingExam) {
        response = await api.updateExamSchedule(editingExam.id, payload);
        if (response.success) {
          success('Cập nhật lịch thi thành công');
        }
      } else {
        response = await api.createExamSchedule(payload);
        if (response.success) {
          success('Tạo lịch thi thành công');
        }
      }

      if (response?.success) {
        setShowModal(false);
        loadExams();
      } else {
        error(response?.message || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showError(err, { error });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (exam) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa lịch thi',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn kỳ thi "${exam.exam_name}"? Mọi dữ liệu liên quan sẽ bị mất.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.deleteExamSchedule(exam.id);
          if (response.success) {
            success('Đã xóa lịch thi');
            loadExams();
          }
        } catch (err) {
          showError(err, { error });
        }
      },
    });
  };

  const getStatusProps = (dateStr) => {
    if (!dateStr) return { label: '---', variant: 'outline', color: 'text-gray-400' };

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { label: 'Lỗi', variant: 'destructive', color: 'text-red-500' };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const examDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (examDate < today) return { label: 'Đã qua', variant: 'outline', color: 'text-gray-500' };
    if (examDate.getTime() === today.getTime()) return { label: 'Hôm nay', variant: 'default', color: 'bg-blue-500 text-white' };
    return { label: 'Sắp tới', variant: 'default', color: 'bg-green-500 text-white' };
  };

  const exportStudentListToExcel = () => {
    if (!studentList.length) {
      error("Không có dữ liệu để xuất.");
      return;
    }
    // Dispatch theo exam_type: VSTEP dùng format riêng, còn lại dùng format PTIT/Tin học
    const examType = (selectedExamForList?.exam_type || '').toLowerCase();
    if (examType === 'vstep') {
      exportVstepFormat();
    } else {
      exportPtitFormat();
    }
  };

  // ── VSTEP / VEPT FORMAT ──────────────────────────────────────────────────
  // Copy đúng giao diện file "danh sách thi.xlsx":
  //   Row 1: DANH SÁCH ĐĂNG KÝ THI VERSANT... (merge A1:L1)
  //   Row 2: Tên Đơn vị... (merge A2:H2)
  //   Row 3: Đại diện | SĐT (E3) | Phần dành cho trung tâm (Q3)
  //   Row 4: 20 headers (A–T) — A–P vàng nhạt, Q–T đỏ nhạt
  //   Row 5+: data thí sinh
  const exportVstepFormat = () => {
    const examDate = selectedExamForList?.exam_date ? new Date(selectedExamForList.exam_date) : new Date();

    const splitName = (fullName) => {
      if (!fullName) return { ho: '', ten: '' };
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) return { ho: '', ten: parts[0] };
      const ten = parts.pop();
      return { ho: parts.join(' '), ten };
    };

    // ── Styles ──
    const font = (opts = {}) => ({ name: 'Times New Roman', sz: 11, ...opts });

    const titleStyle = {
      font: font({ bold: true, sz: 13 }),
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    const labelStyle = {
      font: font({ sz: 11 }),
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    // Header vàng (cột A–P: phần thí sinh điền)
    const hdYellow = {
      font: font({ bold: true, sz: 10, color: { rgb: '000000' } }),
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFFF99' } },
      border: {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } },
      },
    };
    // Header đỏ nhạt (cột Q–T: phần trung tâm)
    const hdRed = {
      font: font({ bold: true, sz: 10, color: { rgb: '000000' } }),
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'FFCCCC' } },
      border: {
        top:    { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left:   { style: 'thin', color: { rgb: '000000' } },
        right:  { style: 'thin', color: { rgb: '000000' } },
      },
    };
    // Ô data thường
    const dataStyle = (align = 'left') => ({
      font: font({ sz: 11 }),
      alignment: { horizontal: align, vertical: 'center', wrapText: false },
      border: {
        top:    { style: 'thin', color: { rgb: 'AAAAAA' } },
        bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
        left:   { style: 'thin', color: { rgb: 'AAAAAA' } },
        right:  { style: 'thin', color: { rgb: 'AAAAAA' } },
      },
    });

    const wb = XLSX.utils.book_new();
    const ws = {};

    // ── Row 1: Tiêu đề ──
    ws['A1'] = { v: 'DANH SÁCH ĐĂNG KÝ THI VERSANT ENGLISH PLACEMENT TEST (VEPT)', t: 's', s: titleStyle };

    // ── Row 2: Đơn vị ──
    ws['A2'] = { v: 'Tên Đơn vị/ Trường học đăng ký: ', t: 's', s: labelStyle };

    // ── Row 3: Đại diện | SĐT | Phần trung tâm ──
    ws['A3'] = { v: 'Đại diện đăng ký: ', t: 's', s: labelStyle };
    ws['E3'] = { v: 'Số điện thoại:', t: 's', s: labelStyle };
    ws['Q3'] = { v: 'Phần dành cho trung tâm', t: 's', s: { font: font({ bold: true, sz: 11 }), alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: 'FFCCCC' } } } };

    // ── Row 4: Headers 20 cột ──
    const headersLeft  = ['STT','Họ và tên đệm','Tên','Giới tính','Ngày sinh','Tháng sinh ','Năm sinh','Số CMND/ Hộ chiếu','Điện thoại','Email (Thí sinh điền đúng thông tin để nhận kết quả thi)','Đơn vị công tác/ Trường học','Vị trí công tác','Nhu cầu đăng ký trình độ (A1, A2, B1, B2, C1, C2)','Nhu cầu đăng ký thi ngày','Mục đích tham dự thi (Ghi rõ làm đầu vào, đầu ra sinh viên, thạc sĩ, tiến sĩ…)','Nguồn đăng kí '];
    const headersRight = ['Kiểm tra hồ sơ dự thi','Ngày thi','Giờ thi','Địa điểm thi'];

    headersLeft.forEach((h, i) => {
      ws[`${XLSX.utils.encode_col(i)}4`] = { v: h, t: 's', s: hdYellow };
    });
    headersRight.forEach((h, i) => {
      ws[`${XLSX.utils.encode_col(16 + i)}4`] = { v: h, t: 's', s: hdRed };
    });

    // ── Data rows từ row 5 ── sort theo Tên A→Z
    const sorted = [...studentList].sort((a, b) => {
      const tenA = splitName(a.ho_ten_full).ten || '';
      const tenB = splitName(b.ho_ten_full).ten || '';
      return tenA.localeCompare(tenB, 'vi', { sensitivity: 'base' });
    });

    sorted.forEach((s, idx) => {
      const { ho, ten } = splitName(s.ho_ten_full);
      const dob = s.ngay_sinh ? new Date(s.ngay_sinh) : null;
      const row = 5 + idx;
      const dc = dataStyle('center');
      const dl = dataStyle('left');

      ws[`A${row}`] = { v: idx + 1,                                                    t: 'n', s: dc };
      ws[`B${row}`] = { v: ho,                                                          t: 's', s: dl };
      ws[`C${row}`] = { v: ten,                                                         t: 's', s: dl };
      ws[`D${row}`] = { v: s.gioi_tinh || '',                                           t: 's', s: dc };
      ws[`E${row}`] = { v: dob ? String(dob.getDate()).padStart(2, '0') : '',           t: 's', s: dc };
      ws[`F${row}`] = { v: dob ? String(dob.getMonth() + 1).padStart(2, '0') : '',     t: 's', s: dc };
      ws[`G${row}`] = { v: dob ? String(dob.getFullYear()) : '',                        t: 's', s: dc };
      ws[`H${row}`] = { v: s.cccd || '',                                                t: 's', s: dc };
      ws[`I${row}`] = { v: s.sdt || '',                                                 t: 's', s: dc };
      ws[`J${row}`] = { v: s.email || '',                                               t: 's', s: dl };
      ws[`K${row}`] = { v: '',                                                          t: 's', s: dl }; // Đơn vị
      ws[`L${row}`] = { v: '',                                                          t: 's', s: dc }; // Vị trí
      ws[`M${row}`] = { v: '',                                                          t: 's', s: dc }; // Trình độ
      ws[`N${row}`] = { v: '',                                                          t: 's', s: dc }; // Ngày đăng ký thi
      ws[`O${row}`] = { v: '',                                                          t: 's', s: dl }; // Mục đích
      ws[`P${row}`] = { v: '',                                                          t: 's', s: dc }; // Nguồn
      ws[`Q${row}`] = { v: '',                                                          t: 's', s: dc }; // Kiểm tra HS
      ws[`R${row}`] = { v: '',                                                          t: 's', s: dc }; // Ngày thi
      ws[`S${row}`] = { v: '',                                                          t: 's', s: dc }; // Giờ thi
      ws[`T${row}`] = { v: '',                                                          t: 's', s: dc }; // Địa điểm
    });

    const lastRow = 4 + sorted.length;
    ws['!ref'] = `A1:T${lastRow}`;

    // Merge đúng như file gốc
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // A1:L1 — tiêu đề
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7  } }, // A2:H2 — đơn vị
      { s: { r: 2, c: 16 }, e: { r: 2, c: 19 } }, // Q3:T3 — phần trung tâm
    ];

    // Col widths đúng như file gốc (A–T = 20 cột)
    ws['!cols'] = [
      { wch: 5  }, // A  STT
      { wch: 20 }, // B  Họ và tên đệm
      { wch: 8  }, // C  Tên
      { wch: 9  }, // D  Giới tính
      { wch: 7  }, // E  Ngày sinh
      { wch: 8  }, // F  Tháng sinh
      { wch: 7  }, // G  Năm sinh
      { wch: 16 }, // H  CMND
      { wch: 13 }, // I  Điện thoại
      { wch: 34 }, // J  Email
      { wch: 26 }, // K  Đơn vị
      { wch: 16 }, // L  Vị trí
      { wch: 20 }, // M  Trình độ
      { wch: 18 }, // N  Ngày đăng ký
      { wch: 36 }, // O  Mục đích
      { wch: 14 }, // P  Nguồn
      { wch: 18 }, // Q  Kiểm tra HS
      { wch: 12 }, // R  Ngày thi
      { wch: 10 }, // S  Giờ thi
      { wch: 20 }, // T  Địa điểm
    ];

    // Row heights
    ws['!rows'] = [
      { hpt: 30 }, // Row 1 — tiêu đề
      { hpt: 18 }, // Row 2 — đơn vị
      { hpt: 18 }, // Row 3 — đại diện
      { hpt: 60 }, // Row 4 — header (cao để wrap text)
    ];
    for (let i = 5; i <= lastRow; i++) ws['!rows'][i - 1] = { hpt: 18 };

    // Freeze header
    ws['!freeze'] = { xSplit: 0, ySplit: 4, topLeftCell: 'A5', activePane: 'bottomLeft', state: 'frozen' };

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const safeExamName = (selectedExamForList?.exam_name || 'vept').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    XLSX.writeFile(wb, `VEPT_${safeExamName}_${examDate.toISOString().split('T')[0]}.xlsx`);
    success('Xuất Excel VEPT thành công!');
  };

  // ── PTIT / TIN HỌC FORMAT ────────────────────────────────────────────────
  // Format gốc: CHỨNG CHỈ ỨNG DỤNG CNTT — THEO THÔNG TƯ 03/2014
  const exportPtitFormat = () => {
    const examDate = selectedExamForList?.exam_date ? new Date(selectedExamForList.exam_date) : new Date();
    const examDateStr = `Thời gian: ngày ${String(examDate.getDate()).padStart(2, '0')} tháng ${String(examDate.getMonth() + 1).padStart(2, '0')} năm ${examDate.getFullYear()}`;

    // Split ho_ten_full into ho and ten
    const splitName = (fullName) => {
      if (!fullName) return { ho: '', ten: '' };
      const parts = fullName.trim().split(' ');
      if (parts.length === 1) return { ho: '', ten: parts[0] };
      const ten = parts.pop();
      const ho = parts.join(' ');
      return { ho, ten };
    };

    // Professional Styles với màu sắc đẹp và chuyên nghiệp
    const styles = {
      title1: {
        font: { bold: true, sz: 14, name: 'Times New Roman', color: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'E7F3FF' } }
      },
      title2: {
        font: { bold: true, sz: 13, name: 'Times New Roman', color: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'E7F3FF' } }
      },
      title3: {
        font: { bold: true, sz: 16, name: 'Times New Roman', color: { rgb: '1F4E78' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'D0E8FF' } }
      },
      italic: {
        font: { italic: true, sz: 11, name: 'Times New Roman', color: { rgb: '333333' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      },
      header: {
        font: { bold: true, sz: 11, name: 'Times New Roman', color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: '4472C4' } },
        border: {
          top: { style: 'medium', color: { rgb: '1F4E78' } },
          bottom: { style: 'medium', color: { rgb: '1F4E78' } },
          left: { style: 'medium', color: { rgb: '1F4E78' } },
          right: { style: 'medium', color: { rgb: '1F4E78' } }
        }
      },
      subHeader: {
        font: { bold: true, sz: 10, name: 'Times New Roman', color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: '5B9BD5' } },
        border: {
          top: { style: 'thin', color: { rgb: '1F4E78' } },
          bottom: { style: 'thin', color: { rgb: '1F4E78' } },
          left: { style: 'thin', color: { rgb: '1F4E78' } },
          right: { style: 'thin', color: { rgb: '1F4E78' } }
        }
      },
      dataCenter: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'FFFFFF' } }
      },
      dataLeft: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'FFFFFF' } }
      },
      dataCenterAlt: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'F2F2F2' } }
      },
      dataLeftAlt: {
        font: { sz: 11, name: 'Times New Roman', color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        },
        fill: { fgColor: { rgb: 'F2F2F2' } }
      }
    };

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = {};

    // Row 1: CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO
    ws['A1'] = { v: 'CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO', t: 's', s: styles.title1 };

    // Row 2: THEO THÔNG TƯ 03/2014/TT-BTTTT
    ws['A2'] = { v: 'THEO THÔNG TƯ 03/2014/TT-BTTTT', t: 's', s: styles.title2 };

    // Row 3: DANH SÁCH DỰ THI...
    ws['A3'] = { v: `DANH SÁCH DỰ THI ${selectedExamForList?.exam_name?.toUpperCase() || ''}`, t: 's', s: styles.title3 };

    // Row 4: Thời gian
    ws['F4'] = { v: examDateStr, t: 's', s: styles.italic };

    // Row 5: Hội đồng thi
    ws['F5'] = { v: `Hội đồng thi: ${selectedExamForList?.location || 'PTIT HÀ NỘI'}`, t: 's', s: styles.italic };

    // Row 7: Headers
    const headers = ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'];
    headers.forEach((h, i) => {
      const col = String.fromCharCode(65 + i);
      ws[`${col}7`] = { v: h, t: 's', s: styles.header };
    });

    // Row 8: Sub-headers + empty cells with border
    const cols = 'ABCDEFGHIJKLM'.split('');
    cols.forEach(col => {
      if (col === 'J') {
        ws[`${col}8`] = { v: 'LT', t: 's', s: styles.subHeader };
      } else if (col === 'K') {
        ws[`${col}8`] = { v: 'TH', t: 's', s: styles.subHeader };
      } else {
        ws[`${col}8`] = { v: '', t: 's', s: styles.subHeader };
      }
    });

    // Sort data by column E (TÊN) A to Z before adding to sheet
    const sortedData = [...studentList].sort((a, b) => {
      const nameA = splitName(a.ho_ten_full).ten || '';
      const nameB = splitName(b.ho_ten_full).ten || '';
      return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
    });

    // Data rows (from row 9) với alternating row colors - sử dụng sortedData
    sortedData.forEach((s, idx) => {
      const { ho, ten } = splitName(s.ho_ten_full);
      const ngaySinh = s.ngay_sinh ? formatDateVN(s.ngay_sinh) : '';
      const row = 9 + idx;
      const isEven = idx % 2 === 0;
      const cellStyleCenter = isEven ? styles.dataCenter : styles.dataCenterAlt;
      const cellStyleLeft = isEven ? styles.dataLeft : styles.dataLeftAlt;

      ws[`A${row}`] = { v: idx + 1, t: 'n', s: cellStyleCenter };
      ws[`B${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`C${row}`] = { v: s.cccd || '', t: 's', s: cellStyleCenter };
      ws[`D${row}`] = { v: ho, t: 's', s: cellStyleLeft };
      ws[`E${row}`] = { v: ten, t: 's', s: cellStyleLeft };
      ws[`F${row}`] = { v: ngaySinh, t: 's', s: cellStyleCenter };
      ws[`G${row}`] = { v: s.noi_sinh || '', t: 's', s: cellStyleLeft };
      ws[`H${row}`] = { v: s.gioi_tinh || '', t: 's', s: cellStyleCenter };
      ws[`I${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`J${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`K${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`L${row}`] = { v: '', t: 's', s: cellStyleCenter };
      ws[`M${row}`] = { v: '', t: 's', s: cellStyleCenter };
    });

    // Set range với sortedData length
    const lastRow = 8 + sortedData.length;
    ws['!ref'] = `A1:M${lastRow}`;

    // Merge cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },  // Row 1: A1:M1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } },  // Row 2: A2:M2
      { s: { r: 2, c: 0 }, e: { r: 2, c: 12 } },  // Row 3: A3:M3
      { s: { r: 3, c: 5 }, e: { r: 3, c: 12 } },  // Row 4: F4:M4
      { s: { r: 4, c: 5 }, e: { r: 4, c: 12 } },  // Row 5: F5:M5
      { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } },  // Row 7: J7:K7 (MÔN THI header)
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // A: STT
      { wch: 12 },  // B: SỐ PHÁCH
      { wch: 15 },  // C: SỐ CMT
      { wch: 18 },  // D: HỌ
      { wch: 10 },  // E: TÊN
      { wch: 12 },  // F: NGÀY SINH
      { wch: 28 },  // G: NƠI SINH
      { wch: 10 },  // H: GIỚI TÍNH
      { wch: 10 },  // I: DÂN TỘC
      { wch: 5 },   // J: LT
      { wch: 5 },   // K: TH
      { wch: 12 },  // L: KÝ TÊN
      { wch: 12 },  // M: GHI CHÚ
    ];

    // Row heights với chiều cao tối ưu
    ws['!rows'] = [
      { hpt: 25 },  // Row 1 - Title
      { hpt: 22 },  // Row 2 - Subtitle
      { hpt: 32 },  // Row 3 - Main title (taller)
      { hpt: 20 },  // Row 4 - Date
      { hpt: 20 },  // Row 5 - Location
      { hpt: 10 },  // Row 6 - Empty spacer
      { hpt: 35 },  // Row 7 - Header (taller for wrap text)
      { hpt: 25 },  // Row 8 - Sub-header
    ];

    // Set default row height for data rows
    for (let i = 9; i <= lastRow; i++) {
      ws['!rows'][i - 1] = { hpt: 20 };
    }

    // NO AutoFilter - removed to hide dropdown arrows

    // Freeze panes - freeze header rows
    ws['!freeze'] = { xSplit: 0, ySplit: 8, topLeftCell: 'A9', activePane: 'bottomLeft', state: 'frozen' };

    // Print settings
    ws['!margins'] = {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    };

    // Page setup
    ws['!pageSetup'] = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalDpi: 600,
      verticalDpi: 600
    };

    // Print titles (repeat header rows)
    ws['!printTitles'] = {
      rows: '1:8'
    };

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách dự thi');

    const today = new Date();
    const safeExamName = (selectedExamForList?.exam_name || 'exam').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    XLSX.writeFile(wb, `DSDUTHI_${safeExamName}_${today.toISOString().split('T')[0]}.xlsx`);
    success('Xuất Excel thành công!');
  };

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Page Header */}
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 12, color: '#1e293b' }}>
            <Calendar size={32} className="text-blue-600" /> Quản lý Lịch thi
          </h1>
          <p style={{ color: '#64748b', marginTop: 4, marginLeft: 44 }}>Tạo, quản lý và theo dõi các kỳ thi của trung tâm</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button onClick={handleOpenConflicts} variant="outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} /> Kiểm tra trùng đăng ký
          </Button>
          <Button onClick={handleCreate} className="admin-btn admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={18} /> Tạo Lịch Thi Mới
          </Button>
        </div>
      </div>

      {/* Unified Main Content Card */}
      <div className="admin-card" style={{ marginTop: 20, padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>

        {/* 1. Stats Section */}
        <div className="admin-stats-unified">
          <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => setFilter('all')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{exams.length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Tổng số kỳ thi</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => setFilter('upcoming')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{exams.filter(e => {
                const examDate = new Date(e.exam_date);
                examDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return examDate.getTime() >= today.getTime();
              }).length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sắp diễn ra</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }} onClick={() => setFilter('past')}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{exams.filter(e => {
                const examDate = new Date(e.exam_date);
                examDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return examDate.getTime() < today.getTime();
              }).length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Đã kết thúc</div></div>
            </div>
          </div>
        </div>

        {/* 2. Toolbar */}
        <div className="admin-toolbar-unified">
          <div style={{ flex: 1, minWidth: 300, display: 'flex', gap: 12, background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
            <Search size={20} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, địa điểm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {['upcoming', 'past', 'all'].map(filterName => (
              <button
                key={filterName}
                onClick={() => setFilter(filterName)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === filterName
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'bg-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {filterName === 'upcoming' && 'Sắp tới'}
                {filterName === 'past' && 'Đã qua'}
                {filterName === 'all' && 'Tất cả'}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Content */}
        <div style={{ padding: 32, background: '#fcfcfc' }}>
          {loading ? (
            <div className="admin-loading" style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><LoadingSpinner /></div>
          ) : filteredExams.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}><Calendar size={48} style={{ marginBottom: 16 }} /><p>Không tìm thấy lịch thi nào.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const status = getStatusProps(exam.exam_date);
                const dateObj = new Date(exam.exam_date);

                return (
                  <div key={exam.id} className="group relative bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
                    {/* Decorative Top Line */}
                    <div className={`h-1.5 w-full ${status.color.includes('green') ? 'bg-green-500' : status.color.includes('blue') ? 'bg-blue-500' : 'bg-slate-400'}`}></div>

                    <div className="p-6 flex-grow flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-3xl font-bold text-slate-800 tracking-tight">{dateObj.getDate().toString().padStart(2, '0')}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tháng {dateObj.getMonth() + 1}</span>
                        </div>
                        <Badge variant={status.variant} className={`${status.color} px-3 py-1 rounded-full text-xs font-bold shadow-sm`}>{status.label}</Badge>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight" title={exam.exam_name}>
                          {exam.exam_name}
                        </h3>
                        {exam.exam_type && (
                          <Badge variant="outline" className="mt-1.5 text-xs font-semibold text-indigo-600 border-indigo-200 bg-indigo-50">
                            {exam.exam_type}
                          </Badge>
                        )}
                        <div className="mt-3 space-y-2.5">
                          <div className="flex items-center gap-2.5 text-sm text-slate-600">
                            <Clock size={16} className="text-slate-400 shrink-0" />
                            <span>{formatTime(dateObj)} <span className="text-slate-400 mx-1">•</span> {exam.duration_minutes} phút</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-sm text-slate-600">
                            <MapPin size={16} className="text-slate-400 shrink-0" />
                            <span className="line-clamp-1">{exam.location || 'Chưa cập nhật địa điểm'}</span>
                          </div>
                          {exam.notes && (
                            <div className="flex items-center gap-2.5 text-sm text-slate-500 italic">
                              <Info size={16} className="text-slate-300 shrink-0" />
                              <span className="line-clamp-1">{exam.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-slate-100 transition-colors">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-white font-medium pl-0"
                        onClick={() => handleViewStudents(exam)}
                      >
                        <Users size={16} className="mr-2" /> Danh sách thi
                      </Button>

                      <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:text-blue-600" onClick={() => handleEdit(exam)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:text-red-500" onClick={() => handleDelete(exam)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Exam Modal */}
      <Dialog open={showModal} onOpenChange={(open) => !submitting && setShowModal(open)}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[600px] rounded-xl" style={{ width: '95%', maxWidth: '600px', borderRadius: '16px', maxHeight: '90vh' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '24px 28px', color: 'white', flexShrink: 0 }}>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              {editingExam ? <Edit size={22} /> : <PlusCircle size={22} />}
              {editingExam ? 'Cập nhật Lịch Thi' : 'Tạo Lịch Thi Mới'}
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1 text-sm">Điền các thông tin chi tiết cho kỳ thi.</DialogDescription>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="space-y-5" style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>
              {/* Tên kỳ thi */}
              <div>
                <Label htmlFor="exam_name" className="text-sm font-medium text-gray-700">Tên kỳ thi <span className="text-red-500">*</span></Label>
                <Input
                  id="exam_name"
                  value={formData.exam_name}
                  onChange={e => setFormData({ ...formData, exam_name: e.target.value })}
                  placeholder="Ví dụ: Thi Tin học Quốc tế đợt 1..."
                  className="mt-1.5"
                  disabled={submitting}
                  autoFocus
                />
              </div>

              {/* Thể loại thi — chỉ chọn từ danh sách do teacher vantrangexam tạo */}
              <div>
                <Label htmlFor="exam_type" className="text-sm font-medium text-gray-700">Thể loại thi</Label>
                <select
                  id="exam_type"
                  value={formData.exam_type}
                  onChange={e => setFormData({ ...formData, exam_type: e.target.value })}
                  disabled={submitting}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <option value="">-- Chọn thể loại thi --</option>
                  {examCategoryOptions.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Ngày thi & Giờ bắt đầu */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exam_date" className="text-sm font-medium text-gray-700">Ngày thi <span className="text-red-500">*</span></Label>
                  <DateInput
                    id="exam_date"
                    value={formData.exam_date}
                    onChange={val => setFormData({ ...formData, exam_date: val })}
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="exam_time" className="text-sm font-medium text-gray-700">Giờ bắt đầu <span className="text-red-500">*</span></Label>
                  <Input
                    id="exam_time"
                    type="time"
                    value={formData.exam_time}
                    onChange={e => setFormData({ ...formData, exam_time: e.target.value })}
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Thời lượng & Địa điểm */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration_minutes" className="text-sm font-medium text-gray-700">Thời lượng (phút)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: e.target.value })}
                    min="15"
                    step="15"
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700">Địa điểm</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Phòng 101, Online..."
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Ghi chú</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Nội dung chi tiết, dặn dò..."
                  rows={3}
                  disabled={submitting}
                  className="mt-1.5 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Zoom Meeting */}
              <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/50 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                  Zoom Meeting (tuỳ chọn)
                </div>
                <div>
                  <Label htmlFor="zoom_link" className="text-sm font-medium text-gray-700">Link tham gia</Label>
                  <Input
                    id="zoom_link"
                    value={formData.zoom_link}
                    onChange={e => setFormData({ ...formData, zoom_link: e.target.value })}
                    placeholder="https://us06web.zoom.us/j/..."
                    className="mt-1.5"
                    disabled={submitting}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="zoom_meeting_id" className="text-sm font-medium text-gray-700">Meeting ID</Label>
                    <Input
                      id="zoom_meeting_id"
                      value={formData.zoom_meeting_id}
                      onChange={e => setFormData({ ...formData, zoom_meeting_id: e.target.value })}
                      placeholder="813 8780 6613"
                      className="mt-1.5"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zoom_passcode" className="text-sm font-medium text-gray-700">Passcode</Label>
                    <Input
                      id="zoom_passcode"
                      value={formData.zoom_passcode}
                      onChange={e => setFormData({ ...formData, zoom_passcode: e.target.value })}
                      placeholder="767013"
                      className="mt-1.5"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t mt-4" style={{ flexShrink: 0, padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>Hủy</Button>
              </DialogClose>
              <Button type="submit" disabled={submitting} className="min-w-[120px]">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Đang lưu...
                  </span>
                ) : (
                  editingExam ? 'Lưu thay đổi' : 'Tạo lịch thi'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student List Modal */}
      <Dialog open={showStudentsModal} onOpenChange={setShowStudentsModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[1000px] h-[90vh] max-h-[800px] rounded-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Users size={22} /> Danh sách thí sinh
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-1">
              Kỳ thi: <span className="font-semibold text-white">{selectedExamForList?.exam_name}</span>
            </DialogDescription>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-white">
            <button
              onClick={() => setStudentTab('approved')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${studentTab === 'approved'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <CheckCircle size={18} />
              Đã duyệt ({studentList.length})
            </button>
            <button
              onClick={() => setStudentTab('pending')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${studentTab === 'pending'
                ? 'border-orange-500 text-orange-600 bg-orange-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Clock size={18} />
              Chờ duyệt ({pendingStudents.length})
              {pendingStudents.length > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{pendingStudents.length}</span>
              )}
            </button>
          </div>

          {/* Toolbar */}
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-gray-600">
              {studentTab === 'approved' ? (
                <span>Hiển thị <strong>{studentList.length}</strong> thí sinh đã được duyệt</span>
              ) : (
                <span>Có <strong>{pendingStudents.length}</strong> thí sinh đang chờ duyệt</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={openAddStudentsModal}
                variant="outline"
                size="sm"
                disabled={!selectedExamForList?.id}
              >
                <PlusCircle size={16} className="mr-1" />
                Thêm thí sinh
              </Button>
              {studentTab === 'pending' && pendingStudents.length > 0 && (
                <Button
                  onClick={handleApproveAll}
                  size="sm"
                  disabled={approving === 'all'}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {approving === 'all' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Đang duyệt...
                    </span>
                  ) : (
                    <>
                      <CheckCheck size={16} className="mr-1" />
                      Duyệt tất cả
                    </>
                  )}
                </Button>
              )}
              {studentTab === 'approved' && (
                <Button onClick={exportStudentListToExcel} variant="outline" size="sm" disabled={studentList.length === 0}>
                  <Download size={16} className="mr-1" />
                  Xuất Excel
                </Button>
              )}
            </div>
          </div>

          {/* Content - scrollable */}
          <div className="overflow-y-auto p-5 bg-gray-50" style={{ maxHeight: '50vh' }}>
            {studentListLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : studentTab === 'approved' ? (
              /* Approved Students */
              studentList.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle size={48} className="text-gray-300" />}
                  title="Chưa có thí sinh được duyệt"
                  message="Các thí sinh sau khi được duyệt sẽ hiển thị ở đây."
                />
              ) : (
                <div className="grid gap-3">
                  {studentList.map((student) => (
                    <div key={student.student_id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {student.image_3x4 ? (
                          <img
                            src={student.image_3x4}
                            alt={student.ho_ten_full}
                            className="w-16 h-20 object-cover rounded-lg border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center border-2 border-gray-200">
                            <User size={28} className="text-blue-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 truncate">{student.ho_ten_full}</h4>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Đã duyệt</Badge>
                          {conflictStudentIds.has(Number(student.student_id)) && (
                            <Badge
                              variant="destructive"
                              className="text-xs cursor-pointer"
                              onClick={() => handleViewDuplicateHistory(student)}
                            >
                              Trùng đăng ký
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.cccd}>
                            <Info size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.cccd || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.sdt}>
                            <Phone size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.sdt || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                            <span>{formatDateVN(student.ngay_sinh) || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.email}>
                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.email || '---'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveStudent(student)}
                        >
                          <UserX size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Pending Students */
              pendingStudents.length === 0 ? (
                <EmptyState
                  icon={<Clock size={48} className="text-gray-300" />}
                  title="Không có thí sinh chờ duyệt"
                  message="Tất cả thí sinh đã được xử lý."
                />
              ) : (
                <div className="grid gap-3">
                  {pendingStudents.map((student) => (
                    <div key={student.student_id} className="bg-white border-2 border-orange-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {student.image_3x4 ? (
                          <img
                            src={student.image_3x4}
                            alt={student.ho_ten_full}
                            className="w-16 h-20 object-cover rounded-lg border-2 border-orange-200"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center border-2 border-orange-200">
                            <User size={28} className="text-orange-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-800 truncate">{student.ho_ten_full}</h4>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Chờ duyệt</Badge>
                          {conflictStudentIds.has(Number(student.student_id)) && (
                            <Badge
                              variant="destructive"
                              className="text-xs cursor-pointer"
                              onClick={() => handleViewDuplicateHistory(student)}
                            >
                              Trùng đăng ký
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.cccd}>
                            <Info size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.cccd || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.sdt}>
                            <Phone size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.sdt || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                            <span>{formatDateVN(student.ngay_sinh) || '---'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600" title={student.email}>
                            <Mail size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{student.email || '---'}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Đăng ký: {student.registration_date ? new Date(student.registration_date).toLocaleString('vi-VN') : '---'}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproveStudent(student)}
                          disabled={approving === student.student_id}
                        >
                          {approving === student.student_id ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : (
                            <>
                              <CheckCircle size={16} className="mr-1" />
                              Duyệt
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 border-red-300 hover:bg-red-50"
                          onClick={() => handleRejectStudent(student)}
                          disabled={approving === student.student_id}
                        >
                          <XCircle size={16} className="mr-1" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
      />

      <Dialog open={showConflictsModal} onOpenChange={setShowConflictsModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[900px] h-[80vh] rounded-xl">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Info size={20} /> Sinh viên trùng đăng ký
            </DialogTitle>
            <DialogDescription className="text-slate-200 mt-1">
              Danh sách sinh viên đang có nhiều hơn 1 đăng ký thi ở trạng thái đang giữ chỗ.
            </DialogDescription>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {conflictsLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : conflicts.length === 0 ? (
              <EmptyState
                icon={<Info size={48} className="text-gray-300" />}
                title="Không có dữ liệu trùng"
                message="Hiện tại không phát hiện sinh viên nào đăng ký trùng."
              />
            ) : (
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <div key={c.student_id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{c.ho_ten_full}</div>
                        <div className="text-sm text-slate-500">CCCD: {c.cccd || '---'}</div>
                      </div>
                      <Badge variant="destructive" className="rounded-full">
                        {c.active_registrations?.length || 0} đăng ký
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {(c.active_registrations || []).map((r, idx) => (
                        <div key={`${c.student_id}-${r.exam_id}-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <div className="font-medium text-slate-800">
                            {r.exam_name || `Kỳ thi #${r.exam_id}`}
                          </div>
                          <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span>ID: {r.exam_id}</span>
                            <span>Trạng thái: {r.registration_status}</span>
                            <span>Ngày thi: {r.exam_date ? new Date(r.exam_date).toLocaleString('vi-VN') : '---'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[900px] h-[75vh] rounded-xl">
          <div className="bg-gradient-to-r from-rose-600 to-rose-800 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold text-white">
              Lịch sử đăng ký
            </DialogTitle>
            <DialogDescription className="text-rose-100 mt-1">
              {historyStudent?.ho_ten_full ? `${historyStudent.ho_ten_full}` : '---'}
              {historyStudent?.cccd ? ` • CCCD: ${historyStudent.cccd}` : ''}
            </DialogDescription>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {historyLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : historyRows.length === 0 ? (
              <EmptyState
                icon={<Info size={48} className="text-gray-300" />}
                title="Không có lịch sử"
                message="Không tìm thấy đăng ký nào."
              />
            ) : (
              <div className="space-y-3">
                {historyRows.map((r) => (
                  <div key={r.registration_id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {r.class_name || '---'}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {r.exam_name || `Kỳ thi #${r.exam_id}`}
                        </div>
                      </div>
                      <Badge variant="destructive" className="rounded-full">
                        {r.registration_status || '---'}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      <span>Ngày thi: {r.exam_date ? new Date(r.exam_date).toLocaleString('vi-VN') : '---'}</span>
                      <span>Đăng ký lúc: {r.registration_created_at ? new Date(r.registration_created_at).toLocaleString('vi-VN') : '---'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddStudentsModal} onOpenChange={setShowAddStudentsModal}>
        <DialogContent className="fixed left-[50%] top-[50%] z-50 flex flex-col w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 p-0 overflow-hidden sm:max-w-[900px] h-[75vh] rounded-xl">
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5 text-white">
            <DialogTitle className="text-lg font-bold text-white">
              Thêm thí sinh
            </DialogTitle>
            <DialogDescription className="text-slate-200 mt-1">
              Tìm theo tên / CCCD / SĐT để chọn học viên và thêm vào kỳ thi.
            </DialogDescription>
          </div>

          <div className="p-5 bg-gray-50 border-b">
            <div className="flex gap-2">
              <Input
                value={addStudentsQuery}
                onChange={(e) => setAddStudentsQuery(e.target.value)}
                placeholder="Nhập tên, CCCD hoặc SĐT..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchAddStudents();
                }}
              />
              <Button onClick={handleSearchAddStudents} disabled={addStudentsLoading}>
                {addStudentsLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Search size={16} className="mr-1" />
                    Tìm
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto p-5 bg-gray-50 flex-1">
            {addStudentsLoading ? (
              <div className="flex justify-center py-20"><LoadingSpinner /></div>
            ) : addStudentsResults.length === 0 ? (
              <EmptyState
                icon={<Users size={48} className="text-gray-300" />}
                title="Chưa có kết quả"
                message="Nhập từ khóa và bấm Tìm để chọn học viên."
              />
            ) : (
              <div className="space-y-2">
                {addStudentsResults.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSelectAddStudent(s.id)}
                    className={`w-full text-left bg-white border rounded-xl p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow ${selectedAddStudentIds.has(s.id) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{s.ho_ten_full}</div>
                      <div className="text-sm text-slate-500 truncate">CCCD: {s.cccd || '---'} • SĐT: {s.sdt || '---'}</div>
                    </div>
                    <Badge variant={selectedAddStudentIds.has(s.id) ? 'default' : 'outline'}>
                      {selectedAddStudentIds.has(s.id) ? 'Đã chọn' : 'Chọn'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-4 bg-gray-100 border-t flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={addingStudents}>Đóng</Button>
            </DialogClose>
            <Button
              onClick={() => handleAddSelectedStudents(false)}
              disabled={addingStudents}
              className="min-w-[140px]"
            >
              {addingStudents ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Đang thêm...
                </span>
              ) : (
                'Thêm vào kỳ thi'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}