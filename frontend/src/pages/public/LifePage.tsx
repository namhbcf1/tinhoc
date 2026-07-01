// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import {
  Music,
  Heart,
  MapPin,
  Camera,
  Trophy,
  Code,
  Calendar,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';

const clubs = [
  {
    Icon: Music,
    eyebrow: '01 · Nghệ thuật',
    title: 'CLB Âm Nhạc',
    desc: 'Nơi thoả mãn đam mê ca hát, nhạc cụ và sáng tác âm nhạc cùng bạn bè cùng tần số.',
    members: '120 thành viên',
  },
  {
    Icon: Heart,
    eyebrow: '02 · Cộng đồng',
    title: 'Tình Nguyện',
    desc: 'Các hoạt động thiện nguyện ý nghĩa, kết nối cộng đồng và lan toả yêu thương đến những hoàn cảnh khó khăn.',
    members: '85 thành viên',
  },
  {
    Icon: MapPin,
    eyebrow: '03 · Khám phá',
    title: 'Du Lịch & Khám Phá',
    desc: 'Các chuyến đi thực tế, dã ngoại khám phá vẻ đẹp thiên nhiên và văn hoá Việt Nam.',
    members: '97 thành viên',
  },
  {
    Icon: Camera,
    eyebrow: '04 · Hình ảnh',
    title: 'CLB Nhiếp Ảnh',
    desc: 'Ghi lại những khoảnh khắc đẹp của tuổi sinh viên qua ống kính đầy sáng tạo và cảm xúc.',
    members: '63 thành viên',
  },
  {
    Icon: Trophy,
    eyebrow: '05 · Thể chất',
    title: 'Thể Thao',
    desc: 'Rèn luyện sức khoẻ, phát triển tinh thần đồng đội qua các môn thể thao đa dạng — bóng đá, cầu lông, chạy bộ.',
    members: '150 thành viên',
  },
  {
    Icon: Code,
    eyebrow: '06 · Công nghệ',
    title: 'CLB Công Nghệ',
    desc: 'Nghiên cứu, học hỏi và ứng dụng công nghệ mới vào giải pháp thực tiễn cho cuộc sống và học tập.',
    members: '110 thành viên',
  },
];

const events = [
  {
    day: '15',
    month: '03',
    year: '2026',
    title: 'Workshop AI & Future',
    desc: 'Hội thảo chuyên sâu về trí tuệ nhân tạo và xu hướng công nghệ tương lai với các chuyên gia hàng đầu.',
  },
  {
    day: '20',
    month: '04',
    year: '2026',
    title: 'Văn Nghệ Cuối Năm',
    desc: 'Đêm gala văn nghệ hoành tráng với các tiết mục ca múa nhạc đặc sắc từ sinh viên toàn trường.',
  },
  {
    day: '05',
    month: '05',
    year: '2026',
    title: 'VanTrang Marathon',
    desc: 'Giải chạy bộ truyền thống thường niên, thúc đẩy tinh thần rèn luyện sức khoẻ trong cộng đồng sinh viên.',
  },
  {
    day: '18',
    month: '06',
    year: '2026',
    title: 'Hackathon 2026',
    desc: 'Cuộc thi lập trình 48 giờ với giải thưởng hấp dẫn — tìm kiếm những ý tưởng công nghệ đột phá nhất.',
  },
];

const gallery = [
  'Workshop AI 2025',
  'Văn Nghệ Gala',
  'Marathon 2025',
  'Hackathon Finals',
  'CLB Âm Nhạc',
  'Tình Nguyện Hè',
];

