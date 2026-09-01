// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User,
  Phone,
  GraduationCap,
  ArrowRight,
  Loader2,
  ShieldCheck,
  X,
  Sparkles,
  BookOpenCheck,
  CalendarCheck2,
  Award,
} from 'lucide-react';
import OverlayPortal from '../../components/ui/OverlayPortal';
import api from '../../services/api';
import SEO from '../../components/common/SEO';
import { getStorageValue, removeStorageValue, setStorageValue } from '../../utils/browser-storage.js';
import '../../styles/public/UnifiedLogin.css';

// Validation Schemas — student only (teacher logs in via /admin/login)
const TEST_STUDENT_CCCD_REGEX = /^(?:00[1-9]|001[0-9])$/;
const STUDENT_LOGIN_IDENTIFIER_REGEX = /^(?:test123|[0-9\s\-.]{7,20}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

const studentSchema = z.object({
  cccd: z.string().refine(
    (value) => /^\d{9,12}$/.test(value) || TEST_STUDENT_CCCD_REGEX.test(value),
    'CCCD/CMND không hợp lệ'
  ),
  sdt: z.string().regex(STUDENT_LOGIN_IDENTIFIER_REGEX, 'Thông tin đăng nhập không hợp lệ'),
});

const saveSession = (key, value, remember) => {
  setStorageValue(key, value, remember ? 'local' : 'session');
};

const getSession = (key) => getStorageValue(key);

function isValidStudentSession() {
  const token = getStorageValue('student_token');
  if (!token) return false;
  const raw = getStorageValue('student_data');
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    removeStorageValue('student_data');
    return false;
  }
}

