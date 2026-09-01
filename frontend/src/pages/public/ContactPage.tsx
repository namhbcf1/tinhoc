// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    MapPin,
    Phone,
    Mail,
    MessageCircle,
    Clock,
    Send,
    Loader2,
    CheckCircle2,
    ArrowUpRight,
} from 'lucide-react';
import { Facebook } from '../../components/common/BrandIcons';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import { gsap, useGSAP } from '../../lib/gsap';
import { apiPost } from '../../lib/api';

const contactSchema = z.object({
    name: z.string().min(2, 'Vui lòng nhập họ tên đầy đủ'),
    email: z.string().email('Email không hợp lệ'),
    phone: z.string().regex(/^(0[3-9]\d{8}|\+84[3-9]\d{8})$/, 'Số điện thoại không hợp lệ (VD: 0962449563)'),
    subject: z.string().min(5, 'Vui lòng nhập tiêu đề'),
    message: z.string().min(10, 'Nội dung tin nhắn quá ngắn'),
});

const primaryChannels = [
    {
        icon: Phone,
        eyebrow: 'Hotline · 24/7',
        title: 'Tư vấn nhanh qua điện thoại',
        lines: [
            { href: 'tel:0962449563', label: '096 244 9563' },
            { href: 'tel:0339244566', label: '033 924 4566' },
        ],
        helper: 'Phản hồi trong vòng 2 phút giờ hành chính.',
    },
    {
        icon: Mail,
        eyebrow: 'Email · Hồ sơ',
        title: 'Hộp thư chính thức',
        lines: [
            { href: 'mailto:info@vantrangedu.edu.vn', label: 'info@vantrangedu.edu.vn' },
        ],
        helper: 'Phù hợp gửi tài liệu, đối tác và yêu cầu hợp tác.',
    },
    {
        icon: MessageCircle,
        eyebrow: 'Zalo · Chat',
        title: 'Trò chuyện qua Zalo',
        lines: [
            { href: 'https://zalo.me/0962449563', label: 'zalo.me/0962449563', external: true },
        ],
        helper: 'Gửi ảnh chụp hồ sơ, lịch học và đặt câu hỏi tức thì.',
    },
];

