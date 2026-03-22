export type TourContext = 'public' | 'student' | 'admin';
export type TourDevice = 'mobile' | 'desktop';
export type TourPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'center';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
  placement?: TourPlacement;
  autoClickSelector?: string;
  allowMissing?: boolean;
  route?: string;
  ctaLabel?: string;
}

export interface TourScenario {
  id: string;
  version: number;
  context: TourContext;
  device: TourDevice;
  routePrefixes: string[];
  steps: TourStep[];
}

const DENSE_TARGET_STEPS = 100;

const GLOBAL_DETAIL_TOPICS = [
  'Xác định vị trí hiện tại',
  'Đọc tiêu đề màn hình',
  'Nhận biết nút hành động chính',
  'Nhận biết nút hành động phụ',
  'Kiểm tra trạng thái tải dữ liệu',
  'Kiểm tra thông báo lỗi',
  'Kiểm tra thông báo thành công',
  'Đảm bảo thao tác một chạm',
  'Đảm bảo thao tác không thừa',
  'Nhận biết khu vực có thể cuộn',
  'Kiểm tra dữ liệu đầu vào',
  'Xác nhận dữ liệu trước khi gửi',
  'Kiểm tra phản hồi sau thao tác',
  'Đảm bảo dễ quay lại bước trước',
  'Kiểm tra khả năng bỏ qua thao tác',
  'Xác định vị trí hỗ trợ người dùng',
  'Xác định vị trí nút thoát',
  'Đảm bảo không nhầm lẫn điều hướng',
  'Kiểm tra tính nhất quán icon và chữ',
  'Kiểm tra bối cảnh trước khi bấm',
];

const CONTEXT_DETAIL_TOPICS: Record<TourContext, string[]> = {
  public: [
    'Nắm rõ thông tin giới thiệu trước khi đăng ký.',
    'Kiểm tra lại hotline và kênh liên hệ.',
    'Xem các trang chính để hiểu dịch vụ.',
    'Ưu tiên đọc chính sách trước khi gửi thông tin.',
    'Từ trang tin tức có thể quay về trang chủ nhanh.',
    'Người mới nên bắt đầu từ mục đăng ký.',
    'Người đã có tài khoản nên dùng nút đăng nhập.',
    'Khi dùng mobile, nên mở menu trước khi chuyển trang.',
    'Theo dõi tiêu đề trang để tránh mở nhầm mục.',
    'Luôn xác nhận lại biểu mẫu trước khi gửi.',
  ],
  admin: [
    'Theo dõi đúng module để tránh thao tác nhầm dữ liệu.',
    'Kiểm tra quyền trước khi vào tác vụ hệ thống.',
    'Dùng tìm kiếm nhanh khi cần chuyển module lớn.',
    'Sau khi cập nhật dữ liệu, kiểm tra lại danh sách.',
    'Luôn xác nhận cảnh báo trước thao tác xóa/sửa.',
    'Giữ phiên làm việc an toàn và đăng xuất khi xong.',
    'Ưu tiên module có số liệu quan trọng trước.',
    'Khi mobile, dùng drawer và bottom nav phối hợp.',
    'Luôn quan sát trạng thái đồng bộ dữ liệu.',
    'Kiểm tra lại bộ lọc trước khi xuất báo cáo.',
  ],
  student: [
    'Theo dõi đúng tab để không bỏ lỡ lịch học/thi.',
    'Ưu tiên cập nhật hồ sơ trước các thao tác khác.',
    'Sau khi đổi thông tin, kiểm tra dữ liệu đã lưu.',
    'Quan sát thông báo để biết trạng thái yêu cầu.',
    'Khi mobile, dùng menu và bottom nav linh hoạt.',
    'Luôn kiểm tra lại thông tin cá nhân trước khi nộp.',
    'Vào lại mục thi để xác nhận tiến trình hiện tại.',
    'Nếu có lỗi, quay lại bước trước và thử lại.',
    'Giữ tài khoản an toàn khi dùng thiết bị công cộng.',
    'Đăng xuất sau khi hoàn tất phiên làm việc.',
  ],
};

