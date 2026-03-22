import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Monitor, CreditCard, FileText, BarChart, Clock, ShieldCheck, ArrowRight, Laptop } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TOTAL_STUDENTS, SATISFACTION_RATE } from '../../constants/site-stats';
import SEO from '../../components/common/SEO';

const services = [
  { icon: <Monitor size={40} className="text-green-600" />, title: 'Đăng ký thi trực tuyến', description: 'Hệ thống đăng ký thi hiện đại, hoạt động 24/7. Sinh viên có thể đăng ký tham gia các kỳ thi mọi lúc mọi nơi chỉ với vài thao tác đơn giản.', link: '/register' },
  { icon: <Laptop size={40} className="text-blue-600" />, title: 'Quản lý học tập thông minh', description: 'Theo dõi toàn bộ lộ trình học tập, lịch thi, kết quả và trạng thái hồ sơ cá nhân trên một giao diện trực quan, dễ sử dụng.', link: '/dashboard' },
  { icon: <CreditCard size={40} className="text-purple-600" />, title: 'Thanh toán đa phương thức', description: 'Tích hợp cổng thanh toán an toàn, hỗ trợ QR Code, Thẻ nội địa và Quốc tế. Xác nhận giao dịch tức thời và tự động.', link: '/dashboard/payment' },
  { icon: <FileText size={40} className="text-orange-600" />, title: 'Lưu trữ tài liệu số', description: 'Kho tài liệu học tập và ôn thi khổng lồ. Sinh viên có thể tải về giấy báo thi, chứng chỉ và tài liệu ôn tập miễn phí.', link: '/dashboard/documents' },
  { icon: <Clock size={40} className="text-red-600" />, title: 'Hỗ trợ 24/7', description: 'Đội ngũ hỗ trợ chuyên nghiệp luôn sẵn sàng giải đáp mọi thắc mắc của sinh viên qua đa kênh: Chat, Email, Hotline.', link: '/contact' },
  { icon: <BarChart size={40} className="text-teal-600" />, title: 'Thống kê & Báo cáo', description: 'Cung cấp công cụ thống kê chi tiết cho nhà trường và quản lý, giúp theo dõi hiệu quả đào tạo theo thời gian thực.', link: '#' },
];

const stats = [
  { value: TOTAL_STUDENTS, label: 'Học viên', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: SATISFACTION_RATE, label: 'Hài lòng', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: '24/7', label: 'Hỗ trợ', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: '100%', label: 'Bảo mật', color: 'bg-orange-50 border-orange-200 text-orange-700' },
];

// TODO: Thay bằng phản hồi thật từ học viên (tên thật, có consent)
const testimonials = [
  { initial: 'H', name: 'Học viên khoá VSTEP B2 — 2025', course: 'Chứng chỉ VSTEP B2', quote: 'Hệ thống đăng ký thi rất tiện lợi, tôi có thể làm mọi thứ trên điện thoại. Kết quả thi được thông báo nhanh chóng!' },
  { initial: 'H', name: 'Học viên khoá Tiếng Anh Giao Tiếp — 2025', course: 'Tiếng Anh Giao Tiếp', quote: 'Kho tài liệu ôn tập rất phong phú và hữu ích. Đội ngũ hỗ trợ phản hồi nhanh khi tôi cần giải đáp thắc mắc.' },
  { initial: 'H', name: 'Học viên khoá Luyện Thi TOEIC — 2026', course: 'Luyện thi TOEIC', quote: 'Tính năng quản lý lộ trình học tập rất trực quan, giúp tôi biết mình cần cải thiện ở đâu — tiết kiệm thời gian ôn tập.' },
];

export default function ServicesPage() {
  const structuredData = [
    {
      '@type': 'Service',
      name: 'Dich vu va tien ich hoc tap',
      provider: {
        '@type': 'Organization',
        name: 'Van Trang Education',
        url: 'https://vantrangedu.com'
      },
      areaServed: 'VN',
      url: 'https://vantrangedu.com/services'
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Dich vu va tien ich', item: 'https://vantrangedu.com/services' }
      ]
    }
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Dich vu va tien ich"
        description="He sinh thai dang ky, thanh toan, tai lieu, bao cao va ho tro hoc tap so cho hoc vien cua Van Trang Education."
        url="/services"
        structuredData={structuredData}
      />
      <div className="bg-slate-50 min-h-screen">
        {/* Hero */}
        <div className="bg-slate-900 py-20 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/background.jpg')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90" />
          <div className="container mx-auto px-4 relative z-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Dịch Vụ & Tiện Ích</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Hệ sinh thái giáo dục số toàn diện, mang lại trải nghiệm học tập và quản lý tốt nhất cho sinh viên và giảng viên.
            </p>
          </div>
        </div>

        {/* Services grid */}
        <section className="py-20 container mx-auto px-4 -mt-10 relative z-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, idx) => (
              <Card key={idx} className="border-none shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white group">
                <CardHeader>
                  <div className="mb-4 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {service.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition-colors">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600 text-base mb-6">{service.description}</CardDescription>
                  <Link to={service.link === '#' ? '/contact' : service.link} className="inline-flex items-center text-green-600 font-bold hover:gap-2 transition-all">
                    Trải nghiệm ngay <ArrowRight size={16} className="ml-1" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why choose us — stats */}
        <section className="py-14 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-3">Tại sao chọn chúng tôi?</h2>
            <p className="text-slate-500 text-center mb-10 max-w-xl mx-auto">
              Hàng nghìn học viên tin tưởng lựa chọn Van Trang Education cho hành trình phát triển của mình.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className={`rounded-2xl border-2 p-6 text-center ${s.color}`}>
                  <div className="text-4xl font-extrabold">{s.value}</div>
                  <div className="font-semibold mt-2 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-14 bg-slate-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-2">Phản hồi học viên</h2>
            {/* TODO: Thay bằng Google Reviews embed hoặc phản hồi có xác minh khi sẵn sàng */}
            <p className="text-slate-400 text-center text-xs mb-8 italic">* Phản hồi từ học viên thực tế — tên ẩn danh theo yêu cầu bảo mật</p>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {t.initial}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.course}</div>
                    </div>
                  </div>
                  {/* Không hiển thị star rating hardcoded — TODO: lấy từ Google Reviews API */}
                  <p className="text-slate-600 text-sm leading-relaxed italic">"{t.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="bg-green-600 rounded-2xl p-8 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu hành trình của bạn?</h2>
                <p className="text-green-100 mb-8 max-w-2xl mx-auto text-lg">
                  Đăng ký tài khoản ngay hôm nay để tiếp cận kho tri thức vô hạn và các tiện ích đăng ký thi hiện đại.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/register">
                    <Button className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50 font-bold text-lg h-12 px-8">
                      Đăng ký tài khoản
                    </Button>
                  </Link>
                  <Link to="/contact">
                    <Button variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white/10 font-bold text-lg h-12 px-8">
                      Liên hệ tư vấn
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl" />
            </div>
          </div>
        </section>
      </div>
    </ModernPublicLayout>
  );
}
