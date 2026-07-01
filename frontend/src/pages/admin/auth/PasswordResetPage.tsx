// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import Layout from '../../../components/layout/Layout';
import { Eye, EyeOff } from 'lucide-react';
import '../../../styles/admin/PasswordResetPage.css';

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate('/admin/login');
    }
  }, [success, countdown, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!token) {
      setError('Token không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const response = await api.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/admin/login');
        }, 2000);
      } else {
        setError(response.error || 'Lỗi đặt lại mật khẩu');
      }
    } catch (err) {
      setError(err.message || 'Lỗi đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="password-reset-page">
          <div className="password-reset-card">
            <h1>❌ Token không hợp lệ</h1>
            <p>Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
            <button onClick={() => navigate('/admin/login')} className="btn-primary">
              Quay lại đăng nhập
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (success) {
    return (
      <Layout>
        <div className="password-reset-page">
          <div className="password-reset-card success">
            <h1>✅ Đặt lại mật khẩu thành công!</h1>
            <p>Tự động chuyển về trang đăng nhập sau {countdown} giây...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="password-reset-page">
        <div className="password-reset-card">
          <h1>🔐 Đặt lại mật khẩu</h1>
          <p>Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>

          <form onSubmit={handleSubmit} className="password-reset-form">
            <input
              type="text"
              name="username"
              autoComplete="username"
              value="admin"
              readOnly
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <div className="form-group">
              <label>Mật khẩu mới</label>
              <div className="password-input-wrapper" style={{position:'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#888',padding:'8px'}}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Xác nhận mật khẩu</label>
              <div className="password-input-wrapper" style={{position:'relative'}}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#888',padding:'8px'}}
                  aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn-primary btn-large"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