function normalizeInternalPath(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showStudentForgotModal, setShowStudentForgotModal] = useState(false);

  const studentForm = useForm({ resolver: zodResolver(studentSchema) });

  useEffect(() => {
    if (searchParams.get('ticket')) return;
    // Don't auto-redirect away from login; let user see the login page first
  }, [searchParams]);

  useEffect(() => {
    const ticket = searchParams.get('ticket');
    if (!ticket) return;

    let cancelled = false;

    const resolveNextPath = (userType, handoffReturnTo) => {
      const requestedReturnTo = normalizeInternalPath(handoffReturnTo) || normalizeInternalPath(searchParams.get('return_to'));
      if (requestedReturnTo) return requestedReturnTo;
      if (userType === 'admin') return '/admin/dashboard';
      return '/dashboard/exams';
    };

    const exchangeTicket = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.exchangeSsoTicket(ticket, 'edu');
        if (cancelled) return;

        const nextPath = resolveNextPath(response?.user?.type, response?.return_to);

        if (response?.user?.type === 'admin') {
          if (response.token) saveSession('admin_token', response.token, false);
          saveSession('admin', JSON.stringify({
            id: response.user.id,
            username: response.user.username || response.user.name || 'admin',
            full_name: response.user.name || response.user.username || 'Admin',
            role: response.user.role || 'admin',
            teacher_code: response.user.teacher_code || undefined,
          }), false);
          navigate(nextPath, { replace: true });
          return;
        }

        if (response?.user?.type === 'student') {
          if (response.token) saveSession('student_token', response.token, false);
          if (response.user.cccd) {
            saveSession('student_cccd', response.user.cccd, false);
            saveSession('studentCCCD', response.user.cccd, false);
          }
          if (response.user.phone) saveSession('student_sdt', response.user.phone, false);

          if (response.user.cccd) {
            const profile = await api.getStudentByCCCD(response.user.cccd);
            if (profile?.success && profile?.data) {
              saveSession('student_data', JSON.stringify(profile.data), false);
            }
          }

          window.location.replace(nextPath);
          return;
        }

        throw new Error('SSO ticket không hợp lệ cho ứng dụng này');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không thể hoàn tất đăng nhập.');
          setIsLoading(false);
        }
      }
    };

    void exchangeTicket();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  const handleStudentLogin = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.loginStudent(data.cccd, data.sdt);
      if (response.success && response.data) {
        if (response.token) saveSession('student_token', response.token, rememberMe);
        saveSession('student_cccd', data.cccd, rememberMe);
        saveSession('student_sdt', data.sdt, rememberMe);
        saveSession('student_data', JSON.stringify(response.data), rememberMe);
        if (searchParams.get('return_to')) {
          navigate(searchParams.get('return_to'), { replace: true });
        } else {
          navigate('/dashboard/exams', { replace: true });
        }
      } else {
        setError('Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại CCCD và số điện thoại hoặc email.');
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối Internet và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = 'w-full h-12 pl-10 sm:pl-11 pr-4 rounded-xl border border-[var(--vt-line-strong)] bg-white text-[var(--vt-ink)] placeholder:text-[var(--vt-ink-40)] focus:outline-none focus:ring-4 focus:ring-[var(--vt-emerald)]/15 focus:border-[var(--vt-emerald)] transition-colors';

  return (
    <div className="vt-login-page min-h-screen grid lg:grid-cols-[1fr_1fr] bg-[var(--vt-paper)] text-[var(--vt-ink)]">
      <SEO
        title="Đăng nhập"
        description="Đăng nhập cổng thông tin sinh viên của Vân Trang Education."
        url="/login"
        noindex
      />

      {/* Left — Editorial brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-[var(--vt-ink)] text-white min-h-screen">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[22rem] w-[22rem] rounded-full bg-[var(--vt-emerald)]/15 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Van Trang Education"
              className="h-14 w-auto object-contain"
              onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
            />
            <div className="leading-none">
              <p className="vt-display text-2xl text-white"
                 style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                Vân Trang
              </p>
              <p className="mt-1.5 text-[10px] tracking-[0.28em] font-bold uppercase text-[var(--vt-champagne)]">
                Education
              </p>
            </div>
          </Link>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="vt-eyebrow !text-[var(--vt-champagne)]">Cổng học viên · Vân Trang</p>
          <h2 className="mt-5 text-[clamp(2.6rem,4.6vw,4.5rem)] font-extrabold leading-[0.96] tracking-[-0.045em] text-white">
            Học tập, lịch thi và chứng chỉ trong một nơi.
          </h2>
          <p className="mt-6 max-w-md text-base leading-8 text-white/68">
            Đăng nhập để theo dõi lớp đang học, lịch thi sắp tới, học phí, tài liệu và hồ sơ chứng chỉ đã cấp.
          </p>

          <div className="mt-10 grid gap-3 max-w-lg">
            {[
              { icon: BookOpenCheck, title: 'Lớp học rõ ràng', desc: 'Xem lớp đã đăng ký, trạng thái duyệt và lịch học.' },
              { icon: CalendarCheck2, title: 'Lịch thi dễ theo dõi', desc: 'Nắm ngày thi, giờ thi và thông tin chuẩn bị.' },
              { icon: Award, title: 'Chứng chỉ minh bạch', desc: 'Tra cứu kết quả và hồ sơ học tập sau khi hoàn thành.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.085] hover:border-white/20">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--vt-champagne)]/15 text-[var(--vt-champagne)]">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{title}</span>
                  <span className="mt-1 block text-sm leading-6 text-white/55">{desc}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { num: '500+', label: 'Học viên' },
              { num: '10+', label: 'Năm KN' },
              { num: '24h', label: 'Hỗ trợ' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-2xl font-extrabold tracking-[-0.04em] text-white">{s.num}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[11px] tracking-[0.14em] uppercase text-white/45">
          © {new Date().getFullYear()} VAN TRANG EDUCATION
        </div>
      </aside>

      {/* Right — Login form */}
      <main className="relative flex items-center justify-center overflow-hidden p-4 sm:p-8 md:p-12 bg-[var(--vt-paper)]">
        <div aria-hidden="true" className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-[var(--vt-emerald-soft)] blur-3xl" />
        <div aria-hidden="true" className="absolute -left-24 bottom-8 h-72 w-72 rounded-full bg-[var(--vt-champagne-soft)] blur-3xl" />
        <div className="relative z-10 w-full max-w-[31rem] space-y-7">
          {/* Mobile brand */}
          <Link to="/" className="lg:hidden inline-flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Van Trang Education"
              className="h-11 w-auto object-contain"
              onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
            />
            <p className="vt-display text-xl text-[var(--vt-ink)]"
               style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
              Vân Trang
            </p>
          </Link>

          <div className="text-center lg:text-left">
            <p className="vt-eyebrow justify-center lg:justify-start">Cổng thông tin · Học viên</p>
            <h1 className="mt-4 text-[clamp(2.15rem,4vw,3.15rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-[var(--vt-ink)]">
              Chào mừng trở lại.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[var(--vt-ink-60)] leading-7 lg:mx-0">
              Truy cập hồ sơ học tập, lịch học, lịch thi và chứng chỉ trong vài giây.
            </p>
          </div>

          {searchParams.get('reason') === 'security_update' && (
            <div className="p-4 rounded-xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] text-sm border border-[var(--vt-emerald)]/25 flex items-start gap-3">
              <ShieldCheck size={18} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Hệ thống vừa cập nhật bảo mật. Vui lòng đăng nhập lại để tiếp tục sử dụng đầy đủ tính năng.
              </p>
            </div>
          )}

          <div className="flex justify-center lg:justify-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] text-xs font-semibold uppercase tracking-[0.14em]">
              <GraduationCap size={14} />
              Đăng nhập sinh viên
            </div>
          </div>

          <div className="vt-paper-card !rounded-[2rem] !p-6 sm:!p-8 shadow-[0_28px_80px_rgba(15,35,50,0.13)]">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 p-4 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200/70 flex items-start gap-3"
              >
                <span className="font-bold shrink-0 mt-0.5">⚠</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={studentForm.handleSubmit(handleStudentLogin)} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="cccd" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                  Số CCCD/CMND
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--vt-ink-40)]" />
                  <input
                    id="cccd"
                    name="cccd"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ví dụ: 001202012345"
                    className={inputCls}
                    {...studentForm.register('cccd')}
                  />
                </div>
                {studentForm.formState.errors.cccd && (
                  <p className="text-xs text-red-600 font-medium">{studentForm.formState.errors.cccd.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="sdt" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                  Số điện thoại hoặc email
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--vt-ink-40)]" />
                  <input
                    id="sdt"
                    name="sdt"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="09xx xxx xxx hoặc email@..."
                    className={inputCls}
                    {...studentForm.register('sdt')}
                  />
                </div>
                {studentForm.formState.errors.sdt && (
                  <p className="text-xs text-red-600 font-medium">{studentForm.formState.errors.sdt.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none min-h-[44px] min-w-[44px] py-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--vt-line-strong)] text-[var(--vt-emerald-deep)] focus:ring-[var(--vt-emerald)]/30 cursor-pointer"
                  />
                  <span className="text-sm text-[var(--vt-ink-70)]">Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowStudentForgotModal(true)}
                  className="text-sm text-[var(--vt-ink-50)] hover:text-[var(--vt-emerald-deep)] hover:underline underline-offset-2 transition-colors"
                >
                  Quên thông tin?
                </button>
              </div>

              <button
                type="submit"
                className="vt-btn vt-btn--primary w-full justify-center !h-12 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập ngay
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="rounded-2xl bg-[var(--vt-paper-warm)] p-4 text-center border border-[var(--vt-emerald)]/20">
                <p className="text-sm text-[var(--vt-ink-60)]">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="font-bold text-[var(--vt-emerald-deep)] underline underline-offset-2 hover:text-[var(--vt-ink)] transition-colors">
                    Đăng ký học viên tại đây →
                  </Link>
                </p>
              </div>

              <div className="text-center border-t border-[var(--vt-line)] pt-5">
                <p className="text-xs text-[var(--vt-ink-50)]">
                  Bạn là giảng viên?{' '}
                  <Link to="/admin/login" className="font-semibold text-[var(--vt-ink-70)] hover:text-[var(--vt-emerald-deep)] hover:underline underline-offset-2 transition-colors">
                    Đăng nhập tại đây
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Trust signal */}
          <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.16em] text-[var(--vt-ink-50)]">
            <Sparkles size={12} className="text-[var(--vt-champagne-deep)]" />
            Bảo mật theo chuẩn TLS 1.3
          </div>
        </div>
      </main>

      {/* Forgot password modal */}
      {showStudentForgotModal && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-[var(--vt-ink)]/55 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) setShowStudentForgotModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-[var(--vt-shadow-deep)] w-full max-w-sm p-7 relative animate-in fade-in zoom-in-95 border border-[var(--vt-line-strong)]">
              <button
                onClick={() => setShowStudentForgotModal(false)}
                className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--vt-ink-40)] hover:text-[var(--vt-ink)] transition-colors"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-5">
                <div className="mx-auto h-14 w-14 rounded-full bg-[var(--vt-emerald-soft)] grid place-items-center">
                  <Phone size={22} className="text-[var(--vt-emerald-deep)]" />
                </div>

                <div>
                  <h2 id="modal-title" className="vt-display text-xl text-[var(--vt-ink)]"
                      style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                    Liên hệ quản trị viên
                  </h2>
                  <p className="text-sm text-[var(--vt-ink-60)] mt-2 leading-relaxed">
                    Tài khoản sinh viên dùng CCCD và số điện thoại hoặc email đã đăng ký. Nếu bạn quên hoặc
                    cần reset, vui lòng liên hệ:
                  </p>
                </div>

                <div className="bg-[var(--vt-paper-soft)] border border-[var(--vt-line)] rounded-xl p-4 space-y-2">
                  <p className="vt-overline text-[10px] text-[var(--vt-ink-60)]">Zalo · Admin</p>
                  <a
                    href="https://zalo.me/0962449563"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vt-display text-2xl text-[var(--vt-emerald-deep)] hover:text-[var(--vt-ink)] transition-colors block"
                    style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                  >
                    096 244 9563
                  </a>
                  <p className="text-xs text-[var(--vt-ink-50)]">Hỗ trợ: 7:30 – 17:00 (Thứ 2 – Thứ 7)</p>
                </div>

                <button
                  onClick={() => setShowStudentForgotModal(false)}
                  className="vt-btn vt-btn--primary w-full justify-center"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
