import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Building2, GraduationCap, Microscope, Users, BookOpen, Globe, Monitor, Phone } from 'lucide-react';
import SEO from '../../components/common/SEO';

const units = [
  {
    icon: Globe,
    color: 'bg-blue-100 text-blue-600',
    title: 'Trung tâm Đào tạo Quốc tế',
    description: 'Chuyên trách các chương trình liên kết quốc tế, đào tạo tiếng Anh chuẩn quốc tế và tư vấn du học.',
    functions: ['Liên kết quốc tế', 'Đào tạo ngoại ngữ', 'Tư vấn du học'],
  },
  {
    icon: Monitor,
    color: 'bg-green-100 text-green-600',
    title: 'Khoa Công Nghệ Thông Tin',
    description: 'Đào tạo kỹ sư CNTT chất lượng cao, nghiên cứu khoa học và chuyển giao công nghệ phần mềm.',
    functions: ['Kỹ sư CNTT', 'Nghiên cứu KH', 'Chuyển giao công nghệ'],
  },
  {
    icon: BookOpen,
    color: 'bg-orange-100 text-orange-600',
    title: 'Khoa Ngoại Ngữ',
    description: 'Đào tạo cử nhân ngôn ngữ Anh, Trung, Nhật, Hàn. Tổ chức các kỳ thi cấp chứng chỉ năng lực ngoại ngữ.',
    functions: ['Cử nhân ngôn ngữ', 'Chứng chỉ quốc tế', 'Nghiên cứu ngôn ngữ'],
  },
  {
    icon: GraduationCap,
    color: 'bg-purple-100 text-purple-600',
    title: 'Phòng Quản Lý Đào Tạo',
    description: 'Tham mưu, quản lý công tác đào tạo, tuyển sinh và tốt nghiệp của toàn trường.',
    functions: ['Tuyển sinh', 'Quản lý đào tạo', 'Tốt nghiệp'],
  },
  {
    icon: Microscope,
    color: 'bg-red-100 text-red-600',
    title: 'Trung Tâm R&D',
    description: 'Nghiên cứu khoa học, ứng dụng công nghệ mới vào giảng dạy và quản lý giáo dục.',
    functions: ['Nghiên cứu KH', 'Ứng dụng công nghệ', 'Đổi mới sáng tạo'],
  },
  {
    icon: Users,
    color: 'bg-teal-100 text-teal-600',
    title: 'Phòng Công Tác Sinh Viên',
    description: 'Hỗ trợ đời sống sinh viên, tư vấn tâm lý, học bổng và các hoạt động phong trào.',
    functions: ['Hỗ trợ đời sống', 'Tư vấn tâm lý', 'Học bổng'],
  },
];

export default function UnitsPage() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Cac don vi truc thuoc',
      description: 'Tong hop khoa, phong ban va trung tam truc thuoc trong he sinh thai Van Trang Education.',
      url: 'https://vantrangedu.com/units'
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Don vi truc thuoc', item: 'https://vantrangedu.com/units' }
      ]
    }
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Cac don vi truc thuoc"
        description="Gioi thieu cac khoa, phong ban va trung tam chuyen trach trong he thong Van Trang Education."
        url="/units"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-slate-50">
        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-block p-4 bg-white/10 rounded-full mb-6">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Các Đơn Vị Trực Thuộc</h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Hệ thống các khoa, phòng ban và trung tâm chuyên trách, cùng nhau kiến tạo môi trường giáo dục chất lượng cao tại Van Trang Education.
            </p>
            <div className="flex justify-center gap-8 mt-10">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-green-400">6</div>
                <div className="text-slate-400 text-sm mt-1">Đơn vị trực thuộc</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-green-400">200+</div>
                <div className="text-slate-400 text-sm mt-1">Cán bộ giảng viên</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-green-400">15+</div>
                <div className="text-slate-400 text-sm mt-1">Năm kinh nghiệm</div>
              </div>
            </div>
          </div>
        </div>

        {/* Units grid */}
        <div className="container mx-auto px-4 py-14">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((unit, idx) => {
              const Icon = unit.icon;
              return (
                <Card
                  key={idx}
                  className="border border-slate-100 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 bg-white group"
                >
                  <CardContent className="p-6">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${unit.color}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-green-600 transition-colors">
                      {unit.title}
                    </h3>
                    <p className="text-slate-600 text-sm mb-4 leading-relaxed">{unit.description}</p>
                    <ul className="space-y-1.5">
                      {unit.functions.map((fn) => (
                        <li key={fn} className="flex items-center gap-2 text-sm text-slate-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                          {fn}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-14 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-8 text-white text-center shadow-lg">
            <Phone className="h-8 w-8 mx-auto mb-3 text-green-200" />
            <h3 className="text-2xl font-bold mb-2">Liên hệ với từng đơn vị</h3>
            <p className="text-green-100 mb-4 max-w-lg mx-auto">
              Đội ngũ cán bộ của chúng tôi luôn sẵn sàng hỗ trợ và giải đáp mọi thắc mắc của bạn.
            </p>
            <a
              href="tel:0962445963"
              className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-3 rounded-xl hover:bg-green-50 transition-colors text-lg"
            >
              <Phone className="h-5 w-5" /> 096 244 5963
            </a>
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
