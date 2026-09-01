// @ts-nocheck
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import api from '../../services/api';
import { getStorageValue } from '../../utils/browser-storage.js';
import { formatDateVN } from '../../utils/dateUtils';
import { persistStudentData } from '../../utils/studentDataLoader';
import { buildStudentSelfServicePayload, STUDENT_PROFILE_SELF_SERVICE_NOTE } from '../../utils/studentProfilePolicy';
import BirthPlaceField from '../forms/BirthPlaceField';
import OverlayPortal from '../ui/OverlayPortal';

const fieldWrapperClassName = 'space-y-2';
const inputBaseClassName = 'h-11 rounded-2xl border-[var(--vt-line)] bg-white/85 text-[var(--vt-ink)] shadow-sm transition focus-visible:ring-[var(--vt-champagne-soft)]';
const inputInvalidClassName = 'border-red-300 ring-2 ring-red-100 focus-visible:ring-red-200';
const selectClassName = 'flex h-11 w-full rounded-2xl border border-[var(--vt-line)] bg-white/85 px-3 py-2 text-sm text-[var(--vt-ink)] shadow-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-champagne-soft)] disabled:cursor-not-allowed disabled:opacity-50';
const CCCDUploader = lazy(() => import('../upload/CCCDUploader'));

// ---- Helpers kiểm tra dữ liệu -------------------------------------------------

function normalizeProfileGender(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return 'Nam';
    if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'Nữ';
    if (normalized === 'khác' || normalized === 'khac' || normalized === 'other') return 'Khác';
    return '';
}

/** DD/MM/YYYY + ngày có thật trên lịch (không chấp nhận 31/02). */
function isValidDateVN(value, { maxToday = true } = {}) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || '').trim());
    if (!match) return false;
    const [, dd, mm, yyyy] = match;
    const day = Number(dd);
    const month = Number(mm);
    const year = Number(yyyy);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
    if (maxToday && date.getTime() > Date.now()) return false;
    return true;
}

const dateRule = (message) => ({
    validate: (value) => !value || isValidDateVN(value) || message,
});

const phoneRule = {
    validate: (value) =>
        !value || /^(0\d{9}|\+84\d{9})$/.test(String(value).replace(/[\s.-]/g, ''))
            || 'Số điện thoại phải gồm 10 số (bắt đầu bằng 0) hoặc 10 số sau +84',
};

const emailRule = {
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim()) || 'Email không hợp lệ',
};

const cccdRule = {
    validate: (value) => !value || /^\d{8,12}$/.test(String(value).replace(/\s/g, '')) || 'Số CCCD/CMND phải gồm 8–12 chữ số',
};

const IMAGE_FIELD_LABELS = {
    front: 'CCCD mặt trước',
    back: 'CCCD mặt sau',
    portrait: 'ảnh thẻ 3×4',
};

// ---- Thành phần trình bày -----------------------------------------------------

function SectionCard({ icon: Icon, accentClassName, title, description, children }) {
    return (
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.82)] p-4 shadow-[var(--vt-shadow-card)] backdrop-blur sm:p-5 lg:p-6">
            <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--vt-champagne)] to-transparent opacity-70" />
            <div className="relative mb-5 flex items-start gap-4">
                <span className={`mt-1 h-11 w-1.5 shrink-0 rounded-full ${accentClassName}`}></span>
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-base font-black tracking-[-0.03em] text-[var(--vt-ink)] sm:text-lg">
                        {Icon ? <Icon size={18} className="shrink-0 text-[var(--vt-muted)]" aria-hidden="true" /> : null}
                        {title}
                    </h3>
                    {description ? (
                        <p className="mt-1 text-sm leading-6 text-[var(--vt-muted)]">{description}</p>
                    ) : null}
                </div>
            </div>
            <div className="relative">{children}</div>
        </section>
    );
}

