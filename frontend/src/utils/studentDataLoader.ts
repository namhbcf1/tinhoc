// @ts-nocheck
import api from '../services/api';
import { getStorageScope, setStorageValue } from './browser-storage.js';

export const STUDENT_SESSION_UPDATED_EVENT = 'student-session-updated';

export const persistStudentData = (studentData, cccd = null) => {
  const merged = cccd && !studentData?.cccd
    ? { ...studentData, cccd }
    : studentData;

  setStorageValue(
    'student_data',
    JSON.stringify(merged),
    getStorageScope('student_data') ?? getStorageScope('student_cccd') ?? 'local',
  );

  if (merged?.cccd) {
    const cccdScope = getStorageScope('student_cccd') ?? getStorageScope('studentCCCD') ?? 'local';
    setStorageValue('student_cccd', String(merged.cccd), cccdScope);
    setStorageValue('studentCCCD', String(merged.cccd), cccdScope);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STUDENT_SESSION_UPDATED_EVENT, { detail: merged }));
  }

  return merged;
};

export const loadStudentData = async (cccd) => {
  try {
    const studentResponse = await api.getStudentByCCCD(cccd);
    if (!studentResponse.success || !studentResponse.data) {
      return null;
    }
    return persistStudentData(studentResponse.data, cccd);
  } catch (error) {
    console.error('Error loading student data:', error);
    return null;
  }
};

export const getActiveTabFromPath = (pathname) => {
  if (pathname.includes('/exams')) return 'exams';
  if (pathname.includes('/attendance')) return 'attendance';
  if (pathname.includes('/profile') || pathname.includes('/personal-info')) return 'profile';
  return 'dashboard';
};

export const getPathFromTab = (tabId) => {
  const pathMap = {
    'dashboard': '/dashboard',
    'exams': '/dashboard/exams',
    'attendance': '/dashboard/attendance',
    'profile': '/dashboard/profile'
  };
  return pathMap[tabId] || '/dashboard';
};
