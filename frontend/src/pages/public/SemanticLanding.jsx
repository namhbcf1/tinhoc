import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Star, Globe, BookOpen, Users, HelpCircle } from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import SEO from '../../components/common/SEO';

export default function SemanticLanding({
    title,
    description,
    keyword,
    content,
    lang = 'vi',
    faqs = []
}) {
    const faqSchema = faqs.length > 0 ? {
        "@type": "FAQPage",
        "mainEntity": faqs.map(f => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f.answer
            }
        }))
    } : null;

    const breadcrumbSchema = {
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "https://vantrangedu.com" },
            { "@type": "ListItem", "position": 2, "name": title, "item": typeof window !== 'undefined' ? window.location.href.split('?')[0] : '' }
        ]
    };

    const serviceSchema = {
        "@type": "Service",
        "name": title,
        "provider": { "@type": "Organization", "name": "Van Trang Education" },
        "areaServed": { "@type": "Country", "name": "Vietnam" },
        "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": title,
            "itemListElement": [
                { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Tư vấn & Đào tạo" } }
            ]
        }
        // aggregateRating removed — hardcoded ratings violate Google Webmaster Guidelines
    };

    const combinedSchema = faqSchema
        ? [faqSchema, breadcrumbSchema, serviceSchema]
        : [breadcrumbSchema, serviceSchema];

    const container = useRef();

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo('.hero-anim',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 }
        );

        gsap.fromTo('.service-card',
            { y: 40, opacity: 0 },
            {
                y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'back.out(1.2)',
                scrollTrigger: {
                    trigger: '.services-section',
                    start: 'top 80%'
                }
            }
        );

        if (faqs.length > 0) {
            gsap.fromTo('.faq-item',
                { x: -30, opacity: 0 },
                {
                    x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out',
                    scrollTrigger: {
                        trigger: '.faq-section',
                        start: 'top 85%'
                    }
                }
            );
        }
    }, { scope: container, dependencies: [faqs, lang] });

    return (
        <ModernPublicLayout>
            <SEO
                title={title}
                description={description}
                url={typeof window !== 'undefined' ? window.location.pathname : ''}
                structuredData={combinedSchema}
            />

            <div ref={container} className="bg-slate-50 min-h-screen relative overflow-hidden">
                {/* Abstract Backgrounds */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-[120px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[100px] opacity-50 pointer-events-none -translate-x-1/3"></div>

                <section className="relative pt-32 pb-24 overflow-hidden z-10">
                    <div className="container px-4 mx-auto relative z-10">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="hero-anim">
                                <Badge className="mb-8 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-6 py-2 text-sm font-black uppercase tracking-widest shadow-sm border border-emerald-200/60 rounded-full">
                                    ★ {lang === 'vi' ? 'Tiêu Chuẩn Đào Tạo Thế Hệ Mới' : 'Premium Education Standard'}
                                </Badge>
                            </div>
                            <h1 className="hero-anim text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 leading-[1.1] tracking-tight">
                                {title}
                            </h1>
                            <p className="hero-anim text-xl md:text-2xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto font-light">
                                {content}
                            </p>

                            <div className="hero-anim flex items-center justify-center gap-3 mb-12 text-slate-500 text-sm font-semibold tracking-wide bg-white/60 backdrop-blur-md px-6 py-3 rounded-full w-fit mx-auto shadow-sm border border-slate-100">
                                <div className="flex text-amber-400">
                                    <Star fill="currentColor" size={18} />
                                    <Star fill="currentColor" size={18} />
                                    <Star fill="currentColor" size={18} />
                                    <Star fill="currentColor" size={18} />
                                    <Star fill="currentColor" size={18} />
                                </div>
                                <span className="text-slate-800">4.9/5 <span className="text-slate-400 font-normal">(1,250+ Đánh giá xác thực)</span></span>
                            </div>

                            <div className="hero-anim flex flex-col sm:flex-row gap-5 justify-center">
                                <Link to="/contact">
                                    <Button size="lg" className="h-16 bg-slate-900 hover:bg-emerald-700 text-white font-bold px-10 text-lg rounded-2xl shadow-xl shadow-slate-900/10 hover:shadow-2xl transition-all hover:-translate-y-1 w-full sm:w-auto">
                                        {lang === 'vi' ? 'KHỞI TẠO LỘ TRÌNH' : 'START YOUR JOURNEY'} <ArrowRight className="ml-3 h-5 w-5" />
                                    </Button>
                                </Link>
                                <Link to="/news">
                                    <Button size="lg" variant="outline" className="h-16 bg-white/80 backdrop-blur-md text-slate-700 hover:text-emerald-700 font-bold px-10 text-lg rounded-2xl border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 shadow-sm transition-all w-full sm:w-auto">
                                        {lang === 'vi' ? 'Khám Phá Cẩm Nang' : 'Explore Guide'}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="services-section py-24 relative z-20">
                    <div className="container px-4 mx-auto max-w-6xl">
                        <div className="text-center mb-16">
                            <span className="text-emerald-600 font-black tracking-widest uppercase text-sm mb-3 block">Bento Grid System</span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{lang === 'vi' ? 'Hệ Sinh Thái Đào Tạo' : 'Education Ecosystem'}</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <Link to={lang === 'vi' ? "/ho-tro-tieng-anh" : "/english-support"} className="block group h-full">
                                <Card className="service-card glass-panel h-full hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 rounded-[2.5rem] overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <CardContent className="p-10 relative z-10">
                                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <Globe size={32} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-4 group-hover:text-blue-700 transition-colors text-slate-900 tracking-tight">
                                            {lang === 'vi' ? 'Ngữ Pháp Tổng Hợp' : 'English Support'}
                                        </h3>
                                        <p className="text-slate-600 font-light leading-relaxed">
                                            {lang === 'vi'
                                                ? 'Giải pháp toàn diện tái thiết nền tảng ngoại ngữ từ con số 0. Cam kết chuẩn đầu ra.'
                                                : 'Comprehensive solutions for beginners and exam preparation.'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link to="/training" className="block group h-full">
                                <Card className="service-card glass-panel h-full hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 rounded-[2.5rem] overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <CardContent className="p-10 relative z-10">
                                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <BookOpen size={32} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-4 group-hover:text-emerald-700 transition-colors text-slate-900 tracking-tight">
                                            {lang === 'vi' ? 'Luyện Thi Chuyên Sâu' : 'Intensive Courses'}
                                        </h3>
                                        <p className="text-slate-600 font-light leading-relaxed">
                                            {lang === 'vi'
                                                ? 'Lộ trình cá nhân hóa VSTEP, IELTS, Tiếng Anh B1/B2 với đội ngũ chuyên gia hàng đầu.'
                                                : 'VSTEP, IELTS, TOEIC preparation with personalized 1-1 roadmap.'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link to={lang === 'vi' ? "/day-ngon-ngu" : "/language-center"} className="block group h-full">
                                <Card className="service-card glass-panel h-full hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 rounded-[2.5rem] overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <CardContent className="p-10 relative z-10">
                                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <Users size={32} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-700 transition-colors text-slate-900 tracking-tight">
                                            {lang === 'vi' ? 'Giao Lưu Cộng Đồng' : 'Community & Events'}
                                        </h3>
                                        <p className="text-slate-600 font-light leading-relaxed">
                                            {lang === 'vi'
                                                ? 'Mở rộng mạng lưới với các buổi hội thảo chuyên đề ngôn ngữ và talkshow miễn phí.'
                                                : 'Connect with language experts and join free workshops.'}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>
                </section>

                {faqs.length > 0 && (
                    <section className="faq-section relative py-24 z-20">
                        <div className="container px-4 mx-auto max-w-4xl">
                            <div className="text-center mb-16">
                                <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                                    {lang === 'vi' ? 'Trung Tâm Khảo Thí KQ' : 'Frequently Asked Questions'}
                                </h2>
                                <p className="text-lg text-slate-600 font-light">Những thông tin giải đáp mới nhất cho học viên.</p>
                            </div>
                            <div className="space-y-6">
                                {faqs.map((f, i) => (
                                    <Card key={i} className="faq-item glass-panel border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white/90 rounded-3xl overflow-hidden group">
                                        <CardContent className="p-8 md:p-10">
                                            <div className="flex items-start gap-6">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                                    <HelpCircle size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-xl text-slate-900 mb-4 leading-snug">
                                                        {f.question}
                                                    </h3>
                                                    <div className="text-slate-600 leading-relaxed font-light whitespace-pre-line text-lg">
                                                        {f.answer}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </ModernPublicLayout>
    );
}






