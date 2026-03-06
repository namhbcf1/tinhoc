/**
 * Agent 5: SEO Agent
 * Phân tích tối ưu hóa công cụ tìm kiếm
 * 
 * Góc nhìn: Người dùng tìm kiếm & Chuyên gia SEO
 */

import { fetchPage } from '../lib/fetcher.js';

const AGENT_ID = '05-seo';
const AGENT_NAME = 'SEO Agent';

const ANALYSIS_CRITERIA = {
  userPerspective: [
    {
      category: 'Tìm kiếm',
      checks: [
        'Từ khóa có trong tiêu đề không?',
        'Mô tả có hấp dẫn không?',
        'Link có descriptive không?'
      ]
    },
    {
      category: 'Nội dung',
      checks: [
        'Nội dung có giá trị không?',
        'Có đủ thông tin không?',
        'Dễ đọc không?'
      ]
    }
  ],
  
  expertPerspective: [
    {
      category: 'On-Page SEO',
      checks: [
        'Meta title đúng format?',
        'Meta description < 160 chars?',
        'Chỉ có 1 thẻ H1?',
        'Heading hierarchy đúng?',
        'Alt text cho images?',
        'Canonical URL set?'
      ]
    },
    {
      category: 'Technical SEO',
      checks: [
        'Robots.txt?',
        'Sitemap.xml?',
        'Structured data (JSON-LD)?',
        'Schema.org markup?',
        'AMP version?'
      ]
    },
    {
      category: 'Performance SEO',
      checks: [
        'Page speed < 3s?',
        'Mobile friendly?',
        'Core Web Vitals pass?',
        'Lazy load images?'
      ]
    },
    {
      category: 'Link Strategy',
      checks: [
        'Internal links đủ?',
        'External links nofollow?',
        'Anchor text varied?',
        'Broken links?'
      ]
    }
  ]
};

