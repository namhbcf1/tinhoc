// @ts-nocheck
import React, { Suspense, lazy, useState, useEffect } from 'react';
import { User, Save, Camera, Lock, X, Eye, EyeOff } from 'lucide-react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { formatDateVN } from '../../../utils/dateUtils';
import { resolveImageUrl } from '../../../utils/imageUrl.js';
import { buildStudentSelfServicePayload, STUDENT_PROFILE_SELF_SERVICE_NOTE } from '../../../utils/studentProfilePolicy';
import { persistStudentData } from '../../../utils/studentDataLoader';
import BirthPlaceField from '../../../components/forms/BirthPlaceField';

const CCCDUploader = lazy(() => import('../../../components/upload/CCCDUploader'));

const getImageUrl = resolveImageUrl;

const profileInputClass = 'w-full rounded-2xl border border-[var(--vt-line)] bg-white/80 px-3.5 py-3 text-sm font-semibold text-[var(--vt-ink)] shadow-sm outline-none transition-all focus:border-[var(--vt-champagne)] focus:ring-2 focus:ring-[rgba(200,169,106,0.18)] disabled:bg-[var(--vt-paper-deep)] disabled:text-[var(--vt-muted)]';
const profileLabelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[var(--vt-muted)]';
const profileSectionClass = 'rounded-[1.65rem] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.86)] p-4 shadow-[var(--vt-shadow-card)]';
const profileSectionTitleClass = 'mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--vt-champagne)]';

function normalizeProfileGender(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return 'Nam';
    if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'Nữ';
    if (normalized === 'khác' || normalized === 'khac' || normalized === 'other') return 'Khác';
    return '';
}