function buildDenseSteps(
  scenarioId: string,
  context: TourContext,
  device: TourDevice,
  baseSteps: TourStep[],
): TourStep[] {
  if (baseSteps.length >= DENSE_TARGET_STEPS) {
    return baseSteps.slice(0, DENSE_TARGET_STEPS);
  }

  const selectorPool = baseSteps
    .map((step) => step.selector)
    .filter((selector): selector is string => Boolean(selector));

  const detailTopics = CONTEXT_DETAIL_TOPICS[context];
  const steps = [...baseSteps];
  let sequence = baseSteps.length + 1;

  while (steps.length < DENSE_TARGET_STEPS) {
    const detailIndex = steps.length - baseSteps.length;
    const globalTopic = GLOBAL_DETAIL_TOPICS[detailIndex % GLOBAL_DETAIL_TOPICS.length];
    const contextTopic = detailTopics[(detailIndex * 3) % detailTopics.length];
    const shouldAnchor = selectorPool.length > 0 && detailIndex % 4 === 0;
    const selector = shouldAnchor ? selectorPool[detailIndex % selectorPool.length] : undefined;

    steps.push({
      id: `${scenarioId}-detail-${sequence}`,
      title: `Bước chi tiết ${sequence}: ${globalTopic}`,
      description: `${contextTopic} (${device === 'mobile' ? 'Mobile' : 'Desktop'})`,
      selector,
      placement: selector ? 'auto' : 'center',
      allowMissing: true,
    });
    sequence += 1;
  }

  return steps;
}

const publicDesktopBaseSteps: TourStep[] = [
  {
    id: 'public-desktop-hotline',
    title: 'Hotline tư vấn',
    description: 'Số hotline luôn hiển thị để người mới liên hệ ngay khi cần.',
    selector: '[data-tour="public-hotline"]',
    placement: 'bottom',
  },
  {
    id: 'public-desktop-language',
    title: 'Chuyển ngôn ngữ',
    description: 'Có thể chuyển nhanh Việt/Anh để đọc nội dung dễ hơn.',
    selector: '[data-tour="public-language"]',
    placement: 'bottom',
  },
  {
    id: 'public-desktop-nav',
    title: 'Thanh điều hướng chính',
    description: 'Mọi khu vực chính của website đều đi qua thanh menu này.',
    selector: '[data-tour="public-desktop-nav"]',
    placement: 'bottom',
  },
  {
    id: 'public-desktop-route-about',
    title: 'Đi tới trang Giới thiệu',
    description: 'Tour sẽ dẫn bạn qua các trang chính để làm quen đầy đủ.',
    route: '/about',
    selector: '[data-tour="public-desktop-nav"]',
    ctaLabel: 'Đi tới About',
    placement: 'bottom',
  },
  {
    id: 'public-desktop-route-training',
    title: 'Đi tới trang Đào tạo',
    description: 'Trang này tập trung thông tin chương trình học và lộ trình.',
    route: '/training',
    selector: '[data-tour="public-desktop-nav"]',
    ctaLabel: 'Đi tới Training',
    placement: 'bottom',
  },
  {
    id: 'public-desktop-route-contact',
    title: 'Đi tới trang Liên hệ',
    description: 'Trang liên hệ là nơi người mới dễ gửi yêu cầu hỗ trợ nhất.',
    route: '/contact',
    selector: '[data-tour="public-hotline"]',
    ctaLabel: 'Đi tới Contact',
    placement: 'bottom',
    allowMissing: true,
  },
  {
    id: 'public-desktop-login',
    title: 'Nút tài khoản (Đăng nhập/Dashboard)',
    description: 'Khi chưa đăng nhập sẽ hiện Đăng nhập, khi đã đăng nhập sẽ hiện Dashboard.',
    selector: '[data-tour="public-login"]',
    placement: 'left',
    allowMissing: true,
  },
  {
    id: 'public-desktop-register',
    title: 'Nút đăng ký',
    description: 'Người dùng mới có thể bắt đầu tại đây.',
    selector: '[data-tour="public-register"]',
    placement: 'left',
    allowMissing: true,
  },
  {
    id: 'public-desktop-logout',
    title: 'Nút đăng xuất',
    description: 'Nếu bạn đã đăng nhập, nút đăng xuất sẽ xuất hiện cạnh Dashboard.',
    selector: '[data-tour="public-logout"]',
    placement: 'left',
    allowMissing: true,
  },
];

