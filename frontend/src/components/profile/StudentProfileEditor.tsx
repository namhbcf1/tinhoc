// @ts-nocheck
import { Suspense, lazy, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Save, X } from 'lucide-react';
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
const inputClassName = 'h-11 rounded-2xl border-[var(--vt-line)] bg-white/85 text-[var(--vt-ink)] shadow-sm transition focus-visible:ring-[var(--vt-champagne-soft)]';
const selectClassName = 'flex h-11 w-full rounded-2xl border border-[var(--vt-line)] bg-white/85 px-3 py-2 text-sm text-[var(--vt-ink)] shadow-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vt-champagne-soft)] disabled:cursor-not-allowed disabled:opacity-50';
const CCCDUploader = lazy(() => import('../upload/CCCDUploader'));

function normalizeProfileGender(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return 'Nam';
    if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'Nữ';
    if (normalized === 'khác' || normalized === 'khac' || normalized === 'other') return 'Khác';
    return '';
}

function SectionCard({ accentClassName, title, description, children }) {
    return (
        <section className="relative overflow-hidden rounded-[28px] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.82)] p-4 shadow-[var(--vt-shadow-card)] backdrop-blur sm:p-5 lg:p-6">
            <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--vt-champagne)] to-transparent opacity-70" />
            <div className="relative mb-5 flex items-start gap-4">
                <span className={`mt-1 h-11 w-1.5 shrink-0 rounded-full ${accentClassName}`}></span>
                <div className="min-w-0">
                    <h3 className="text-base font-black tracking-[-0.03em] text-[var(--vt-ink)] sm:text-lg">{title}</h3>
                    {description ? (
                        <p className="mt-1 text-sm leading-6 text-[var(--vt-muted)]">{description}</p>
                    ) : null}
                </div>
            </div>
            <div className="relative">{children}</div>
        </section>
    );
}

function FieldGroup({ label, className = '', children }) {
    return (
        <div className={`${fieldWrapperClassName} ${className}`.trim()}>
            <Label className="text-[12px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]">{label}</Label>
            {children}
        </div>
    );
}

