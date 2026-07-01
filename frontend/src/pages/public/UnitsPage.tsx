// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import {
  Building2,
  GraduationCap,
  Microscope,
  Users,
  BookOpen,
  Globe,
  Monitor,
  Phone,
  CheckCircle2,
} from 'lucide-react';

const units = [
  {
    Icon: Globe,
    eyebrow: '01 · Quốc tế',
    title: 'Trung tâm Đào tạo Quốc tế',
    description:
      'Chuyên trách các chương trình liên kết quốc tế, đào tạo tiếng Anh chuẩn quốc tế và tư vấn du học.',
    functions: ['Liên kết quốc tế', 'Đào tạo ngoại ngữ', 'Tư vấn du học'],
  },
  {
    Icon: Monitor,
    eyebrow: '02 · CNTT',
    title: 'Khoa Công Nghệ Thông Tin',
    description:
      'Đào tạo kỹ sư CNTT chất lượng cao, nghiên cứu khoa học và chuyển giao công nghệ phần mềm cho doanh nghiệp.',
    functions: ['Kỹ sư CNTT', 'Nghiên cứu KH', 'Chuyển giao công nghệ'],
  },
  {
    Icon: BookOpen,
    eyebrow: '03 · Ngoại ngữ',
    title: 'Khoa Ngoại Ngữ',
    description:
      'Đào tạo cử nhân ngôn ngữ Anh, Trung, Nhật, Hàn. Tổ chức các kỳ thi cấp chứng chỉ năng lực ngoại ngữ.',
    functions: ['Cử nhân ngôn ngữ', 'Chứng chỉ quốc tế', 'Nghiên cứu ngôn ngữ'],
  },
  {
    Icon: GraduationCap,
    eyebrow: '04 · Đào tạo',
    title: 'Phòng Quản lý Đào tạo',
    description:
      'Tham mưu, quản lý công tác đào tạo, tuyển sinh và tốt nghiệp của toàn trường — đảm bảo chất lượng chuẩn đầu ra.',
    functions: ['Tuyển sinh', 'Quản lý đào tạo', 'Tốt nghiệp'],
  },
  {
    Icon: Microscope,
    eyebrow: '05 · Nghiên cứu',
    title: 'Trung tâm R&D',
    description:
      'Nghiên cứu khoa học, ứng dụng công nghệ mới vào giảng dạy và quản lý giáo dục — phát triển các giải pháp ed-tech.',
    functions: ['Nghiên cứu KH', 'Ứng dụng công nghệ', 'Đổi mới sáng tạo'],
  },
  {
    Icon: Users,
    eyebrow: '06 · Sinh viên',
    title: 'Phòng Công tác Sinh viên',
    description:
      'Hỗ trợ đời sống sinh viên, tư vấn tâm lý, học bổng và các hoạt động phong trào — đồng hành cùng học viên xuyên suốt khoá học.',
    functions: ['Hỗ trợ đời sống', 'Tư vấn tâm lý', 'Học bổng'],
  },
];

export default function UnitsPage() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Cac don vi truc thuoc',
      description: 'Tong hop khoa, phong ban va trung tam truc thuoc trong he sinh thai Van Trang Education.',
      url: 'https://vantrangedu.com/units',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Don vi truc thuoc', item: 'https://vantrangedu.com/units' },
      ],
    },
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Các đơn vị trực thuộc"
        description="Giới thiệu các khoa, phòng ban và trung tâm chuyên trách trong hệ thống Vân Trang Education."
        url="/units"
        structuredData={structuredData}
      />

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-emerald)]/18 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vt-champagne)]">
              <Building2 size={13} />
              Tổ chức · Sơ đồ đơn vị
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Các đơn vị{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">trực thuộc.</span>
            </h1>
            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-2xl">
              Hệ thống các khoa, phòng ban và trung tâm chuyên trách — cùng nhau kiến tạo môi trường giáo dục chất lượng cao tại Vân Trang Education.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { num: '6', label: 'Đơn vị' },
                { num: '200+', label: 'Cán bộ' },
                { num: '15+', label: 'Năm KN' },
              ].map((s) => (
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

      {/* Units grid */}
      <section className="vt-section">
        <div className="vt-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((u) => (
              <article
                key={u.title}
                className="vt-feature-card group p-7 flex flex-col gap-5 hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center group-hover:bg-[var(--vt-champagne-soft)] group-hover:text-[var(--vt-champagne-deep)] transition-colors">
                    <u.Icon size={22} />
                  </span>
                  <span className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{u.eyebrow}</span>
                </div>
                <div>
                  <h3
                    className="vt-display text-lg md:text-xl text-[var(--vt-ink)] leading-tight"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {u.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed">{u.description}</p>
                </div>
                <ul className="mt-1 space-y-2 border-t border-[var(--vt-line)] pt-4">
                  {u.functions.map((fn) => (
                    <li
                      key={fn}
                      className="flex items-center gap-2 text-sm text-[var(--vt-ink-80)] font-medium"
                    >
                      <CheckCircle2 size={14} className="text-[var(--vt-emerald-deep)] shrink-0" />
                      {fn}
                    </li>
                  ))}
                </ul>
              </article>
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
              <p className="vt-eyebrow !text-[var(--vt-champagne)]">Hỗ trợ trực tiếp</p>
              <h2
                className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-white leading-tight"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
              >
                Liên hệ với{' '}
                <span className="vt-display-italic text-[var(--vt-champagne)]">từng đơn vị.</span>
              </h2>
              <p className="mt-5 text-white/75 leading-relaxed">
                Đội ngũ cán bộ luôn sẵn sàng hỗ trợ và giải đáp mọi thắc mắc của bạn — phản hồi trung bình trong 30 phút giờ hành chính.
              </p>
              <a
                href="tel:0962445963"
                className="vt-btn vt-btn--accent mt-8 inline-flex justify-center"
              >
                <Phone size={16} />
                096 244 5963
              </a>
            </div>
          </div>
        </div>
      </section>
    </ModernPublicLayout>
  );
}
