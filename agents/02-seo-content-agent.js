/**
 * Agent 2: SEO & Content Analysis Agent
 * Phân tích SEO và Content Marketing
 * 
 * Góc nhìn: Người dùng tìm kiếm & Chuyên gia SEO/Content
 */

import { analyzeWithAI } from '../lib/ai-analyzer.js';
import { fetchPage } from '../lib/fetcher.js';
import { generateReport } from '../lib/reporter.js';

const AGENT_ID = '02-seo-content';
const AGENT_NAME = 'SEO & Content Analysis Agent';

const ANALYSIS_CRITERIA = {
  // Góc nhìn người dùng tìm kiếm
  userPerspective: [
    {
      category: 'Tìm kiếm thông tin',
      checks: [
        'Có thể tìm thấy trang web qua Google không?',
        'Tiêu đề trang có mô tả nội dung không?',
        'Mô tả meta có hấp dẫn không?',
        'URL có thân thiện không?',
        'Nội dung có đáp ứng được tìm kiếm không?'
      ]
    },
    {
      category: 'Nội dung hữu ích',
      checks: [
        'Nội dung có giá trị thực sự không?',
        'Thông tin khóa học có đầy đủ không?',
        'Có hình ảnh/video minh họa không?',
        'Nội dung có cập nhật không?',
        'Có phần FAQ không?'
      ]
    },
    {
      category: 'Điều hướng tìm kiếm',
      checks: [
        'Có thanh tìm kiếm không?',
        'Có sitemap.xml không?',
        'Có robots.txt không?',
        'Các link nội bộ có hợp lý không?'
      ]
    }
  ],
  
  // Góc nhìn chuyên gia SEO
  expertPerspective: [
    {
      category: 'Technical SEO',
      checks: [
        'Có meta tags đầy đủ?',
        'Semantic HTML được sử dụng?',
        'Heading hierarchy (H1-H6) đúng?',
        'Alt text cho hình ảnh?',
        'Schema markup được implement?',
        'Canonical URLs được设置?',
        'Trang có AMP version?'
      ]
    },
    {
      category: 'On-Page SEO',
      checks: [
        'Keyword density hợp lý?',
        'Meta description 120-160 ký tự?',
        'Title tag 50-60 ký tự?',
        'Internal linking tốt?',
        'Content length đủ (>300 từ)?',
        'Có outbound links?'
      ]
    },
    {
      category: 'Content Strategy',
      checks: [
        'Content freshness score?',
        'Có content calendar?',
        'Topic clusters được tổ chức?',
        'Có pillar pages?',
        'User engagement signals?',
        'Readability score (Flesch-Kincaid)?'
      ]
    },
    {
      category: 'Local SEO',
      checks: [
        'Google Business Profile được liên kết?',
        'NAP information nhất quán?',
        'Location pages được tối ưu?',
        'Local keywords được targeting?'
      ]
    }
  ]
};

const SCORING = {
  excellent: { score: 90, label: 'Xuất sắc', color: '#10B981' },
  good: { score: 75, label: 'Tốt', color: '#3B82F6' },
  average: { score: 60, label: 'Trung bình', color: '#F59E0B' },
  poor: { score: 40, label: 'Yếu', color: '#EF4444' },
  critical: { score: 20, label: 'Nghiêm trọng', color: '#991B1B' }
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
    userPerspective: [],
    expertPerspective: [],
    recommendations: [],
    score: null
  };
  
  try {
    const pages = await fetchMultiplePages(targetUrl);
    results.userPerspective = await analyzeUserPerspective(pages);
    results.expertPerspective = await analyzeExpertPerspective(pages);
    results.recommendations = generateRecommendations(results.userPerspective, results.expertPerspective);
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

async function fetchMultiplePages(baseUrl) {
  const paths = ['', '/gioi-thieu', '/khoa-hoc', '/tin-tuc', '/lien-he'];
  const pages = {};
  
  for (const path of paths) {
    const url = path ? `${baseUrl}${path}` : baseUrl;
    try {
      pages[path || 'home'] = await fetchPage(url);
    } catch (e) {
      pages[path || 'home'] = { error: e.message };
    }
  }
  return pages;
}

async function analyzeUserPerspective(pages) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.userPerspective) {
    const categoryResult = { category: category.category, checks: [], score: null };
    
    for (const check of category.checks) {
      const analysis = await analyzeWithAI(check, pages);
      categoryResult.checks.push({ question: check, ...analysis });
    }
    
    const answeredYes = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((answeredYes / categoryResult.checks.length) * 100);
    results.push(categoryResult);
  }
  
  return results;
}

