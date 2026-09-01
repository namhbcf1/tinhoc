// @ts-nocheck
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Breadcrumb from '../../components/ui/Breadcrumb';
import SEO from '../../components/common/SEO';
import {
  Phone, Mail, CheckCircle, Globe, Zap, Gift, BookOpen, UserCheck,
  Award, MessageCircle, ArrowRight, Calendar, Clock, Tag, Users, Star
} from 'lucide-react';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';

/* ── Dữ liệu tuyển sinh ─────────────────────────────────────────────────── */

/* 4 bước quy trình — có thời gian cụ thể cho từng bước */
const admissionSteps = [
  {
    num: '01',
    title: 'Tư vấn miễn phí',
    detail: 'Trong vòng 24 giờ',
    desc: 'Gọi hotline, nhắn Zalo hoặc điền form bên dưới. Tư vấn viên liên hệ lại trong vòng 24 giờ làm việc để tư vấn 1:1.',
    color: 'from-emerald-400 to-emerald-600 shadow-emerald-200'
  },
  {
    num: '02',
    title: 'Đăng ký & Xếp lớp',
    detail: '1–2 ngày làm việc',
    desc: 'Điền phiếu đăng ký, hoàn tất học phí. Test đầu vào (miễn phí) và xếp lớp phù hợp trình độ trong 1–2 ngày.',
    color: 'from-blue-400 to-blue-600 shadow-blue-200'
  },
  {
    num: '03',
    title: 'Nhận tài liệu & Cổng học',
    detail: 'Trước ngày khai giảng',
    desc: 'Nhận bộ học liệu, tài khoản E-learning và lịch học chi tiết trước ngày khai giảng. Có thể học thử 1 buổi miễn phí.',
    color: 'from-purple-400 to-purple-600 shadow-purple-200'
  },
  {
    num: '04',
    title: 'Khai giảng & Bắt đầu',
    detail: 'Theo lịch đã xác nhận',
    desc: 'Tham dự buổi khai giảng, làm quen giảng viên và bạn học. Hành trình chinh phục ngôn ngữ chính thức bắt đầu!',
    color: 'from-rose-400 to-rose-600 shadow-rose-200'
  },
];

/* Lịch khai giảng sắp tới */
const upcomingClasses = [
  { course: 'Tin Học Văn Phòng (MOS)',  date: '10/03/2026', spots: 12, mode: 'Offline' },
  { course: 'Tiếng Anh Giao Tiếp A1',  date: '10/03/2026', spots: 8,  mode: 'Online'  },
  { course: 'Luyện Thi TOEIC 450+',    date: '15/03/2026', spots: 15, mode: 'Offline' },
  { course: 'VSTEP B1',                date: '20/03/2026', spots: 10, mode: 'Offline' },
  { course: 'VSTEP B2',                date: '25/03/2026', spots: 6,  mode: 'Offline' },
  { course: 'Tiếng Nhật N4',           date: '01/04/2026', spots: 14, mode: 'Online'  },
];

/* Chính sách học phí */
const tuitionPolicies = [
  {
    icon: <Tag size={24} className="text-emerald-600" />,
    bg: 'bg-emerald-100',
    title: 'Đăng ký sớm',
    desc: 'Giảm 10% học phí khi đăng ký trước khai giảng ít nhất 7 ngày.'
  },
  {
    icon: <Users size={24} className="text-blue-600" />,
    bg: 'bg-blue-100',
    title: 'Đăng ký nhóm',
    desc: 'Giảm 15% khi đăng ký nhóm 2 người trở lên cùng khóa học.'
  },
  {
    icon: <Gift size={24} className="text-purple-600" />,
    bg: 'bg-purple-100',
    title: 'Học bổng tài năng',
    desc: 'Miễn 100% học phí cho học sinh/sinh viên xuất sắc đạt điều kiện xét duyệt.'
  },
  {
    icon: <Star size={24} className="text-amber-600" />,
    bg: 'bg-amber-100',
    title: 'Thanh toán trả góp',
    desc: 'Hỗ trợ chia học phí 2–3 lần trong suốt khóa, không lãi suất.'
  },
];