const publicMobileBaseSteps: TourStep[] = [
  {
    id: 'public-mobile-hotline',
    title: 'Hotline hỗ trợ',
    description: 'Bấm trực tiếp để gọi ngay trên điện thoại.',
    selector: '[data-tour="public-hotline"]',
    placement: 'bottom',
  },
  {
    id: 'public-mobile-menu-btn',
    title: 'Nút mở menu',
    description: 'Mobile dùng nút này để mở đầy đủ điều hướng.',
    selector: '[data-tour="public-mobile-menu"]',
    placement: 'left',
  },
  {
    id: 'public-mobile-menu-panel',
    title: 'Panel điều hướng',
    description: 'Toàn bộ các trang chính và hành động login/register nằm ở đây.',
    selector: '[data-tour="public-mobile-menu-panel"]',
    autoClickSelector: '[data-tour="public-mobile-menu"]',
    placement: 'top',
  },
  {
    id: 'public-mobile-route-about',
    title: 'Đi tới trang Giới thiệu',
    description: 'Tour sẽ chuyển màn hình để bạn thấy luồng thực tế.',
    route: '/about',
    ctaLabel: 'Đi tới About',
    placement: 'center',
  },
  {
    id: 'public-mobile-route-training',
    title: 'Đi tới trang Đào tạo',
    description: 'Màn hình này giúp người mới hiểu chương trình học.',
    route: '/training',
    ctaLabel: 'Đi tới Training',
    placement: 'center',
  },
  {
    id: 'public-mobile-route-contact',
    title: 'Đi tới trang Liên hệ',
    description: 'Khi cần trợ giúp, người dùng vào mục liên hệ.',
    route: '/contact',
    ctaLabel: 'Đi tới Contact',
    placement: 'center',
  },
  {
    id: 'public-mobile-login',
    title: 'Nút tài khoản (Đăng nhập/Dashboard)',
    description: 'Khi chưa đăng nhập sẽ hiện Đăng nhập, khi đã đăng nhập sẽ hiện Dashboard.',
    selector: '[data-tour="public-mobile-login"]',
    autoClickSelector: '[data-tour="public-mobile-menu"]',
    placement: 'top',
    allowMissing: true,
  },
  {
    id: 'public-mobile-register',
    title: 'Nút đăng ký',
    description: 'Người mới bắt đầu từ nút đăng ký.',
    selector: '[data-tour="public-mobile-register"]',
    autoClickSelector: '[data-tour="public-mobile-menu"]',
    placement: 'top',
    allowMissing: true,
  },
  {
    id: 'public-mobile-logout',
    title: 'Nút đăng xuất',
    description: 'Nếu đã đăng nhập, menu mobile sẽ có nút đăng xuất.',
    selector: '[data-tour="public-mobile-logout"]',
    autoClickSelector: '[data-tour="public-mobile-menu"]',
    placement: 'top',
    allowMissing: true,
  },
];

