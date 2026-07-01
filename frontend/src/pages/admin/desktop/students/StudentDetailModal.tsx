// @ts-nocheck
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Edit2, Download, User, Mail, Phone, MapPin, Calendar,
  CreditCard, Award, BookOpen, Clock3, History, CheckCircle2, RefreshCw,
  Truck,
} from 'lucide-react';
import api from '../../../../services/api';
import { formatDateTimeVN, formatDateVN } from '../../../../utils/dateUtils';
import { applyImageFallback } from '../../../../utils/imageUrl';
import CertificateShipmentModal from '../../../../components/admin/CertificateShipmentModal';
import { useOverlayLayer, useOverlayLock } from '../../../../components/ui/overlay-lock';

const STATUS_MAP = {
  studying:  { cls: 'bg-emerald-100 text-emerald-700', text: 'Đang học' },
  active:    { cls: 'bg-emerald-100 text-emerald-700', text: 'Đang học' },
  approved:  { cls: 'bg-blue-100 text-blue-700', text: 'Đã duyệt' },
  pending:   { cls: 'bg-amber-100 text-amber-700', text: 'Chờ duyệt' },
  completed: { cls: 'bg-indigo-100 text-indigo-700', text: 'Hoàn thành' },
  certified: { cls: 'bg-purple-100 text-purple-700', text: 'Có CC' },
  rejected:  { cls: 'bg-rose-100 text-rose-700', text: 'Từ chối' },
  cancelled: { cls: 'bg-slate-100 text-slate-600', text: 'Đã hủy' },
};

const PAYMENT_STATUS_LABELS = {
  approved: 'Đã thanh toán',
  paid: 'Đã thanh toán',
  completed: 'Đã thanh toán',
  pending: 'Chờ thanh toán',
  unpaid: 'Chưa thanh toán',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

const FIELD_LABELS = {
  cccd: 'Số CCCD',
  ho: 'Họ',
  ten_dem: 'Tên đệm',
  ten: 'Tên',
  ho_ten_full: 'Họ tên',
  ngay_sinh: 'Ngày sinh',
  gioi_tinh: 'Giới tính',
  noi_sinh: 'Nơi sinh',
  dan_toc: 'Dân tộc',
  quoc_tich: 'Quốc tịch',
  email: 'Email',
  sdt: 'Số điện thoại',
  dia_chi: 'Địa chỉ',
  ngay_cap_cccd: 'Ngày cấp CCCD',
  don_vi_cong_tac: 'Đơn vị công tác',
  nganh_dang_hoc: 'Khoa/ngành đang theo học',
  cccd_front_image_id: 'Ảnh CCCD mặt trước',
  cccd_back_image_id: 'Ảnh CCCD mặt sau',
  photo_3x4_image_id: 'Ảnh 3x4',
};

function StatusBadge({ status }) {
  const current = STATUS_MAP[status] || { cls: 'bg-slate-100 text-slate-500', text: status || 'Mới' };
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${current.cls}`}>{current.text}</span>;
}

function SectionCard({ title, icon, tone = 'emerald', right, children }) {
  const toneClasses = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    purple: 'text-purple-700 bg-purple-50 border-purple-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-100',
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${toneClasses[tone] || toneClasses.slate}`}>
          {icon}
          <span>{title}</span>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {item.icon}
            <span>{item.label}</span>
          </div>
          <div className="text-sm font-semibold text-slate-800 break-words">{item.value || <span className="text-slate-400 font-normal italic text-xs">Chưa cập nhật</span>}</div>
        </div>
      ))}
    </div>
  );
}

