import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import type { StudentExamCardVM } from './student-types';
import {
  getResponseList,
  resolveStudentCccd,
  startOfDay,
} from './student-utils';
import { loadStudentData } from '../../utils/studentDataLoader';

function sortByDateAsc<T>(items: T[], getValue: (item: T) => string | Date) {
  return [...items].sort((a, b) => new Date(getValue(a)).getTime() - new Date(getValue(b)).getTime());
}

export function useStudentExams(studentData: any) {
  const [exams, setExams] = useState<StudentExamCardVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getStudentExams();
      const items = sortByDateAsc(getResponseList(response), (item) => item.exam_date || new Date()).map((item: any) => {
        const status = item.registration_status || 'available';
        const mode = item.zoom_link || item.zoom_meeting_id ? 'online' : 'offline';
        return {
          id: item.id,
          title: item.exam_name || 'Kỳ thi',
          subtitle: item.class_name || '',
          examDate: item.exam_date,
          location: item.location || (mode === 'online' ? 'Online' : 'Chưa cập nhật'),
          durationMinutes: item.duration_minutes == null || item.duration_minutes === ''
            ? null
            : Number(item.duration_minutes),
          examType: item.exam_type || '',
          mode,
          status,
          note: item.notes || '',
          zoomLink: item.zoom_link || null,
          zoomLinkBackup: item.zoom_link_backup || null,
          className: item.class_name || '',
          hasTimeConflict: Boolean(item.has_time_conflict),
          conflictingExamId: item.conflicting_exam_id ?? null,
          conflictingExamName: item.conflicting_exam_name ?? null,
          conflictingExamDate: item.conflicting_exam_date ?? null,
          conflictMessage: item.conflict_message ?? null,
          raw: item,
        } as StudentExamCardVM;
      });
      setExams(items);
    } catch (loadError: any) {
      setExams([]);
      setError(loadError?.message || 'Không thể tải lịch thi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, studentData?.cccd]);

  const runAction = useCallback(async (examId: number | string, action: 'register' | 'cancel') => {
    setActionLoading(examId);
    try {
      if (action === 'register') {
        await api.registerExam(examId);
      } else {
        await api.cancelExam(examId);
      }
      await load();
      const cccd = resolveStudentCccd(studentData);
      if (cccd) {
        await loadStudentData(cccd);
      }
    } finally {
      setActionLoading(null);
    }
  }, [load, studentData]);

  const today = startOfDay(new Date()).getTime();
  const filtered = useMemo(() => exams.filter((exam) => {
    const examTime = startOfDay(exam.examDate).getTime();
    const isPast = examTime < today;
    const isRegistered = ['pending', 'approved', 'registered'].includes(exam.status);

    switch (activeFilter) {
      case 'upcoming':
        return !isPast;
      case 'registered':
        return isRegistered;
      case 'online':
        return exam.mode === 'online';
      case 'offline':
        return exam.mode === 'offline';
      default:
        return true;
    }
  }), [activeFilter, exams, today]);

  const sections = useMemo(() => ({
    upcoming: filtered.filter((exam) => startOfDay(exam.examDate).getTime() >= today),
    registered: filtered.filter((exam) => ['pending', 'approved', 'registered'].includes(exam.status)),
    past: filtered.filter((exam) => startOfDay(exam.examDate).getTime() < today),
  }), [filtered, today]);

  return {
    exams,
    filtered,
    sections,
    filters: [
      { id: 'all', label: 'Tất cả', count: exams.length },
      { id: 'upcoming', label: 'Sắp thi', count: exams.filter((exam) => startOfDay(exam.examDate).getTime() >= today).length },
      { id: 'registered', label: 'Đã đăng ký', count: exams.filter((exam) => ['pending', 'approved', 'registered'].includes(exam.status)).length },
      { id: 'online', label: 'Online' },
      { id: 'offline', label: 'Offline' },
    ],
    activeFilter,
    setActiveFilter,
    loading,
    error,
    actionLoading,
    refetch: load,
    registerExam: (examId: number | string) => runAction(examId, 'register'),
    cancelExam: (examId: number | string) => runAction(examId, 'cancel'),
  };
}