async function analyzeExpertPerspective(pages) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.expertPerspective) {
    const categoryResult = { category: category.category, checks: [], score: null };
    
    for (const check of category.checks) {
      const analysis = await analyzeWithAI(check, pages);
      categoryResult.checks.push({ question: check, ...analysis });
    }
    
    const answeredYes = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((answeredYes / categoryResult.checks.length) * 100);
    results.push(categoryResult);
  }
  
  return results;
}

function generateRecommendations(userResults, expertResults) {
  const recommendations = [];
  
  for (const category of userResults) {
    for (const check of category.checks) {
      if (check.status === 'fail' || check.status === 'partial') {
        recommendations.push({
          priority: check.severity || 'minor',
          category: 'Search Experience',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần cải thiện',
          impact: 'Ảnh hưởng đến khả năng tìm thấy trên Google'
        });
      }
    }
  }
  
  for (const category of expertResults) {
    for (const check of category.checks) {
      if (check.status === 'fail' || check.status === 'partial') {
        recommendations.push({
          priority: check.severity === 'high' ? 'major' : 'minor',
          category: 'SEO Technical',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần tối ưu theo best practices',
          impact: 'Ảnh hưởng đến ranking tìm kiếm'
        });
      }
    }
  }
  
  const priorityOrder = { critical: 0, major: 1, minor: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function calculateScore(results) {
  const userScores = results.userPerspective.map(c => c.score).filter(s => s !== null);
  const expertScores = results.expertPerspective.map(c => c.score).filter(s => s !== null);
  
  const avgUserScore = userScores.length > 0 ? userScores.reduce((a, b) => a + b, 0) / userScores.length : 0;
  const avgExpertScore = expertScores.length > 0 ? expertScores.reduce((a, b) => a + b, 0) / expertScores.length : 0;
  
  const overallScore = Math.round(avgUserScore * 0.5 + avgExpertScore * 0.5);
  
  let rating;
  if (overallScore >= 90) rating = SCORING.excellent;
  else if (overallScore >= 75) rating = SCORING.good;
  else if (overallScore >= 60) rating = SCORING.average;
  else if (overallScore >= 40) rating = SCORING.poor;
  else rating = SCORING.critical;
  
  return {
    score: overallScore,
    ...rating,
    breakdown: {
      userPerspective: Math.round(avgUserScore),
      expertPerspective: Math.round(avgExpertScore)
    }
  };
}

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 KẾT QUẢ PHÂN TÍCH SEO & CONTENT');
  console.log('='.repeat(60));
  
  if (results.score) {
    console.log(`\n🎯 Điểm SEO: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
    console.log(`   - Người dùng tìm kiếm: ${results.score.breakdown.userPerspective}/100`);
    console.log(`   - Chuyên gia SEO: ${results.score.breakdown.expertPerspective}/100`);
  }
  
  console.log('\n📋 TÓM TẮT VẤN ĐỀ:');
  console.log(`   Tổng số vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  console.log(`   🟡 Nhỏ: ${results.summary.minor}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT SEO (Top 5):');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      const icon = r.priority === 'critical' ? '🔴' : r.priority === 'major' ? '🟠' : '🟡';
      console.log(`   ${i + 1}. ${icon} ${r.issue}`);
      console.log(`      💡 ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export default { runAgent, AGENT_ID, AGENT_NAME };
