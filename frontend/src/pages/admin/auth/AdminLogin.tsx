// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Lock, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Card, CardContent } from '../../../components/ui/Card';
import api from '../../../services/api';
import { getStorageValue } from '../../../utils/browser-storage.js';
import { persistAdminSession } from '../../../utils/adminSession';
import '../../../styles/admin/AdminLogin.css';

const adminSchema = z.object({
    username: z.string().min(1, 'Vui lÃ²ng nháº­p username'),
    password: z.string().min(1, 'Vui lÃ²ng nháº­p password'),
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
    const [showPassword, setShowPassword] = useState(false);

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
        // Don't auto-redirect away from admin login; let user see login page first
    }, []);

    const handleLogin = async (data) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.login(data.username, data.password);
            if (response.success) {
                finishAdminLogin(response.token, response.admin, 'local');
            } else {
                setError(response.message || 'ÄÄƒng nháº­p tháº¥t báº¡i');
            }
        } catch (err) {
            setError(err.message || 'ÄÄƒng nháº­p tháº¥t báº¡i');
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
                    throw new Error('SSO ticket hiá»‡n táº¡i khÃ´ng cÃ³ quyá»n quáº£n trá»‹');
                }

                finishAdminLogin(response.token, {
                    id: response.user.id,
                    username: response.user.username || response.user.name || 'admin',
                    full_name: response.user.name || response.user.username || 'Admin',
                    role: response.user.role || 'admin',
                }, 'session');
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'KhÃ´ng thá»ƒ hoÃ n táº¥t Ä‘Äƒng nháº­p. Vui lÃ²ng thá»­ láº¡i.');
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
                            src="/logo.webp"
                            alt="VanTrangEdu Logo"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/logo.jpg";
                            }}
                        />
                    </Link>
                    <div className="admin-login-badge">
                        <ShieldCheck size={20} />
                        <span>Quáº£n Trá»‹ Há»‡ Thá»‘ng</span>
                    </div>
                </div>

                {/* Login Card */}
                <Card className="admin-login-card">
                    <CardContent className="admin-login-card-content">
                        <div className="admin-login-title">
                            <h1>ÄÄƒng nháº­p Admin</h1>
                            <p>Truy cáº­p báº£ng Ä‘iá»u khiá»ƒn quáº£n trá»‹</p>
                        </div>

                        {error && (
                            <div className="admin-login-error">
                                <span className="admin-login-error-icon">!</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(handleLogin)} className="admin-login-form">
                            <div className="admin-login-field">
                                <Label htmlFor="username">TÃªn Ä‘Äƒng nháº­p</Label>
                                <div className="admin-login-input-wrapper">
                                    <User className="admin-login-input-icon" size={18} />
                                    <Input
                                        id="username"
                                        name="username"
                                        autoComplete="username"
                                        placeholder="Nháº­p username"
                                        className="admin-login-input"
                                        {...form.register('username')}
                                    />
                                </div>
                                {form.formState.errors.username && (
                                    <p className="admin-login-field-error">{form.formState.errors.username.message}</p>
                                )}
                            </div>

                            <div className="admin-login-field">
                                <Label htmlFor="password">Máº­t kháº©u</Label>
                                <div className="admin-login-input-wrapper">
                                    <Lock className="admin-login-input-icon" size={18} />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Nháº­p máº­t kháº©u (Ã­t nháº¥t 6 kÃ½ tá»±)"
                                        autoComplete="current-password"
                                        className="admin-login-input"
                                        {...form.register('password')}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--vt-ink-40)] hover:text-[var(--vt-ink-70)] transition-colors"
                                        aria-label={showPassword ? 'áº¨n máº­t kháº©u' : 'Hiá»‡n máº­t kháº©u'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
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
                                        Äang xá»­ lÃ½...
                                    </>
                                ) : (
                                    <>
                                        <ArrowRight className="admin-login-btn-icon" size={20} />
                                        ÄÄƒng nháº­p
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="admin-login-footer">
                    <p>Â© {new Date().getFullYear()} VAN TRANG EDUCATION</p>
                    <Link to="/" className="admin-login-back-link">
                        â† Quay vá» trang chá»§
                    </Link>
                </div>
            </div>
        </div>
    );
}
