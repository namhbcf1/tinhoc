// @ts-nocheck
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

function normalizeZoomLinkPair(item: any) {
  const orderedLinks = [
    item?.zoom_link,
    item?.zoom_link_backup,
    item?.zoom_link_backup_2,
    item?.zoom_link_backup_3,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  const uniqueLinks = Array.from(new Set(orderedLinks));
  return {
    zoomLink: uniqueLinks[0] || null,
    zoomLinkBackup: uniqueLinks[1] || null,
  };
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
        const zoomLinks = normalizeZoomLinkPair(item);
        const mode = zoomLinks.zoomLink || item.zoom_meeting_id ? 'online' : 'offline';
        const googleMapUrl = typeof item.google_map_url === 'string' ? item.google_map_url.trim() : '';
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
          googleMapUrl: googleMapUrl || null,
          mode,
          status,
          note: item.notes || '',
          zoomLink: zoomLinks.zoomLink,
          zoomLinkBackup: zoomLinks.zoomLinkBackup,
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

// ========================================
// useStudentReviews — báo cáo đánh giá học viên
// ========================================

export interface StudentReviewSkillVM {
  id: number;
  skill: 'reading' | 'listening' | 'speaking' | 'writing';
  score_raw: string | null;
  score_num: number | null;
  skill_status: 'good' | 'needs_work' | 'weak' | null;
  comments: string | null;
}

export interface StudentReviewTestScoreVM {
  id: number;
  skill_label: string;
  max_score: number | null;
  student_score: number | null;
  score_notes: string | null;
}

export interface StudentReviewHomeworkVM {
  date: string;
  status: 'du' | 'thieu_video' | 'khong_nop' | 'duoc_nghi';
}

export interface StudentReviewVM {
  id: number;
  online_class_id: number;
  class_name: string;
  class_code: string;
  period_label: string | null;
  report_title: string | null;
  overall_summary: string | null;
  recommendations: string | null;
  homework_tracking: StudentReviewHomeworkVM[];
  skills: StudentReviewSkillVM[];
  test_scores: StudentReviewTestScoreVM[];
  status: 'draft' | 'published';
  updated_at: string;
}

export function useStudentReviews() {
  const [reviews, setReviews] = useState<StudentReviewVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<StudentReviewVM | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await (api as any).getMyReviews();
      const items: StudentReviewVM[] = Array.isArray(response)
        ? response
        : (response?.data ?? []);
      setReviews(items);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải báo cáo học tập');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { reviews, loading, error, selectedReview, setSelectedReview, refetch: load };
}

// ========================================
// useStudentFeedbacks — phản hồi của học viên
// ========================================

export interface StudentFeedbackClassVM {
  online_class_id: number;
  class_name: string;
  schedule_time: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface StudentFeedbackVM {
  id: number;
  online_class_id: number;
  class_name: string;
  schedule_time: string | null;
  start_date: string | null;
  end_date: string | null;
  rating: number;
  title: string;
  content: string;
  sentiment: 'positive' | 'mixed' | 'negative' | null;
  status: 'submitted' | 'approved' | 'rejected';
  teacher_response: string | null;
  review_note_internal: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

export function useStudentFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<StudentFeedbackVM[]>([]);
  const [availableClasses, setAvailableClasses] = useState<StudentFeedbackClassVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await (api as any).getMyStudentFeedbacks();
      const payload = response?.data ?? response ?? {};
      setFeedbacks(Array.isArray(payload?.feedbacks) ? payload.feedbacks : []);
      setAvailableClasses(Array.isArray(payload?.available_classes) ? payload.available_classes : []);
    } catch (err: any) {
      setFeedbacks([]);
      setAvailableClasses([]);
      setError(err?.message || 'Không thể tải phản hồi học viên');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    feedbacks,
    availableClasses,
    loading,
    error,
    refetch: load,
  };
}
