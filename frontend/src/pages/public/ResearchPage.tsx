import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Microscope, Atom, ArrowRight, BookOpen, FlaskConical } from 'lucide-react';
import SEO from '../../components/common/SEO';

const projects = [
  {
    category: 'Công nghệ giáo dục',
    status: 'Đang triển khai',
    statusColor: 'bg-blue-100 text-blue-700',
    title: 'Ứng dụng AI trong giảng dạy ngoại ngữ',
    description: 'Nghiên cứu và phát triển trợ lý ảo hỗ trợ sinh viên luyện phát âm và giao tiếp tiếng Anh tự động bằng mô hình ngôn ngữ lớn.',
  },
  {
    category: 'Phần mềm',
    status: 'Đã nghiệm thu',
    statusColor: 'bg-green-100 text-green-700',
    title: 'Hệ thống thi trắc nghiệm trực tuyến bảo mật cao',
    description: 'Xây dựng nền tảng thi trực tuyến hỗ trợ hàng nghìn thí sinh đồng thời, tích hợp chống gian lận thông minh.',
  },
  {
    category: 'Sư phạm',
    status: 'Công bố quốc tế',
    statusColor: 'bg-purple-100 text-purple-700',
    title: 'Phương pháp giảng dạy tiếng Anh chuyên ngành kỹ thuật',
    description: 'Đề xuất phương pháp tiếp cận mới trong giảng dạy tiếng Anh cho sinh viên khối kỹ thuật, đã đăng trên tạp chí SCOPUS.',
  },
];

const areas = ['AI giáo dục', 'NLP', 'EdTech', 'Phương pháp sư phạm', 'Thi cử trực tuyến', 'Phân tích dữ liệu học tập'];

const publications = [
  {
    title: 'Automated Pronunciation Assessment Using Deep Learning for Vietnamese EFL Learners',
    journal: 'Computers & Education',
    year: '2024',
    author: 'Nguyễn Văn An, Trần Thị Bích',
  },
  {
    title: 'A Framework for Online Exam Security in Higher Education Institutions',
    journal: 'Journal of Educational Technology',
    year: '2023',
    author: 'Lê Quang Minh',
  },
  {
    title: 'ESP Teaching Approaches for Engineering Students: A Comparative Study',
    journal: 'English for Specific Purposes',
    year: '2023',
    author: 'Phạm Hồng Nhung, Vũ Đức Thắng',
  },
];

export default function ResearchPage() {
  const structuredData = [
    {
      '@type': 'WebPage',
      name: 'Nghien cuu khoa hoc',
      description: 'Hoat dong nghien cuu, cong bo va ung dung cong nghe giao duc tai Van Trang Education.',
      url: 'https://vantrangedu.com/research'
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chu', item: 'https://vantrangedu.com/' },
        { '@type': 'ListItem', position: 2, name: 'Nghien cuu khoa hoc', item: 'https://vantrangedu.com/research' }
      ]
    }
  ];

  return (
    <ModernPublicLayout>
      <SEO
        title="Nghien cuu khoa hoc"
        description="Tong hop de tai, cong bo va huong nghien cuu ve AI giao duc, EdTech va doi moi sang tao cua Van Trang Education."
        url="/research"
        structuredData={structuredData}
      />
      <div className="bg-slate-50 min-h-screen">
        {/* Hero */}
        <div className="bg-white border-b py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-block p-4 bg-green-100 rounded-full mb-6">
              <Microscope className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Nghiên Cứu Khoa Học</h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Thúc đẩy đổi mới sáng tạo và ứng dụng công nghệ thông qua các đề tài nghiên cứu mang tính thực tiễn cao tại Van Trang Education.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Stats sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl text-white p-8 shadow-lg space-y-8">
                <div>
                  <div className="text-5xl font-extrabold">25+</div>
                  <div className="text-green-100 font-medium mt-1">Đề tài cấp Bộ / Trường</div>
                </div>
                <div>
                  <div className="text-5xl font-extrabold">12</div>
                  <div className="text-green-100 font-medium mt-1">Bài báo quốc tế</div>
                </div>
                <div>
                  <div className="text-5xl font-extrabold">08</div>
                  <div className="text-green-100 font-medium mt-1">Giải thưởng KHCN</div>
                </div>
              </div>

              {/* Research areas */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-green-600" /> Lĩnh vực nghiên cứu
                </h3>
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <span key={a} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Atom className="text-green-600" /> Đề tài nổi bật
              </h2>

              {projects.map((proj, idx) => (
                <Card key={idx} className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3 gap-2 flex-wrap">
                      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 font-semibold">
                        {proj.category}
                      </Badge>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${proj.statusColor}`}>
                        {proj.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{proj.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{proj.description}</p>
                  </CardContent>
                </Card>
              ))}

              {/* Publications */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" /> Công bố khoa học gần đây
                </h3>
                <div className="space-y-4">
                  {publications.map((pub, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{pub.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="text-green-600 font-medium">{pub.journal}</span> · {pub.year} · {pub.author}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
