import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Zap, BookOpen, Clock, Users, Globe, Building, ArrowUpRight, Sparkles } from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import SEO from '../../components/common/SEO';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import TestimonialsSection from '../../components/sections/TestimonialsSection';
import FloatingCTA from '../../components/ui/FloatingCTA';
import ExitIntentModal from '../../components/ui/ExitIntentModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { YEARS_EXPERIENCE, TOTAL_STUDENTS, TEACHER_COUNT, TOTAL_COURSES } from '../../constants/site-stats';
import QuickConsultForm from '../../components/forms/QuickConsultForm';

export default function HomePage() {
  const container = useRef();
  const homepageStructuredData = [
    {
      '@type': 'Organization',
      name: 'Van Trang Education',
      alternateName: 'VanTrangEdu',
      url: 'https://vantrangedu.com',
      logo: 'https://vantrangedu.com/logo.jpg',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+84-962-445-963',
        contactType: 'customer support',
        areaServed: 'VN',
        availableLanguage: ['vi', 'en'],
      },
    },
    {
      '@type': 'WebSite',
      name: 'VanTrangEdu',
      url: 'https://vantrangedu.com',
      inLanguage: 'vi-VN',
    },
    {
      '@type': 'EducationalOrganization',
      name: 'Van Trang Education',
      url: 'https://vantrangedu.com',
      description: 'Đơn vị đào tạo ngoại ngữ, luyện thi chứng chỉ và tư vấn giáo dục với lộ trình thực chiến, rõ ràng và dễ tiếp cận.',
    },
  ];

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Hero Animations
    tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.8 })
      .from('.hero-title', { y: 30, opacity: 0, duration: 1, stagger: 0.2 }, '-=0.6')
      .from('.hero-desc', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
      .from('.hero-buttons', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
      .from('.bento-hero-img', { scale: 0.9, opacity: 0, duration: 1, stagger: 0.1 }, '-=0.8');

    // Stats Stagger
    gsap.from('.stat-card', {
      scrollTrigger: {
        trigger: '.stats-section',
        start: 'top 80%',
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'back.out(1.2)'
    });

    // Bento Services Stagger
    gsap.from('.bento-service-card', {
      scrollTrigger: {
        trigger: '.services-section',
        start: 'top 75%',
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out'
    });

    // 3D Tilt Effect — cleaned up automatically by useGSAP's context revert on unmount
    const tiltCards = document.querySelectorAll<HTMLElement>('.bento-hero-img');
    const handleMouseMove = function(this: HTMLElement, e: Event) {
      const me = e as MouseEvent;
      const rect = this.getBoundingClientRect();
      const x = me.clientX - rect.left;
      const y = me.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 12;
      const rotateY = (centerX - x) / 12;
      gsap.to(this, { rotateX, rotateY, duration: 0.5, ease: 'power2.out' });
    };
    const handleMouseLeave = function(this: HTMLElement) {
      gsap.to(this, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power2.out' });
    };
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    });
    return () => {
      tiltCards.forEach(card => {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      });
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, { scope: container });

  return (
    <ModernPublicLayout>
      <SEO
        title="Trang chủ"
        description="Van Trang Education - Đơn vị đào tạo ngoại ngữ cấp tốc và tư vấn giáo dục."
        url="/"
        structuredData={homepageStructuredData}
      />

      <div ref={container}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-xl focus:font-bold focus:shadow-lg">
          Bỏ qua đến nội dung
        </a>
        {/* HERO SECTION - Bento Style Base */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Animated Background Orbs */}
          <div aria-hidden="true" className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-blob pointer-events-none" />
          <div aria-hidden="true" className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000 pointer-events-none" />

          {/* Subtle Spotlight Background */}
          <div aria-hidden="true" className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.8) 0%, rgba(255,255,255,0) 70%)' }} />

          <div id="main-content" className="container relative z-10 px-4 mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100/50 text-emerald-700 font-medium text-sm mb-6 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span>Tiên phong đào tạo ngôn ngữ 2026</span>
              </div>
              <h1 className="hero-title mb-4 text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Trung Tâm Đào Tạo<br />
                <span className="heading-gradient">Ngoại Ngữ & Tin Học</span>
              </h1>
              <p className="hero-desc mb-3 text-base text-slate-500 font-semibold tracking-wide">
                Luyện thi VSTEP • Tiếng Anh giao tiếp • Tin học văn phòng
              </p>
              <p className="mb-10 text-lg sm:text-xl text-slate-600 leading-relaxed font-light">
                Hệ thống giáo dục <strong>VanTrangEdu</strong> kết hợp phương pháp luận quốc tế và công nghệ hiện đại. Lộ trình cá nhân hóa hoàn toàn mới, tối đa hóa tiềm năng ngôn ngữ của bạn.
              </p>
              <div className="hero-buttons flex flex-col sm:flex-row gap-4">
                <Link to="/training">
                  <Button size="lg" className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 text-base h-12 px-8 rounded-xl transition-all hover:scale-105 active:scale-95">
                    Khám phá khóa học <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/50 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-slate-50 text-base h-12 px-8 rounded-xl transition-all">
                    Đăng ký tuyển sinh
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Content - Hero Bento Grid */}
            <div className="grid grid-cols-2 gap-4 h-[500px]">
              <div className="bento-hero-img glass-card rounded-3xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-emerald-500/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop" alt="Students learning" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="grid grid-rows-2 gap-4">
                <div className="bento-hero-img glass-card rounded-3xl p-6 flex flex-col justify-between bg-gradient-to-br from-emerald-50 to-white">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl mb-1">Chuẩn Quốc Tế</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">Lộ trình học chuẩn VSTEP & IELTS.</p>
                  </div>
                </div>
                <div className="bento-hero-img glass-card rounded-3xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
                  <img src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=800&auto=format&fit=crop" alt="Modern campus" loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK CONSULT SECTION — after hero, captures leads before scrolling */}
        <section className="relative z-20 -mt-6 pb-6">
          <div className="container px-4 mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: value proposition copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium mb-4">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Tư vấn miễn phí · Phản hồi trong 24h
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-3 leading-tight">
                  Không biết bắt đầu từ đâu?
                </h2>
                <p className="text-slate-600 mb-5 leading-relaxed">
                  Để lại số điện thoại — chuyên viên VanTrangEdu sẽ gọi lại tư vấn lộ trình học phù hợp <strong>hoàn toàn miễn phí</strong>, không áp lực.
                </p>
                <ul className="space-y-2">
                  {[
                    'Phân tích trình độ & mục tiêu cụ thể',
                    'Tư vấn khóa VSTEP, Tiếng Anh, Tin học',
                    'Báo giá & lịch học chi tiết ngay',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 text-xs font-bold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Right: the form */}
              <div>
                <QuickConsultForm />
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION - Floating Glass Cards */}
        <section className="stats-section py-12 relative z-20">
          <div className="container px-4 mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Năm kinh nghiệm', value: YEARS_EXPERIENCE, accent: 'text-emerald-500' },
                { label: 'Học viên đã đăng ký', value: TOTAL_STUDENTS, accent: 'text-blue-500' },
                { label: 'Giảng viên', value: TEACHER_COUNT, accent: 'text-purple-500' },
                { label: 'Chương trình', value: TOTAL_COURSES, accent: 'text-orange-500' }
              ].map((stat, i) => (
                <div key={i} className="stat-card glass-panel rounded-2xl p-6 text-center group hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1">
                  <div className={`text-4xl lg:text-5xl font-extrabold mb-2 ${stat.accent} tracking-tight`}>{stat.value}</div>
                  <div className="text-slate-500 font-medium text-sm uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENTO SERVICES SECTION */}
        <section className="services-section py-24 relative">
          <div className="container px-4 mx-auto">
            <div className="max-w-3xl mb-16">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Mô Hình Đào Tạo Kép</h2>
              <p className="text-xl text-slate-600 font-light">
                Phương pháp tiếp cận toàn diện, kết hợp công nghệ AI và nền tảng giáo dục truyền thống, mang đến hiệu suất tối đa.
              </p>
            </div>

            {/* Neo-Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">

              {/* Large Card */}
              <Link to="/training" className="bento-service-card md:col-span-2 glass-card rounded-[2rem] p-8 flex flex-col justify-between group overflow-hidden relative border border-slate-200/60 block">
                <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-400/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 transition-transform duration-500 group-hover:scale-150" />
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                  <Zap size={32} />
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="text-3xl font-bold mb-3 text-slate-900 group-hover:text-emerald-700 transition-colors">Tiếng Anh Cấp Tốc</h3>
                  <p className="text-slate-600 text-lg max-w-md">Lộ trình bứt tốc thần tốc, tối ưu hóa điểm số thông qua phân tích dữ liệu AI.</p>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute top-8 right-8 text-slate-300 group-hover:text-emerald-500 transition-colors w-8 h-8" />
              </Link>

              {/* Vertical Card */}
              <div className="bento-service-card md:row-span-2 glass-card rounded-[2rem] p-8 flex flex-col group overflow-hidden relative bg-slate-900 text-white">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 z-0" />
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/20 blur-[80px] rounded-full z-0" />

                <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform border border-white/10">
                  <Globe size={32} />
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="text-3xl font-bold mb-4 text-white">Chất Lượng <br />Quốc Tế</h3>
                  <p className="text-slate-300 text-base mb-8">Trải nghiệm môi trường đa văn hóa, học tập cùng giáo viên bản ngữ chuyên nghiệp, rèn giũa kỹ năng phản xạ 24/7.</p>
                  <Link to="/training">
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white hover:text-slate-900 rounded-full h-12">
                      Bắt đầu ngay
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Standard Cards */}
              <Link to="/training" className="bento-service-card glass-card rounded-[2rem] p-8 flex flex-col justify-between group overflow-hidden relative border border-slate-200/60 block">
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen size={28} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2 text-slate-900">Luyện Thi Chứng Chỉ</h3>
                  <p className="text-slate-600 text-sm">Cam kết đầu ra TOEIC, IELTS, TOEFL với điểm số mơ ước.</p>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute top-8 right-8 text-slate-300 group-hover:text-purple-500 transition-colors" />
              </Link>

              <Link to="/contact" className="bento-service-card glass-card rounded-[2rem] p-8 flex flex-col justify-between group overflow-hidden relative border border-slate-200/60 block">
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                  <Building size={28} />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2 text-slate-900">Doanh Nghiệp</h3>
                  <p className="text-slate-600 text-sm">Thiết kế lộ trình đào tạo riêng biệt cho tổ chức, công ty.</p>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute top-8 right-8 text-slate-300 group-hover:text-orange-500 transition-colors" />
              </Link>

            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <TestimonialsSection />

        {/* CTA 2026 Style */}
        <section className="py-24 relative overflow-hidden m-4 sm:m-8 lg:m-12 rounded-[3rem] bg-slate-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2000&auto=format&fit=crop')] opacity-20 bg-cover bg-center mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />

          <div className="container px-4 mx-auto relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold mb-6 text-white tracking-tight">Khai Phóng Đỉnh Cao Tri Thức.</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light">
              Gia nhập hệ sinh thái VanTrangEdu ngay hôm nay để nhận tư vấn lộ trình học tập độc quyền chuẩn 2026.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:0962445963">
                <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white w-full sm:w-auto font-bold shadow-lg shadow-emerald-500/20 rounded-xl h-14 px-8 text-lg">
                  Hotline: 096.244.5963
                </Button>
              </a>
              <Link to="/register">
                <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-slate-900 w-full sm:w-auto font-bold rounded-xl h-14 px-8 text-lg transition-colors">
                  Phân Tích Năng Lực
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* Utilities */}
      <FloatingCTA />
      <ExitIntentModal />
      <ScrollToTopButton />
    </ModernPublicLayout>
  );
}