const adminDesktopBaseSteps: TourStep[] = [
  {
    id: 'admin-desktop-sidebar',
    title: 'Sidebar quản trị',
    description: 'Đây là trung tâm điều hướng toàn bộ module admin.',
    selector: '[data-tour="admin-desktop-sidebar"]',
    placement: 'right',
  },
  {
    id: 'admin-desktop-nav',
    title: 'Danh mục module',
    description: 'Module được nhóm để thao tác nhanh và ít nhầm lẫn.',
    selector: '[data-tour="admin-desktop-nav"]',
    placement: 'right',
  },
  {
    id: 'admin-desktop-search',
    title: 'Tìm kiếm nhanh',
    description: 'Dùng Ctrl+K hoặc nút tìm kiếm để mở command/search.',
    selector: '[data-tour="admin-desktop-search"]',
    placement: 'bottom',
  },
  {
    id: 'admin-desktop-route-dashboard',
    title: 'Mở Dashboard',
    description: 'Từ dashboard bạn nhìn nhanh trạng thái vận hành tổng thể.',
    route: '/admin/dashboard#exam-schedules',
    ctaLabel: 'Mở Dashboard',
    selector: '[data-tour="admin-desktop-main"]',
    placement: 'top',
  },
  {
    id: 'admin-desktop-route-learning',
    title: 'Mở mục Học tập',
    description: 'Bấm vào mục học tập để vào khu vực quản lý học viên/lớp học.',
    route: '/admin/dashboard#students',
    ctaLabel: 'Mở mục Học tập',
    selector: '[data-tour="admin-desktop-nav-students"]',
    placement: 'top',
  },
  {
    id: 'admin-desktop-route-exam-class',
    title: 'Mở mục Lớp thi',
    description: 'Bấm mục này để vào màn lịch thi/lớp thi đang vận hành.',
    route: '/admin/dashboard#exam-schedules',
    ctaLabel: 'Mở mục Lớp thi',
    selector: '[data-tour="admin-desktop-nav-exam-schedules"]',
    placement: 'top',
  },
  {
    id: 'admin-desktop-route-payments',
    title: 'Chuyển tới module Thanh toán',
    description: 'Module tài chính cần thao tác cẩn thận theo đúng quyền.',
    route: '/admin/dashboard#payments',
    ctaLabel: 'Mở tab Thanh toán',
    selector: '[data-tour="admin-desktop-nav-payments"]',
    placement: 'top',
  },
  {
    id: 'admin-desktop-main',
    title: 'Vùng nội dung chính',
    description: 'Kết quả thao tác ở sidebar sẽ hiển thị tại khu vực này.',
    selector: '[data-tour="admin-desktop-main"]',
    placement: 'top',
  },
  {
    id: 'admin-desktop-logout',
    title: 'Đăng xuất',
    description: 'Kết thúc phiên admin bằng thao tác đăng xuất an toàn.',
    selector: '[data-tour="admin-desktop-logout"]',
    placement: 'right',
  },
];

const adminMobileBaseSteps: TourStep[] = [
  {
    id: 'admin-mobile-menu-btn',
    title: 'Mở menu Admin',
    description: 'Nút này dùng để mở drawer module trên mobile.',
    selector: '[data-tour="admin-mobile-menu"]',
    placement: 'bottom',
  },
  {
    id: 'admin-mobile-drawer',
    title: 'Drawer module',
    description: 'Các module admin nằm trong drawer.',
    selector: '[data-tour="admin-mobile-drawer"]',
    autoClickSelector: '[data-tour="admin-mobile-menu"]',
    placement: 'right',
  },
  {
    id: 'admin-mobile-bottom-nav',
    title: 'Bottom nav',
    description: 'Một số tab chính có sẵn ở thanh điều hướng dưới.',
    selector: '[data-tour="admin-mobile-bottom-nav"]',
    placement: 'top',
  },
  {
    id: 'admin-mobile-more',
    title: 'Nút Thêm',
    description: 'Khi tab nhiều, dùng nút Thêm để mở nhanh.',
    selector: '[data-tour="admin-mobile-more"]',
    placement: 'top',
  },
  {
    id: 'admin-mobile-route-dashboard',
    title: 'Mở Dashboard',
    description: 'Dashboard giúp theo dõi nhanh trạng thái chung.',
    route: '/admin/dashboard#exam-schedules',
    ctaLabel: 'Mở Dashboard',
    selector: '[data-tour="admin-mobile-nav-exam-schedules"]',
    placement: 'center',
  },
  {
    id: 'admin-mobile-route-learning',
    title: 'Mở mục Học tập',
    description: 'Từ đây bạn vào khu vực học viên/lớp học nhanh hơn.',
    route: '/admin/dashboard#students',
    ctaLabel: 'Mở mục Học tập',
    selector: '[data-tour="admin-mobile-nav-students"]',
    placement: 'center',
  },
  {
    id: 'admin-mobile-route-exam-class',
    title: 'Mở mục Lớp thi',
    description: 'Mục lịch thi/lớp thi được truy cập trực tiếp từ đây.',
    route: '/admin/dashboard#exam-schedules',
    ctaLabel: 'Mở mục Lớp thi',
    selector: '[data-tour="admin-mobile-nav-exam-schedules"]',
    placement: 'center',
  },
  {
    id: 'admin-mobile-route-payments',
    title: 'Chuyển sang Thanh toán',
    description: 'Kiểm tra nhanh luồng chuyển tab trên mobile.',
    route: '/admin/dashboard#payments',
    ctaLabel: 'Mở tab Thanh toán',
    selector: '[data-tour="admin-mobile-nav-payments"]',
    placement: 'center',
  },
  {
    id: 'admin-mobile-logout',
    title: 'Đăng xuất',
    description: 'Nút đăng xuất ở cuối drawer.',
    selector: '[data-tour="admin-mobile-logout"]',
    autoClickSelector: '[data-tour="admin-mobile-menu"]',
    placement: 'top',
  },
];

