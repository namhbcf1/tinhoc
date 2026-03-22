import React, { useRef } from 'react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Users, Target, Award, MapPin, Phone, Mail, Facebook, Zap, Clock, ThumbsUp, ShieldCheck, BookOpen, GraduationCap, Globe, ArrowRight } from 'lucide-react';
import SEO from '../../components/common/SEO';
import { Link } from 'react-router-dom';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { TOTAL_STUDENTS, YEARS_EXPERIENCE, TEACHERS_MIN_IELTS, SATISFACTION_RATE } from '../../constants/site-stats';

/* ── Dữ liệu giáo viên (placeholder — TODO: thay bằng ảnh và thông tin thật) ── */
const teachers = [
  {
    initials: 'VT',
    name: 'Phạm Thị Vân Trang',
    role: 'Giám đốc & Giảng viên chính',
    cert: 'IELTS 8.0, TESOL Certified',
    exp: '10+ năm kinh nghiệm',
    color: 'bg-emerald-100 text-emerald-700',
    speciality: 'VSTEP B2, C1 — Tiếng Anh Học Thuật'
  },
  {
    initials: 'GV',
    name: 'Giảng viên VSTEP',
    role: 'Chuyên gia luyện thi VSTEP',
    cert: 'IELTS 8.5, CELTA',
    exp: '8 năm kinh nghiệm',
    color: 'bg-blue-100 text-blue-700',
    speciality: 'VSTEP A2, B1, B2 — Luyện thi chứng chỉ'
  },
  {
    initials: 'GV',
    name: 'Giảng viên Giao Tiếp',
    role: 'Chuyên gia tiếng Anh thực dụng',
    cert: 'TOEIC 990, TESOL',
    exp: '6 năm kinh nghiệm',
    color: 'bg-purple-100 text-purple-700',
    speciality: 'Giao tiếp, Phát âm, Phỏng vấn'
  },
  {
    initials: 'GV',
    name: 'Giảng viên Tin Học',
    role: 'Chuyên gia MOS & IC3',
    cert: 'MOS Expert, IC3 Certified',
    exp: '5 năm kinh nghiệm',
    color: 'bg-teal-100 text-teal-700',
    speciality: 'Word, Excel, PowerPoint, IC3/MOS'
  },
];

/* ── Timeline lịch sử ── */
const historyTimeline = [
  { year: '2015', title: 'Thành lập trung tâm', desc: 'VanTrangEdu chính thức ra đời tại Hà Nội, bắt đầu với các lớp tiếng Anh giao tiếp nhỏ, quy mô 10–15 học viên.' },
  { year: '2017', title: 'Mở rộng chương trình', desc: 'Ra mắt các khóa luyện thi TOEIC, IELTS. Số lượng học viên vượt 500 người.' },
  { year: '2019', title: 'Chuyên sâu VSTEP', desc: 'Trở thành một trong những trung tâm luyện thi VSTEP uy tín tại Hà Nội. Ký hợp tác với các doanh nghiệp về đào tạo tiếng Anh nội bộ.' },
  { year: '2022', title: 'Ra mắt E-Learning', desc: 'Triển khai nền tảng học trực tuyến, mở rộng phục vụ học viên toàn quốc. Tổng cộng 2.000+ cựu học viên.' },
  { year: '2025', title: 'Thêm Tin Học Văn Phòng', desc: 'Bổ sung chương trình Tin Học Văn Phòng (MOS, IC3) đáp ứng nhu cầu thực tế. Đạt 3.000+ cựu học viên.' },
  { year: '2026', title: 'Tích hợp AI', desc: 'Ứng dụng AI đánh giá trình độ đầu vào và cá nhân hóa lộ trình học tập cho từng học viên.' },
];

