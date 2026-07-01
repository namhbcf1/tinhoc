import { useEffect } from 'react';

/**
 * SEO component using React 19 native document metadata.
 *
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree into
 * <head> automatically, so react-helmet-async is no longer needed.
 *
 * Two things React 19 does NOT handle, so we do them manually:
 *  1. <html lang> attribute — set via effect on document.documentElement.
 *  2. Inline <script type="application/ld+json"> — React 19 only hoists scripts
 *     with `src` or `async`; inline JSON-LD is injected into <head> via effect
 *     and removed on unmount so each page owns exactly one structured-data block.
 */

interface ArticleMeta {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  imageWidth?: string | number;
  imageHeight?: string | number;
  url?: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>> | null;
  article?: ArticleMeta | null;
  robots?: string;
  noindex?: boolean;
  lang?: 'vi' | 'en';
}

const SITE_TITLE = 'VanTrangEdu - Tu Van Giao Duc Son Trang';
const DEFAULT_DESCRIPTION = 'Van Trang Education (VanTrangEdu) cung cap dao tao ngoai ngu, luyen thi chung chi va tu van giao duc voi lo trinh thuc chien, ro rang va de tiep can.';
const DEFAULT_IMAGE = 'https://vantrangedu.com/og-image.jpg';
const DEFAULT_IMAGE_WIDTH = '1200';
const DEFAULT_IMAGE_HEIGHT = '630';
const SITE_URL = 'https://vantrangedu.com';

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
  noindex = false,
  lang = 'vi',
}: SEOProps) {
  const pageTitle = title ? `${title} | VanTrangEdu` : SITE_TITLE;
  const pageDescription = description || DEFAULT_DESCRIPTION;
  const pageImage = image || DEFAULT_IMAGE;
  const pageImageWidth = String(imageWidth || DEFAULT_IMAGE_WIDTH);
  const pageImageHeight = String(imageHeight || DEFAULT_IMAGE_HEIGHT);
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const pageRobots = noindex
    ? 'noindex, nofollow, noarchive'
    : (robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  const ogType = type || (article ? 'article' : 'website');
  const pageLang = lang === 'en' ? 'en' : 'vi';
  const pageLocale = pageLang === 'en' ? 'en_US' : 'vi_VN';

  const resolvedStructuredData = structuredData
    ? (Array.isArray(structuredData)
      ? { '@context': 'https://schema.org', '@graph': structuredData }
      : { '@context': 'https://schema.org', ...structuredData })
    : {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: pageTitle,
      description: pageDescription,
      url: pageUrl,
      inLanguage: pageLang,
      isPartOf: {
        '@type': 'WebSite',
        name: 'VanTrangEdu',
        url: SITE_URL,
      },
    };

  // 1. <html lang> — React 19 native metadata cannot render <html> attributes.
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = pageLang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [pageLang]);

  // 2. JSON-LD structured data — inject into <head> (React 19 does not hoist
  //    inline scripts without src/async). One <script> per mounted SEO instance.
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(resolvedStructuredData);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [resolvedStructuredData]);

  return (
    <>
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
      <meta property="og:locale" content={pageLocale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@vantrangedu" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={pageDescription} />

      {article ? (
        <>
          {article.publishedTime ? <meta property="article:published_time" content={article.publishedTime} /> : null}
          {article.modifiedTime ? <meta property="article:modified_time" content={article.modifiedTime} /> : null}
          <meta property="article:author" content={article.author || 'Van Trang Education'} />
          <meta property="article:section" content={article.section || 'Giao duc'} />
          <meta property="article:publisher" content="https://www.facebook.com/Englishvantrang" />
          {(article.tags || []).map((tag) => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      ) : null}
    </>
  );
}

/**
 * Structured-data factory helpers (schema.org snippets). Unchanged API so existing
 * callers like PostDetailPage keep working.
 */
export const StructuredData = {
  course: (name: string, description: string, provider = 'Van Trang Education') => ({
    '@type': 'Course',
    name,
    description,
    provider: {
      '@type': 'Organization',
      name: provider,
      sameAs: 'https://vantrangedu.com',
    },
  }),

  article: (
    headline: string,
    datePublished: string,
    author = 'Van Trang Education',
    dateModified: string | null = null,
    imageUrl: string | null = null,
  ) => ({
    '@type': 'NewsArticle',
    headline,
    datePublished,
    dateModified: dateModified || datePublished,
    ...(imageUrl && {
      image: {
        '@type': 'ImageObject',
        url: imageUrl,
        width: 1200,
        height: 630,
      },
    }),
    author: {
      '@type': 'Organization',
      name: author,
      url: 'https://vantrangedu.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Van Trang Education',
      url: 'https://vantrangedu.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://vantrangedu.com/logo.jpg',
        width: 512,
        height: 512,
      },
    },
  }),

  faq: (questions: Array<{ question: string; answer: string }>) => ({
    '@type': 'FAQPage',
    mainEntity: questions.map((question) => ({
      '@type': 'Question',
      name: question.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: question.answer,
      },
    })),
  }),

  event: (name: string, startDate: string, endDate: string, location = 'Online') => ({
    '@type': 'Event',
    name,
    startDate,
    endDate,
    location: {
      '@type': 'Place',
      name: location,
    },
    organizer: {
      '@type': 'Organization',
      name: 'Van Trang Education',
      url: 'https://vantrangedu.com',
    },
  }),

  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://vantrangedu.com${item.url}`,
    })),
  }),

  webPage: (name: string, description: string, url: string) => ({
    '@type': 'WebPage',
    name,
    description,
    url: `https://vantrangedu.com${url}`,
  }),
};
