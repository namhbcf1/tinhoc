import React, { useState, useEffect } from 'react';
import { User, Save, Camera, Lock, X, Eye, EyeOff } from 'lucide-react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import CCCDUploader from '../../../components/upload/CCCDUploader';
import { formatDateVN } from '../../../utils/dateUtils';

// Helper to get image URL
const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const accountHash = import.meta.env.VITE_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
        if (accountHash) return `https://imagedelivery.net/${accountHash}/${url}/public`;
    }
    const getApiBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined' &&
            (window.location.hostname.includes('pages.dev') ||
                window.location.hostname.includes('cloudflare') ||
                window.location.hostname.includes('vantrangedu.com'))) {
            return 'https://vantrangedu-api.bangachieu2.workers.dev';
        }
        return '/api';
    };
    const apiBaseUrl = getApiBaseUrl();
    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const imagePath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${imagePath}`;
};

export default function MobileProfileModule({ studentData, onUpdate }) {
    const { success, error, toasts, removeToast } = useToast();
    const [activeTab, setActiveTab] = useState('info');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Safety check - must be first
    if (!studentData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Đang tải thông tin...</p>
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
        gioi_tinh: 'Nam',
        noi_sinh: '',
        dan_toc: 'Kinh',
        quoc_tich: 'Việt Nam',
        sdt: '',
        email: '',
        dia_chi: '',
        cccd: '',
        ngay_cap_cccd: '',
        don_vi_cong_tac: ''
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
                gioi_tinh: studentData.gioi_tinh || 'Nam',
                noi_sinh: studentData.noi_sinh || '',
                dan_toc: studentData.dan_toc || 'Kinh',
                quoc_tich: studentData.quoc_tich || 'Việt Nam',
                sdt: studentData.sdt || studentData.phone_number || '',
                email: studentData.email || '',
                dia_chi: studentData.dia_chi || '',
                cccd: studentData.cccd || '',
                ngay_cap_cccd: formatDateForInput(studentData.ngay_cap_cccd),
                don_vi_cong_tac: studentData.don_vi_cong_tac || ''
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

    // Handle profile update
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Format date back to DD/MM/YYYY for API
            const formatDateForAPI = (dateStr) => {
                if (!dateStr) return null;
                try {
                    const [year, month, day] = dateStr.split('-');
                    return `${day}/${month}/${year}`;
                } catch (e) {
                    return dateStr;
                }
            };

            if (!studentData || !studentData.cccd) {
                error('Thiếu thông tin học viên');
                setSaving(false);
                return;
            }

            const updateData = {
                ...profileForm,
                ngay_sinh: formatDateForAPI(profileForm.ngay_sinh),
                ngay_cap_cccd: formatDateForAPI(profileForm.ngay_cap_cccd),
                photo_3x4_image_id: image3x4Id,
                cccd_front_image_id: imageFrontId,
                cccd_back_image_id: imageBackId
            };

            const response = await api.updateStudentByCCCD(studentData.cccd, updateData);
            if (response && response.success) {
                success('Cập nhật thông tin thành công');
                if (onUpdate) {
                    onUpdate();
                }
            } else {
                error(response?.error || 'Lỗi cập nhật thông tin');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            error('Lỗi cập nhật: ' + (err.message || 'Unknown error'));
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
                error('Lỗi đổi mật khẩu: ' + (err.message || 'Unknown error'));
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
                    .then(() => {
                        if (onUpdate) onUpdate();
                    })
                    .catch(err => console.error('Error auto-saving image:', err));
            }
        }
    };

    const handleImageUploadError = (err) => {
        error('Lỗi upload ảnh: ' + (err.message || 'Unknown error'));
    };

    const displayName = studentData ? `${studentData.ho || ''} ${studentData.ten_dem || ''} ${studentData.ten || ''}`.trim() : 'Học viên';
    const avatarUrl = image3x4 || (studentData?.image_3x4 ? getImageUrl(studentData.image_3x4) : null);

    return (
        <div className="min-h-screen bg-slate-50 pb-28">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-5 pb-8" style={{ overflow: 'clip' }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-violet-500/10 blur-2xl opacity-60" />
                <div className="absolute bottom-0 left-4 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl opacity-60" />
                <div className="relative z-10 flex gap-4 items-center">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-lg overflow-hidden tracking-tight border-2 border-violet-400/30">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }} />
                        ) : null}
                        {!avatarUrl && (
                            <span>{displayName.charAt(0) || 'H'}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Học viên</p>
                        <h2 className="text-xl font-black text-white tracking-tight leading-tight">{displayName}</h2>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-violet-500/20 text-violet-300 mt-1.5 border border-violet-500/30">
                            {studentData?.cccd || 'Học viên'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-4 bg-white sticky z-10 overflow-x-auto" style={{ top: 'var(--mb-header-height)' }}>
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 pb-3 pt-3 font-black text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'text-violet-700 border-violet-600' : 'text-slate-500 border-transparent'}`}
                >
                    Thông tin
                </button>
                <button
                    onClick={() => setActiveTab('photos')}
                    className={`flex-1 pb-3 pt-3 font-black text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'photos' ? 'text-violet-700 border-violet-600' : 'text-slate-500 border-transparent'}`}
                >
                    Ảnh hồ sơ
                </button>
                <button
                    onClick={() => setActiveTab('password')}
                    className={`flex-1 pb-3 pt-3 font-black text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'password' ? 'text-violet-700 border-violet-600' : 'text-slate-500 border-transparent'}`}
                >
                    Đổi mật khẩu
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
                {activeTab === 'info' && (
                    <form onSubmit={handleProfileSubmit} className="space-y-6 py-6">
                        {/* Thông tin cá nhân */}
                        <div>
                            <h3 className="text-xs font-black text-violet-700 uppercase tracking-widest mb-3">Thông tin cá nhân</h3>
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                                    <select
                                        value={profileForm.gioi_tinh}
                                        onChange={(e) => setProfileForm({ ...profileForm, gioi_tinh: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="Nam">Nam</option>
                                        <option value="Nữ">Nữ</option>
                                    </select>
                                </div>
                                <FormField
                                    label="Nơi sinh"
                                    value={profileForm.noi_sinh}
                                    onChange={(v) => setProfileForm({ ...profileForm, noi_sinh: v })}
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

                        {/* Giấy tờ tùy thân */}
                        <div>
                            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">Giấy tờ tùy thân</h3>
                            <div className="space-y-3">
                                <FormField
                                    label="Số CCCD/CMND *"
                                    value={profileForm.cccd}
                                    onChange={(v) => setProfileForm({ ...profileForm, cccd: v })}
                                    disabled
                                />
                                <FormField
                                    label="Ngày cấp CCCD"
                                    type="date"
                                    value={profileForm.ngay_cap_cccd}
                                    onChange={(v) => setProfileForm({ ...profileForm, ngay_cap_cccd: v })}
                                />
                            </div>
                        </div>

                        {/* Liên hệ */}
                        <div>
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">Liên hệ & Cư trú</h3>
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
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
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
                    <div className="py-6 space-y-6">
                        {/* Ảnh 3x4 */}
                        <div>
                            <p className="text-sm font-bold text-slate-700 mb-3">Ảnh thẻ 3x4</p>
                            <CCCDUploader
                                type="photo_3x4"
                                onUploadSuccess={handleImageUploadSuccess('3x4')}
                                onUploadError={handleImageUploadError}
                                existingImageUrl={image3x4}
                            />
                        </div>

                        {/* CCCD Images */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-600 mb-2 text-center">CCCD MẶT TRƯỚC</p>
                                <CCCDUploader
                                    type="cccd_front"
                                    onUploadSuccess={handleImageUploadSuccess('front')}
                                    onUploadError={handleImageUploadError}
                                    existingImageUrl={imageFront}
                                />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 mb-2 text-center">CCCD MẶT SAU</p>
                                <CCCDUploader
                                    type="cccd_back"
                                    onUploadSuccess={handleImageUploadSuccess('back')}
                                    onUploadError={handleImageUploadError}
                                    existingImageUrl={imageBack}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'password' && (
                    <div className="py-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <div className="flex items-start gap-3">
                                <Lock size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-blue-900 mb-1">Thông tin đăng nhập</h3>
                                    <p className="text-sm text-blue-800 mb-2">
                                        Tài khoản học viên sử dụng CCCD và Số điện thoại để đăng nhập, không sử dụng mật khẩu.
                                    </p>
                                    <div className="space-y-2 text-sm text-blue-700">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">CCCD:</span>
                                            <span className="font-mono">{studentData?.cccd || '---'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Số điện thoại:</span>
                                            <span>{studentData?.sdt || studentData?.phone_number || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                            <p className="text-sm text-slate-600 text-center">
                                Nếu bạn cần thay đổi số điện thoại, vui lòng liên hệ với giáo vụ để được hỗ trợ.
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
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
        </div>
    );
};