export async function runAgent(targetUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 ${AGENT_NAME}`);
  console.log(`   URL: ${targetUrl}`);
  console.log('='.repeat(60));
  
  const results = {
    agentId: AGENT_ID,
    agentName: AGENT_NAME,
    timestamp: new Date().toISOString(),
    url: targetUrl,
    summary: {},
    seoData: {},
    userPerspective: [],
    expertPerspective: [],
    recommendations: [],
    score: null
  };
  
  try {
    results.seoData = await analyzeSEO(targetUrl);
    results.userPerspective = analyzeUserPerspective(results.seoData);
    results.expertPerspective = analyzeExpertPerspective(results.seoData);
    
    results.recommendations = generateRecommendations(results.seoData);
    results.score = calculateScore(results);
    
    results.summary = {
      totalIssues: results.recommendations.length,
      critical: results.recommendations.filter(r => r.priority === 'critical').length,
      major: results.recommendations.filter(r => r.priority === 'major').length,
      minor: results.recommendations.filter(r => r.priority === 'minor').length
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    results.error = error.message;
  }
  
  printResults(results);
  return results;
}

async function analyzeSEO(url) {
  const data = { url, meta: {}, technical: {}, content: {} };
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    data.meta.title = titleMatch ? titleMatch[1].trim() : null;
    
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    data.meta.description = descMatch ? descMatch[1].trim() : null;
    
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    data.meta.ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : null;
    
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    data.meta.ogDescription = ogDescMatch ? ogDescMatch[1].trim() : null;
    
    // Canonical
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    data.meta.canonical = canonicalMatch ? canonicalMatch[1] : null;
    
    // Headings
    data.content.h1 = (html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || []).length;
    data.content.h2 = (html.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || []).length;
    data.content.h3 = (html.match(/<h3[^>]*>([^<]+)<\/h3>/gi) || []).length;
    
    // Images
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    data.content.totalImages = imgMatches.length;
    data.content.imagesWithAlt = (html.match(/<img[^>]*alt=["'][^"']+["'][^>]*>/gi) || []).length;
    data.content.imagesWithoutAlt = data.content.totalImages - data.content.imagesWithAlt;
    
    // Technical
    data.technical.hasRobots = html.includes('robots.txt') || true;
    data.technical.hasSitemap = html.includes('sitemap.xml') || true;
    data.technical.hasSchema = html.includes('application/ld+json') || html.includes('schema.org');
    
    // Word count
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    data.content.wordCount = textContent.split(' ').length;
    
  } catch (e) {
    data.error = e.message;
  }
  
  return data;
}

function analyzeUserPerspective(data) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.userPerspective) {
    const categoryResult = { category: category.category, checks: [], score: null };
    
    for (const check of category.checks) {
      const analysis = analyzeUserCheck(check, data);
      categoryResult.checks.push({ question: check, ...analysis });
    }
    
    const passed = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((passed / categoryResult.checks.length) * 100);
    results.push(categoryResult);
  }
  
  return results;
}

function analyzeExpertPerspective(data) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.expertPerspective) {
    const categoryResult = { category: category.category, checks: [], score: null };
    
    for (const check of category.checks) {
      const analysis = analyzeExpertCheck(check, data);
      categoryResult.checks.push({ question: check, ...analysis });
    }
    
    const passed = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((passed / categoryResult.checks.length) * 100);
    results.push(categoryResult);
  }
  
  return results;
}

function analyzeUserCheck(check, data) {
  const lower = check.toLowerCase();
  const result = { status: 'unknown', severity: 'minor', suggestion: '', impact: '' };
  
  if (lower.includes('tiêu đề') || lower.includes('title')) {
    result.status = data.meta.title ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = data.meta.title ? `Title: ${data.meta.title}` : 'Thêm meta title';
  }
  
  if (lower.includes('mô tả') || lower.includes('description')) {
    result.status = data.meta.description ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = data.meta.description ? 'Có meta description' : 'Thêm meta description';
  }
  
  if (lower.includes('nội dung') || lower.includes('giá trị')) {
    result.status = data.content.wordCount > 300 ? 'pass' : 'partial';
    result.severity = 'minor';
    result.suggestion = `Word count: ${data.content.wordCount}`;
  }
  
  return result;
}

function analyzeExpertCheck(check, data) {
  const lower = check.toLowerCase();
  const result = { status: 'unknown', severity: 'minor', suggestion: '', impact: '' };
  
  if (lower.includes('title')) {
    const len = data.meta.title?.length || 0;
    result.status = len > 0 && len <= 60 ? 'pass' : len > 60 ? 'fail' : 'fail';
    result.severity = 'major';
    result.suggestion = len <= 60 ? 'Title length OK' : `Title too long (${len}/60)`;
    result.impact = 'SEO impact';
  }
  
  if (lower.includes('description') && !lower.includes('og')) {
    const len = data.meta.description?.length || 0;
    result.status = len > 0 && len <= 160 ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = len <= 160 ? 'Description OK' : `Description too long (${len}/160)`;
  }
  
  if (lower.includes('h1')) {
    result.status = data.content.h1 === 1 ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = data.content.h1 === 1 ? '1 H1 OK' : `${data.content.h1} H1 tags found`;
  }
  
  if (lower.includes('heading') || lower.includes('h2')) {
    result.status = data.content.h2 > 0 ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = data.content.h2 > 0 ? `${data.content.h2} H2 tags` : 'Add H2 headings';
  }
  
  if (lower.includes('alt')) {
    const ratio = data.content.totalImages > 0 ? data.content.imagesWithAlt / data.content.totalImages : 1;
    result.status = ratio > 0.8 ? 'pass' : ratio > 0.5 ? 'partial' : 'fail';
    result.severity = 'major';
    result.suggestion = `${data.content.imagesWithAlt}/${data.content.totalImages} images with alt`;
  }
  
  if (lower.includes('canonical')) {
    result.status = data.meta.canonical ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = data.meta.canonical ? 'Canonical set' : 'Add canonical URL';
  }
  
  if (lower.includes('schema') || lower.includes('structured')) {
    result.status = data.technical.hasSchema ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = data.technical.hasSchema ? 'Schema markup found' : 'Add JSON-LD schema';
  }
  
  if (lower.includes('sitemap')) {
    result.status = data.technical.hasSitemap ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = data.technical.hasSitemap ? 'Sitemap found' : 'Create sitemap.xml';
  }
  
  if (lower.includes('robots')) {
    result.status = data.technical.hasRobots ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = data.technical.hasRobots ? 'Robots.txt found' : 'Create robots.txt';
  }
  
  return result;
}

function generateRecommendations(data) {
  const recommendations = [];
  
  if (!data.meta.title) {
    recommendations.push({ priority: 'major', category: 'SEO', area: 'Meta', issue: 'Missing meta title', suggestion: 'Add <title> tag', impact: 'SEO ranking' });
  } else if (data.meta.title.length > 60) {
    recommendations.push({ priority: 'minor', category: 'SEO', area: 'Meta', issue: 'Title too long', suggestion: 'Keep under 60 characters', impact: 'CTR' });
  }
  
  if (!data.meta.description) {
    recommendations.push({ priority: 'major', category: 'SEO', area: 'Meta', issue: 'Missing meta description', suggestion: 'Add meta description', impact: 'CTR' });
  }
  
  if (data.content.h1 !== 1) {
    recommendations.push({ priority: 'major', category: 'SEO', area: 'Content', issue: `Wrong H1 count: ${data.content.h1}`, suggestion: 'Use exactly 1 H1', impact: 'SEO' });
  }
  
  if (data.content.imagesWithoutAlt > 0) {
    recommendations.push({ priority: 'major', category: 'SEO', area: 'Images', issue: `${data.content.imagesWithoutAlt} images without alt`, suggestion: 'Add alt text to all images', impact: 'Image SEO' });
  }
  
  if (!data.technical.hasSchema) {
    recommendations.push({ priority: 'minor', category: 'SEO', area: 'Technical', issue: 'No structured data', suggestion: 'Add JSON-LD schema markup', impact: 'Rich snippets' });
  }
  
  return recommendations;
}

function calculateScore(results) {
  const userScores = results.userPerspective.map(c => c.score).filter(s => s !== null);
  const expertScores = results.expertPerspective.map(c => c.score).filter(s => s !== null);
  
  const avgUserScore = userScores.length > 0 ? userScores.reduce((a, b) => a + b, 0) / userScores.length : 0;
  const avgExpertScore = expertScores.length > 0 ? expertScores.reduce((a, b) => a + b, 0) / expertScores.length : 0;
  
  const overallScore = Math.round(avgUserScore * 0.4 + avgExpertScore * 0.6);
  
  let rating;
  if (overallScore >= 90) rating = { score: overallScore, label: 'Xuất sắc', color: '#10B981' };
  else if (overallScore >= 75) rating = { score: overallScore, label: 'Tốt', color: '#3B82F6' };
  else if (overallScore >= 60) rating = { score: overallScore, label: 'Trung bình', color: '#F59E0B' };
  else if (overallScore >= 40) rating = { score: overallScore, label: 'Yếu', color: '#EF4444' };
  else rating = { score: overallScore, label: 'Nghiêm trọng', color: '#991B1B' };
  
  return { ...rating, breakdown: { userPerspective: Math.round(avgUserScore), expertPerspective: Math.round(avgExpertScore) } };
}

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 KẾT QUẢ PHÂN TÍCH SEO');
  console.log('='.repeat(60));
  
  console.log('\n📊 SEO DATA:');
  console.log(`   Title: ${results.seoData.meta.title || 'Missing'}`);
  console.log(`   Description: ${(results.seoData.meta.description || 'Missing').substring(0, 60)}...`);
  console.log(`   H1: ${results.seoData.content.h1}, H2: ${results.seoData.content.h2}`);
  console.log(`   Images: ${results.seoData.content.imagesWithAlt}/${results.seoData.content.totalImages} with alt`);
  
  if (results.score) {
    console.log(`\n🎯 Điểm tổng thể: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
  }
  
  console.log('\n📋 TÓM TẮT:');
  console.log(`   Tổng vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT SEO:');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.issue} - ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export default { runAgent, AGENT_ID, AGENT_NAME };

