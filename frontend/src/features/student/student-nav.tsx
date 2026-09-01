import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Bell,
  CalendarCheck,
  FileText,
  GraduationCap,
  MessageSquareQuote,
} from 'lucide-react';
import { buildApiUrl } from '../../utils/api-base-url';
import { getStorageValue } from '../../utils/browser-storage';

export const STUDY_PLATFORM_URL = 'https://vantrangexam.pages.dev/#/login';

type OpenStudyPlatformOptions = {
  target?: '_blank' | '_self';
  returnTo?: string;
};

export interface StudentNavItem {
  id: 'exams' | 'attendance' | 'study' | 'reviews' | 'feedback' | 'my-classes' | 'certificates' | 'documents' | 'messages';
  label: string;
  icon: LucideIcon;
  path?: string;
  external?: string;
  /** false = chỉ hiện ở drawer/sidebar, không nhét vào thanh điều hướng dưới */
  primary?: boolean;
}

export const STUDENT_MAIN_MENU: StudentNavItem[] = [
  { id: 'exams',        label: 'Lịch thi',   icon: CalendarCheck,      path: '/dashboard/exams' },
  { id: 'certificates', label: 'Chứng chỉ',  icon: Award,              path: '/dashboard/certificates', primary: false },
  { id: 'documents',    label: 'Tài liệu',   icon: FileText,           path: '/dashboard/documents', primary: false },
  { id: 'messages',     label: 'Thông báo',  icon: Bell,               path: '/dashboard/messages', primary: false },
  { id: 'feedback',     label: 'Phản hồi',   icon: MessageSquareQuote, path: '/dashboard/feedback' },
  { id: 'study',        label: 'Học tập',    icon: GraduationCap,      external: STUDY_PLATFORM_URL },
];

export const STUDENT_PAGE_TITLES: Record<string, string> = {
  exams:        'Lịch thi',
  certificates: 'Chứng chỉ',
  documents:    'Tài liệu',
  messages:     'Thông báo',
  feedback:     'Phản hồi lớp học',
  study:        'Học tập',
  profile:      'Hồ sơ cá nhân',
};

export async function openStudyPlatform(options: OpenStudyPlatformOptions = {}) {
  if (typeof window === 'undefined') return;

  const target = options.target || '_blank';
  const returnTo = options.returnTo || '/#/student-learning';

  const popup = target === '_blank' ? window.open('', '_blank') : null;
  if (popup) {
    try {
      popup.document.title = 'Đang kết nối Vân Trang Exam...';
      popup.document.body.innerHTML = `
        <div style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#fffaf0;font-family:Inter,Arial,sans-serif;color:#102033;">
          <div style="text-align:center;padding:24px;">
            <div style="width:42px;height:42px;margin:0 auto 16px;border:4px solid rgba(212,179,111,0.35);border-top-color:#176f60;border-radius:9999px;animation:vt-spin 1s linear infinite;"></div>
            <div style="font-size:18px;font-weight:700;">Đang mở khu học tập</div>
            <div style="margin-top:8px;font-size:14px;color:#676159;">Vui lòng chờ trong giây lát...</div>
          </div>
        </div>
        <style>@keyframes vt-spin{to{transform:rotate(360deg)}}</style>
      `;
    } catch {
      // Ignore popup document access issues.
    }
  }

  const redirectToStudy = (nextUrl: string) => {
    if (target === '_self') {
      window.location.replace(nextUrl);
      return;
    }

    if (popup) {
      popup.location.replace(nextUrl);
      return;
    }

    window.open(nextUrl, '_blank', 'noopener,noreferrer');
  };

  const studentToken = getStorageValue('student_token');
  if (!studentToken) {
    redirectToStudy(STUDY_PLATFORM_URL);
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
        return_to: returnTo,
      }),
    });

    if (!response.ok) {
      throw new Error('handoff_failed');
    }

    const payload = await response.json();
    redirectToStudy(payload?.redirect_url || STUDY_PLATFORM_URL);
  } catch {
    redirectToStudy(STUDY_PLATFORM_URL);
  }
}