function SummaryStat({ label, value, tone = 'slate' }) {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };

  return (
    <div className={`rounded-[22px] border px-4 py-3.5 ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">{label}</div>
      <div className="mt-1 text-[26px] font-black leading-none tracking-tight">{value}</div>
    </div>
  );
}

function PhotoCard({ src, alt, filename, height = 120, placeholder, fit = 'cover' }) {
  const [hovered, setHovered] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!src) return;
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank');
    }
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      style={{ height }}
      onMouseEnter={() => src && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            className={`h-full w-full ${fit === 'contain' ? 'object-contain p-1' : 'object-cover'}`}
            onError={(event) => applyImageFallback(event, alt)}
          />
          {hovered && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55">
              <button
                onClick={handleDownload}
                className="rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg"
              >
                Tải xuống
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center text-xs text-slate-400">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function formatRegistrationMeta(reg) {
  const pieces = [];
  pieces.push(reg.class_type === 'thi' ? 'Lịch thi' : 'Lớp học');
  if (reg.ngay_thi || reg.registration_created_at || reg.created_at) {
    pieces.push(formatDateVN(reg.ngay_thi || reg.registration_created_at || reg.created_at));
  }
  if (reg.dia_diem) pieces.push(reg.dia_diem);
  return pieces.filter(Boolean).join(' • ');
}

function normalizeHistoryValue(value) {
  if (value === null || value === undefined || value === '') return 'Trống';
  return String(value);
}

function HistoryItem({ item }) {
  const actor = item.changed_by_type === 'admin'
    ? (item.admin_full_name || item.admin_username || 'Quản trị viên')
    : 'Học viên';

  return (
    <div className="relative pl-6">
      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">{FIELD_LABELS[item.field_name] || item.field_name}</div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{actor}</div>
        </div>
        <div className="mt-1 text-xs text-slate-500">{formatDateTimeVN(item.changed_at)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
            <div className="mb-1 font-semibold uppercase tracking-[0.12em] text-rose-500">Trước đó</div>
            <div className="text-slate-700">{normalizeHistoryValue(item.old_value)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
            <div className="mb-1 font-semibold uppercase tracking-[0.12em] text-emerald-600">Sau chỉnh sửa</div>
            <div className="text-slate-700">{normalizeHistoryValue(item.new_value)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentDetailModal({ student, getImageUrl, onClose, onEdit, onRefresh, toast }) {
  const [detailStudent, setDetailStudent] = useState(student);
  const [editHistory, setEditHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [shipmentModalCertificate, setShipmentModalCertificate] = useState(null);
  const overlayLayer = useOverlayLayer(true);

  useOverlayLock();

  useEffect(() => {
    setDetailStudent(student);
  }, [student]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!detailStudent?.id) {
        setEditHistory([]);
        return;
      }

      setHistoryLoading(true);
      try {
        const response = await api.getStudentEditHistory(detailStudent.id, 12, 0);
        const raw = Array.isArray(response?.data) ? response.data : [];
        const filtered = raw.filter((item) => {
          const oldVal = (item.old_value ?? '').toString().trim();
          const newVal = (item.new_value ?? '').toString().trim();
          return oldVal !== newVal;
        });
        setEditHistory(filtered);
      } catch (error: any) {
        console.error('Error loading student edit history:', error);
        setEditHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadHistory();
  }, [detailStudent?.id]);

  useEffect(() => {
    const loadCertificates = async () => {
      if (!detailStudent?.id) {
        setCertificates([]);
        return;
      }

      setCertificatesLoading(true);
      try {
        const response = await api.getCertificates({ student_id: detailStudent.id, limit: 20 });
        const items = Array.isArray(response?.data) ? response.data : [];
        setCertificates(items.filter((item) => item?.status !== 'revoked'));
      } catch (error) {
        console.error('Error loading certificates:', error);
        setCertificates([]);
      } finally {
        setCertificatesLoading(false);
      }
    };

    loadCertificates();
  }, [detailStudent?.id]);

  const registrations = Array.isArray(detailStudent?.registrations) ? detailStudent.registrations : [];
  const pendingRegistrations = registrations.filter((reg) => reg?.status === 'pending');
  const activeRegistrations = registrations.filter((reg) => ['approved', 'active', 'studying'].includes(reg?.status));

  const refreshDetail = async (showSuccessMessage = false) => {
    if (!detailStudent?.cccd) return;

    setRefreshing(true);
    try {
      const response = await api.getStudentByCCCD(detailStudent.cccd);
      const nextStudent = response?.data || detailStudent;
      setDetailStudent(nextStudent);
      await onRefresh?.();
      if (showSuccessMessage) toast?.success('Đã cập nhật trạng thái học viên');
    } catch (error: any) {
      toast?.error(error.message || 'Không thể tải lại dữ liệu học viên');
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveRegistration = async (reg) => {
    const currentKey = `${reg.class_type || 'hoc'}-${reg.registration_id || reg.class_id}`;
    setActionKey(currentKey);
    try {
      if (reg.class_type === 'thi') {
        await api.approveExamStudent(reg.class_id, detailStudent.id);
      } else {
        await api.updateRegistrationStatus(reg.registration_id, 'approved');
      }
      await refreshDetail(true);
    } catch (error: any) {
      toast?.error(error.message || 'Duyệt học viên thất bại');
    } finally {
      setActionKey('');
    }
  };

  const genderText = detailStudent?.gioi_tinh === 'male' || detailStudent?.gioi_tinh === 'Nam' ? 'Nam' : 'Nữ';
  const image3x4 = getImageUrl(detailStudent?.photo_3x4_image_id || detailStudent?.image_3x4);
  const imageFront = getImageUrl(detailStudent?.cccd_front_image_id || detailStudent?.image_cccd_front);
  const imageBack = getImageUrl(detailStudent?.cccd_back_image_id || detailStudent?.image_cccd_back);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100120] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      style={{ zIndex: overlayLayer }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-[1320px] flex-col overflow-hidden rounded-[30px] border border-white/20 bg-white shadow-[0_36px_96px_rgba(15,23,42,0.34)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_36%),linear-gradient(135deg,#059669,#10b981_56%,#34d399)] px-6 py-6 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-[28px] bg-white/15 ring-2 ring-white/20">
                {image3x4 ? (
                  <img
                    src={image3x4}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={(event) => applyImageFallback(event, detailStudent?.ho_ten_full || 'Hoc vien')}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-black">
                    {detailStudent?.ho_ten_full?.charAt(0) || 'H'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[clamp(28px,3vw,40px)] font-black tracking-tight">{detailStudent?.ho_ten_full}</h2>
                  <StatusBadge status={registrations[0]?.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-emerald-50">
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">CCCD: {detailStudent?.cccd || 'Chưa có'}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">Ngày tạo: {formatDateVN(detailStudent?.created_at) || 'Chưa có'}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">Cập nhật: {formatDateVN(detailStudent?.updated_at) || 'Chưa có'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => refreshDetail()}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-2xl bg-white/18 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/26 disabled:opacity-60"
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                Làm mới
              </button>
              {typeof onEdit === 'function' ? (
                <button
                  onClick={() => { onClose(); onEdit(detailStudent); }}
                  className="flex items-center gap-2 rounded-2xl bg-white/18 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/26"
                >
                  <Edit2 size={15} />
                  Chỉnh sửa
                </button>
              ) : null}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-2xl bg-white/18 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/26"
              >
                <Download size={15} />
                In
              </button>
              <button
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18 text-white transition hover:bg-white/26"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryStat label="Tổng đăng ký" value={registrations.length} tone="blue" />
            <SummaryStat label="Đang hiệu lực" value={activeRegistrations.length} tone="emerald" />
            <SummaryStat label="Chờ duyệt" value={pendingRegistrations.length} tone="amber" />
            <SummaryStat label="Lịch sử sửa" value={editHistory.length} tone="purple" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/70 p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)_minmax(320px,0.82fr)]">
            {/* Col 1: Thông tin cá nhân + liên hệ */}
            <div className="space-y-4">
              <SectionCard title="Thông tin cá nhân" icon={<User size={14} />} tone="emerald">
                <InfoGrid
                  items={[
                    { icon: <CreditCard size={12} />, label: 'Số CCCD', value: detailStudent?.cccd },
                    { icon: <Calendar size={12} />, label: 'Ngày cấp CCCD', value: formatDateVN(detailStudent?.ngay_cap_cccd) },
                    { icon: <User size={12} />, label: 'Giới tính', value: genderText },
                    { icon: <Calendar size={12} />, label: 'Ngày sinh', value: formatDateVN(detailStudent?.ngay_sinh) },
                    { icon: <MapPin size={12} />, label: 'Nơi sinh', value: detailStudent?.noi_sinh },
                    { icon: <User size={12} />, label: 'Dân tộc', value: detailStudent?.dan_toc || 'Kinh' },
                    { icon: <Award size={12} />, label: 'Quốc tịch', value: detailStudent?.quoc_tich || 'Việt Nam' },
                    { icon: <Mail size={12} />, label: 'Email', value: detailStudent?.email },
                    { icon: <Phone size={12} />, label: 'Số điện thoại', value: detailStudent?.sdt },
                    { icon: <MapPin size={12} />, label: 'Địa chỉ', value: detailStudent?.dia_chi },
                    { icon: <BookOpen size={12} />, label: 'Đơn vị công tác', value: detailStudent?.don_vi_cong_tac },
                    { icon: <BookOpen size={12} />, label: 'Khoa/ngành', value: detailStudent?.nganh_dang_hoc },
                    { icon: <Clock3 size={12} />, label: 'Cập nhật lần cuối', value: formatDateTimeVN(detailStudent?.updated_at) || formatDateVN(detailStudent?.updated_at) },
                  ]}
                />
              </SectionCard>
            </div>

            {/* Col 2: Ảnh hồ sơ + Lịch sử đăng ký */}
            <div className="space-y-4">
              <SectionCard
                title="Ảnh hồ sơ"
                icon={<Award size={14} />}
                tone="purple"
                right={typeof onEdit === 'function' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onEdit(detailStudent);
                    }}
                    className="rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                  >
                    Đổi ảnh
                  </button>
                ) : null}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Ảnh 3x4</div>
                    <PhotoCard
                      src={image3x4}
                      alt="Ảnh 3x4"
                      filename={`${detailStudent?.ho_ten_full || 'student'}_3x4.jpg`}
                      height={140}
                      placeholder={<><User size={24} className="mb-1 opacity-50" /><span>Chưa có</span></>}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">CCCD trước</div>
                    <PhotoCard
                      src={imageFront}
                      alt="CCCD mặt trước"
                      filename={`${detailStudent?.ho_ten_full || 'student'}_cccd_front.jpg`}
                      height={140}
                      fit="contain"
                      placeholder={<CreditCard size={22} className="opacity-50" />}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">CCCD sau</div>
                    <PhotoCard
                      src={imageBack}
                      alt="CCCD mặt sau"
                      filename={`${detailStudent?.ho_ten_full || 'student'}_cccd_back.jpg`}
                      height={140}
                      fit="contain"
                      placeholder={<CreditCard size={22} className="opacity-50" />}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title={`Lịch sử đăng ký (${registrations.length})`}
                icon={<BookOpen size={14} />}
                tone="slate"
                right={<div className="text-xs font-semibold text-slate-400">{pendingRegistrations.length ? `${pendingRegistrations.length} chờ duyệt` : 'Đã cân bằng'}</div>}
              >
                {registrations.length ? (
                  <div className="space-y-3">
                    {registrations.map((reg, index) => {
                      const approving = actionKey === `${reg.class_type || 'hoc'}-${reg.registration_id || reg.class_id}`;

                      return (
                        <div key={`${reg.registration_id || reg.class_id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-base font-bold text-slate-900">{reg.ten_lop || `Lớp #${reg.class_id}`}</div>
                              <div className="mt-1 text-sm text-slate-500">{formatRegistrationMeta(reg)}</div>
                            </div>
                            <StatusBadge status={reg.status} />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">Mã: {reg.ma_lop || `#${reg.class_id}`}</span>
                            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
                              {reg.class_type === 'thi' ? 'Lịch thi' : 'Lớp học'}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600">
                              Thanh toán: {PAYMENT_STATUS_LABELS[String(reg.payment_status || '').toLowerCase()] || 'Chưa rõ'}
                            </span>
                          </div>

                          {/* Audit trail */}
                          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Clock3 size={12} className="text-slate-400 flex-shrink-0" />
                              <span>Đăng ký lúc: <span className="font-semibold text-slate-700">{reg.registration_created_at ? formatDateTimeVN(reg.registration_created_at) : '---'}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User size={12} className="text-blue-500 flex-shrink-0" />
                              <span>Đăng ký bởi: <span className="font-semibold text-slate-700">{reg.created_by_name || 'Học viên tự đăng ký'}</span></span>
                            </div>
                            {reg.approved_at && (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={12} className={`flex-shrink-0 ${reg.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500'}`} />
                                <span>{reg.status === 'rejected' ? 'Từ chối lúc' : 'Duyệt lúc'}: <span className="font-semibold text-slate-700">{formatDateTimeVN(reg.approved_at)}</span></span>
                              </div>
                            )}
                            {reg.approved_by_name && (
                              <div className="flex items-center gap-2">
                                <User size={12} className={`flex-shrink-0 ${reg.status === 'rejected' ? 'text-rose-500' : 'text-emerald-500'}`} />
                                <span>{reg.status === 'rejected' ? 'Từ chối bởi' : 'Duyệt bởi'}: <span className="font-semibold text-slate-700">{reg.approved_by_name}</span></span>
                              </div>
                            )}
                          </div>

                          {reg.status === 'pending' && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                              <div>
                                <div className="text-sm font-semibold text-amber-900">Có thể duyệt ngay trong modal</div>
                                <div className="text-xs text-amber-700">
                                  {reg.class_type === 'thi' ? 'Duyệt lịch thi cho học viên này' : 'Duyệt nhanh vào lớp mà không cần mở trang đăng ký'}
                                </div>
                              </div>
                              <button
                                onClick={() => handleApproveRegistration(reg)}
                                disabled={approving}
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {approving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                {reg.class_type === 'thi' ? 'Duyệt lịch thi' : 'Duyệt vào lớp'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Học viên này chưa có đăng ký lớp hoặc lịch thi nào.
                  </div>
                )}
              </SectionCard>

              {(certificatesLoading || certificates.length > 0) ? (
                <SectionCard
                  title={`Chứng chỉ đã cấp (${certificates.length})`}
                  icon={<Award size={14} />}
                  tone="blue"
                  right={certificatesLoading ? <RefreshCw size={14} className="animate-spin text-slate-400" /> : null}
                >
                  {certificatesLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((skeleton) => (
                        <div key={skeleton} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certificates.map((cert) => (
                        <div key={cert.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-base font-bold text-slate-900">{cert.certificate_number}</div>
                              <div className="mt-1 text-sm text-slate-500">{cert.ten_lop || 'Không rõ lớp'} • {formatDateVN(cert.issued_date) || 'Chưa có ngày cấp'}</div>
                              <div className="mt-2 text-xs text-slate-500">
                                {cert.shipment_status ? `Vận đơn hiện tại: ${cert.shipment_status}` : 'Chưa tạo vận đơn'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => window.open(api.getCertificateDownloadUrl(cert.id), '_blank')}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                Tải chứng chỉ
                              </button>
                              <button
                                onClick={() => setShipmentModalCertificate(cert)}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                <Truck size={14} />
                                {cert.shipment_status ? 'Xem vận đơn' : 'Tạo vận đơn'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ) : null}
            </div>

            <div className="space-y-4">
              <SectionCard title="Duyệt nhanh" icon={<CheckCircle2 size={14} />} tone="amber">
                {pendingRegistrations.length ? (
                  <div className="space-y-3">
                    {pendingRegistrations.map((reg, index) => {
                      const approving = actionKey === `${reg.class_type || 'hoc'}-${reg.registration_id || reg.class_id}`;
                      return (
                        <div key={`pending-${reg.registration_id || reg.class_id}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                          <div className="text-sm font-bold text-slate-900">{reg.ten_lop || `Lớp #${reg.class_id}`}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatRegistrationMeta(reg)}</div>
                          <button
                            onClick={() => handleApproveRegistration(reg)}
                            disabled={approving}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            {approving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            {reg.class_type === 'thi' ? 'Duyệt lịch thi' : 'Duyệt vào lớp'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Không còn đăng ký nào chờ duyệt.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title={`Lịch sử sửa đổi (${editHistory.length})`}
                icon={<History size={14} />}
                tone="purple"
                right={historyLoading ? <RefreshCw size={14} className="animate-spin text-slate-400" /> : null}
              >
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((skeleton) => (
                      <div key={skeleton} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : editHistory.length ? (
                  <div className="relative space-y-3 before:absolute before:bottom-0 before:left-[5px] before:top-1 before:w-px before:bg-slate-200">
                    {editHistory.map((item) => (
                      <HistoryItem key={item.id} item={item} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    Chưa có lịch sử chỉnh sửa nào cho học viên này.
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
      <CertificateShipmentModal
        open={!!shipmentModalCertificate}
        onOpenChange={(open) => {
          if (!open) {
            setShipmentModalCertificate(null);
          }
        }}
        certificate={shipmentModalCertificate}
        toast={toast}
        onSuccess={() => {
          if (detailStudent?.id) {
            api.getCertificates({ student_id: detailStudent.id, limit: 20 })
              .then((response) => {
                setCertificates(Array.isArray(response?.data) ? response.data.filter((item) => item?.status !== 'revoked') : []);
              })
              .catch(() => null);
          }
        }}
      />
    </div>,
    document.body
  );
}