export default function AboutPage() {
  const container = useRef();

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-title', { y: 30, opacity: 0, duration: 1 })
      .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6');

    gsap.from('.overview-text', {
      scrollTrigger: { trigger: '.overview-section', start: 'top 80%' },
      y: 30, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power2.out'
    });

    gsap.from('.mission-card', {
      scrollTrigger: { trigger: '.mission-section', start: 'top 80%' },
      scale: 0.95, y: 40, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'back.out(1.2)'
    });

    gsap.from('.stat-item', {
      scrollTrigger: { trigger: '.stats-section', start: 'top 85%' },
      y: -20, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out'
    });

    gsap.from('.info-card', {
      scrollTrigger: { trigger: '.info-section', start: 'top 80%' },
      x: (index) => index === 0 ? -40 : 40,
      opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out'
    });
  }, { scope: container });

  return (
    <ModernPublicLayout>
      <SEO
        title="Về VanTrangEdu — Lịch sử, Sứ mệnh & Đội ngũ"
        description="VanTrangEdu — trung tâm ngoại ngữ và tin học văn phòng tại 418 Đê La Thành, Hà Nội. 10+ năm kinh nghiệm, 3.000+ cựu học viên, giảng viên IELTS 8.0+. Xem giấy phép, đội ngũ và sứ mệnh."
        url="/about"
      />
      <div ref={container} className="relative bg-white overflow-hidden min-h-screen pb-20">

        {/* ── Hero Section ── */}
        <div className="relative pt-32 pb-20 border-b border-slate-100">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[100px] opacity-60 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[80px] opacity-60 translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="hero-title text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">
              Về <span className="heading-gradient">VanTrangEdu</span>
            </h1>
            <p className="hero-subtitle text-xl md:text-2xl text-emerald-700 font-bold tracking-wide uppercase">
              CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG
            </p>
            <p className="mt-4 text-slate-500 max-w-xl mx-auto">
              Trung tâm ngoại ngữ &amp; tin học văn phòng tại Hà Nội — 10+ năm đào tạo, 3.000+ cựu học viên.
            </p>
          </div>
        </div>

        {/* ── Overview Section ── */}
        <section className="overview-section py-24 container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="overview-text text-3xl font-bold text-slate-900 tracking-tight">Hệ Sinh Thái Giáo Dục Kỷ Nguyên Mới</h2>
            <div className="overview-text w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
            <p className="overview-text text-xl text-slate-600 leading-relaxed font-light">
              <strong>Van Trang Education</strong> là trung tâm đào tạo ngoại ngữ và tin học văn phòng tại Hà Nội, được thành lập năm 2015
              bởi bà Phạm Thị Vân Trang. Sau hơn 10 năm hoạt động, trung tâm đã đào tạo <strong>3.000+ học viên</strong> —
              từ học sinh, sinh viên đến người đi làm và cán bộ nhà nước.
            </p>
            <p className="overview-text text-xl text-slate-600 leading-relaxed font-light">
              Với kim chỉ nam <span className="text-emerald-600 font-bold">"Xóa nhòa giới hạn ngôn ngữ"</span>, chúng tôi mang tới
              các giải pháp học thuật cá nhân hóa, giúp học viên không chỉ đạt chứng chỉ quốc tế (VSTEP, TOEIC, IELTS)
              mà còn tự tin làm chủ kỹ năng công việc thực tế.
            </p>
          </div>
        </section>

        {/* ── Vision & Mission ── */}
        <section className="mission-section py-20 relative z-10">
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-xl border-y border-slate-200" />
          <div className="container mx-auto px-4 relative z-20">
            <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto">
              <Card className="mission-card glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden">
                <CardContent className="p-12 text-center relative">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
                  <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-blue-200 relative z-10">
                    <Target size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight relative z-10">Tầm Nhìn 2030</h3>
                  <p className="text-slate-600 text-lg leading-relaxed relative z-10">
                    Trở thành trung tâm luyện thi VSTEP và đào tạo ngoại ngữ uy tín nhất khu vực Hà Nội,
                    nơi mọi học viên đều có thể tiếp cận chương trình chất lượng cao với chi phí hợp lý.
                  </p>
                </CardContent>
              </Card>

              <Card className="mission-card glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden">
                <CardContent className="p-12 text-center relative">
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2" />
                  <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-emerald-200 relative z-10">
                    <Award size={40} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight relative z-10">Sứ Mệnh Cốt Lõi</h3>
                  <p className="text-slate-600 text-lg leading-relaxed relative z-10">
                    Rút ngắn thời gian đạt chứng chỉ VSTEP/TOEIC/IELTS bằng phương pháp Sư phạm 4.0 kết hợp AI,
                    đồng hành cùng mỗi học viên từ bước đầu tiên đến khi cầm chứng chỉ trên tay.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ── Stats Section ── */}
        <section className="stats-section py-24 container mx-auto px-4 relative z-10">
          <div className="glass-panel max-w-6xl mx-auto rounded-[3rem] p-12 bg-white/60">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-200/60">
              <div className="stat-item px-4">
                <div className="text-5xl font-black heading-gradient mb-3">100%</div>
                <div className="text-slate-600 font-bold uppercase tracking-wider text-sm">Cam kết chất lượng</div>
              </div>
              <div className="stat-item px-4">
                <div className="text-5xl font-black heading-gradient mb-3">24/7</div>
                <div className="text-slate-600 font-bold uppercase tracking-wider text-sm">Hỗ trợ học viên</div>
              </div>
              <div className="stat-item px-4">
                <div className="text-5xl font-black heading-gradient mb-3">{TEACHERS_MIN_IELTS}</div>
                <div className="text-slate-600 font-bold uppercase tracking-wider text-sm">Đội ngũ IELTS</div>
              </div>
              <div className="stat-item px-4">
                <div className="text-5xl font-black heading-gradient mb-3">{TOTAL_STUDENTS}</div>
                <div className="text-slate-600 font-bold uppercase tracking-wider text-sm">Cựu học viên</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Lịch sử hình thành (Timeline) ── */}
        <section className="py-20 container mx-auto px-4 relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Lịch Sử Hình Thành</h2>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="max-w-3xl mx-auto relative">
            {/* Vertical line */}
            <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-300 to-slate-200 -translate-x-1/2" />

            <div className="space-y-8">
              {historyTimeline.map((item, idx) => (
                <div key={idx} className={`flex gap-6 md:gap-0 items-start ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  {/* Content */}
                  <div className={`flex-1 ${idx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 inline-block w-full text-left">
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{item.year}</span>
                      <h4 className="font-bold text-slate-800 mt-1 mb-2">{item.title}</h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  {/* Dot */}
                  <div className="shrink-0 w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-200 z-10 md:mx-0">
                    {item.year.slice(2)}
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Giấy phép & Chứng nhận ── */}
        {/* TODO: Thay nội dung placeholder bằng thông tin giấy phép thật khi có */}
        <section className="py-16 bg-slate-50 border-y border-slate-100 relative z-10">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck size={22} className="text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Giấy Phép & Chứng Nhận Hoạt Động</h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* TODO: Thay placeholder bằng số giấy phép thật và ảnh scan */}
                <div className="glass-card bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                    <ShieldCheck size={20} className="text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Giấy Phép Đào Tạo</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">
                    Trung tâm được cấp phép hoạt động bởi Sở GD&ĐT Hà Nội theo Nghị định 46/2017/NĐ-CP.
                  </p>
                  <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">TODO: Cập nhật số giấy phép</span>
                </div>

                <div className="glass-card bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <Award size={20} className="text-blue-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Đăng Ký Kinh Doanh</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-3">
                    Công ty TNHH Tư Vấn Giáo Dục Sơn Trang — Mã số thuế đăng ký hợp lệ tại Hà Nội.
                  </p>
                  <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md">TODO: Cập nhật MST / số ĐKKD</span>
                </div>

                <div className="glass-card bg-white rounded-2xl p-6 border-2 border-purple-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-4">
                    <BookOpen size={20} className="text-purple-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Chương Trình Chuẩn VSTEP</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Luyện thi VSTEP theo khung năng lực ngoại ngữ 6 bậc (Thông tư 01/2014/TT-BGDĐT) do Bộ GD&ĐT ban hành.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Đội ngũ giảng viên ── */}
        {/* TODO: Thay placeholder bằng ảnh thật, tên thật, bằng cấp thật */}
        <section className="py-20 relative z-10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <GraduationCap size={22} className="text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Đội Ngũ Giảng Viên</h2>
              </div>
              <p className="text-slate-500 max-w-xl mx-auto text-sm">
                100% giảng viên có chứng chỉ sư phạm quốc tế TESOL/CELTA và điểm IELTS/chứng chỉ chuyên ngành cao.
              </p>
              <div className="w-20 h-1.5 bg-blue-400 mx-auto rounded-full mt-4" />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {teachers.map((teacher, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center hover:shadow-md transition-shadow">
                  {/* TODO: Thay div placeholder bằng <img> ảnh thật */}
                  <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold ${teacher.color}`}>
                    {teacher.initials}
                  </div>
                  <h4 className="font-bold text-slate-900 mb-0.5 text-base">{teacher.name}</h4>
                  <p className="text-slate-500 text-xs mb-2">{teacher.role}</p>
                  <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full inline-block mb-2">
                    {teacher.cert}
                  </div>
                  <p className="text-slate-400 text-xs">{teacher.exp}</p>
                  <p className="text-slate-500 text-xs mt-2 italic">{teacher.speciality}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-slate-400 text-sm mt-6 italic">
              * Thông tin chi tiết từng giảng viên sẽ được cập nhật đầy đủ. Liên hệ hotline để được tư vấn trực tiếp.
            </p>
          </div>
        </section>

        {/* ── Leadership & Contact Info ── */}
        <section className="info-section py-16 container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-start">

            <Card className="info-card glass-panel border-0 shadow-2xl shadow-emerald-900/5 rounded-[3rem] overflow-hidden bg-white/80">
              <CardContent className="p-12">
                <div className="w-20 h-2 bg-emerald-500 rounded-full mb-8" />
                <h3 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Phạm Thị Vân Trang</h3>
                <p className="text-emerald-600 font-bold tracking-widest uppercase text-sm mb-8">Người đại diện pháp luật & CEO</p>
                <div className="space-y-6 text-lg text-slate-600 font-light leading-relaxed">
                  <p>
                    Là chuyên gia Sư phạm ngôn ngữ với hơn 10 năm kinh nghiệm, bà Phạm Thị Vân Trang đã xây dựng
                    VanTrangEdu từ một trung tâm nhỏ tại Hà Nội thành cơ sở đào tạo phục vụ 3.000+ cựu học viên
                    trên cả nước.
                  </p>
                  <p>
                    Tâm huyết với triết lý <strong className="text-slate-800 font-bold">"Giáo dục là vũ khí mạnh nhất để thay đổi thế giới"</strong>,
                    bà và cộng sự không ngừng cập nhật phương pháp giảng dạy tiên tiến nhất để giúp học viên
                    bứt phá trong thời gian ngắn nhất.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="info-card space-y-5">
              <h3 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Thông Tin Liên Hệ</h3>

              <div className="glass-card bg-white p-6 rounded-2xl flex items-center gap-6 group hover:scale-[1.02] transition-transform shadow-sm">
                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg mb-1">Trụ sở chính</p>
                  <p className="text-slate-600 font-medium">418 Đê La Thành, Ô Chợ Dừa, Đống Đa, Hà Nội</p>
                </div>
              </div>

              <div className="glass-card bg-white p-6 rounded-2xl flex items-center gap-6 group hover:scale-[1.02] transition-transform shadow-sm">
                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg mb-1">Tổng đài CSKH</p>
                  <div className="flex flex-wrap gap-4">
                    <a href="tel:0962445963" className="text-slate-600 font-mono font-bold text-lg hover:text-emerald-600 transition-colors">096 244 5963</a>
                    <a href="tel:0339244566" className="text-slate-600 font-mono font-bold text-lg hover:text-emerald-600 transition-colors">033 924 4566</a>
                  </div>
                </div>
              </div>

              <div className="glass-card bg-white p-6 rounded-2xl flex items-center gap-6 group hover:scale-[1.02] transition-transform shadow-sm">
                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg mb-1">Hỗ trợ đối tác & Học viên</p>
                  <a href="mailto:info@vantrangedu.edu.vn" className="text-slate-600 text-lg font-medium hover:text-rose-600 transition-colors">info@vantrangedu.edu.vn</a>
                </div>
              </div>

              <div className="glass-card bg-white p-6 rounded-2xl flex items-center gap-6 group hover:scale-[1.02] transition-transform shadow-sm">
                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Facebook size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg mb-1">Kênh mạng xã hội chính thức</p>
                  <a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline font-bold">fb.com/Englishvantrang</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Google Maps Embed ── */}
        {/* TODO: Thay bằng Google Maps embed URL thật của địa chỉ 418 Đê La Thành */}
        <section className="py-10 container mx-auto px-4 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                <MapPin size={18} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Bản Đồ & Đường Đến Trung Tâm</h3>
            </div>

            {/* Google Maps Embed Placeholder */}
            {/* TODO: Thay src bằng embed URL thật từ Google Maps cho "418 Đê La Thành, Đống Đa, Hà Nội" */}
            <div className="w-full h-80 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 overflow-hidden">
              <MapPin size={36} className="mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500 text-base">418 Đê La Thành, Ô Chợ Dừa, Đống Đa, Hà Nội</p>
              <p className="text-sm mt-1">Google Maps embed — TODO: cập nhật iframe thật</p>
              <a
                href="https://maps.google.com/?q=418+De+La+Thanh+Dong+Da+Ha+Noi"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:text-emerald-500 transition-colors"
              >
                <Globe size={16} /> Xem trên Google Maps →
              </a>
            </div>
            {/* Khi có embed URL thật, thay div trên bằng:
            <iframe
              src="https://www.google.com/maps/embed?pb=..."
              width="100%"
              height="320"
              className="rounded-2xl border-0"
              allowFullScreen
              loading="lazy"
              title="Bản đồ VanTrangEdu"
            /> */}
          </div>
        </section>

        {/* ── CTA & Internal links ── */}
        <section className="py-10 bg-emerald-50 border-t border-emerald-100">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-500 text-sm mb-4 font-medium">Khám phá thêm</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/training" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                Xem chương trình đào tạo <ArrowRight size={14} />
              </Link>
              <Link to="/admissions" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm">
                Đăng ký tuyển sinh <ArrowRight size={14} />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                Liên hệ tư vấn <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ModernPublicLayout>
  );
}