export default function StudentProfileEditor({ studentData, isOpen, onClose, onUpdateSuccess }) {
    const { register, handleSubmit, reset, setValue, watch } = useForm();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [imageFront, setImageFront] = useState(studentData?.image_cccd_front || '');
    const [imageBack, setImageBack] = useState(studentData?.image_cccd_back || '');
    const [imagePortrait, setImagePortrait] = useState(studentData?.image_3x4 || '');
    const watchedBirthPlace = watch('noi_sinh');

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

                        const originalError = error;
                        setError('');
                        setTimeout(() => {
                            if (!error) setError(originalError);
                        }, 2000);
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

    if (!isOpen) return null;

    const uploaderFallback = (
        <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Dang tai trinh upload...
        </div>
    );

    const studentName = [studentData?.ho, studentData?.ten_dem, studentData?.ten]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Hồ sơ sinh viên';

    const studentCode = studentData?.cccd
        ? `CCCD •••• ${String(studentData.cccd).slice(-4)}`
        : 'Cập nhật thông tin hồ sơ';

    return (
        <OverlayPortal>
            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[rgba(11,23,40,0.72)] p-0 backdrop-blur-sm sm:p-5">
                <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--vt-ivory)] text-[var(--vt-ink)] sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[34px] sm:border sm:border-[rgba(255,250,241,0.72)] sm:shadow-[0_40px_110px_rgba(11,23,40,0.42)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_8%,rgba(200,169,106,0.22),transparent_30%),radial-gradient(circle_at_14%_92%,rgba(29,111,95,0.12),transparent_34%)]" />
                <div className="relative border-b border-[var(--vt-line)] bg-[rgba(255,250,241,0.9)] px-4 py-4 shadow-[0_18px_50px_rgba(19,34,56,0.08)] backdrop-blur-xl sm:px-6 sm:py-5 lg:px-8">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-[var(--vt-ink)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--vt-champagne)] shadow-sm">
                                    Hồ sơ học viên
                                </span>
                                <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[var(--vt-muted)] shadow-sm ring-1 ring-[var(--vt-line)]">
                                    {studentCode}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-[-0.04em] text-[var(--vt-ink)] sm:text-3xl">
                                    Chỉnh sửa hồ sơ học viên
                                </h2>
                                <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--vt-muted)]">
                                    {STUDENT_PROFILE_SELF_SERVICE_NOTE}
                                </p>
                            </div>
                            <div className="rounded-[22px] border border-[var(--vt-line)] bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                                <p className="text-sm font-black text-[var(--vt-ink)]">{studentName}</p>
                                <p className="mt-1 text-sm leading-6 text-[var(--vt-muted)]">
                                    Ảnh hồ sơ có thể cập nhật riêng. Riêng ảnh CCCD tải lại ở đây chỉ để thay ảnh và kiểm tra độ rõ, không tự đổi thông tin cá nhân.
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={onClose}
                            size="icon"
                            className="h-10 w-10 rounded-2xl border border-[var(--vt-line)] bg-white/90 text-[var(--vt-muted)] shadow-sm hover:bg-white hover:text-[var(--vt-ink)]"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
                        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)] xl:gap-6">
                            <div className="order-2 space-y-5 xl:order-1">
                                {error ? (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                                        {error}
                                    </div>
                                ) : null}

                                <SectionCard
                                    accentClassName="bg-[var(--vt-emerald)]"
                                    title="Thông tin cá nhân"
                                    description="Các trường cơ bản được chia đều theo nhịp 2 đến 3 cột để nhìn thoáng hơn."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                        <FieldGroup label="Họ" className="xl:col-span-4">
                                            <Input {...register('ho')} className={inputClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Tên đệm" className="xl:col-span-4">
                                            <Input {...register('ten_dem')} className={inputClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Tên" className="xl:col-span-4">
                                            <Input {...register('ten')} className={`${inputClassName} font-semibold`} />
                                        </FieldGroup>

                                        <FieldGroup label="Ngày sinh" className="xl:col-span-4">
                                            <Input
                                                type="text"
                                                placeholder="DD/MM/YYYY"
                                                {...register('ngay_sinh')}
                                                className={inputClassName}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Giới tính" className="xl:col-span-4">
                                            <select {...register('gioi_tinh')} className={selectClassName}>
                                                <option value="">Chọn giới tính</option>
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                            </select>
                                        </FieldGroup>
                                        <FieldGroup label="Nơi sinh" className="xl:col-span-4">
                                            <input type="hidden" {...register('noi_sinh')} />
                                            <BirthPlaceField
                                                label=""
                                                value={watchedBirthPlace || ''}
                                                onChange={(nextValue) => setValue('noi_sinh', nextValue, { shouldDirty: true })}
                                                hint="Luồng trong nước dùng danh sách 34 tỉnh/thành sau sáp nhập."
                                                labelClassName="hidden"
                                                toggleWrapperClassName=""
                                                radioGroupClassName="flex flex-wrap gap-4 text-sm"
                                                radioOptionClassName="inline-flex items-center gap-2 text-sm text-slate-700"
                                                inputClassName={inputClassName}
                                                selectClassName={selectClassName}
                                                hintClassName="text-xs text-slate-500"
                                            />
                                        </FieldGroup>

                                        <FieldGroup label="Dân tộc" className="xl:col-span-4">
                                            <Input {...register('dan_toc')} className={inputClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Quốc tịch" className="xl:col-span-4">
                                            <Input {...register('quoc_tich')} className={inputClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Đơn vị công tác" className="xl:col-span-4">
                                            <Input
                                                {...register('don_vi_cong_tac')}
                                                placeholder="Trường học, cơ quan..."
                                                className={inputClassName}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Khoa/ngành đang theo học" className="xl:col-span-4">
                                            <Input
                                                {...register('nganh_dang_hoc')}
                                                placeholder="Ví dụ: Công nghệ thông tin"
                                                className={inputClassName}
                                            />
                                        </FieldGroup>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    accentClassName="bg-[var(--vt-champagne)]"
                                    title="Liên hệ và cư trú"
                                    description="Thông tin liên hệ chính được ưu tiên chiều rộng rộng hơn để đọc dễ và hạn chế tràn dòng."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                        <FieldGroup label="Số điện thoại" className="xl:col-span-4">
                                            <Input {...register('sdt')} className={inputClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Email" className="xl:col-span-8">
                                            <Input {...register('email')} type="email" className={inputClassName} />
                                        </FieldGroup>
                                        <FieldGroup label="Địa chỉ hiện tại" className="md:col-span-2 xl:col-span-12">
                                            <Input
                                                {...register('dia_chi')}
                                                placeholder="Số nhà, đường, phường, quận, tỉnh..."
                                                className={inputClassName}
                                            />
                                        </FieldGroup>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    accentClassName="bg-[var(--vt-ink)]"
                                    title="Giấy tờ tùy thân"
                                    description="Số CCCD, ngày cấp và ảnh giấy tờ đều có thể cập nhật trực tiếp nếu hồ sơ của bạn thay đổi."
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
                                        <FieldGroup label="Số CCCD/CMND" className="xl:col-span-7">
                                            <Input
                                                {...register('cccd')}
                                                className={`${inputClassName} font-mono`}
                                            />
                                        </FieldGroup>
                                        <FieldGroup label="Ngày cấp CCCD" className="xl:col-span-5">
                                            <Input
                                                type="text"
                                                placeholder="DD/MM/YYYY"
                                                {...register('ngay_cap_cccd')}
                                                className={inputClassName}
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
                                        description="Khối ảnh được gom riêng để dễ kiểm tra trước khi lưu, đồng thời không làm form bị dài trên mobile."
                                    >
                                        <div className="space-y-5">
                                            <div className="rounded-[22px] border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] px-4 py-3 text-sm font-semibold leading-6 text-[var(--vt-ink)]">
                                                Đổi ảnh CCCD/3x4 ở đây chỉ cập nhật ảnh. Hệ thống không OCR lại và không tự sửa các trường thông tin trong biểu mẫu.
                                            </div>

                                            <div className="rounded-[24px] border border-[var(--vt-champagne-soft)] bg-gradient-to-b from-white/90 to-[var(--vt-paper)] p-3 shadow-sm sm:p-4">
                                                <Label className="mb-3 block text-center text-[12px] font-black uppercase tracking-[0.16em] text-[var(--vt-emerald)]">
                                                    Ảnh thẻ 3x4
                                                </Label>
                                                <Suspense fallback={uploaderFallback}>
                                                    <CCCDUploader
                                                        type="photo_3x4"
                                                        photoGenderHint={watch('gioi_tinh')}
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
                                        <p className="text-sm font-black text-[var(--vt-ink)]">Gợi ý bố cục</p>
                                        <p className="mt-2 text-sm leading-6 text-[var(--vt-muted)]">
                                            Trên điện thoại, khối ảnh nằm trước để kiểm tra nhanh. Trên màn hình lớn, panel này ghim bên phải để thao tác không bị lệch nhịp.
                                        </p>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>

                    <div className="relative border-t border-[var(--vt-line)] bg-[rgba(255,250,241,0.92)] px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
                        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm font-semibold leading-6 text-[var(--vt-muted)]">
                                Tất cả thông tin hồ sơ và ảnh giấy tờ trên màn này đều có thể chỉnh sửa và lưu trực tiếp.
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="h-11 rounded-2xl border-[var(--vt-line)] bg-white/80 px-5 text-[var(--vt-muted)] hover:text-[var(--vt-ink)]"
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11 rounded-2xl bg-[var(--vt-ink)] px-6 font-black text-white shadow-[var(--vt-shadow-card)] hover:bg-[var(--vt-ink-soft)]"
                                    disabled={loading}
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