export default function MobileProfileModule({ studentData, onUpdate }) {
    const { success, error, toasts, removeToast } = useToast();
    const [activeTab, setActiveTab] = useState('info');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Safety check - must be first
    if (!studentData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--vt-ivory)] p-4">
                <div className="rounded-[2rem] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.9)] px-7 py-6 text-center shadow-[var(--vt-shadow-card)]">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[var(--vt-champagne)] border-t-transparent" />
                    <p className="font-black text-[var(--vt-ink)]">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        ho: '',
        ten_dem: '',
        ten: '',
        ngay_sinh: '',
        gioi_tinh: '',
        noi_sinh: '',
        dan_toc: 'Kinh',
        quoc_tich: 'Việt Nam',
        sdt: '',
        email: '',
        dia_chi: '',
        cccd: '',
        ngay_cap_cccd: '',
        don_vi_cong_tac: '',
        nganh_dang_hoc: ''
    });

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });

    // Image states
    const [image3x4, setImage3x4] = useState(null);
    const [imageFront, setImageFront] = useState(null);
    const [imageBack, setImageBack] = useState(null);
    const [image3x4Id, setImage3x4Id] = useState(null);
    const [imageFrontId, setImageFrontId] = useState(null);
    const [imageBackId, setImageBackId] = useState(null);

    // Password visibility
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const uploaderFallback = (
        <div className="flex min-h-[180px] items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--vt-champagne-soft)] bg-[var(--vt-paper)] text-sm font-semibold text-[var(--vt-muted)]">
            Đang tải trình upload...
        </div>
    );

    // Load student data
    useEffect(() => {
        if (studentData) {
            // Format date for input (YYYY-MM-DD)
            const formatDateForInput = (dateStr) => {
                if (!dateStr) return '';
                try {
                    const date = new Date(dateStr);
                    if (isNaN(date.getTime())) return '';
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                } catch (e) {
                    return '';
                }
            };

            setProfileForm({
                ho: studentData.ho || '',
                ten_dem: studentData.ten_dem || '',
                ten: studentData.ten || '',
                ngay_sinh: formatDateForInput(studentData.ngay_sinh),
                gioi_tinh: normalizeProfileGender(studentData.gioi_tinh),
                noi_sinh: studentData.noi_sinh || '',
                dan_toc: studentData.dan_toc || 'Kinh',
                quoc_tich: studentData.quoc_tich || 'Việt Nam',
                sdt: studentData.sdt || studentData.phone_number || '',
                email: studentData.email || '',
                dia_chi: studentData.dia_chi || '',
                cccd: studentData.cccd || '',
                ngay_cap_cccd: formatDateForInput(studentData.ngay_cap_cccd),
                don_vi_cong_tac: studentData.don_vi_cong_tac || '',
                nganh_dang_hoc: studentData.nganh_dang_hoc || ''
            });

            // Set image URLs and IDs
            if (studentData.image_3x4) {
                setImage3x4(getImageUrl(studentData.image_3x4));
            }
            if (studentData.image_cccd_front) {
                setImageFront(getImageUrl(studentData.image_cccd_front));
            }
            if (studentData.image_cccd_back) {
                setImageBack(getImageUrl(studentData.image_cccd_back));
            }
            if (studentData.photo_3x4_image_id) {
                setImage3x4Id(studentData.photo_3x4_image_id);
            }
            if (studentData.cccd_front_image_id) {
                setImageFrontId(studentData.cccd_front_image_id);
            }
            if (studentData.cccd_back_image_id) {
                setImageBackId(studentData.cccd_back_image_id);
            }
        }
    }, [studentData]);

    const syncStudentSession = (nextStudentData) => {
        if (!nextStudentData || typeof nextStudentData !== 'object') return;
        persistStudentData(nextStudentData, studentData?.cccd || nextStudentData?.cccd || null);
        if (typeof onUpdate === 'function') {
            onUpdate(nextStudentData);
        }
    };

    // Handle profile update
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!studentData || !studentData.cccd) {
                error('Thiếu thông tin học viên');
                setSaving(false);
                return;
            }

            const updateData = {
                ...buildStudentSelfServicePayload(profileForm),
                photo_3x4_image_id: image3x4Id,
                cccd_front_image_id: imageFrontId,
                cccd_back_image_id: imageBackId,
            };

            const currentGender = normalizeProfileGender(studentData?.gioi_tinh);
            const nextGender = normalizeProfileGender(updateData.gioi_tinh);

            // Compatibility guard for old backend deployment:
            // avoid sending unchanged gender so other fields can still be updated.
            if (!nextGender || nextGender === currentGender) {
                delete updateData.gioi_tinh;
            } else {
                updateData.gioi_tinh = nextGender;
            }

            const response = await api.updateStudentByCCCD(studentData.cccd, updateData);
            if (response && response.success) {
                if (response.data) {
                    syncStudentSession(response.data);
                }
                success('Cập nhật thông tin thành công');
            } else {
                error(response?.error?.message || response?.message || 'Lỗi cập nhật thông tin');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            error('Lỗi cập nhật: ' + (err.message || 'Vui lòng thử lại'));
        } finally {
            setSaving(false);
        }
    };

    // Handle password change
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

        setSaving(true);
        try {
            // Check if student password change endpoint exists
            // For now, we'll try /auth/change-password with student token
            const response = await api.request('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: passwordForm.old_password,
                    newPassword: passwordForm.new_password
                }),
                tokenType: 'student'
            });

            if (response.success) {
                success('Đổi mật khẩu thành công');
                setPasswordForm({
                    old_password: '',
                    new_password: '',
                    confirm_password: ''
                });
            } else {
                error(response.error || 'Lỗi đổi mật khẩu');
            }
        } catch (err) {
            console.error('Error changing password:', err);
            // If endpoint doesn't exist or student doesn't have password, show appropriate message
            if (err.status === 404 || err.message.includes('not found')) {
                error('Tính năng đổi mật khẩu chưa được hỗ trợ cho tài khoản học viên');
            } else {
                error('Lỗi đổi mật khẩu: ' + (err.message || 'Vui lòng thử lại'));
            }
        } finally {
            setSaving(false);
        }
    };

    // Handle image upload success
    const handleImageUploadSuccess = (type) => (result) => {
        if (result && result.imageId) {
            if (type === '3x4') {
                setImage3x4Id(result.imageId);
                if (result.imageUrl) {
                    setImage3x4(result.imageUrl);
                }
            } else if (type === 'front') {
                setImageFrontId(result.imageId);
                if (result.imageUrl) {
                    setImageFront(result.imageUrl);
                }
            } else if (type === 'back') {
                setImageBackId(result.imageId);
                if (result.imageUrl) {
                    setImageBack(result.imageUrl);
                }
            }
            // Auto-save image ID
            if (studentData?.cccd) {
                const updateData = {};
                if (type === '3x4') updateData.photo_3x4_image_id = result.imageId;
                else if (type === 'front') updateData.cccd_front_image_id = result.imageId;
                else if (type === 'back') updateData.cccd_back_image_id = result.imageId;

                api.updateStudentByCCCD(studentData.cccd, updateData)
                    .then((response) => {
                        if (response?.success && response?.data) {
                            syncStudentSession(response.data);
                        }
                    })
                    .catch(err => console.error('Error auto-saving image:', err));
            }
        }
    };

    const handleImageUploadError = (err) => {
        error('Lỗi upload ảnh: ' + (err.message || 'Vui lòng thử lại'));
    };

    const displayName = studentData ? `${studentData.ho || ''} ${studentData.ten_dem || ''} ${studentData.ten || ''}`.trim() : 'Học viên';
    const avatarUrl = image3x4 || (studentData?.image_3x4 ? getImageUrl(studentData.image_3x4) : null);

    return (
        <div className="min-h-screen bg-transparent pb-28">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div className="px-4 pt-2">
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,var(--vt-ink),#0b1728)] p-4 text-white shadow-[var(--vt-shadow-soft)]">
                    <div aria-hidden="true" className="absolute right-[-3.5rem] top-[-4rem] h-32 w-32 rounded-full bg-[var(--vt-champagne-soft)] blur-3xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border-2 border-white/15 bg-white/10 shadow-lg">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-[var(--vt-champagne)]">{displayName.charAt(0) || 'H'}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--vt-champagne)]">Hồ sơ học viên</p>
                            <p className="mt-1 truncate text-lg font-black leading-tight tracking-[-0.04em] text-white">{displayName}</p>
                            <p className="mt-1 font-mono text-[11px] font-bold text-white/55">{studentData?.cccd || '---'}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black text-white/85">Học viên</span>
                    </div>
                </div>
            </div>

            <div className="sticky z-10 px-4 py-3" style={{ top: 'var(--mb-header-height)' }}>
                <div className="grid grid-cols-3 gap-1 rounded-full border border-[var(--vt-line)] bg-[rgba(255,250,241,0.92)] p-1 shadow-[var(--vt-shadow-card)] backdrop-blur-xl">
                    {[
                        { id: 'info', label: 'Thông tin' },
                        { id: 'photos', label: 'Ảnh hồ sơ' },
                        { id: 'password', label: 'Đăng nhập' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-full px-2 py-2.5 text-[11px] font-black transition-all ${activeTab === tab.id ? 'bg-[var(--vt-ink)] text-[var(--vt-champagne)] shadow-sm' : 'text-[var(--vt-muted)]'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 px-4 pb-6">
                {activeTab === 'info' && (
                    <form onSubmit={handleProfileSubmit} className="space-y-4 pb-6">
                        <div className={profileSectionClass}>
                            <h3 className={profileSectionTitleClass}>Thông tin cá nhân</h3>
                            <div className="space-y-3">
                                <FormField
                                    label="Họ *"
                                    value={profileForm.ho}
                                    onChange={(v) => setProfileForm({ ...profileForm, ho: v })}
                                    required
                                />
                                <FormField
                                    label="Tên đệm"
                                    value={profileForm.ten_dem}
                                    onChange={(v) => setProfileForm({ ...profileForm, ten_dem: v })}
                                />
                                <FormField
                                    label="Tên *"
                                    value={profileForm.ten}
                                    onChange={(v) => setProfileForm({ ...profileForm, ten: v })}
                                    required
                                />
                                <FormField
                                    label="Ngày sinh"
                                    type="date"
                                    value={profileForm.ngay_sinh}
                                    onChange={(v) => setProfileForm({ ...profileForm, ngay_sinh: v })}
                                />
                                <div>
                                    <label className={profileLabelClass}>Giới tính</label>
                                    <select
                                        value={profileForm.gioi_tinh}
                                        onChange={(e) => setProfileForm({ ...profileForm, gioi_tinh: e.target.value })}
                                        className={profileInputClass}
                                    >
                                        <option value="">Chọn giới tính</option>
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                    </select>
                                </div>
                                <BirthPlaceField
                                    label="Nơi sinh"
                                    value={profileForm.noi_sinh}
                                    onChange={(v) => setProfileForm({ ...profileForm, noi_sinh: v })}
                                    hint="Trong nước dùng danh sách 34 tỉnh/thành mới."
                                    wrapperClassName="space-y-1.5"
                                    labelClassName={profileLabelClass}
                                    toggleWrapperClassName=""
                                    radioGroupClassName="flex flex-wrap gap-3"
                                    radioOptionClassName="inline-flex items-center gap-2 rounded-full border border-[var(--vt-line)] bg-white/70 px-3 py-1.5 text-xs font-bold text-[var(--vt-ink)]"
                                    inputClassName={profileInputClass}
                                    selectClassName={profileInputClass}
                                    hintClassName="text-xs font-semibold text-[var(--vt-muted)]"
                                />
                                <FormField
                                    label="Dân tộc"
                                    value={profileForm.dan_toc}
                                    onChange={(v) => setProfileForm({ ...profileForm, dan_toc: v })}
                                />
                                <FormField
                                    label="Quốc tịch"
                                    value={profileForm.quoc_tich}
                                    onChange={(v) => setProfileForm({ ...profileForm, quoc_tich: v })}
                                />
                            </div>
                        </div>

                        <div className={profileSectionClass}>
                            <h3 className={profileSectionTitleClass}>Giấy tờ tùy thân</h3>
                            <div className="space-y-3">
                                <FormField
                                    label="Số CCCD/CMND *"
                                    value={profileForm.cccd}
                                    onChange={(v) => setProfileForm({ ...profileForm, cccd: v })}
                                />
                                <FormField
                                    label="Ngày cấp CCCD"
                                    type="date"
                                    value={profileForm.ngay_cap_cccd}
                                    onChange={(v) => setProfileForm({ ...profileForm, ngay_cap_cccd: v })}
                                />
                            </div>
                        </div>

                        <div className={profileSectionClass}>
                            <h3 className={profileSectionTitleClass}>Liên hệ & Cư trú</h3>
                            <div className="space-y-3">
                                <FormField
                                    label="Số điện thoại *"
                                    type="tel"
                                    value={profileForm.sdt}
                                    onChange={(v) => setProfileForm({ ...profileForm, sdt: v })}
                                    required
                                />
                                <FormField
                                    label="Email *"
                                    type="email"
                                    value={profileForm.email}
                                    onChange={(v) => setProfileForm({ ...profileForm, email: v })}
                                    required
                                />
                                <FormField
                                    label="Địa chỉ hiện tại"
                                    value={profileForm.dia_chi}
                                    onChange={(v) => setProfileForm({ ...profileForm, dia_chi: v })}
                                />
                                <FormField
                                    label="Đơn vị công tác"
                                    value={profileForm.don_vi_cong_tac}
                                    onChange={(v) => setProfileForm({ ...profileForm, don_vi_cong_tac: v })}
                                />
                                <FormField
                                    label="Khoa/ngành đang theo học"
                                    value={profileForm.nganh_dang_hoc}
                                    onChange={(v) => setProfileForm({ ...profileForm, nganh_dang_hoc: v })}
                                />
                            </div>
                            <p className="mt-3 rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] px-3 py-2 text-sm font-semibold leading-relaxed text-[var(--vt-ink)]">
                                {STUDENT_PROFILE_SELF_SERVICE_NOTE}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-1">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--vt-ink)] px-4 py-3.5 font-black text-white shadow-[var(--vt-shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        Đang cập nhật...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Cập nhật thông tin
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'photos' && (
                    <div className="space-y-4 pb-6">
                        <div className="rounded-[1.65rem] border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] px-4 py-3 text-sm font-semibold leading-relaxed text-[var(--vt-ink)]">
                            Đổi ảnh CCCD ở đây chỉ để thay ảnh và kiểm tra độ rõ. Hệ thống không OCR lại và không tự đổi thông tin hồ sơ.
                        </div>

                        <div className={profileSectionClass}>
                            <p className={profileSectionTitleClass}>Ảnh thẻ 3x4</p>
                            <Suspense fallback={uploaderFallback}>
                                <CCCDUploader
                                    type="photo_3x4"
                                    photoGenderHint={profileForm.gioi_tinh}
                                    onUploadSuccess={handleImageUploadSuccess('3x4')}
                                    onUploadError={handleImageUploadError}
                                    existingImageUrl={image3x4}
                                />
                            </Suspense>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className={profileSectionClass}>
                                <p className={`${profileSectionTitleClass} text-center`}>CCCD mặt trước</p>
                                <Suspense fallback={uploaderFallback}>
                                    <CCCDUploader
                                        type="cccd_front"
                                        onUploadSuccess={handleImageUploadSuccess('front')}
                                        onUploadError={handleImageUploadError}
                                        existingImageUrl={imageFront}
                                    />
                                </Suspense>
                            </div>
                            <div className={profileSectionClass}>
                                <p className={`${profileSectionTitleClass} text-center`}>CCCD mặt sau</p>
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
                )}

                {activeTab === 'password' && (
                    <div className="space-y-4 pb-6">
                        <div className="rounded-[1.65rem] border border-[var(--vt-line)] bg-[rgba(255,250,241,0.88)] p-4 shadow-[var(--vt-shadow-card)]">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--vt-champagne-soft)] bg-[var(--vt-paper)] text-[var(--vt-ink)]">
                                    <Lock size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-black text-[var(--vt-ink)]">Thông tin đăng nhập</h3>
                                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--vt-muted)]">
                                        Tài khoản học viên sử dụng CCCD và Số điện thoại để đăng nhập, không sử dụng mật khẩu.
                                    </p>
                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="rounded-2xl border border-[var(--vt-line)] bg-white/70 px-3 py-2">
                                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--vt-muted)]">CCCD</span>
                                            <span className="font-mono font-black text-[var(--vt-ink)]">{studentData?.cccd || '---'}</span>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--vt-line)] bg-white/70 px-3 py-2">
                                            <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--vt-muted)]">Số điện thoại</span>
                                            <span className="font-black text-[var(--vt-ink)]">{studentData?.sdt || studentData?.phone_number || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-[1.35rem] border border-[var(--vt-champagne-soft)] bg-[var(--vt-champagne-soft)] p-4">
                            <p className="text-center text-sm font-semibold leading-relaxed text-[var(--vt-ink)]">
                                Mọi thông tin đăng nhập và hồ sơ ở tab Thông tin đều có thể tự cập nhật trực tiếp.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Form Field Component
const FormField = ({ label, value, onChange, type = 'text', required = false, disabled = false }) => {
    return (
        <div>
            <label className={profileLabelClass}>{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                disabled={disabled}
                className={profileInputClass}
            />
        </div>
    );
};