export default function AdmissionsPage() {
  const container = useRef();

  const breadcrumbItems = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Đăng ký tuyển sinh', path: '/admissions' }
  ];

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-title', { y: 30, opacity: 0, duration: 1 })
      .from('.hero-desc', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6');

    gsap.from('.step-card', {
      scrollTrigger: { trigger: '.steps-section', start: 'top 80%' },
      y: 40, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.2)'
    });

    gsap.from('.program-tag', {
      scrollTrigger: { trigger: '.programs-section', start: 'top 85%' },
      scale: 0.9, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out'
    });

    gsap.from('.benefit-card', {
      scrollTrigger: { trigger: '.benefits-section', start: 'top 80%' },
      y: 30, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out'
    });
  }, { scope: container });

  return (
    <ModernPublicLayout>
      <SEO
        title="Đăng ký tuyển sinh — Quy trình 4 bước"
        description="Đăng ký khóa học tại VanTrangEdu: Tiếng Anh, VSTEP, TOEIC, IELTS, Tin học Văn phòng. Quy trình 4 bước đơn giản, hỗ trợ trả góp, giảm giá nhóm. Tư vấn miễn phí 096 244 9563."
        url="/admissions"
      />
      <div ref={container} className="relative overflow-hidden">

        {/* Breadcrumb navigation */}
        <div className="container mx-auto px-4 pt-28 pb-0 relative z-20">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* ── Hero Section ── */}
        <div className="relative pt-10 pb-20">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[100px] opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[80px] opacity-60 translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="hero-title text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Kế hoạch <span className="heading-gradient">Tuyển Sinh</span>
            </h1>
            <p className="hero-desc text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
              Quy trình đăng ký đơn giản 4 bước — từ khi liên hệ đến ngày khai giảng chỉ trong <strong>3–5 ngày làm việc</strong>.
              Tư vấn miễn phí, học thử 1 buổi không ràng buộc.
            </p>
          </div>
        </div>

        {/* ── Quy trình 4 bước (Steps Section) ── */}
        <section className="steps-section py-20 container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Quy Trình Tuyển Sinh 4 Bước</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">Từ khi liên hệ đến ngày học đầu tiên — chúng tôi đồng hành mỗi bước.</p>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-emerald-200 via-blue-200 to-rose-200 z-0" />

            {admissionSteps.map((step, idx) => (
              <div key={idx} className="step-card glass-card p-8 rounded-3xl text-center group relative z-10">
                <div className={`w-14 h-14 bg-gradient-to-br ${step.color} text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  {step.num}
                </div>
                <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1 rounded-full mb-3">
                  <Clock size={11} /> {step.detail}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <a href="tel:0962449563">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 h-12 rounded-2xl">
                <Phone size={16} className="mr-2" /> Bắt đầu Bước 1 — Gọi tư vấn miễn phí
              </Button>
            </a>
          </div>
        </section>

        {/* ── Lịch khai giảng sắp tới ── */}
        <section className="py-16 bg-slate-50 border-y border-slate-100 relative z-10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Lịch Khai Giảng Sắp Tới</h2>
              <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {upcomingClasses.map((cls, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-slate-800 text-base leading-tight">{cls.course}</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar size={14} className="text-emerald-500 shrink-0" />
                    <span>Khai giảng: <strong className="text-slate-700">{cls.date}</strong></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${cls.mode === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cls.mode}
                    </span>
                    <span className="text-xs text-slate-500">
                      Còn <strong className={cls.spots <= 6 ? 'text-rose-600' : 'text-emerald-600'}>{cls.spots}</strong> chỗ
                    </span>
                  </div>
                  <a href="tel:0962449563" className="text-center text-xs font-bold text-emerald-600 hover:text-emerald-500 border border-emerald-200 hover:border-emerald-400 rounded-xl py-2 transition-colors">
                    Đăng ký ngay →
                  </a>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-slate-400 mt-5">
              Lịch khai giảng có thể thay đổi. Gọi <strong>096 244 9563</strong> để xác nhận slot còn trống.
            </p>
          </div>
        </section>

        {/* ── Chính sách học phí ── */}
        <section className="py-20 container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Chính Sách Học Phí</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">Học phí minh bạch, nhiều ưu đãi — VanTrangEdu cam kết tạo điều kiện tốt nhất cho mọi học viên.</p>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {tuitionPolicies.map((policy, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${policy.bg} rounded-xl flex items-center justify-center mb-4`}>
                  {policy.icon}
                </div>
                <h4 className="font-bold text-slate-800 mb-2 text-base">{policy.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{policy.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-amber-800 text-sm font-medium">
              📌 Học phí chi tiết theo từng khóa — vui lòng liên hệ tư vấn viên qua hotline hoặc Zalo để nhận bảng giá đầy đủ. Chính sách giá minh bạch, không phụ phí ẩn.
            </p>
          </div>
        </section>

        {/* Programs List */}
        <section className="programs-section py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center tracking-tight">Khung Chương Trình Đào Tạo</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-center text-sm mb-12">Đăng ký bất kỳ chương trình nào bên dưới — tư vấn viên sẽ hỗ trợ bạn chọn đúng khóa.</p>
            <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
              {[
                'Tin Học Văn Phòng (MOS/IC3)', 'Hỗ Trợ Ngoại Ngữ Cấp Tốc', 'Tiếng Anh Giao Tiếp',
                'Tiếng Anh Chuyên Ngành', 'Luyện Thi TOEIC', 'Luyện Thi IELTS', 'Luyện Thi TOEFL',
                'VSTEP A2', 'VSTEP B1', 'VSTEP B2', 'VSTEP C1',
                'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Pháp', 'Đào Tạo Doanh Nghiệp'
              ].map((major, idx) => (
                <div key={idx} className="program-tag flex items-center gap-3 px-6 py-3 rounded-full bg-white border border-emerald-200 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all cursor-default">
                  <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                  <span className="font-semibold text-slate-700">{major}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="benefits-section py-24 container mx-auto px-4 relative z-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-16 text-center tracking-tight">Đặc Quyền Học Viên</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="benefit-card bg-white shadow-md border border-slate-100 rounded-[2rem] p-8 flex flex-col items-start group">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Gift size={28} /></div>
              <h3 className="font-bold text-xl mb-3 text-slate-900">Học bổng &amp; Ưu đãi</h3>
              <p className="text-slate-500">Giảm giá lên đến 30% cho học viên đăng ký sớm và các gói học thuật dài hạn.</p>
            </div>
            <div className="benefit-card bg-white shadow-md border border-slate-100 rounded-[2rem] p-8 flex flex-col items-start group">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><BookOpen size={28} /></div>
              <h3 className="font-bold text-xl mb-3 text-slate-900">Học liệu độc quyền</h3>
              <p className="text-slate-500">Truy cập không giới hạn kho tài liệu số, e-learning và bài giảng video chất lượng cao.</p>
            </div>
            <div className="benefit-card bg-white shadow-md border border-slate-100 rounded-[2rem] p-8 flex flex-col items-start group">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><UserCheck size={28} /></div>
              <h3 className="font-bold text-xl mb-3 text-slate-900">Chuyên gia đồng hành</h3>
              <p className="text-slate-500">100% Giảng viên có chứng chỉ sư phạm quốc tế TESOL/CELTA và IELTS 8.0+.</p>
            </div>
            <div className="benefit-card bg-white shadow-md border border-slate-100 rounded-[2rem] p-8 flex flex-col items-start group">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Award size={28} /></div>
              <h3 className="font-bold text-xl mb-3 text-slate-900">Cam kết đầu ra</h3>
              <p className="text-slate-500">Hỗ trợ học lại miễn phí nếu không đạt điểm số cam kết ghi trong hợp đồng học tập.</p>
            </div>
            <div className="benefit-card bg-white shadow-md border border-slate-100 rounded-[2rem] p-8 flex flex-col items-start group">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Zap size={28} /></div>
              <h3 className="font-bold text-xl mb-3 text-slate-900">Hỗ trợ học tập 24/7</h3>
              <p className="text-slate-500">Trợ giảng AI và đội ngũ tutor luôn sẵn sàng giải đáp thắc mắc bất cứ lúc nào.</p>
            </div>
            <div className="benefit-card bg-white shadow-md border border-slate-100 rounded-[2rem] p-8 flex flex-col items-start group">
              <div className="w-14 h-14 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Globe size={28} /></div>
              <h3 className="font-bold text-xl mb-3 text-slate-900">Hình thức linh hoạt</h3>
              <p className="text-slate-500">Chuyển đổi linh hoạt giữa học trực tuyến (Online) và trực tiếp (Offline) theo nhu cầu.</p>
            </div>
          </div>
        </section>

        {/* Detailed Contact for Registration */}
        <section className="py-24 relative overflow-hidden m-4 sm:m-8 lg:m-12 rounded-[3rem] bg-slate-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight">Cổng Đăng Ký Trực Tuyến</h2>
            <p className="text-slate-400 mb-12 max-w-xl mx-auto">Liên hệ ngay để được tư vấn miễn phí và đặt chỗ lớp học phù hợp!</p>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
              <div className="glass-panel !bg-white/5 !border-white/10 hover:!bg-white/10 p-8 rounded-[2rem] transition-colors">
                <Phone className="mx-auto h-12 w-12 mb-6 text-emerald-400" />
                <h3 className="font-bold text-xl mb-3 text-white">Hotline Tuyển Sinh</h3>
                <p className="text-2xl font-bold tracking-wider text-emerald-300">096 244 9563</p>
                <p className="text-lg font-medium text-slate-400 mt-2">033 924 4566</p>
              </div>
              <div className="glass-panel !bg-white/5 !border-white/10 hover:!bg-white/10 p-8 rounded-[2rem] transition-colors">
                <Mail className="mx-auto h-12 w-12 mb-6 text-blue-400" />
                <h3 className="font-bold text-xl mb-3 text-white">Email Tiếp Nhận</h3>
                <p className="text-lg font-medium text-blue-300 break-words">info@vantrangedu.edu.vn</p>
                <p className="text-sm font-medium text-slate-400 mt-2">Phản hồi trong 2 giờ làm việc</p>
              </div>
              <div className="glass-panel !bg-white/5 !border-white/10 hover:!bg-white/10 p-8 rounded-[2rem] transition-colors">
                <MessageCircle className="mx-auto h-12 w-12 mb-6 text-purple-400" />
                <h3 className="font-bold text-xl mb-4 text-white">Mạng Xã Hội</h3>
                <div className="flex flex-col gap-3">
                  <a href="https://zalo.me/0962449563" className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                    <span>Chat qua Zalo</span> <ArrowRight size={16} />
                  </a>
                  <a href="https://www.facebook.com/Englishvantrang" className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                    <span>Inbox Fanpage</span> <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </div>

            <a href="tel:0962449563" className="inline-block">
              <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-12 h-16 text-xl rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                Nhận Tư Vấn Cụ Thể
              </Button>
            </a>
          </div>
        </section>

        {/* Internal linking — related pages */}
        <section className="py-10 bg-emerald-50 border-t border-emerald-100">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-500 text-sm mb-4 font-medium">Khám phá thêm</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/training" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                Xem các chương trình đào tạo <ArrowRight size={14} />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm">
                Liên hệ trực tiếp <ArrowRight size={14} />
              </Link>
              <Link to="/news" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                Xem tin tức &amp; Blog <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ModernPublicLayout>
  );
}
