import { Helmet } from 'react-helmet-async';

export default function SEO({
    title,
    description,
    type,
    image,
    imageWidth,
    imageHeight,
    url,
    structuredData,
    article,
    robots,
    noindex = false
}) {
    const siteTitle = 'VanTrangEdu - Tu Van Giao Duc Son Trang';
    const defaultDescription = 'Van Trang Education cung cap dao tao ngoai ngu, luyen thi chung chi va tu van giao duc voi lo trinh thuc chien, ro rang va de tiep can.';
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
    const pageRobots = noindex
        ? 'noindex, nofollow, noarchive'
        : (robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    const ogType = type || (article ? 'article' : 'website');

    return (
        <Helmet prioritizeSeoTags>
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <meta name="author" content="Van Trang Education" />
            <meta name="robots" content={pageRobots} />
            <meta name="googlebot" content={pageRobots} />
            <link rel="canonical" href={pageUrl} />

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

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@vantrangedu" />
            <meta name="twitter:url" content={pageUrl} />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={pageImage} />
            <meta name="twitter:image:alt" content={pageDescription} />

            {article && (
                <>
                    <meta property="article:published_time" content={article.publishedTime} />
                    {article.modifiedTime && (
                        <meta property="article:modified_time" content={article.modifiedTime} />
                    )}
                    <meta property="article:author" content={article.author || 'Van Trang Education'} />
                    <meta property="article:section" content={article.section || 'Giao duc'} />
                    <meta property="article:publisher" content="https://www.facebook.com/Englishvantrang" />
                    {article.tags?.map((tag, index) => (
                        <meta key={index} property="article:tag" content={tag} />
                    ))}
                </>
            )}

            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(
                        Array.isArray(structuredData)
                            ? { '@context': 'https://schema.org', '@graph': structuredData }
                            : { '@context': 'https://schema.org', ...structuredData }
                    )}
                </script>
            )}
        </Helmet>
    );
}

export const StructuredData = {
    course: (name, description, provider = 'Van Trang Education') => ({
        '@type': 'Course',
        name,
        description,
        provider: {
            '@type': 'Organization',
            name: provider,
            sameAs: 'https://vantrangedu.com'
        }
    }),

    article: (headline, datePublished, author = 'Van Trang Education', dateModified = null, imageUrl = null) => ({
        '@type': 'NewsArticle',
        headline,
        datePublished,
        dateModified: dateModified || datePublished,
        ...(imageUrl && {
            image: {
                '@type': 'ImageObject',
                url: imageUrl,
                width: 1200,
                height: 630
            }
        }),
        author: {
            '@type': 'Organization',
            name: author,
            url: 'https://vantrangedu.com'
        },
        publisher: {
            '@type': 'Organization',
            name: 'Van Trang Education',
            url: 'https://vantrangedu.com',
            logo: {
                '@type': 'ImageObject',
                url: 'https://vantrangedu.com/logo.jpg',
                width: 512,
                height: 512
            }
        }
    }),

    faq: (questions) => ({
        '@type': 'FAQPage',
        mainEntity: questions.map((question) => ({
            '@type': 'Question',
            name: question.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: question.answer
            }
        }))
    }),

    event: (name, startDate, endDate, location = 'Online') => ({
        '@type': 'Event',
        name,
        startDate,
        endDate,
        location: {
            '@type': 'Place',
            name: location
        },
        organizer: {
            '@type': 'Organization',
            name: 'Van Trang Education',
            url: 'https://vantrangedu.com'
        }
    }),

    breadcrumb: (items) => ({
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: `https://vantrangedu.com${item.url}`
        }))
    }),

    webPage: (name, description, url) => ({
        '@type': 'WebPage',
        name,
        description,
        url: `https://vantrangedu.com${url}`
    })
};
