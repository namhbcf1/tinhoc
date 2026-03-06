import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

// Group form modal: create/edit a question group (passage, part, etc.) within a section
export default function GroupFormModal({ isOpen, onClose, onSubmit, initialData, title, sectionId }) {
  const [formData, setFormData] = useState({ sectionId, title: '', textContent: '', audioUrl: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        sectionId,
        title: initialData.title || '',
        textContent: initialData.textContent || '',
        audioUrl: initialData.audioUrl || '',
        orderIndex: initialData.orderIndex,
      });
    } else {
      setFormData({ sectionId, title: '', textContent: '', audioUrl: '' });
    }
    setErrors({});
  }, [initialData, isOpen, sectionId]);

  const validate = () => {
    const next = {};
    if (!formData.title.trim()) next.title = 'Tiêu đề nhóm câu hỏi là bắt buộc';
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
      setErrors(prev => ({ ...prev, submit: err?.message || 'Không thể lưu nhóm câu hỏi' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề nhóm câu hỏi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="VD: Passage 1, Part 1..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đoạn văn / nội dung chính</label>
                <textarea
                  rows={5}
                  value={formData.textContent}
                  onChange={e => handleChange('textContent', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nội dung đoạn văn, audio transcript (nếu có)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL file audio (nếu là Listening)</label>
                <input
                  type="url"
                  value={formData.audioUrl}
                  onChange={e => handleChange('audioUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
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
