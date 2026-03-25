import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Calendar, Play, BookOpen, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import SEO from '../../components/common/SEO';
import api from '../../services/api';
import { formatDateVN } from '../../utils/dateUtils';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { gsap, useGSAP } from '../../lib/gsap';

// Chuyển đổi YouTube URL → embed URL
function getYouTubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    if (url.includes('youtube.com/embed/')) return url;
    return null;
}

function getYouTubeThumbnail(url: string): string | null {
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`;
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return `https://img.youtube.com/vi/${embedMatch[1]}/hqdefault.jpg`;
    return null;
}

function isDirectVideo(url: string): boolean {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

// Card hiển thị 1 bài hướng dẫn
function GuideCard({ post }: { post: any }) {
    const [playing, setPlaying] = useState(false);
    const embedUrl = post.video_url ? getYouTubeEmbedUrl(post.video_url) : null;
    const thumbnail = post.video_url ? getYouTubeThumbnail(post.video_url) : null;
    const directVideo = post.video_url && isDirectVideo(post.video_url) ? post.video_url : null;
    const hasVideo = !!(embedUrl || directVideo);
    const coverImg = post.featured_image || thumbnail;

    return (
        <div className="guide-card bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col">
            {/* Video / Thumbnail */}
            <div className="relative aspect-video bg-slate-900 overflow-hidden">
                {playing && embedUrl ? (
                    <iframe
                        src={`${embedUrl}?autoplay=1`}
                        title={post.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                    />
                ) : playing && directVideo ? (
                    <video
                        src={directVideo}
                        controls
                        autoPlay
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                ) : (
                    <>
                        {coverImg ? (
                            <img
                                src={coverImg}
                                alt={post.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700">
                                <BookOpen size={48} className="text-white/60" />
                            </div>
                        )}
                        {hasVideo && (
                            <button
                                onClick={() => setPlaying(true)}
                                className="absolute inset-0 flex items-center justify-center group"
                                aria-label="Phát video"
                            >
                                <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
                                    <Play size={28} className="text-emerald-600 ml-1" fill="currentColor" />
                                </div>
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 text-base leading-snug mb-2 line-clamp-2">{post.title}</h3>
                {post.excerpt && (
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">{post.excerpt}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={13} />
                        {formatDateVN(post.publish_at || post.created_at)}
                    </span>
                    <Link
                        to={`/news/${post.slug || post.id}`}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                        Đọc thêm →
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function GuidesPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const postsPerPage = 9;
    const container = useRef(null);

    useEffect(() => {
        loadGuides();
    }, []);

    useGSAP(() => {
        if (!loading && posts.length > 0) {
            gsap.fromTo('.guide-card',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: 'back.out(1.2)' }
            );
        }
    }, { scope: container, dependencies: [loading, posts] });

    const loadGuides = async () => {
        try {
            setLoading(true);
            const response = await api.request('/posts?category=huongdan&status=published');
            if (response.success) {
                setPosts(response.data || []);
            }
        } catch (err) {
            console.error('Error loading guides:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(posts.length / postsPerPage);
    const currentPosts = posts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

    const paginate = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    return (
        <ModernPublicLayout>
            <SEO
                title="Hướng dẫn - Video clip"
                description="Video hướng dẫn đăng ký thi, nộp hồ sơ, sử dụng hệ thống và các clip học thuật từ Van Trang Education."
                url="/guides"
            />
            <div ref={container} className="bg-slate-50 min-h-screen pb-24">
                {/* Hero */}
                <div className="relative pt-32 pb-16 bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-700 text-white">
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className="container mx-auto px-4 text-center relative z-10">
                        <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/20 text-white text-sm font-semibold mb-5 border border-white/30">
                            <Play size={14} fill="white" /> Video hướng dẫn
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-5 tracking-tight">
                            Hướng Dẫn <span className="text-yellow-300">Chi Tiết</span>
                        </h1>
                        <p className="text-lg md:text-xl text-emerald-100 max-w-2xl mx-auto font-light">
                            Clip hướng dẫn đăng ký thi, nộp hồ sơ và sử dụng hệ thống dành cho học viên
                        </p>
                    </div>
                </div>

                {/* Grid */}
                <div className="container mx-auto px-4 py-14">
                    {loading ? (
                        <div className="flex justify-center items-center py-24">
                            <Loader2 className="animate-spin text-emerald-600" size={40} />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-24">
                            <Play size={56} className="text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-500">Chưa có video hướng dẫn</h3>
                            <p className="text-slate-400 mt-2">Nội dung sẽ được cập nhật sớm</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {currentPosts.map((post: any) => (
                                    <GuideCard key={post.id} post={post} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-2 mt-12">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => paginate(page)}
                                            className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all ${
                                                page === currentPage
                                                    ? 'bg-emerald-600 text-white shadow-md'
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <ScrollToTopButton />
        </ModernPublicLayout>
    );
}
