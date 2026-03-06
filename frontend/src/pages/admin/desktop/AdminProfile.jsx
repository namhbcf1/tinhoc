import { useState, useEffect } from 'react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import './AdminProfile.css';

export default function AdminProfile({ admin, onUpdate }) {
  const { success, error, toasts, removeToast } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (admin) {
      setFormData({
        full_name: admin.full_name || '',
        email: admin.email || '',
        phone: admin.phone || '',
      });
    }
  }, [admin]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.request(`/admins/${admin.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (response.success) {
        success('Cập nhật thông tin thành công');
        // Reload admin data
        const adminResponse = await api.request(`/admins/${admin.id}`, { method: 'GET' });
        if (adminResponse.success) {
          localStorage.setItem('admin', JSON.stringify(adminResponse.data));
          onUpdate();
        }
      }
    } catch (err) {
      error('Lỗi cập nhật: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const response = await api.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.success) {
        success('Đổi mật khẩu thành công');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err) {
      error('Lỗi đổi mật khẩu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-profile-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <h1>👤 Thông tin cá nhân</h1>

      <div className="profile-sections">
        <div className="profile-section">
          <h2>Thông tin tài khoản</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Username</label>
              <input type="text" value={admin?.username || ''} disabled />
            </div>

            <div className="form-group">
              <label>Họ tên *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <input
                type="text"
                value={admin?.role === 'super_admin' ? 'Super Admin' : admin?.role === 'admin' ? 'Admin' : 'Staff'}
                disabled
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
            </button>
          </form>
        </div>

        <div className="profile-section">
          <h2>Đổi mật khẩu</h2>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Mật khẩu hiện tại *</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu mới *</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Xác nhận mật khẩu mới *</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
