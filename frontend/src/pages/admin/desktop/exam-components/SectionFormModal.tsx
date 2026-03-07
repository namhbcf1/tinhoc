import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

// Section form modal: create/edit a section (skill group) in an exam
export default function SectionFormModal({ isOpen, onClose, onSubmit, initialData, title }) {
  const [formData, setFormData] = useState({ type: 'READING', title: '', duration: 60, instructions: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'READING',
        title: initialData.title || '',
        duration: initialData.duration || 60,
        instructions: initialData.instructions || '',
        orderIndex: initialData.orderIndex,
      });
    } else {
      setFormData({ type: 'READING', title: '', duration: 60, instructions: '' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const next = {};
    if (!formData.title.trim()) next.title = 'Tiêu đề section là bắt buộc';
    if (!formData.type) next.type = 'Loại section là bắt buộc';
    if (formData.duration < 0) next.duration = 'Thời lượng không được âm';
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
      setErrors(prev => ({ ...prev, submit: err?.message || 'Không thể lưu section' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full relative z-10">
          <div className="bg-white px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500" disabled={isSubmitting}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /><span>{errors.submit}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kỹ năng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LISTENING">Listening</option>
                    <option value="READING">Reading</option>
                    <option value="WRITING">Writing</option>
                    <option value="SPEAKING">Speaking</option>
                    <option value="GENERAL">General</option>
                  </select>
                  {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={e => handleChange('duration', parseInt(e.target.value) || 0)}
                    min={0}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="VD: Listening, Part 1..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hướng dẫn cho thí sinh</label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={e => handleChange('instructions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mô tả ngắn gọn yêu cầu của phần thi..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={isSubmitting}>Hủy</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
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
