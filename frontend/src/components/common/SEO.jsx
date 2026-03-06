import { Helmet } from 'react-helmet-async';

/**
 * Advanced SEO Component with Structured Data Support
 *
 * Usage:
 * <SEO
 *   title="Đào tạo"
 *   description="Các chương trình đào tạo ngoại ngữ"
 *   type="website"
 *   url="/training"
 *   image="https://vantrangedu.com/og-training.jpg"
 *   structuredData={{
 *     "@type": "Course",
 *     "name": "Tiếng Anh B1",
 *     "provider": { "@type": "Organization", "name": "Van Trang Education" }
 *   }}
 *   article={{
 *     publishedTime: "2026-01-01T00:00:00Z",
 *     modifiedTime: "2026-01-10T00:00:00Z",
 *     author: "Van Trang Education",
 *     section: "Education",
 *     tags: ["tiếng anh", "VSTEP"]
 *   }}
 * />
 */
export default function SEO({
    title,
    description,
    type,          // defaults to 'article' when article prop present, else 'website'
    image,
    imageWidth,    // og:image:width — recommended 1200
    imageHeight,   // og:image:height — recommended 630
    url,
    structuredData,
    article
}) {
    const siteTitle = 'VanTrangEdu - Tư Vấn Giáo Dục Sơn Trang';
    const defaultDescription = 'Đào tạo ngoại ngữ kỷ nguyên mới: Tiếng Anh cấp tốc, luyện thi VSTEP, IELTS, TOEIC. Phương pháp hiện đại, cam kết đầu ra.';
    // Default OG image — 1200×630 optimised for social sharing
    const defaultImage = 'https://vantrangedu.com/og-image.jpg';
    const defaultImageWidth = '1200';
    const defaultImageHeight = '630';
    const siteUrl = 'https://vantrangedu.com';

    const pageTitle = title ? `${title} | VanTrangEdu` : siteTitle;
    const pageDescription = description || defaultDescription;
    const pageImage = image || defaultImage;
    const pageImageWidth = imageWidth || defaultImageWidth;
    const pageImageHeight = imageHeight || defaultImageHeight;
    const pageUrl = url ? `${siteUrl}${url}` : siteUrl;

    // Auto-detect og:type: 'article' when article metadata provided, else caller-supplied or 'website'
    const ogType = type || (article ? 'article' : 'website');

    return (
        <Helmet>
            {/* ── Standard metadata ── */}
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <link rel="canonical" href={pageUrl} />

            {/* ── Open Graph (Facebook, Zalo, LinkedIn) ── */}
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={pageUrl} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:image" content={pageImage} />
            <meta property="og:image:width" content={pageImageWidth} />
            <meta property="og:image:height" content={pageImageHeight} />
            <meta property="og:image:alt" content={pageDescription} />
            <meta property="og:site_name" content="Van Trang Education" />
            <meta property="og:locale" content="vi_VN" />

            {/* ── Twitter Card ── */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@vantrangedu" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={pageImage} />
            <meta name="twitter:image:alt" content={pageDescription} />

            {/* ── Article-specific metadata (news/blog pages) ── */}
            {article && (
                <>
                    <meta property="article:published_time" content={article.publishedTime} />
                    {article.modifiedTime && (
                        <meta property="article:modified_time" content={article.modifiedTime} />
                    )}
                    <meta property="article:author" content={article.author || 'Van Trang Education'} />
                    <meta property="article:section" content={article.section || 'Giáo dục'} />
                    <meta property="article:publisher" content="https://www.facebook.com/Englishvantrang" />
                    {article.tags?.map((tag, i) => (
                        <meta key={i} property="article:tag" content={tag} />
                    ))}
                </>
            )}

            {/* ── JSON-LD Structured Data for Rich Snippets ── */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(
                        Array.isArray(structuredData)
                            ? { "@context": "https://schema.org", "@graph": structuredData }
                            : { "@context": "https://schema.org", ...structuredData }
                    )}
                </script>
            )}
        </Helmet>
    );
}

/**
 * Pre-built structured data generators
 */
export const StructuredData = {
    // For course pages
    course: (name, description, provider = 'Van Trang Education') => ({
        "@type": "Course",
        "name": name,
        "description": description,
        "provider": {
            "@type": "Organization",
            "name": provider,
            "sameAs": "https://vantrangedu.com"
        }
    }),

    // For news/article pages
    article: (headline, datePublished, author = 'Van Trang Education', dateModified = null, imageUrl = null) => ({
        "@type": "NewsArticle",
        "headline": headline,
        "datePublished": datePublished,
        "dateModified": dateModified || datePublished,
        ...(imageUrl && {
            "image": {
                "@type": "ImageObject",
                "url": imageUrl,
                "width": 1200,
                "height": 630
            }
        }),
        "author": {
            "@type": "Organization",
            "name": author,
            "url": "https://vantrangedu.com"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Van Trang Education",
            "url": "https://vantrangedu.com",
            "logo": {
                "@type": "ImageObject",
                "url": "https://vantrangedu.com/logo.jpg",
                "width": 512,
                "height": 512
            }
        }
    }),

    // For FAQ pages
    faq: (questions) => ({
        "@type": "FAQPage",
        "mainEntity": questions.map(q => ({
            "@type": "Question",
            "name": q.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": q.answer
            }
        }))
    }),

    // For event pages (exam schedules, workshops)
    event: (name, startDate, endDate, location = 'Online') => ({
        "@type": "Event",
        "name": name,
        "startDate": startDate,
        "endDate": endDate,
        "location": {
            "@type": "Place",
            "name": location
        },
        "organizer": {
            "@type": "Organization",
            "name": "Van Trang Education",
            "url": "https://vantrangedu.com"
        }
    }),

    // Breadcrumb for navigation
    breadcrumb: (items) => ({
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": `https://vantrangedu.com${item.url}`
        }))
    })
};
