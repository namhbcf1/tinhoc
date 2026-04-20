import { Suspense, lazy, useEffect, useState } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle,
  CreditCard,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import {
  StudentInfoCard,
  StudentPageShell,
  StudentPill,
  StudentSection,
} from '../../../features/student/student-shared';

const StudentProfileEditor = lazy(() => import('../../../components/profile/StudentProfileEditor'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeGender(student: any) {
  if (student.gender === 'male'   || student.gioi_tinh === 'male')   return 'Nam';
  if (student.gender === 'female' || student.gioi_tinh === 'female') return 'Nữ';
  return student.gender || student.gioi_tinh || '—';
}

function countExamRegistrations(regs: any[] = []) {
  return regs.filter((r) => r?.class_type === 'thi' || r?.exam_id).length;
}

function countPendingExamRegistrations(regs: any[] = []) {
  return regs.filter((r) => {
    const isExam = r?.class_type === 'thi' || r?.exam_id;
    return isExam && ['pending', 'approved', 'registered'].includes(r?.status);
  }).length;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AvatarBlock({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(-2).join('').toUpperCase()
    : 'SV';

  return (
    <div className="relative w-16 h-16 shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-emerald-100 border-2 border-white shadow-md flex items-center justify-center">
          <span className="text-xl font-extrabold text-emerald-600">{initials}</span>
        </div>
      )}
      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        <Camera size={11} className="text-slate-400" />
      </div>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-[13px] font-extrabold text-slate-800 truncate mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PersonalInfo({
  studentData,
  onUpdate,
}: {
  studentData: any;
  onUpdate?: (data: any) => void;
}) {
  const [currentStudent, setCurrentStudent] = useState(studentData);
  const [isEditorOpen, setIsEditorOpen]     = useState(false);
  const [saved, setSaved]                   = useState(false);

  useEffect(() => { setCurrentStudent(studentData); }, [studentData]);

  function handleUpdateSuccess(next: any) {
    if (next && typeof next === 'object') {
      setCurrentStudent((prev: any) => ({ ...(prev || {}), ...next }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    onUpdate?.(next);
  }

  if (!currentStudent) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-9 w-9 border-[3px] border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const s            = currentStudent;
  const regs         = Array.isArray(s.registrations) ? s.registrations : [];
  const fullName     = s.fullName || s.ho_ten_full || s.ho_ten || s.name || 'Sinh viên';
  const cccd         = s.cccd || s.so_cccd || '—';
  const phone        = s.phone || s.sdt || s.so_dien_thoai || '—';
  const email        = s.email || '—';
  const address      = s.address || s.dia_chi || '—';
  const dob          = (s.date_of_birth || s.ngay_sinh)
    ? new Date(s.date_of_birth || s.ngay_sinh).toLocaleDateString('vi-VN')
    : '—';
  const gender       = normalizeGender(s);
  const studentCode  = s.student_code || s.ma_sinh_vien || '—';
  const examCount    = countExamRegistrations(regs);
  const pendingCount = countPendingExamRegistrations(regs);
  const profileState = email !== '—' && phone !== '—' ? 'Đầy đủ' : 'Cần bổ sung';
  const avatarUrl    = s.image_3x4 || s.photo_3x4_image_id || s.avatar || undefined;

  return (
    <>
      <StudentPageShell
        icon={<User size={20} />}
        title="Hồ sơ cá nhân"
        subtitle="Xem và cập nhật thông tin cá nhân của bạn."
        stats={[
          { label: 'Kỳ thi',     value: examCount    },
          { label: 'Đang xử lý', value: pendingCount },
        ]}
        action={
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
          >
            <Edit3 size={13} />
            Cập nhật
          </button>
        }
      >
        {/* Profile identity card */}
        <StudentInfoCard>
          <div className="flex items-center gap-4">
            <AvatarBlock name={fullName} avatarUrl={avatarUrl} />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold text-slate-900 leading-tight truncate">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StudentPill tone="emerald">
                  <GraduationCap size={10} className="mr-1" />
                  Học viên
                </StudentPill>
                {studentCode !== '—' ? (
                  <span className="text-[11px] font-bold text-slate-400 font-mono">{studentCode}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
            {[
              { label: 'Kỳ thi',     value: examCount,    tone: 'emerald' },
              { label: 'Đang xử lý', value: pendingCount, tone: 'blue'    },
              { label: 'Hồ sơ',      value: profileState, tone: profileState === 'Đầy đủ' ? 'emerald' : 'amber' },
            ].map((item) => (
              <div key={item.label} className="text-center rounded-lg bg-slate-50 border border-slate-100 py-2.5 px-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
                <p className={[
                  'text-sm font-extrabold',
                  item.tone === 'emerald' ? 'text-emerald-600' : item.tone === 'blue' ? 'text-blue-600' : 'text-amber-600',
                ].join(' ')}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </StudentInfoCard>

        {/* Save success banner */}
        {saved ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
            <CheckCircle size={15} />
            <span className="text-xs font-bold">Thông tin cá nhân đã được cập nhật thành công.</span>
          </div>
        ) : null}

        {/* 2-column info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Personal info */}
          <StudentSection title="Thông tin cá nhân">
            <StudentInfoCard>
              <InfoRow icon={CreditCard} label="Số CCCD"   value={cccd}   />
              <InfoRow icon={Calendar}   label="Ngày sinh"  value={dob}    />
              <InfoRow icon={User}       label="Giới tính"  value={gender} />
              <InfoRow icon={MapPin}     label="Địa chỉ"    value={address}/>
            </StudentInfoCard>
          </StudentSection>

          {/* Contact + Security */}
          <div className="space-y-4">
            <StudentSection title="Thông tin liên hệ">
              <StudentInfoCard>
                <InfoRow icon={Phone} label="Số điện thoại" value={phone} />
                <InfoRow icon={Mail}  label="Email"          value={email} />
              </StudentInfoCard>
            </StudentSection>

            {/* Security note */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                <Shield size={14} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-amber-900 mb-0.5">Bảo mật hồ sơ</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Bạn có thể cập nhật thông tin liên hệ. Riêng CCCD và dữ liệu định danh gốc được khóa để tránh sai lệch hồ sơ thi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </StudentPageShell>

      {isEditorOpen ? (
        <Suspense fallback={null}>
          <StudentProfileEditor
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            studentData={currentStudent}
            onUpdateSuccess={handleUpdateSuccess}
          />
        </Suspense>
      ) : null}
    </>
  );
}
