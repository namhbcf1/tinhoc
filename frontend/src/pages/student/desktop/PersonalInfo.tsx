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
    <div className="relative w-20 h-20 shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-20 h-20 rounded-[1.35rem] object-cover border-2 border-[var(--vt-paper)] shadow-[var(--vt-shadow-card)]"
        />
      ) : (
        <div className="w-20 h-20 rounded-[1.35rem] bg-[var(--vt-paper)] border-2 border-[var(--vt-champagne-soft)] shadow-[var(--vt-shadow-card)] flex items-center justify-center">
          <span className="text-2xl font-black text-[var(--vt-emerald)]">{initials}</span>
        </div>
      )}
      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[var(--vt-ink)] border border-white/20 shadow-sm flex items-center justify-center">
        <Camera size={13} className="text-[var(--vt-champagne)]" />
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
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--vt-line)] bg-white/65 px-3 py-3 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-[var(--vt-paper)] border border-[var(--vt-champagne-soft)] flex items-center justify-center shrink-0">
        <Icon size={15} className="text-[var(--vt-emerald)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--vt-muted)]">{label}</p>
        <p className="text-[13px] font-black text-[var(--vt-ink)] truncate mt-0.5">{value || '—'}</p>
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
  const workplace    = s.don_vi_cong_tac || '—';
  const major        = s.nganh_dang_hoc || '—';
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
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--vt-ink)] bg-[var(--vt-ink)] px-4 py-2 text-xs font-black text-white transition-all shadow-[var(--vt-shadow-card)] hover:bg-[var(--vt-ink-soft)]"
          >
            <Edit3 size={13} />
            Cập nhật
          </button>
        }
      >
        {/* Profile identity card */}
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--vt-line)] bg-[linear-gradient(135deg,var(--vt-ink),#0b1728)] p-5 text-white shadow-[var(--vt-shadow-soft)] sm:p-6">
          <div aria-hidden="true" className="absolute right-[-5rem] top-[-6rem] h-56 w-56 rounded-full bg-[var(--vt-champagne-soft)] blur-3xl" />
          <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--vt-champagne)] to-transparent" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <AvatarBlock name={fullName} avatarUrl={avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--vt-champagne)]">Hồ sơ học viên</p>
                <h2 className="mt-1 text-2xl font-black leading-tight tracking-[-0.04em] text-white sm:text-3xl">{fullName}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-black text-white/85">
                    <GraduationCap size={11} className="mr-1 text-[var(--vt-champagne)]" />
                    Học viên
                  </span>
                  {studentCode !== '—' ? (
                    <span className="text-[11px] font-bold text-white/55 font-mono">{studentCode}</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[340px]">
              {[
                { label: 'Kỳ thi',     value: examCount },
                { label: 'Đang xử lý', value: pendingCount },
                { label: 'Hồ sơ',      value: profileState },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50 mb-1">{item.label}</p>
                  <p className="text-sm font-black text-[var(--vt-champagne)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save success banner */}
        {saved ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 shadow-sm">
            <CheckCircle size={15} />
            <span className="text-xs font-black">Thông tin cá nhân đã được cập nhật thành công.</span>
          </div>
        ) : null}

        {/* 2-column info */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          {/* Personal info */}
          <StudentSection title="Thông tin cá nhân">
            <StudentInfoCard className="space-y-3">
              <InfoRow icon={CreditCard} label="Số CCCD"   value={cccd}   />
              <InfoRow icon={Calendar}   label="Ngày sinh"  value={dob}    />
              <InfoRow icon={User}       label="Giới tính"  value={gender} />
              <InfoRow icon={GraduationCap} label="Khoa/ngành" value={major} />
              <InfoRow icon={GraduationCap} label="Đơn vị công tác" value={workplace} />
              <InfoRow icon={MapPin}     label="Địa chỉ"    value={address}/>
            </StudentInfoCard>
          </StudentSection>

          {/* Contact + Security */}
          <div className="space-y-4">
            <StudentSection title="Thông tin liên hệ">
              <StudentInfoCard className="space-y-3">
                <InfoRow icon={Phone} label="Số điện thoại" value={phone} />
                <InfoRow icon={Mail}  label="Email"          value={email} />
              </StudentInfoCard>
            </StudentSection>

            {/* Security note */}
            <div className="flex items-start gap-3 rounded-[1.65rem] border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] p-4 shadow-sm sm:p-5">
              <div className="w-9 h-9 rounded-xl bg-[var(--vt-paper)] border border-[var(--vt-champagne-soft)] flex items-center justify-center shrink-0">
                <Shield size={15} className="text-[var(--vt-ink)]" />
              </div>
              <div>
                <p className="text-xs font-black text-[var(--vt-ink)] mb-0.5">Bảo mật hồ sơ</p>
                <p className="text-[11px] font-semibold text-[var(--vt-muted)] leading-relaxed">
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
