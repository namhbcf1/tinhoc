// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
  Star,
} from 'lucide-react';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import SEO from '../../components/common/SEO';
import api from '../../services/api';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'positive', label: 'Tốt' },
  { id: 'mixed', label: 'Trung tính' },
  { id: 'negative', label: 'Cần cải thiện' },
];

const SENTIMENT_PILL = {
  positive: {
    label: 'Tốt',
    cls: 'bg-[var(--vt-emerald-soft)] text-[var(--vt-emerald-deep)]',
  },
  mixed: {
    label: 'Trung tính',
    cls: 'bg-[var(--vt-champagne-soft)] text-[var(--vt-champagne-deep)]',
  },
  negative: {
    label: 'Cần cải thiện',
    cls: 'bg-red-100 text-red-700',
  },
};

function formatDate(value) {
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

function Rating({ rating, tone = 'dark' }) {
  const filled =
    tone === 'light'
      ? 'fill-[var(--vt-champagne)] text-[var(--vt-champagne)]'
      : 'fill-[var(--vt-champagne-deep)] text-[var(--vt-champagne-deep)]';
  const empty = tone === 'light' ? 'text-white/20' : 'text-[var(--vt-ink-20)]';
  return (
    <div className="flex items-center gap-0.5" aria-label={`Đánh giá ${rating} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`${rating}-${index}`}
          size={14}
          className={index < rating ? filled : empty}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  const stats = useMemo(
    () => ({
      positive: items.filter((item) => item.sentiment === 'positive').length,
      mixed: items.filter((item) => item.sentiment === 'mixed').length,
      negative: items.filter((item) => item.sentiment === 'negative').length,
    }),
    [items]
  );

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
        ? [
            {
              '@type': 'AggregateRating',
              ratingValue: averageRating,
              bestRating: 5,
              worstRating: 1,
              reviewCount: items.length,
            },
          ]
        : []),
      ...(items.length
        ? [
            {
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
            },
          ]
        : []),
    ];
  }, [items]);

  const load = async (nextFilter = filter) => {
    setLoading(true);
    setError(null);
    try {
      const response = await (api).getPublicStudentFeedbacks({
        limit: 24,
        sentiment: nextFilter === 'all' ? undefined : nextFilter,
      });
      const payload = response?.data ?? response ?? {};
      setItems(Array.isArray(payload?.items) ? payload.items : []);
    } catch (err) {
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

      {/* Hero — editorial ink panel */}
      <section className="relative overflow-hidden bg-[var(--vt-ink)] text-white">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[var(--vt-emerald)]/22 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full bg-[var(--vt-champagne)]/12 blur-3xl" />
        </div>

        <div className="relative vt-container py-20 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--vt-champagne)]">
              <ShieldCheck size={13} />
              Đã xác minh học viên thật
            </span>
            <h1
              className="vt-display mt-6 text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] text-white"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 40', fontWeight: 500 }}
            >
              Công khai{' '}
              <span className="vt-display-italic text-[var(--vt-champagne)]">đúng thực tế</span> —
              <br className="hidden sm:block" /> cả điểm tốt lẫn điểm cần cải thiện.
            </h1>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed text-white/75">
              Mỗi phản hồi trên trang này được gửi từ tài khoản học viên thật. Giáo viên review trước khi công khai và phải phản hồi rõ ràng với các góp ý trung tính hoặc chưa tốt.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login" className="vt-btn vt-btn--accent">
                Đăng nhập để gửi feedback
                <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                onClick={() => void load(filter)}
                className="vt-btn vt-btn--ghost border border-white/25 text-white hover:bg-white/10"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Tải lại
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4 max-w-xl">
              {[
                { label: 'Phản hồi tốt', value: stats.positive, tint: 'text-[var(--vt-emerald)]' },
                { label: 'Trung tính', value: stats.mixed, tint: 'text-[var(--vt-champagne)]' },
                { label: 'Cần cải thiện', value: stats.negative, tint: 'text-white' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <p
                    className={`vt-display text-3xl leading-none ${s.tint}`}
                    style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
                  >
                    {s.value}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/55 font-semibold">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="vt-fine-divider" aria-hidden="true" />
      </section>

      {/* Feedback list */}
      <section className="vt-section bg-[var(--vt-ivory)]">
        <div className="vt-container">
          {/* Filter toolbar */}
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="vt-eyebrow">Bộ lọc công khai</p>
              <h2
                className="vt-display mt-3 text-[clamp(1.5rem,2.6vw,2.25rem)] leading-tight text-[var(--vt-ink)]"
                style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}
              >
                Danh sách feedback đã{' '}
                <span className="vt-display-italic text-[var(--vt-emerald-deep)]">được review.</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={
                      active
                        ? 'rounded-full px-4 py-2 text-sm font-bold bg-[var(--vt-ink)] text-white shadow-[var(--vt-shadow-press)] transition-colors'
                        : 'rounded-full px-4 py-2 text-sm font-semibold border border-[var(--vt-line-strong)] bg-white text-[var(--vt-ink-70)] hover:border-[var(--vt-emerald)] hover:text-[var(--vt-emerald-deep)] transition-colors'
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200/70 bg-red-50 px-5 py-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid gap-5 lg:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-56 rounded-[var(--vt-radius-lg)] bg-white/70 border border-[var(--vt-line)] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !items.length && (
            <div className="vt-paper-card px-6 py-16 text-center border-dashed">
              <MessageSquareQuote size={36} className="mx-auto text-[var(--vt-ink-30)]" />
              <h3
                className="vt-display mt-5 text-xl text-[var(--vt-ink)]"
                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
              >
                Chưa có feedback ở nhóm này
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--vt-ink-60)] leading-relaxed">
                Trang chỉ hiển thị phản hồi đã được review và xác minh. Khi có phản hồi phù hợp, nội dung sẽ xuất hiện tại đây thay vì dùng dữ liệu minh hoạ.
              </p>
            </div>
          )}

          {/* Feedback list */}
          {!loading && items.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              {items.map((item) => {
                const pill = SENTIMENT_PILL[item.sentiment] || SENTIMENT_PILL.mixed;
                return (
                  <article
                    key={item.id}
                    className="vt-paper-card p-7 flex flex-col gap-4"
                  >
                    <header className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="vt-overline text-[10px] text-[var(--vt-emerald-deep)]">
                          {item.class_name}
                        </p>
                        <h3
                          className="vt-display mt-2 text-lg md:text-xl text-[var(--vt-ink)] leading-snug"
                          style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}
                        >
                          {item.title}
                        </h3>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${pill.cls}`}
                      >
                        {pill.label}
                      </span>
                    </header>

                    <div className="flex items-center gap-3">
                      <Rating rating={Number(item.rating || 0)} />
                      <span className="text-xs text-[var(--vt-ink-60)] font-medium">
                        {item.student_name}
                      </span>
                    </div>

                    <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--vt-ink-80)]">
                      {item.content}
                    </p>

                    {item.teacher_response && (
                      <div className="mt-1 rounded-2xl border border-[var(--vt-emerald-soft)] bg-[var(--vt-emerald-soft)] px-4 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--vt-emerald-deep)]">
                          <CheckCircle2 size={14} />
                          Phản hồi chính thức từ giảng viên
                        </div>
                        <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--vt-ink-80)]">
                          {item.teacher_response}
                        </div>
                      </div>
                    )}

                    <footer className="text-[11px] uppercase tracking-[0.12em] text-[var(--vt-ink-50)] font-semibold">
                      Công khai · {formatDate(item.public_at)}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </ModernPublicLayout>
  );
}
