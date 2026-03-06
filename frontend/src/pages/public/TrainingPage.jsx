import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { BookOpen, Globe, Zap, Building, CheckCircle, Phone, Mail, ArrowRight, Users, ThumbsUp, Award, Monitor, Clock, Calendar, DollarSign, ChevronDown } from 'lucide-react';
import SEO from '../../components/common/SEO';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';
import { ACTIVE_STUDENTS, SATISFACTION_RATE, YEARS_EXPERIENCE } from '../../constants/site-stats';

/* ── FAQ Accordion item ── */
function FaqItem({ item }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-bold text-slate-800 text-[15px] pr-4">{item.q}</span>
        <ChevronDown size={20} className={`text-emerald-500 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">{item.a}</div>
      )}
    </div>
  );
}

export default function TrainingPage() {
  const programs = [
    {
      title: 'Tin Học Văn Phòng',
      description: 'Đào tạo MOS (Microsoft Office Specialist) Word, Excel, PowerPoint, chứng chỉ IC3. Phù hợp học sinh, sinh viên và người đi làm cần hoàn thiện kỹ năng văn phòng.',
      path: '/training/tin-hoc-van-phong',
      icon: <Monitor size={32} className="text-teal-500" />,
      color: 'bg-teal-100',
      duration: '2 – 3 tháng',
      schedule: 'T2-T4-T6, 18h30',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Hỗ Trợ Ngoại Ngữ Cấp Tốc',
      description: 'Chương trình đào tạo ngoại ngữ cấp tốc với phương pháp hiện đại, giúp học viên nhanh chóng nâng cao trình độ.',
      path: '/training/ngoai-ngu-cap-toc',
      icon: <Zap size={32} className="text-amber-500" />,
      color: 'bg-amber-100',
      duration: '1 – 2 tháng',
      schedule: 'Linh hoạt',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Tiếng Anh Giao Tiếp',
      description: 'Khóa học tiếng Anh giao tiếp từ cơ bản đến nâng cao, tập trung vào thực hành phản xạ, phát âm chuẩn.',
      path: '/training/tieng-anh-giao-tiep',
      icon: <Globe size={32} className="text-blue-500" />,
      color: 'bg-blue-100',
      duration: '3 tháng',
      schedule: 'T3-T5-T7, 19h',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Tiếng Anh Chuyên Ngành',
      description: 'Đào tạo tiếng Anh chuyên ngành: Kinh tế, Tài chính, Ngân hàng, Công nghệ thông tin.',
      path: '/training/tieng-anh-chuyen-nganh',
      icon: <Building size={32} className="text-indigo-500" />,
      color: 'bg-indigo-100',
      duration: '3 – 4 tháng',
      schedule: 'T2-T4-T6, 19h',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Luyện Thi VSTEP',
      description: 'Luyện thi VSTEP A2, B1, B2, C1 — đề chuẩn Bộ GD&ĐT, cam kết đầu ra theo hợp đồng.',
      path: '/training/luyen-thi-vstep',
      icon: <Award size={32} className="text-rose-500" />,
      color: 'bg-rose-100',
      duration: '2 – 4 tháng',
      schedule: 'T2-T4-T6, 19h',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Luyện Thi Chứng Chỉ Quốc Tế',
      description: 'Luyện thi TOEIC, IELTS, TOEFL, Cambridge với giảng viên IELTS 8.0+ và cam kết đầu ra.',
      path: '/training/luyen-thi-chung-chi',
      icon: <BookOpen size={32} className="text-purple-500" />,
      color: 'bg-purple-100',
      duration: '3 – 6 tháng',
      schedule: 'T2-T4-T6, 19h',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Ngoại Ngữ Khác',
      description: 'Đào tạo Tiếng Nhật, Tiếng Hàn, Tiếng Trung, Tiếng Pháp — từ sơ cấp đến nâng cao.',
      path: '/training/ngoai-ngu-khac',
      icon: <Globe size={32} className="text-emerald-500" />,
      color: 'bg-emerald-100',
      duration: '4 – 6 tháng',
      schedule: 'Linh hoạt',
      fee: 'Liên hệ tư vấn'
    },
    {
      title: 'Đào Tạo Theo Nhu Cầu',
      description: 'Chương trình linh hoạt, đáp ứng nhu cầu cụ thể của từng học viên hoặc doanh nghiệp với lộ trình AI cá nhân hóa.',
      path: '/training/dao-tao-theo-nhu-cau',
      icon: <CheckCircle size={32} className="text-orange-500" />,
      color: 'bg-orange-100',
      duration: 'Tùy lộ trình',
      schedule: 'Theo thỏa thuận',
      fee: 'Liên hệ tư vấn'
    }
  ];

  const features = [
    'Phương pháp giảng dạy kỷ nguyên 4.0',
    'Đội ngũ giảng viên tinh hoa TESOL/IELTS 8.0+',
    'Lộ trình cá nhân hóa bằng AI',
    'Hỗ trợ học bù & xem lại bài giảng 24/7',
    'Cam kết chuẩn đầu ra theo hợp đồng',
    'Cấp chứng nhận hoàn thành khóa học'
  ];

  /* ── Lịch khai giảng — thêm cột thời lượng & lịch học ── */
  const scheduleRows = [
    { course: 'Tin Học Văn Phòng (MOS)', date: '10/03/2026', duration: '2 tháng', schedule: 'T2-T4-T6, 18h30', mode: 'Offline', fee: 'Liên hệ' },
    { course: 'Tiếng Anh Giao Tiếp',    date: '10/03/2026', duration: '3 tháng', schedule: 'T3-T5-T7, 19h',   mode: 'Online',  fee: 'Liên hệ' },
    { course: 'Luyện Thi TOEIC',        date: '15/03/2026', duration: '3 tháng', schedule: 'T2-T4-T6, 19h',   mode: 'Offline', fee: 'Liên hệ' },
    { course: 'VSTEP B1',               date: '20/03/2026', duration: '2 tháng', schedule: 'T3-T5-T7, 19h',   mode: 'Offline', fee: 'Liên hệ' },
    { course: 'VSTEP B2',               date: '25/03/2026', duration: '3 tháng', schedule: 'T2-T4-T6, 19h',   mode: 'Offline', fee: 'Liên hệ' },
    { course: 'Tiếng Nhật N3',          date: '01/04/2026', duration: '4 tháng', schedule: 'T7-CN, 8h',        mode: 'Online',  fee: 'Liên hệ' },
  ];

  /* ── Bảng so sánh cấp độ VSTEP ── */
  const vstepLevels = [
    { level: 'VSTEP A2', target: 'Học sinh cấp 3, người mới bắt đầu',   duration: '2 tháng (40 giờ)',   skills: 'Nghe, Nói, Đọc, Viết cơ bản',           badge: 'bg-green-100 text-green-700' },
    { level: 'VSTEP B1', target: 'Sinh viên đại học, người đi làm',     duration: '2–3 tháng (60 giờ)', skills: 'Giao tiếp tự tin, đọc hiểu trung cấp',   badge: 'bg-blue-100 text-blue-700' },
    { level: 'VSTEP B2', target: 'Tốt nghiệp ĐH, nâng cao năng lực',   duration: '3–4 tháng (80 giờ)', skills: 'Tiếng Anh học thuật, viết luận, phỏng vấn', badge: 'bg-purple-100 text-purple-700' },
    { level: 'VSTEP C1', target: 'Nghiên cứu sinh, giảng viên, cán bộ', duration: '4–6 tháng (120 giờ)', skills: 'Thành thạo, học thuật cấp cao',           badge: 'bg-rose-100 text-rose-700' },
  ];

  /* ── FAQ ── */
  const faqs = [
    { q: 'VSTEP là gì?', a: 'VSTEP (Vietnamese Standardized Test of English Proficiency) là bộ đề thi đánh giá năng lực tiếng Anh theo khung tham chiếu châu Âu CEFR, do Bộ GD&ĐT ban hành. Chứng chỉ VSTEP được công nhận rộng rãi trong tuyển dụng, xét tốt nghiệp đại học và thăng tiến nghề nghiệp.' },
    { q: 'Học bao lâu để đạt VSTEP B2?', a: 'Tùy trình độ đầu vào: Nếu đang ở mức B1, cần khoảng 2–3 tháng học tập trung (3 buổi/tuần, mỗi buổi 2 giờ). Nếu bắt đầu từ A2, cần 4–5 tháng. Trung tâm sẽ test đầu vào miễn phí và tư vấn lộ trình phù hợp.' },
    { q: 'Học phí các khóa là bao nhiêu?', a: 'Học phí phụ thuộc vào khóa học và hình thức học (online/offline). Vui lòng liên hệ hotline 096 244 5963 hoặc nhắn Zalo để nhận báo giá. Trung tâm có chính sách giảm giá cho học viên đăng ký sớm và nhóm từ 2 người.' },
    { q: 'Khóa Tin học Văn phòng gồm những gì?', a: 'Bao gồm: Microsoft Word (soạn thảo, định dạng, mail merge), Excel (hàm cơ bản đến nâng cao, PivotTable, biểu đồ), PowerPoint (thiết kế slide chuyên nghiệp), và ôn luyện chứng chỉ MOS/IC3. Phù hợp cho học sinh, sinh viên và người đi làm.' },
    { q: 'Trung tâm có hỗ trợ học bù khi vắng không?', a: 'Có. Học viên vắng mặt có thể học bù tại lớp khác cùng cấp độ hoặc xem lại video bài giảng trên hệ thống E-learning. Hỗ trợ tối đa 30% số buổi học bù trong một khóa.' },
    { q: 'Có thể học thử trước khi đăng ký không?', a: 'Có. VanTrangEdu cho phép học thử 1 buổi miễn phí với bất kỳ khóa học nào. Liên hệ hotline hoặc Zalo để đặt lịch.' },
  ];

  const trainingSchema = {
    "@type": "ItemList",
    "name": "Các chương trình đào tạo Van Trang Education",
    "itemListElement": programs.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "Course",
        "name": p.title,
        "description": p.description,
        "provider": {
          "@type": "Organization",
          "name": "Van Trang Education",
          "sameAs": "https://vantrangedu.com"
        }
      }
    }))
  };

  const container = useRef();

  const breadcrumbItems = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Đào tạo', path: '/training' }
  ];

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.hero-title', { y: 30, opacity: 0, duration: 1 })
      .from('.hero-desc', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6');

    gsap.from('.program-card', {
      scrollTrigger: {
        trigger: '.programs-grid',
        start: 'top 80%',
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'back.out(1.2)'
    });

    gsap.from('.feature-item', {
      scrollTrigger: {
        trigger: '.features-section',
        start: 'top 85%',
      },
      x: -20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out'
    });

    gsap.from('.contact-card', {
      scrollTrigger: {
        trigger: '.contact-section',
        start: 'top 80%',
      },
      scale: 0.9,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'back.out(1.5)'
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
      <div ref={container} className="relative bg-white overflow-hidden min-h-screen">

        {/* Breadcrumb navigation */}
        <div className="container mx-auto px-4 pt-28 pb-0 relative z-20">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Hero Banner */}
        <div className="relative pt-32 pb-20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/50 rounded-full blur-[100px] opacity-60 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-100/40 rounded-full blur-[80px] opacity-60 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
            <h1 className="hero-title text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">Hệ Sinh Thái <span className="heading-gradient">Đào Tạo</span></h1>
            <p className="hero-desc text-xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
              Tiếng Anh giao tiếp, luyện thi VSTEP/TOEIC/IELTS và Tin học Văn phòng (Word · Excel · PowerPoint · MOS) —
              đầy đủ chương trình phục vụ học sinh, sinh viên và người đi làm.
            </p>
          </div>
        </div>

        {/* Stat Boxes — "Đặc điểm nổi bật" */}
        <div className="container mx-auto px-4 pb-12 relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="bg-white rounded-2xl px-8 py-6 flex items-center gap-4 shadow-sm border border-slate-100 flex-1 max-w-xs mx-auto sm:mx-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Users size={24} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{ACTIVE_STUDENTS}</p>
                <p className="text-sm text-slate-500 mt-1 font-medium">học viên đang học</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl px-8 py-6 flex items-center gap-4 shadow-sm border border-slate-100 flex-1 max-w-xs mx-auto sm:mx-0">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <ThumbsUp size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{SATISFACTION_RATE}</p>
                <p className="text-sm text-slate-500 mt-1 font-medium">tỉ lệ hài lòng</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl px-8 py-6 flex items-center gap-4 shadow-sm border border-slate-100 flex-1 max-w-xs mx-auto sm:mx-0">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Award size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{YEARS_EXPERIENCE}</p>
                <p className="text-sm text-slate-500 mt-1 font-medium">năm kinh nghiệm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Programs Grid */}
        <section className="programs-grid py-20 container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Cấu Trúc Chương Trình</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Từ ngoại ngữ đến tin học văn phòng — đầy đủ các chương trình phục vụ học sinh, sinh viên và người đi làm.
            </p>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full mt-4" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {programs.map((program, idx) => (
              <Link key={idx} to={program.path} className="program-card group block h-full">
                <Card className="glass-card h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2 rounded-3xl overflow-hidden">
                  <CardContent className="p-7 flex flex-col items-start h-full relative">
                    <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-30 ${program.color} blur-3xl pointer-events-none transition-opacity group-hover:opacity-50`}></div>
                    <div className={`mb-4 p-4 ${program.color} rounded-2xl group-hover:scale-110 transition-transform shadow-sm relative z-10`}>
                      {program.icon}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors tracking-tight relative z-10">{program.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-grow relative z-10">{program.description}</p>

                    {/* Thông tin khóa học */}
                    <div className="w-full space-y-1.5 mb-4 relative z-10">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={13} className="text-emerald-500 shrink-0" />
                        <span>Thời lượng: <strong className="text-slate-700">{program.duration}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar size={13} className="text-emerald-500 shrink-0" />
                        <span>Lịch học: <strong className="text-slate-700">{program.schedule}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <DollarSign size={13} className="text-emerald-500 shrink-0" />
                        <span>Học phí: <strong className="text-slate-700">{program.fee}</strong></span>
                      </div>
                    </div>

                    <a
                      href="tel:0962445963"
                      onClick={e => e.stopPropagation()}
                      className="w-full text-center bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold py-2 rounded-xl transition-colors relative z-10"
                    >
                      Đăng ký tư vấn
                    </a>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Schedule Table — "Lịch khai giảng gần nhất" ── */}
        <section className="py-16 container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Lịch Khai Giảng Gần Nhất</h2>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden max-w-5xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50 text-emerald-800 font-bold">
                    <th className="px-5 py-4 text-left">Khóa học</th>
                    <th className="px-5 py-4 text-left">Khai giảng</th>
                    <th className="px-5 py-4 text-left">Thời lượng</th>
                    <th className="px-5 py-4 text-left">Lịch học</th>
                    <th className="px-5 py-4 text-left">Hình thức</th>
                    <th className="px-5 py-4 text-left">Học phí</th>
                    <th className="px-5 py-4 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-5 py-4 font-semibold text-slate-800">{row.course}</td>
                      <td className="px-5 py-4 text-slate-600">{row.date}</td>
                      <td className="px-5 py-4 text-slate-600">{row.duration}</td>
                      <td className="px-5 py-4 text-slate-600 text-xs">{row.schedule}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${row.mode === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {row.mode}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-700">{row.fee}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link to="/admissions" className="inline-block px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-colors whitespace-nowrap">
                            Đăng ký
                          </Link>
                          <a href="tel:0962445963" className="inline-block px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors whitespace-nowrap">
                            Gọi ngay
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            Lịch khai giảng có thể thay đổi. Liên hệ hotline <strong>096 244 5963</strong> để xác nhận lịch gần nhất.
          </p>
        </section>

        {/* ── Tin Học Văn Phòng Detail ── */}
        <section className="py-20 bg-teal-50/60 border-y border-teal-100 relative z-10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 font-bold px-4 py-1.5 rounded-full text-sm mb-4">
                <Monitor size={16} /> Chương trình mới — Tin Học Văn Phòng
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Nội Dung Khóa Tin Học Văn Phòng</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
                Đào tạo toàn diện kỹ năng máy tính văn phòng, ôn luyện chứng chỉ <strong>MOS (Microsoft Office Specialist)</strong> và <strong>IC3</strong> —
                cấp bởi Certiport, công nhận tại 150+ quốc gia và hàng nghìn doanh nghiệp trong nước.
              </p>
              <div className="w-20 h-1.5 bg-teal-500 mx-auto rounded-full mt-4" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { title: 'Microsoft Word', items: ['Soạn thảo & định dạng văn bản', 'Mail Merge tự động', 'Tạo mẫu biểu, hợp đồng', 'Ôn thi MOS Word'], color: 'border-blue-300 bg-blue-50' },
                { title: 'Microsoft Excel', items: ['Hàm cơ bản đến nâng cao', 'PivotTable & PivotChart', 'VLOOKUP, INDEX, MATCH', 'Ôn thi MOS Excel'], color: 'border-green-300 bg-green-50' },
                { title: 'Microsoft PowerPoint', items: ['Thiết kế slide chuyên nghiệp', 'Animation & hiệu ứng', 'Thuyết trình tự tin', 'Ôn thi MOS PowerPoint'], color: 'border-orange-300 bg-orange-50' },
                { title: 'Chứng chỉ IC3 / MOS', items: ['Ôn thi IC3 GS5 toàn diện', 'Microsoft Office Specialist', 'Chứng chỉ quốc tế Certiport', 'Công nhận 150+ quốc gia'], color: 'border-teal-300 bg-teal-50' },
              ].map((item, i) => (
                <div key={i} className={`rounded-2xl border-2 p-6 ${item.color}`}>
                  <h4 className="font-bold text-slate-800 mb-4 text-base">{item.title}</h4>
                  <ul className="space-y-2">
                    {item.items.map((li, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle size={14} className="text-teal-500 mt-0.5 shrink-0" />{li}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="text-center mt-10 flex flex-wrap gap-4 justify-center">
              <a href="tel:0962445963">
                <Button className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-8 h-12 rounded-2xl">
                  <Phone size={16} className="mr-2" /> Đăng ký tư vấn miễn phí
                </Button>
              </a>
              <a href="https://zalo.me/0962445963" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50 font-bold px-8 h-12 rounded-2xl">
                  Chat Zalo ngay
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── Bảng so sánh VSTEP ── */}
        <section className="py-20 container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">So Sánh Các Cấp Độ VSTEP</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              VSTEP do Bộ GD&ĐT tổ chức, tương đương khung CEFR châu Âu — phổ biến trong tuyển dụng, xét tốt nghiệp ĐH và thăng tiến nghề nghiệp tại Việt Nam.
            </p>
            <div className="w-20 h-1.5 bg-rose-400 mx-auto rounded-full mt-4" />
          </div>
          <div className="overflow-x-auto max-w-5xl mx-auto">
            <table className="w-full text-sm rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <thead>
                <tr className="bg-rose-50 text-rose-800 font-bold">
                  <th className="px-5 py-4 text-left">Cấp độ</th>
                  <th className="px-5 py-4 text-left">Đối tượng phù hợp</th>
                  <th className="px-5 py-4 text-left">Thời lượng luyện thi</th>
                  <th className="px-5 py-4 text-left">Kỹ năng đạt được</th>
                </tr>
              </thead>
              <tbody>
                {vstepLevels.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-5 py-4"><span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${row.badge}`}>{row.level}</span></td>
                    <td className="px-5 py-4 text-slate-600">{row.target}</td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{row.duration}</td>
                    <td className="px-5 py-4 text-slate-600">{row.skills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-xs text-slate-400 mt-3">
            * Thời lượng tính dựa trên 3 buổi/tuần, mỗi buổi 2 giờ. Học viên có trình độ cao hơn có thể rút ngắn lộ trình.
          </p>
        </section>

        {/* ── FAQ Section ── */}
        <section className="py-20 container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Câu Hỏi Thường Gặp</h2>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((item, idx) => (
              <FaqItem key={idx} item={item} />
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-slate-500 text-sm mb-4">Còn câu hỏi khác? Liên hệ tư vấn viên của chúng tôi ngay!</p>
            <a href="tel:0962445963">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 h-12 rounded-2xl">
                <Phone size={16} className="mr-2" /> Gọi hotline: 096 244 5963
              </Button>
            </a>
          </div>
        </section>

        {/* Features Split Section */}
        <section className="features-section py-24 relative z-10 bg-slate-50 border-y border-slate-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Giá Trị Cốt Lõi</h2>
              <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, idx) => (
                <div key={idx} className="feature-item glass-panel bg-white/80 p-6 rounded-2xl flex items-center gap-4 hover:shadow-md hover:bg-white transition-all">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle size={20} className="stroke-[3px]" />
                  </div>
                  <p className="text-slate-700 font-bold text-[15px]">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Contact Bento */}
        <section className="contact-section py-24 container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Trung Tâm Hỗ Trợ Dịch Vụ</h2>
            <div className="w-20 h-1.5 bg-emerald-500 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            <div className="contact-card glass-panel bg-gradient-to-br from-blue-50/80 to-blue-100/50 p-8 rounded-[2rem] text-center border-blue-200/50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-white rounded-[1.5rem] flex items-center justify-center text-blue-600 shadow-sm">
                <Phone size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-4">Hotline Đào Tạo</h3>
              <div className="space-y-2">
                <a href="tel:0962445963" className="block text-2xl font-black text-slate-800 tracking-wider hover:text-blue-600 transition-colors">096 244 5963</a>
                <a href="tel:0339244566" className="block text-lg font-bold text-slate-500 hover:text-blue-600 transition-colors">033 924 4566</a>
              </div>
            </div>

            <div className="contact-card glass-panel bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 p-8 rounded-[2rem] text-center border-emerald-200/50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-white rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-sm">
                <Mail size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-4">Email Liên Hệ</h3>
              <a href="mailto:info@vantrangedu.edu.vn" className="text-lg font-bold text-slate-700 hover:text-emerald-600 transition-colors block mt-8">
                info@vantrangedu.edu.vn
              </a>
            </div>

            <div className="contact-card glass-panel bg-gradient-to-br from-purple-50/80 to-purple-100/50 p-8 rounded-[2rem] text-center border-purple-200/50 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-white rounded-[1.5rem] flex items-center justify-center text-purple-600 shadow-sm">
                <Globe size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-900 mb-6">Mạng Xã Hội</h3>
              <div className="space-y-3 font-bold">
                <a href="https://zalo.me/0962445963" target="_blank" rel="noopener noreferrer" className="block text-slate-700 hover:text-blue-500 transition-colors">
                  Luôn online qua Zalo
                </a>
                <a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-slate-700 hover:text-blue-700 transition-colors">
                  Fanpage Giáo Dục
                </a>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link to="/admissions">
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-12 h-16 text-xl rounded-2xl shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95">
                Bắt Đầu Hành Trình Ngay <ArrowRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Internal linking — related pages */}
        <section className="py-10 bg-emerald-50 border-t border-emerald-100">
          <div className="container mx-auto px-4 text-center">
            <p className="text-slate-500 text-sm mb-4 font-medium">Khám phá thêm</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/admissions" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                Đăng ký tuyển sinh <ArrowRight size={14} />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-emerald-300 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm">
                Liên hệ tư vấn <ArrowRight size={14} />
              </Link>
              <Link to="/news" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                Xem tin tức & Blog <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </ModernPublicLayout>
  );
}
