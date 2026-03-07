/**
 * VSTEP score calculation utilities (ported from vantrangexam/src/utils/scoreCalculator.ts)
 */

export const calculateGrade = (score) => {
  if (score >= 8.5) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5.5) return 'C';
  return 'D';
};

export const getGradeDescription = (grade) => {
  switch (grade) {
    case 'A': return 'Xuất sắc (8.5–10)';
    case 'B': return 'Khá (7–8.4)';
    case 'C': return 'Trung bình (5.5–6.9)';
    case 'D': return 'Yếu (< 5.5)';
    default: return 'Chưa xếp loại';
  }
};

export const getScoreColor = (score) => {
  if (score >= 7) return 'text-green-600';
  if (score >= 5.5) return 'text-yellow-600';
  return 'text-red-600';
};

export const getScoreBgColor = (score) => {
  if (score >= 7) return 'bg-green-50';
  if (score >= 5.5) return 'bg-yellow-50';
  return 'bg-red-50';
};

export const getGradeColorClass = (grade) => {
  switch (grade) {
    case 'A': return 'text-green-600 bg-green-50 border-green-200';
    case 'B': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default: return 'text-red-600 bg-red-50 border-red-200';
  }
};

export const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  const minutes = Math.floor((new Date(endTime) - new Date(startTime)) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours} giờ ${mins} phút`;
  return `${mins} phút`;
};

export const formatDateVN = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};