const studentDesktopBaseSteps: TourStep[] = [
  {
    id: 'student-desktop-sidebar',
    title: 'Sidebar học viên',
    description: 'Khu vực điều hướng chính của tài khoản học viên.',
    selector: '[data-tour="student-desktop-sidebar"]',
    placement: 'right',
  },
  {
    id: 'student-desktop-profile-card',
    title: 'Thẻ hồ sơ',
    description: 'Bấm vào đây để cập nhật thông tin cá nhân.',
    selector: '[data-tour="student-desktop-profile"]',
    placement: 'right',
  },
  {
    id: 'student-desktop-nav',
    title: 'Menu học viên',
    description: 'Các chức năng chính như lịch thi/hồ sơ đều ở đây.',
    selector: '[data-tour="student-desktop-nav"]',
    placement: 'right',
  },
  {
    id: 'student-desktop-route-dashboard',
    title: 'Mở Dashboard',
    description: 'Bấm vào Dashboard để quay về màn chính của học viên.',
    route: '/dashboard/exams',
    ctaLabel: 'Mở Dashboard',
    selector: '[data-tour="student-desktop-nav-exams"]',
    placement: 'top',
  },
  {
    id: 'student-desktop-study',
    title: 'Mở mục Học tập',
    description: 'Nút Học tập sẽ mở nền tảng học để bạn tiếp tục khóa học.',
    selector: '[data-tour="student-desktop-nav-study"]',
    placement: 'top',
    allowMissing: true,
  },
  {
    id: 'student-desktop-route-exam-class',
    title: 'Mở mục Lớp thi',
    description: 'Mục này hiển thị lịch thi và thông tin lớp thi hiện tại.',
    route: '/dashboard/exams',
    ctaLabel: 'Mở mục Lớp thi',
    selector: '[data-tour="student-desktop-nav-exams"]',
    placement: 'top',
  },
  {
    id: 'student-desktop-route-profile',
    title: 'Đi tới hồ sơ',
    description: 'Tour sẽ chuyển bạn sang màn hồ sơ để làm quen.',
    route: '/dashboard/profile',
    ctaLabel: 'Mở Hồ sơ',
    selector: '[data-tour="student-desktop-main"]',
    placement: 'top',
  },
  {
    id: 'student-desktop-route-exams',
    title: 'Quay lại Lịch thi',
    description: 'Sau khi xem hồ sơ, quay lại mục thi để tiếp tục.',
    route: '/dashboard/exams',
    ctaLabel: 'Mở Lịch thi',
    selector: '[data-tour="student-desktop-main"]',
    placement: 'top',
  },
  {
    id: 'student-desktop-main',
    title: 'Nội dung màn hình',
    description: 'Mỗi tab sẽ hiển thị nội dung tại khu vực này.',
    selector: '[data-tour="student-desktop-main"]',
    placement: 'top',
  },
  {
    id: 'student-desktop-logout',
    title: 'Đăng xuất',
    description: 'Kết thúc phiên làm việc bằng nút đăng xuất.',
    selector: '[data-tour="student-desktop-logout"]',
    placement: 'right',
  },
];

