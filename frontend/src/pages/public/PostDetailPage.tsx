import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Calendar, User, ArrowLeft, Clock, Tag } from 'lucide-react';
import SEO, { StructuredData } from '../../components/common/SEO';
import api from '../../services/api';
import SocialShare from '../../components/common/SocialShare';
import LazyImage from '../../components/ui/LazyImage';
import ScrollToTopButton from '../../components/ui/ScrollToTopButton';
import { formatDateVN } from '../../utils/dateUtils';

export default function PostDetailPage() {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);

    useEffect(() => {
        loadPost();
    }, [slug]);

    const loadPost = async () => {
        try {
            setLoading(true);
            let foundPost = null;
            let allPosts = [];

            try {
                // Try direct slug fetch first (efficient)
                const response = await api.request(`/posts/slug/${slug}`);
                foundPost = response;
                // Still need related posts — fetch list only for related
                const listResponse = await api.request('/posts?status=published');
                allPosts = listResponse.posts || listResponse.data || listResponse;
            } catch {
                // Fallback: fetch all and find by slug or id (backward compat)
                const response = await api.request('/posts?status=published');
                if (response.success && response.data) {
                    allPosts = response.data;
                } else {
                    allPosts = response.posts || response || [];
                }
                foundPost = allPosts.find(p => p.slug === slug || p.id === parseInt(slug));
            }

            if (foundPost) {
                setPost(foundPost);
                const related = allPosts
                    .filter(p => p.category === foundPost.category && p.id !== foundPost.id)
                    .slice(0, 3);
                setRelatedPosts(related);
            } else {
                setError('Không tìm thấy bài viết');
            }
        } catch (err) {
            console.error('Error loading post:', err);
            setError('Lỗi tải bài viết');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return formatDateVN(dateString);
    };

    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    // Strip dangerous tags/attributes before rendering HTML content
    const sanitizeContent = (html) => {
        if (!html) return '';
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/g, '')
            .replace(/on\w+='[^']*'/g, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    };

    const articleSchema = post ? {
        "@type": "NewsArticle",
        "headline": post.title,
        "description": post.excerpt || post.content?.substring(0, 160),
        "image": post.featured_image || "https://vantrangedu.com/og-image.jpg",
        "datePublished": post.publish_at || post.created_at,
        "dateModified": post.updated_at,
        "author": {
            "@type": "Organization",
            "name": "Van Trang Education"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Van Trang Education",
            "logo": {
                "@type": "ImageObject",
                "url": "https://vantrangedu.com/logo.jpg"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://vantrangedu.com/news/${post.slug}`
        }
    } : null;

    const breadcrumbSchema = post ? {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Trang chủ",
                "item": "https://vantrangedu.com"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Tin tức",
                "item": "https://vantrangedu.com/news"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": post.title,
                "item": `https://vantrangedu.com/news/${post.slug}`
            }
        ]
    } : null;

    const combinedSchema = articleSchema ? [articleSchema, breadcrumbSchema] : null;

    if (loading) {
        return (
            <ModernPublicLayout>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                </div>
            </ModernPublicLayout>
        );
    }

    if (error || !post) {
        return (
            <ModernPublicLayout>
                <SEO title="Không tìm thấy bài viết" description="Bài viết không tồn tại hoặc đã bị xóa." />
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <Card className="max-w-md mx-auto">
                        <CardContent className="p-8 text-center">
                            <h1 className="text-2xl font-bold text-slate-900 mb-4">Không tìm thấy bài viết</h1>
                            <p className="text-slate-600 mb-6">{error || 'Bài viết không tồn tại hoặc đã bị xóa.'}</p>
                            <Link to="/news">
                                <Button className="bg-green-600 hover:bg-green-700 text-white">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại tin tức
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </ModernPublicLayout>
        );
    }

    return (
        <ModernPublicLayout>
            <SEO
                title={post.title}
                description={post.excerpt || post.content?.substring(0, 160)}
                url={`/news/${post.slug}`}
                image={post.featured_image}
                type="article"
                article={{
                    publishedTime: post.publish_at || post.created_at,
                    modifiedTime: post.updated_at,
                    author: 'Van Trang Education',
                    section: post.category,
                    tags: post.tags ? post.tags.split(',') : []
                }}
                structuredData={combinedSchema}
            />

            <div className="bg-slate-50 min-h-screen">
                <div className="relative h-48 sm:h-64 md:h-96 bg-gradient-to-br from-green-600 to-green-800 overflow-hidden">
                    {post.featured_image && (
                        <img
                            src={post.featured_image}
                            alt={post.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                        <div className="container mx-auto">
                            <Link to="/news" className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại tin tức
                            </Link>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                                {post.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(post.publish_at || post.created_at)}
                                </span>
                                {post.category && (
                                    <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                                        <Tag className="h-3 w-3" />
                                        {post.category}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    ~{Math.ceil((post.content?.length || 0) / 1000)} phút đọc
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-12">
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <Card className="border-none shadow-lg bg-white">
                                <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
                                    {post.excerpt && (
                                        <p className="text-xl text-slate-600 font-medium mb-8 pb-8 border-b border-slate-200 leading-relaxed">
                                            {post.excerpt}
                                        </p>
                                    )}

                                    <article
                                        className="prose prose-lg prose-slate max-w-none
                      prose-headings:text-slate-900 prose-headings:font-bold
                      prose-p:text-slate-700 prose-p:leading-relaxed
                      prose-a:text-green-600 prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-slate-900
                      prose-ul:list-disc prose-ol:list-decimal
                      prose-img:rounded-lg prose-img:shadow-md"
                                        dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content?.replace(/\n/g, '<br/>') || '') }}
                                    />

                                    {post.tags && (
                                        <div className="mt-8 pt-8 border-t border-slate-200">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Tags</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {post.tags.split(',').map((tag, i) => (
                                                    <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                                                        #{tag.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <SocialShare
                                        url={shareUrl}
                                        title={post.title}
                                        description={post.excerpt}
                                        className="mt-8 pt-8 border-t border-slate-200"
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            {relatedPosts.length > 0 && (
                                <Card className="border-none shadow-md bg-white">
                                    <CardContent className="p-6">
                                        <h3 className="font-bold text-lg text-slate-900 mb-4">Bài viết liên quan</h3>
                                        <div className="space-y-4">
                                            {relatedPosts.map((relPost) => (
                                                <Link
                                                    key={relPost.id}
                                                    to={`/news/${relPost.slug || relPost.id}`}
                                                    className="block group"
                                                >
                                                    <div className="flex gap-3">
                                                        {relPost.featured_image && (
                                                            <LazyImage
                                                                src={relPost.featured_image}
                                                                alt={relPost.title}
                                                                className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
                                                            />
                                                        )}
                                                        <div>
                                                            <h4 className="font-medium text-slate-800 group-hover:text-green-600 transition-colors line-clamp-2 text-sm">
                                                                {relPost.title}
                                                            </h4>
                                                            <span className="text-xs text-slate-500 mt-1 block">
                                                                {formatDate(relPost.publish_at || relPost.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="border-none shadow-md bg-gradient-to-br from-green-600 to-green-700 text-white">
                                <CardContent className="p-6 text-center">
                                    <h3 className="font-bold text-lg mb-2">Bạn cần tư vấn?</h3>
                                    <p className="text-green-100 text-sm mb-4">Liên hệ ngay để được hỗ trợ miễn phí!</p>
                                    <a href="tel:0962445963">
                                        <Button className="bg-white text-green-700 hover:bg-green-50 w-full font-bold">
                                            Gọi: 096 244 5963
                                        </Button>
                                    </a>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
                <ScrollToTopButton />
            </div>
        </ModernPublicLayout>
    );
}






