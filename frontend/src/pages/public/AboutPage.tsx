// @ts-nocheck
import React, { useRef } from 'react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import {
    Users, Target, Award, MapPin, Phone, Mail,
    ShieldCheck, BookOpen, GraduationCap, Globe, ArrowRight, Sparkles,
    MessageCircle, CheckCircle2,
} from 'lucide-react';
import { Facebook } from '../../components/common/BrandIcons';
import SEO from '../../components/common/SEO';
import { Link } from 'react-router-dom';
import { gsap, useGSAP } from '../../lib/gsap';
import { TOTAL_STUDENTS, TEACHERS_MIN_IELTS } from '../../constants/site-stats';

const teachers = [
    { initials: 'VT', name: 'Phạm Thị Vân Trang', role: 'Giám đốc & Giảng viên chính', cert: 'IELTS 8.0 · TESOL', exp: '10+ năm kinh nghiệm', speciality: 'VSTEP B2, C1 · Tiếng Anh học thuật' },
    { initials: 'GV', name: 'Giảng viên VSTEP', role: 'Chuyên gia luyện thi VSTEP', cert: 'IELTS 8.5 · CELTA', exp: '8 năm kinh nghiệm', speciality: 'VSTEP A2, B1, B2 · Luyện thi chứng chỉ' },
    { initials: 'GV', name: 'Giảng viên Giao tiếp', role: 'Chuyên gia tiếng Anh thực dụng', cert: 'TOEIC 990 · TESOL', exp: '6 năm kinh nghiệm', speciality: 'Giao tiếp · Phát âm · Phỏng vấn' },
    { initials: 'GV', name: 'Giảng viên Tin học', role: 'Chuyên gia MOS & IC3', cert: 'MOS Expert · IC3', exp: '5 năm kinh nghiệm', speciality: 'Word · Excel · PowerPoint · IC3/MOS' },
];

const historyTimeline = [
    { year: '2015', title: 'Thành lập trung tâm', desc: 'VanTrangEdu chính thức ra đời tại Hà Nội, bắt đầu với các lớp tiếng Anh giao tiếp nhỏ, quy mô 10–15 học viên.' },
    { year: '2017', title: 'Mở rộng chương trình', desc: 'Ra mắt các khoá luyện thi TOEIC, IELTS. Số lượng học viên vượt 500 người.' },
    { year: '2019', title: 'Chuyên sâu VSTEP', desc: 'Trở thành một trong những trung tâm luyện thi VSTEP uy tín tại Hà Nội. Ký hợp tác với doanh nghiệp về đào tạo tiếng Anh nội bộ.' },
    { year: '2022', title: 'Ra mắt E-Learning', desc: 'Triển khai nền tảng học trực tuyến, mở rộng phục vụ học viên toàn quốc. Tổng cộng 2.000+ cựu học viên.' },
    { year: '2025', title: 'Thêm Tin học Văn phòng', desc: 'Bổ sung chương trình Tin học Văn phòng (MOS, IC3) đáp ứng nhu cầu thực tế. Đạt 3.000+ cựu học viên.' },
    { year: '2026', title: 'Tích hợp AI', desc: 'Ứng dụng AI đánh giá trình độ đầu vào và cá nhân hoá lộ trình học tập cho từng học viên.' },
];

