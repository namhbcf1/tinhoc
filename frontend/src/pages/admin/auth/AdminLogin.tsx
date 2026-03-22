import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent } from '../../../components/ui/Card';
import api from '../../../services/api';
import { getStorageValue } from '../../../utils/browser-storage.js';
import { persistAdminSession } from '../../../utils/adminSession';
import '../../../styles/admin/AdminLogin.css';

const adminSchema = z.object({
    username: z.string().min(1, 'Vui lòng nhập username'),
    password: z.string().min(1, 'Vui lòng nhập password'),
});

function normalizeInternalPath(value) {
    if (!value) return null;
    try {
        const parsed = new URL(value, window.location.origin);
        if (parsed.origin !== window.location.origin) {
            return null;
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
}

export default function AdminLogin() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const form = useForm({
        resolver: zodResolver(adminSchema),
        defaultValues: {
            username: '',
            password: '',
        },
    });

    const nextPath = useMemo(() => {
        const explicitNext = normalizeInternalPath(searchParams.get('next'));
        if (explicitNext) {
            return explicitNext;
        }

        const adminDashboardUrl = new URL('/admin/dashboard', window.location.origin);
        const requestedTab = searchParams.get('tab');
        const returnTo = searchParams.get('return_to');

        if (requestedTab) {
            adminDashboardUrl.searchParams.set('tab', requestedTab);
        }
        if (returnTo) {
            adminDashboardUrl.searchParams.set('return_to', returnTo);
        }

        return `${adminDashboardUrl.pathname}${adminDashboardUrl.search}${adminDashboardUrl.hash}`;
    }, [searchParams]);

    const finishAdminLogin = (token, admin, scope = 'local') => {
        persistAdminSession({ token, admin, scope });
        navigate(nextPath, { replace: true });
    };

    useEffect(() => {
        const adminToken = getStorageValue('admin_token');
        const adminData = getStorageValue('admin');

        if (adminToken && adminData) {
            navigate(nextPath, { replace: true });
        }
    }, [navigate, nextPath]);

    const handleLogin = async (data) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.login(data.username, data.password);
            if (response.success) {
                finishAdminLogin(response.token, response.admin, 'local');
            } else {
                setError(response.message || 'Đăng nhập thất bại');
            }
        } catch (err) {
            setError(err.message || 'Đăng nhập thất bại');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const ticket = searchParams.get('ticket');
        if (!ticket) {
            return;
        }

        let cancelled = false;

        const exchangeTicket = async () => {
            setIsLoading(true);
            setError('');

            try {
                const response = await api.exchangeSsoTicket(ticket, 'edu');
                if (cancelled) {
                    return;
                }

                if (response?.user?.type !== 'admin') {
                    throw new Error('SSO ticket hiện tại không có quyền quản trị');
                }

                finishAdminLogin(response.token, {
                    id: response.user.id,
                    username: response.user.username || response.user.name || 'admin',
                    full_name: response.user.name || response.user.username || 'Admin',
                    role: response.user.role || 'admin',
                }, 'session');
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Không thể hoàn tất đăng nhập một lần');
                    setIsLoading(false);
                }
            }
        };

        void exchangeTicket();

        return () => {
            cancelled = true;
        };
    }, [navigate, nextPath, searchParams]);

    return (
        <div className="admin-login-page">
            {/* Background decorative elements */}
            <div className="admin-login-bg">
                <div className="admin-login-bg-circle admin-login-bg-circle-1"></div>
                <div className="admin-login-bg-circle admin-login-bg-circle-2"></div>
                <div className="admin-login-bg-circle admin-login-bg-circle-3"></div>
            </div>

            <div className="admin-login-container">
                {/* Logo & Branding */}
                <div className="admin-login-header">
                    <Link to="/" className="admin-login-logo">
                        <img
                            src="/logo.png"
                            alt="VanTrangEdu Logo"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/logo.jpg";
                            }}
                        />
                    </Link>
                    <div className="admin-login-badge">
                        <ShieldCheck size={20} />
                        <span>Quản Trị Hệ Thống</span>
                    </div>
                </div>

                {/* Login Card */}
                <Card className="admin-login-card">
                    <CardContent className="admin-login-card-content">
                        <div className="admin-login-title">
                            <h1>Đăng nhập Admin</h1>
                            <p>Truy cập bảng điều khiển quản trị</p>
                        </div>

                        {error && (
                            <div className="admin-login-error">
                                <span className="admin-login-error-icon">!</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(handleLogin)} className="admin-login-form">
                            <div className="admin-login-field">
                                <Label htmlFor="username">Tên đăng nhập</Label>
                                <div className="admin-login-input-wrapper">
                                    <User className="admin-login-input-icon" size={18} />
                                    <Input
                                        id="username"
                                        name="username"
                                        autoComplete="username"
                                        placeholder="Nhập username"
                                        className="admin-login-input"
                                        {...form.register('username')}
                                    />
                                </div>
                                {form.formState.errors.username && (
                                    <p className="admin-login-field-error">{form.formState.errors.username.message}</p>
                                )}
                            </div>

                            <div className="admin-login-field">
                                <Label htmlFor="password">Mật khẩu</Label>
                                <div className="admin-login-input-wrapper">
                                    <Lock className="admin-login-input-icon" size={18} />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="admin-login-input"
                                        {...form.register('password')}
                                    />
                                </div>
                                {form.formState.errors.password && (
                                    <p className="admin-login-field-error">{form.formState.errors.password.message}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="admin-login-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="admin-login-btn-icon animate-spin" size={20} />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="admin-login-btn-icon" size={20} />
                                        Đăng nhập
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="admin-login-footer">
                    <p>© {new Date().getFullYear()} CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG</p>
                    <Link to="/" className="admin-login-back-link">
                        ← Quay về trang chủ
                    </Link>
                </div>
            </div>
        </div>
    );
}
