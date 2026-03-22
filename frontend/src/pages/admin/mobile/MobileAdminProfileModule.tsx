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
        <div className="min-h-screen bg-slate-50 pb-24">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 pt-4 pb-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white ring-1 ring-white/15">
                        {admin?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Admin</p>
                        <h2 className="truncate text-xl font-black text-white">{admin?.full_name || 'Tài khoản admin'}</h2>
                        <p className="truncate text-sm text-slate-300">{admin?.username || admin?.email || 'Không có username'}</p>
                    </div>
                </div>
            </div>

            <div className="sticky top-[var(--mb-header-height)] z-10 border-b border-slate-200 bg-white px-4">
                <div className="flex gap-5">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`border-b-2 pb-3 pt-3 text-sm font-bold ${activeTab === 'profile' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
                    >
                        Thông tin
                    </button>
                    <button
                        onClick={() => setActiveTab('password')}
                        className={`border-b-2 pb-3 pt-3 text-sm font-bold ${activeTab === 'password' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
                    >
                        Mật khẩu
                    </button>
                </div>
            </div>

            <div className="px-4 py-5">
                {activeTab === 'profile' ? (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <User size={18} className="text-emerald-600" />
                                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Thông tin tài khoản</h3>
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
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-transform active:scale-[0.98] disabled:opacity-60"
                        >
                            <Save size={16} />
                            {loading ? 'Đang cập nhật...' : 'Lưu thông tin'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Lock size={18} className="text-emerald-600" />
                                <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">Đổi mật khẩu</h3>
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
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-transform active:scale-[0.98] disabled:opacity-60"
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
            <span className="mb-1.5 block text-sm font-semibold text-slate-600">{label}</span>
            <input
                type={type}
                value={value}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                disabled={disabled}
                required={required}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500"
            />
        </label>
    );
}

function PasswordField({ label, value, onChange, visible, onToggle }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-600">{label}</span>
            <div className="relative">
                <input
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </label>
    );
}
