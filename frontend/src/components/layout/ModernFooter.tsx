// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import {
    Phone,
    Mail,
    MessageCircle,
    MapPin,
    ChevronDown,
    Sparkles,
    ShieldCheck,
    Award,
    GraduationCap,
} from 'lucide-react';
import { Facebook } from '../common/BrandIcons';

const trustSignals = [
    { icon: Award, label: 'VSTEP · IELTS · TOEIC', meta: 'Lộ trình học và thi rõ ràng' },
    { icon: GraduationCap, label: '5.000+ học viên', meta: 'Đang theo học & đã tốt nghiệp' },
    { icon: ShieldCheck, label: 'Hồ sơ minh bạch', meta: 'Quản lý học viên, lớp và chứng chỉ' },
    { icon: Sparkles, label: 'Tư vấn 1-1', meta: 'Chọn đúng khóa trước khi đăng ký' },
];

const linkServices = [
    { to: '/training', label: 'Đào tạo' },
    { to: '/register', label: 'Đăng ký khóa học' },
    { to: '/news', label: 'Tin tức & Blog' },
    { to: '/about', label: 'Về chúng tôi' },
    { to: '/contact', label: 'Liên hệ' },
];

const linkPrograms = [
    { to: '/training', label: 'Tiếng Anh Giao Tiếp' },
    { to: '/training', label: 'Luyện Thi Chứng Chỉ' },
    { to: '/ho-tro-tieng-anh', label: 'Hỗ Trợ Tiếng Anh' },
    { to: '/day-ngon-ngu', label: 'Dạy Ngôn Ngữ' },
    { to: '/trung-tam-tieng-anh', label: 'Trung Tâm Tiếng Anh' },
    { to: '/english-support', label: 'English Support Services', muted: true },
    { to: '/language-center', label: 'Language Center', muted: true },
];

