// @ts-nocheck
import { useState } from 'react';
import api from '../../services/api';

export default function DocumentsTab() {
  const [uploadForm, setUploadForm] = useState({
    cccd: '',
    title: '',
    description: '',
    file: null,
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileChange = (e) => {
    setUploadForm({
      ...uploadForm,
      file: e.target.files[0],
    });
  };

  const handleChange = (e) => {
    setUploadForm({
      ...uploadForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setMessage(null);

    try {
      await api.uploadDocument(
        uploadForm.cccd,
        uploadForm.title,
        uploadForm.description,
        uploadForm.file
      );

      setMessage({ type: 'success', text: 'Upload thành công!' });

      // Reset form
      setUploadForm({
        cccd: '',
        title: '',
        description: '',
        file: null,
      });
      e.target.reset();

    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Lỗi upload' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="content-section">
      <h1>Quản lý tài liệu</h1>

      <div className="upload-card">
        <h2>Upload tài liệu cho sinh viên</h2>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Số CCCD/CMT sinh viên <span className="required">*</span></label>
            <input
              type="text"
              name="cccd"
              value={uploadForm.cccd}
              onChange={handleChange}
              placeholder="Nhập CCCD sinh viên"
              required
            />
          </div>

          <div className="form-group">
            <label>Tiêu đề tài liệu <span className="required">*</span></label>
            <input
              type="text"
              name="title"
              value={uploadForm.title}
              onChange={handleChange}
              placeholder="VD: Giấy chứng nhận, Thông báo thi..."
              required
            />
          </div>

          <div className="form-group">
            <label>Mô tả</label>
            <textarea
              name="description"
              value={uploadForm.description}
              onChange={handleChange}
              placeholder="Mô tả chi tiết về tài liệu"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>File tài liệu <span className="required">*</span></label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              required
            />
            {uploadForm.file && (
              <div className="file-info">
                📎 {uploadForm.file.name} ({(uploadForm.file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Đang upload...' : 'Upload tài liệu'}
          </button>
        </form>
      </div>

      <div className="info-box">
        <h3>Hướng dẫn:</h3>
        <ul>
          <li>Nhập chính xác số CCCD của sinh viên để upload tài liệu</li>
          <li>Sinh viên có thể tra cứu tài liệu của mình tại trang: <strong>/lookup</strong></li>
          <li>Định dạng file hỗ trợ: PDF, DOC, DOCX, JPG, PNG</li>
          <li>Kích thước file tối đa: 10MB</li>
        </ul>
      </div>
    </div>
  );
}
