// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import { ShieldCheck, Database, Lock, Mail } from 'lucide-react';

const sections = [
  {
    Icon: Database,
    eyebrow: '01 · Dữ liệu',
    title: 'Thông tin chúng tôi thu thập',
    content:
      'Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký, liên hệ, tra cứu hoặc sử dụng các dịch vụ trên website — bao gồm họ tên, CCCD/CMND, số điện thoại, email và dữ liệu hồ sơ học tập — phục vụ việc xử lý hồ sơ, hỗ trợ và cải thiện chất lượng dịch vụ.',
  },
  {
    Icon: ShieldCheck,
    eyebrow: '02 · Mục đích',
    title: 'Mục đích sử dụng',
    content:
      'Dữ liệu được sử dụng để xác nhận danh tính, tư vấn khoá học, thông báo lịch học và lịch thi, xử lý hồ sơ chứng chỉ, và đảm bảo vận hành an toàn của hệ thống. Chúng tôi không sử dụng dữ liệu cá nhân cho mục đích quảng cáo bên thứ ba.',
  },
  {
    Icon: Lock,
    eyebrow: '03 · Bảo mật',
    title: 'Bảo mật và lưu trữ',
    content:
      'Mọi thông tin cá nhân được mã hoá theo chuẩn TLS 1.3 khi truyền và lưu trữ trên hạ tầng đám mây có chứng nhận an toàn. Chúng tôi áp dụng quy trình kiểm soát truy cập nội bộ để hạn chế truy cập trái phép, mất dữ liệu hoặc sử dụng sai mục đích.',
  },
  {
    Icon: Mail,
    eyebrow: '04 · Liên hệ',
    title: 'Yêu cầu chỉnh sửa hoặc xoá dữ liệu',
    content:
      'Bạn có quyền yêu cầu chỉnh sửa, cập nhật hoặc xoá dữ liệu cá nhân khỏi hệ thống. Vui lòng liên hệ Vân Trang Education qua hotline 096 244 5963 hoặc email info@vantrangedu.edu.vn — chúng tôi sẽ phản hồi trong vòng 48 giờ làm việc.',
  },
];

export default function PrivacyPage() {
  return (
    <ModernPublicLayout>
      <SEO
        title="Chính sách bảo mật"
        description="Thông tin về cách Vân Trang Education thu thập, sử dụng và bảo vệ dữ liệu cá nhân của học viên trên website."
        url="/privacy"
        structuredData={{
          '@type': 'WebPage',
          name: 'Chinh sach bao mat',
          description: 'Chinh sach bao mat du lieu cua Van Trang Education.',
          url: 'https://vantrangedu.com/privacy',
        }}
      />

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-emerald)]/18 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[22rem] w-[22rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vt-champagne)]">
              <ShieldCheck size={13} />
              Tài liệu pháp lý · Cập nhật {new Date().getFullYear()}
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Chính sách{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">bảo mật.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-white/75">
              Tài liệu này mô tả cách Vân Trang Education thu thập, xử lý và bảo vệ thông tin cá nhân của học viên — phù hợp với Luật An toàn thông tin mạng và quy định bảo vệ dữ liệu cá nhân của Việt Nam.
            </p>
          </div>
        </div>

        <div className="vt-fine-divider" aria-hidden="true" />
      </section>

      {/* Document body */}
      <section className="vt-section bg-[var(--vt-ivory)]">
        <div className="vt-container max-w-4xl">
          <div className="space-y-6">
            {sections.map((s) => (
              <article
                key={s.title}
                className="vt-paper-card p-7 md:p-9 flex flex-col md:flex-row gap-6"
              >
                <div className="shrink-0">
                  <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center">
                    <s.Icon size={22} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="vt-overline text-[10px] text-[var(--vt-ink-50)]">{s.eyebrow}</p>
                  <h2
                    className="vt-display mt-2 text-xl md:text-2xl text-[var(--vt-ink)] leading-tight"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    {s.title}
                  </h2>
                  <p className="mt-3 text-[15px] leading-[1.75] text-[var(--vt-ink-70)]">
                    {s.content}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-[var(--vt-ink-50)] italic">
            Tài liệu được rà soát định kỳ. Phiên bản gần nhất: tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}.
          </p>
        </div>
      </section>
    </ModernPublicLayout>
  );
}
