import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Upload, FileSpreadsheet, Search, Eye, Edit, Trash2 } from 'lucide-react';
import api from '../../../services/api';

// Fix #7: badge color map for all VSTEP levels
const LEVEL_COLORS = {
  'A2': 'bg-green-100 text-green-800',
  'B1': 'bg-blue-100 text-blue-800',
  'B2': 'bg-orange-100 text-orange-800',
  'C1': 'bg-red-100 text-red-800',
};

const VStepManager = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fix #4: wired search state
  const [searchQuery, setSearchQuery] = useState('');
  // Fix #5: level filter state
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    setLoading(true);
    try {
      const res = await api.request('/vstep/exams');
      if (res.success) {
        setExams(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fix #6: delete handler with confirmation
  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề thi này?')) return;
    try {
      await api.request(`/vstep/exams/${examId}`, { method: 'DELETE' });
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (err) {
      alert('Lỗi khi xóa: ' + err.message);
    }
  };

  // Fix #4 + #5: combined search + level filter
  const filteredExams = exams.filter(exam => {
    const matchesSearch = !searchQuery ||
      exam.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || exam.level === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Đề thi VSTEP</h1>
          <p className="text-slate-500">Danh sách các đề thi và ngân hàng câu hỏi</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/vstep/import"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={20} />
            Import Excel
          </Link>
          <Link
            to="/admin/vstep/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            Tạo thủ công
          </Link>
        </div>
      </div>

      {/* Fix #4 + #5: Filters — search wired up, level filter applied */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm đề thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          className="px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả trình độ</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Tên đề thi</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Mã đề</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Trình độ</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Thời gian</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Trạng thái</th>
              <th className="px-6 py-4 text-right font-semibold text-slate-700">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
              </tr>
            ) : filteredExams.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <FileSpreadsheet size={32} />
                    </div>
                    <p className="text-slate-600 font-medium">
                      {searchQuery || filter !== 'all' ? 'Không tìm thấy đề thi phù hợp' : 'Chưa có đề thi nào'}
                    </p>
                    <p className="text-slate-400 text-sm">Hãy import từ Excel hoặc tạo mới</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Fix #5: render filteredExams (includes search + level filter)
              filteredExams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">{exam.title}</div>
                    <div className="text-sm text-slate-500 line-clamp-1">{exam.description}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{exam.code}</td>
                  <td className="px-6 py-4">
                    {/* Fix #7: level-specific badge colors */}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${LEVEL_COLORS[exam.level] || 'bg-purple-100 text-purple-800'}`}>
                      {exam.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{exam.duration} phút</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border
                      ${exam.status === 'published'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                    `}>
                      {exam.status === 'published' ? 'Đang mở' : 'Bản nháp'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Fix #6: wired onClick handlers for action buttons */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/vstep/exam/${exam.id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/vstep/editor/${exam.id}`)}
                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VStepManager;
