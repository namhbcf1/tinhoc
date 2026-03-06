import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Lock, Phone, GraduationCap, School, ArrowRight, Loader2, ShieldCheck, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import api from '../../services/api';

// Validation Schemas
const studentSchema = z.object({
  cccd: z.string().min(9, 'CCCD/CMND phải có ít nhất 9 số').max(12, 'CCCD/CMND tối đa 12 số'),
  sdt: z.string().regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ'),
});

const teacherSchema = z.object({
  teacher_code: z.string().min(1, 'Vui lòng nhập mã giáo viên'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

// Storage helpers: chọn localStorage (persist) hoặc sessionStorage (clear on close)
const saveSession = (key, value, remember) => {
  if (remember) {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  }
};

// Đọc từ cả hai storage (ưu tiên localStorage trước)
const getSession = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);

// Kiểm tra student_data có hợp lệ không (JSON object, không phải "[object Object]" hoặc rác)
function isValidStudentSession() {
  const raw = localStorage.getItem('student_data') || sessionStorage.getItem('student_data');
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    // Data bị corrupt — xóa luôn để tránh loop
    localStorage.removeItem('student_data');
    sessionStorage.removeItem('student_data');
    return false;
  }
}

// Xóa toàn bộ session của student khỏi CẢ HAI storage
function clearStudentSession() {
  ['student_data', 'student_cccd', 'student_sdt', 'student_token', 'studentCCCD'].forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export default function UnifiedLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Modal "Quên mật khẩu?" cho sinh viên
  const [showStudentForgotModal, setShowStudentForgotModal] = useState(false);

  // Forms
  const studentForm = useForm({ resolver: zodResolver(studentSchema) });
  const teacherForm = useForm({ resolver: zodResolver(teacherSchema) });

  // --- Auto-redirect nếu đã có session hợp lệ ---
  useEffect(() => {
    const teacherToken = getSession('teacher_token');
    if (teacherToken) {
      navigate('/teacher/dashboard');
      return;
    }
    if (isValidStudentSession()) {
      navigate('/dashboard/exams');
      return;
    }
    // Nếu có student_data nhưng corrupt → đã bị clearStudentSession() trong isValidStudentSession
    // Không redirect — cho user đăng nhập lại bình thường
  }, [navigate]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['student', 'teacher'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const onTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setRememberMe(false);
    studentForm.reset();
    teacherForm.reset();
  };

  const handleStudentLogin = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.loginStudent(data.cccd, data.sdt);
      if (response.success && response.data) {
        // Sinh viên không có token — lưu credentials theo remember me
        saveSession('student_cccd', data.cccd, rememberMe);
        saveSession('student_sdt', data.sdt, rememberMe);
        saveSession('student_data', JSON.stringify(response.data), rememberMe);
        navigate('/dashboard/exams');
      } else {
        setError('Thông tin đăng nhập không chính xác. Kiểm tra lại CCCD và số điện thoại.');
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherLogin = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.loginTeacher(data.teacher_code, data.password);
      if (response.success && response.token) {
        saveSession('teacher_token', response.token, rememberMe);
        saveSession('teacher', JSON.stringify(response.teacher), rememberMe);
        navigate('/teacher/dashboard');
      } else {
        setError(response.message || 'Mã giáo viên hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
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

      {/* Right Side - Form - Light Theme */}
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

          {/* Tab switcher — ARIA pattern */}
          <div className="flex p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="Loại tài khoản">
            <button
              role="tab"
              id="tab-student"
              aria-selected={activeTab === 'student'}
              aria-controls="tabpanel-student"
              onClick={() => onTabChange('student')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === 'student' ? "bg-white shadow-sm text-green-700 font-bold" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <GraduationCap size={18} /> Sinh viên
            </button>
            <button
              role="tab"
              id="tab-teacher"
              aria-selected={activeTab === 'teacher'}
              aria-controls="tabpanel-teacher"
              onClick={() => onTabChange('teacher')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                activeTab === 'teacher' ? "bg-white shadow-sm text-blue-700 font-bold" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <School size={18} /> Giáo viên
            </button>
          </div>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-6">
              {/* Error alert */}
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

              {/* ===== STUDENT FORM ===== */}
              {activeTab === 'student' && (
                <form
                  id="tabpanel-student"
                  role="tabpanel"
                  aria-labelledby="tab-student"
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
                        type="tel"
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

                  {/* Remember Me + Forgot (Student) */}
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
                </form>
              )}

              {/* ===== TEACHER FORM ===== */}
              {activeTab === 'teacher' && (
                <form
                  id="tabpanel-teacher"
                  role="tabpanel"
                  aria-labelledby="tab-teacher"
                  onSubmit={teacherForm.handleSubmit(handleTeacherLogin)}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <Label htmlFor="teacher_code" className="text-slate-700">Mã giáo viên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="teacher_code"
                        name="username"
                        autoComplete="username"
                        placeholder="Ví dụ: GV001"
                        className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        {...teacherForm.register('teacher_code')}
                      />
                    </div>
                    {teacherForm.formState.errors.teacher_code && (
                      <p className="text-xs text-red-500 font-medium">{teacherForm.formState.errors.teacher_code.message}</p>
                    )}
                    <p className="text-xs text-slate-400">Mã giáo viên được cung cấp bởi phòng đào tạo</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showTeacherPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                        {...teacherForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPassword(prev => !prev)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showTeacherPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showTeacherPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {teacherForm.formState.errors.password && (
                      <p className="text-xs text-red-500 font-medium">{teacherForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  {/* Remember Me + Forgot Password (Teacher) */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-slate-600">Ghi nhớ đăng nhập</span>
                    </label>
                    <Link
                      to="/admin/reset-password"
                      className="text-sm text-slate-500 hover:text-blue-600 hover:underline transition-colors"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang đăng nhập...</>
                      : 'Đăng nhập'
                    }
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== MODAL: Quên thông tin? (Sinh viên) ===== */}
      {showStudentForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowStudentForgotModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in-95">
            {/* Close button */}
            <button
              onClick={() => setShowStudentForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>

            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Phone size={24} className="text-green-600" />
              </div>

              <div>
                <h2 id="modal-title" className="text-lg font-bold text-slate-900">Liên hệ quản trị viên</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tài khoản sinh viên dùng CCCD và số điện thoại đã đăng ký. Nếu bạn quên hoặc cần reset, vui lòng liên hệ:
                </p>
              </div>

              {/* Zalo contact */}
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
      )}
    </div>
  );
}
