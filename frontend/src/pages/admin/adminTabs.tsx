import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileBox,
  FileText,
  History,
  Home,
  LayoutDashboard,
  Newspaper,
  Shield,
  UserCircle,
  Users,
} from 'lucide-react';

export type AdminTabId =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'payments'
  | 'exam-schedules'
  | 'program-platform'
  | 'documents'
  | 'assignments'
  | 'posts'
  | 'homepage'
  | 'admins'
  | 'backup'
  | 'logs'
  | 'profile'
  | 'my-classes'
  | 'my-schedule'
  | 'my-exams'
  | 'attendance';

export type AdminTabGroup = 'overview' | 'teaching' | 'learning' | 'finance' | 'content' | 'system';

export interface AdminTabDefinition {
  id: AdminTabId;
  label: string;
  title: string;
  icon: LucideIcon;
  group: AdminTabGroup;
  desktop: boolean;
  mobile: boolean;
  mobileBottom?: boolean;
  superAdminOnly?: boolean;
  teacherOnly?: boolean;
}

export const ADMIN_TAB_GROUP_LABELS: Record<AdminTabGroup, string> = {
  overview: 'Tổng quan',
  teaching: 'Giảng dạy',
  learning: 'Quản lý học tập',
  finance: 'Tài chính',
  content: 'Nội dung',
  system: 'Hệ thống',
};

export const ADMIN_TABS: AdminTabDefinition[] = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    title: 'Tổng quan hệ thống',
    icon: LayoutDashboard,
    group: 'overview',
    desktop: false,
    mobile: false,
    mobileBottom: false,
  },
  // ========================================
  // TEACHING GROUP — chỉ hiển thị cho admin có teacher_code
  // ========================================
  {
    id: 'my-classes',
    label: 'Lớp của tôi',
    title: 'Lớp học được phân công',
    icon: BookOpen,
    group: 'teaching',
    desktop: true,
    mobile: true,
    teacherOnly: true,
  },
  {
    id: 'my-schedule',
    label: 'Lịch dạy',
    title: 'Lịch dạy trong tuần',
    icon: Calendar,
    group: 'teaching',
    desktop: true,
    mobile: true,
    teacherOnly: true,
  },
  {
    id: 'my-exams',
    label: 'Lịch thi',
    title: 'Lịch thi của tôi',
    icon: CalendarCheck,
    group: 'teaching',
    desktop: true,
    mobile: true,
    teacherOnly: true,
  },
  {
    id: 'attendance',
    label: 'Điểm danh',
    title: 'Điểm danh lớp học',
    icon: ClipboardCheck,
    group: 'teaching',
    desktop: true,
    mobile: true,
    teacherOnly: true,
  },
  // ========================================
  // LEARNING GROUP
  // ========================================
  {
    id: 'classes',
    label: 'Lớp học',
    title: 'Quản lý lớp học',
    icon: BookOpen,
    group: 'learning',
    desktop: false,
    mobile: false,
  },
  {
    id: 'exam-schedules',
    label: 'Lịch thi',
    title: 'Quản lý lịch thi',
    icon: FileText,
    group: 'learning',
    desktop: true,
    mobile: true,
    mobileBottom: true,
  },
  {
    id: 'program-platform',
    label: 'Chương trình tổng',
    title: 'Nền tảng chương trình dùng chung',
    icon: Database,
    group: 'learning',
    desktop: true,
    mobile: false,
  },
  {
    id: 'students',
    label: 'Học viên',
    title: 'Quản lý học viên',
    icon: Users,
    group: 'learning',
    desktop: true,
    mobile: true,
    mobileBottom: true,
  },
  {
    id: 'payments',
    label: 'Học phí',
    title: 'Quản lý học phí',
    icon: CreditCard,
    group: 'finance',
    desktop: true,
    mobile: true,
    mobileBottom: true,
  },
  {
    id: 'posts',
    label: 'Bài viết',
    title: 'Quản lý bài viết',
    icon: Newspaper,
    group: 'content',
    desktop: true,
    mobile: true,
  },
  {
    id: 'homepage',
    label: 'Trang chủ',
    title: 'Quản lý trang chủ',
    icon: Home,
    group: 'content',
    desktop: true,
    mobile: true,
  },
  {
    id: 'documents',
    label: 'Tài liệu',
    title: 'Quản lý tài liệu',
    icon: FileBox,
    group: 'content',
    desktop: false,
    mobile: false,
  },
  {
    id: 'assignments',
    label: 'Bài tập',
    title: 'Quản lý bài tập',
    icon: ClipboardList,
    group: 'learning',
    desktop: false,
    mobile: false,
  },
  {
    id: 'admins',
    label: 'Quản lý admin',
    title: 'Quản lý tài khoản admin',
    icon: Shield,
    group: 'system',
    desktop: true,
    mobile: true,
    superAdminOnly: true,
  },
  {
    id: 'backup',
    label: 'Sao lưu',
    title: 'Sao lưu và khôi phục',
    icon: Database,
    group: 'system',
    desktop: true,
    mobile: true,
    superAdminOnly: true,
  },
  {
    id: 'logs',
    label: 'Nhật ký',
    title: 'Nhật ký hoạt động',
    icon: History,
    group: 'system',
    desktop: false,
    mobile: false,
  },
  {
    id: 'profile',
    label: 'Cá nhân',
    title: 'Hồ sơ cá nhân',
    icon: UserCircle,
    group: 'system',
    desktop: true,
    mobile: true,
  },
];

export function isAdminTabVisible(
  tab: AdminTabDefinition,
  role?: string,
  target: 'desktop' | 'mobile' = 'desktop',
  adminData?: { teacher_code?: string } | null
) {
  if (tab.superAdminOnly && role !== 'super_admin') {
    return false;
  }

  // teacherOnly tabs only visible for admins with teacher_code
  if (tab.teacherOnly) {
    const hasTeacherCode = Boolean(adminData?.teacher_code);
    if (!hasTeacherCode) {
      return false;
    }
  }

  return target === 'mobile' ? tab.mobile : tab.desktop;
}

export function getAdminTabsForTarget(
  role: string | undefined,
  target: 'desktop' | 'mobile',
  adminData?: { teacher_code?: string } | null
) {
  return ADMIN_TABS.filter((tab) => isAdminTabVisible(tab, role, target, adminData));
}

export function getAdminBottomTabs(role?: string, adminData?: { teacher_code?: string } | null) {
  const order: AdminTabId[] = ['exam-schedules', 'students', 'payments'];
  return order
    .map((id) => ADMIN_TABS.find((tab) => tab.id === id))
    .filter((tab): tab is AdminTabDefinition => Boolean(tab && tab.mobileBottom && isAdminTabVisible(tab, role, 'mobile', adminData)));
}

export function getAdminTabById(id: string | null | undefined) {
  return ADMIN_TABS.find((tab) => tab.id === id);
}
