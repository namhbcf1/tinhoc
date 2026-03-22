import { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/admin/AdminDashboard.css';
import { useAdminAutoRefresh } from '../shared/useAdminAutoRefresh';

export default function HomepageManagement({ toast }) {
  const [settings, setSettings] = useState({
    bannerEnabled: true,
    statsEnabled: true,
    servicesEnabled: true,
    whyChooseEnabled: true,
    ctaEnabled: true,
    bannerTitle: '',
    bannerDescription: '',
    yearsExperience: 0,
    totalStudents: 0,
    totalPrograms: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);
  useAdminAutoRefresh(() => loadSettings(), { minIntervalMs: 15000 });

  const loadSettings = async () => {
    setLoadingData(true);
    try {
      const response = await api.getHomepageSettings();
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast?.error('Lỗi tải cài đặt: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateHomepageSettings(settings);
      toast?.success('Đã lưu cài đặt thành công!');
    } catch (error) {
      alert('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="content-section">
        <h1>Quản lý Homepage</h1>
        <div className="loading">Đang tải cài đặt...</div>
      </div>
    );
  }

  return (
    <div className="homepage-management-page">
      <div className="homepage-page-header">
        <h1>🏠 Quản lý Homepage</h1>
        <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
          {loading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
        </button>
      </div>

      <div className="homepage-settings-section">
        {/* Hiển thị Sections */}
        <div>
          <h2>Hiển thị Sections</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Bật/tắt các phần hiển thị trên trang chủ
          </p>
          <div className="settings-list">
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.bannerEnabled || false}
                  onChange={() => handleToggle('bannerEnabled')}
                />
                <span>Banner Hero</span>
              </label>
              <div style={{ fontSize: '12px', color: '#999', marginLeft: '32px' }}>
                Banner chính với tiêu đề và mô tả công ty
              </div>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.statsEnabled || false}
                  onChange={() => handleToggle('statsEnabled')}
                />
                <span>Thống kê (Số liệu)</span>
              </label>
              <div style={{ fontSize: '12px', color: '#999', marginLeft: '32px' }}>
                Hiển thị số năm kinh nghiệm, số học viên, chương trình...
              </div>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.servicesEnabled || false}
                  onChange={() => handleToggle('servicesEnabled')}
                />
                <span>Dịch vụ</span>
              </label>
              <div style={{ fontSize: '12px', color: '#999', marginLeft: '32px' }}>
                Danh sách các dịch vụ/khóa học cung cấp
              </div>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.whyChooseEnabled || false}
                  onChange={() => handleToggle('whyChooseEnabled')}
                />
                <span>Tại sao chọn chúng tôi</span>
              </label>
              <div style={{ fontSize: '12px', color: '#999', marginLeft: '32px' }}>
                Điểm mạnh và lý do nên chọn công ty
              </div>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={settings.ctaEnabled || false}
                  onChange={() => handleToggle('ctaEnabled')}
                />
                <span>Call to Action</span>
              </label>
              <div style={{ fontSize: '12px', color: '#999', marginLeft: '32px' }}>
                Kêu gọi hành động (đăng ký ngay, liên hệ...)
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung Banner */}
        <div className="homepage-settings-section">
          <h2>Nội dung Banner</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Chỉnh sửa nội dung banner chính
          </p>

          <div className="homepage-form-group">
            <label>Tiêu đề chính</label>
            <input
              type="text"
              placeholder="Nhập tiêu đề..."
              value={settings.bannerTitle || ''}
              onChange={(e) => handleChange('bannerTitle', e.target.value)}
            />
          </div>

          <div className="homepage-form-group">
            <label>Mô tả</label>
            <textarea
              rows="4"
              placeholder="Nhập mô tả..."
              value={settings.bannerDescription || ''}
              onChange={(e) => handleChange('bannerDescription', e.target.value)}
            ></textarea>
          </div>

          <div className="homepage-form-group">
            <label>Ảnh banner (URL)</label>
            <input
              type="url"
              placeholder="https://example.com/banner.jpg"
              value={settings.bannerImage || ''}
              onChange={(e) => handleChange('bannerImage', e.target.value)}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Nhập URL ảnh hoặc upload ảnh lên CDN/hosting
            </small>
          </div>
        </div>

        {/* Số liệu thống kê */}
        <div className="homepage-settings-section">
          <h2>Số liệu thống kê</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Cập nhật các số liệu hiển thị trên homepage
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="homepage-form-group">
              <label>Số năm kinh nghiệm</label>
              <input
                type="number"
                value={settings.yearsExperience || 0}
                onChange={(e) => handleChange('yearsExperience', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="homepage-form-group">
              <label>Số học viên</label>
              <input
                type="number"
                value={settings.totalStudents || 0}
                onChange={(e) => handleChange('totalStudents', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="homepage-form-group">
              <label>Số chương trình</label>
              <input
                type="number"
                value={settings.totalPrograms || 0}
                onChange={(e) => handleChange('totalPrograms', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Thông tin liên hệ */}
        <div className="homepage-settings-section">
          <h2>Thông tin liên hệ</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Thông tin công ty hiển thị ở footer
          </p>

          <div className="homepage-form-group">
            <label>Số điện thoại</label>
            <input
              type="tel"
              placeholder="VD: 0123456789"
              value={settings.contactPhone || ''}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
            />
          </div>

          <div className="homepage-form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="VD: contact@example.com"
              value={settings.contactEmail || ''}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
            />
          </div>

          <div className="homepage-form-group">
            <label>Địa chỉ</label>
            <textarea
              rows="2"
              placeholder="Nhập địa chỉ công ty..."
              value={settings.contactAddress || ''}
              onChange={(e) => handleChange('contactAddress', e.target.value)}
            ></textarea>
          </div>

          <div className="homepage-form-group">
            <label>Link Facebook</label>
            <input
              type="url"
              placeholder="https://facebook.com/..."
              value={settings.facebookUrl || ''}
              onChange={(e) => handleChange('facebookUrl', e.target.value)}
            />
          </div>

          <div className="homepage-form-group">
            <label>Link Zalo</label>
            <input
              type="url"
              placeholder="https://zalo.me/..."
              value={settings.zaloUrl || ''}
              onChange={(e) => handleChange('zaloUrl', e.target.value)}
            />
          </div>
        </div>

        {/* Button lưu ở cuối */}
        <div className="homepage-actions">
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : '💾 Lưu tất cả thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
