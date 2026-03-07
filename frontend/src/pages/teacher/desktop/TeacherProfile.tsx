import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { showError } from '../../../utils/errorHandler';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Label } from '../../../components/ui/Label';
import {
  User, Mail, Phone, Building, Briefcase,
  Lock, Save, Key, Camera, ShieldCheck
} from 'lucide-react';

export default function TeacherProfile({ teacher, onUpdate }) {
  const { success, error, toasts, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const avatarInputRef = useRef(null); // hidden file input for avatar upload

  useGSAP(() => {
    gsap.fromTo(
      '.anim-fade-up',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
    );
  }, [activeTab]);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    ho: teacher?.ho || '',
    ten_dem: teacher?.ten_dem || '',
    ten: teacher?.ten || '',
    email: teacher?.email || '',
    sdt: teacher?.sdt || '',
    department: teacher?.department || '',
    position: teacher?.position || '',
    avatar: teacher?.avatar || '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Handle avatar image selection — updates profile form preview only (no separate upload endpoint)
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      error('Vui lòng chọn file ảnh hợp lệ (JPG, PNG, ...)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Store base64 preview locally; save via updateTeacherProfile with avatar field
      setProfileForm(prev => ({ ...prev, avatar: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.updateTeacherProfile(profileForm);
      if (response.success) {
        success('Cập nhật thông tin thành công');
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      error('Mật khẩu mới và xác nhận không khớp');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const response = await api.changeTeacherPassword(
        passwordForm.old_password,
        passwordForm.new_password
      );
      if (response.success) {
        success('Đổi mật khẩu thành công');
        setPasswordForm({
          old_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err) {
      showError(err, { error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12" ref={containerRef}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Profile Header Card */}
      <div className="anim-fade-up">
        <Card className="glass-card border-0 shadow-sm overflow-hidden bg-gradient-to-br from-teal-500/10 to-emerald-500/5">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-teal-100 flex items-center justify-center text-teal-600 shadow-inner overflow-hidden border-4 border-white">
                  {(profileForm.avatar || teacher?.avatar) ? (
                    <img src={profileForm.avatar || teacher.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={64} className="opacity-40" />
                  )}
                </div>
                {/* Hidden file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Thay đổi ảnh đại diện"
                  className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-teal-600 transition-all active:scale-95"
                >
                  <Camera size={18} />
                </button>
              </div>

              <div className="text-center md:text-left space-y-2">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                  {teacher?.ho_ten || `${teacher?.ho} ${teacher?.ten}`}
                </h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <Badge className="bg-teal-100 text-teal-700 border-0 h-7 px-3 font-semibold rounded-lg text-xs">
                    Giáo viên
                  </Badge>
                  <Badge className="bg-white/50 text-slate-500 border-0 h-7 px-3 font-semibold rounded-lg text-xs backdrop-blur-sm">
                    {teacher?.department || 'Khoa CNTT'}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-lg">
                    <ShieldCheck size={14} /> Verified account
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start anim-fade-up">
        {/* Left Sidebar Tabs */}
        <div className="lg:col-span-3 space-y-3">
          {[
            { id: 'info', label: 'Thông tin cá nhân', icon: User },
            { id: 'password', label: 'Bảo mật & Mật khẩu', icon: Lock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl font-bold transition-all ${activeTab === tab.id
                ? 'bg-white text-teal-600 shadow-sm border border-slate-100'
                : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeTab === tab.id ? 'bg-teal-50' : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                <tab.icon size={20} />
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9">
          {activeTab === 'info' && (
            <Card className="glass-card border-0 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <User size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Cập nhật thông tin</h3>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Họ</Label>
                    <Input
                      value={profileForm.ho}
                      onChange={(e) => setProfileForm({ ...profileForm, ho: e.target.value })}
                      required
                      className="h-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Tên đệm</Label>
                    <Input
                      value={profileForm.ten_dem}
                      onChange={(e) => setProfileForm({ ...profileForm, ten_dem: e.target.value })}
                      className="h-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Tên</Label>
                    <Input
                      value={profileForm.ten}
                      onChange={(e) => setProfileForm({ ...profileForm, ten: e.target.value })}
                      required
                      className="h-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Email công việc</Label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                        className="h-12 pl-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Số điện thoại</Label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="tel"
                        value={profileForm.sdt}
                        onChange={(e) => setProfileForm({ ...profileForm, sdt: e.target.value })}
                        required
                        className="h-12 pl-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Khoa / Bộ môn</Label>
                    <div className="relative">
                      <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                        className="h-12 pl-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-semibold text-slate-600">Chức vụ</Label>
                    <div className="relative">
                      <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={profileForm.position}
                        onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                        className="h-12 pl-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-10 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                  >
                    <Save size={18} className="mr-2" />
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card className="glass-card border-0 shadow-sm p-8 max-w-2xl">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Lock size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Đổi mật khẩu</h3>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-600">Mật khẩu hiện tại</Label>
                  <Input
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    required
                    className="h-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-600">Mật khẩu mới</Label>
                  <Input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    required
                    minLength={6}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-slate-400">Tối thiểu 6 ký tự, bao gồm cả chữ và số để tăng bảo mật.</p>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold text-slate-600">Xác nhận mật khẩu</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    required
                    minLength={6}
                    className="h-12 rounded-2xl border-slate-200 focus:ring-teal-500/20 focus:border-teal-500"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-8 border-t border-slate-50 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <Key size={18} className="mr-2" />
                    {loading ? 'Đang thực hiện...' : 'Cập nhật mật khẩu'}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
