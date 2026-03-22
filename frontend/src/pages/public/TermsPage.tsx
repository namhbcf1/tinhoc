import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';

const sections = [
  {
    title: 'Pham vi ap dung',
    content: 'Dieu khoan nay ap dung cho viec truy cap website, su dung bieu mau dang ky, cong cu tra cuu va cac tinh nang cong khai do Van Trang Education cung cap.'
  },
  {
    title: 'Trach nhiem nguoi dung',
    content: 'Nguoi dung can cung cap thong tin trung thuc, khong su dung website de gay roi, thu thap du lieu trai phep, xam pham he thong hoac mao danh to chuc, ca nhan khac.'
  },
  {
    title: 'Noi dung va quyen so huu',
    content: 'Noi dung, thuong hieu, tai lieu va cau truc website thuoc quyen quan ly cua Van Trang Education hoac cac ben cap phep lien quan. Viec sao chep, phan phoi trai phep bi han che.'
  },
  {
    title: 'Dieu chinh dich vu',
    content: 'Chung toi co the cap nhat noi dung, route, chuc nang hoac dieu khoan khi can thiet de phu hop voi van hanh thuc te va yeu cau phap ly.'
  }
];

export default function TermsPage() {
  return (
    <ModernPublicLayout>
      <SEO
        title="Dieu khoan su dung"
        description="Dieu khoan su dung website va cac dich vu cong khai cua Van Trang Education."
        url="/terms"
        structuredData={{
          '@type': 'WebPage',
          name: 'Dieu khoan su dung',
          description: 'Dieu khoan su dung website cua Van Trang Education.',
          url: 'https://vantrangedu.com/terms'
        }}
      />

      <div className="min-h-screen bg-slate-50 py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600 mb-3">Van Trang Education</p>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Dieu Khoan Su Dung</h1>
            <p className="text-slate-600 text-lg leading-relaxed">
              Khi truy cap va su dung website, ban dong y tuan thu cac quy dinh duoi day trong pham vi tinh nang cong khai va cac bieu mau lien quan.
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-3">{section.title}</h2>
                <p className="text-slate-600 leading-7">{section.content}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </ModernPublicLayout>
  );
}
