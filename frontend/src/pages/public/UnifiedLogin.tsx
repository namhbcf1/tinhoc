import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Phone, GraduationCap, ArrowRight, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent } from '../../components/ui/Card';
import OverlayPortal from '../../components/ui/OverlayPortal';
import api from '../../services/api';
import SEO from '../../components/common/SEO';
import { getStorageValue, removeStorageValue, setStorageValue } from '../../utils/browser-storage.js';

// Validation Schemas — student only (teacher logs in via /admin/login)
const TEST_STUDENT_CCCD_REGEX = /^(?:00[1-9]|001[0-9])$/;
const PHONE_OR_TEST_PASSWORD_REGEX = /^(?:(0|\+84)\d{9}|test123)$/;

const studentSchema = z.object({
  cccd: z.string().refine(
    (value) => /^\d{9,12}$/.test(value) || TEST_STUDENT_CCCD_REGEX.test(value),
    'CCCD/CMND không hợp lệ'
  ),
  sdt: z.string().regex(PHONE_OR_TEST_PASSWORD_REGEX, 'Thông tin đăng nhập không hợp lệ'),
});

// Storage helpers: chọn localStorage (persist) hoặc sessionStorage (clear on close)
const saveSession = (key, value, remember) => {
  setStorageValue(key, value, remember ? 'local' : 'session');
};

// Đọc từ cả hai storage (ưu tiên localStorage trước)
const getSession = (key) => getStorageValue(key);