const studentMobileBaseSteps: TourStep[] = [
  {
    id: 'student-mobile-menu-btn',
    title: 'Mở menu học viên',
    description: 'Nút này mở drawer điều hướng trên mobile.',
    selector: '[data-tour="student-mobile-menu"]',
    placement: 'bottom',
  },
  {
    id: 'student-mobile-drawer',
    title: 'Drawer điều hướng',
    description: 'Danh sách chức năng nằm trong drawer này.',
    selector: '[data-tour="student-mobile-drawer"]',
    autoClickSelector: '[data-tour="student-mobile-menu"]',
    placement: 'right',
  },
  {
    id: 'student-mobile-bottom-nav',
    title: 'Bottom nav học viên',
    description: 'Thanh dưới giúp truy cập nhanh các mục chính.',
    selector: '[data-tour="student-mobile-bottom-nav"]',
    placement: 'top',
  },
  {
    id: 'student-mobile-profile',
    title: 'Avatar hồ sơ',
    description: 'Bấm avatar để vào thông tin cá nhân.',
    selector: '[data-tour="student-mobile-profile"]',
    placement: 'bottom',
  },
  {
    id: 'student-mobile-route-dashboard',
    title: 'Mở Dashboard',
    description: 'Bấm Dashboard để về màn chính trên mobile.',
    route: '/dashboard#exams',
    ctaLabel: 'Mở Dashboard',
    selector: '[data-tour="student-mobile-nav-exams"]',
    placement: 'center',
  },
  {
    id: 'student-mobile-study',
    title: 'Mở mục Học tập',
    description: 'Nút Học tập mở nền tảng học trong tab mới.',
    selector: '[data-tour="student-mobile-nav-study"]',
    placement: 'center',
    allowMissing: true,
  },
  {
    id: 'student-mobile-route-exam-class',
    title: 'Mở mục Lớp thi',
    description: 'Bấm vào mục này để xem lịch thi/lớp thi của bạn.',
    route: '/dashboard#exams',
    ctaLabel: 'Mở mục Lớp thi',
    selector: '[data-tour="student-mobile-nav-exams"]',
    placement: 'center',
  },
  {
    id: 'student-mobile-route-profile',
    title: 'Đi tới tab hồ sơ',
    description: 'Tour sẽ chuyển sang tab hồ sơ.',
    route: '/dashboard#profile',
    ctaLabel: 'Mở tab Hồ sơ',
    placement: 'center',
  },
  {
    id: 'student-mobile-route-exams',
    title: 'Quay lại tab thi',
    description: 'Sau khi xem hồ sơ, quay lại tab lịch thi.',
    route: '/dashboard#exams',
    ctaLabel: 'Mở tab Thi',
    placement: 'center',
  },
  {
    id: 'student-mobile-logout',
    title: 'Đăng xuất',
    description: 'Nút đăng xuất nằm ở cuối drawer.',
    selector: '[data-tour="student-mobile-logout"]',
    autoClickSelector: '[data-tour="student-mobile-menu"]',
    placement: 'top',
  },
];

function createScenario(
  id: string,
  context: TourContext,
  device: TourDevice,
  routePrefixes: string[],
  baseSteps: TourStep[],
): TourScenario {
  return {
    id,
    version: 4,
    context,
    device,
    routePrefixes,
    steps: buildDenseSteps(id, context, device, baseSteps),
  };
}

export const ONBOARDING_SCENARIOS: TourScenario[] = [
  createScenario(
    'admin-desktop-dashboard',
    'admin',
    'desktop',
    ['/admin/dashboard'],
    adminDesktopBaseSteps,
  ),
  createScenario(
    'admin-mobile-dashboard',
    'admin',
    'mobile',
    ['/admin/dashboard'],
    adminMobileBaseSteps,
  ),
  createScenario(
    'student-desktop-dashboard',
    'student',
    'desktop',
    ['/dashboard'],
    studentDesktopBaseSteps,
  ),
  createScenario(
    'student-mobile-dashboard',
    'student',
    'mobile',
    ['/dashboard'],
    studentMobileBaseSteps,
  ),
  createScenario(
    'public-desktop-main',
    'public',
    'desktop',
    ['/', '/about', '/training', '/admissions', '/news', '/contact', '/login', '/register'],
    publicDesktopBaseSteps,
  ),
  createScenario(
    'public-mobile-main',
    'public',
    'mobile',
    ['/', '/about', '/training', '/admissions', '/news', '/contact', '/login', '/register'],
    publicMobileBaseSteps,
  ),
];
