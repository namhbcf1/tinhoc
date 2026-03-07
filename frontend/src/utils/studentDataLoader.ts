import api from '../services/api';

export const loadStudentData = async (cccd) => {
  try {
    const studentResponse = await api.getStudentByCCCD(cccd);
    if (!studentResponse.success || !studentResponse.data) {
      return null;
    }

    // Also fetch online class enrollments
    let onlineEnrolled = [];
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || ''}/online-classes?status=active`, {
        headers: cccd ? { 'X-Student-CCCD': cccd } : {}
      });
      const data = await resp.json().catch(() => null);
      if (data?.success) {
        const all = data.data?.classes || [];
        onlineEnrolled = (Array.isArray(all) ? all : []).filter(c => c.is_enrolled);
      }
    } catch (e) {
      console.warn('Failed to load online enrollments:', e);
    }

    const merged = { ...studentResponse.data, online_enrollments: onlineEnrolled };
    localStorage.setItem('student_data', JSON.stringify(merged));
    return merged;
  } catch (error) {
    console.error('Error loading student data:', error);
    return null;
  }
};

export const getActiveTabFromPath = (pathname) => {
  if (pathname.includes('/my-classes')) return 'my-classes';
  if (pathname.includes('/register-class')) return 'register-class';
  if (pathname.includes('/payment')) return 'payment';
  if (pathname.includes('/certificates')) return 'certificates';
  if (pathname.includes('/documents')) return 'documents';
  if (pathname.includes('/schedule')) return 'schedule';
  if (pathname.includes('/exams')) return 'exams';
  if (pathname.includes('/messages')) return 'messages';
  if (pathname.includes('/attendance')) return 'attendance';
  if (pathname.includes('/profile') || pathname.includes('/personal-info')) return 'profile';
  if (pathname.includes('/classes') || pathname.includes('/online-classes')) return 'my-classes';
  return 'dashboard';
};

export const getPathFromTab = (tabId) => {
  const pathMap = {
    'dashboard': '/dashboard',
    'my-classes': '/dashboard/my-classes',
    'register-class': '/dashboard/register-class',
    'payment': '/dashboard/payment',
    'certificates': '/dashboard/certificates',
    'documents': '/dashboard/documents',
    'schedule': '/dashboard/schedule',
    'exams': '/dashboard/exams',
    'messages': '/dashboard/messages',
    'profile': '/dashboard/profile'
  };
  return pathMap[tabId] || '/dashboard';
};









