import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Handshake, Globe2, Building, Users2, ArrowRight, CheckCircle } from 'lucide-react';

const stats = [
  { value: '50+', label: 'Đối tác chiến lược' },
  { value: '15+', label: 'Quốc gia hợp tác' },
  { value: '1000+', label: 'Sinh viên được kết nối' },
];

const partnerTypes = [
  {
    icon: Globe2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Hợp Tác Quốc Tế',
    desc: 'Liên kết với các trường đại học và tổ chức giáo dục uy tín trên toàn thế giới.',
    points: ['Chương trình trao đổi sinh viên', 'Học bổng du học nước ngoài', 'Công nhận tín chỉ quốc tế'],
  },
  {
    icon: Building,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Doanh Nghiệp',
    desc: 'Kết nối với các doanh nghiệp hàng đầu, tạo cơ hội thực tập và việc làm thực tế.',
    points: ['Thực tập có lương tại doanh nghiệp', 'Mentoring từ chuyên gia ngành', 'Ưu tiên tuyển dụng sau tốt nghiệp'],
  },
  {
    icon: Users2,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    title: 'Cựu Sinh Viên',
    desc: 'Mạng lưới cựu sinh viên thành đạt, sẵn sàng hỗ trợ và chia sẻ kinh nghiệm.',
    points: ['Hội thảo chia sẻ nghề nghiệp', 'Kết nối việc làm qua alumni', 'Quỹ học bổng cựu sinh viên'],
  },
];

const partners = [
  { name: 'British Council', type: 'Tổ chức quốc tế', logo: 'BC', color: 'bg-blue-600' },
  { name: 'IDP Education', type: 'Tổ chức quốc tế', logo: 'IDP', color: 'bg-indigo-600' },
  { name: 'Microsoft VN', type: 'Công nghệ', logo: 'MS', color: 'bg-cyan-600' },
  { name: 'FPT Software', type: 'Doanh nghiệp', logo: 'FPT', color: 'bg-emerald-600' },
  { name: 'Vingroup', type: 'Tập đoàn', logo: 'VIN', color: 'bg-red-600' },
  { name: 'Techcombank', type: 'Ngân hàng', logo: 'TCB', color: 'bg-orange-600' },
  { name: 'Samsung VN', type: 'Công nghệ', logo: 'SAM', color: 'bg-gray-600' },
  { name: 'LG Electronics', type: 'Công nghệ', logo: 'LG', color: 'bg-purple-600' },
];

export default function ConnectionsPage() {
  return (
    <ModernPublicLayout>
      <div className="bg-slate-50 min-h-screen">
        {/* Hero */}
        <div className="bg-slate-900 py-24 relative overflow-hidden text-white text-center">
          <div className="absolute inset-0 bg-green-900/20 mix-blend-overlay" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Handshake className="h-10 w-10 text-green-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-black mb-4 heading-gradient">Kết Nối & Hợp Tác</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Mở rộng mạng lưới đối tác toàn cầu, mang lại cơ hội học tập và việc làm tốt nhất cho sinh viên VanTrang.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-emerald-600 py-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-3 gap-6 text-white text-center">
              {stats.map((s, i) => (
                <div key={i}>
                  <div className="text-4xl font-black mb-1">{s.value}</div>
                  <div className="text-emerald-100 text-sm font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          {/* Partnership type cards */}
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-10">Hình Thức Hợp Tác</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {partnerTypes.map((pt, i) => (
              <div key={i} className={`glass-card rounded-2xl p-8 border ${pt.bg}`}>
                <div className={`w-14 h-14 rounded-xl border ${pt.bg} flex items-center justify-center mb-5`}>
                  <pt.icon className={`h-7 w-7 ${pt.color}`} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{pt.title}</h3>
                <p className="text-slate-600 text-sm mb-5">{pt.desc}</p>
                <ul className="space-y-2">
                  {pt.points.map((p, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Partner logos grid */}
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-10">Đối Tác Tiêu Biểu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
            {partners.map((p, i) => (
              <div key={i} className="glass-panel rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className={`${p.color} w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {p.logo}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-slate-900 py-16 text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-white mb-3">Trở Thành Đối Tác</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">Cùng chúng tôi xây dựng thế hệ nhân tài tương lai. Liên hệ ngay để khám phá cơ hội hợp tác.</p>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-10 rounded-xl inline-flex items-center gap-2">
              Liên hệ hợp tác <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
