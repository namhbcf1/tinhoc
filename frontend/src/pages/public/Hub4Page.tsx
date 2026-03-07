import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Sparkles, Bot, Library, MonitorSmartphone, FlaskConical, BarChart3, Cloud, ArrowRight, Users, Activity, Layers } from 'lucide-react';

const features = [
  { icon: Bot, color: 'text-green-400', border: 'hover:border-green-500/50', title: 'AI Chatbot', desc: 'Trợ lý ảo hỗ trợ học tập 24/7, giải đáp thắc mắc và tư vấn lộ trình học tập cá nhân hóa.', link: 'Khám phá' },
  { icon: Library, color: 'text-blue-400', border: 'hover:border-blue-500/50', title: 'Smart Library', desc: 'Thư viện số thông minh với hàng triệu tài liệu, giáo trình điện tử và bài giảng video chất lượng cao.', link: 'Khám phá' },
  { icon: MonitorSmartphone, color: 'text-purple-400', border: 'hover:border-purple-500/50', title: 'Learning Hub', desc: 'Không gian học tập tương tác, trang bị thiết bị công nghệ cao và môi trường cộng tác thời gian thực.', link: 'Khám phá' },
  { icon: FlaskConical, color: 'text-cyan-400', border: 'hover:border-cyan-500/50', title: 'Virtual Lab', desc: 'Phòng thí nghiệm ảo cho phép thực hành thí nghiệm khoa học và kỹ thuật ngay trên trình duyệt.', link: 'Khám phá' },
  { icon: BarChart3, color: 'text-orange-400', border: 'hover:border-orange-500/50', title: 'Data Analytics', desc: 'Nền tảng phân tích dữ liệu học tập, cung cấp thông tin chi tiết về tiến độ và hiệu quả học tập.', link: 'Khám phá' },
  { icon: Cloud, color: 'text-pink-400', border: 'hover:border-pink-500/50', title: 'Cloud Platform', desc: 'Hạ tầng đám mây đảm bảo truy cập nhanh, ổn định và bảo mật mọi lúc mọi nơi trên toàn cầu.', link: 'Khám phá' },
];

const techTags = ['Python', 'TensorFlow', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Cloudflare', 'WebRTC'];

const stats = [
  { icon: Users, value: '10,000+', label: 'Người dùng hoạt động' },
  { icon: Activity, value: '99.9%', label: 'Uptime đảm bảo' },
  { icon: Layers, value: '50+', label: 'Tính năng sẵn sàng' },
];

export default function Hub4Page() {
  return (
    <ModernPublicLayout>
      <div className="bg-slate-950 min-h-screen">
        {/* Hero */}
        <div className="py-28 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/40 via-slate-900 to-slate-950" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-60" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-green-400 text-sm font-mono mb-8">
              <Sparkles size={14} /> INNOVATION CENTER
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 mb-6 tracking-tight">
              HUB 4.0
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              Trung tâm đổi mới sáng tạo và chuyển đổi số. Nơi trải nghiệm các công nghệ giáo dục tiên tiến nhất dành cho sinh viên VanTrang.
            </p>
            <Button className="bg-green-600 hover:bg-green-500 text-white font-bold h-12 px-10 rounded-xl inline-flex items-center gap-2 shadow-lg shadow-green-900/30">
              Khám phá ngay <ArrowRight size={16} />
            </Button>
          </div>
        </div>

        {/* 6 Feature Cards */}
        <div className="container mx-auto px-4 pb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Tính Năng Nổi Bật</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {features.map((f, i) => (
              <Card key={i} className={`bg-slate-900 border border-slate-800 ${f.border} transition-colors group`}>
                <CardContent className="p-7">
                  <f.icon className={`h-10 w-10 ${f.color} mb-5`} />
                  <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm mb-5 leading-relaxed">{f.desc}</p>
                  <button className={`text-sm font-semibold ${f.color} inline-flex items-center gap-1 hover:gap-2 transition-all`}>
                    {f.link} <ArrowRight size={14} />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tech tags */}
          <div className="glass-panel rounded-2xl p-8 mb-14 bg-slate-900/50 border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-5 text-center">Công Nghệ Nổi Bật</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {techTags.map((tag, i) => (
                <span key={i} className="px-5 py-2 rounded-full bg-slate-800 border border-slate-700 text-green-400 text-sm font-mono font-semibold hover:border-green-500/50 hover:bg-slate-700 transition-colors cursor-default">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-14">
            {stats.map((s, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-7 text-center">
                <s.icon className="h-7 w-7 text-green-400 mx-auto mb-3" />
                <div className="text-4xl font-black text-white mb-1">{s.value}</div>
                <div className="text-slate-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 p-10 text-center">
            <h2 className="text-3xl font-black text-white mb-3">Bắt đầu ngay hôm nay</h2>
            <p className="text-green-100 mb-7 max-w-lg mx-auto">Tham gia HUB 4.0 và trải nghiệm tương lai của giáo dục công nghệ cao.</p>
            <Button className="bg-white text-green-700 hover:bg-green-50 font-bold h-12 px-10 rounded-xl inline-flex items-center gap-2">
              Đăng ký miễn phí <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