// Kiểm tra student_data có hợp lệ không
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
    if (parsed.origin !== window.location.origin) {
      return null;
    }
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

  // --- Auto-redirect nếu đã có session hợp lệ ---
  useEffect(() => {
    if (searchParams.get('ticket')) {
      return;
    }
    if (isValidStudentSession()) {
      window.location.replace('/dashboard/exams');
      return;
    }
  }, [navigate, searchParams]);

  useEffect(() => {
    const ticket = searchParams.get('ticket');
    if (!ticket) {
      return;
    }

    let cancelled = false;

    const resolveNextPath = (userType, handoffReturnTo) => {
      const requestedReturnTo = normalizeInternalPath(handoffReturnTo) || normalizeInternalPath(searchParams.get('return_to'));
      if (requestedReturnTo) {
        return requestedReturnTo;
      }

      // Teacher is now admin — redirect to admin dashboard
      if (userType === 'admin') {
        return '/admin/dashboard';
      }

      return '/dashboard/exams';
    };

    const exchangeTicket = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.exchangeSsoTicket(ticket, 'edu');
        if (cancelled) {
          return;
        }

        const nextPath = resolveNextPath(response?.user?.type, response?.return_to);

        if (response?.user?.type === 'admin') {
          if (response.token) {
            saveSession('admin_token', response.token, false);
          }
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
          if (response.token) {
            saveSession('student_token', response.token, false);
          }

          if (response.user.cccd) {
            saveSession('student_cccd', response.user.cccd, false);
            saveSession('studentCCCD', response.user.cccd, false);
          }
          if (response.user.phone) {
            saveSession('student_sdt', response.user.phone, false);
          }

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
          setError(err.message || 'Không thể hoàn tất đăng nhập một lần.');
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
        if (response.token) {
          saveSession('student_token', response.token, rememberMe);
        }
        saveSession('student_cccd', data.cccd, rememberMe);
        saveSession('student_sdt', data.sdt, rememberMe);
        saveSession('student_data', JSON.stringify(response.data), rememberMe);
        window.location.assign('/dashboard/exams');
      } else {
        setError('Thông tin đăng nhập không chính xác. Vui lòng thử lại.');
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <SEO
        title="Dang nhap"
        description="Dang nhap cong thong tin sinh vien cua Van Trang Education."
        url="/login"
        noindex
      />
      {/* Left Side - Hero/Image - Light Theme */}
      <div className="hidden lg:flex flex-col justify-between bg-green-50 text-slate-800 p-10 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-green-100 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-100 blur-3xl opacity-50"></div>

        <div className="relative z-20">
          <Link to="/" className="inline-block hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/logo.jpg";
              }}
            />
          </Link>
        </div>

        <div className="relative z-20 max-w-lg">
          <blockquote className="space-y-4">
            <p className="text-3xl font-bold leading-tight text-slate-900">
              "Giáo dục là tấm hộ chiếu cho tương lai, ngày mai thuộc về những người chuẩn bị cho nó ngay hôm nay."
            </p>
            <footer className="text-slate-600 font-medium">— Malcolm X</footer>
          </blockquote>
        </div>

        <div className="relative z-20 text-sm text-slate-500">
          © {new Date().getFullYear()} CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG.
        </div>
      </div>

      {/* Right Side - Student Login Form */}
      <div className="flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chào mừng trở lại</h1>
            <p className="text-slate-500 mt-2">Đăng nhập để truy cập tài khoản của bạn</p>
          </div>

          {searchParams.get('reason') === 'security_update' && (
            <div className="p-4 rounded-lg bg-blue-50 text-blue-700 text-sm border border-blue-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <ShieldCheck size={20} className="shrink-0" />
              <p>Hệ thống vừa cập nhật bảo mật. Vui lòng đăng nhập lại để tiếp tục sử dụng đầy đủ tính năng.</p>
            </div>
          )}

          {/* Student login indicator */}
          <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-green-700 bg-green-50 rounded-lg">
            <GraduationCap size={18} /> Đăng nhập sinh viên
          </div>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-6">
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-6 p-4 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
                >
                  <span className="font-bold shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={studentForm.handleSubmit(handleStudentLogin)}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="cccd" className="text-slate-700">Số CCCD/CMND</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="cccd"
                      name="username"
                      autoComplete="username"
                      placeholder="Nhập số CCCD/CMND"
                      className="pl-10 border-slate-200 focus:border-green-500 focus:ring-green-500"
                      {...studentForm.register('cccd')}
                    />
                  </div>
                  {studentForm.formState.errors.cccd && (
                    <p className="text-xs text-red-500 font-medium">{studentForm.formState.errors.cccd.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sdt" className="text-slate-700">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="sdt"
                      name="sdt"
                      type="text"
                      autoComplete="tel"
                      placeholder="Nhập số điện thoại"
                      className="pl-10 border-slate-200 focus:border-green-500 focus:ring-green-500"
                      {...studentForm.register('sdt')}
                    />
                  </div>
                  {studentForm.formState.errors.sdt && (
                    <p className="text-xs text-red-500 font-medium">{studentForm.formState.errors.sdt.message}</p>
                  )}
                </div>

                {/* Remember Me + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                    <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowStudentForgotModal(true)}
                    className="text-sm text-slate-500 hover:text-green-600 hover:underline transition-colors"
                  >
                    Quên thông tin?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
                  disabled={isLoading}
                >
                  {isLoading
                    ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang đăng nhập...</>
                    : <><ArrowRight className="mr-2 h-5 w-5" /> Đăng nhập ngay</>
                  }
                </Button>

                <div className="text-center pt-2">
                  <p className="text-sm text-slate-500">
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="font-bold text-green-600 hover:underline hover:text-green-700 transition-colors">
                      Đăng ký tại đây
                    </Link>
                  </p>
                </div>

                {/* Teacher login redirect */}
                <div className="text-center border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400">
                    Bạn là giáo viên?{' '}
                    <Link to="/admin/login" className="font-bold text-blue-600 hover:underline">
                      Đăng nhập tại đây
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== MODAL: Quên thông tin? (Sinh viên) ===== */}
      {showStudentForgotModal && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => { if (e.target === e.currentTarget) setShowStudentForgotModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowStudentForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Phone size={24} className="text-green-600" />
              </div>

              <div>
                <h2 id="modal-title" className="text-lg font-bold text-slate-900">Liên hệ quản trị viên</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tài khoản sinh viên dùng CCCD và số điện thoại đã đăng ký. Nếu bạn quên hoặc cần reset, vui lòng liên hệ:
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Zalo Admin</p>
                <a
                  href="https://zalo.me/0962445963"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl font-bold text-green-700 hover:text-green-800 hover:underline transition-colors block"
                >
                  0962 445 963
                </a>
                <p className="text-xs text-slate-500">Giờ hỗ trợ: 7:30 – 17:00 (Thứ 2 – Thứ 7)</p>
              </div>

              <Button
                onClick={() => setShowStudentForgotModal(false)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                Đã hiểu
              </Button>
            </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
