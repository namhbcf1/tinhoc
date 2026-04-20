import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageSquareQuote, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'positive', label: 'Tốt' },
  { id: 'mixed', label: 'Trung tính' },
  { id: 'negative', label: 'Cần cải thiện' },
];

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function Rating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`${rating}-${index}`}
          size={15}
          className={index < rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const stats = useMemo(() => ({
    positive: items.filter((item) => item.sentiment === 'positive').length,
    mixed: items.filter((item) => item.sentiment === 'mixed').length,
    negative: items.filter((item) => item.sentiment === 'negative').length,
  }), [items]);

  const feedbackStructuredData = useMemo(() => {
    const totalRating = items.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    const averageRating = items.length ? Number((totalRating / items.length).toFixed(1)) : undefined;

    return [
      {
        '@type': 'CollectionPage',
        name: 'Feedback học viên - VanTrangEdu',
        description: 'Phản hồi thật từ học viên đã xác minh, được review trước khi công khai trên VanTrangEdu.',
        url: 'https://vantrangedu.com/feedback',
      },
      ...(averageRating
        ? [{
            '@type': 'AggregateRating',
            ratingValue: averageRating,
            bestRating: 5,
            worstRating: 1,
            reviewCount: items.length,
          }]
        : []),
      ...(items.length
        ? [{
            '@type': 'ItemList',
            itemListElement: items.slice(0, 10).map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Review',
                name: item.title,
                reviewBody: item.content,
                datePublished: item.public_at,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: Number(item.rating || 0),
                  bestRating: 5,
                  worstRating: 1,
                },
                author: {
                  '@type': 'Person',
                  name: item.student_name || 'Học viên VanTrangEdu',
                },
                itemReviewed: {
                  '@type': 'Course',
                  name: item.class_name || 'Khóa học VanTrangEdu',
                },
              },
            })),
          }]
        : []),
    ];
  }, [items]);

  const load = async (nextFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await (api as any).getPublicStudentFeedbacks({
        limit: 24,
        sentiment: nextFilter === 'all' ? undefined : nextFilter,
      });
      const payload = response?.data ?? response ?? {};
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || 'Không thể tải feedback công khai.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(filter);
  }, [filter]);

  return (
    <ModernPublicLayout>
      <SEO
        title="Feedback học viên"
        description="Phản hồi thật từ học viên đã xác minh, được giáo viên review và công khai minh bạch trên VanTrangEdu."
        url="/feedback"
        structuredData={feedbackStructuredData}
      />

      <section className="relative overflow-hidden bg-slate-950 pt-28 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.25),_transparent_35%),radial-gradient(circle_at_left,_rgba(59,130,246,0.18),_transparent_30%)]" />
        <div className="container relative z-10 mx-auto px-4 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-emerald-200">
              <ShieldCheck size={15} />
              Feedback thật từ học viên đã xác minh
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
              Công khai đúng thực tế,
              <span className="block text-emerald-300">đánh giá cả điểm tốt lẫn điểm cần cải thiện.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
              Mỗi phản hồi trên trang này đều được gửi từ tài khoản học viên thật. Giáo viên review trước khi công khai và phải phản hồi rõ ràng với các góp ý trung tính hoặc chưa tốt.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white">
                  Đăng nhập để gửi feedback
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => void load(filter)}
                className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                <RefreshCw size={15} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                Tải lại
              </button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-slate-300">Feedback tốt</div>
                <div className="mt-2 text-3xl font-black text-white">{stats.positive}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-slate-300">Phản hồi trung tính</div>
                <div className="mt-2 text-3xl font-black text-white">{stats.mixed}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-slate-300">Cần cải thiện</div>
                <div className="mt-2 text-3xl font-black text-white">{stats.negative}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7faf9] py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Bộ lọc công khai</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Danh sách feedback đã được review</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    filter === item.id
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-56 rounded-[2rem] bg-white animate-pulse" />
              ))}
            </div>
          ) : null}

          {!loading && !error && !items.length ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <MessageSquareQuote size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-xl font-black text-slate-900">Hiện chưa có feedback công khai ở nhóm này</h3>
              <p className="mx-auto mt-2 max-w-xl text-slate-500">
                Trang chỉ hiển thị phản hồi đã được review và xác minh. Khi có phản hồi phù hợp, nội dung sẽ xuất hiện tại đây thay vì dùng dữ liệu minh hoạ.
              </p>
            </div>
          ) : null}

          {!loading && items.length ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {items.map((item) => (
                <article key={item.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wide text-emerald-700">{item.class_name}</div>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">{item.title}</h3>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      {item.sentiment === 'positive' ? 'Tốt' : item.sentiment === 'mixed' ? 'Trung tính' : 'Cần cải thiện'}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Rating rating={Number(item.rating || 0)} />
                    <span className="text-sm font-semibold text-slate-500">{item.student_name}</span>
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.content}</p>

                  {item.teacher_response ? (
                    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                        <CheckCircle2 size={16} />
                        Phản hồi chính thức từ giáo viên / trung tâm
                      </div>
                      <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.teacher_response}</div>
                    </div>
                  ) : null}

                  <div className="mt-5 text-xs font-semibold text-slate-400">
                    Review công khai: {formatDate(item.public_at)}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </ModernPublicLayout>
  );
}