const secondaryChannels = [
    {
        icon: MapPin,
        title: 'Trụ sở',
        body: '418 Đê La Thành, P. Ô Chợ Dừa, Q. Đống Đa, Hà Nội',
        action: { href: 'https://maps.google.com/?q=418+%C4%90%C3%AA+La+Th%C3%A0nh+H%C3%A0+N%E1%BB%99i', label: 'Xem bản đồ', external: true },
    },
    {
        icon: Facebook,
        title: 'Cộng đồng Facebook',
        body: '@Englishvantrang · cập nhật học liệu & lịch khai giảng',
        action: { href: 'https://www.facebook.com/Englishvantrang', label: 'Theo dõi', external: true },
    },
    {
        icon: Clock,
        title: 'Giờ tiếp đón',
        body: 'Thứ 2 – Thứ 7: 08:00 – 21:00 · Chủ nhật: 08:00 – 17:00',
    },
];

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const container = useRef(null);

    const structuredData = [
        {
            '@type': 'ContactPage',
            name: 'Lien he Van Trang Education',
            description: 'Kenh lien he, tu van khoa hoc va hop tac voi Van Trang Education.',
            url: 'https://vantrangedu.com/contact',
        },
        {
            '@type': 'LocalBusiness',
            name: 'Van Trang Education',
            url: 'https://vantrangedu.com/contact',
            telephone: '+84-962-445-963',
            email: 'info@vantrangedu.edu.vn',
            address: {
                '@type': 'PostalAddress',
                streetAddress: '418 De La Thanh',
                addressLocality: 'Ha Noi',
                addressCountry: 'VN',
            },
        },
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
                { '@type': 'ListItem', position: 2, name: 'Lien he', item: 'https://vantrangedu.com/contact' },
            ],
        },
    ];

    const form = useForm({
        resolver: zodResolver(contactSchema),
        defaultValues: { name: '', email: '', phone: '', subject: '', message: '' },
    });

    const onSubmit = async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await apiPost('/contact', data);
            setIsSuccess(true);
            form.reset();
        } catch (error) {
            window.location.href = `mailto:info@vantrangedu.edu.vn?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(`Tên: ${data.name}\nSĐT: ${data.phone}\n\n${data.message}`)}`;
            setIsSuccess(true);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.c-eyebrow', { y: 16, opacity: 0, duration: 0.6 })
            .from('.c-title span', { y: 32, opacity: 0, duration: 0.85, stagger: 0.08 }, '-=0.3')
            .from('.c-desc', { y: 16, opacity: 0, duration: 0.6 }, '-=0.45')
            .from('.c-cta', { y: 16, opacity: 0, duration: 0.5 }, '-=0.35');

        gsap.from('.c-channel', {
            scrollTrigger: { trigger: '.c-channel-grid', start: 'top 80%' },
            y: 28,
            opacity: 0,
            duration: 0.7,
            stagger: 0.1,
        });

        gsap.from('.c-form', {
            scrollTrigger: { trigger: '.c-form', start: 'top 85%' },
            y: 32,
            opacity: 0,
            duration: 0.8,
        });
    }, { scope: container });

    const inputCls = 'w-full h-12 md:h-13 px-4 rounded-xl border border-[var(--vt-line-strong)] bg-white text-[var(--vt-ink)] placeholder:text-[var(--vt-ink-40)] focus:outline-none focus:ring-4 focus:ring-[var(--vt-emerald)]/15 focus:border-[var(--vt-emerald)] transition-colors';

    return (
        <ModernPublicLayout>
            <SEO
                title="Lien he tu van"
                description="Lien he Van Trang Education de nhan tu van khoa hoc, lich thi, hop tac va ho tro nhanh qua hotline, email hoac form truc tuyen."
                url="/contact"
                structuredData={structuredData}
            />

            <div ref={container} className="bg-[var(--vt-paper)] text-[var(--vt-ink)] overflow-hidden">
                {/* Hero */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="max-w-4xl">
                            <p className="c-eyebrow vt-eyebrow">Liên hệ · Tư vấn 1-1</p>
                            <h1 className="c-title vt-display mt-5 text-[clamp(2.5rem,6.5vw,4.75rem)] leading-[1.02]">
                                <span className="block">Một cuộc trò chuyện</span>
                                <span className="block">
                                    đủ để bạn{' '}
                                    <span className="vt-display-italic text-[var(--vt-emerald-deep)]">an tâm.</span>
                                </span>
                            </h1>
                            <p className="c-desc vt-lead mt-6 max-w-2xl">
                                Đội ngũ Vân Trang lắng nghe mục tiêu — chứng chỉ, du học, hay phục vụ công việc — rồi
                                tư vấn lộ trình phù hợp nhất. Bạn chọn kênh tiện nhất, chúng tôi đảm bảo phản hồi nhanh.
                            </p>
                            <div className="c-cta mt-9 flex flex-wrap gap-3">
                                <a href="tel:0962449563" className="vt-btn vt-btn--primary">
                                    <Phone size={16} />
                                    Gọi 096 244 9563
                                </a>
                                <a href="https://zalo.me/0962449563" target="_blank" rel="noopener noreferrer" className="vt-btn vt-btn--ghost">
                                    <MessageCircle size={16} />
                                    Nhắn Zalo
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="vt-fine-divider" aria-hidden="true" />

                {/* Primary channels */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="vt-section-header">
                            <div>
                                <p className="vt-eyebrow">Kênh chính · Phản hồi nhanh</p>
                                <h2 className="vt-headline mt-3">Ba cách tốt nhất để bắt đầu</h2>
                            </div>
                            <p className="vt-lead max-w-md md:text-right">
                                Chọn cách phù hợp với bạn. Mọi kênh đều dẫn về một đội ngũ duy nhất.
                            </p>
                        </div>

                        <div className="c-channel-grid mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                            {primaryChannels.map(({ icon: Icon, eyebrow, title, lines, helper }) => (
                                <article key={title} className="c-channel vt-feature-card group">
                                    <div className="flex items-start gap-4">
                                        <span className="h-12 w-12 flex-shrink-0 rounded-xl bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] grid place-items-center group-hover:bg-[var(--vt-champagne)] group-hover:text-[var(--vt-ink)] transition-colors">
                                            <Icon size={20} strokeWidth={1.75} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="vt-overline text-[10px]">{eyebrow}</p>
                                            <h3 className="mt-1.5 text-base font-semibold text-[var(--vt-ink)]">{title}</h3>
                                        </div>
                                    </div>

                                    <ul className="mt-5 space-y-2">
                                        {lines.map(({ href, label, external }) => (
                                            <li key={label}>
                                                <a
                                                    href={href}
                                                    target={external ? '_blank' : undefined}
                                                    rel={external ? 'noopener noreferrer' : undefined}
                                                    className="vt-display text-2xl tracking-tight text-[var(--vt-ink)] hover:text-[var(--vt-emerald-deep)] transition-colors break-all"
                                                    style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30', fontWeight: 600 }}
                                                >
                                                    {label}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>

                                    <p className="mt-4 text-sm text-[var(--vt-ink-60)] leading-relaxed border-t border-[var(--vt-line)] pt-4">
                                        {helper}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Form + sidebar */}
                <section className="vt-section">
                    <div className="vt-container">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                            {/* Form */}
                            <div className="c-form lg:col-span-7 vt-paper-card !p-5 md:!p-10">
                                <p className="vt-eyebrow">Gửi yêu cầu chi tiết</p>
                                <h2 className="vt-display mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1]"
                                    style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}>
                                    Mô tả mục tiêu, nhận lộ trình.
                                </h2>
                                <p className="mt-3 text-[var(--vt-ink-60)] leading-relaxed">
                                    Chúng tôi sẽ phản hồi bằng email hoặc gọi lại trong giờ hành chính. Mọi thông tin
                                    được bảo mật và chỉ dùng cho mục đích tư vấn.
                                </p>

                                {isSuccess ? (
                                    <div className="mt-8 rounded-2xl border border-[var(--vt-emerald)]/25 bg-[var(--vt-emerald-soft)] p-8 md:p-10 text-center">
                                        <div className="h-16 w-16 mx-auto rounded-full bg-[var(--vt-emerald)] text-white grid place-items-center shadow-[var(--vt-shadow-base)]">
                                            <CheckCircle2 size={32} strokeWidth={2.25} />
                                        </div>
                                        <h3 className="mt-5 vt-display text-2xl text-[var(--vt-emerald-deep)]"
                                            style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                            Đã nhận yêu cầu của bạn
                                        </h3>
                                        <p className="mt-3 text-[var(--vt-ink-70)] max-w-md mx-auto">
                                            Hồ sơ #VT-{Math.floor(Math.random() * 9000) + 1000} đang chờ xử lý. Đội ngũ
                                            sẽ liên hệ trong vòng 24 giờ tới.
                                        </p>
                                        <button
                                            onClick={() => setIsSuccess(false)}
                                            className="vt-btn vt-btn--ghost mt-6"
                                        >
                                            Soạn yêu cầu khác
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label htmlFor="name" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                                                    Họ và tên <span className="text-[var(--vt-emerald-deep)]">*</span>
                                                </label>
                                                <input
                                                    id="name"
                                                    placeholder="Ví dụ: Nguyễn Văn A"
                                                    {...form.register('name')}
                                                    className={inputCls}
                                                />
                                                {form.formState.errors.name && (
                                                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="phone" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                                                    Số điện thoại <span className="text-[var(--vt-emerald-deep)]">*</span>
                                                </label>
                                                <input
                                                    id="phone"
                                                    placeholder="09xx xxx xxx"
                                                    {...form.register('phone')}
                                                    className={inputCls}
                                                />
                                                {form.formState.errors.phone && (
                                                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.phone.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label htmlFor="email" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                                                    Email <span className="text-[var(--vt-emerald-deep)]">*</span>
                                                </label>
                                                <input
                                                    id="email"
                                                    type="email"
                                                    placeholder="email@domain.com"
                                                    {...form.register('email')}
                                                    className={inputCls}
                                                />
                                                {form.formState.errors.email && (
                                                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.email.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="subject" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                                                    Chủ đề <span className="text-[var(--vt-emerald-deep)]">*</span>
                                                </label>
                                                <input
                                                    id="subject"
                                                    placeholder="Tư vấn lộ trình VSTEP B2..."
                                                    {...form.register('subject')}
                                                    className={inputCls}
                                                />
                                                {form.formState.errors.subject && (
                                                    <p className="text-xs text-red-600 mt-1">{form.formState.errors.subject.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="message" className="vt-overline text-[10px] text-[var(--vt-ink-70)]">
                                                Nội dung chi tiết <span className="text-[var(--vt-emerald-deep)]">*</span>
                                            </label>
                                            <textarea
                                                id="message"
                                                rows={6}
                                                placeholder="Mô tả năng lực hiện tại, mục tiêu và mốc thời gian mong muốn..."
                                                {...form.register('message')}
                                                className="w-full px-4 py-3 rounded-xl border border-[var(--vt-line-strong)] bg-white text-[var(--vt-ink)] placeholder:text-[var(--vt-ink-40)] focus:outline-none focus:ring-4 focus:ring-[var(--vt-emerald)]/15 focus:border-[var(--vt-emerald)] transition-colors resize-y"
                                            />
                                            {form.formState.errors.message && (
                                                <p className="text-xs text-red-600 mt-1">{form.formState.errors.message.message}</p>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
                                            <p className="text-xs text-[var(--vt-ink-50)] max-w-sm">
                                                Bằng việc gửi, bạn đồng ý với{' '}
                                                <a href="/privacy" className="underline decoration-[var(--vt-ink-30)] underline-offset-2 hover:text-[var(--vt-emerald-deep)]">
                                                    chính sách bảo mật
                                                </a>{' '}
                                                của Vân Trang.
                                            </p>
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="vt-btn vt-btn--primary disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        Đang gửi...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send size={16} />
                                                        Gửi yêu cầu
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Sidebar */}
                            <aside className="lg:col-span-5 space-y-5">
                                {secondaryChannels.map(({ icon: Icon, title, body, action }) => (
                                    <div key={title} className="vt-paper-card flex items-start gap-4">
                                        <span className="h-11 w-11 flex-shrink-0 rounded-xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)] grid place-items-center">
                                            <Icon size={18} strokeWidth={1.75} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-[var(--vt-ink)] tracking-[0.02em]">{title}</h3>
                                            <p className="mt-1.5 text-sm text-[var(--vt-ink-70)] leading-relaxed">{body}</p>
                                            {action && (
                                                <a
                                                    href={action.href}
                                                    target={action.external ? '_blank' : undefined}
                                                    rel={action.external ? 'noopener noreferrer' : undefined}
                                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--vt-emerald-deep)] hover:text-[var(--vt-ink)] transition-colors"
                                                >
                                                    {action.label}
                                                    <ArrowUpRight size={13} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Ink panel — emergency CTA */}
                                <div className="vt-ink-panel !p-7">
                                    <p className="vt-eyebrow !text-[var(--vt-champagne)]">Cần gấp?</p>
                                    <h3 className="vt-display mt-3 text-2xl text-white"
                                        style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                        Gọi trực tiếp giảng viên đào tạo
                                    </h3>
                                    <p className="mt-3 text-sm text-white/70 leading-relaxed">
                                        Đường dây dành cho học viên đang theo học cần hỗ trợ khẩn — lịch thi, sự cố
                                        học liệu, hoặc thay đổi lịch lớp.
                                    </p>
                                    <a href="tel:0339244566" className="vt-btn vt-btn--accent mt-5">
                                        <Phone size={16} />
                                        033 924 4566
                                    </a>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>
            </div>
        </ModernPublicLayout>
    );
}
