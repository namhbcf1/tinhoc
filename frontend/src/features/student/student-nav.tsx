import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck,
  GraduationCap,
  Video,
} from 'lucide-react';
import { buildApiUrl } from '../../utils/api-base-url';
import { getStorageValue } from '../../utils/browser-storage';

export const STUDY_PLATFORM_URL = 'https://vantrangexam.pages.dev/login#/login';

export interface StudentNavItem {
  id: 'exams' | 'study' | 'classes';
  label: string;
  icon: LucideIcon;
  path?: string;
  external?: string;
}

export const STUDENT_MAIN_MENU: StudentNavItem[] = [
  { id: 'exams',   label: 'Lịch thi',  icon: CalendarCheck, path: '/dashboard/exams' },
  { id: 'classes', label: 'Lớp học',   icon: Video,         path: '/dashboard/classes' },
  { id: 'study',   label: 'Học tập',   icon: GraduationCap, external: STUDY_PLATFORM_URL },
];

export const STUDENT_PAGE_TITLES: Record<string, string> = {
  exams:   'Lịch thi',
  classes: 'Lớp học online',
  study:   'Học tập',
  profile: 'Hồ sơ cá nhân',
};

export async function openStudyPlatform() {
  if (typeof window === 'undefined') return;

  const popup = window.open(STUDY_PLATFORM_URL, '_blank');
  const redirectPopup = (target: string) => {
    if (popup) {
      popup.location.replace(target);
      return;
    }

    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const studentToken = getStorageValue('student_token');
  if (!studentToken) {
    redirectPopup(STUDY_PLATFORM_URL);
    return;
  }

  try {
    const response = await fetch(buildApiUrl('/sso/handoffs'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        target_app: 'exam',
        return_to: '/#/student-learning',
      }),
    });

    if (!response.ok) {
      throw new Error('handoff_failed');
    }

    const payload = await response.json();
    redirectPopup(payload?.redirect_url || STUDY_PLATFORM_URL);
  } catch {
    redirectPopup(STUDY_PLATFORM_URL);
  }
}
