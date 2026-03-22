import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import Layout from '../../../components/layout/Layout';
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
            <p>Bạn sẽ được chuyển đến trang đăng nhập...</p>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                minLength={6}
                autoComplete="new-password"
              />
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
