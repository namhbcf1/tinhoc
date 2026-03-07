import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

// Simple exam create/edit form modal
export default function ExamFormModal({ isOpen, onClose, onSubmit, exam, title }) {
  const defaultForm = { title: '', code: '', description: '', level: 'B1', duration: 120, status: 'draft', layoutMode: 'LANGUAGE', categoryId: '' };
  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (exam) {
      setFormData({ ...defaultForm, ...exam });
    } else {
      setFormData(defaultForm);
    }
    setErrors({});
  }, [exam, isOpen]);

  const validate = () => {
    const next = {};
    if (!formData.title.trim()) next.title = 'Tiêu đề đề thi là bắt buộc';
    if (!formData.level) next.level = 'Cấp độ là bắt buộc';
    if (!formData.duration || formData.duration <= 0) next.duration = 'Thời gian phải lớn hơn 0';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err?.message || 'Không thể lưu đề thi' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = (field) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${errors[field] ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
          <div className="bg-white px-6 pt-5 pb-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500" disabled={isSubmitting}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /><span>{errors.submit}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} className={inputClass('title')} placeholder="Tên đề thi..." />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã đề thi</label>
                  <input type="text" value={formData.code} onChange={e => handleChange('code', e.target.value)} className={inputClass('code')} placeholder="VD: VSTEP_B2_2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cấp độ <span className="text-red-500">*</span></label>
                  <select value={formData.level} onChange={e => handleChange('level', e.target.value)} className={inputClass('level')}>
                    {['A1','A2','B1','B2','C1','C2','BASIC'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  {errors.level && <p className="mt-1 text-xs text-red-600">{errors.level}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian (phút) <span className="text-red-500">*</span></label>
                  <input type="number" value={formData.duration} onChange={e => handleChange('duration', parseInt(e.target.value) || 0)} min={1} className={inputClass('duration')} />
                  {errors.duration && <p className="mt-1 text-xs text-red-600">{errors.duration}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select value={formData.status} onChange={e => handleChange('status', e.target.value)} className={inputClass('status')}>
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kiểu đề</label>
                  <select value={formData.layoutMode} onChange={e => handleChange('layoutMode', e.target.value)} className={inputClass('layoutMode')}>
                    <option value="LANGUAGE">Language (4 kỹ năng)</option>
                    <option value="SINGLE">Single Section</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea rows={3} value={formData.description} onChange={e => handleChange('description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Mô tả ngắn về đề thi..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium" disabled={isSubmitting}>Hủy</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