export default function LifePage() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Doi song sinh vien',
      description: 'Thong tin cau lac bo, su kien va cong dong sinh vien tai Van Trang Education.',
      url: 'https://vantrangedu.com/life',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Doi song sinh vien', item: 'https://vantrangedu.com/life' },
      ],
    },
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Đời sống sinh viên"
        description="Khám phá câu lạc bộ, sự kiện, thư viện ảnh và hoạt động cộng đồng trong đời sống sinh viên tại Vân Trang Education."
        url="/life"
        structuredData={structuredData}
      />

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-champagne)]/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-emerald)]/18 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="vt-eyebrow !text-[var(--vt-champagne)]">Cẩm nang · Đời sống</p>
            <h1
              className="vt-display mt-5 text-[clamp(2.25rem,5vw,4rem)] leading-[1.04] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Mỗi ngày tại Vân Trang —{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">một hành trình.</span>
            </h1>
            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-2xl">
              Sáu câu lạc bộ, hơn 600 sinh viên hoạt động thường xuyên, và một cộng đồng năng động — đời sống ngoài giờ học mở rộng bao nhiêu là tuỳ bạn.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { num: '6', label: 'Câu lạc bộ' },
                { num: '4', label: 'Sự kiện/năm' },
                { num: '600+', label: 'Hoạt viên' },
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

      {/* Clubs grid */}
      <section className="vt-section">
        <div className="vt-container">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
            <div>
              <p className="vt-eyebrow">Câu lạc bộ</p>
              <h2
                className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight text-[var(--vt-ink)]"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
              >
                Tìm{' '}
                <span className="vt-display-italic text-[var(--vt-emerald-deep)]">tần số của bạn.</span>
              </h2>
            </div>
            <p className="text-[var(--vt-ink-60)] max-w-md leading-relaxed">
              Sáu cộng đồng nhỏ trong một trường lớn — mỗi câu lạc bộ vận hành độc lập, kết nối qua những sự kiện chung.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((c) => (
              <article
                key={c.title}
                className="vt-feature-card group p-7 flex flex-col gap-4 hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center group-hover:bg-[var(--vt-champagne-soft)] group-hover:text-[var(--vt-champagne-deep)] transition-colors">
                    <c.Icon size={22} />
                  </span>
                  <span className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{c.eyebrow}</span>
                </div>
                <div>
                  <h3
                    className="vt-display text-xl text-[var(--vt-ink)] leading-tight"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed">{c.desc}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--vt-emerald-deep)]">
                  · {c.members}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Events */}
      <section className="vt-section pt-0">
        <div className="vt-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="vt-eyebrow">Sự kiện nổi bật</p>
            <h2
              className="vt-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] text-[var(--vt-ink)] leading-tight"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
            >
              Lịch hoạt động{' '}
              <span className="vt-display-italic text-[var(--vt-emerald-deep)]">2026.</span>
            </h2>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {events.map((ev) => (
              <article
                key={ev.title}
                className="vt-paper-card p-6 md:p-7 flex flex-col md:flex-row gap-5 md:items-center"
              >
                <div className="shrink-0">
                  <div className="rounded-2xl bg-[var(--vt-ink)] text-white px-5 py-3 text-center min-w-[88px]">
                    <p
                      className="vt-display text-3xl leading-none"
                      style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
                    >
                      {ev.day}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--vt-champagne)] font-bold">
                      Th. {ev.month}
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3
                      className="vt-display text-lg md:text-xl text-[var(--vt-ink)]"
                      style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                    >
                      {ev.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-[var(--vt-ink-50)] font-semibold">
                      <Calendar size={11} /> {ev.year}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--vt-ink-70)] leading-relaxed">{ev.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Photo gallery (placeholders) */}
      <section className="vt-section pt-0">
        <div className="vt-container">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="vt-eyebrow">Thư viện ảnh</p>
            <h2
              className="vt-display mt-3 text-[clamp(1.5rem,2.6vw,2.25rem)] text-[var(--vt-ink)] leading-tight"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
            >
              Khoảnh khắc{' '}
              <span className="vt-display-italic text-[var(--vt-emerald-deep)]">đáng nhớ.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((g) => (
              <div
                key={g}
                className="aspect-[4/3] rounded-[var(--vt-radius-lg)] bg-gradient-to-br from-[var(--vt-ivory-deep)] to-[var(--vt-paper-soft)] border border-[var(--vt-line)] flex items-end p-5 hover:-translate-y-1 hover:shadow-[var(--vt-shadow-press)] transition-all cursor-default"
              >
                <span className="vt-display text-sm md:text-base text-[var(--vt-ink-80)]"
                      style={{ fontVariationSettings: '"opsz" 48, "SOFT" 20', fontWeight: 600 }}>
                  {g}
                </span>
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
              <p className="vt-eyebrow !text-[var(--vt-champagne)]">Tham gia cộng đồng</p>
              <h2
                className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] text-white leading-tight"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
              >
                Kết nối với{' '}
                <span className="vt-display-italic text-[var(--vt-champagne)]">hàng nghìn</span> sinh viên.
              </h2>
              <p className="mt-5 text-white/75 leading-relaxed">
                Tham gia các kênh cộng đồng chính thức để cập nhật lịch sinh hoạt, sự kiện và cơ hội học bổng.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://zalo.me/0962445963"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vt-btn vt-btn--accent justify-center"
                >
                  <MessageCircle size={16} />
                  Zalo cộng đồng
                </a>
                <a
                  href="https://www.facebook.com/Englishvantrang"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vt-btn vt-btn--ghost justify-center border border-white/25 text-white hover:bg-white/10"
                >
                  Facebook group
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ModernPublicLayout>
  );
}
