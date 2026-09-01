// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Link } from 'react-router-dom';
import {
  Monitor,
  CreditCard,
  FileText,
  BarChart3,
  Clock,
  ShieldCheck,
  ArrowRight,
  Laptop,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { TOTAL_STUDENTS, SATISFACTION_RATE } from '../../constants/site-stats';
import SEO from '../../components/common/SEO';

const services = [
  {
    Icon: Monitor,
    eyebrow: '01 · Đăng ký số',
    title: 'Đăng ký thi trực tuyến',
    description:
      'Hệ thống đăng ký thi hoạt động 24/7 — học viên xác nhận lịch thi và hồ sơ chỉ với vài thao tác trên di động hoặc máy tính.',
    link: '/register',
  },
  {
    Icon: Laptop,
    eyebrow: '02 · Quản lý',
    title: 'Hành trình học tập thông minh',
    description:
      'Theo dõi toàn bộ lộ trình, lịch thi, kết quả và trạng thái hồ sơ trên một giao diện đồng nhất, dễ đọc trên mọi thiết bị.',
    link: '/dashboard',
  },
  {
    Icon: CreditCard,
    eyebrow: '03 · Thanh toán',
    title: 'Thanh toán đa phương thức',
    description:
      'Tích hợp QR Code, thẻ nội địa và thẻ quốc tế qua cổng thanh toán mã hoá. Xác nhận giao dịch tức thời, an toàn.',
    link: '/dashboard/payment',
  },
  {
    Icon: FileText,
    eyebrow: '04 · Tài liệu',
    title: 'Kho tài liệu số',
    description:
      'Học viên có thể tải về giấy báo thi, chứng chỉ và tài liệu ôn tập miễn phí — truy cập không giới hạn theo gói khoá học.',
    link: '/dashboard/documents',
  },
  {
    Icon: Clock,
    eyebrow: '05 · Hỗ trợ',
    title: 'Tư vấn 24/7',
    description:
      'Đội ngũ tư vấn chuyên trách phản hồi qua chat trên trang, email và hotline. Trung bình thời gian phản hồi dưới 30 phút.',
    link: '/contact',
  },
  {
    Icon: BarChart3,
    eyebrow: '06 · Báo cáo',
    title: 'Thống kê & báo cáo',
    description:
      'Công cụ thống kê chi tiết cho giảng viên và quản lý — theo dõi tiến độ đào tạo, kết quả lớp và tỉ lệ đậu theo thời gian thực.',
    link: '/contact',
  },
];

const stats = [
  { value: TOTAL_STUDENTS, label: 'Học viên đã đồng hành' },
  { value: SATISFACTION_RATE, label: 'Mức độ hài lòng' },
  { value: '24/7', label: 'Hỗ trợ trực tuyến' },
  { value: '100%', label: 'Bảo mật & mã hoá' },
];

const reasons = [
  {
    Icon: ShieldCheck,
    title: 'Bảo mật chuẩn TLS 1.3',
    description: 'Mọi giao dịch và dữ liệu hồ sơ học viên đều được mã hoá end-to-end.',
  },
  {
    Icon: GraduationCap,
    title: 'Hệ giảng viên có chứng chỉ',
    description: 'Đội ngũ với 8+ năm kinh nghiệm — chuyên trách luyện VSTEP, IELTS, TOEIC.',
  },
  {
    Icon: Sparkles,
    title: 'Trải nghiệm hiện đại',
    description: 'Giao diện chuẩn WCAG 2.2, tối ưu mobile, hoạt động ổn định trên mọi trình duyệt.',
  },
];

const testimonials = [
  {
    initial: 'L',
    name: 'Học viên khoá VSTEP B2 · 2025',
    course: 'Chứng chỉ VSTEP B2',
    quote:
      'Hệ thống đăng ký rất tiện lợi — tôi làm mọi thứ trên điện thoại, không phải đến tận nơi. Kết quả thi được thông báo nhanh chóng.',
  },
  {
    initial: 'N',
    name: 'Học viên khoá Giao tiếp · 2025',
    course: 'Tiếng Anh Giao Tiếp',
    quote:
      'Kho tài liệu ôn tập rất phong phú. Đội ngũ hỗ trợ phản hồi nhanh khi tôi cần giải đáp — cảm giác được chăm sóc đúng nghĩa.',
  },
  {
    initial: 'T',
    name: 'Học viên khoá TOEIC · 2026',
    course: 'Luyện thi TOEIC',
    quote:
      'Tính năng theo dõi lộ trình giúp tôi biết mình cần cải thiện ở đâu, tiết kiệm rất nhiều thời gian ôn tập so với tự học.',
  },
];

export default function ServicesPage() {
  const structuredData = [
    {
      '@type': 'Service',
      name: 'Dich vu va tien ich hoc tap',
      provider: { '@type': 'Organization', name: 'Van Trang Education', url: 'https://vantrangedu.com' },
      areaServed: 'VN',
      url: 'https://vantrangedu.com/services',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Dich vu va tien ich', item: 'https://vantrangedu.com/services' },
      ],
    },
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Dich vu va tien ich"
        description="He sinh thai dang ky, thanh toan, tai lieu, bao cao va ho tro hoc tap so cho hoc vien cua Van Trang Education."
        url="/services"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-[var(--vt-paper)]">
        {/* Hero — editorial ink panel */}
        <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-[var(--vt-emerald)]/15 blur-3xl" />
          </div>

          <div className="relative vt-container py-20 md:py-28">
            <div className="max-w-3xl">
              <p className="vt-eyebrow !text-[var(--vt-champagne)]">Cẩm nang · Dịch vụ</p>
              <h1
                className="vt-display mt-5 text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
              >
                Một hệ sinh thái đào tạo —{' '}
                <span className="vt-display-italic text-[var(--vt-champagne)]">được thiết kế</span> để bạn tiến nhanh hơn.
              </h1>
              <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-2xl">
                Từ đăng ký, thanh toán đến tài liệu và báo cáo — sáu dịch vụ cốt lõi gắn kết liền mạch trên một nền tảng duy nhất.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/register" className="vt-btn vt-btn--accent">
                  Bắt đầu ngay
                  <ArrowRight size={16} />
                </Link>
                <Link
                  to="/contact"
                  className="vt-btn vt-btn--ghost border border-white/25 text-white hover:bg-white/10"
                >
                  Nhận tư vấn
                </Link>
              </div>
            </div>
          </div>

          <div className="vt-fine-divider" aria-hidden="true" />
        </section>

        {/* Service grid */}
        <section className="vt-section">
          <div className="vt-container">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
              <div>
                <p className="vt-eyebrow">Dịch vụ cốt lõi</p>
                <h2
                  className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight text-[var(--vt-ink)]"
                  style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
                >
                  Sáu trụ cột,{' '}
                  <span className="vt-display-italic text-[var(--vt-emerald-deep)]">một trải nghiệm.</span>
                </h2>
              </div>
              <p className="text-[var(--vt-ink-60)] max-w-md leading-relaxed">
                Mọi dịch vụ đều hướng tới một mục tiêu duy nhất — giúp học viên tập trung học, hệ thống lo phần còn lại.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((s) => (
                <Link
                  key={s.title}
                  to={s.link}
                  className="vt-feature-card group p-7 flex flex-col gap-5 hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center group-hover:bg-[var(--vt-champagne-soft)] group-hover:text-[var(--vt-champagne-deep)] transition-colors">
                      <s.Icon size={22} />
                    </span>
                    <span className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{s.eyebrow}</span>
                  </div>

                  <div>
                    <h3
                      className="vt-display text-xl text-[var(--vt-ink)] leading-tight"
                      style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                    >
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed">{s.description}</p>
                  </div>

                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--vt-emerald-deep)] group-hover:gap-2.5 transition-all">
                    Trải nghiệm ngay
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section className="vt-section pt-0">
          <div className="vt-container">
            <div className="vt-paper-card p-7 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {stats.map((s) => (
                <div key={s.label} className="vt-stat-tile text-center">
                  <p
                    className="vt-display text-[clamp(1.75rem,4vw,2.75rem)] leading-none text-[var(--vt-emerald-deep)]"
                    style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--vt-ink-60)] font-semibold">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why choose us */}
        <section className="vt-section bg-[var(--vt-ivory)]">
          <div className="vt-container">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="vt-eyebrow">Vì sao chọn Vân Trang</p>
              <h2
                className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] text-[var(--vt-ink)] leading-tight"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
              >
                Ba lý do{' '}
                <span className="vt-display-italic text-[var(--vt-emerald-deep)]">đáng cân nhắc.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reasons.map((r) => (
                <div
                  key={r.title}
                  className="vt-paper-card p-7 flex flex-col gap-4 hover:-translate-y-1 transition-transform"
                >
                  <span className="h-12 w-12 rounded-full bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] grid place-items-center">
                    <r.Icon size={22} />
                  </span>
                  <div>
                    <h3
                      className="vt-display text-lg text-[var(--vt-ink)]"
                      style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                    >
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--vt-ink-70)] leading-relaxed">{r.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="vt-section">
          <div className="vt-container">
            <div className="text-center mb-12">
              <p className="vt-eyebrow">Phản hồi học viên</p>
              <h2
                className="vt-display mt-3 text-[clamp(1.5rem,2.5vw,2rem)] text-[var(--vt-ink)] leading-tight"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
              >
                Họ đã chọn — và{' '}
                <span className="vt-display-italic text-[var(--vt-emerald-deep)]">đã đậu.</span>
              </h2>
              <p className="mt-3 text-xs text-[var(--vt-ink-50)] italic">
                * Phản hồi từ học viên thực tế — tên hiển thị theo định danh khoá học và năm tốt nghiệp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <figure
                  key={t.name}
                  className="vt-paper-card p-7 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-[var(--vt-ink)] text-[var(--vt-champagne)] grid place-items-center font-bold text-base">
                      {t.initial}
                    </div>
                    <figcaption className="leading-tight">
                      <p className="text-sm font-semibold text-[var(--vt-ink)]">{t.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--vt-ink-50)] mt-1">
                        {t.course}
                      </p>
                    </figcaption>
                  </div>
                  <blockquote className="text-sm text-[var(--vt-ink-70)] leading-relaxed italic">
                    “{t.quote}”
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — ink panel with champagne CTA */}
        <section className="vt-section">
          <div className="vt-container">
            <div className="vt-ink-panel relative overflow-hidden rounded-[var(--vt-radius-2xl)] p-10 md:p-16 text-center">
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--vt-champagne)]/15 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--vt-emerald)]/20 blur-3xl" />
              </div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <p className="vt-eyebrow !text-[var(--vt-champagne)]">Bắt đầu hành trình</p>
                <h2
                  className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] text-white leading-tight"
                  style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
                >
                  Sẵn sàng để{' '}
                  <span className="vt-display-italic text-[var(--vt-champagne)]">bước tiếp theo?</span>
                </h2>
                <p className="mt-5 text-white/75 leading-relaxed">
                  Đăng ký tài khoản — tiếp cận kho tri thức và các tiện ích đăng ký thi chỉ trong vài phút.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/register" className="vt-btn vt-btn--accent justify-center">
                    Đăng ký tài khoản
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/contact"
                    className="vt-btn vt-btn--ghost justify-center border border-white/25 text-white hover:bg-white/10"
                  >
                    Liên hệ tư vấn
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ModernPublicLayout>
  );
}
