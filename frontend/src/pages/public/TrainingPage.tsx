// @ts-nocheck
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import Breadcrumb from '../../components/ui/Breadcrumb';
import {
    BookOpen, Globe, Zap, Building, CheckCircle2, Phone, Mail, ArrowRight,
    Users, ThumbsUp, Award, Monitor, Clock, Calendar, ChevronDown, Sparkles,
    Languages, MessageCircle,
} from 'lucide-react';
import SEO from '../../components/common/SEO';
import { gsap, useGSAP } from '../../lib/gsap';
import { ACTIVE_STUDENTS, SATISFACTION_RATE, YEARS_EXPERIENCE } from '../../constants/site-stats';

/* ── FAQ Accordion item ── */
function FaqItem({ item, index, total }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`vt-paper-card !p-0 overflow-hidden ${open ? 'shadow-[var(--vt-shadow-deep)]' : ''}`}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-start gap-4 px-5 md:px-7 py-5 text-left vt-tap"
                aria-expanded={open}
            >
                <span className="vt-eyebrow !text-[10px] mt-1 flex-shrink-0 text-[var(--vt-champagne-deep)]">
                    {String(index + 1).padStart(2, '0')} <span className="text-[var(--vt-ink-50)]">/ {String(total).padStart(2, '0')}</span>
                </span>
                <span className="flex-1 font-bold text-[var(--vt-ink)] text-[15px] md:text-base leading-snug">
                    {item.q}
                </span>
                <ChevronDown
                    size={20}
                    className={`text-[var(--vt-emerald)] shrink-0 transition-transform duration-300 mt-0.5 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <div className="px-5 md:px-7 pb-6 -mt-2 text-[var(--vt-ink-70)] text-sm md:text-[15px] leading-relaxed">
                    <div className="pt-4 border-t border-[var(--vt-line)]">
                        {item.a}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TrainingPage() {
    const container = useRef();

    const programs = [
        { title: 'Tin Học Văn Phòng', description: 'Đào tạo MOS (Microsoft Office Specialist) Word, Excel, PowerPoint, chứng chỉ IC3. Phù hợp học sinh, sinh viên và người đi làm cần hoàn thiện kỹ năng văn phòng.', path: '/training/tin-hoc-van-phong', icon: Monitor, duration: '2 – 3 tháng', schedule: 'T2-T4-T6, 18h30', fee: 'Liên hệ tư vấn' },
        { title: 'Hỗ Trợ Ngoại Ngữ Cấp Tốc', description: 'Chương trình đào tạo ngoại ngữ cấp tốc với phương pháp hiện đại, giúp học viên nhanh chóng nâng cao trình độ.', path: '/training/ngoai-ngu-cap-toc', icon: Zap, duration: '1 – 2 tháng', schedule: 'Linh hoạt', fee: 'Liên hệ tư vấn' },
        { title: 'Tiếng Anh Giao Tiếp', description: 'Khóa học tiếng Anh giao tiếp từ cơ bản đến nâng cao, tập trung vào thực hành phản xạ, phát âm chuẩn.', path: '/training/tieng-anh-giao-tiep', icon: Globe, duration: '3 tháng', schedule: 'T3-T5-T7, 19h', fee: 'Liên hệ tư vấn' },
        { title: 'Tiếng Anh Chuyên Ngành', description: 'Đào tạo tiếng Anh chuyên ngành: Kinh tế, Tài chính, Ngân hàng, Công nghệ thông tin.', path: '/training/tieng-anh-chuyen-nganh', icon: Building, duration: '3 – 4 tháng', schedule: 'T2-T4-T6, 19h', fee: 'Liên hệ tư vấn' },
        { title: 'Luyện Thi VSTEP', description: 'Luyện thi VSTEP A2, B1, B2, C1 — đề chuẩn Bộ GD&ĐT, cam kết đầu ra theo hợp đồng.', path: '/training/luyen-thi-vstep', icon: Award, duration: '2 – 4 tháng', schedule: 'T2-T4-T6, 19h', fee: 'Liên hệ tư vấn' },
        { title: 'Luyện Thi Chứng Chỉ Quốc Tế', description: 'Luyện thi TOEIC, IELTS, TOEFL, Cambridge với giảng viên IELTS 8.0+ và cam kết đầu ra.', path: '/training/luyen-thi-chung-chi', icon: BookOpen, duration: '3 – 6 tháng', schedule: 'T2-T4-T6, 19h', fee: 'Liên hệ tư vấn' },
        { title: 'Ngoại Ngữ Khác', description: 'Đào tạo Tiếng Nhật, Tiếng Hàn, Tiếng Trung, Tiếng Pháp — từ sơ cấp đến nâng cao.', path: '/training/ngoai-ngu-khac', icon: Languages, duration: '4 – 6 tháng', schedule: 'Linh hoạt', fee: 'Liên hệ tư vấn' },
        { title: 'Đào Tạo Theo Nhu Cầu', description: 'Chương trình linh hoạt, đáp ứng nhu cầu cụ thể của từng học viên với lộ trình AI cá nhân hóa.', path: '/training/dao-tao-theo-nhu-cau', icon: Sparkles, duration: 'Tùy lộ trình', schedule: 'Theo thỏa thuận', fee: 'Liên hệ tư vấn' },
    ];

    const features = [
        { title: 'Phương pháp 4.0', desc: 'Giáo trình cập nhật mới nhất, kết hợp công nghệ AI và trải nghiệm offline.' },
        { title: 'Giảng viên tinh hoa', desc: 'TESOL/IELTS 8.0+ với kinh nghiệm thực chiến quốc tế và bản địa.' },
        { title: 'Lộ trình cá nhân hoá', desc: 'Trợ lý AI phân tích trình độ đầu vào và đề xuất chiến lược học.' },
        { title: 'Hỗ trợ 24/7', desc: 'Học bù, xem lại bài giảng và chat trực tuyến với giảng viên.' },
        { title: 'Cam kết đầu ra', desc: 'Hợp đồng cam kết điểm số, hoàn phí hoặc học lại miễn phí.' },
        { title: 'Chứng nhận hoàn thành', desc: 'Cấp chứng nhận chính ngạch sau mỗi khoá học hoặc cấp độ.' },
    ];

    const scheduleRows = [
        { course: 'Tin Học Văn Phòng (MOS)', date: '10/03/2026', duration: '2 tháng', schedule: 'T2-T4-T6, 18h30', mode: 'Offline', fee: 'Liên hệ' },
        { course: 'Tiếng Anh Giao Tiếp', date: '10/03/2026', duration: '3 tháng', schedule: 'T3-T5-T7, 19h', mode: 'Online', fee: 'Liên hệ' },
        { course: 'Luyện Thi TOEIC', date: '15/03/2026', duration: '3 tháng', schedule: 'T2-T4-T6, 19h', mode: 'Offline', fee: 'Liên hệ' },
        { course: 'VSTEP B1', date: '20/03/2026', duration: '2 tháng', schedule: 'T3-T5-T7, 19h', mode: 'Offline', fee: 'Liên hệ' },
        { course: 'VSTEP B2', date: '25/03/2026', duration: '3 tháng', schedule: 'T2-T4-T6, 19h', mode: 'Offline', fee: 'Liên hệ' },
        { course: 'Tiếng Nhật N3', date: '01/04/2026', duration: '4 tháng', schedule: 'T7-CN, 8h', mode: 'Online', fee: 'Liên hệ' },
    ];

    const vstepLevels = [
        { level: 'A2', target: 'Học sinh cấp 3, người mới bắt đầu', duration: '2 tháng · 40 giờ', skills: 'Nghe, Nói, Đọc, Viết cơ bản' },
        { level: 'B1', target: 'Sinh viên đại học, người đi làm', duration: '2–3 tháng · 60 giờ', skills: 'Giao tiếp tự tin, đọc hiểu trung cấp' },
        { level: 'B2', target: 'Tốt nghiệp ĐH, nâng cao năng lực', duration: '3–4 tháng · 80 giờ', skills: 'Tiếng Anh học thuật, viết luận, phỏng vấn' },
        { level: 'C1', target: 'Nghiên cứu sinh, giảng viên, cán bộ', duration: '4–6 tháng · 120 giờ', skills: 'Thành thạo, học thuật cấp cao' },
    ];

    const faqs = [
        { q: 'VSTEP là gì?', a: 'VSTEP (Vietnamese Standardized Test of English Proficiency) là bộ đề thi đánh giá năng lực tiếng Anh theo khung tham chiếu châu Âu CEFR, do Bộ GD&ĐT ban hành. Chứng chỉ VSTEP được công nhận rộng rãi trong tuyển dụng, xét tốt nghiệp đại học và thăng tiến nghề nghiệp.' },
        { q: 'Học bao lâu để đạt VSTEP B2?', a: 'Tuỳ trình độ đầu vào: Nếu đang ở mức B1, cần khoảng 2–3 tháng học tập trung (3 buổi/tuần, mỗi buổi 2 giờ). Nếu bắt đầu từ A2, cần 4–5 tháng. Vân Trang sẽ test đầu vào miễn phí và tư vấn lộ trình phù hợp.' },
        { q: 'Học phí các khoá là bao nhiêu?', a: 'Học phí phụ thuộc vào khoá học và hình thức học (online/offline). Vui lòng liên hệ hotline 096 244 9563 hoặc nhắn Zalo để nhận báo giá. Vân Trang có chính sách giảm giá cho học viên đăng ký sớm và nhóm từ 2 người.' },
        { q: 'Khoá Tin học Văn phòng gồm những gì?', a: 'Bao gồm: Microsoft Word (soạn thảo, định dạng, mail merge), Excel (hàm cơ bản đến nâng cao, PivotTable, biểu đồ), PowerPoint (thiết kế slide chuyên nghiệp), và ôn luyện chứng chỉ MOS/IC3. Phù hợp cho học sinh, sinh viên và người đi làm.' },
        { q: 'Có hỗ trợ học bù khi vắng không?', a: 'Có. Học viên vắng mặt có thể học bù tại lớp khác cùng cấp độ hoặc xem lại video bài giảng trên hệ thống E-learning. Hỗ trợ tối đa 30% số buổi học bù trong một khoá.' },
        { q: 'Có thể học thử trước khi đăng ký không?', a: 'Có. VanTrangEdu cho phép học thử 1 buổi miễn phí với bất kỳ khoá học nào. Liên hệ hotline hoặc Zalo để đặt lịch.' },
    ];

    const trainingSchema = {
        '@type': 'ItemList',
        name: 'Các chương trình đào tạo Van Trang Education',
        itemListElement: programs.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Course',
                name: p.title,
                description: p.description,
                provider: { '@type': 'Organization', name: 'Van Trang Education', sameAs: 'https://vantrangedu.com' },
            },
        })),
    };

    const breadcrumbItems = [
        { label: 'Trang chủ', path: '/' },
        { label: 'Đào tạo', path: '/training' },
    ];

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.t-eyebrow', { y: 14, opacity: 0, duration: 0.5 })
          .from('.t-title span', { y: 40, opacity: 0, duration: 0.9, stagger: 0.08 }, '-=0.2')
          .from('.t-desc', { y: 16, opacity: 0, duration: 0.7 }, '-=0.4')
          .from('.t-stat', { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.3');

        gsap.from('.program-card', {
            scrollTrigger: { trigger: '.programs-grid', start: 'top 80%' },
            y: 30, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out',
        });
        gsap.from('.feature-tile', {
            scrollTrigger: { trigger: '.features-section', start: 'top 85%' },
            y: 24, opacity: 0, duration: 0.6, stagger: 0.07,
        });
    }, { scope: container });

    return (
        <ModernPublicLayout>
            <SEO
                title="Đào tạo"
                description="Đào tạo ngoại ngữ kỷ nguyên mới: Tiếng Anh cấp tốc, Giao tiếp, Luyện thi chứng chỉ quốc tế. Phương pháp giảng dạy hiện đại, cam kết đầu ra."
                url="/training"
                structuredData={trainingSchema}
            />

            <div ref={container} className="relative bg-[var(--vt-paper)] overflow-hidden">

                {/* Breadcrumb */}
                <div className="vt-container pt-24 md:pt-28 pb-2">
                    <Breadcrumb items={breadcrumbItems} />
                </div>

                {/* ── Hero ───────────────────────────────────────── */}
                <section className="relative pt-8 md:pt-14 pb-16 md:pb-24">
                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-32 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-[var(--vt-emerald)]/8 blur-3xl" />
                        <div className="absolute bottom-[-10rem] left-[-10%] h-[24rem] w-[24rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
                    </div>

                    <div className="vt-container relative">
                        <div className="max-w-3xl">
                            <p className="t-eyebrow vt-eyebrow !text-[var(--vt-champagne-deep)]">
                                Chương trình đào tạo
                            </p>
                            <h1 className="t-title vt-display mt-5 text-[clamp(1.85rem,6vw,4.5rem)] leading-[0.95] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 120, "SOFT" 30', fontWeight: 600 }}>
                                <span className="block">Hệ sinh thái</span>
                                <span className="block vt-display-italic text-[var(--vt-emerald-deep)]">đào tạo</span>
                                <span className="block">chuẩn mực.</span>
                            </h1>
                            <p className="t-desc vt-lead mt-7 max-w-2xl">
                                Tiếng Anh giao tiếp, luyện thi VSTEP · TOEIC · IELTS và Tin học Văn phòng (Word · Excel · PowerPoint · MOS) — đầy đủ chương trình phục vụ học sinh, sinh viên và người đi làm.
                            </p>

                            <div className="mt-9 flex flex-col sm:flex-row gap-3">
                                <Link to="/login" className="vt-btn vt-btn--primary w-full sm:w-auto">
                                    Đăng nhập học viên <ArrowRight size={16} />
                                </Link>
                                <Link to="/register" className="vt-btn vt-btn--accent w-full sm:w-auto">
                                    Đăng ký học viên <ArrowRight size={16} />
                                </Link>
                                <a href="tel:0962449563" className="vt-btn vt-btn--ghost w-full sm:w-auto">
                                    <Phone size={16} /> 096 244 9563
                                </a>
                            </div>
                        </div>

                        {/* Stat row */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-10 md:mt-16 max-w-3xl">
                            {[
                                { icon: Users, value: ACTIVE_STUDENTS, label: 'Học viên' },
                                { icon: ThumbsUp, value: SATISFACTION_RATE, label: 'Hài lòng' },
                                { icon: Award, value: YEARS_EXPERIENCE, label: 'Năm KN' },
                            ].map(({ icon: Icon, value, label }) => (
                                <div key={label} className="t-stat vt-stat-tile text-center p-3 sm:p-5">
                                    <Icon size={18} className="text-[var(--vt-champagne-deep)] mx-auto" />
                                    <p className="vt-display mt-2 text-[1.35rem] sm:text-[2.25rem] leading-none text-[var(--vt-ink)]"
                                       style={{ fontVariationSettings: '"opsz" 72', fontWeight: 600 }}>
                                        {value}
                                    </p>
                                    <p className="mt-1.5 text-[10px] sm:text-[13px] text-[var(--vt-ink-60)] leading-snug">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Programs grid ──────────────────────────────── */}
                <section className="programs-grid vt-section">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Danh mục</p>
                            <h2 className="vt-display mt-4 text-[clamp(2rem,4vw,3rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Cấu trúc <span className="vt-display-italic text-[var(--vt-emerald-deep)]">chương trình</span>
                            </h2>
                            <p className="vt-lead mt-4 max-w-2xl mx-auto">
                                Từ ngoại ngữ đến tin học văn phòng — đầy đủ các chương trình phục vụ học sinh, sinh viên và người đi làm.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
                            {programs.map(({ title, description, path, icon: Icon, duration, schedule, fee }) => (
                                <Link key={path + title} to={path} className="program-card vt-feature-card group block">
                                    <div className="flex flex-col h-full">
                                        <span className="h-12 w-12 rounded-2xl bg-[var(--vt-champagne)]/15 text-[var(--vt-champagne-deep)] flex items-center justify-center group-hover:bg-[var(--vt-champagne)] group-hover:text-[var(--vt-ink)] transition-colors">
                                            <Icon size={22} />
                                        </span>
                                        <h3 className="mt-5 font-bold text-[var(--vt-ink)] text-[17px] leading-snug group-hover:text-[var(--vt-emerald-deep)] transition-colors">
                                            {title}
                                        </h3>
                                        <p className="mt-2.5 text-[13.5px] text-[var(--vt-ink-60)] leading-relaxed flex-grow">
                                            {description}
                                        </p>
                                        <ul className="mt-5 space-y-1.5 text-[12.5px] text-[var(--vt-ink-70)]">
                                            <li className="flex items-center gap-2">
                                                <Clock size={13} className="text-[var(--vt-emerald)] shrink-0" />
                                                <span>Thời lượng <strong className="font-semibold text-[var(--vt-ink)]">{duration}</strong></span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Calendar size={13} className="text-[var(--vt-emerald)] shrink-0" />
                                                <span>Lịch <strong className="font-semibold text-[var(--vt-ink)]">{schedule}</strong></span>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Sparkles size={13} className="text-[var(--vt-emerald)] shrink-0" />
                                                <span>Học phí <strong className="font-semibold text-[var(--vt-ink)]">{fee}</strong></span>
                                            </li>
                                        </ul>
                                        <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--vt-emerald-deep)] group-hover:gap-2.5 transition-all">
                                            Tìm hiểu chi tiết <ArrowRight size={14} />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Schedule table ─────────────────────────────── */}
                <section className="vt-section bg-[var(--vt-cream)]/60 border-y border-[var(--vt-line)]">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Khai giảng gần nhất</p>
                            <h2 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                Lịch khai giảng tháng tới
                            </h2>
                        </div>

                        {/* Desktop table */}
                        <div className="hidden md:block mt-10 vt-paper-card !p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[var(--vt-ink)] text-[var(--vt-paper)]">
                                            <th className="px-5 py-4 text-left font-semibold tracking-wide text-[12px] uppercase">Khoá học</th>
                                            <th className="px-5 py-4 text-left font-semibold tracking-wide text-[12px] uppercase">Khai giảng</th>
                                            <th className="px-5 py-4 text-left font-semibold tracking-wide text-[12px] uppercase">Thời lượng</th>
                                            <th className="px-5 py-4 text-left font-semibold tracking-wide text-[12px] uppercase">Lịch học</th>
                                            <th className="px-5 py-4 text-left font-semibold tracking-wide text-[12px] uppercase">Hình thức</th>
                                            <th className="px-5 py-4 text-left font-semibold tracking-wide text-[12px] uppercase">Học phí</th>
                                            <th className="px-5 py-4 text-right font-semibold tracking-wide text-[12px] uppercase">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scheduleRows.map((row, idx) => (
                                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[var(--vt-cream)]/40'} hover:bg-[var(--vt-champagne)]/8 transition-colors`}>
                                                <td className="px-5 py-4 font-semibold text-[var(--vt-ink)]">{row.course}</td>
                                                <td className="px-5 py-4 text-[var(--vt-ink-70)]">{row.date}</td>
                                                <td className="px-5 py-4 text-[var(--vt-ink-70)]">{row.duration}</td>
                                                <td className="px-5 py-4 text-[var(--vt-ink-60)] text-xs">{row.schedule}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`vt-pill ${row.mode === 'Online' ? 'vt-pill--emerald' : 'vt-pill--champagne'}`}>
                                                        {row.mode}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-[var(--vt-emerald-deep)]">{row.fee}</td>
                                                <td className="px-5 py-4 text-right">
                                                    <Link to="/register" className="vt-btn vt-btn--primary !h-9 !px-4 !text-[12px]">
                                                        Đăng ký
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-4 mt-8">
                            {scheduleRows.map((row, idx) => (
                                <article key={idx} className="vt-paper-card !p-5">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <h4 className="font-bold text-[var(--vt-ink)] text-[15px] leading-snug flex-1">{row.course}</h4>
                                        <span className={`vt-pill ${row.mode === 'Online' ? 'vt-pill--emerald' : 'vt-pill--champagne'} shrink-0 text-[11px]`}>
                                            {row.mode}
                                        </span>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-[14px]">
                                        <dt className="text-[var(--vt-ink-55)]">Khai giảng</dt>
                                        <dd className="text-[var(--vt-ink)] font-semibold text-right">{row.date}</dd>
                                        <dt className="text-[var(--vt-ink-55)]">Thời lượng</dt>
                                        <dd className="text-[var(--vt-ink)] font-semibold text-right">{row.duration}</dd>
                                        <dt className="text-[var(--vt-ink-55)]">Lịch học</dt>
                                        <dd className="text-[var(--vt-ink)] font-semibold text-right break-words">{row.schedule}</dd>
                                        <dt className="text-[var(--vt-ink-55)]">Học phí</dt>
                                        <dd className="text-[var(--vt-emerald-deep)] font-bold text-right">{row.fee}</dd>
                                    </dl>
                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                        <Link to="/register" className="vt-btn vt-btn--primary !h-12 !text-[13px] justify-center">Đăng ký</Link>
                                        <a href="tel:0962449563" className="vt-btn vt-btn--ghost !h-12 !text-[13px] justify-center">Gọi ngay</a>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <p className="text-center text-[12.5px] text-[var(--vt-ink-55)] mt-6">
                            Lịch khai giảng có thể thay đổi. Liên hệ hotline <strong className="text-[var(--vt-ink)]">096 244 9563</strong> để xác nhận lịch gần nhất.
                        </p>
                    </div>
                </section>

                {/* ── MOS / Tin Học Văn Phòng ────────────────────── */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow !text-[var(--vt-emerald-deep)]">Chương trình mới · Tin học văn phòng</p>
                            <h2 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Microsoft Office Specialist <span className="vt-display-italic text-[var(--vt-emerald-deep)]">chính ngạch</span>
                            </h2>
                            <p className="vt-lead mt-4 max-w-2xl mx-auto">
                                Đào tạo toàn diện kỹ năng máy tính văn phòng, ôn luyện chứng chỉ <strong className="text-[var(--vt-ink)]">MOS</strong> và <strong className="text-[var(--vt-ink)]">IC3</strong> — cấp bởi Certiport, công nhận tại 150+ quốc gia.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
                            {[
                                { title: 'Microsoft Word', items: ['Soạn thảo & định dạng văn bản', 'Mail Merge tự động', 'Tạo mẫu biểu, hợp đồng', 'Ôn thi MOS Word'] },
                                { title: 'Microsoft Excel', items: ['Hàm cơ bản đến nâng cao', 'PivotTable & PivotChart', 'VLOOKUP, INDEX, MATCH', 'Ôn thi MOS Excel'] },
                                { title: 'Microsoft PowerPoint', items: ['Thiết kế slide chuyên nghiệp', 'Animation & hiệu ứng', 'Thuyết trình tự tin', 'Ôn thi MOS PowerPoint'] },
                                { title: 'Chứng chỉ IC3 / MOS', items: ['Ôn thi IC3 GS5 toàn diện', 'Microsoft Office Specialist', 'Chứng chỉ quốc tế Certiport', 'Công nhận 150+ quốc gia'] },
                            ].map((item, i) => (
                                <article key={item.title} className="vt-paper-card">
                                    <p className="vt-eyebrow !text-[10px] !text-[var(--vt-ink-55)]">Module {String(i + 1).padStart(2, '0')}</p>
                                    <h4 className="mt-3 font-bold text-[var(--vt-ink)] text-base">{item.title}</h4>
                                    <ul className="mt-4 space-y-2.5">
                                        {item.items.map((li) => (
                                            <li key={li} className="flex items-start gap-2 text-[13px] text-[var(--vt-ink-70)] leading-relaxed">
                                                <CheckCircle2 size={14} className="text-[var(--vt-emerald)] mt-0.5 shrink-0" />
                                                <span>{li}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>

                        <div className="text-center mt-12 flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/login" className="vt-btn vt-btn--emerald w-full sm:w-auto">
                                <MessageCircle size={16} /> Đăng nhập học viên
                            </Link>
                            <Link to="/register" className="vt-btn vt-btn--primary w-full sm:w-auto">
                                <Phone size={16} /> Đăng ký học viên
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── VSTEP comparison ───────────────────────────── */}
                <section className="vt-section bg-[var(--vt-cream)]/60 border-y border-[var(--vt-line)]">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">VSTEP · CEFR</p>
                            <h2 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                So sánh các cấp độ
                            </h2>
                            <p className="vt-lead mt-4 max-w-2xl mx-auto">
                                VSTEP do Bộ GD&ĐT tổ chức, tương đương khung CEFR châu Âu — phổ biến trong tuyển dụng, xét tốt nghiệp ĐH và thăng tiến nghề nghiệp tại Việt Nam.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
                            {vstepLevels.map((row, idx) => (
                                <article key={row.level} className="vt-feature-card">
                                    <div className="flex items-baseline justify-between">
                                        <p className="vt-display text-[3rem] leading-none text-[var(--vt-emerald-deep)]"
                                           style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30', fontWeight: 600 }}>
                                            {row.level}
                                        </p>
                                        <p className="vt-eyebrow !text-[10px]">Cấp {idx + 1}</p>
                                    </div>
                                    <p className="mt-5 text-[13.5px] text-[var(--vt-ink-70)] leading-relaxed">{row.target}</p>
                                    <hr className="vt-fine-divider my-4" />
                                    <dl className="space-y-1.5 text-[13px]">
                                        <div className="flex items-center justify-between gap-2">
                                            <dt className="text-[var(--vt-ink-55)]">Thời lượng</dt>
                                            <dd className="text-[var(--vt-ink)] font-semibold text-right">{row.duration}</dd>
                                        </div>
                                    </dl>
                                    <p className="mt-3 text-[12.5px] text-[var(--vt-ink-60)] leading-relaxed">
                                        <span className="text-[var(--vt-ink-55)]">Kỹ năng: </span>{row.skills}
                                    </p>
                                </article>
                            ))}
                        </div>

                        <p className="text-center text-[12.5px] text-[var(--vt-ink-55)] mt-6">
                            * Thời lượng tính dựa trên 3 buổi/tuần, mỗi buổi 2 giờ. Học viên có trình độ cao hơn có thể rút ngắn lộ trình.
                        </p>
                    </div>
                </section>

                {/* ── Features ───────────────────────────────────── */}
                <section className="features-section vt-section">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Vì sao chọn Vân Trang</p>
                            <h2 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Sáu <span className="vt-display-italic text-[var(--vt-emerald-deep)]">giá trị cốt lõi</span>
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
                            {features.map((feature, idx) => (
                                <article key={feature.title} className="feature-tile vt-paper-card group">
                                    <p className="vt-display text-[2rem] leading-none text-[var(--vt-champagne-deep)]/70"
                                       style={{ fontVariationSettings: '"opsz" 72', fontWeight: 600 }}>
                                        {String(idx + 1).padStart(2, '0')}
                                    </p>
                                    <h4 className="mt-4 font-bold text-[var(--vt-ink)] text-[17px]">{feature.title}</h4>
                                    <p className="mt-2 text-[13.5px] text-[var(--vt-ink-65)] leading-relaxed">{feature.desc}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── FAQ ────────────────────────────────────────── */}
                <section className="vt-section bg-[var(--vt-cream)]/60 border-y border-[var(--vt-line)]">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <p className="vt-eyebrow">Câu hỏi thường gặp</p>
                            <h2 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.5rem)] text-[var(--vt-ink)]"
                                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                Mọi điều bạn cần biết
                            </h2>
                        </div>

                        <div className="max-w-3xl mx-auto mt-12 space-y-3">
                            {faqs.map((item, idx) => (
                                <FaqItem key={idx} item={item} index={idx} total={faqs.length} />
                            ))}
                        </div>

                        <div className="text-center mt-10">
                            <p className="text-[var(--vt-ink-60)] text-sm mb-4">Còn câu hỏi khác? Liên hệ tư vấn viên của chúng tôi ngay.</p>
                            <a href="tel:0962449563" className="vt-btn vt-btn--primary">
                                <Phone size={16} /> Gọi hotline 096 244 9563
                            </a>
                        </div>
                    </div>
                </section>

                {/* ── Final CTA ──────────────────────────────────── */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="vt-ink-panel relative overflow-hidden">
                            <div aria-hidden="true" className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
                            <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-[20rem] w-[20rem] rounded-full bg-[var(--vt-emerald)]/10 blur-3xl" />

                            <div className="relative grid md:grid-cols-12 gap-8 items-center p-8 md:p-14">
                                <div className="md:col-span-7">
                                    <p className="vt-eyebrow !text-[var(--vt-champagne)]">Bắt đầu hành trình</p>
                                    <h3 className="vt-display mt-4 text-[clamp(1.75rem,3.5vw,2.75rem)] text-white"
                                        style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                                        Sẵn sàng để <span className="vt-display-italic text-[var(--vt-champagne)]">bứt phá</span>?
                                    </h3>
                                    <p className="mt-4 text-white/70 text-[15px] leading-relaxed max-w-xl">
                                        Tư vấn miễn phí 24/7. Test trình độ đầu vào không tốn phí. Cam kết đầu ra theo hợp đồng — học phí cạnh tranh, hỗ trợ trả góp.
                                    </p>
                                </div>
                                <div className="md:col-span-5 flex flex-col gap-3">
                                    <Link to="/register" className="vt-btn vt-btn--accent justify-center !h-14">
                                        Đăng ký ngay <ArrowRight size={16} />
                                    </Link>
                                    <a href="tel:0962449563" className="vt-btn vt-btn--ghost justify-center !h-14 !text-white !border-white/20 hover:!bg-white/10">
                                        <Phone size={16} /> 096 244 9563
                                    </a>
                                    <a href="mailto:info@vantrangedu.edu.vn" className="vt-btn vt-btn--ghost justify-center !h-14 !text-white !border-white/20 hover:!bg-white/10">
                                        <Mail size={16} /> info@vantrangedu.edu.vn
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Related ────────────────────────────────────── */}
                <section className="pb-16">
                    <div className="vt-container">
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[13px]">
                            <span className="text-[var(--vt-ink-55)] mr-2">Khám phá thêm</span>
                            <Link to="/register" className="vt-pill vt-pill--emerald hover:bg-[var(--vt-emerald)] hover:text-white transition-colors">
                                Đăng ký tuyển sinh <ArrowRight size={12} />
                            </Link>
                            <Link to="/contact" className="vt-pill vt-pill--ink hover:bg-[var(--vt-ink)] hover:text-white transition-colors">
                                Liên hệ tư vấn <ArrowRight size={12} />
                            </Link>
                            <Link to="/news" className="vt-pill vt-pill--champagne hover:bg-[var(--vt-champagne)] hover:text-[var(--vt-ink)] transition-colors">
                                Tin tức & Blog <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </ModernPublicLayout>
    );
}
