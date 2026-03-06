import React, { useEffect, useState } from 'react';
import { X, AlertCircle, Plus, Trash2 } from 'lucide-react';

// Question form modal: create/edit a single question
export default function QuestionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  sectionId,
  groupId,
}) {
  const emptyOptions = [
    { id: '1', content: '', isCorrect: false },
    { id: '2', content: '', isCorrect: false },
  ];

  const [formData, setFormData] = useState({
    sectionId,
    groupId: groupId ?? null,
    content: '',
    type: 'MULTIPLE_CHOICE',
    points: 1,
    explanation: '',
    options: emptyOptions,
    correctAnswer: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        sectionId,
        groupId: groupId ?? initialData.groupId ?? null,
        content: initialData.content || '',
        type: initialData.type || 'MULTIPLE_CHOICE',
        points: initialData.points || 1,
        explanation: initialData.explanation || '',
        correctAnswer: initialData.correctAnswer || '',
        options: initialData.options?.length ? initialData.options : emptyOptions,
      });
    } else {
      setFormData({
        sectionId,
        groupId: groupId ?? null,
        content: '',
        type: 'MULTIPLE_CHOICE',
        points: 1,
        explanation: '',
        correctAnswer: '',
        options: emptyOptions,
      });
    }
    setErrors({});
  }, [initialData, isOpen, sectionId, groupId]);

  const validate = () => {
    const next = {};
    if (!formData.content.trim()) next.content = 'Nội dung câu hỏi là bắt buộc';
    if (formData.points <= 0) next.points = 'Điểm phải lớn hơn 0';
    if (formData.type === 'MULTIPLE_CHOICE') {
      const hasContent = formData.options.some(o => o.content.trim());
      const hasCorrect = formData.options.some(o => o.isCorrect);
      if (!hasContent) next.options = 'Cần ít nhất một phương án trả lời';
      else if (!hasCorrect) next.options = 'Cần chọn một đáp án đúng';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleOptionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? { ...opt, [field]: value } : opt),
    }));
    if (errors.options) setErrors(prev => ({ ...prev, options: undefined }));
  };

  const handleSetCorrect = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => ({ ...opt, isCorrect: i === index })),
    }));
    if (errors.options) setErrors(prev => ({ ...prev, options: undefined }));
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: String(prev.options.length + 1), content: '', isCorrect: false }],
    }));
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setErrors(prev => ({ ...prev, submit: err?.message || 'Không thể lưu câu hỏi' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="inline-block bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full relative z-10">
          <div className="bg-white px-6 pt-5 pb-4 max-h-[90vh] overflow-y-auto">
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
                    Loại câu hỏi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
                    <option value="ESSAY">Tự luận</option>
                    <option value="RECORDING">Ghi âm</option>
                    <option value="FILL_IN_BLANK">Điền từ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={e => handleChange('points', parseFloat(e.target.value) || 0)}
                    min={0.1} step={0.1}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.points ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.points && <p className="mt-1 text-sm text-red-600">{errors.points}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.content}
                  onChange={e => handleChange('content', e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.content ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
              </div>
              {formData.type === 'MULTIPLE_CHOICE' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Phương án trả lời</label>
                    <button type="button" onClick={handleAddOption} className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100">
                      <Plus className="w-3 h-3 mr-1" /> Thêm phương án
                    </button>
                  </div>
                  {errors.options && <p className="mb-2 text-sm text-red-600">{errors.options}</p>}
                  <div className="space-y-2">
                    {formData.options.map((opt, index) => (
                      <div key={opt.id} className="flex items-center gap-2 border border-gray-200 rounded-md px-2 py-1.5">
                        <input type="radio" name="correct_option" checked={opt.isCorrect} onChange={() => handleSetCorrect(index)} className="text-blue-600" />
                        <input
                          type="text" value={opt.content}
                          onChange={e => handleOptionChange(index, 'content', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={`Đáp án ${index + 1}`}
                        />
                        {formData.options.length > 2 && (
                          <button type="button" onClick={() => handleRemoveOption(index)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formData.type === 'FILL_IN_BLANK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đáp án đúng <span className="text-red-500">*</span></label>
                  <input
                    type="text" value={formData.correctAnswer || ''}
                    onChange={e => handleChange('correctAnswer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập đáp án đúng..."
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giải thích đáp án</label>
                <textarea
                  rows={2} value={formData.explanation}
                  onChange={e => handleChange('explanation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Giải thích đáp án, gợi ý, lưu ý..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" disabled={isSubmitting}>
                  Hủy
                </button>
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