export default function AboutPage() {
    const container = useRef();

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.a-eyebrow', { y: 14, opacity: 0, duration: 0.5 })
          .from('.a-title span', { y: 40, opacity: 0, duration: 0.9, stagger: 0.08 }, '-=0.2')
          .from('.a-desc', { y: 16, opacity: 0, duration: 0.7 }, '-=0.4');

        gsap.from('.mission-card', {
            scrollTrigger: { trigger: '.mission-section', start: 'top 80%' },
            y: 30, opacity: 0, duration: 0.8, stagger: 0.18, ease: 'power3.out',
        });
        gsap.from('.stat-item', {
            scrollTrigger: { trigger: '.stats-section', start: 'top 85%' },
            y: 24, opacity: 0, duration: 0.6, stagger: 0.1,
        });
        gsap.from('.history-item', {
            scrollTrigger: { trigger: '.history-section', start: 'top 80%' },
            x: -30, opacity: 0, duration: 0.7, stagger: 0.1,
        });
        gsap.from('.teacher-card', {
            scrollTrigger: { trigger: '.teacher-section', start: 'top 85%' },
            y: 24, opacity: 0, duration: 0.6, stagger: 0.08,
        });
    }, { scope: container });

    return (
        <ModernPublicLayout>
            <SEO
                title="Về VanTrangEdu — Lịch sử, Sứ mệnh & Đội ngũ"
                description="VanTrangEdu — trung tâm ngoại ngữ và tin học văn phòng tại 418 Đê La Thành, Hà Nội. 10+ năm kinh nghiệm, 3.000+ cựu học viên, giảng viên IELTS 8.0+."
                url="/about"
            />

            <div ref={container} className="relative bg-[var(--vt-paper)] overflow-hidden">

                {/* ── Hero ───────────────────────────────────────── */}
                <section className="relative pt-28 md:pt-36 pb-16 md:pb-24">
                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-40 -right-32 h-[32rem] w-[32rem] rounded-full bg-[var(--vt-emerald)]/8 blur-3xl" />
                        <div className="absolute bottom-[-12rem] -left-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-champagne)]/15 blur-3xl" />
                    </div>

                    <div className="vt-container relative">
                        <div className="max-w-4xl">
                            <p className="a-eyebrow vt-eyebrow !text-[var(--vt-champagne-deep)]">
                                Về chúng tôi · Established 2015
                            </p>
                            <h1 className="a-title vt-display mt-5 text-[clamp(2.75rem,7vw,5rem)] leading-[0.95] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30', fontWeight: 600 }}>
                                <span className="block">Xoá nhoà</span>
                                <span className="block vt-display-italic text-[var(--vt-emerald-deep)]">giới hạn</span>
                                <span className="block">ngôn ngữ.</span>
                            </h1>
                            <p className="a-desc vt-lead mt-7 max-w-2xl">
                                Van Trang Education là trung tâm đào tạo ngoại ngữ và tin học văn phòng tại Hà Nội, thành lập năm 2015 bởi bà Phạm Thị Vân Trang. Hơn một thập kỷ đồng hành cùng 3.000+ học viên — từ học sinh, sinh viên đến người đi làm và cán bộ nhà nước.
                            </p>

                            <div className="a-desc mt-9 flex flex-wrap gap-3">
                                <Link to="/training" className="vt-btn vt-btn--primary">
                                    Khám phá chương trình <ArrowRight size={16} />
                                </Link>
                                <Link to="/contact" className="vt-btn vt-btn--ghost">
                                    Đặt lịch tham quan
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Mission & Vision ───────────────────────────── */}
                <section className="mission-section vt-section bg-[var(--vt-cream)]/60 border-y border-[var(--vt-line)]">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Triết lý</p>
                            <h2 className="vt-display mt-4 text-[clamp(2rem,4vw,3rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Hai trụ cột <span className="vt-display-italic text-[var(--vt-emerald-deep)]">định hình</span> Vân Trang
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-5xl mx-auto">
                            <article className="mission-card vt-paper-card relative overflow-hidden">
                                <div aria-hidden="true" className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[var(--vt-emerald)]/8 blur-3xl" />
                                <div className="relative">
                                    <span className="h-14 w-14 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] flex items-center justify-center">
                                        <Target size={26} strokeWidth={1.5} />
                                    </span>
                                    <p className="vt-eyebrow !text-[10px] mt-6 !text-[var(--vt-emerald-deep)]">Tầm nhìn 2030</p>
                                    <h3 className="vt-display mt-3 text-[1.75rem] text-[var(--vt-ink)] leading-tight"
                                        style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                        Trung tâm VSTEP & ngoại ngữ uy tín nhất Hà Nội
                                    </h3>
                                    <p className="mt-4 text-[15px] text-[var(--vt-ink-65)] leading-relaxed">
                                        Nơi mọi học viên đều có thể tiếp cận chương trình chất lượng cao với chi phí hợp lý, phương pháp hiện đại và sự đồng hành chuyên nghiệp.
                                    </p>
                                </div>
                            </article>

                            <article className="mission-card vt-paper-card relative overflow-hidden">
                                <div aria-hidden="true" className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
                                <div className="relative">
                                    <span className="h-14 w-14 rounded-2xl bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] flex items-center justify-center">
                                        <Award size={26} strokeWidth={1.5} />
                                    </span>
                                    <p className="vt-eyebrow !text-[10px] mt-6 !text-[var(--vt-champagne-deep)]">Sứ mệnh cốt lõi</p>
                                    <h3 className="vt-display mt-3 text-[1.75rem] text-[var(--vt-ink)] leading-tight"
                                        style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                        Rút ngắn hành trình đến chứng chỉ quốc tế
                                    </h3>
                                    <p className="mt-4 text-[15px] text-[var(--vt-ink-65)] leading-relaxed">
                                        Phương pháp Sư phạm 4.0 kết hợp AI, đồng hành cùng mỗi học viên từ bước đầu tiên đến khi cầm chứng chỉ trên tay — không ai bị bỏ lại phía sau.
                                    </p>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>

                {/* ── Stats ───────────────────────────────────────── */}
                <section className="stats-section vt-section">
                    <div className="vt-container">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                            {[
                                { value: '100%', label: 'Cam kết chất lượng' },
                                { value: '24/7', label: 'Hỗ trợ học viên' },
                                { value: TEACHERS_MIN_IELTS, label: 'Đội ngũ IELTS' },
                                { value: TOTAL_STUDENTS, label: 'Cựu học viên' },
                            ].map(({ value, label }) => (
                                <div key={label} className="stat-item vt-stat-tile">
                                    <p className="vt-display text-[2.5rem] md:text-[3rem] leading-none text-[var(--vt-ink)]"
                                       style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30', fontWeight: 600 }}>
                                        {value}
                                    </p>
                                    <p className="mt-3 text-[12px] text-[var(--vt-ink-60)] uppercase tracking-[0.16em] font-semibold">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── History timeline ───────────────────────────── */}
                <section className="history-section vt-section bg-[var(--vt-cream)]/60 border-y border-[var(--vt-line)]">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Hành trình</p>
                            <h2 className="vt-display mt-4 text-[clamp(2rem,4vw,3rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Một thập kỷ <span className="vt-display-italic text-[var(--vt-emerald-deep)]">kiên định</span>
                            </h2>
                        </div>

                        <div className="max-w-3xl mx-auto mt-12 relative">
                            <div aria-hidden="true" className="absolute left-[18px] md:left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--vt-emerald)]/60 via-[var(--vt-line-strong)] to-transparent" />

                            <ol className="space-y-7">
                                {historyTimeline.map((item) => (
                                    <li key={item.year} className="history-item flex gap-5 md:gap-7">
                                        <span className="relative shrink-0 h-10 w-10 md:h-11 md:w-11 rounded-full bg-[var(--vt-ink)] text-[var(--vt-paper)] flex items-center justify-center font-bold text-[12px] tracking-wide shadow-[var(--vt-shadow-base)]">
                                            {item.year.slice(2)}
                                        </span>
                                        <article className="flex-1 vt-paper-card !p-5 md:!p-6">
                                            <p className="vt-eyebrow !text-[10px] !text-[var(--vt-champagne-deep)]">{item.year}</p>
                                            <h4 className="vt-display mt-2 text-[1.25rem] text-[var(--vt-ink)] leading-snug"
                                                style={{ fontVariationSettings: '"opsz" 48, "SOFT" 20', fontWeight: 600 }}>
                                                {item.title}
                                            </h4>
                                            <p className="mt-2 text-[14px] text-[var(--vt-ink-65)] leading-relaxed">{item.desc}</p>
                                        </article>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </section>

                {/* ── Credentials ────────────────────────────────── */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Pháp lý · Chứng nhận</p>
                            <h2 className="vt-display mt-4 text-[clamp(2rem,4vw,3rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Hoạt động <span className="vt-display-italic text-[var(--vt-emerald-deep)]">chính ngạch</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-5 mt-12 max-w-5xl mx-auto">
                            {[
                                { icon: ShieldCheck, title: 'Giấy phép đào tạo', desc: 'Được cấp phép hoạt động bởi Sở GD&ĐT Hà Nội theo Nghị định 46/2017/NĐ-CP.' },
                                { icon: Award, title: 'Đăng ký kinh doanh', desc: 'Công ty TNHH Tư Vấn Giáo Dục Sơn Trang · Mã số thuế 0110058563.' },
                                { icon: BookOpen, title: 'Chương trình chuẩn VSTEP', desc: 'Luyện thi VSTEP theo khung năng lực 6 bậc (Thông tư 01/2014/TT-BGDĐT) do Bộ GD&ĐT ban hành.' },
                            ].map(({ icon: Icon, title, desc }) => (
                                <article key={title} className="vt-paper-card">
                                    <span className="h-12 w-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] flex items-center justify-center">
                                        <Icon size={22} strokeWidth={1.5} />
                                    </span>
                                    <h4 className="mt-5 font-bold text-[var(--vt-ink)] text-base">{title}</h4>
                                    <p className="mt-2.5 text-[13.5px] text-[var(--vt-ink-65)] leading-relaxed">{desc}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Teachers ───────────────────────────────────── */}
                <section className="teacher-section vt-section bg-[var(--vt-cream)]/60 border-y border-[var(--vt-line)]">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Đội ngũ giảng viên</p>
                            <h2 className="vt-display mt-4 text-[clamp(2rem,4vw,3rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Sư phạm <span className="vt-display-italic text-[var(--vt-emerald-deep)]">quốc tế</span>
                            </h2>
                            <p className="vt-lead mt-4 max-w-2xl mx-auto">
                                100% giảng viên có chứng chỉ TESOL · CELTA và điểm IELTS / chứng chỉ chuyên ngành cao. Cập nhật phương pháp giảng dạy mới mỗi quý.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12 max-w-5xl mx-auto">
                            {teachers.map((teacher) => (
                                <article key={teacher.name} className="teacher-card vt-paper-card text-center">
                                    <div className="mx-auto w-20 h-20 rounded-full bg-[var(--vt-ink)] text-[var(--vt-champagne)] flex items-center justify-center vt-display text-[1.75rem]"
                                         style={{ fontVariationSettings: '"opsz" 72', fontWeight: 600 }}>
                                        {teacher.initials}
                                    </div>
                                    <h4 className="mt-4 font-bold text-[var(--vt-ink)] text-[15px] leading-snug">{teacher.name}</h4>
                                    <p className="mt-1 text-[12px] text-[var(--vt-ink-55)]">{teacher.role}</p>
                                    <p className="mt-3 vt-pill vt-pill--emerald !text-[10px]">
                                        {teacher.cert}
                                    </p>
                                    <p className="mt-3 text-[11px] text-[var(--vt-ink-50)] uppercase tracking-wider">{teacher.exp}</p>
                                    <p className="mt-3 text-[12.5px] text-[var(--vt-ink-65)] italic leading-relaxed">{teacher.speciality}</p>
                                </article>
                            ))}
                        </div>

                        <p className="text-center text-[12.5px] text-[var(--vt-ink-55)] mt-8 italic max-w-2xl mx-auto">
                            * Thông tin chi tiết từng giảng viên sẽ được cập nhật đầy đủ. Liên hệ hotline để được tư vấn trực tiếp.
                        </p>
                    </div>
                </section>

                {/* ── Founder & Contact ──────────────────────────── */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="grid lg:grid-cols-12 gap-8 max-w-6xl mx-auto">

                            <article className="lg:col-span-7 vt-paper-card relative overflow-hidden">
                                <div aria-hidden="true" className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
                                <div className="relative">
                                    <p className="vt-eyebrow !text-[var(--vt-champagne-deep)]">Người sáng lập</p>
                                    <h3 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-[var(--vt-ink)] leading-[1]"
                                        style={{ fontVariationSettings: '"opsz" 120, "SOFT" 30', fontWeight: 600 }}>
                                        Phạm Thị <span className="vt-display-italic text-[var(--vt-emerald-deep)]">Vân Trang</span>
                                    </h3>
                                    <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[var(--vt-ink-60)] font-bold">
                                        CEO · Người đại diện pháp luật
                                    </p>

                                    <div className="mt-6 space-y-4 text-[15px] text-[var(--vt-ink-70)] leading-relaxed">
                                        <p>
                                            Chuyên gia Sư phạm ngôn ngữ với hơn 10 năm kinh nghiệm, bà Phạm Thị Vân Trang đã xây dựng Van Trang từ một trung tâm nhỏ tại Hà Nội thành cơ sở đào tạo phục vụ 3.000+ cựu học viên trên cả nước.
                                        </p>
                                        <blockquote className="border-l-2 border-[var(--vt-champagne)] pl-5 italic vt-display text-[1.1rem] text-[var(--vt-ink)] leading-snug"
                                                    style={{ fontVariationSettings: '"opsz" 24, "SOFT" 50', fontWeight: 500 }}>
                                            "Giáo dục là vũ khí mạnh nhất để thay đổi thế giới."
                                        </blockquote>
                                        <p>
                                            Tâm huyết với triết lý ấy, bà và cộng sự không ngừng cập nhật phương pháp giảng dạy tiên tiến nhất để giúp học viên bứt phá trong thời gian ngắn nhất.
                                        </p>
                                    </div>
                                </div>
                            </article>

                            <div className="lg:col-span-5 space-y-3">
                                <h3 className="vt-display text-[1.5rem] text-[var(--vt-ink)] mb-3"
                                    style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30', fontWeight: 600 }}>
                                    Thông tin liên hệ
                                </h3>

                                {[
                                    { icon: MapPin, label: 'Trụ sở chính', value: '418 Đê La Thành, Ô Chợ Dừa, Đống Đa, Hà Nội', href: 'https://maps.google.com/?q=418+De+La+Thanh+Dong+Da+Ha+Noi', external: true },
                                    { icon: Phone, label: 'Tổng đài CSKH', value: '096 244 5963 · 033 924 4566', href: 'tel:0962445963' },
                                    { icon: Mail, label: 'Hỗ trợ học viên', value: 'info@vantrangedu.edu.vn', href: 'mailto:info@vantrangedu.edu.vn' },
                                    { icon: Facebook, label: 'Fanpage chính thức', value: 'fb.com/Englishvantrang', href: 'https://www.facebook.com/Englishvantrang', external: true },
                                ].map(({ icon: Icon, label, value, href, external }) => (
                                    <a key={label}
                                       href={href}
                                       target={external ? '_blank' : undefined}
                                       rel={external ? 'noopener noreferrer' : undefined}
                                       className="vt-paper-card !p-4 flex items-center gap-4 vt-tap hover:shadow-[var(--vt-shadow-deep)] transition-all">
                                        <span className="h-11 w-11 rounded-2xl bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] flex items-center justify-center shrink-0">
                                            <Icon size={20} />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--vt-ink-55)]">{label}</p>
                                            <p className="text-[14px] font-semibold text-[var(--vt-ink)] mt-0.5 break-words">{value}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Final CTA ──────────────────────────────────── */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="vt-ink-panel relative overflow-hidden">
                            <div aria-hidden="true" className="absolute -top-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
                            <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-[20rem] w-[20rem] rounded-full bg-[var(--vt-emerald)]/10 blur-3xl" />

                            <div className="relative grid md:grid-cols-12 gap-8 items-center p-8 md:p-14">
                                <div className="md:col-span-7">
                                    <p className="vt-eyebrow !text-[var(--vt-champagne)]">Sẵn sàng bắt đầu?</p>
                                    <h3 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] text-white"
                                        style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                        Hành trình mới <span className="vt-display-italic text-[var(--vt-champagne)]">bắt đầu hôm nay</span>
                                    </h3>
                                    <p className="mt-4 text-white/70 text-[15px] leading-relaxed max-w-xl">
                                        Tư vấn miễn phí 24/7. Test trình độ đầu vào không tốn phí. Đặt lịch tham quan cơ sở 418 Đê La Thành.
                                    </p>
                                </div>
                                <div className="md:col-span-5 flex flex-col gap-3">
                                    <Link to="/training" className="vt-btn vt-btn--accent justify-center !h-14">
                                        Xem chương trình đào tạo <ArrowRight size={16} />
                                    </Link>
                                    <Link to="/register" className="vt-btn vt-btn--ghost justify-center !h-14 !text-white !border-white/20 hover:!bg-white/10">
                                        Đăng ký tuyển sinh
                                    </Link>
                                    <Link to="/contact" className="vt-btn vt-btn--ghost justify-center !h-14 !text-white !border-white/20 hover:!bg-white/10">
                                        <MessageCircle size={16} /> Liên hệ tư vấn
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </ModernPublicLayout>
    );
}
