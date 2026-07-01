// @ts-nocheck
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, GraduationCap, ShieldCheck } from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';

export default function StudentPortalPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login?tab=student');
    }, 1200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <ModernPublicLayout>
      <SEO
        title="Cổng thông tin sinh viên"
        description="Trang chuyển hướng đến khu vực đăng nhập và quản lý học tập dành cho sinh viên VanTrangEdu."
        url="/student-portal"
        noindex
      />

      <div className="relative min-h-[80vh] overflow-hidden bg-[var(--vt-ink)] text-white flex items-center justify-center px-5 py-20">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-emerald)]/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-[var(--vt-champagne)]/15 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-md w-full text-center">
          <div
            className="mx-auto mb-7 h-16 w-16 rounded-2xl border border-[var(--vt-champagne)]/30 bg-white/5 backdrop-blur-sm grid place-items-center"
            aria-hidden="true"
          >
            <GraduationCap size={26} className="text-[var(--vt-champagne)]" />
          </div>

          <p className="vt-eyebrow !text-[var(--vt-champagne)]">Cổng học viên · Đang chuyển hướng</p>

          <h1
            className="vt-display mt-4 text-[clamp(1.75rem,4.5vw,2.5rem)] leading-[1.1] text-white"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
          >
            Đang dẫn bạn đến{' '}
            <span className="vt-display-italic text-[var(--vt-champagne)]">khu vực sinh viên.</span>
          </h1>

          <p className="mt-5 text-white/70 leading-relaxed text-sm">
            Hệ thống đang xác thực phiên truy cập. Bạn sẽ được điều hướng tới trang đăng nhập trong giây lát.
          </p>

          <div className="mt-9 inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/8 border border-white/15 text-sm font-medium text-white/85">
            <Loader2 size={16} className="animate-spin text-[var(--vt-champagne)]" />
            Đang chuyển hướng...
          </div>

          <div className="mt-10 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
            <ShieldCheck size={12} className="text-[var(--vt-champagne)]" />
            Phiên truy cập mã hoá TLS 1.3
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
