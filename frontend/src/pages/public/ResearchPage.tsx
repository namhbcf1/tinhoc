// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import {
  Microscope,
  Atom,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  Award,
} from 'lucide-react';

const projects = [
  {
    category: 'Công nghệ giáo dục',
    status: 'Đang triển khai',
    eyebrow: '01 · EdTech',
    title: 'Ứng dụng AI trong giảng dạy ngoại ngữ',
    description:
      'Nghiên cứu và phát triển trợ lý ảo hỗ trợ sinh viên luyện phát âm và giao tiếp tiếng Anh tự động bằng mô hình ngôn ngữ lớn.',
  },
  {
    category: 'Phần mềm',
    status: 'Đã nghiệm thu',
    eyebrow: '02 · Hệ thống',
    title: 'Hệ thống thi trắc nghiệm trực tuyến bảo mật cao',
    description:
      'Xây dựng nền tảng thi trực tuyến hỗ trợ hàng nghìn thí sinh đồng thời, tích hợp chống gian lận thông minh và proctoring AI.',
  },
  {
    category: 'Sư phạm',
    status: 'Công bố quốc tế',
    eyebrow: '03 · Sư phạm',
    title: 'Phương pháp giảng dạy tiếng Anh chuyên ngành kỹ thuật',
    description:
      'Đề xuất phương pháp tiếp cận mới trong giảng dạy tiếng Anh cho sinh viên khối kỹ thuật, đã đăng trên tạp chí thuộc danh mục SCOPUS.',
  },
];

const areas = [
  'AI giáo dục',
  'NLP',
  'EdTech',
  'Phương pháp sư phạm',
  'Thi cử trực tuyến',
  'Phân tích dữ liệu học tập',
];

const metrics = [
  { num: '25+', label: 'Đề tài cấp Bộ / Trường' },
  { num: '12', label: 'Bài báo quốc tế' },
  { num: '08', label: 'Giải thưởng KHCN' },
];

const publications = [
  {
    title: 'Automated Pronunciation Assessment Using Deep Learning for Vietnamese EFL Learners',
    journal: 'Computers & Education',
    year: '2024',
    author: 'Nguyễn Văn An, Trần Thị Bích',
  },
  {
    title: 'A Framework for Online Exam Security in Higher Education Institutions',
    journal: 'Journal of Educational Technology',
    year: '2023',
    author: 'Lê Quang Minh',
  },
  {
    title: 'ESP Teaching Approaches for Engineering Students: A Comparative Study',
    journal: 'English for Specific Purposes',
    year: '2023',
    author: 'Phạm Hồng Nhung, Vũ Đức Thắng',
  },
];

export default function ResearchPage() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Nghien cuu khoa hoc',
      description: 'Hoat dong nghien cuu, cong bo va ung dung cong nghe giao duc tai Van Trang Education.',
      url: 'https://vantrangedu.com/research',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Nghien cuu khoa hoc', item: 'https://vantrangedu.com/research' },
      ],
    },
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Nghiên cứu khoa học"
        description="Tổng hợp đề tài, công bố và hướng nghiên cứu về AI giáo dục, EdTech và đổi mới sáng tạo của Vân Trang Education."
        url="/research"
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
              <Microscope size={13} />
              R&amp;D · Đổi mới sáng tạo
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Nghiên cứu{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">khoa học.</span>
            </h1>
            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-2xl">
              Thúc đẩy đổi mới sáng tạo qua các đề tài có tính thực tiễn cao — từ AI trợ giảng đến hệ thống thi an toàn — và biến kết quả thành công cụ giảng dạy hằng ngày.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
              {metrics.map((m) => (
                <div key={m.label} className="border-l border-white/15 pl-3">
                  <p
                    className="vt-display text-3xl text-white"
                    style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
                  >
                    {m.num}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="vt-fine-divider" aria-hidden="true" />
      </section>

      {/* Two-column research layout */}
      <section className="vt-section">
        <div className="vt-container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar — areas + award strip */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="vt-paper-card p-7">
                <p className="vt-overline text-[var(--vt-ink-50)] flex items-center gap-2">
                  <FlaskConical size={14} className="text-[var(--vt-emerald-deep)]" />
                  Lĩnh vực nghiên cứu
                </p>
                <h3
                  className="vt-display mt-3 text-lg text-[var(--vt-ink)] leading-tight"
                  style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                >
                  Sáu hướng đi
                </h3>
                <ul className="mt-5 space-y-2.5 border-t border-[var(--vt-line)] pt-4">
                  {areas.map((a, i) => (
                    <li
                      key={a}
                      className="flex items-baseline gap-3 text-sm text-[var(--vt-ink-80)] font-medium"
                    >
                      <span className="vt-overline text-[9px] text-[var(--vt-ink-50)] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="vt-paper-card p-7 flex items-start gap-4">
                <span className="h-11 w-11 shrink-0 rounded-2xl bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] grid place-items-center">
                  <Award size={20} />
                </span>
                <div>
                  <p className="vt-overline text-[var(--vt-ink-50)]">Ghi nhận</p>
                  <p className="mt-2 text-sm text-[var(--vt-ink-80)] leading-relaxed">
                    Các đề tài đoạt giải KHCN cấp Bộ và Trường đều được tái đầu tư vào sản phẩm phục vụ học viên — không nằm trong ngăn kéo.
                  </p>
                </div>
              </div>
            </aside>

            {/* Main column — featured projects */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Atom size={20} className="text-[var(--vt-emerald-deep)]" />
                <h2
                  className="vt-display text-2xl text-[var(--vt-ink)]"
                  style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
                >
                  Đề tài nổi bật
                </h2>
              </div>

              {projects.map((proj) => (
                <article
                  key={proj.title}
                  className="vt-feature-card p-7 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{proj.eyebrow}</span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--vt-emerald-deep)]">
                      · {proj.status}
                    </span>
                  </div>
                  <h3
                    className="vt-display mt-3 text-xl text-[var(--vt-ink)] leading-tight"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {proj.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed">
                    {proj.description}
                  </p>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-[var(--vt-ink-50)] font-semibold">
                    {proj.category}
                  </p>
                </article>
              ))}

              {/* Publications */}
              <div className="vt-paper-card p-7">
                <div className="flex items-center gap-2.5 mb-5">
                  <BookOpen size={18} className="text-[var(--vt-emerald-deep)]" />
                  <h3
                    className="vt-display text-lg text-[var(--vt-ink)]"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    Công bố khoa học gần đây
                  </h3>
                </div>
                <ul className="space-y-4">
                  {publications.map((pub) => (
                    <li
                      key={pub.title}
                      className="flex items-start gap-4 pb-4 border-b border-[var(--vt-line)] last:border-0 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--vt-ink)] text-[15px] leading-snug">
                          {pub.title}
                        </p>
                        <p className="mt-2 text-xs text-[var(--vt-ink-60)]">
                          <span className="vt-display-italic text-[var(--vt-emerald-deep)]">
                            {pub.journal}
                          </span>
                          {' '}· {pub.year} · {pub.author}
                        </p>
                      </div>
                      <ArrowUpRight
                        size={16}
                        className="text-[var(--vt-ink-50)] shrink-0 mt-1"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ModernPublicLayout>
  );
}
