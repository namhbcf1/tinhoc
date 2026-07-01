// @ts-nocheck
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import { ScrollText, UserCheck, Copyright, RefreshCw } from 'lucide-react';

const sections = [
  {
    Icon: ScrollText,
    eyebrow: '01 · Phạm vi',
    title: 'Phạm vi áp dụng',
    content:
      'Điều khoản này áp dụng cho việc truy cập website, sử dụng biểu mẫu đăng ký, công cụ tra cứu và toàn bộ các tính năng công khai do Vân Trang Education cung cấp tại vantrangedu.com và các tên miền liên kết.',
  },
  {
    Icon: UserCheck,
    eyebrow: '02 · Người dùng',
    title: 'Trách nhiệm người dùng',
    content:
      'Người dùng cần cung cấp thông tin trung thực, không sử dụng website để gây rối, thu thập dữ liệu trái phép, xâm phạm hệ thống, mạo danh tổ chức hoặc cá nhân khác. Vi phạm có thể dẫn đến việc tạm khoá hoặc xoá vĩnh viễn tài khoản.',
  },
  {
    Icon: Copyright,
    eyebrow: '03 · Sở hữu',
    title: 'Nội dung và quyền sở hữu',
    content:
      'Nội dung, thương hiệu, tài liệu giảng dạy và cấu trúc website thuộc quyền quản lý của Vân Trang Education hoặc các bên cấp phép liên quan. Việc sao chép, phân phối thương mại hoặc tái xuất bản trái phép đều bị nghiêm cấm.',
  },
  {
    Icon: RefreshCw,
    eyebrow: '04 · Cập nhật',
    title: 'Điều chỉnh dịch vụ',
    content:
      'Chúng tôi có thể cập nhật nội dung, route, chức năng hoặc điều khoản khi cần thiết để phù hợp với vận hành thực tế và yêu cầu pháp lý. Các thay đổi quan trọng sẽ được thông báo trực tiếp trên website ít nhất 7 ngày trước khi áp dụng.',
  },
];

export default function TermsPage() {
  return (
    <ModernPublicLayout>
      <SEO
        title="Điều khoản sử dụng"
        description="Điều khoản sử dụng website và các dịch vụ công khai của Vân Trang Education."
        url="/terms"
        structuredData={{
          '@type': 'WebPage',
          name: 'Dieu khoan su dung',
          description: 'Dieu khoan su dung website cua Van Trang Education.',
          url: 'https://vantrangedu.com/terms',
        }}
      />

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[22rem] w-[22rem] rounded-full bg-[var(--vt-emerald)]/18 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vt-champagne)]">
              <ScrollText size={13} />
              Tài liệu pháp lý · Cập nhật {new Date().getFullYear()}
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Điều khoản{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">sử dụng.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-white/75">
              Khi truy cập và sử dụng website, bạn đồng ý tuân thủ các quy định dưới đây trong phạm vi tính năng công khai và các biểu mẫu liên quan của Vân Trang Education.
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
                  <span className="h-12 w-12 rounded-2xl bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] grid place-items-center">
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
