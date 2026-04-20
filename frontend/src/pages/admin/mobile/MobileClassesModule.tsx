import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Search, Plus, Edit2, Trash2, X, ChevronRight, Calendar, Clock,
  Users, MapPin, CreditCard, CheckCircle, AlertCircle, Filter, RefreshCw,
  ArrowLeft, Info
} from 'lucide-react';
import { formatDateVN } from '../../../utils/dateUtils';
import { useToast } from '../../../components/ui/ToastContainer';
import { useClassesManagement, useClassForm } from '../shared/hooks/useClassesManagement';
import api from '../../../services/api';
import PullToRefreshWrapper from '../../../components/ui/PullToRefreshWrapper';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import {
  MobileAdminBottomSheet,
  MobileAdminFloatingAction,
  MobileAdminHeroCard,
  MobileAdminPrimaryButton,
  MobileAdminSearchField,
  MobileAdminSecondaryButton,
  MobileAdminStatCard,
  mobileAdminContentPadding,
} from '../shared/mobileAdminUi';

const BottomSheet = MobileAdminBottomSheet;

const ClassCard = ({ cls, onClick, onEdit, onDelete }) => {
  const name = cls.ten_lop || 'Lớp học';
  const code = cls.ma_lop || `LOP-${cls.id}`;
  const status = cls.status || 'open';
  const current = cls.current_students || cls.total_students || 0;
  const max = cls.max_students || 0;

  const getStatusConfig = () => {
    switch (status) {
      case 'open': return { label: 'Đang mở', color: 'bg-green-100 text-green-700' };
      case 'closed': return { label: 'Đã đóng', color: 'bg-red-100 text-red-700' };
      case 'finished': return { label: 'Kết thúc', color: 'bg-slate-100 text-slate-700' };
      default: return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const { label, color } = getStatusConfig();

  return (
    <div
      className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.34)] active:scale-[0.98] transition-all"
      onClick={() => onClick(cls)}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className={`h-14 w-14 rounded-[20px] flex items-center justify-center ${status === 'open' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_18px_34px_-22px_rgba(37,99,235,0.55)]' : 'bg-slate-200'} text-white`}>
            <BookOpen size={20} />
          </div>
          {cls.pending_count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center text-[10px] text-white font-bold">
              {cls.pending_count}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h3 className="pr-2 text-[17px] font-black tracking-[-0.03em] text-slate-900 line-clamp-2">{name}</h3>
            <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${color}`}>{label}</span>
            <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded-md">{code}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {current}/{max > 0 ? max : '∞'}
            </span>
            {cls.ngay_bat_dau && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDateVN(cls.ngay_bat_dau)}
              </span>
            )}
            {cls.schedule_location && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <MapPin size={12} />
                <span className="truncate">{cls.schedule_location}</span>
              </span>
            )}
            {!cls.schedule_location && cls.dia_diem && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <MapPin size={12} />
                <span className="truncate">{cls.dia_diem}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onEdit(cls)}
          className="flex items-center justify-center gap-1 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 active:bg-blue-100"
        >
          <Edit2 size={12} /> Sửa
        </button>
        <button
          onClick={() => onDelete(cls)}
          className="flex items-center justify-center gap-1 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 active:bg-red-100"
        >
          <Trash2 size={12} /> Xóa
        </button>
      </div>
    </div>
  );
};

const ClassDetailSheet = ({ cls, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [registrations, setRegistrations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && cls?.id) {
      if (activeTab === 'students') loadRegistrations();
      if (activeTab === 'schedules') loadSchedules();
    }
  }, [isOpen, cls?.id, activeTab]);

  const loadRegistrations = async () => {
    if (!cls?.id) return;
    setLoading(true);
    try {
      const res = await api.getRegistrationsByClass(cls.id);
      const data = res?.data || res || [];
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (error) {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!cls?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/classes/${cls.id}/schedules`);
      const data = res?.data || res || [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch (error) {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  if (!cls) return null;

  const current = cls.current_students || cls.total_students || 0;
  const max = cls.max_students || 0;
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-700' },
      approved: { label: 'Đã duyệt', color: 'bg-green-100 text-green-700' },
      studying: { label: 'Đang học', color: 'bg-blue-100 text-blue-700' },
      completed: { label: 'Hoàn thành', color: 'bg-purple-100 text-purple-700' },
      rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
    };
    const c = config[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${c.color}`}>{c.label}</span>;
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={cls.ten_lop || 'Chi tiết lớp học'} height="90vh">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm opacity-80">Sĩ số lớp</span>
          <span className="text-xl font-bold">{current} / {max > 0 ? max : '∞'}</span>
        </div>
        {max > 0 && (
          <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm opacity-90">
          <span className="flex items-center gap-1">
            <Calendar size={14} /> {formatDateVN(cls.ngay_bat_dau)} - {formatDateVN(cls.ngay_ket_thuc)}
          </span>
        </div>
      </div>

      <div className="flex border-b border-slate-100 sticky top-0 bg-white z-10">
        {[
          { id: 'info', label: 'Thông tin', icon: Info },
          { id: 'students', label: 'Học viên', icon: Users, count: registrations.length },
          { id: 'schedules', label: 'Lịch trình', icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.count > 0 && <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-slate-500 mb-3">Thông tin cơ bản</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã lớp</span>
                  <span className="font-mono font-medium text-slate-800">{cls.ma_lop}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Loại</span>
                  <span className="font-medium text-slate-800">{cls.class_type === 'hoc' ? 'Đào tạo' : 'Thi/Sát hạch'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className={`font-medium ${cls.status === 'open' ? 'text-green-600' : cls.status === 'closed' ? 'text-red-600' : 'text-slate-600'}`}>
                    {cls.status === 'open' ? 'Đang mở đăng ký' : cls.status === 'closed' ? 'Đã đóng' : 'Hoàn thành'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Học phí</span>
                  <span className="font-bold text-blue-600">
                    {cls.hoc_phi === 0 ? 'Liên hệ' : `${parseInt(cls.hoc_phi || 0).toLocaleString()}đ`}
                  </span>
                </div>
                {cls.open_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mở đăng ký</span>
                    <span className="font-medium text-slate-800">{formatDateVN(cls.open_at, true)}</span>
                  </div>
                )}
                {cls.close_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Đóng đăng ký</span>
                    <span className="font-medium text-slate-800">{formatDateVN(cls.close_at, true)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-slate-500 mb-3">Lịch học</h4>
              <div className="space-y-3">
                {cls.schedule_days && cls.schedule_days.length > 0 && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar size={16} className="text-slate-400" />
                    <span>
                      {cls.schedule_days.map(d => d === 0 ? 'CN' : `T${d + 1}`).join(', ')}
                      {cls.schedule_start_time && cls.schedule_end_time && 
                        ` (${cls.schedule_start_time} - ${cls.schedule_end_time})`
                      }
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock size={16} className="text-slate-400" />
                  <span>{cls.schedule_summary || (cls.schedule_start_time && cls.schedule_end_time 
                    ? `${cls.schedule_start_time} - ${cls.schedule_end_time}` 
                    : cls.gio_hoc || 'Chưa xếp lịch')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{cls.schedule_location || cls.dia_diem || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {cls.notes && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1">
                  <AlertCircle size={14} /> Ghi chú
                </h4>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{cls.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={24} className="animate-spin text-blue-600" />
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p>Chưa có học viên nào</p>
              </div>
            ) : (
              registrations.map((reg) => (
                <div key={reg.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{reg.ho_ten || reg.student_name || 'Học viên'}</p>
                    <p className="text-xs text-slate-500">{reg.cccd || reg.student_id}</p>
                  </div>
                  {getStatusBadge(reg.status)}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={24} className="animate-spin text-blue-600" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock size={48} className="mx-auto mb-3 opacity-50" />
                <p>Chưa có lịch trình nào</p>
              </div>
            ) : (
              schedules.map((schedule) => (
                <div key={schedule.id} className="bg-white p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-blue-500" />
                    <span className="font-medium text-slate-800">{formatDateVN(schedule.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock size={14} />
                    <span>{schedule.start_time} - {schedule.end_time}</span>
                  </div>
                  {schedule.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <MapPin size={14} />
                      <span>{schedule.location}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </BottomSheet>
  );
};

const ClassFormSheet = ({ isOpen, onClose, editingClass, onSuccess, createClass, updateClass }) => {
  const { success, error } = useToast();
  const { formData, updateField, resetForm, handleDateInput, handleDateTimeInput, toggleScheduleDay } = useClassForm(editingClass);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.ten_lop || !formData.ma_lop) {
      error('Vui lòng nhập tên và mã lớp');
      return;
    }

    setLoading(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, formData);
        success('Cập nhật lớp học thành công!');
      } else {
        await createClass(formData);
        success('Tạo lớp học thành công!');
      }
      await onSuccess?.();
      onClose();
    } catch (err) {
      error('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={editingClass ? 'Cập nhật lớp học' : 'Tạo lớp học mới'} height="90vh">
      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full" /> Thông tin chung
          </h4>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Tên lớp học *</label>
            <input
              type="text"
              value={formData.ten_lop}
              onChange={(e) => updateField('ten_lop', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ví dụ: Tin học văn phòng K12"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Mã lớp *</label>
              <input
                type="text"
                value={formData.ma_lop}
                onChange={(e) => updateField('ma_lop', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="THVP-K12"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Loại</label>
              <select
                value={formData.class_type}
                onChange={(e) => updateField('class_type', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="hoc">Đào tạo</option>
                <option value="thi">Thi/Sát hạch</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Học phí (VNĐ)</label>
              <input
                type="number"
                value={formData.hoc_phi}
                onChange={(e) => updateField('hoc_phi', e.target.value)}
                disabled={formData.isFreeContact}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                placeholder="500000"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Sĩ số tối đa</label>
              <input
                type="number"
                value={formData.max_students}
                onChange={(e) => updateField('max_students', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="∞"
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isFreeContact}
              onChange={(e) => {
                updateField('isFreeContact', e.target.checked);
                updateField('hoc_phi', e.target.checked ? '0' : '');
              }}
              className="w-5 h-5 rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm text-slate-700">Miễn phí (Yêu cầu liên hệ)</span>
          </label>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="w-1 h-4 bg-purple-600 rounded-full" /> Thời gian
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Ngày khai giảng</label>
              <input
                type="text"
                value={formData.ngay_bat_dau}
                onChange={handleDateInput('ngay_bat_dau')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Ngày kết thúc</label>
              <input
                type="text"
                value={formData.ngay_ket_thuc}
                onChange={handleDateInput('ngay_ket_thuc')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Mở đăng ký (dd/mm/yyyy HH:mm)</label>
            <input
              type="text"
              value={formData.open_at}
              onChange={handleDateTimeInput('open_at')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="01/01/2024 08:00"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Đóng đăng ký (dd/mm/yyyy HH:mm)</label>
            <input
              type="text"
              value={formData.close_at}
              onChange={handleDateTimeInput('close_at')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="31/01/2024 17:00"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-1.5 block">Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Đang mở đăng ký</option>
              <option value="closed">Đã đóng đăng ký</option>
              <option value="finished">Đã kết thúc</option>
            </select>
          </div>
        </div>

        {formData.class_type === 'hoc' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-600 rounded-full" /> Lịch học định kỳ
            </h4>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-2 block">Ngày trong tuần</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 0].map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleScheduleDay(day)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${formData.schedule_days?.includes(day)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    {day === 0 ? 'CN' : 'T' + (day + 1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">Giờ bắt đầu</label>
                <input
                  type="text"
                  value={formData.schedule_start_time}
                  onChange={(e) => updateField('schedule_start_time', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="18:30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">Giờ kết thúc</label>
                <input
                  type="text"
                  value={formData.schedule_end_time}
                  onChange={(e) => updateField('schedule_end_time', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="20:30"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Địa điểm / Link</label>
              <input
                type="text"
                value={formData.schedule_location}
                onChange={(e) => updateField('schedule_location', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="P.202 hoặc Zoom Link"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-slate-600 mb-1.5 block">Ghi chú</label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            placeholder="Ghi chú về lớp học..."
          />
        </div>

        <div className="pt-4 pb-8 sticky bottom-0 bg-white border-t border-slate-100 -mx-4 px-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : (editingClass ? 'Lưu thay đổi' : 'Tạo lớp học')}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};

const ConfirmDeleteSheet = ({ isOpen, onClose, cls, onConfirm, deleteClass }) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await deleteClass(cls.id);
      success('Đã xóa lớp học thành công');
      await onConfirm?.();
      onClose();
    } catch (err) {
      error('Lỗi khi xóa: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Xác nhận xóa" height="auto">
      <div className="p-4 pb-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={32} className="text-red-600" />
          </div>
          <p className="text-slate-700">Bạn có chắc chắn muốn xóa lớp</p>
          <p className="font-bold text-slate-900 text-lg">"{cls?.ten_lop}"?</p>
          <p className="text-sm text-slate-500 mt-2">Toàn bộ dữ liệu đăng ký đi kèm sẽ bị mất.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl active:bg-slate-200"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl active:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Đang xóa...' : 'Xóa lớp'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default function MobileClassesModule() {
  const { classes, loading, filterClasses, getStats, loadClasses, createClass, updateClass, deleteClass } = useClassesManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);
  const [showFormSheet, setShowFormSheet] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classToDelete, setClassToDelete] = useState(null);

  const filteredClasses = filterClasses(searchTerm, filterStatus);
  const stats = getStats();

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setShowFormSheet(true);
  };

  const handleCreate = () => {
    setEditingClass(null);
    setShowFormSheet(true);
  };

  // Pull-to-refresh callback
  const handleRefresh = async () => {
      await loadClasses({ force: true });
  };

  return (
    <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="min-h-screen bg-slate-50">
      <MobileAdminHeroCard
        eyebrow="Quản lý học tập"
        icon={BookOpen}
        tone="cyan"
        title="Lớp học"
        description="Tìm lớp nhanh, lọc theo trạng thái và vào chi tiết mà không bị dồn controls ở phần đầu trang."
        actions={(
          <>
            <MobileAdminSecondaryButton onClick={handleRefresh} className="px-3.5">
              <RefreshCw size={16} />
              Làm mới
            </MobileAdminSecondaryButton>
            <MobileAdminPrimaryButton onClick={handleCreate} className="px-3.5">
              <Plus size={16} />
              Tạo lớp
            </MobileAdminPrimaryButton>
          </>
        )}
        stats={(
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <MobileAdminStatCard label="Tổng" value={stats.total} tone="blue" />
            <MobileAdminStatCard label="Đang mở" value={stats.open} tone="emerald" />
            <MobileAdminStatCard label="Đã đóng" value={stats.closed} tone="rose" />
            <MobileAdminStatCard label="Kết thúc" value={stats.finished} tone="slate" />
          </div>
        )}
        search={(
          <div className="flex gap-2">
            <MobileAdminSearchField
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder="Tìm lớp theo tên, mã lớp..."
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border shadow-sm ${showFilters ? 'border-blue-200 bg-blue-600 text-white' : 'border-white/10 bg-white/[0.96] text-slate-500'}`}
            >
              <Filter size={18} />
            </button>
          </div>
        )}
        filters={showFilters ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'open', label: 'Đang mở' },
              { value: 'closed', label: 'Đã đóng' },
              { value: 'finished', label: 'Kết thúc' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterStatus === f.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
      />

      <div className="p-4 pt-3" style={{ paddingBottom: mobileAdminContentPadding(20) }}>
        {loading ? (
          <AdminLoadingState
            title="Đang tải danh sách lớp"
            hint="Các lớp học được phục hồi từ bộ đệm trước để không phải tải lại toàn bộ khi đổi tab."
            variant="mobile-list"
            accent="blue"
          />
        ) : filteredClasses.length > 0 ? (
          <div className="space-y-3">
            {filteredClasses.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                onClick={setSelectedClass}
                onEdit={handleEdit}
                onDelete={setClassToDelete}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-60">
            <BookOpen size={64} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Không tìm thấy lớp học nào</p>
          </div>
        )}
      </div>

      <MobileAdminFloatingAction onClick={handleCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-300">
        <Plus size={26} />
      </MobileAdminFloatingAction>

      <ClassDetailSheet
        cls={selectedClass}
        isOpen={!!selectedClass}
        onClose={() => setSelectedClass(null)}
      />

      <ClassFormSheet
        isOpen={showFormSheet}
        onClose={() => {
          setShowFormSheet(false);
          setEditingClass(null);
        }}
        editingClass={editingClass}
        onSuccess={async () => {
          await loadClasses({ force: true });
          setSelectedClass(null);
        }}
        createClass={createClass}
        updateClass={updateClass}
      />

      <ConfirmDeleteSheet
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        cls={classToDelete}
        onConfirm={async () => {
          await loadClasses({ force: true });
          setSelectedClass(null);
          setClassToDelete(null);
        }}
        deleteClass={deleteClass}
      />
    </div>
  </PullToRefreshWrapper>
  );
}