export default function ModernFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="relative bg-[var(--vt-ink)] text-[var(--vt-paper)] mt-12">
            {/* Decorative top hairline */}
            <div className="vt-fine-divider" aria-hidden="true" />

            {/* Background accents */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-champagne)]/10 blur-3xl" />
                <div className="absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-[var(--vt-emerald)]/12 blur-3xl" />
            </div>

            <div className="relative">
                {/* Trust signals strip */}
                <div className="vt-container pt-12 md:pt-16">
                    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {trustSignals.map(({ icon: Icon, label, meta }) => (
                            <li
                                key={label}
                                className="group flex items-start gap-3 p-4 md:p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] transition-colors"
                            >
                                <span className="h-10 w-10 flex-shrink-0 rounded-full bg-[var(--vt-champagne)]/20 text-[var(--vt-champagne)] flex items-center justify-center group-hover:bg-[var(--vt-champagne)] group-hover:text-[var(--vt-ink)] transition-colors">
                                    <Icon size={18} />
                                </span>
                                <div className="leading-tight min-w-0">
                                    <p className="text-[13px] md:text-sm font-bold text-white truncate">{label}</p>
                                    <p className="mt-1 text-[11px] md:text-xs text-white/60">{meta}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Main footer grid */}
                <div className="vt-container py-12 md:py-16">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                        {/* Brand block — spans 4/12 on desktop */}
                        <div className="md:col-span-4 space-y-5">
                            <Link to="/" className="inline-flex items-center gap-3 group" aria-label="Van Trang Education — Trang chủ">
                                <img
                                    src="/logo.png"
                                    alt="Van Trang Education"
                                    width={56}
                                    height={56}
                                    className="h-14 w-auto object-contain"
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/logo.jpg'; }}
                                />
                                <div className="leading-none">
                                    <p className="vt-display text-2xl text-white"
                                       style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                        Vân Trang
                                    </p>
                                    <p className="mt-1 text-[10px] tracking-[0.28em] font-bold uppercase text-[var(--vt-champagne)]">
                                        Education
                                    </p>
                                </div>
                            </Link>

                            <p className="text-sm leading-relaxed text-white/75 max-w-md">
                                Hệ sinh thái đào tạo ngoại ngữ, tin học và quản lý hồ sơ học viên — chuẩn mực, đáng tin cậy, dễ theo dõi.
                            </p>

                            <div className="space-y-2 text-sm text-white/70">
                                <p className="font-semibold text-white/90 text-[13px]">
                                    VAN TRANG EDUCATION
                                </p>
                                <p><span className="text-white/55">Mã số thuế:</span> <span className="font-medium">0110058563</span></p>
                                <p><span className="text-white/55">Người đại diện:</span> <span className="font-medium">Phạm Thị Vân Trang</span></p>
                            </div>

                            {/* Social */}
                            <div className="flex items-center gap-2 pt-1">
                                <a
                                    href="https://www.facebook.com/Englishvantrang"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Facebook"
                                    className="vt-tap h-10 w-10 rounded-full bg-white/8 border border-white/10 text-white hover:bg-[#1877f2] hover:border-[#1877f2] transition-colors flex items-center justify-center"
                                >
                                    <Facebook size={16} />
                                </a>
                                <a
                                    href="https://zalo.me/0962449563"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Chat Zalo"
                                    className="vt-tap h-10 w-10 rounded-full bg-white/8 border border-white/10 text-white hover:bg-[#0068ff] hover:border-[#0068ff] transition-colors flex items-center justify-center"
                                >
                                    <MessageCircle size={16} />
                                </a>
                                <a
                                    href="mailto:info@vantrangedu.edu.vn"
                                    aria-label="Email"
                                    className="vt-tap h-10 w-10 rounded-full bg-white/8 border border-white/10 text-white hover:bg-[var(--vt-champagne)] hover:text-[var(--vt-ink)] hover:border-[var(--vt-champagne)] transition-colors flex items-center justify-center"
                                >
                                    <Mail size={16} />
                                </a>
                            </div>
                        </div>

                        {/* Services column */}
                        <details className="vt-foot-section md:col-span-2 md:open:!open" open>
                            <summary className="flex items-center justify-between md:block">
                                <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[var(--vt-champagne)]">
                                    Dịch vụ
                                </span>
                                <ChevronDown size={18} className="vt-foot-chevron md:hidden text-[var(--vt-champagne)]" />
                            </summary>
                            <ul className="mt-4 space-y-2.5 text-sm">
                                {linkServices.map(({ to, label }) => (
                                    <li key={to + label}>
                                        <Link
                                            to={to}
                                            className="text-white/75 hover:text-[var(--vt-champagne)] transition-colors inline-flex items-center gap-1.5"
                                        >
                                            <span className="h-px w-3 bg-white/30 transition-all duration-300 group-hover:w-5" />
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </details>

                        {/* Programs column */}
                        <details className="vt-foot-section md:col-span-3 md:open:!open" open>
                            <summary className="flex items-center justify-between md:block">
                                <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[var(--vt-champagne)]">
                                    Chương trình
                                </span>
                                <ChevronDown size={18} className="vt-foot-chevron md:hidden text-[var(--vt-champagne)]" />
                            </summary>
                            <ul className="mt-4 space-y-2.5 text-sm">
                                {linkPrograms.map(({ to, label, muted }) => (
                                    <li key={to + label}>
                                        <Link
                                            to={to}
                                            className={
                                                muted
                                                    ? 'text-white/45 hover:text-[var(--vt-champagne)] italic transition-colors text-[13px]'
                                                    : 'text-white/75 hover:text-[var(--vt-champagne)] transition-colors'
                                            }
                                        >
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </details>

                        {/* Contact column */}
                        <details className="vt-foot-section md:col-span-3 md:open:!open" open>
                            <summary className="flex items-center justify-between md:block">
                                <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[var(--vt-champagne)]">
                                    Liên hệ
                                </span>
                                <ChevronDown size={18} className="vt-foot-chevron md:hidden text-[var(--vt-champagne)]" />
                            </summary>
                            <ul className="mt-4 space-y-4 text-sm text-white/80">
                                <li>
                                    <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-white/50 mb-1.5 flex items-center gap-2">
                                        <Phone size={12} /> Hotline
                                    </p>
                                    <a href="tel:0962449563" className="block hover:text-[var(--vt-champagne)] transition-colors font-semibold">
                                        096 244 9563
                                    </a>
                                    <a href="tel:0339244566" className="block hover:text-[var(--vt-champagne)] transition-colors font-semibold">
                                        0339 244 566
                                    </a>
                                </li>
                                <li>
                                    <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-white/50 mb-1.5 flex items-center gap-2">
                                        <Mail size={12} /> Email
                                    </p>
                                    <a href="mailto:info@vantrangedu.edu.vn" className="hover:text-[var(--vt-champagne)] transition-colors break-all">
                                        info@vantrangedu.edu.vn
                                    </a>
                                </li>
                                <li>
                                    <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-white/50 mb-1.5 flex items-center gap-2">
                                        <MessageCircle size={12} /> Zalo
                                    </p>
                                    <a
                                        href="https://zalo.me/0962449563"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover:text-[var(--vt-champagne)] transition-colors"
                                    >
                                        zalo.me/0962449563
                                    </a>
                                </li>
                                <li>
                                    <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-white/50 mb-1.5 flex items-center gap-2">
                                        <MapPin size={12} /> Văn phòng
                                    </p>
                                    <p className="text-white/70 leading-relaxed">Hà Nội · Hỗ trợ Online toàn quốc</p>
                                </li>
                            </ul>
                        </details>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/10">
                    <div className="vt-container py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                        <p className="text-white/55 text-center md:text-left">
                            © {year} <span className="text-white/75 font-semibold">VAN TRANG EDUCATION</span>. Bảo lưu mọi quyền.
                        </p>
                        <div className="flex items-center gap-5">
                            <Link to="/privacy" className="text-white/55 hover:text-[var(--vt-champagne)] transition-colors">
                                Chính sách bảo mật
                            </Link>
                            <span className="text-white/20">·</span>
                            <Link to="/terms" className="text-white/55 hover:text-[var(--vt-champagne)] transition-colors">
                                Điều khoản sử dụng
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
