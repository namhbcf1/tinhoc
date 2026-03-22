import { formatCurrency } from '../../utils/formatters';
import { formatDateVN, formatTime } from '../../utils/dateUtils';
import { getStorageValue } from '../../utils/browser-storage.js';

const STUDY_KEYWORDS = /(vstep|toeic|ielts|mos|ic3|topik|luyện thi|on thi)/i;

export function resolveStudentCccd(studentData: any) {
  return (
    studentData?.cccd ||
    getStorageValue('student_cccd') ||
    getStorageValue('studentCCCD') ||
    ''
  );
}

export function toArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

export function getResponseList<T = any>(response: any, nestedKey?: string): T[] {
  if (Array.isArray(response)) return response as T[];
  if (Array.isArray(response?.data)) return response.data as T[];
  if (nestedKey && Array.isArray(response?.data?.[nestedKey])) return response.data[nestedKey] as T[];
  if (nestedKey && Array.isArray(response?.[nestedKey])) return response[nestedKey] as T[];
  return [];
}

export function startOfDay(value: Date | string | number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: Date | string | number, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function getStartOfWeek(value = new Date()) {
  const date = new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function isSameDay(a: Date | string | number, b: Date | string | number) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isDateBetween(target: Date, start?: string | null, end?: string | null) {
  const targetDay = startOfDay(target).getTime();
  const min = start ? startOfDay(start).getTime() : Number.NEGATIVE_INFINITY;
  const max = end ? startOfDay(end).getTime() : Number.POSITIVE_INFINITY;
  return targetDay >= min && targetDay <= max;
}

export function parseScheduleDays(scheduleRule?: string | null) {
  if (!scheduleRule) return [];
  if (scheduleRule === 'DAILY') return [0, 1, 2, 3, 4, 5, 6];
  if (!scheduleRule.includes(':')) return [];
  const [, days] = scheduleRule.split(':');
  return days
    .split(',')
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => !Number.isNaN(item));
}

export function formatScheduleSummary(scheduleRule?: string | null, scheduleTime?: string | null) {
  const timeLabel = scheduleTime || 'Theo lịch trung tâm';
  const days = parseScheduleDays(scheduleRule);
  if (!days.length) return timeLabel;

  const labels = days.map((day) => {
    const mapping = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
    return mapping[day] || `Th ${day}`;
  });
  return `${labels.join(', ')} · ${timeLabel}`;
}

export function getDayLabel(date: Date) {
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
}

export function getRelativeExamLabel(dateLike: string) {
  const today = startOfDay(new Date()).getTime();
  const examDate = startOfDay(dateLike).getTime();
  const diffDays = Math.round((examDate - today) / 86400000);

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Ngày mai';
  if (diffDays > 1) return `${diffDays} ngày nữa`;
  if (diffDays === -1) return 'Hôm qua';
  return 'Đã qua';
}

export function isStudyRelated(text?: string | null) {
  return STUDY_KEYWORDS.test(text || '');
}

export function formatMoney(value?: number | null) {
  return formatCurrency(Number(value || 0));
}

export function formatShortDate(value?: string | null) {
  return value ? formatDateVN(value, true) : 'Chưa cập nhật';
}

export function formatShortTime(value?: string | null) {
  return value ? formatTime(value) : 'Chưa cập nhật';
}

export function derivePaymentState(input: {
  latestStatus?: string | null;
  fallbackStatus?: string | null;
  dueDate?: string | null;
}) {
  if (input.latestStatus === 'confirmed' || input.fallbackStatus === 'confirmed' || input.fallbackStatus === 'paid') {
    return { state: 'paid' as const, label: 'Đã thanh toán' };
  }
  if (input.latestStatus === 'pending') {
    return { state: 'pending_review' as const, label: 'Đang chờ xác nhận' };
  }

  if (input.dueDate) {
    const isOverdue = startOfDay(input.dueDate).getTime() < startOfDay(new Date()).getTime();
    if (isOverdue) {
      return { state: 'overdue' as const, label: 'Quá hạn' };
    }
  }

  return { state: 'due' as const, label: 'Đến hạn' };
}
