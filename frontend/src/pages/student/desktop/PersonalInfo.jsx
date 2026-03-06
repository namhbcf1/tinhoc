import { useState, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  User, Mail, Phone, MapPin, CreditCard, Calendar,
  Edit3, Save, X, Camera, Shield, BookOpen, GraduationCap,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AvatarBlock = ({ name }) => {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()
    : 'SV';
  return (
    <div className="relative w-28 h-28 flex-shrink-0 group">
      <div className="w-28 h-28 rounded-[28px] bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center shadow-[0_8px_30px_rgb(52,211,153,0.25)] border-[4px] border-white">
        <span className="text-[36px] font-black text-white tracking-tight">{initials}</span>
      </div>
      <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-[16px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center border border-slate-100 hover:bg-emerald-50 hover:scale-105 hover:text-emerald-600 hover:shadow-lg transition-all duration-300">
        <Camera size={16} className="text-slate-500 transition-colors" />
      </button>
    </div>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, color = 'bg-emerald-50 text-emerald-600 border-emerald-100/50' }) => (
  <div className="flex items-start gap-4 py-4 border-b border-slate-100/60 last:border-0 hover:bg-slate-50/50 -mx-6 px-6 transition-colors duration-300">
    <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 border shadow-sm ${color}`}>
      <Icon size={18} strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0 pt-0.5">
      <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-slate-800 text-[15px] truncate">{value || '—'}</p>
    </div>
  </div>
);

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon: Icon, gradient, children }) => (
  <div className="bg-white rounded-[32px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden anim-card hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all duration-500">
    <div className={`px-7 py-5 ${gradient} flex items-center gap-3 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
      <div className="w-10 h-10 rounded-[14px] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner relative z-10">
        <Icon size={20} className="text-white" strokeWidth={2.5} />
      </div>
      <h3 className="font-black text-white text-[17px] relative z-10">{title}</h3>
    </div>
    <div className="px-7 pb-2">{children}</div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PersonalInfo({ studentData, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.fromTo(
      '.anim-card',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power3.out' }
    );
  }, { scope: containerRef });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
    if (onUpdate) onUpdate();
  };

  if (!studentData) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const student = studentData;
  const fullName = student.fullName || student.ho_ten || student.name || 'Sinh viên';
  const cccd = student.cccd || student.so_cccd || '—';
  const phone = student.phone || student.so_dien_thoai || '—';
  const email = student.email || '—';
  const address = student.address || student.dia_chi || '—';
  const dob = student.date_of_birth || student.ngay_sinh
    ? new Date(student.date_of_birth || student.ngay_sinh).toLocaleDateString('vi-VN')
    : '—';
  const gender = student.gender === 'male' ? 'Nam' : student.gender === 'female' ? 'Nữ' : student.gender || '—';
  const studentCode = student.student_code || student.ma_sinh_vien || '—';
  const classCount = student.registrations?.length || 0;

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* ── Hero Profile Card ── */}
      <div className="anim-card bg-white rounded-[32px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.02)] border border-slate-200/60 overflow-hidden hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] transition-all duration-500">
        {/* Banner */}
        <div className="h-36 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.15]"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute -bottom-24 -right-10 w-64 h-64 bg-white/10 blur-[50px] rounded-full" />
        </div>

        {/* Profile info */}
        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 -mt-16 sm:-mt-14 mb-8 relative z-10">
            <AvatarBlock name={fullName} />
            <div className="flex-1 min-w-0 text-center md:text-left pb-1">
              <h2 className="text-[28px] lg:text-[32px] font-black text-slate-900 leading-tight truncate tracking-tight">{fullName}</h2>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-2 flex-wrap">
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-xl px-3.5 py-1 shadow-sm font-bold text-[12px] uppercase tracking-wide">
                  <GraduationCap size={14} className="mr-1.5 inline" strokeWidth={2.5} /> Học viên
                </Badge>
                {studentCode !== '—' && (
                  <span className="text-[13px] text-slate-500 font-mono font-bold bg-slate-50 px-3 py-1 rounded-xl border border-slate-100">{studentCode}</span>
                )}
              </div>
            </div>
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                variant="outline"
                className="rounded-2xl border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 gap-2 font-bold shadow-sm h-11 px-5 mb-1"
              >
                <Edit3 size={16} strokeWidth={2.5} /> Chỉnh sửa
              </Button>
            ) : (
              <div className="flex gap-3 flex-shrink-0 mb-1">
                <Button
                  onClick={() => setEditing(false)}
                  variant="outline"
                  className="rounded-2xl border-slate-200 text-slate-500 gap-2 font-bold h-11 px-5"
                >
                  <X size={16} strokeWidth={2.5} /> Hủy
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 gap-2 font-bold h-11 px-6 border border-emerald-400/50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={16} strokeWidth={2.5} />
                  )}
                  Lưu
                </Button>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Lớp đã đăng ký', value: classCount, color: 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50' },
              { label: 'Trạng thái', value: 'Đang học', color: 'bg-blue-50/50 text-blue-700 border-blue-100/50' },
              { label: 'Chứng chỉ', value: (student.certificates?.length || 0), color: 'bg-purple-50/50 text-purple-700 border-purple-100/50' },
            ].map((s, i) => (
              <div key={i} className={`${s.color} rounded-[24px] px-5 py-4 text-center border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-70 mb-1.5">{s.label}</p>
                <p className="text-[28px] font-black tracking-tight leading-none">{s.value}</p>
              </div>
            ))}
          </div>

          {saved && (
            <div className="mt-5 flex items-center gap-2.5 text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-2xl px-5 py-4 shadow-sm anim-card">
              <CheckCircle size={18} strokeWidth={2.5} />
              <span className="text-[13px] font-bold tracking-wide">Thông tin cá nhân đã được cập nhật thành công!</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Two Columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <SectionCard title="Thông tin cá nhân" icon={User} gradient="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600">
          <InfoRow icon={CreditCard} label="Số CCCD" value={cccd} color="bg-emerald-50 text-emerald-600 border-emerald-100/50" />
          <InfoRow icon={Calendar} label="Ngày sinh" value={dob} color="bg-blue-50 text-blue-600 border-blue-100/50" />
          <InfoRow icon={User} label="Giới tính" value={gender} color="bg-purple-50 text-purple-600 border-purple-100/50" />
          <InfoRow icon={MapPin} label="Địa chỉ" value={address} color="bg-orange-50 text-orange-600 border-orange-100/50" />
        </SectionCard>

        {/* Contact Info & Security */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Thông tin liên hệ" icon={Phone} gradient="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600">
            <InfoRow icon={Phone} label="Số điện thoại" value={phone} color="bg-blue-50 text-blue-600 border-blue-100/50" />
            <InfoRow icon={Mail} label="Email" value={email} color="bg-indigo-50 text-indigo-600 border-indigo-100/50" />
          </SectionCard>

          {/* ── Security Notice ── */}
          <div className="anim-card flex items-start gap-4 bg-amber-50/50 border border-amber-200/60 rounded-[28px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
            <div className="w-11 h-11 rounded-[16px] bg-amber-100/80 flex items-center justify-center flex-shrink-0 border border-amber-200/50 shadow-sm">
              <Shield size={20} className="text-amber-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[15px] font-black text-amber-900 mb-1.5 tracking-tight">Bảo mật tài khoản</p>
              <p className="text-[13px] text-amber-800/80 leading-relaxed font-semibold">
                Để thay đổi số CCCD hoặc thông tin quan trọng, vui lòng liên hệ trực tiếp với bộ phận hành chính.
                Thông tin cá nhân được giám sát chặt chẽ.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
