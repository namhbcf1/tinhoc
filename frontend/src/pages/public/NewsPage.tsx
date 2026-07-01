// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Calendar, ArrowUpRight, TrendingUp, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import SEO from '../../components/common/SEO';
import api from '../../services/api';
import { formatDateVN } from '../../utils/dateUtils';
import CategoryFilter from '../../components/ui/CategoryFilter';
import { SkeletonNewsCard } from '../../components/ui/SkeletonLoader';
import LazyImage from '../../components/ui/LazyImage';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { gsap, useGSAP } from '../../lib/gsap';

interface NewsPost {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    category: string;
    status: string;
    featured_image?: string;
    created_at: string;
    publish_at?: string;
    updated_at?: string;
    author?: string;
    tags?: string;
}

export default function NewsPage() {
    const [posts, setPosts] = useState<NewsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 8;
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadPosts();
    }, []);

    useGSAP(() => {
        if (!container.current || loading || posts.length === 0) return;
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.from('.n-eyebrow', { y: 16, opacity: 0, duration: 0.6 })
            .from('.n-title span', { y: 28, opacity: 0, duration: 0.8, stagger: 0.07 }, '-=0.3')
            .from('.n-desc', { y: 14, opacity: 0, duration: 0.55 }, '-=0.4');

        gsap.from('.news-card', {
            scrollTrigger: { trigger: '.news-grid', start: 'top 85%' },
            y: 32,
            opacity: 0,
            duration: 0.7,
            stagger: 0.08,
        });

        gsap.from('.sidebar-widget', {
            scrollTrigger: { trigger: '.sidebar-container', start: 'top 85%' },
            y: 28,
            opacity: 0,
            duration: 0.7,
            stagger: 0.15,
        });
    }, { scope: container, dependencies: [loading, posts] });

    const loadPosts = async () => {
        try {
            setLoading(true);
            const response = await api.request('/posts?status=published');
            if (response.success) {
                setPosts(response.data || []);
            }
        } catch (err) {
            console.error('Error loading posts:', err);
            setError('Không thể tải tin tức');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => formatDateVN(dateString);

    const newsListSchema = posts.length > 0 ? {
        "@type": "CollectionPage",
        "name": "Tin tức & Sự kiện - Van Trang Education",
        "description": "Cập nhật lịch thi chứng chỉ, khóa học và sự kiện giáo dục mới nhất",
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": posts.slice(0, 10).map((item, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "item": {
                    "@type": "NewsArticle",
                    "headline": item.title,
                    "url": `https://vantrangedu.com/news/${item.slug || item.id}`,
                    "datePublished": item.publish_at || item.created_at,
                    "author": { "@type": "Organization", "name": "Van Trang Education" }
                }
            }))
        }
    } : null;

    const trendingPosts = useMemo(() => posts.slice(0, 5), [posts]);
    const allCategories = useMemo(
        () => [...new Set(posts.map(p => p.category).filter(Boolean))],
        [posts]
    );

    const filteredPosts = useMemo(
        () => selectedCategories.length > 0
            ? posts.filter(p => selectedCategories.includes(p.category))
            : posts,
        [posts, selectedCategories]
    );

    const featuredPost = filteredPosts[0];
    const restPosts = filteredPosts.slice(1);

    const indexLast = currentPage * postsPerPage;
    const indexFirst = indexLast - postsPerPage;
    const currentRestPosts = restPosts.slice(indexFirst, indexLast);
    const totalPages = Math.ceil(restPosts.length / postsPerPage);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 400, behavior: 'smooth' });
    };

    return (
        <ModernPublicLayout>
            <SEO
                title="Tin tức - Sự kiện"
                description="Cập nhật lịch thi điện tử, chứng chỉ Tin học, Tiếng Anh VSTEP, IELTS và mọi thông báo mới nhất từ Van Trang Education."
                url="/news"
                structuredData={newsListSchema}
            />

            <div ref={container} className="bg-[var(--vt-paper)] text-[var(--vt-ink)] overflow-hidden">
                {/* Hero */}
                <section className="vt-section !pb-10">
                    <div className="vt-container">
                        <div className="max-w-4xl">
                            <p className="n-eyebrow vt-eyebrow">Bản tin · Tri thức giáo dục</p>
                            <h1 className="n-title vt-display mt-5 text-[clamp(2.5rem,6.5vw,4.75rem)] leading-[1.02]">
                                <span className="block">Đọc chậm,</span>
                                <span className="block">
                                    để hiểu{' '}
                                    <span className="vt-display-italic text-[var(--vt-emerald-deep)]">sâu hơn.</span>
                                </span>
                            </h1>
                            <p className="n-desc vt-lead mt-6 max-w-2xl">
                                Lịch thi, hướng dẫn ôn luyện, câu chuyện học viên và những phân tích về chính sách
                                giáo dục — được Vân Trang chọn lọc và cập nhật thường xuyên.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="vt-fine-divider" aria-hidden="true" />

                {/* Body */}
                <section className="vt-section">
                    <div className="vt-container">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <SkeletonNewsCard key={i} />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="vt-paper-card max-w-xl mx-auto text-center !py-16">
                                <p className="vt-display text-2xl text-[var(--vt-ink)]"
                                   style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                    Tải không thành công
                                </p>
                                <p className="mt-3 text-[var(--vt-ink-60)]">{error}</p>
                                <button onClick={loadPosts} className="vt-btn vt-btn--primary mt-6">
                                    Thử lại
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
                                {/* Main column */}
                                <div className="lg:col-span-8">
                                    {allCategories.length > 0 && (
                                        <div className="mb-10 vt-paper-card !p-4 md:!p-5">
                                            <CategoryFilter
                                                categories={allCategories}
                                                selected={selectedCategories}
                                                onChange={(next) => { setSelectedCategories(next); setCurrentPage(1); }}
                                                className="custom-category-filter"
                                            />
                                            {selectedCategories.length > 0 && (
                                                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--vt-emerald-deep)] font-semibold">
                                                    {filteredPosts.length} bài viết được lọc
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Featured story */}
                                    {featuredPost && currentPage === 1 && (
                                        <Link
                                            to={`/news/${featuredPost.slug || featuredPost.id}`}
                                            className="news-card block group mb-10"
                                        >
                                            <article className="vt-paper-card !p-0 overflow-hidden">
                                                <div className="relative aspect-[16/9] overflow-hidden">
                                                    <LazyImage
                                                        src={featuredPost.featured_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop'}
                                                        alt={featuredPost.title}
                                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-[1200ms] ease-out"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--vt-ink)]/55 via-transparent to-transparent" />
                                                    <span className="absolute top-5 left-5 px-3 py-1 rounded-full bg-white/95 text-[var(--vt-emerald-deep)] text-[10px] font-bold uppercase tracking-[0.18em]">
                                                        {featuredPost.category || 'Bài viết'}
                                                    </span>
                                                </div>
                                                <div className="p-6 md:p-9">
                                                    <p className="vt-overline text-[10px] text-[var(--vt-ink-60)] flex items-center gap-2">
                                                        <Calendar size={12} className="text-[var(--vt-emerald-deep)]" />
                                                        {formatDate(featuredPost.publish_at || featuredPost.created_at)}
                                                    </p>
                                                    <h2 className="vt-display mt-3 text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.1] text-[var(--vt-ink)] group-hover:text-[var(--vt-emerald-deep)] transition-colors"
                                                        style={{ fontVariationSettings: '"opsz" 96, "SOFT" 40', fontWeight: 600 }}>
                                                        {featuredPost.title}
                                                    </h2>
                                                    {(featuredPost.excerpt || featuredPost.content) && (
                                                        <p className="mt-4 text-[var(--vt-ink-70)] leading-relaxed line-clamp-3">
                                                            {featuredPost.excerpt || featuredPost.content?.replace(/<[^>]+>/g, '').substring(0, 220) + '...'}
                                                        </p>
                                                    )}
                                                    <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--vt-emerald-deep)]">
                                                        Đọc bài đầy đủ
                                                        <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                                    </span>
                                                </div>
                                            </article>
                                        </Link>
                                    )}

                                    <div className="news-grid grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
                                        {currentRestPosts.length === 0 && selectedCategories.length > 0 ? (
                                            <div className="col-span-full vt-paper-card text-center !py-14">
                                                <p className="vt-display text-2xl text-[var(--vt-ink)]"
                                                   style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                                    Chưa có bài viết
                                                </p>
                                                <p className="mt-3 text-[var(--vt-ink-60)] text-sm">
                                                    Thử chọn danh mục khác hoặc xem toàn bộ.
                                                </p>
                                                <button
                                                    onClick={() => setSelectedCategories([])}
                                                    className="vt-btn vt-btn--ghost mt-5"
                                                >
                                                    Xem tất cả
                                                </button>
                                            </div>
                                        ) : currentRestPosts.map((item) => (
                                            <Link
                                                key={item.id}
                                                to={`/news/${item.slug || item.id}`}
                                                className="news-card block group h-full"
                                            >
                                                <article className="vt-paper-card !p-0 h-full flex flex-col overflow-hidden">
                                                    <div className="relative aspect-[16/10] overflow-hidden">
                                                        <LazyImage
                                                            src={item.featured_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop'}
                                                            alt={item.title}
                                                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[900ms] ease-out"
                                                        />
                                                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-[var(--vt-emerald-deep)] text-[10px] font-bold uppercase tracking-[0.16em]">
                                                            {item.category || 'Bài viết'}
                                                        </span>
                                                    </div>
                                                    <div className="p-5 md:p-6 flex flex-col flex-1">
                                                        <p className="vt-overline text-[10px] text-[var(--vt-ink-60)] flex items-center gap-2">
                                                            <Calendar size={11} className="text-[var(--vt-emerald-deep)]" />
                                                            {formatDate(item.publish_at || item.created_at)}
                                                        </p>
                                                        <h3 className="vt-display mt-2 text-lg md:text-xl leading-[1.2] text-[var(--vt-ink)] group-hover:text-[var(--vt-emerald-deep)] transition-colors line-clamp-3"
                                                            style={{ fontVariationSettings: '"opsz" 48, "SOFT" 40', fontWeight: 600 }}>
                                                            {item.title}
                                                        </h3>
                                                        <p className="mt-3 text-sm text-[var(--vt-ink-70)] leading-relaxed line-clamp-3 flex-1">
                                                            {item.excerpt || item.content?.replace(/<[^>]+>/g, '').substring(0, 140) + '...'}
                                                        </p>
                                                        <div className="mt-5 pt-4 border-t border-[var(--vt-line)] flex items-center justify-between text-xs">
                                                            <span className="text-[var(--vt-ink-50)] uppercase tracking-[0.14em] font-semibold">
                                                                Ban biên tập
                                                            </span>
                                                            <span className="text-[var(--vt-emerald-deep)] font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                                Đọc tiếp <ArrowRight size={12} />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </article>
                                            </Link>
                                        ))}
                                    </div>

                                    {totalPages > 1 && (
                                        <nav className="vt-paper-card !p-3 inline-flex items-center gap-1.5 mx-auto" aria-label="Phân trang">
                                            <button
                                                onClick={() => paginate(Math.max(1, currentPage - 1))}
                                                disabled={currentPage === 1}
                                                className="h-10 w-10 rounded-lg grid place-items-center text-[var(--vt-ink-60)] hover:text-[var(--vt-ink)] hover:bg-[var(--vt-paper-soft)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Trang trước"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>

                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;

                                                const active = currentPage === pageNum;
                                                return (
                                                    <button
                                                        key={pageNum}
                                                        onClick={() => paginate(pageNum)}
                                                        className={
                                                            active
                                                                ? 'h-10 w-10 rounded-lg grid place-items-center text-sm font-bold bg-[var(--vt-ink)] text-white'
                                                                : 'h-10 w-10 rounded-lg grid place-items-center text-sm font-semibold text-[var(--vt-ink-60)] hover:text-[var(--vt-ink)] hover:bg-[var(--vt-paper-soft)] transition-colors'
                                                        }
                                                    >
                                                        {pageNum}
                                                    </button>
                                                );
                                            })}

                                            <button
                                                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                                                disabled={currentPage === totalPages}
                                                className="h-10 w-10 rounded-lg grid place-items-center text-[var(--vt-ink-60)] hover:text-[var(--vt-ink)] hover:bg-[var(--vt-paper-soft)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Trang sau"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </nav>
                                    )}
                                </div>

                                {/* Sidebar */}
                                <aside className="lg:col-span-4 sidebar-container">
                                    <div className="lg:sticky lg:top-28 space-y-6">
                                        {/* Trending */}
                                        <div className="sidebar-widget vt-paper-card !p-0 overflow-hidden">
                                            <div className="px-6 py-5 border-b border-[var(--vt-line)] flex items-center justify-between">
                                                <p className="vt-eyebrow">Đang được đọc</p>
                                                <TrendingUp size={16} className="text-[var(--vt-emerald-deep)]" />
                                            </div>
                                            <ol className="divide-y divide-[var(--vt-line)]">
                                                {trendingPosts.map((post, idx) => (
                                                    <li key={post.id}>
                                                        <Link
                                                            to={`/news/${post.slug || post.id}`}
                                                            className="flex items-start gap-4 px-6 py-4 group hover:bg-[var(--vt-paper-soft)] transition-colors"
                                                        >
                                                            <span className="vt-display text-2xl text-[var(--vt-ink-30)] group-hover:text-[var(--vt-champagne-deep)] transition-colors leading-none"
                                                                  style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-semibold text-[var(--vt-ink)] group-hover:text-[var(--vt-emerald-deep)] transition-colors leading-snug line-clamp-3">
                                                                    {post.title}
                                                                </h4>
                                                                <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--vt-ink-50)]">
                                                                    {formatDate(post.publish_at || post.created_at)}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>

                                        {/* CTA */}
                                        <div className="sidebar-widget vt-ink-panel !p-7">
                                            <p className="vt-eyebrow !text-[var(--vt-champagne)]">Đăng ký tư vấn</p>
                                            <h3 className="vt-display mt-3 text-2xl text-white leading-[1.15]"
                                                style={{ fontVariationSettings: '"opsz" 72, "SOFT" 30', fontWeight: 600 }}>
                                                Lộ trình riêng cho mục tiêu của bạn
                                            </h3>
                                            <p className="mt-3 text-sm text-white/70 leading-relaxed">
                                                Để lại thông tin — chuyên viên sẽ gọi lại trong vòng 24 giờ với
                                                gợi ý cụ thể về lớp, lịch và học bổng.
                                            </p>
                                            <a href="https://zalo.me/0339244566" target="_blank" rel="noopener noreferrer" className="vt-btn vt-btn--accent mt-5 w-full justify-center">
                                                Nhận tư vấn miễn phí
                                                <ArrowUpRight size={14} />
                                            </a>
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        )}
                        <ScrollToTopButton />
                    </div>
                </section>
            </div>
        </ModernPublicLayout>
    );
}