function FieldGroup({ label, required, error, className = '', children }) {
    return (
        <div className={`${fieldWrapperClassName} ${className}`.trim()}>
            <Label className="text-[12px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]">
                {label}
                {required ? <span className="ml-0.5 text-red-500" aria-hidden="true">*</span> : null}
            </Label>
            {children}
            {error ? (
                <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold leading-5 text-red-600">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function GenderSegmented({ value, onChange, invalid }) {
    const options = ['Nam', 'Nữ'];
    return (
        <div
            role="radiogroup"
            aria-label="Giới tính"
            className={`flex h-11 items-center gap-1 rounded-2xl border bg-white/85 p-1 shadow-sm ${invalid ? inputInvalidClassName : 'border-[var(--vt-line)]'}`}
        >
            {options.map((option) => {
                const active = value === option;
                return (
                    <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(active ? '' : option)}
                        className={`h-full flex-1 rounded-xl text-sm font-bold transition ${
                            active
                                ? 'bg-[var(--vt-ink)] text-white shadow-sm'
                                : 'text-[var(--vt-muted)] hover:bg-[var(--vt-champagne-soft)] hover:text-[var(--vt-ink)]'
                        }`}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}

// ---- Component chính ----------------------------------------------------------

export default function StudentProfileEditor({ studentData, isOpen, onClose, onUpdateSuccess }) {
    const { register, handleSubmit, reset, setValue, watch, formState } = useForm();
    const { errors, isDirty } = formState;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [flash, setFlash] = useState('');
    const [imageFront, setImageFront] = useState(studentData?.image_cccd_front || '');
    const [imageBack, setImageBack] = useState(studentData?.image_cccd_back || '');
    const [imagePortrait, setImagePortrait] = useState(studentData?.image_3x4 || '');
    const watchedBirthPlace = watch('noi_sinh');
    const initialSnapshotRef = useRef({});

    // Xóa thông báo trạng thái sau vài giây.
    useEffect(() => {
        if (!flash) return undefined;
        const timer = setTimeout(() => setFlash(''), 2500);
        return () => clearTimeout(timer);
    }, [flash]);

    useEffect(() => {
        if (studentData) {
            setImageFront(studentData.image_cccd_front || '');
            setImageBack(studentData.image_cccd_back || '');
            setImagePortrait(studentData.image_3x4 || '');

            const formData = {
                ho: studentData.ho || '',
                ten_dem: studentData.ten_dem || '',
                ten: studentData.ten || '',
                ngay_sinh: formatDateVN(studentData.ngay_sinh) || '',
                gioi_tinh: normalizeProfileGender(studentData.gioi_tinh),
                noi_sinh: studentData.noi_sinh || '',
                dan_toc: studentData.dan_toc || '',
                quoc_tich: studentData.quoc_tich || '',
                sdt: studentData.sdt || '',
                email: studentData.email || '',
                dia_chi: studentData.dia_chi || '',
                cccd: studentData.cccd || '',
                ngay_cap_cccd: formatDateVN(studentData.ngay_cap_cccd) || '',
                don_vi_cong_tac: studentData.don_vi_cong_tac || '',
                nganh_dang_hoc: studentData.nganh_dang_hoc || '',
                cccd_front_image_id: studentData.cccd_front_image_id || '',
                cccd_back_image_id: studentData.cccd_back_image_id || '',
                photo_3x4_image_id: studentData.photo_3x4_image_id || '',
            };
            initialSnapshotRef.current = formData;
            reset(formData);
        }
    }, [studentData, reset]);

    const handleImageUploadSuccess = (field) => (result) => {
        const imageIdField = field === 'front' ? 'cccd_front_image_id' :
            field === 'back' ? 'cccd_back_image_id' : 'photo_3x4_image_id';

        if (result && result.imageId) {
            setValue(imageIdField, result.imageId);

            const saveToDatabase = async () => {
                try {
                    setLoading(true);
                    setError('');

                    const response = await api.updateStudentByCCCD(studentData?.cccd, {
                        [imageIdField]: result.imageId,
                        cccd: studentData?.cccd,
                    });

                    if (response && (response.success || response.data)) {
                        const updatedStudentData = response.data || {};
                        const imageUrl = updatedStudentData[field === 'front' ? 'image_cccd_front' :
                            field === 'back' ? 'image_cccd_back' : 'image_3x4'];

                        try {
                            const existing = JSON.parse(getStorageValue('student_data') || '{}');
                            persistStudentData({ ...existing, ...updatedStudentData }, studentData?.cccd);
                        } catch (_) {
                            // Ignore localStorage parse errors.
                        }

                        if (field === 'front' && imageUrl) {
                            setImageFront(imageUrl);
                        } else if (field === 'back' && imageUrl) {
                            setImageBack(imageUrl);
                        } else if (field === 'portrait' && imageUrl) {
                            setImagePortrait(imageUrl);
                        }

                        setFlash(`Đã lưu ${IMAGE_FIELD_LABELS[field]}.`);
                    } else {
                        setError(response?.message || 'Lưu ảnh thất bại');
                    }
                } catch (err) {
                    setError(err.message || 'Lỗi khi tự động lưu ảnh');
                } finally {
                    setLoading(false);
                }
            };

            saveToDatabase();
        }
    };

    const handleImageUploadError = (err) => {
        setError(err.message || 'Lỗi upload ảnh');
    };

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...buildStudentSelfServicePayload(data),
            };

            const currentGender = normalizeProfileGender(studentData?.gioi_tinh);
            const nextGender = normalizeProfileGender(payload.gioi_tinh);

            // Compatibility guard: old backend normalizes gender to values
            // that can violate deployed DB CHECK constraints.
            // Omit unchanged gender to allow other fields (e.g. address) to save.
            if (!nextGender || nextGender === currentGender) {
                delete payload.gioi_tinh;
            } else {
                payload.gioi_tinh = nextGender;
            }

            const response = await api.updateStudentByCCCD(studentData.cccd, payload);

            if (response.success || response.data) {
                if (response.data) {
                    if (response.data.image_cccd_front) {
                        setImageFront(response.data.image_cccd_front);
                    }
                    if (response.data.image_cccd_back) {
                        setImageBack(response.data.image_cccd_back);
                    }
                    if (response.data.image_3x4) {
                        setImagePortrait(response.data.image_3x4);
                    }

                    try {
                        const existing = JSON.parse(getStorageValue('student_data') || '{}');
                        const updated = { ...existing, ...response.data };
                        persistStudentData(updated, studentData?.cccd);
                    } catch (_) {
                        // Ignore localStorage parse errors.
                    }
                }

                if (typeof onUpdateSuccess === 'function') onUpdateSuccess(response.data || null);
                onClose();
            } else {
                setError(response.message || 'Cập nhật thất bại');
            }
        } catch (err) {
            setError(err.message || 'Lỗi server');
        } finally {
            setLoading(false);
        }
    };

    // Khi bấm Lưu mà có trường chưa hợp lệ: cuộn tới lỗi đầu tiên để người dùng thấy ngay.
    const onInvalid = (errorFields) => {
        const firstField = Object.keys(errorFields)[0];
        if (!firstField) return;
        const el = document.querySelector(`[name="${firstField}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el && typeof el.focus === 'function') {
            setTimeout(() => el.focus({ preventScroll: true }), 350);
        }
    };

    const handleClose = () => {
        if (isDirty && !window.confirm('Bạn đang có thay đổi chưa lưu. Đóng màn hình và bỏ các thay đổi này?')) {
            return;
        }
        onClose();
    };

    if (!isOpen) return null;

    // Số trường thông tin vừa sửa so với lúc mở form (không tính ảnh — ảnh lưu ngay).
    const values = watch();
    const changedCount = Object.keys(values).filter(
        (key) => !key.endsWith('_image_id')
            && String(values[key] ?? '').trim() !== String(initialSnapshotRef.current[key] ?? '').trim(),
    ).length;

    const fullName = [values.ho, values.ten_dem, values.ten].filter(Boolean).join(' ').trim()
        || [studentData?.ho, studentData?.ten_dem, studentData?.ten].filter(Boolean).join(' ').trim()
        || 'Học viên';
    const initials = fullName.split(/\s+/).filter(Boolean).slice(-2).map((word) => word[0]).join('').toUpperCase();

    const studentCode = studentData?.cccd
        ? `CCCD •••• ${String(studentData.cccd).slice(-4)}`
        : 'Hồ sơ học viên';

    const uploaderFallback = (
        <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Đang tải khu vực tải ảnh…
        </div>
    );

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[rgba(11,23,40,0.72)] p-0 backdrop-blur-sm sm:p-5">
                <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--vt-ivory)] text-[var(--vt-ink)] sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[34px] sm:border sm:border-[rgba(255,250,241,0.72)] sm:shadow-[0_40px_110px_rgba(11,23,40,0.42)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_8%,rgba(200,169,106,0.22),transparent_30%),radial-gradient(circle_at_14%_92%,rgba(29,111,95,0.12),transparent_34%)]" />
                <div className="relative border-b border-[var(--vt-line)] bg-[rgba(255,250,241,0.9)] px-4 py-4 shadow-[0_18px_50px_rgba(19,34,56,0.08)] backdrop-blur-xl sm:px-6 sm:py-5 lg:px-8">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--vt-ink)] text-lg font-black tracking-wide text-[var(--vt-champagne)] shadow-sm sm:flex" aria-hidden="true">
                                {initials || '•'}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate text-lg font-black tracking-[-0.04em] text-[var(--vt-ink)] sm:text-2xl">
                                        {fullName}
                                    </h2>
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-bold text-[var(--vt-muted)] shadow-sm ring-1 ring-[var(--vt-line)]">
                                        {studentCode}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-sm leading-5 text-[var(--vt-muted)]">
                                    {STUDENT_PROFILE_SELF_SERVICE_NOTE}
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            size="icon"
                            aria-label="Đóng"
                            className="h-10 w-10 shrink-0 rounded-2xl border border-[var(--vt-line)] bg-white/90 text-[var(--vt-muted)] shadow-sm hover:bg-white hover:text-[var(--vt-ink)]"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
                        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)] xl:gap-6">
                            <div className="order-2 space-y-5 xl:order-1">
                                {error ? (
                                    <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                                        <span className="flex items-start gap-2">
                                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                            {error}
                                        </span>
                                        <button type="button" onClick={() => setError('')} aria-label="Bỏ qua thông báo" className="shrink-0 rounded-lg p-0.5 text-red-400 transition hover:bg-red-100 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : null}
                                {flash ? (
                                    <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
                                        <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
                                        {flash}
                                    </div>
                                ) : null}

                                <SectionCard
                                    accentClassName="bg-[var(--vt-emerald)]"
                                    title="Thông tin cá nhân"
                                    description="Họ tên và ngày sinh cần trùng khớp với giấy tờ tùy thân."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                        <FieldGroup label="Họ" required error={errors.ho?.message} className="xl:col-span-4">
                                            <Input {...register('ho', { required: 'Vui lòng nhập họ' })} className={`${inputBaseClassName} ${errors.ho ? inputInvalidClassName : ''}`} />
                                        </FieldGroup>
                                        <FieldGroup label="Tên đệm" className="xl:col-span-4">
                                            <Input {...register('ten_dem')} className={inputBaseClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Tên" required error={errors.ten?.message} className="xl:col-span-4">
                                            <Input {...register('ten', { required: 'Vui lòng nhập tên' })} className={`${inputBaseClassName} font-semibold ${errors.ten ? inputInvalidClassName : ''}`} />
                                        </FieldGroup>

                                        <FieldGroup label="Ngày sinh" required error={errors.ngay_sinh?.message} className="xl:col-span-4">
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="DD/MM/YYYY"
                                                {...register('ngay_sinh', {
                                                    required: 'Vui lòng nhập ngày sinh',
                                                    ...dateRule('Ngày sinh phải theo định dạng DD/MM/YYYY và là ngày hợp lệ'),
                                                })}
                                                className={`${inputBaseClassName} ${errors.ngay_sinh ? inputInvalidClassName : ''}`}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Giới tính" required error={errors.gioi_tinh?.message} className="xl:col-span-4">
                                            <input type="hidden" {...register('gioi_tinh', { required: 'Vui lòng chọn giới tính' })} />
                                            <GenderSegmented
                                                value={values.gioi_tinh || ''}
                                                invalid={Boolean(errors.gioi_tinh)}
                                                onChange={(next) => setValue('gioi_tinh', next, { shouldValidate: true, shouldDirty: true })}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Nơi sinh" className="xl:col-span-4">
                                            <input type="hidden" {...register('noi_sinh')} />
                                            <BirthPlaceField
                                                label=""
                                                value={watchedBirthPlace || ''}
                                                onChange={(nextValue) => setValue('noi_sinh', nextValue, { shouldDirty: true })}
                                                hint="Danh sách 34 tỉnh/thành theo phân khu mới nhất."
                                                labelClassName="hidden"
                                                toggleWrapperClassName=""
                                                radioGroupClassName="flex flex-wrap gap-4 text-sm"
                                                radioOptionClassName="inline-flex items-center gap-2 text-sm text-slate-700"
                                                inputClassName={inputBaseClassName}
                                                selectClassName={selectClassName}
                                                hintClassName="text-xs text-slate-500"
                                            />
                                        </FieldGroup>

                                        <FieldGroup label="Dân tộc" className="xl:col-span-4">
                                            <Input {...register('dan_toc')} placeholder="Ví dụ: Kinh" className={inputBaseClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Quốc tịch" className="xl:col-span-4">
                                            <Input {...register('quoc_tich')} placeholder="Ví dụ: Việt Nam" className={inputBaseClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Đơn vị công tác" className="xl:col-span-4">
                                            <Input
                                                {...register('don_vi_cong_tac')}
                                                placeholder="Trường học, cơ quan..."
                                                className={inputBaseClassName}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Khoa/ngành đang theo học" className="xl:col-span-6">
                                            <Input
                                                {...register('nganh_dang_hoc')}
                                                placeholder="Ví dụ: Công nghệ thông tin"
                                                className={inputBaseClassName}
                                            />
                                        </FieldGroup>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    accentClassName="bg-[var(--vt-champagne)]"
                                    title="Liên hệ và cư trú"
                                    description="Số điện thoại và email là kênh gửi thông báo quan trọng về khóa học và lịch thi."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                        <FieldGroup label="Số điện thoại" required error={errors.sdt?.message} className="xl:col-span-4">
                                            <Input
                                                inputMode="tel"
                                                placeholder="0xxxxxxxxx"
                                                {...register('sdt', { required: 'Vui lòng nhập số điện thoại', ...phoneRule })}
                                                className={`${inputBaseClassName} font-mono ${errors.sdt ? inputInvalidClassName : ''}`}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Email" error={errors.email?.message} className="xl:col-span-8">
                                            <Input
                                                {...register('email', emailRule)}
                                                type="email"
                                                placeholder="ten@email.com"
                                                className={`${inputBaseClassName} ${errors.email ? inputInvalidClassName : ''}`}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Địa chỉ hiện tại" className="md:col-span-2 xl:col-span-12">
                                            <Input
                                                {...register('dia_chi')}
                                                placeholder="Số nhà, đường, phường, tỉnh/thành..."
                                                className={inputBaseClassName}
                                            />
                                        </FieldGroup>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    accentClassName="bg-[var(--vt-ink)]"
                                    title="Giấy tờ tùy thân"
                                    description="Số CCCD là định dạng hồ sơ của bạn — nếu CCCD đổi sang số mới, hãy liên hệ văn phòng để được hỗ trợ chính xác nhất."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                        <FieldGroup label="Số CCCD/CMND" error={errors.cccd?.message} className="xl:col-span-7">
                                            <Input
                                                inputMode="numeric"
                                                {...register('cccd', cccdRule)}
                                                className={`${inputBaseClassName} font-mono ${errors.cccd ? inputInvalidClassName : ''}`}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Ngày cấp" error={errors.ngay_cap_cccd?.message} className="xl:col-span-5">
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="DD/MM/YYYY"
                                                {...register('ngay_cap_cccd', dateRule('Ngày cấp phải theo định dạng DD/MM/YYYY và không được ở tương lai'))}
                                                className={`${inputBaseClassName} ${errors.ngay_cap_cccd ? inputInvalidClassName : ''}`}
                                            />
                                        </FieldGroup>
                                    </div>

                                    <input type="hidden" {...register('cccd_front_image_id')} />
                                    <input type="hidden" {...register('cccd_back_image_id')} />
                                    <input type="hidden" {...register('photo_3x4_image_id')} />
                                </SectionCard>
                            </div>

                            <aside className="order-1 xl:order-2">
                                <div className="space-y-5 xl:sticky xl:top-6">
                                    <SectionCard
                                        accentClassName="bg-[var(--vt-champagne)]"
                                        title="Ảnh hồ sơ"
                                        description="Ảnh được lưu ngay sau khi tải lên — không cần bấm Lưu thay đổi."
                                    >
                                        <div className="space-y-5">
                                            <div className="rounded-[24px] border border-[var(--vt-champagne-soft)] bg-gradient-to-b from-white/90 to-[var(--vt-paper)] p-3 shadow-sm sm:p-4">
                                                <Label className="mb-3 block text-center text-[12px] font-black uppercase tracking-[0.16em] text-[var(--vt-emerald)]">
                                                    Ảnh thẻ 3x4
                                                </Label>
                                                <Suspense fallback={uploaderFallback}>
                                                    <CCCDUploader
                                                        type="photo_3x4"
                                                        photoGenderHint={values.gioi_tinh}
                                                        onUploadSuccess={handleImageUploadSuccess('portrait')}
                                                        onUploadError={handleImageUploadError}
                                                        existingImageUrl={imagePortrait}
                                                    />
                                                </Suspense>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
                                                <div className="rounded-[24px] border border-[var(--vt-line)] bg-white/75 p-3 shadow-sm sm:p-4">
                                                    <Label className="mb-3 block text-center text-[11px] font-black uppercase tracking-[0.18em] text-[var(--vt-muted)]">
                                                        CCCD mặt trước
                                                    </Label>
                                                    <Suspense fallback={uploaderFallback}>
                                                        <CCCDUploader
                                                            type="cccd_front"
                                                            onUploadSuccess={handleImageUploadSuccess('front')}
                                                            onUploadError={handleImageUploadError}
                                                            existingImageUrl={imageFront}
                                                        />
                                                    </Suspense>
                                                </div>

                                                <div className="rounded-[24px] border border-[var(--vt-line)] bg-white/75 p-3 shadow-sm sm:p-4">
                                                    <Label className="mb-3 block text-center text-[11px] font-black uppercase tracking-[0.18em] text-[var(--vt-muted)]">
                                                        CCCD mặt sau
                                                    </Label>
                                                    <Suspense fallback={uploaderFallback}>
                                                        <CCCDUploader
                                                            type="cccd_back"
                                                            onUploadSuccess={handleImageUploadSuccess('back')}
                                                            onUploadError={handleImageUploadError}
                                                            existingImageUrl={imageBack}
                                                        />
                                                    </Suspense>
                                                </div>
                                            </div>
                                        </div>
                                    </SectionCard>

                                    <div className="rounded-[28px] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.78)] px-5 py-4 shadow-[var(--vt-shadow-card)]">
                                        <p className="text-sm font-black text-[var(--vt-ink)]">Mẹo chụp ảnh đạt</p>
                                        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--vt-muted)]">
                                            <li className="flex gap-2"><span aria-hidden="true" className="text-[var(--vt-emerald)]">✓</span>Ảnh 3×4: nền trắng, nhìn thẳng, không đội mũ.</li>
                                            <li className="flex gap-2"><span aria-hidden="true" className="text-[var(--vt-emerald)]">✓</span>CCCD: đủ 4 góc, rõ chữ, không bị lóa sáng.</li>
                                            <li className="flex gap-2"><span aria-hidden="true" className="text-[var(--vt-emerald)]">✓</span>Tải lại ảnh chỉ đổi ảnh — hệ thống không tự sửa thông tin đã điền.</li>
                                        </ul>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>

                    <div className="relative border-t border-[var(--vt-line)] bg-[rgba(255,250,241,0.92)] px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
                        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold leading-6 text-[var(--vt-muted)]">
                                {changedCount > 0 ? (
                                    <>
                                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--vt-champagne)]" aria-hidden="true" />
                                        <span className="text-[var(--vt-ink)]">{changedCount} thay đổi chưa lưu</span>
                                    </>
                                ) : (
                                    <span>Chưa có thay đổi nào cần lưu</span>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={loading}
                                    className="h-11 rounded-2xl border-[var(--vt-line)] bg-white/80 px-5 text-[var(--vt-muted)] hover:text-[var(--vt-ink)]"
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11 rounded-2xl bg-[var(--vt-ink)] px-6 font-black text-white shadow-[var(--vt-shadow-card)] transition hover:bg-[var(--vt-ink-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                                    disabled={loading || changedCount === 0}
                                >
                                    {loading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                    Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
                </div>
            </div>
        </OverlayPortal>
    );
}
