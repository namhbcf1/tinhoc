import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Clock, Search, MoreHorizontal, XCircle, ArrowLeft, MapPin, CreditCard, Info, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import api from '../../../services/api';
import { formatDateVN } from '../../../utils/dateUtils';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../../../components/ui/Dialog';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/ToastContainer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import ClassRegistrations from './components/ClassRegistrations';
import ClassSchedules from './components/ClassSchedules';
import ClassTeachers from './components/ClassTeachers';

export default function ClassesManagement() {
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [viewingClassId, setViewingClassId] = useState(null);
  const [showClassModal, setShowClassModal] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    ten_lop: '',
    ma_lop: '',
    ngay_bat_dau: '',
    ngay_ket_thuc: '',
    hoc_phi: '',
    open_at: '',
    close_at: '',
    status: 'open',
    class_type: 'hoc',
    max_students: '',
    schedule_days: [],
    schedule_start_time: '18:30',
    schedule_end_time: '20:30',
    schedule_location: '',
    notes: '',
    isFreeContact: false
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await api.getClasses();
      const data = response.success && response.data ? response.data : (response.data || []);
      // Filter only 'hoc' (training) classes if the user desires, 
      // but let's keep it flexible so they can see all they manage here.
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast?.error('Lỗi tải danh sách lớp: ' + error.message);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingClass(null);
    setFormData({
      ten_lop: '',
      ma_lop: '',
      ngay_bat_dau: '',
      ngay_ket_thuc: '',
      hoc_phi: '',
      open_at: '',
      close_at: '',
      status: 'open',
      class_type: 'hoc',
      max_students: '',
      schedule_days: [],
      schedule_start_time: '18:30',
      schedule_end_time: '20:30',
      schedule_location: '',
      notes: '',
      isFreeContact: false
    });
  };

  const handleCreateClass = () => {
    resetForm();
    setShowClassModal(true);
  };

  const handleEdit = (cls, e) => {
    e.stopPropagation();
    setEditingClass(cls);
    const isFreeContact = cls.hoc_phi === 0;
    setFormData({
      ten_lop: cls.ten_lop || '',
      ma_lop: cls.ma_lop || '',
      ngay_bat_dau: formatDateVN(cls.ngay_bat_dau),
      ngay_ket_thuc: formatDateVN(cls.ngay_ket_thuc),
      hoc_phi: isFreeContact ? '0' : (cls.hoc_phi || ''),
      open_at: formatDateVN(cls.open_at, true),
      close_at: formatDateVN(cls.close_at, true),
      status: cls.status || 'open',
      class_type: cls.class_type || 'hoc',
      max_students: cls.max_students || '',
      schedule_days: cls.schedule_days || [],
      schedule_start_time: cls.schedule_start_time || '18:30',
      schedule_end_time: cls.schedule_end_time || '20:30',
      schedule_location: cls.schedule_location || '',
      notes: cls.notes || '',
      isFreeContact: isFreeContact
    });
    setShowClassModal(true);
  };

  const handleDeleteClick = (cls, e) => {
    e.stopPropagation();
    setClassToDelete(cls);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    try {
      await api.deleteClass(classToDelete.id);
      toast?.success('Đã xóa lớp học thành công');
      loadClasses();
    } catch (error) {
      toast?.error('Lỗi khi xóa lớp: ' + error.message);
    } finally {
      setShowDeleteConfirm(false);
      setClassToDelete(null);
    }
  };

  const parseVNDate = (vnDate) => {
    if (!vnDate) return '';
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = vnDate.match(regex);
    if (!match) throw new Error('Format ngày không chuẩn (dd/mm/yyyy)');
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  };

  const parseVNDateTime = (vnDateTime) => {
    if (!vnDateTime) return '';
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
    const match = vnDateTime.match(regex);
    if (!match) throw new Error('Format ngày giờ không chuẩn (dd/mm/yyyy HH:mm)');
    const [, day, month, year, hours, minutes] = match;
    return new Date(year, month - 1, day, hours, minutes).toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        ngay_bat_dau: parseVNDate(formData.ngay_bat_dau),
        ngay_ket_thuc: parseVNDate(formData.ngay_ket_thuc),
        open_at: formData.open_at ? parseVNDateTime(formData.open_at) : null,
        close_at: formData.close_at ? parseVNDateTime(formData.close_at) : null,
        hoc_phi: parseInt(formData.hoc_phi || 0),
        max_students: formData.max_students ? parseInt(formData.max_students) : null
      };

      // Chỉ validate schedule_days khi TẠO MỚI lớp học
      if (!editingClass && formData.class_type === 'hoc' && (!formData.schedule_days || formData.schedule_days.length === 0)) {
        toast?.error('Vui lòng chọn ít nhất 1 ngày trong tuần cho lịch học');
        return;
      }

      if (editingClass) {
        await api.updateClass(editingClass.id, submitData);
        toast?.success('Cập nhật thành công!');
      } else {
        await api.createClass(submitData);
        toast?.success('Tạo lớp thành công!');
      }
      setShowClassModal(false);
      loadClasses();
    } catch (error) {
      toast?.error('Lỗi: ' + error.message);
    }
  };

  const handleDateInput = (field) => (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
    if (value.length > 10) value = value.slice(0, 10);
    setFormData({ ...formData, [field]: value });
  };

  const handleDateTimeInput = (field) => (e) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
    if (value.length >= 10) value = value.slice(0, 10) + ' ' + value.slice(10);
    if (value.length >= 13) value = value.slice(0, 13) + ':' + value.slice(13);
    if (value.length > 16) value = value.slice(0, 16);
    setFormData({ ...formData, [field]: value });
  };

  const handleScheduleDayToggle = (day) => {
    const days = formData.schedule_days || [];
    setFormData({
      ...formData,
      schedule_days: days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    });
  };

  const filteredClasses = classes.filter(cls =>
    cls.ten_lop?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.ma_lop?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewingClassId) {
    const viewedClass = classes.find(c => c.id === viewingClassId);
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {viewedClass && (
          <ClassDetailView
            classId={viewingClassId}
            classData={viewedClass}
            onBack={() => setViewingClassId(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unified Main Content Card */}
      <div className="admin-card unified-card">
        {/* 1. Stats Section (Simplified for Classes) */}
        <div className="admin-stats-unified">
          <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(5b, 33, 182, 0.1)', color: '#5b21b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{classes.length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Tổng số lớp</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{classes.filter(c => c.status === 'open').length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Đang mở đăng ký</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{classes.filter(c => c.status === 'closed').length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Đã đóng đăng ký</div></div>
            </div>
            <div className="admin-stat-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
              <div><div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a' }}>{classes.filter(c => c.status === 'finished').length}</div><div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Đã kết thúc</div></div>
            </div>
          </div>
        </div>

        {/* 2. Toolbar */}
        <div className="admin-toolbar-unified">
          <div style={{ flex: 1, minWidth: 300, display: 'flex', gap: 12, background: '#f8fafc', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0', transition: 'all 0.2s' }}>
            <Search size={20} color="#94a3b8" />
            <Input
              placeholder="Tìm kiếm lớp học theo tên hoặc mã..."
              className="border-none shadow-none focus-visible:ring-0 text-base bg-transparent p-0 h-auto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateClass} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md rounded-xl px-6 h-12">
            <Plus size={18} className="mr-2" /> Tạo lớp học
          </Button>
        </div>

        {/* 3. Content (Grid view as original, but inside unified card) */}
        <div style={{ padding: 32, background: '#fcfcfc' }}>
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-medium">Đang tải dữ liệu...</div>
          ) : filteredClasses.length === 0 ? (
            <div className="admin-empty-state" style={{ padding: 60, background: 'transparent' }}><Calendar size={48} /><p>Không tìm thấy lớp học nào.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredClasses.map((cls) => (
                <Card key={cls.id} className="hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group border-slate-200 rounded-2xl overflow-hidden" onClick={() => setViewingClassId(cls.id)}>
                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex justify-between items-start">
                      <Badge className={
                        cls.status === 'open' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' :
                          cls.status === 'closed' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' :
                            'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
                      }>
                        {cls.status === 'open' ? 'Đang mở' : cls.status === 'closed' ? 'Đã đóng' : 'Hoàn thành'}
                      </Badge>

                      {/* Pending Badge */}
                      {cls.pending_count > 0 && (
                        <div className="absolute top-5 right-14" onClick={(e) => e.stopPropagation()}>
                          <Badge className="bg-red-500 hover:bg-red-600 text-white border-white border-2 shadow-sm animate-pulse">
                            {cls.pending_count} yêu cầu
                          </Badge>
                        </div>
                      )}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100" onClick={(e) => handleEdit(cls, e)}>
                          <Edit size={16} className="text-slate-400 hover:text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100" onClick={(e) => handleDeleteClick(cls, e)}>
                          <Trash2 size={16} className="text-slate-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 mt-3 group-hover:text-blue-600 transition-colors">
                      {cls.ten_lop}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono bg-slate-100 text-slate-500 py-1 px-2 rounded-md inline-block mt-2 font-medium">
                      {cls.ma_lop}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 px-5 space-y-3">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar size={16} className="mr-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatDateVN(cls.ngay_bat_dau)} - {formatDateVN(cls.ngay_ket_thuc)}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Users size={16} className="mr-2.5 text-slate-400 shrink-0" />
                      <span>{cls.total_students || 0} / {cls.max_students || '∞'} học viên</span>
                    </div>
                    {cls.class_type === 'hoc' && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Clock size={16} className="mr-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cls.schedule_summary || 'Chưa xếp lịch'}</span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-3 pb-4 px-5 border-t border-slate-50 bg-slate-50/50">
                    <div className="w-full flex justify-between items-center text-sm">
                      <span className="font-bold text-blue-600 text-base">
                        {cls.hoc_phi === 0 ? 'Liên hệ' : `${parseInt(cls.hoc_phi || 0).toLocaleString()} đ`}
                      </span>
                      <div className="flex items-center text-slate-400 text-xs font-medium group-hover:text-blue-500 transition-colors">
                        Chi tiết <Plus size={12} className="ml-1" />
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DESIGN */}
      <Dialog open={showClassModal} onOpenChange={setShowClassModal}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md">
                {editingClass ? <Edit size={20} /> : <Plus size={20} />}
              </div>
              <DialogTitle className="text-xl font-bold text-slate-800">
                {editingClass ? 'Cập nhật Lớp học' : 'Tạo Lớp học Mới'}
              </DialogTitle>
            </div>
            <DialogClose className="rounded-full p-2 hover:bg-slate-200 transition-colors" onClick={() => setShowClassModal(false)}>
              <XCircle size={24} className="text-slate-400 hover:text-red-500" />
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 overflow-y-auto bg-white flex-1">
              {/* Column 1: Thông tin chung */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                  <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Thông tin chung</h4>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Loại hình hiệu lực *</Label>
                  <Select
                    value={formData.class_type}
                    onChange={(e) => setFormData({ ...formData, class_type: e.target.value })}
                  >
                    <option value="hoc">Lớp học (Đào tạo)</option>
                    <option value="thi">Lớp thi (Kỳ thi)</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Tên lớp học *</Label>
                  <Input
                    value={formData.ten_lop}
                    onChange={(e) => setFormData({ ...formData, ten_lop: e.target.value })}
                    required
                    placeholder="Ví dụ: Tin học văn phòng K12"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Mã hiệu lớp *</Label>
                  <Input
                    value={formData.ma_lop}
                    onChange={(e) => setFormData({ ...formData, ma_lop: e.target.value })}
                    required
                    placeholder="THVP-K12"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Học phí (VNĐ)</Label>
                    <Input
                      type="number"
                      value={formData.hoc_phi}
                      onChange={(e) => setFormData({ ...formData, hoc_phi: e.target.value })}
                      placeholder="500000"
                      disabled={formData.isFreeContact}
                      className="disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Sĩ số tối đa</Label>
                    <Input
                      type="number"
                      value={formData.max_students}
                      onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isFreeContactCheckbox"
                    checked={formData.isFreeContact}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        isFreeContact: checked,
                        hoc_phi: checked ? '0' : ''
                      });
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="isFreeContactCheckbox" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Miễn phí (Yêu cầu liên hệ)
                  </Label>
                </div>
              </div>

              {/* Column 2: Thời gian & Trạng thái */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                  <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Thời gian & Trạng thái</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs">Ngày khai giảng</Label>
                    <Input
                      value={formData.ngay_bat_dau}
                      onChange={handleDateInput('ngay_bat_dau')}
                      placeholder="dd/mm/yyyy"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs">Ngày kết thúc</Label>
                    <Input
                      value={formData.ngay_ket_thuc}
                      onChange={handleDateInput('ngay_ket_thuc')}
                      placeholder="dd/mm/yyyy"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold text-xs">Mở đăng ký (dd/mm/yyyy HH:mm)</Label>
                  <Input
                    value={formData.open_at}
                    onChange={handleDateTimeInput('open_at')}
                    placeholder="01/01/2024 08:00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold text-xs">Đóng đăng ký (dd/mm/yyyy HH:mm)</Label>
                  <Input
                    value={formData.close_at}
                    onChange={handleDateTimeInput('close_at')}
                    placeholder="31/01/2024 17:00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold text-xs">Tình trạng lớp học</Label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="open">Đang mở đăng ký</option>
                    <option value="closed">Đã đóng đăng ký</option>
                    <option value="finished">Đã kết thúc</option>
                  </Select>
                </div>
              </div>

              {/* Column 3: Lịch học định kỳ */}
              <div className={`space-y-6 transition-all duration-300 ${formData.class_type === 'thi' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                  <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Lịch học định kỳ</h4>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-600 font-semibold text-xs">Ngày trong tuần</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 0].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleScheduleDayToggle(day)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all transform active:scale-95 shadow-sm border ${formData.schedule_days?.includes(day)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                          }`}
                      >
                        {day === 0 ? 'CN' : 'T' + (day + 1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs">Giờ mở lớp (24H)</Label>
                    <Input
                      type="text"
                      value={formData.schedule_start_time}
                      onChange={(e) => setFormData({ ...formData, schedule_start_time: e.target.value })}
                      placeholder="08:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold text-xs">Giờ tan lớp (24H)</Label>
                    <Input
                      type="text"
                      value={formData.schedule_end_time}
                      onChange={(e) => setFormData({ ...formData, schedule_end_time: e.target.value })}
                      placeholder="10:00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold text-xs">Phòng học / Link online</Label>
                  <Input
                    value={formData.schedule_location}
                    onChange={(e) => setFormData({ ...formData, schedule_location: e.target.value })}
                    placeholder="Ví dụ: P.202 hoặc Zoom Link"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold text-xs">Ghi chú vận hành</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Ghi chú về lớp học..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowClassModal(false)}
                className="px-6 border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                className="px-8 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl transition-all hover:-translate-y-0.5"
              >
                {editingClass ? 'Lưu thay đổi' : 'Khởi tạo lớp học'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa lớp học"
        message={`Bạn có chắc chắn muốn xóa lớp "${classToDelete?.ten_lop}" không? Toàn bộ dữ liệu đăng ký đi kèm sẽ bị mất.`}
      />
    </div>
  );
}

// Sub-component for Class Detail
function ClassDetailView({ classId, classData, onBack }) {
  const [activeTab, setActiveTab] = useState('registrations');

  // Calculate stats
  const current = classData.current_students || 0;
  const max = classData.max_students || 0;
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;
  const isFull = max > 0 && current >= max;

  return (
    <div className="space-y-6">
      {/* 1. Premium Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={onBack}
                className="mb-4 pl-0 hover:bg-transparent hover:text-blue-600 text-slate-500 transition-colors"
              >
                <ArrowLeft size={18} className="mr-2" /> Quay lại danh sách
              </Button>

              <div className="flex items-center gap-3 mb-2">
                <Badge className={
                  classData.class_type === 'hoc'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3 py-1'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-3 py-1'
                }>
                  {classData.class_type === 'hoc' ? 'Lớp Đào Tạo' : 'Lớp Thi / Sát Hạch'}
                </Badge>
                <Badge variant="outline" className={`border ${classData.status === 'open' ? 'border-green-200 text-green-700 bg-green-50' :
                  classData.status === 'closed' ? 'border-red-200 text-red-700 bg-red-50' :
                    'border-slate-200 text-slate-700 bg-slate-50'
                  }`}>
                  {classData.status === 'open' ? 'Đang Mở Đăng Ký' : classData.status === 'closed' ? 'Đã Đóng Đăng Ký' : 'Đã Kết Thúc'}
                </Badge>
              </div>

              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                {classData.ten_lop}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 font-medium font-mono bg-slate-100 px-3 py-1 rounded-lg w-fit">
                <span className="select-all">#{classData.ma_lop}</span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 min-w-[300px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sĩ số lớp</span>
                <span className={`text-xl font-bold ${isFull ? 'text-red-600' : 'text-blue-600'}`}>
                  {current} <span className="text-slate-400 text-sm font-normal">/ {max > 0 ? max : '∞'}</span>
                </span>
              </div>

              {max > 0 && (
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isFull ? 'bg-red-500' : percent > 80 ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  ></div>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center text-sm text-slate-600">
                  <Calendar size={16} className="mr-3 text-slate-400" />
                  <span>
                    {formatDateVN(classData.ngay_bat_dau)} - {formatDateVN(classData.ngay_ket_thuc)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-slate-600">
                  <CreditCard size={16} className="mr-3 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    {classData.hoc_phi === 0 ? 'Liên hệ' : `${parseInt(classData.hoc_phi).toLocaleString()} đ`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <Card className="overflow-hidden border-none shadow-sm rounded-2xl bg-white ring-1 ring-slate-100">
        <div className="flex border-b border-slate-100 bg-white sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Info size={18} /> THÔNG TIN CHUNG
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'registrations' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Users size={18} /> HỌC VIÊN
            <Badge className="ml-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border-none h-5 px-1.5 min-w-[1.25rem]">{current}</Badge>
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'teachers' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <UserPlus size={18} /> GIÁO VIÊN
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'schedules' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Clock size={18} /> LỊCH TRÌNH
            {classData.schedule_days?.length > 0 && <Badge className="ml-1 bg-green-100 text-green-700 hover:bg-green-200 border-none h-5 w-5 p-0 justify-center flex items-center text-[10px]"><CheckCircle size={10} /></Badge>}
          </button>
        </div>

        <div className="p-0 bg-[#fafafa] min-h-[500px]">
          {activeTab === 'overview' && (
            <div className="p-8 max-w-4xl animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Clock className="text-blue-500" size={20} /> Thời gian đăng ký
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Mở đăng ký</label>
                        <p className="font-medium text-slate-700">{classData.open_at ? formatDateVN(classData.open_at, true) : 'Chưa thiết lập'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Đóng đăng ký</label>
                        <p className="font-medium text-slate-700">{classData.close_at ? formatDateVN(classData.close_at, true) : 'Chưa thiết lập'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <MapPin className="text-purple-500" size={20} /> Địa điểm & Tổ chức
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Địa điểm / Link học</label>
                        <p className="font-medium text-slate-700">{classData.schedule_location || 'Chưa cập nhật'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Lịch học chi tiết</label>
                        <p className="font-medium text-slate-700">{classData.schedule_summary || 'Chưa xếp lịch'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-full">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="text-orange-500" size={20} /> Ghi chú vận hành
                    </h3>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[100px]">
                      {classData.notes ? (
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{classData.notes}</p>
                      ) : (
                        <p className="text-slate-400 italic text-sm">Chưa có ghi chú nào cho lớp học này.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registrations' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 p-6">
              <ClassRegistrations classId={classId} />
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <ClassSchedules classId={classId} className={classData.ten_lop} maLop={classData.ma_lop} />
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 p-6">
              <ClassTeachers classId={classId} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
