/**
 * VStepEditor - Exam editor skeleton.
 * Allows viewing/editing exam metadata and navigating sections.
 * Full question authoring is under development.
 *
 * Route: /admin/vstep/editor/:id  (id = examId, or 'new' for creation)
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Plus, BookOpen, Headphones, PenLine, Mic } from 'lucide-react';
import api from '../../../services/api';

// VSTEP skill sections with icons
const SECTIONS = [
  { key: 'LISTENING', label: 'Nghe', icon: Headphones, color: 'text-blue-600 bg-blue-50' },
  { key: 'READING',   label: 'Đọc',  icon: BookOpen,   color: 'text-green-600 bg-green-50' },
  { key: 'WRITING',   label: 'Viết', icon: PenLine,    color: 'text-orange-600 bg-orange-50' },
  { key: 'SPEAKING',  label: 'Nói',  icon: Mic,        color: 'text-purple-600 bg-purple-50' },
];

const LEVELS = ['A2', 'B1', 'B2', 'C1'];

const showComingSoon = () => alert('Tính năng đang phát triển');

const VStepEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('LISTENING');

  // Exam metadata form
  const [form, setForm] = useState({
    title: '',
    level: 'B1',
    duration: 165,
    description: '',
    status: 'draft',
  });

  useEffect(() => {
    if (!isNew) loadExam();
  }, [id]);

  const loadExam = async () => {
    setLoading(true);
    try {
      const res = await api.request(`/vstep/exams/${id}`);
      if (res.success && res.data) {
        const { title, level, duration, description, status } = res.data;
        setForm({ title: title || '', level: level || 'B1', duration: duration || 165, description: description || '', status: status || 'draft' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { alert('Vui lòng nhập tên đề thi.'); return; }
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.request('/vstep/exams', { method: 'POST', body: JSON.stringify(form) });
        if (res.success && res.data?.id) {
          navigate(`/admin/vstep/editor/${res.data.id}`, { replace: true });
        }
      } else {
        await api.request(`/vstep/exams/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      }
      alert('Đã lưu thành công!');
    } catch (err) {
      alert('Lỗi khi lưu: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentSectionMeta = SECTIONS.find(s => s.key === activeSection);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/vstep')}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? 'Tạo đề thi mới' : 'Chỉnh sửa đề thi'}
            </h1>
            <p className="text-slate-500 text-sm">{isNew ? 'Điền thông tin và thêm câu hỏi' : `ID: ${id}`}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={showComingSoon}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload size={18} />
            Import JSON
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={18} />
            {saving ? 'Đang lưu...' : 'Lưu đề thi'}
          </button>
        </div>
      </div>

      {/* Metadata card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Thông tin đề thi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Tên đề thi <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="VD: Đề thi VSTEP B1 - Tháng 03/2026"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Trình độ</label>
            <select
              value={form.level}
              onChange={(e) => updateForm('level', e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Thời gian (phút)</label>
            <input
              type="number"
              min={1}
              value={form.duration}
              onChange={(e) => updateForm('duration', Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              rows={2}
              placeholder="Mô tả ngắn về đề thi..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Trạng thái</label>
            <select
              value={form.status}
              onChange={(e) => updateForm('status', e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Đang mở</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section tabs + question area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Section tab bar */}
        <div className="flex border-b border-slate-200">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2
                ${activeSection === key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${currentSectionMeta?.color}`}>
              {currentSectionMeta && <currentSectionMeta.icon size={16} />}
              Phần {currentSectionMeta?.label}
            </div>
            <div className="flex gap-2">
              <button
                onClick={showComingSoon}
                className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                <Upload size={15} />
                Import từ JSON
              </button>
              <button
                onClick={showComingSoon}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Plus size={15} />
                Tạo câu hỏi
              </button>
            </div>
          </div>

          {/* Empty state placeholder */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-16 flex flex-col items-center gap-3 text-center">
            {currentSectionMeta && <currentSectionMeta.icon size={36} className="text-slate-300" />}
            <p className="text-slate-500 font-medium">Chưa có câu hỏi nào trong phần {currentSectionMeta?.label}</p>
            <p className="text-slate-400 text-sm">Nhấn "Tạo câu hỏi" hoặc "Import từ JSON" để thêm câu hỏi</p>
            <p className="text-xs text-slate-300 mt-1">Tính năng đang phát triển</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VStepEditor;
