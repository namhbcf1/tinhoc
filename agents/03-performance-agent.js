/**
 * Agent 3: Performance & Speed Analysis Agent
 * Phân tích hiệu suất và tốc độ tải trang
 * 
 * Góc nhìn: Người dùng chờ đợi & Chuyên gia Performance
 */

import { analyzeWithAI } from '../lib/ai-analyzer.js';
import { fetchPage } from '../lib/fetcher.js';

const AGENT_ID = '03-performance';
const AGENT_NAME = 'Performance & Speed Analysis Agent';

const ANALYSIS_CRITERIA = {
  // Góc nhìn người dùng
  userPerspective: [
    {
      category: 'Tốc độ cảm nhận',
      checks: [
        'Trang có tải trong vòng 3 giây không?',
        'Có loading indicator không?',
        'Ảnh có hiển thị nhanh không?',
        'Chuyển trang có mượt không?',
        'Không có giật lag khi sử dụng?'
      ]
    },
    {
      category: 'Trải nghiệm di động',
      checks: [
        'Trang có hiển thị tốt trên điện thoại không?',
        'Có thể sử dụng trên 3G không?',
        'Nút bấm có đủ lớn cho touch không?',
        'Scroll có mượt không?',
        'Font có đủ lớn đọc được không?'
      ]
    },
    {
      category: 'Độ tin cậy',
      checks: [
        'Trang có hay bị lỗi không?',
        'Link có hoạt động không?',
        'Form có submit được không?',
        'Tìm kiếm có ra kết quả không?'
      ]
    }
  ],
  
  // Góc nhìn chuyên gia Performance
  expertPerspective: [
    {
      category: 'Core Web Vitals',
      checks: [
        'LCP < 2.5s?',
        'FID < 100ms?',
        'CLS < 0.1?',
        'FCP < 1.8s?',
        'TTFB < 600ms?',
        'SI < 3.4s?'
      ]
    },
    {
      category: 'Resource Optimization',
      checks: [
        'Images được optimized (WebP, lazy load)?',
        'CSS/JS minified?',
        'Critical CSS inline?',
        'Font loading được tối ưu?',
        'Preload/prefetch được sử dụng?',
        'Compression (gzip/brotli) enabled?'
      ]
    },
    {
      category: 'Caching & CDN',
      checks: [
        'Browser caching headers set?',
        'CDN được sử dụng?',
        'ETag configured?',
        'Cache policy hợp lý?',
        'Service worker implemented?'
      ]
    },
    {
      category: 'Code Efficiency',
      checks: [
        'Bundle size hợp lý?',
        'Code splitting implemented?',
        'Tree shaking enabled?',
        'No unnecessary dependencies?',
        'SSR/SSG được sử dụng?'
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
  const paths = ['', '/gioi-thieu', '/khoa-hoc'];
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
          category: 'User Experience',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần cải thiện tốc độ',
          impact: 'Ảnh hưởng đến trải nghiệm người dùng'
        });
      }
    }
  }
  
  for (const category of expertResults) {
    for (const check of category.checks) {
      if (check.status === 'fail' || check.status === 'partial') {
        recommendations.push({
          priority: check.severity === 'high' ? 'major' : 'minor',
          category: 'Performance',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần tối ưu hóa',
          impact: 'Ảnh hưởng đến Core Web Vitals'
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
  
  const overallScore = Math.round(avgUserScore * 0.6 + avgExpertScore * 0.4);
  
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
  console.log('📊 KẾT QUẢ PHÂN TÍCH PERFORMANCE');
  console.log('='.repeat(60));
  
  if (results.score) {
    console.log(`\n🚀 Điểm Performance: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
    console.log(`   - Người dùng: ${results.score.breakdown.userPerspective}/100`);
    console.log(`   - Chuyên gia: ${results.score.breakdown.expertPerspective}/100`);
  }
  
  console.log('\n📋 TÓM TẮT:');
  console.log(`   Tổng vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  console.log(`   🟡 Nhỏ: ${results.summary.minor}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT (Top 5):');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      const icon = r.priority === 'critical' ? '🔴' : r.priority === 'major' ? '🟠' : '🟡';
      console.log(`   ${i + 1}. ${icon} ${r.issue}`);
      console.log(`      💡 ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export default { runAgent, AGENT_ID, AGENT_NAME };
