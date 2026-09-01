// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Library,
  MonitorSmartphone,
  FlaskConical,
  BarChart3,
  Cloud,
  ArrowRight,
  Users,
  Activity,
  Layers,
} from 'lucide-react';
import SEO from '../../components/common/SEO';

const features = [
  {
    Icon: Bot,
    eyebrow: '01 · AI',
    title: 'AI Chatbot',
    desc: 'Trợ lý ảo hỗ trợ học tập 24/7 — giải đáp thắc mắc và tư vấn lộ trình cá nhân hoá theo khoá học.',
  },
  {
    Icon: Library,
    eyebrow: '02 · Tri thức',
    title: 'Smart Library',
    desc: 'Thư viện số với hàng nghìn tài liệu, giáo trình điện tử và bài giảng video được kiểm duyệt chất lượng.',
  },
  {
    Icon: MonitorSmartphone,
    eyebrow: '03 · Học tập',
    title: 'Learning Hub',
    desc: 'Không gian học tập tương tác — trang bị thiết bị công nghệ cao, cộng tác thời gian thực giữa giảng viên và học viên.',
  },
  {
    Icon: FlaskConical,
    eyebrow: '04 · Thực hành',
    title: 'Virtual Lab',
    desc: 'Phòng thí nghiệm ảo cho phép thực hành các tình huống khoa học và kỹ thuật ngay trên trình duyệt, an toàn và linh hoạt.',
  },
  {
    Icon: BarChart3,
    eyebrow: '05 · Phân tích',
    title: 'Data Analytics',
    desc: 'Nền tảng phân tích dữ liệu học tập — cung cấp thông tin chi tiết về tiến độ và hiệu quả từng học viên.',
  },
  {
    Icon: Cloud,
    eyebrow: '06 · Hạ tầng',
    title: 'Cloud Platform',
    desc: 'Hạ tầng đám mây phân phối toàn cầu, đảm bảo truy cập nhanh, ổn định và bảo mật end-to-end mọi lúc mọi nơi.',
  },
];

const techTags = ['Python', 'TensorFlow', 'React 19', 'Cloudflare Workers', 'D1 / R2', 'WebRTC', 'TypeScript', 'Edge AI'];

const stats = [
  { Icon: Users, value: '10,000+', label: 'Người dùng hoạt động' },
  { Icon: Activity, value: '99.9%', label: 'Uptime đảm bảo' },
  { Icon: Layers, value: '50+', label: 'Tính năng sẵn sàng' },
];

export default function Hub4Page() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Hub 4.0',
      description: 'Trung tam doi moi sang tao va chuyen doi so cua Van Trang Education.',
      url: 'https://vantrangedu.com/hub4',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Hub 4.0', item: 'https://vantrangedu.com/hub4' },
      ],
    },
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Hub 4.0"
        description="Hệ sinh thái AI, thư viện số, virtual lab và learning hub của HUB 4.0 Vân Trang Education."
        url="/hub4"
        structuredData={structuredData}
      />

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-emerald)]/22 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vt-champagne)]">
              <Sparkles size={13} />
              Innovation Center · Hub 4.0
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              HUB{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">đổi mới</span> & chuyển đổi số.
            </h1>
            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-2xl">
              Nơi học viên Vân Trang trải nghiệm các công nghệ giáo dục tiên tiến — từ AI trợ giảng đến phòng lab ảo và phân tích dữ liệu học tập theo thời gian thực.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/contact" className="vt-btn vt-btn--accent">
                Khám phá ngay
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="vt-btn vt-btn--ghost border border-white/25 text-white hover:bg-white/10"
              >
                Tham gia thử nghiệm
              </Link>
            </div>
          </div>
        </div>

        <div className="vt-fine-divider" aria-hidden="true" />
      </section>

      {/* Feature grid */}
      <section className="vt-section">
        <div className="vt-container">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
            <div>
              <p className="vt-eyebrow">Tính năng nổi bật</p>
              <h2
                className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight text-[var(--vt-ink)]"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
              >
                Sáu công cụ —{' '}
                <span className="vt-display-italic text-[var(--vt-emerald-deep)]">một hệ sinh thái.</span>
              </h2>
            </div>
            <p className="text-[var(--vt-ink-60)] max-w-md leading-relaxed">
              Mỗi công cụ được thiết kế để giải quyết một nút thắt cụ thể trong hành trình học tập — không phải để gây ấn tượng kỹ thuật.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <article
                key={f.title}
                className="vt-feature-card group p-7 flex flex-col gap-5 hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center group-hover:bg-[var(--vt-champagne-soft)] group-hover:text-[var(--vt-champagne-deep)] transition-colors">
                    <f.Icon size={22} />
                  </span>
                  <span className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{f.eyebrow}</span>
                </div>
                <div>
                  <h3
                    className="vt-display text-xl text-[var(--vt-ink)] leading-tight"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed">{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack + stats band */}
      <section className="vt-section pt-0">
        <div className="vt-container">
          <div className="vt-paper-card p-7 md:p-10 mb-6">
            <div className="text-center mb-6">
              <p className="vt-eyebrow">Stack công nghệ</p>
              <h3
                className="vt-display mt-3 text-xl md:text-2xl text-[var(--vt-ink)]"
                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
              >
                Hạ tầng vận hành thực tế
              </h3>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {techTags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 rounded-full bg-[var(--vt-ivory-deep)] border border-[var(--vt-line)] text-[13px] font-semibold text-[var(--vt-ink-80)] hover:border-[var(--vt-emerald)] hover:text-[var(--vt-emerald-deep)] transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="vt-paper-card p-7 md:p-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <s.Icon className="h-6 w-6 text-[var(--vt-emerald-deep)] mx-auto mb-3" />
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

      {/* CTA */}
      <section className="vt-section pt-0">
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
                Sẵn sàng trải nghiệm{' '}
                <span className="vt-display-italic text-[var(--vt-champagne)]">tương lai?</span>
              </h2>
              <p className="mt-5 text-white/75 leading-relaxed">
                Tham gia Hub 4.0 và trở thành một phần của thế hệ học viên ứng dụng công nghệ vào việc học hàng ngày.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/register" className="vt-btn vt-btn--accent justify-center">
                  Đăng ký miễn phí
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
    </ModernPublicLayout>
  );
}
