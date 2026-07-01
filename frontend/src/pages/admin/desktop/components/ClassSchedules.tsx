// @ts-nocheck
import { useEffect, useState } from 'react';
import { CalendarDays, Edit, ExternalLink, Plus, Trash2 } from 'lucide-react';
import api from '../../../../services/api';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Label } from '../../../../components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/Dialog';
import { Badge } from '../../../../components/ui/Badge';
import { useToast } from '../../../../components/ui/ToastContainer';

const SESSION_TYPE_OPTIONS = [
  { value: 'lesson', label: 'Buổi học' },
  { value: 'exam', label: 'Bài test / thi' },
  { value: 'final_assessment', label: 'Đánh giá cuối khóa' },
  { value: 'assignment_review', label: 'Bài thu hoạch' },
  { value: 'other', label: 'Khác' },
];

function formatDateLabel(dateValue) {
  if (!dateValue) return 'Chưa có ngày';
  const [year, month, day] = String(dateValue).split('-');
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
}

function getSessionTypeLabel(sessionType) {
  return SESSION_TYPE_OPTIONS.find((item) => item.value === sessionType)?.label || sessionType || 'Khác';
}

function getLegacyDayName(day) {
  return ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][day] || 'Không rõ';
}

export default function ClassSchedules({ classId }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [legacySchedules, setLegacySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    session_date: '',
    start_time: '18:30',
    end_time: '20:30',
    session_type: 'lesson',
    title: '',
    content_outline: '',
    period_count: '',
    room: '',
    meeting_link: '',
    notes: '',
    sort_order: 0,
  });

  useEffect(() => {
    void loadData();
  }, [classId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsResponse, legacyResponse] = await Promise.all([
        api.getClassSessions(classId),
        api.getClassSchedules(classId).catch(() => ({ success: false, data: [] })),
      ]);

      setSessions(sessionsResponse?.success && Array.isArray(sessionsResponse.data) ? sessionsResponse.data : []);
      setLegacySchedules(legacyResponse?.success && Array.isArray(legacyResponse.data) ? legacyResponse.data : []);
    } catch (error) {
      console.error('Error loading class sessions:', error);
      toast?.error('Không thể tải lịch chi tiết của lớp');
      setSessions([]);
      setLegacySchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingSession(null);
    setFormData({
      session_date: '',
      start_time: '18:30',
      end_time: '20:30',
      session_type: 'lesson',
      title: '',
      content_outline: '',
      period_count: '',
      room: '',
      meeting_link: '',
      notes: '',
      sort_order: sessions.length + 1,
    });
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setFormData({
      session_date: session.session_date || '',
      start_time: session.start_time || '18:30',
      end_time: session.end_time || '20:30',
      session_type: session.session_type || 'lesson',
      title: session.title || '',
      content_outline: session.content_outline || '',
      period_count: session.period_count ?? '',
      room: session.room || '',
      meeting_link: session.meeting_link || '',
      notes: session.notes || '',
      sort_order: session.sort_order ?? 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (session) => {
    if (!confirm(`Xóa buổi "${session.title || formatDateLabel(session.session_date)}"?`)) {
      return;
    }

    try {
      await api.deleteClassSession(classId, session.id);
      toast?.success('Đã xóa buổi học');
      await loadData();
    } catch (error) {
      toast?.error(`Lỗi: ${error.message}`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = {
        session_date: formData.session_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        session_type: formData.session_type,
        title: formData.title,
        content_outline: formData.content_outline,
        period_count: formData.period_count === '' ? null : Number(formData.period_count),
        room: formData.room || null,
        meeting_link: formData.meeting_link || null,
        notes: formData.notes || null,
        sort_order: Number(formData.sort_order) || 0,
      };

      if (editingSession) {
        await api.updateClassSession(classId, editingSession.id, payload);
        toast?.success('Đã cập nhật buổi học');
      } else {
        await api.createClassSession(classId, payload);
        toast?.success('Đã tạo buổi học');
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      toast?.error(`Lỗi: ${error.message}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải lịch chi tiết...</div>;
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <CalendarDays size={18} className="text-blue-600" />
            <h3 className="text-lg font-semibold">Lịch theo từng buổi</h3>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Mỗi dòng là một buổi học hoặc giai đoạn đánh giá riêng. Có thể thay giáo viên, nội dung,
            phòng học và link online theo từng buổi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-blue-200 bg-blue-50 text-blue-700">
            {sessions.length} buổi
          </Badge>
          <Button onClick={handleCreate} className="bg-blue-600 text-white hover:bg-blue-700" size="sm">
            <Plus size={16} className="mr-2" /> Thêm buổi
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Tiêu đề / nội dung</th>
              <th className="px-4 py-3">Địa điểm</th>
              <th className="px-4 py-3">Tiết</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Chưa có buổi học nào. Hãy thêm từng buổi để lớp vận hành theo mô hình linh hoạt.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {formatDateLabel(session.session_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="border border-slate-200 bg-slate-100 text-slate-700">
                      {getSessionTypeLabel(session.session_type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {session.start_time} - {session.end_time}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{session.title || 'Chưa đặt tiêu đề'}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {session.content_outline || session.notes || 'Chưa có mô tả nội dung'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-slate-600">
                      <div>{session.room || 'Chưa có phòng'}</div>
                      {session.meeting_link ? (
                        <a
                          href={session.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Mở link học <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {session.period_count ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(session)}>
                        <Edit size={16} className="text-slate-400 hover:text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(session)}>
                        <Trash2 size={16} className="text-slate-400 hover:text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {legacySchedules.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-amber-900">Lịch tuần cũ đang còn dữ liệu</h4>
            <Badge className="border border-amber-300 bg-white text-amber-700">
              {legacySchedules.length} dòng legacy
            </Badge>
          </div>
          <p className="mt-2 text-sm text-amber-800">
            Phần dưới chỉ để tham chiếu cho lớp cũ. Dữ liệu vận hành mới nên nhập ở bảng buổi học phía trên.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-amber-100 bg-amber-50 text-xs font-semibold uppercase text-amber-700">
                <tr>
                  <th className="px-4 py-3">Thứ</th>
                  <th className="px-4 py-3">Giờ</th>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {legacySchedules.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">{getLegacyDayName(item.day_of_week)}</td>
                    <td className="px-4 py-3 font-mono">{item.start_time} - {item.end_time}</td>
                    <td className="px-4 py-3">{item.room || '-'}</td>
                    <td className="px-4 py-3">{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Sửa buổi học' : 'Thêm buổi học'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ngày học</Label>
                <Input
                  type="date"
                  value={formData.session_date}
                  onChange={(event) => setFormData((current) => ({ ...current, session_date: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Loại buổi</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.session_type}
                  onChange={(event) => setFormData((current) => ({ ...current, session_type: event.target.value }))}
                >
                  {SESSION_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Giờ bắt đầu</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(event) => setFormData((current) => ({ ...current, start_time: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Giờ kết thúc</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(event) => setFormData((current) => ({ ...current, end_time: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Tiêu đề buổi học</Label>
                <Input
                  value={formData.title}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ví dụ: Buổi 1 - Khởi động và giới thiệu khóa"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Nội dung buổi học</Label>
                <textarea
                  className="min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.content_outline}
                  onChange={(event) => setFormData((current) => ({ ...current, content_outline: event.target.value }))}
                  placeholder="Mô tả nội dung, mục tiêu, đầu việc của buổi học"
                />
              </div>
              <div className="space-y-2">
                <Label>Số tiết</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.period_count}
                  onChange={(event) => setFormData((current) => ({ ...current, period_count: event.target.value }))}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label>Phòng học</Label>
                <Input
                  value={formData.room}
                  onChange={(event) => setFormData((current) => ({ ...current, room: event.target.value }))}
                  placeholder="Ví dụ: P.301"
                />
              </div>
              <div className="space-y-2">
                <Label>Link học online</Label>
                <Input
                  value={formData.meeting_link}
                  onChange={(event) => setFormData((current) => ({ ...current, meeting_link: event.target.value }))}
                  placeholder="https://meet.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Thứ tự hiển thị</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(event) => setFormData((current) => ({ ...current, sort_order: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Ghi chú vận hành</Label>
                <textarea
                  className="min-h-[90px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.notes}
                  onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Thiết bị cần chuẩn bị, đầu bài thu hoạch, lưu ý riêng..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-blue-600 text-white">
                {editingSession ? 'Lưu thay đổi' : 'Tạo buổi học'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
