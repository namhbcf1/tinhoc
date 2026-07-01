// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import { Link } from 'react-router-dom';
import {
  Handshake,
  Globe2,
  Building,
  Users2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const stats = [
  { num: '50+', label: 'Đối tác chiến lược' },
  { num: '15+', label: 'Quốc gia hợp tác' },
  { num: '1000+', label: 'Sinh viên được kết nối' },
];

const partnerTypes = [
  {
    Icon: Globe2,
    eyebrow: '01 · Quốc tế',
    title: 'Hợp Tác Quốc Tế',
    desc: 'Liên kết với các trường đại học và tổ chức giáo dục uy tín trên toàn thế giới — mở rộng cánh cửa tri thức toàn cầu.',
    points: ['Chương trình trao đổi sinh viên', 'Học bổng du học nước ngoài', 'Công nhận tín chỉ quốc tế'],
  },
  {
    Icon: Building,
    eyebrow: '02 · Doanh nghiệp',
    title: 'Doanh Nghiệp',
    desc: 'Kết nối với các doanh nghiệp hàng đầu, tạo cơ hội thực tập và việc làm thực tế ngay từ khi còn ngồi trên ghế nhà trường.',
    points: ['Thực tập có lương tại doanh nghiệp', 'Mentoring từ chuyên gia ngành', 'Ưu tiên tuyển dụng sau tốt nghiệp'],
  },
  {
    Icon: Users2,
    eyebrow: '03 · Alumni',
    title: 'Cựu Sinh Viên',
    desc: 'Mạng lưới cựu sinh viên thành đạt, sẵn sàng hỗ trợ và chia sẻ kinh nghiệm cho thế hệ kế tiếp.',
    points: ['Hội thảo chia sẻ nghề nghiệp', 'Kết nối việc làm qua alumni', 'Quỹ học bổng cựu sinh viên'],
  },
];

const partners = [
  { name: 'British Council', type: 'Tổ chức quốc tế', logo: 'BC' },
  { name: 'IDP Education', type: 'Tổ chức quốc tế', logo: 'IDP' },
  { name: 'Microsoft VN', type: 'Công nghệ', logo: 'MS' },
  { name: 'FPT Software', type: 'Doanh nghiệp', logo: 'FPT' },
  { name: 'Vingroup', type: 'Tập đoàn', logo: 'VIN' },
  { name: 'Techcombank', type: 'Ngân hàng', logo: 'TCB' },
  { name: 'Samsung VN', type: 'Công nghệ', logo: 'SAM' },
  { name: 'LG Electronics', type: 'Công nghệ', logo: 'LG' },
];

export default function ConnectionsPage() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Ket noi va hop tac',
      description: 'Thong tin doi tac quoc te, doanh nghiep va cong dong cua Van Trang Education.',
      url: 'https://vantrangedu.com/connections',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Ket noi va hop tac', item: 'https://vantrangedu.com/connections' },
      ],
    },
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Kết nối & Hợp tác"
        description="Mở rộng mạng lưới đối tác quốc tế, doanh nghiệp và cựu học viên để tạo cơ hội học tập và việc làm thực tế."
        url="/connections"
        structuredData={structuredData}
      />

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-emerald)]/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vt-champagne)]">
              <Handshake size={13} />
              Mạng lưới · Đối tác chiến lược
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Kết nối &amp;{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">hợp tác.</span>
            </h1>
            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-2xl">
              Một sinh viên Vân Trang không học một mình — phía sau là một mạng lưới đối tác toàn cầu, doanh nghiệp trong nước và cựu sinh viên sẵn sàng mở cửa.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {stats.map((s) => (
                <div key={s.label} className="border-l border-white/15 pl-3">
                  <p
                    className="vt-display text-2xl text-white"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {s.num}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="vt-fine-divider" aria-hidden="true" />
      </section>

      {/* Partnership types */}
      <section className="vt-section">
        <div className="vt-container">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
            <div>
              <p className="vt-eyebrow">Hình thức hợp tác</p>
              <h2
                className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight text-[var(--vt-ink)]"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
              >
                Ba cánh cửa,{' '}
                <span className="vt-display-italic text-[var(--vt-emerald-deep)]">một hệ sinh thái.</span>
              </h2>
            </div>
            <p className="text-[var(--vt-ink-60)] max-w-md leading-relaxed">
              Mỗi mối quan hệ hợp tác giải quyết một nhu cầu cụ thể của học viên — không trùng lặp, không phô trương.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partnerTypes.map((pt) => (
              <article
                key={pt.title}
                className="vt-feature-card group p-7 flex flex-col gap-5 hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center group-hover:bg-[var(--vt-champagne-soft)] group-hover:text-[var(--vt-champagne-deep)] transition-colors">
                    <pt.Icon size={22} />
                  </span>
                  <span className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{pt.eyebrow}</span>
                </div>
                <div>
                  <h3
                    className="vt-display text-xl text-[var(--vt-ink)] leading-tight"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {pt.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed">{pt.desc}</p>
                </div>
                <ul className="mt-1 space-y-2 border-t border-[var(--vt-line)] pt-4">
                  {pt.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-sm text-[var(--vt-ink-80)] font-medium"
                    >
                      <CheckCircle2 size={14} className="text-[var(--vt-emerald-deep)] shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Partner logos */}
      <section className="vt-section pt-0">
        <div className="vt-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="vt-eyebrow">Đối tác tiêu biểu</p>
            <h2
              className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] text-[var(--vt-ink)] leading-tight"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
            >
              Tin cậy từ những{' '}
              <span className="vt-display-italic text-[var(--vt-emerald-deep)]">tên tuổi lớn.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {partners.map((p) => (
              <div
                key={p.name}
                className="vt-paper-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform"
              >
                <div className="shrink-0 h-12 w-12 rounded-2xl bg-[var(--vt-ivory-deep)] border border-[var(--vt-line)] grid place-items-center">
                  <span
                    className="vt-display text-xs text-[var(--vt-ink)] tracking-[0.04em]"
                    style={{ fontVariationSettings: '"opsz" 48, "SOFT" 20', fontWeight: 700 }}
                  >
                    {p.logo}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--vt-ink)] text-sm truncate">{p.name}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--vt-ink-50)] mt-0.5">
                    {p.type}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="vt-section pt-0">
        <div className="vt-container">
          <div className="vt-ink-panel relative overflow-hidden rounded-[var(--vt-radius-2xl)] p-10 md:p-14 text-center">
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--vt-champagne)]/15 blur-3xl" />
              <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[var(--vt-emerald)]/20 blur-3xl" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto">
              <p className="vt-eyebrow !text-[var(--vt-champagne)]">Trở thành đối tác</p>
              <h2
                className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-white leading-tight"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
              >
                Cùng xây thế hệ{' '}
                <span className="vt-display-italic text-[var(--vt-champagne)]">nhân tài tương lai.</span>
              </h2>
              <p className="mt-5 text-white/75 leading-relaxed">
                Mọi hình thức hợp tác — từ học bổng, mentoring đến chương trình thực tập — đều có thể bắt đầu bằng một cuộc trò chuyện.
              </p>
              <Link to="/contact" className="vt-btn vt-btn--accent mt-8 inline-flex justify-center">
                Liên hệ hợp tác
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ModernPublicLayout>
  );
}
