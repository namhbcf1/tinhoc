// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Menu,
    X,
    Phone,
    Mail,
    User,
    LogOut,
    Sparkles,
    ChevronRight,
    MessageCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../utils/translations';
import api from '../../services/api';
import { getStorageValue } from '../../utils/browser-storage.js';

export default function ModernHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const { language, setLanguage } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const headerRef = useRef(null);
    const t = (key) => getTranslation(key, language);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    // Close on Escape key
    useEffect(() => {
        if (!isMenuOpen) return;
        const handler = (e) => { if (e.key === 'Escape') setIsMenuOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isMenuOpen]);

    // Auth state mirror
    useEffect(() => {
        const checkLogin = () => {
            setIsLoggedIn(!!getStorageValue('student_token'));
        };
        checkLogin();
        window.addEventListener('storage', checkLogin);
        return () => window.removeEventListener('storage', checkLogin);
    }, []);

    // Scroll-aware: flip data-scrolled attribute (no rerender per frame)
    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        let ticking = false;
        const update = () => {
            el.dataset.scrolled = window.scrollY > 12 ? 'true' : 'false';
            ticking = false;
        };
        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleLogout = () => {
        api.logout();
        setIsLoggedIn(false);
        setIsMenuOpen(false);
        navigate('/login');
    };

    const navLinks = [
        { to: '/', label: t('home'), meta: 'Trang chủ' },
        { to: '/training', label: t('training'), meta: 'Chương trình đào tạo' },
        { to: '/about', label: t('about'), meta: 'Giới thiệu Vân Trang' },
        { to: '/news', label: t('news'), meta: 'Tin tức & bài viết' },
        { to: '/guides', label: t('guides'), meta: 'Hướng dẫn học viên' },
        { to: '/contact', label: t('contact'), meta: 'Liên hệ Vân Trang' },
    ];

    const mobileSecondaryLinks = [
        { to: '/register', label: t('admissions'), meta: 'Đăng ký học viên' },
        { to: '/feedback', label: t('feedback'), meta: 'Cảm nhận học viên' },
        { to: '/certificate/lookup', label: 'Tra cứu chứng chỉ', meta: 'Xác minh kết quả học tập' },
        { to: '/student-lookup', label: 'Tra cứu hồ sơ', meta: 'Kiểm tra thông tin học viên' },
    ];

    return (
        <header ref={headerRef} className="vt-header" data-scrolled="false">
            {/* Top contact strip — slim, ink-on-paper, hides timestamp on mobile */}
            <div className="hidden sm:block border-b border-[var(--vt-line-soft)] bg-[var(--vt-paper)]/60">
                <div className="vt-container flex items-center justify-between py-2 text-[13px] text-[var(--vt-muted)]">
                    <div className="flex items-center gap-5">
                        <a href="tel:0962449563"
                           className="inline-flex items-center gap-2 hover:text-[var(--vt-emerald)] transition-colors"
                           data-tour="public-hotline">
                            <Phone size={14} className="text-[var(--vt-champagne-deep)]" />
                            <span className="font-semibold tracking-tight">096 244 9563</span>
                            <span className="opacity-60">·</span>
                            <span className="opacity-80">Tư vấn lộ trình trong 24h</span>
                        </a>
                        <a href="mailto:info@vantrangedu.edu.vn"
                           className="hidden md:inline-flex items-center gap-2 hover:text-[var(--vt-emerald)] transition-colors">
                            <Mail size={14} className="text-[var(--vt-champagne-deep)]" />
                            <span>info@vantrangedu.edu.vn</span>
                        </a>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="vt-eyebrow text-[10px]" style={{ color: 'var(--vt-champagne-deep)' }}>
                            <Sparkles className="w-3 h-3" /> Đào tạo chuẩn mực
                        </span>
                        <div className="flex items-center gap-1" data-tour="public-language">
                            <button
                                onClick={() => setLanguage('vi')}
                                aria-pressed={language === 'vi'}
                                className={cn(
                                    'h-7 px-2.5 rounded-full text-xs font-bold tracking-wide transition-colors',
                                    language === 'vi'
                                        ? 'bg-[var(--vt-ink)] text-white'
                                        : 'text-[var(--vt-muted)] hover:text-[var(--vt-ink)]'
                                )}
                            >
                                VN
                            </button>
                            <button
                                onClick={() => setLanguage('en')}
                                aria-pressed={language === 'en'}
                                className={cn(
                                    'h-7 px-2.5 rounded-full text-xs font-bold tracking-wide transition-colors',
                                    language === 'en'
                                        ? 'bg-[var(--vt-ink)] text-white'
                                        : 'text-[var(--vt-muted)] hover:text-[var(--vt-ink)]'
                                )}
                            >
                                EN
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main navigation row */}
            <div className="vt-container flex items-center justify-between h-[var(--vt-header-h-mobile)] md:h-[var(--vt-header-h-desktop)]">
                <Link to="/" className="flex items-center gap-3 group" aria-label="Van Trang Education — Trang chủ">
                    <img
                        src="/logo.png"
                        alt="Van Trang Education"
                        width={56}
                        height={56}
                        className="h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
                    />
                    <div className="hidden sm:flex flex-col leading-none">
                        <span className="vt-display text-[1.15rem] md:text-[1.3rem]"
                              style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                            Vân Trang
                        </span>
                        <span className="mt-1 text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--vt-champagne-deep)]">
                            Education
                        </span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden lg:flex items-center gap-1" data-tour="public-desktop-nav">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            aria-current={location.pathname === link.to ? 'page' : undefined}
                            className="vt-nav-link"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-2">
                    {isLoggedIn ? (
                        <>
                            <Link to="/dashboard" data-tour="public-login">
                                <Button size="sm" className="vt-btn vt-btn--emerald h-10 px-5 text-sm">
                                    <User size={15} /> Dashboard
                                </Button>
                            </Link>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                aria-label="Đăng xuất"
                                className="h-10 w-10 rounded-full text-[var(--vt-muted)] hover:text-rose-600 hover:bg-rose-50"
                                data-tour="public-logout"
                            >
                                <LogOut size={16} />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" data-tour="public-login">
                                <Button variant="ghost" size="sm"
                                        className="h-10 px-4 rounded-full font-semibold text-[var(--vt-ink)] hover:text-[var(--vt-emerald)] hover:bg-[var(--vt-emerald-soft)]">
                                    {t('login')}
                                </Button>
                            </Link>
                            <Link to="/login" data-tour="public-register">
                                <button className="vt-btn vt-btn--accent h-10 px-5 text-sm">
                                    Đăng nhập học viên
                                    <ChevronRight size={15} className="-mr-1" />
                                </button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile / Tablet actions */}
                <div className="lg:hidden flex items-center gap-2">
                    <a
                        href="tel:0962449563"
                        aria-label="Gọi hotline 096 244 9563"
                        className="vt-tap h-11 w-11 rounded-full bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] flex items-center justify-center hover:bg-[var(--vt-emerald)] hover:text-white transition-colors"
                    >
                        <Phone size={18} />
                    </a>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-expanded={isMenuOpen}
                        aria-controls="vt-mobile-sheet"
                        aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
                        className="vt-tap h-11 w-11 rounded-full bg-[var(--vt-ink)] text-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(19,34,56,0.4)] transition-transform active:scale-95"
                        data-tour="public-mobile-menu"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* ─── Mobile sheet (side panel) ─────────────────────── */}
            <div
                id="vt-mobile-sheet"
                className="vt-mobile-sheet lg:hidden"
                data-open={isMenuOpen ? 'true' : 'false'}
                aria-hidden={!isMenuOpen}
                data-tour="public-mobile-menu-panel"
            >
                <div className="vt-mobile-sheet__backdrop" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
                <aside className="vt-mobile-sheet__panel" role="dialog" aria-modal="true" aria-label="Điều hướng chính">
                    {/* Sheet header */}
                    <div className="flex items-center justify-between p-5 border-b border-[var(--vt-line-soft)]">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-auto"
                                 onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }} />
                            <div className="leading-none">
                                <p className="vt-display text-lg" style={{ fontVariationSettings: '"opsz" 36' }}>
                                    Vân Trang
                                </p>
                                <p className="mt-1 text-[10px] tracking-[0.24em] font-bold uppercase text-[var(--vt-champagne-deep)]">
                                    Education
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            aria-label="Đóng menu"
                            className="vt-tap h-11 w-11 rounded-full bg-[var(--vt-paper-deep)]/40 hover:bg-[var(--vt-paper-deep)] flex items-center justify-center text-[var(--vt-ink)]"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Quick CTA at top of drawer */}
                    <div className="px-5 pt-4 pb-4 border-b border-[var(--vt-line-soft)] flex flex-col gap-2">
                        <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                            <button className="vt-btn vt-btn--accent w-full h-12">
                                <MessageCircle size={16} /> Đăng nhập học viên
                            </button>
                        </Link>
                        <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                            <button className="vt-btn vt-btn--primary w-full h-12">
                                <Sparkles size={16} /> Đăng ký học viên
                            </button>
                        </Link>
                    </div>

                    {/* Nav */}
                    <nav className="px-3 pt-4 flex-1 overflow-y-auto">
                        <p className="px-3 vt-overline mb-2">Điều hướng</p>
                        <ul className="flex flex-col gap-1">
                            {[...navLinks, ...mobileSecondaryLinks].map((link) => (
                                <li key={link.to}>
                                    <Link
                                        to={link.to}
                                        aria-current={location.pathname === link.to ? 'page' : undefined}
                                        className="vt-mobile-link"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <span className="flex flex-col">
                                            <span className="text-base">{link.label}</span>
                                            <span className="vt-mobile-link__meta">{link.meta}</span>
                                        </span>
                                        <ChevronRight size={18} className="opacity-50 flex-shrink-0" />
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* Auth section */}
                        <div className="mt-5 px-3">
                            <p className="vt-overline mb-3">Tài khoản</p>
                            <div className="flex flex-col gap-2">
                                {isLoggedIn ? (
                                    <>
                                        <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} data-tour="public-mobile-login">
                                            <button className="vt-btn vt-btn--emerald w-full h-12">
                                                <User size={16} /> Vào Dashboard
                                            </button>
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="vt-btn vt-btn--ghost w-full h-12 text-rose-600 border-rose-200 hover:bg-rose-50"
                                            data-tour="public-mobile-logout"
                                        >
                                            <LogOut size={16} /> Đăng xuất
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={() => setIsMenuOpen(false)} data-tour="public-mobile-login">
                                            <button className="vt-btn vt-btn--ghost w-full h-12">
                                                Đăng nhập
                                            </button>
                                        </Link>
                                        <Link to="/register" onClick={() => setIsMenuOpen(false)} data-tour="public-mobile-register">
                                            <button className="vt-btn vt-btn--ghost w-full h-12">
                                                Đăng ký học viên <ChevronRight size={16} />
                                            </button>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Language */}
                        <div className="mt-5 px-3">
                            <p className="vt-overline mb-3">Ngôn ngữ</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setLanguage('vi')}
                                    aria-pressed={language === 'vi'}
                                    className={cn(
                                        'h-11 rounded-full font-bold text-sm transition-colors',
                                        language === 'vi'
                                            ? 'bg-[var(--vt-ink)] text-white'
                                            : 'bg-[var(--vt-paper-deep)]/40 text-[var(--vt-ink)] hover:bg-[var(--vt-paper-deep)]'
                                    )}
                                >
                                    🇻🇳 Tiếng Việt
                                </button>
                                <button
                                    onClick={() => setLanguage('en')}
                                    aria-pressed={language === 'en'}
                                    className={cn(
                                        'h-11 rounded-full font-bold text-sm transition-colors',
                                        language === 'en'
                                            ? 'bg-[var(--vt-ink)] text-white'
                                            : 'bg-[var(--vt-paper-deep)]/40 text-[var(--vt-ink)] hover:bg-[var(--vt-paper-deep)]'
                                    )}
                                >
                                    🇬🇧 English
                                </button>
                            </div>
                        </div>
                    </nav>

                    {/* Sheet footer — contact */}
                    <div className="mt-auto p-5 border-t border-[var(--vt-line-soft)] bg-[var(--vt-paper)]">
                        <p className="vt-overline mb-2">Liên hệ nhanh</p>
                        <div className="flex flex-col gap-2 text-sm">
                            <a href="tel:0962449563"
                               className="flex items-center gap-3 text-[var(--vt-ink)] hover:text-[var(--vt-emerald)]">
                                <span className="h-9 w-9 rounded-full bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] flex items-center justify-center">
                                    <Phone size={15} />
                                </span>
                                <div className="leading-tight">
                                    <p className="font-bold">096 244 9563</p>
                                    <p className="text-xs text-[var(--vt-muted)]">Hotline 8h–21h hằng ngày</p>
                                </div>
                            </a>
                            <a href="https://zalo.me/0962449563" target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-3 text-[var(--vt-ink)] hover:text-[var(--vt-emerald)]">
                                <span className="h-9 w-9 rounded-full bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] flex items-center justify-center">
                                    <MessageCircle size={15} />
                                </span>
                                <div className="leading-tight">
                                    <p className="font-bold">Chat Zalo</p>
                                    <p className="text-xs text-[var(--vt-muted)]">Phản hồi trong vài phút</p>
                                </div>
                            </a>
                        </div>
                    </div>
                </aside>
            </div>
        </header>
    );
}
