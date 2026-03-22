import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Calendar, User, ArrowRight, TrendingUp, Bell, Loader2 } from 'lucide-react';
import SEO from '../../components/common/SEO';
import api from '../../services/api';
import { formatDateVN } from '../../utils/dateUtils';
import CategoryFilter from '../../components/ui/CategoryFilter';
import { SkeletonNewsCard } from '../../components/ui/SkeletonLoader';
import LazyImage from '../../components/ui/LazyImage';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap';

export default function NewsPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const container = useRef();

    useEffect(() => {
        loadPosts();
    }, []);

    useGSAP(() => {
        if (!loading && posts.length > 0) {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            tl.fromTo('.hero-content > *',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.15 }
            );

            gsap.fromTo('.news-card',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'back.out(1.2)',
                    scrollTrigger: {
                        trigger: '.news-grid',
                        start: 'top 85%'
                    }
                }
            );

            gsap.fromTo('.sidebar-widget',
                { x: 30, opacity: 0 },
                {
                    x: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out',
                    scrollTrigger: {
                        trigger: '.sidebar-container',
                        start: 'top 85%'
                    }
                }
            );
        }
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

    const formatDate = (dateString) => {
        return formatDateVN(dateString);
    };

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

    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 8;

    const featuredPosts = posts.slice(0, 4);
    const trendingPosts = posts.slice(0, 5);
    const allCategories = [...new Set(posts.map(p => p.category).filter(Boolean))];

    const filteredPosts = selectedCategories.length > 0
        ? posts.filter(p => selectedCategories.includes(p.category))
        : posts;

    const filteredIndexOfLastPost = currentPage * postsPerPage;
    const filteredIndexOfFirstPost = filteredIndexOfLastPost - postsPerPage;
    const currentFilteredPosts = filteredPosts.slice(filteredIndexOfFirstPost, filteredIndexOfLastPost);
    const totalFilteredPages = Math.ceil(filteredPosts.length / postsPerPage);

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
            <div ref={container} className="bg-slate-50 min-h-screen pb-24 relative overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-[120px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

                {/* Hero Section */}
                <div className="relative pt-32 pb-20 border-b border-slate-200 backdrop-blur-sm bg-white/40">
                    <div className="container mx-auto px-4 hero-content text-center relative z-10">
                        <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold tracking-wide uppercase mb-6 shadow-sm border border-emerald-200">Bản Tin Giáo Dục 4.0</span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">Cập Nhật <span className="heading-gradient">Hằng Ngày</span></h1>
                        <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto font-light leading-relaxed">
                            Thông tin mới nhất về lịch thi chứng chỉ quy chuẩn quốc tế, định hướng đào tạo cùng các hoạt động ngoại khóa.
                        </p>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-16 relative z-20">
                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <SkeletonNewsCard key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 glass-panel max-w-2xl mx-auto rounded-3xl bg-white/60">
                            <p className="text-rose-500 mb-6 font-bold text-xl">{error}</p>
                            <Button onClick={loadPosts} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-12 shadow-lg">
                                Khởi Tạo Kết Nối Lại
                            </Button>
                        </div>
                    ) : (
                        <div className="grid lg:grid-cols-12 gap-10 max-w-7xl mx-auto">
                            {/* Main Content Area */}
                            <div className="lg:col-span-8">
                                {allCategories.length > 0 && (
                                    <div className="mb-10 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-28 sm:top-32 z-30">
                                        <CategoryFilter
                                            categories={allCategories}
                                            selected={selectedCategories}
                                            onChange={setSelectedCategories}
                                            className="custom-category-filter"
                                        />
                                        {selectedCategories.length > 0 && (
                                            <p className="mt-4 text-sm font-medium text-emerald-600 flex items-center gap-2">
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">{filteredPosts.length}</Badge> Kết quả được lọc
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="news-grid grid md:grid-cols-2 gap-8 mb-16">
                                    {currentFilteredPosts.map((item) => (
                                        <Link key={item.id} to={`/news/${item.slug || item.id}`} className="block group h-full">
                                            <Card className="news-card glass-card h-full border-0 shadow-md hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-500 bg-white/80 rounded-[2rem] overflow-hidden flex flex-col transform group-hover:-translate-y-2">
                                                <div className="h-40 sm:h-48 md:h-56 overflow-hidden relative">
                                                    <LazyImage
                                                        src={item.featured_image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop'}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60"></div>
                                                    <div className="absolute top-4 left-4 z-10">
                                                        <Badge className="bg-white/90 text-emerald-700 font-bold backdrop-blur-md shadow-sm border-0 uppercase tracking-wider text-[10px] px-3 py-1">
                                                            {item.category || 'Thông cáo'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <CardContent className="p-6 md:p-8 flex flex-col flex-1 relative bg-gradient-to-b from-transparent to-white/50">
                                                    <div className="flex items-center gap-3 mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                        <Calendar size={14} className="text-emerald-500" /> {formatDate(item.publish_at || item.created_at)}
                                                    </div>
                                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors line-clamp-3 leading-tight tracking-tight">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-1 leading-relaxed font-light">
                                                        {item.excerpt || item.content?.replace(/<[^>]+>/g, '').substring(0, 150) + '...'}
                                                    </p>
                                                    <div className="pt-5 border-t border-slate-200/60 flex items-center justify-between text-sm mt-auto">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-200">VT</div>
                                                            <span className="text-slate-800 font-semibold text-xs tracking-wide">Ban Biên Tập</span>
                                                        </div>
                                                        <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                                                            Đọc tiếp <ArrowRight size={14} />
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>

                                {/* Pagination Container */}
                                {totalFilteredPages > 1 && (
                                    <div className="glass-panel p-4 rounded-2xl bg-white/60 flex justify-center items-center gap-2 max-w-max mx-auto border-0 shadow-sm">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => paginate(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="h-12 w-12 sm:h-10 sm:w-10 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                        >
                                            <span className="text-xl leading-none">&lsaquo;</span>
                                        </Button>

                                        {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalFilteredPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalFilteredPages - 2) {
                                                pageNum = totalFilteredPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? "default" : "ghost"}
                                                    className={`h-12 w-12 sm:h-10 sm:w-10 font-bold rounded-xl text-md transition-all ${currentPage === pageNum ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                    onClick={() => paginate(pageNum)}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => paginate(Math.min(totalFilteredPages, currentPage + 1))}
                                            disabled={currentPage === totalFilteredPages}
                                            className="h-12 w-12 sm:h-10 sm:w-10 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                                        >
                                            <span className="text-xl leading-none">&rsaquo;</span>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar Area */}
                            <div className="lg:col-span-4 sidebar-container">
                                <div className="sticky top-28 space-y-8">
                                    {/* Trending Posts Widget */}
                                    <div className="sidebar-widget glass-panel bg-white/80 rounded-[2rem] shadow-lg border-0 overflow-hidden">
                                        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                            <h3 className="font-extrabold text-xl flex items-center gap-3 text-slate-900 tracking-tight">
                                                <TrendingUp className="text-rose-500" size={24} /> Tin Tức Nổi Bật
                                            </h3>
                                        </div>
                                        <div className="divide-y divide-slate-100/60 p-2">
                                            {trendingPosts.map((post, idx) => (
                                                <Link key={post.id} to={`/news/${post.slug || post.id}`} className="flex items-start gap-4 p-4 group hover:bg-emerald-50/50 transition-colors rounded-xl">
                                                    <div className="text-2xl font-black text-slate-200 group-hover:text-emerald-200 transition-colors pointer-events-none mt-1">0{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm mb-2 group-hover:text-emerald-700 line-clamp-3 leading-snug">
                                                            {post.title}
                                                        </h4>
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-emerald-500 transition-colors">
                                                            {formatDate(post.publish_at || post.created_at)}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA Widget */}
                                    <div className="sidebar-widget rounded-[2.5rem] overflow-hidden shadow-2xl shadow-emerald-900/20 relative bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-10 text-center transform transition-transform hover:scale-[1.02]">
                                        <div className="absolute -top-10 -right-10 p-3 opacity-10">
                                            <Bell size={200} />
                                        </div>
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/30">
                                            <Calendar size={32} className="text-emerald-50" />
                                        </div>
                                        <h3 className="font-extrabold text-2xl mb-4 relative z-10 tracking-tight shadow-sm">Đăng ký tư vấn Lộ trình</h3>
                                        <p className="text-emerald-100 text-sm mb-8 relative z-10 leading-relaxed font-light">
                                            Để lại thông tin để hệ thống xếp lịch chuyên gia tư vấn miễn phí về lộ trình và các suất học bổng giới hạn.
                                        </p>
                                        <Link to="/contact" className="relative z-10 block">
                                            <Button className="w-full bg-white text-emerald-800 hover:bg-emerald-50 font-bold h-14 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                                                NHẬN LỊCH TƯ VẤN NGAY
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <ScrollToTopButton />
                </div>
            </div>
        </ModernPublicLayout>
    );
}
