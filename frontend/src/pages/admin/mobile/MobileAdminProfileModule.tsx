// @ts-nocheck
import { useEffect, useState } from 'react';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import api from '../../../services/api';
import ToastContainer, { useToast } from '../../../components/ui/ToastContainer';
import { persistAdminSession } from '../../../utils/adminSession';

const EMPTY_PASSWORD_STATE = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
};

export default function MobileAdminProfileModule({ admin, onUpdate }) {
    const { success, error, toasts, removeToast } = useToast();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        next: false,
        confirm: false,
    });
    const [profileForm, setProfileForm] = useState({
        full_name: '',
        email: '',
        phone: '',
    });
    const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_STATE);

    useEffect(() => {
        if (!admin) return;
        setProfileForm({
            full_name: admin.full_name || '',
            email: admin.email || '',
            phone: admin.phone || '',
        });
    }, [admin]);

    const togglePasswordVisibility = (field) => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!admin?.id) return;

        setLoading(true);
        try {
            const response = await api.request(`/admins/${admin.id}`, {
                method: 'PUT',
                body: JSON.stringify(profileForm),
            });

            if (!response?.success) {
                throw new Error(response?.message || 'Cập nhật thất bại');
            }

            const adminResponse = await api.request(`/admins/${admin.id}`, { method: 'GET' });
            if (adminResponse?.success && adminResponse.data) {
                persistAdminSession({ admin: adminResponse.data });
                onUpdate?.(adminResponse.data);
            }

            success('Cập nhật thông tin thành công');
        } catch (err) {
            error('Lỗi cập nhật: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            error('Mật khẩu xác nhận không khớp');
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        try {
            const response = await api.request('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });

            if (!response?.success) {
                throw new Error(response?.message || 'Đổi mật khẩu thất bại');
            }

            setPasswordForm(EMPTY_PASSWORD_STATE);
            success('Đổi mật khẩu thành công');
        } catch (err) {
            error('Lỗi đổi mật khẩu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pb-24">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div className="mx-[var(--admin-mobile-page-x,14px)] mt-3 overflow-hidden rounded-[28px] border border-[rgba(200,169,106,0.18)] bg-[radial-gradient(circle_at_90%_0%,rgba(200,169,106,0.26),transparent_32%),linear-gradient(135deg,#132238_0%,#0b1728_62%,#315b80_100%)] px-4 pb-5 pt-4 text-white shadow-[0_24px_58px_-36px_rgba(11,23,40,0.70)]">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#fffaf1,#c8a96a)] text-2xl font-black text-[var(--admin-ink)] shadow-[0_18px_34px_-22px_rgba(200,169,106,0.72)]">
                        {admin?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[rgba(200,169,106,0.86)]">Admin console</p>
                        <h2 className="truncate text-xl font-black tracking-[-0.04em] text-white">{admin?.full_name || 'Tài khoản admin'}</h2>
                        <p className="truncate text-sm font-medium text-white/62">{admin?.username || admin?.email || 'Không có username'}</p>
                    </div>
                </div>
            </div>

            <div className="sticky top-[calc(var(--mb-header-height)+10px)] z-10 mx-[var(--admin-mobile-page-x,14px)] mt-3 rounded-[22px] border border-[rgba(19,34,56,0.10)] bg-[rgba(255,250,241,0.88)] p-1 shadow-[0_16px_32px_-28px_rgba(19,34,56,0.42)] backdrop-blur-xl">
                <div className="grid grid-cols-2 gap-1">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`rounded-[18px] px-3 py-3 text-sm font-black transition ${activeTab === 'profile' ? 'bg-[var(--admin-ink)] text-[var(--admin-champagne)] shadow-[0_14px_26px_-20px_rgba(19,34,56,0.72)]' : 'text-[var(--admin-text-muted)]'}`}
                    >
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`rounded-[18px] px-3 py-3 text-sm font-black transition ${activeTab === 'password' ? 'bg-[var(--admin-ink)] text-[var(--admin-champagne)] shadow-[0_14px_26px_-20px_rgba(19,34,56,0.72)]' : 'text-[var(--admin-text-muted)]'}`}
                    >
                        Mật khẩu
                    </button>
                </div>
            </div>

            <div className="px-[var(--admin-mobile-page-x,14px)] py-4">
                {activeTab === 'profile' ? (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <section className="rounded-[24px] border border-[rgba(19,34,56,0.11)] bg-[linear-gradient(180deg,rgba(255,250,241,0.98),rgba(247,241,231,0.88))] p-4 shadow-[0_20px_42px_-34px_rgba(19,34,56,0.36)]">
                            <div className="mb-4 flex items-center gap-2">
                                <User size={18} className="text-[var(--admin-champagne)]" />
                                <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[var(--admin-ink)]">Thông tin tài khoản</h3>
                            </div>

                            <div className="space-y-3">
                                <Field
                                    label="Username"
                                    value={admin?.username || ''}
                                    disabled
                                />
                                <Field
                                    label="Họ tên"
                                    value={profileForm.full_name}
                                    onChange={(value) => setProfileForm((prev) => ({ ...prev, full_name: value }))}
                                    required
                                />
                                <Field
                                    label="Email"
                                    type="email"
                                    value={profileForm.email}
                                    onChange={(value) => setProfileForm((prev) => ({ ...prev, email: value }))}
                                />
                                <Field
                                    label="Số điện thoại"
                                    type="tel"
                                    value={profileForm.phone}
                                    onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
                                />
                                <Field
                                    label="Vai trò"
                                    value={admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                    disabled
                                />
                            </div>
                        </section>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[var(--admin-ink)] px-4 py-3.5 text-sm font-black text-[var(--admin-champagne)] shadow-[0_18px_34px_-24px_rgba(19,34,56,0.62)] transition-transform active:scale-[0.98] disabled:opacity-60"
                        >
                            <Save size={16} />
                            {loading ? 'Đang cập nhật...' : 'Lưu thông tin'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <section className="rounded-[24px] border border-[rgba(19,34,56,0.11)] bg-[linear-gradient(180deg,rgba(255,250,241,0.98),rgba(247,241,231,0.88))] p-4 shadow-[0_20px_42px_-34px_rgba(19,34,56,0.36)]">
                            <div className="mb-4 flex items-center gap-2">
                                <Lock size={18} className="text-[var(--admin-champagne)]" />
                                <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[var(--admin-ink)]">Đổi mật khẩu</h3>
                            </div>

                            <div className="space-y-3">
                                <PasswordField
                                    label="Mật khẩu hiện tại"
                                    value={passwordForm.currentPassword}
                                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
                                    visible={showPasswords.current}
                                    onToggle={() => togglePasswordVisibility('current')}
                                />
                                <PasswordField
                                    label="Mật khẩu mới"
                                    value={passwordForm.newPassword}
                                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                                    visible={showPasswords.next}
                                    onToggle={() => togglePasswordVisibility('next')}
                                />
                                <PasswordField
                                    label="Xác nhận mật khẩu mới"
                                    value={passwordForm.confirmPassword}
                                    onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
                                    visible={showPasswords.confirm}
                                    onToggle={() => togglePasswordVisibility('confirm')}
                                />
                            </div>
                        </section>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-[var(--admin-ink)] px-4 py-3.5 text-sm font-black text-[var(--admin-champagne)] shadow-[0_18px_34px_-24px_rgba(19,34,56,0.62)] transition-transform active:scale-[0.98] disabled:opacity-60"
                        >
                            <Lock size={16} />
                            {loading ? 'Đang đổi mật khẩu...' : 'Cập nhật mật khẩu'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', disabled = false, required = false }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--admin-text-muted)]">{label}</span>
            <input
                type={type}
                value={value}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                disabled={disabled}
                required={required}
                className="w-full rounded-[18px] border border-[rgba(19,34,56,0.12)] bg-[rgba(255,250,241,0.96)] px-4 py-3 text-sm font-semibold text-[var(--admin-ink)] outline-none transition focus:border-[rgba(200,169,106,0.56)] focus:ring-4 focus:ring-[rgba(200,169,106,0.15)] disabled:bg-[rgba(239,227,209,0.62)] disabled:text-[var(--admin-text-muted)]"
            />
        </label>
    );
}

function PasswordField({ label, value, onChange, visible, onToggle }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-[var(--admin-text-muted)]">{label}</span>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-[18px] border border-[rgba(19,34,56,0.12)] bg-[rgba(255,250,241,0.96)] px-4 py-3 pr-11 text-sm font-semibold text-[var(--admin-ink)] outline-none transition focus:border-[rgba(200,169,106,0.56)] focus:ring-4 focus:ring-[rgba(200,169,106,0.15)]"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]"
                    aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </label>
    );
}
