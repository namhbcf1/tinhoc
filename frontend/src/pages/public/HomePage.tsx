// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  BookOpen,
  Globe,
  Building,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Star,
  Award,
  GraduationCap,
  Users,
  Quote,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import SEO from '../../components/common/SEO';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import TestimonialsSection from '../../components/sections/TestimonialsSection';
import FloatingCTA from '../../components/ui/FloatingCTA';
import ExitIntentModal from '../../components/ui/ExitIntentModal';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { YEARS_EXPERIENCE, TOTAL_STUDENTS, TEACHER_COUNT, TOTAL_COURSES } from '../../constants/site-stats';
import { buildApiUrl } from '../../utils/api-base-url.js';

const marqueeItems = [
  'VSTEP B1 · B2 · C1',
  'IELTS Academic',
  'TOEIC Listening & Reading',
  'Tiếng Anh giao tiếp',
  'Tin học văn phòng MOS',
  'Cam kết đầu ra văn bản',
  'Giảng viên chuyên trách',
  'Học bù miễn phí',
];

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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.hero-eyebrow', { y: 14, opacity: 0, duration: 0.6 })
      .from('.hero-title > span', { y: 36, opacity: 0, duration: 0.85, stagger: 0.12 }, '-=0.35')
      .from('.hero-desc', { y: 16, opacity: 0, duration: 0.7 }, '-=0.5')
      .from('.hero-buttons > *', { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.45')
      .from('.hero-meta > *', { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 }, '-=0.35')
      .from('.hero-card', { scale: 0.94, opacity: 0, duration: 0.9, stagger: 0.12 }, '-=0.7');

    if (!reduceMotion) {
      tl.add(() => {
        gsap.to('.hero-card--photo', {
          y: -42,
          x: 10,
          rotation: -5.5,
          duration: 2.7,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

        gsap.to('.hero-card--ink', {
          y: 34,
          x: -18,
          rotation: 3.2,
          duration: 3.1,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

        gsap.to('.hero-card--certs', {
          y: -32,
          x: 22,
          rotation: -2.4,
          duration: 3.5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });


        gsap.to('.hero-glow', {
          scale: 1.22,
          opacity: 1,
          duration: 2.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.4,
        });
      });
    }

    gsap.from('.stat-tile', {
      scrollTrigger: { trigger: '.stats-section', start: 'top 82%' },
      y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
    });

    gsap.from('.bento-service-card', {
      scrollTrigger: { trigger: '.services-section', start: 'top 80%' },
      y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
    });

    gsap.from('.process-step', {
      scrollTrigger: { trigger: '.process-section', start: 'top 80%' },
      y: 30, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'power3.out',
    });

    return () => { ScrollTrigger.getAll().forEach((t) => t.kill()); };
  }, { scope: container });

  return (
    <ModernPublicLayout>
      <SEO
        title="Trang chủ"
        description="Van Trang Education — Đào tạo ngoại ngữ, luyện thi chứng chỉ VSTEP, IELTS, TOEIC và tư vấn giáo dục với lộ trình thực chiến."
        url="/"
        structuredData={homepageStructuredData}
      />

      <div ref={container} className="vt-page-enter">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--vt-emerald)] focus:text-white focus:rounded-xl focus:font-bold focus:shadow-lg">
          Bỏ qua đến nội dung
        </a>

        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative pt-10 sm:pt-14 lg:pt-20 pb-12 lg:pb-24 overflow-hidden">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--vt-champagne)] to-transparent opacity-60" />
          <div aria-hidden="true" className="hero-glow vt-hero-glow absolute right-[-12%] top-12 h-[34rem] w-[34rem] rounded-full bg-[var(--vt-champagne-soft)] blur-3xl" />
          <div aria-hidden="true" className="hero-glow vt-hero-glow absolute left-[-16%] bottom-[-10%] h-[28rem] w-[28rem] rounded-full bg-[var(--vt-emerald-soft)] blur-3xl [animation-delay:-3s]" />

          <div id="main-content" className="vt-container relative z-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 xl:gap-14 items-center">
            {/* Left column */}
            <div className="max-w-3xl">
              <div className="hero-eyebrow vt-eyebrow mb-5">
                <Sparkles className="w-3.5 h-3.5" /> Hệ sinh thái đào tạo Vân Trang
              </div>

              <h1 className="hero-title vt-vietnamese-display text-[2.1rem] sm:text-[3.4rem] lg:text-[4.4rem] xl:text-[5rem]">
                <span className="block">Học chuẩn mực.</span>
                <span className="vt-title-shimmer block text-[var(--vt-emerald)] vt-vietnamese-accent">
                  Thi tự tin.
                </span>
                <span className="block text-[var(--vt-champagne-deep)]">Hồ sơ rõ ràng.</span>
              </h1>

              <p className="hero-desc mt-6 max-w-xl vt-lead">
                Vân Trang kết hợp đào tạo ngoại ngữ, tin học và quản lý hồ sơ học viên trong một trải nghiệm học thuật tinh gọn, đáng tin cậy và dễ theo dõi.
              </p>

              <div className="hero-buttons mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/login" className="vt-btn vt-btn--primary w-full sm:w-auto h-12 px-5 sm:px-7">
                  Đăng nhập học viên <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/register" className="vt-btn vt-btn--accent w-full sm:w-auto h-12 px-5 sm:px-7">
                  Đăng ký học viên <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/training" className="vt-btn vt-btn--ghost w-full sm:w-auto h-12 px-7">
                  Xem chương trình học
                </Link>
              </div>

              {/* Trust quick-stats */}
              <div className="hero-meta mt-10 grid grid-cols-3 gap-2.5 sm:gap-4 max-w-xl">
                {[
                  { label: 'Kinh nghiệm', value: `${YEARS_EXPERIENCE}+` },
                  { label: 'Học viên', value: TOTAL_STUDENTS },
                  { label: 'Chương trình', value: TOTAL_COURSES },
                ].map((item) => (
                  <div key={item.label} className="vt-stat-tile">
                    <div className="vt-stat-tile__value">{item.value}</div>
                    <div className="vt-stat-tile__label">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — editorial composition */}
            <div className="relative min-h-[320px] sm:min-h-[520px] lg:min-h-[600px] hidden sm:block">
              {/* Diploma card */}
              <div className="hero-card hero-card--photo vt-hero-tilt absolute left-0 top-2 w-[72%] vt-paper-card p-3 rotate-[-2deg] overflow-hidden" style={{ '--vt-tilt-rotate': '-2deg' }}>
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=900&auto=format&fit=crop"
                  alt="Học viên trong lớp học"
                  loading="lazy"
                  className="h-[300px] sm:h-[360px] w-full object-cover rounded-[1.45rem]"
                />
                <div className="absolute top-5 left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-[var(--vt-line)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--vt-emerald)] animate-pulse" />
                  <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[var(--vt-emerald-deep)]">Lớp đang học</span>
                </div>
              </div>

              {/* Ink panel */}
              <div className="hero-card hero-card--ink vt-hero-tilt absolute right-0 top-0 w-[54%] vt-ink-panel rounded-[2rem] p-6 shadow-[var(--vt-shadow-soft)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--vt-champagne)] font-bold">
                  Chuẩn đầu ra
                </p>
                <h2 className="vt-display mt-3 text-2xl sm:text-3xl text-white"
                    style={{ fontVariationSettings: '"opsz" 60, "SOFT" 30', fontWeight: 500 }}>
                  Lộ trình rõ từng bước
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-white/72 leading-relaxed">
                  Tư vấn mục tiêu, đăng ký, học tập, lịch thi và kết quả được gom thành một hệ thống dễ hiểu.
                </p>
                <div className="mt-4 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={12} className="fill-[var(--vt-champagne)] text-[var(--vt-champagne)]" />
                  ))}
                  <span className="ml-1.5 text-[10px] text-white/60 font-medium">4.9/5 · 1.200+ đánh giá</span>
                </div>
              </div>

              {/* Bottom certs card */}
              <div className="hero-card hero-card--certs vt-hero-tilt absolute bottom-2 right-4 w-[64%] vt-paper-card p-5">
                <div className="vt-fine-divider mb-4" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="vt-display text-lg text-[var(--vt-ink)]" style={{ fontVariationSettings: '"opsz" 36' }}>
                      VSTEP
                    </p>
                    <p className="text-xs text-[var(--vt-muted)]">Luyện thi chứng chỉ</p>
                  </div>
                  <div>
                    <p className="vt-display text-lg text-[var(--vt-ink)]" style={{ fontVariationSettings: '"opsz" 36' }}>
                      Tin học
                    </p>
                    <p className="text-xs text-[var(--vt-muted)]">Ứng dụng thực tế</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ MARQUEE — trust strip ═══════════════ */}
        <section className="relative border-y border-[var(--vt-line-soft)] bg-[var(--vt-paper)]/70 backdrop-blur-sm">
          <div className="vt-marquee">
            <div className="vt-marquee__track">
              {[...marqueeItems, ...marqueeItems].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--vt-ink)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--vt-champagne)]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ EXAM SCHEDULES ═══════════════ */}
        <ExamSchedulesSection />

        {/* ═══════════════ STATS ═══════════════ */}
        <section className="stats-section vt-section--tight relative z-10">
          <div className="vt-container">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {[
                { icon: Award, label: 'Năm kinh nghiệm', value: YEARS_EXPERIENCE },
                { icon: Users, label: 'Học viên đăng ký', value: TOTAL_STUDENTS },
                { icon: GraduationCap, label: 'Giảng viên', value: TEACHER_COUNT },
                { icon: BookOpen, label: 'Chương trình', value: TOTAL_COURSES },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="stat-tile vt-feature-card p-5 sm:p-6 text-center">
                  <span className="inline-flex h-11 w-11 rounded-full bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] items-center justify-center mb-3">
                    <Icon size={20} />
                  </span>
                  <div className="vt-display text-3xl sm:text-4xl text-[var(--vt-ink)]"
                       style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 600 }}>
                    {value}
                  </div>
                  <div className="vt-overline mt-1 text-[10.5px]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ BENTO SERVICES ═══════════════ */}
        <section className="services-section vt-section relative">
          <div className="vt-container">
            <div className="vt-section-header mb-12">
              <div className="vt-eyebrow">Chương trình trọng tâm</div>
              <h2 className="vt-display text-3xl sm:text-4xl lg:text-5xl"
                  style={{ fontVariationSettings: '"opsz" 120, "SOFT" 30', fontWeight: 500 }}>
                Mô hình đào tạo <span className="vt-display-italic text-[var(--vt-emerald)]" style={{ fontWeight: 400 }}>kép</span>
              </h2>
              <p className="vt-lead">
                Phương pháp tiếp cận toàn diện, kết hợp nền tảng giáo dục truyền thống với hệ thống theo dõi học tập hiện đại.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 auto-rows-auto sm:auto-rows-[230px] md:auto-rows-[250px]">
              {/* Large card */}
              <Link to="/training" className="bento-service-card md:col-span-2 vt-feature-card p-7 sm:p-8 flex flex-col justify-between group block">
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--vt-emerald)] group-hover:text-white transition-all duration-500">
                  <Zap size={26} />
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="vt-vietnamese-display text-2xl sm:text-3xl mb-2 text-[var(--vt-ink)]">
                    Tiếng Anh Cấp Tốc
                  </h3>
                  <p className="text-[var(--vt-muted)] text-sm sm:text-base max-w-md leading-relaxed">
                    Lộ trình bứt tốc thần tốc, tối ưu hóa điểm số thông qua phân tích dữ liệu AI.
                  </p>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute top-7 right-7 text-[var(--vt-line-strong)] group-hover:text-[var(--vt-emerald)] transition-colors w-7 h-7" />
              </Link>

              {/* Vertical Ink card */}
              <div className="bento-service-card md:row-span-2 vt-ink-panel rounded-[var(--vt-radius-xl)] p-7 sm:p-8 flex flex-col group overflow-hidden relative">
                <div aria-hidden="true" className="absolute -bottom-24 -right-24 w-80 h-80 bg-[var(--vt-champagne)]/15 blur-[80px] rounded-full" />

                <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-[var(--vt-champagne)] mb-5 group-hover:scale-110 transition-transform border border-white/15">
                  <Globe size={26} />
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="vt-display text-2xl sm:text-3xl mb-3 text-white"
                      style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 500 }}>
                    Chất Lượng <br />
                    <span className="vt-display-italic text-[var(--vt-champagne)]" style={{ fontWeight: 400 }}>
                      Quốc Tế
                    </span>
                  </h3>
                  <p className="text-white/72 text-sm mb-6 leading-relaxed">
                    Trải nghiệm môi trường đa văn hóa, học tập cùng giáo viên bản ngữ chuyên nghiệp, rèn giũa kỹ năng phản xạ 24/7.
                  </p>
                  <Link to="/training">
                    <button className="vt-btn vt-btn--accent w-full h-11">
                      Bắt đầu ngay <ArrowRight size={15} />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Standard cards */}
              <Link to="/training" className="bento-service-card vt-feature-card p-7 flex flex-col justify-between group block">
                <div className="relative z-10 w-12 h-12 rounded-2xl bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen size={22} />
                </div>
                <div className="relative z-10">
                  <h3 className="vt-display text-xl mb-1.5 text-[var(--vt-ink)]"
                      style={{ fontVariationSettings: '"opsz" 36', fontWeight: 600 }}>
                    Luyện Thi Chứng Chỉ
                  </h3>
                  <p className="text-[var(--vt-muted)] text-sm leading-relaxed">
                    Cam kết đầu ra VSTEP, TOEIC, IELTS với điểm số mơ ước.
                  </p>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute top-7 right-7 text-[var(--vt-line-strong)] group-hover:text-[var(--vt-champagne-deep)] transition-colors" />
              </Link>

              <Link to="/contact" className="bento-service-card vt-feature-card p-7 flex flex-col justify-between group block">
                <div className="relative z-10 w-12 h-12 rounded-2xl bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building size={22} />
                </div>
                <div className="relative z-10">
                  <h3 className="vt-display text-xl mb-1.5 text-[var(--vt-ink)]"
                      style={{ fontVariationSettings: '"opsz" 36', fontWeight: 600 }}>
                    VANTRANGEDU
                  </h3>
                  <p className="text-[var(--vt-muted)] text-sm leading-relaxed">
                    Thiết kế lộ trình đào tạo riêng biệt cho VANTRANGEDU.
                  </p>
                </div>
                <ArrowUpRight aria-hidden="true" className="absolute top-7 right-7 text-[var(--vt-line-strong)] group-hover:text-[var(--vt-emerald)] transition-colors" />
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════ PROCESS — 4-step journey ═══════════════ */}
        <section className="process-section vt-section--tight relative">
          <div aria-hidden="true" className="absolute inset-0 vt-grain pointer-events-none" />
          <div className="vt-container relative">
            <div className="vt-section-header mb-10">
              <div className="vt-eyebrow">Hành trình học viên</div>
              <h2 className="vt-display text-3xl sm:text-4xl"
                  style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 500 }}>
                Bốn bước để <span className="vt-display-italic text-[var(--vt-champagne-deep)]">khởi đầu</span>.
              </h2>
            </div>

            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                { n: '01', title: 'Tư vấn miễn phí', desc: 'Đánh giá trình độ và xác định mục tiêu cùng cố vấn chuyên môn.' },
                { n: '02', title: 'Chọn lộ trình', desc: 'Lựa chọn khoá học, lịch học và phương pháp phù hợp với nhu cầu.' },
                { n: '03', title: 'Học & luyện thi', desc: 'Theo dõi tiến độ qua hệ thống, học bù miễn phí khi vắng có lý do.' },
                { n: '04', title: 'Hồ sơ rõ ràng', desc: 'Nhận chứng chỉ và quản lý hồ sơ học tập trực tuyến trọn đời.' },
              ].map((step) => (
                <li key={step.n} className="process-step vt-paper-card p-6 relative overflow-hidden">
                  <span className="vt-display text-[3.5rem] leading-none text-[var(--vt-champagne)] opacity-90"
                        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60', fontWeight: 500 }}>
                    {step.n}
                  </span>
                  <h3 className="vt-display text-lg mt-2 text-[var(--vt-ink)]"
                      style={{ fontVariationSettings: '"opsz" 36', fontWeight: 600 }}>
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--vt-muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══════════════ TESTIMONIALS ═══════════════ */}
        <TestimonialsSection />

        {/* ═══════════════ CTA — editorial ink panel ═══════════════ */}
        <section className="vt-section--tight">
          <div className="vt-container">
            <div className="relative vt-ink-panel rounded-[var(--vt-radius-2xl)] overflow-hidden p-5 sm:p-12 lg:p-16">
              <div aria-hidden="true" className="absolute -top-32 -right-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/16 blur-3xl" />
              <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-[20rem] w-[20rem] rounded-full bg-[var(--vt-emerald)]/20 blur-3xl" />
              <div aria-hidden="true" className="absolute inset-0 vt-grain pointer-events-none opacity-50" />

              <div className="relative z-10 max-w-3xl">
                <Quote className="w-10 h-10 text-[var(--vt-champagne)] mb-5" />
                <h2 className="vt-display text-3xl sm:text-4xl lg:text-5xl text-white"
                    style={{ fontVariationSettings: '"opsz" 144, "SOFT" 30', fontWeight: 500 }}>
                  Khai phóng <span className="vt-display-italic text-[var(--vt-champagne)]" style={{ fontWeight: 400 }}>đỉnh cao</span> tri thức.
                </h2>
                <p className="mt-5 vt-lead text-white/72">
                  Gia nhập hệ sinh thái VanTrangEdu hôm nay để nhận tư vấn lộ trình học tập độc quyền — chuẩn mực, minh bạch, đáng tin cậy.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link to="/login" className="vt-btn vt-btn--accent w-full sm:w-auto h-12 px-5 sm:px-7">
                    Đăng nhập học viên <ArrowRight size={16} />
                  </Link>
                  <Link to="/register" className="vt-btn vt-btn--ghost w-full sm:w-auto h-12 px-5 sm:px-7 border-white/30 text-white hover:bg-white hover:text-[var(--vt-ink)] hover:border-white">
                    Đăng ký học viên
                  </Link>
                </div>
              </div>
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

function parseDateTime(dateStr) {
  const parts = (dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!parts) return { date: dateStr || '', time: '' };
  return {
    date: `${parts[3]}/${parts[2]}/${parts[1]}`,
    time: `${parts[4]}:${parts[5]}`,
  };
}

function ExamSchedulesSection() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(buildApiUrl('/exam-schedules/public-upcoming'))
      .then(res => res.json())
      .then(data => { if (!cancelled) setExams(data.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="vt-section--tight pt-10 sm:pt-12">
      <div className="vt-container">
        <div className="vt-eyebrow mb-4 text-center" style={{ color: 'var(--vt-champagne-deep)' }}>
          Lịch thi sắp tới
        </div>
        <h2 className="vt-display text-3xl sm:text-4xl mb-6 text-center"
            style={{ fontVariationSettings: '"opsz" 96, "SOFT" 30', fontWeight: 500 }}>
          Kỳ thi <span className="vt-display-italic text-[var(--vt-emerald)]">mới nhất</span>
        </h2>

        {loading ? (
          <p className="text-center text-[var(--vt-muted)]">Đang tải...</p>
        ) : exams.length === 0 ? (
          <p className="text-center text-[var(--vt-muted)]">Chưa có lịch thi nào.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((exam, i) => {
              const { date, time } = parseDateTime(exam.exam_date);
              return (
                <div key={i} className="vt-paper-card p-5 rounded-[var(--vt-radius-lg)] flex flex-col gap-3 hover:shadow-lg transition-shadow">
                  <h3 className="font-semibold text-[var(--vt-ink)] text-base leading-snug">{exam.exam_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--vt-muted)]">
                    <Calendar size={13} /><span>{date}</span>
                    <Clock size={13} className="ml-2" /><span>Giờ bắt đầu: {time || '--:--'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {exam.organizer_name && <span className="vt-badge text-[10px] px-2 py-0.5 rounded-full bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)]">{exam.organizer_name}</span>}
                    {exam.level_name && <span className="vt-badge text-[10px] px-2 py-0.5 rounded-full bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald)]">{exam.level_name}</span>}
                  </div>
                  {exam.program_name && <p className="text-xs text-[var(--vt-muted)] mt-auto pt-1 border-t border-[var(--vt-line-light)]">{exam.program_name}</p>}
                  {exam.location && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--vt-muted)]">
                      <MapPin size={12} /><span>{exam.location}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/register" className="vt-btn vt-btn--primary h-11 px-7 inline-flex items-center gap-2">
            Đăng ký dự thi <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
