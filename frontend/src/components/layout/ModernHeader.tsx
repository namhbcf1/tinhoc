import React, { useState, useEffect } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Phone, Mail, User, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../utils/translations';
import api from '../../services/api';

export default function ModernHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { language, setLanguage } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const t = (key) => getTranslation(key, language);

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Lock body scroll when mobile menu is open (fix #3)
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMenuOpen]);

    useEffect(() => {
        const checkLogin = () => {
            // Check for student token first, then fallback to cccd
            const token = localStorage.getItem('student_token') || localStorage.getItem('student_cccd');
            setIsLoggedIn(!!token);
        };

        checkLogin();
        window.addEventListener('storage', checkLogin);
        return () => window.removeEventListener('storage', checkLogin);
    }, []);

    const handleLogout = () => {
        api.logout();
        setIsLoggedIn(false);
        navigate('/login');
    };

    const navLinks = [
        { to: '/', label: t('home') },
        { to: '/about', label: t('about') },
        { to: '/training', label: t('training') },
        { to: '/admissions', label: t('admissions') },
        { to: '/news', label: t('news') },
        { to: '/contact', label: t('contact') },
    ];

    return (
        <header className="sticky top-0 z-50 w-full glass-panel border-b-0">
            {/* Top Bar */}
            <div className="bg-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-white text-xs md:text-sm shadow-sm">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex gap-4">
                        <a href="tel:0962445963" className="flex items-center gap-1 hover:text-emerald-100">
                            <Phone size={14} /> <span>096 244 5963</span>
                        </a>
                        <a href="mailto:info@vantrangedu.edu.vn" className="flex items-center gap-1 hover:text-emerald-100 hidden sm:flex">
                            <Mail size={14} /> <span>info@vantrangedu.edu.vn</span>
                        </a>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLanguage('vi')}
                            className={cn("px-2 py-0.5 rounded transition-colors", language === 'vi' ? "bg-white/20 font-bold" : "hover:bg-white/10")}
                        >
                            VN
                        </button>
                        <span className="text-white/40">|</span>
                        <button
                            onClick={() => setLanguage('en')}
                            className={cn("px-2 py-0.5 rounded transition-colors", language === 'en' ? "bg-white/20 font-bold" : "hover:bg-white/10")}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform">
                    {/* width/height attrs prevent CLS (fix #4) */}
                    <img src="/logo.png" alt="Van Trang Education" width={72} height={72} className="h-[4.5rem] w-auto object-contain py-1"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/logo.jpg";
                        }}
                    />
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1 lg:gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            aria-current={location.pathname === link.to ? 'page' : undefined}
                    className={cn(
                                "text-[15px] font-semibold transition-colors hover:text-emerald-600 px-3 py-2 rounded-full",
                                location.pathname === link.to
                                    ? "text-emerald-600 bg-emerald-50"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    {isLoggedIn ? (
                        <>
                            <Link to="/dashboard">
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2 shadow-sm rounded-full px-5 h-10">
                                    <User size={16} /> Dashboard
                                </Button>
                            </Link>
                            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full h-10 w-10 p-0">
                                <LogOut size={16} />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                <Button variant="ghost" size="sm" className="font-semibold text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-full px-5 h-10">{t('login')}</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-200/50 rounded-full px-6 h-10">{t('register')}</Button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile actions — hamburger */}
                <div className="md:hidden flex items-center gap-2">
                    <button
                        className="p-2 text-slate-700 bg-slate-50 rounded-full border border-slate-200"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-menu"
                        aria-label={isMenuOpen ? "Đóng menu" : "Mở menu"}
                    >
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu — id for aria-controls, 100dvh for mobile browser bar (fix #2) */}
            {isMenuOpen && (
                <div id="mobile-menu" className="md:hidden border-t border-slate-200 p-4 bg-white shadow-lg absolute w-full left-0 top-[100%] animate-in slide-in-from-top-2 h-[calc(100dvh-112px)] overflow-y-auto">
                    <nav className="flex flex-col gap-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="text-lg font-medium py-3 border-b border-slate-100 text-slate-700 active:text-green-600 block"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 mt-6">
                            {isLoggedIn ? (
                                <>
                                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                                        <Button className="w-full justify-center font-bold bg-green-600 text-white h-12 text-lg">
                                            <User className="mr-2" /> Dashboard
                                        </Button>
                                    </Link>
                                    <Button variant="outline" onClick={() => { handleLogout(); setIsMenuOpen(false) }} className="w-full justify-center text-red-500 border-red-200 h-11">
                                        Đăng xuất
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full">
                                        <Button variant="outline" className="w-full justify-center font-bold border-green-600 text-green-700 h-11 text-lg">Đăng nhập</Button>
                                    </Link>
                                    <Link to="/register" onClick={() => setIsMenuOpen(false)} className="w-full">
                                        <Button className="w-full justify-center font-bold bg-green-600 text-white h-12 text-lg">Đăng ký ngay</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
