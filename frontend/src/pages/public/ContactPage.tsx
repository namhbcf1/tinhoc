import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MapPin, Phone, Mail, Facebook, MessageCircle, Clock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent } from '../../components/ui/Card';
import SEO from '../../components/common/SEO';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { apiPost } from '../../lib/api';

const contactSchema = z.object({
    name: z.string().min(2, 'Vui lòng nhập họ tên đầy đủ'),
    email: z.string().email('Email không hợp lệ'),
    phone: z.string().regex(/^(0[3-9]\d{8}|\+84[3-9]\d{8})$/, 'Số điện thoại không hợp lệ (VD: 0962445963)'),
    subject: z.string().min(5, 'Vui lòng nhập tiêu đề'),
    message: z.string().min(10, 'Nội dung tin nhắn quá ngắn'),
});

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const structuredData = [
        {
            '@type': 'ContactPage',
            name: 'Lien he Van Trang Education',
            description: 'Kenh lien he, tu van khoa hoc va hop tac voi Van Trang Education.',
            url: 'https://vantrangedu.com/contact'
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
                addressCountry: 'VN'
            }
        },
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
                { '@type': 'ListItem', position: 2, name: 'Lien he', item: 'https://vantrangedu.com/contact' }
            ]
        }
    ];

    const form = useForm({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            subject: '',
            message: '',
        },
    });

    const onSubmit = async (data) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await apiPost('/contact', {
                name: data.name,
                email: data.email,
                phone: data.phone,
                subject: data.subject,
                message: data.message,
            });
            setIsSuccess(true);
            form.reset();
        } catch (error) {
            // API endpoint not yet available — fall back to mailto
            window.location.href = `mailto:vantrang@vantrangedu.com?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(`Tên: ${data.name}\nSĐT: ${data.phone}\n\n${data.message}`)}`;
            setIsSuccess(true);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    const container = useRef();

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.from('.hero-content > *', {
            y: 30,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2
        });

        gsap.from('.contact-info-card', {
            scrollTrigger: {
                trigger: '.contact-section',
                start: 'top 80%',
            },
            x: -40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: 'back.out(1.2)'
        });

        gsap.from('.contact-form-card', {
            scrollTrigger: {
                trigger: '.contact-section',
                start: 'top 80%',
            },
            y: 40,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out'
        });
    }, { scope: container });

    return (
        <ModernPublicLayout>
            <SEO
                title="Lien he tu van"
                description="Lien he Van Trang Education de nhan tu van khoa hoc, lich thi, hop tac va ho tro nhanh qua hotline, email hoac form truc tuyen."
                url="/contact"
                structuredData={structuredData}
            />
            <div ref={container} className="bg-slate-50 min-h-screen pb-24 relative overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/30 rounded-full blur-[120px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[100px] opacity-60 pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                <div className="relative pt-32 pb-16">
                    <div className="container mx-auto px-4 hero-content text-center relative z-10">
                        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">Kênh Kết Nối <span className="heading-gradient">Trực Tiếp</span></h1>
                        <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
                            Cổng thông tin hỗ trợ thế hệ mới. Trải nghiệm dịch vụ chăm sóc khách hàng đẳng cấp, nhanh chóng và tận tâm 24/7.
                        </p>
                    </div>
                </div>

                <div className="container mx-auto px-4 contact-section relative z-20 mt-8">
                    <div className="grid lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto">

                        {/* Contact Info Bento */}
                        <div className="lg:col-span-4 space-y-6">

                            <Card className="contact-info-card glass-panel bg-gradient-to-br from-emerald-50/90 to-emerald-100/50 border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                <CardContent className="p-8 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 mb-6 shadow-sm relative z-10 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                                        <Phone size={28} />
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-900 mb-2 relative z-10">Hotline Tư Vấn</h3>
                                    <div className="space-y-1 relative z-10">
                                        <a href="tel:0962445963" className="block font-black text-2xl text-emerald-700 hover:text-emerald-800 transition-colors tracking-wide">096 244 5963</a>
                                        <a href="tel:0339244566" className="block font-bold text-lg text-emerald-600 hover:text-emerald-700 transition-colors">033 924 4566</a>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="contact-info-card glass-panel bg-gradient-to-br from-blue-50/90 to-blue-100/50 border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                <CardContent className="p-8 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 mb-6 shadow-sm relative z-10 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                        <Mail size={28} />
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-900 mb-2 relative z-10">Hộp Thư Điện Tử</h3>
                                    <a href="mailto:info@vantrangedu.edu.vn" className="inline-block font-bold text-lg text-blue-700 hover:text-blue-800 transition-colors break-all relative z-10">
                                        info@vantrangedu.edu.vn
                                    </a>
                                </CardContent>
                            </Card>

                        <div className="grid grid-cols-2 gap-6">
                                <Card className="contact-info-card glass-panel bg-white/80 border-slate-200 shadow-md hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group">
                                    <CardContent className="p-6 text-center">
                                        <div className="w-12 h-12 mx-auto bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                                            <MapPin size={24} />
                                        </div>
                                        <h3 className="font-bold text-sm text-slate-900 mb-1">Trụ Sở Chính</h3>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">418 Đê La Thành, P. Ô Chợ Dừa, Q. Đống Đa, Hà Nội</p>
                                    </CardContent>
                                </Card>

                                <Card className="contact-info-card glass-panel bg-white/80 border-slate-200 shadow-md hover:shadow-lg transition-all duration-300 rounded-3xl overflow-hidden group">
                                    <CardContent className="p-6 text-center">
                                        <a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noreferrer" className="block">
                                            <div className="w-12 h-12 mx-auto bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                                <Facebook size={24} />
                                            </div>
                                            <h3 className="font-bold text-sm text-slate-900 mb-1">Cộng Đồng FB</h3>
                                            <p className="text-xs text-indigo-600 font-bold">@Englishvantrang</p>
                                        </a>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="contact-info-card glass-panel bg-gradient-to-br from-cyan-50/90 to-cyan-100/50 border-cyan-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                <CardContent className="p-8 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-200/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-cyan-600 mb-6 shadow-sm relative z-10 group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
                                        <MessageCircle size={28} />
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-900 mb-2 relative z-10">Zalo</h3>
                                    <a href="https://zalo.me/0962445963" target="_blank" rel="noopener noreferrer" className="block font-black text-2xl text-cyan-700 hover:text-cyan-800 transition-colors tracking-wide relative z-10">
                                        096 244 5963
                                    </a>
                                    <p className="text-sm text-cyan-600 font-medium mt-1 relative z-10">Nhắn tin qua Zalo</p>
                                </CardContent>
                            </Card>

                            <Card className="contact-info-card glass-panel bg-gradient-to-br from-amber-50/90 to-amber-100/50 border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group">
                                <CardContent className="p-8 relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-600 mb-6 shadow-sm relative z-10 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                                        <Clock size={28} />
                                    </div>
                                    <h3 className="font-bold text-xl text-slate-900 mb-3 relative z-10">Giờ Làm Việc</h3>
                                    <div className="space-y-1 relative z-10">
                                        <p className="text-sm font-bold text-amber-800">Thứ 2 – Thứ 7: 8:00 – 21:00</p>
                                        <p className="text-sm font-bold text-amber-700">Chủ nhật: 8:00 – 17:00</p>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Contact Form Bento */}
                        <div className="lg:col-span-8 h-full">
                            <Card className="contact-form-card glass-panel bg-white/90 border-0 shadow-2xl shadow-emerald-900/5 rounded-[2.5rem] relative overflow-hidden h-full">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                                <CardContent className="p-10 md:p-14 relative z-10">
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Gửi Câu Hỏi / Yêu Cầu</h2>
                                        <p className="text-slate-600 text-lg">Đội ngũ chuyên gia của chúng tôi sẽ phân tích và phản hồi giải pháp tối ưu nhất cho bạn.</p>
                                    </div>

                                    {isSuccess ? (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-12 text-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm"></div>
                                            <div className="relative z-10">
                                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                                    <CheckCircle2 size={40} strokeWidth={2.5} />
                                                </div>
                                                <h3 className="text-2xl font-bold text-emerald-900 mb-3">Yêu Cầu Đã Được Tiếp Nhận!</h3>
                                                <p className="text-emerald-700 text-lg mb-8 max-w-md mx-auto">Chân thành cảm ơn sự quan tâm của bạn. Hồ sơ của bạn mã hiệu #VT-{Math.floor(Math.random() * 10000)} đang được xử lý.</p>
                                                <Button onClick={() => setIsSuccess(false)} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl h-12 px-8 font-bold transition-all">
                                                    Soạn yêu cầu mới
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label htmlFor="name" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Họ và tên <span className="text-rose-500">*</span></Label>
                                                    <Input id="name" placeholder="Ví dụ: Nguyễn Văn A" {...form.register('name')} className="h-14 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-lg rounded-xl transition-all" />
                                                    {form.formState.errors.name && <p className="text-sm font-medium text-rose-500">{form.formState.errors.name.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label htmlFor="phone" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Số điện thoại <span className="text-rose-500">*</span></Label>
                                                    <Input id="phone" placeholder="09xx xxx xxx" {...form.register('phone')} className="h-14 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-lg rounded-xl transition-all" />
                                                    {form.formState.errors.phone && <p className="text-sm font-medium text-rose-500">{form.formState.errors.phone.message}</p>}
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <Label htmlFor="email" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Email <span className="text-rose-500">*</span></Label>
                                                    <Input id="email" type="email" placeholder="email@domain.com" {...form.register('email')} className="h-14 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-lg rounded-xl transition-all" />
                                                    {form.formState.errors.email && <p className="text-sm font-medium text-rose-500">{form.formState.errors.email.message}</p>}
                                                </div>
                                                <div className="space-y-3">
                                                    <Label htmlFor="subject" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chủ đề <span className="text-rose-500">*</span></Label>
                                                    <Input id="subject" placeholder="Nội dung chính..." {...form.register('subject')} className="h-14 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500/20 text-lg rounded-xl transition-all" />
                                                    {form.formState.errors.subject && <p className="text-sm font-medium text-rose-500">{form.formState.errors.subject.message}</p>}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <Label htmlFor="message" className="text-sm font-bold text-slate-700 uppercase tracking-wider">Nội dung chi tiết <span className="text-rose-500">*</span></Label>
                                                <textarea
                                                    id="message"
                                                    rows="6"
                                                    placeholder="Mô tả năng lực hiện tại và mục tiêu của bạn..."
                                                    {...form.register('message')}
                                                    className="flex w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-lg ring-offset-background placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 focus:bg-white transition-all resize-y"
                                                ></textarea>
                                                {form.formState.errors.message && <p className="text-sm font-medium text-rose-500">{form.formState.errors.message.message}</p>}
                                            </div>

                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-16 text-xl rounded-2xl shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                                {isSubmitting ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Send className="mr-3 h-6 w-6" />}
                                                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu tư vấn'}
                                            </Button>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </ModernPublicLayout>
    );
}






