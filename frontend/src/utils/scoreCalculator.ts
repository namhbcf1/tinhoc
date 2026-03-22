/**
 * Score calculation utilities for VSTEP exam results.
 * Ported from vantrangexam/src/utils/scoreCalculator.ts
 */

export const calculateGrade = (score) => {
  if (score >= 8.5) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5.5) return 'C';
  return 'D';
};

export const getGradeDescription = (grade) => {
  switch (grade) {
    case 'A': return 'Xuat sac (8.5-10)';
    case 'B': return 'Kha (7-8.4)';
    case 'C': return 'Trung binh (5.5-6.9)';
    case 'D': return 'Yeu (< 5.5)';
    default: return 'Chua xep loai';
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

export const getGradeColor = (grade) => {
  switch (grade) {
    case 'A': return 'text-green-600 bg-green-50';
    case 'B': return 'text-blue-600 bg-blue-50';
    case 'C': return 'text-yellow-600 bg-yellow-50';
    default: return 'text-red-600 bg-red-50';
  }
};

export const calculatePercentage = (score, maxScore = 10) => {
  return (score / maxScore) * 100;
};

/**
 * Compare current scores against previous attempt.
 * @param {Object} current - ScoreData { totalScore, listeningScore, readingScore, writingScore, speakingScore }
 * @param {Object} previous - ScoreData same shape
 */
export const compareScores = (current, previous) => {
  const diff = (cur, prev) => {
    const change = cur - prev;
    return {
      change: Math.abs(change),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
    };
  };
  return {
    total: diff(current.totalScore, previous.totalScore),
    listening: diff(current.listeningScore, previous.listeningScore),
    reading: diff(current.readingScore, previous.readingScore),
    writing: diff(current.writingScore, previous.writingScore),
    speaking: diff(current.speakingScore, previous.speakingScore),
  };
};

export const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A';
  const minutes = Math.floor((new Date(endTime) - new Date(startTime)) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours} gio ${mins} phut`;
  return `${mins} phut`;
};

export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};
