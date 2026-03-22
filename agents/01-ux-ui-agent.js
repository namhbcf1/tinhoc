/**
 * Agent 1: UX/UI Analysis Agent
 * Phân tích trải nghiệm người dùng và giao diện
 * 
 * Góc nhìn: Người dùng thông thường & Chuyên gia UX/UI
 */

import { analyzeWithAI } from '../lib/ai-analyzer.js';
import { fetchPage } from '../lib/fetcher.js';
import { generateReport } from '../lib/reporter.js';

const AGENT_ID = '01-ux-ui';
const AGENT_NAME = 'UX/UI Analysis Agent';

const ANALYSIS_CRITERIA = {
  // Góc nhìn người dùng thông thường
  userPerspective: [
    {
      category: 'Khả năng sử dụng',
      checks: [
        'Dễ dàng tìm thông tin khóa học?',
        'Menu điều hướng có rõ ràng không?',
        'Các nút bấm có dễ nhận biết không?',
        'Có thể đăng ký học nhanh chóng không?',
        'Thông tin liên hệ có dễ tìm không?'
      ]
    },
    {
      category: 'Thẩm mỹ',
      checks: [
        'Màu sắc có hài hòa không?',
        'Hình ảnh có chất lượng tốt không?',
        'Bố cục có cân đối không?',
        'Font chữ có dễ đọc không?',
        'Có cảm giác chuyên nghiệp không?'
      ]
    },
    {
      category: 'Niềm tin',
      checks: [
        'Thông tin về trung tâm có rõ ràng không?',
        'Có giới thiệu giáo viên không?',
        'Có đánh giá từ học viên không?',
        'Chứng chỉ được hiển thị không?'
      ]
    }
  ],
  
  // Góc nhìn chuyên gia UX/UI
  expertPerspective: [
    {
      category: 'Design System',
      checks: [
        'Nhất quán về màu sắc (color consistency)',
        'Nhất quán về typography',
        'Nhất quán về spacing',
        'Sử dụng design tokens',
        'Component reuse patterns'
      ]
    },
    {
      category: 'Information Architecture',
      checks: [
        'Sitemap có hợp lý không?',
        'Navigation hierarchy rõ ràng?',
        'Content grouping hợp lý?',
        'Search functionality hoạt động tốt?',
        'Breadcrumbs được sử dụng?'
      ]
    },
    {
      category: 'Interaction Design',
      checks: [
        'Micro-interactions có phù hợp?',
        'Hover/focus states rõ ràng?',
        'Loading states được xử lý?',
        'Error messages có hữu ích?',
        'Form validation feedback tốt?'
      ]
    },
    {
      category: 'Visual Hierarchy',
      checks: [
        'Điểm focal point rõ ràng?',
        'Typography scale có hệ thống?',
        'Whitespace được sử dụng hiệu quả?',
        'CTA buttons nổi bật?',
        'Images có purpose rõ ràng?'
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
    // Fetch trang chủ và các trang quan trọng
    const pages = await fetchMultiplePages(targetUrl);
    
    // Phân tích từng góc nhìn
    results.userPerspective = await analyzeUserPerspective(pages);
    results.expertPerspective = await analyzeExpertPerspective(pages);
    
    // Tổng hợp recommendations
    results.recommendations = generateRecommendations(
      results.userPerspective,
      results.expertPerspective
    );
    
    // Tính điểm tổng thể
    results.score = calculateScore(results);
    
    // Tạo summary
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
  
  // In kết quả
  printResults(results);
  
  return results;
}

async function fetchMultiplePages(baseUrl) {
  const paths = [
    '',
    '/gioi-thieu',
    '/tuyen-sinh',
    '/lien-he',
    '/tra-cuu-chung-chi'
  ];
  
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
    const categoryResult = {
      category: category.category,
      checks: [],
      score: null
    };
    
    for (const check of category.checks) {
      // Phân tích với AI
      const analysis = await analyzeWithAI(check, pages);
      categoryResult.checks.push({
        question: check,
        ...analysis
      });
    }
    
    // Tính điểm category
    const answeredYes = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((answeredYes / categoryResult.checks.length) * 100);
    
    results.push(categoryResult);
  }
  
  return results;
}

async function analyzeExpertPerspective(pages) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.expertPerspective) {
    const categoryResult = {
      category: category.category,
      checks: [],
      score: null
    };
    
    for (const check of category.checks) {
      const analysis = await analyzeWithAI(check, pages);
      categoryResult.checks.push({
        question: check,
        ...analysis
      });
    }
    
    const answeredYes = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((answeredYes / categoryResult.checks.length) * 100);
    
    results.push(categoryResult);
  }
  
  return results;
}

function generateRecommendations(userResults, expertResults) {
  const recommendations = [];
  
  // Từ user perspective
  for (const category of userResults) {
    for (const check of category.checks) {
      if (check.status === 'fail' || check.status === 'partial') {
        recommendations.push({
          priority: check.severity || 'minor',
          category: 'User Experience',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần cải thiện',
          impact: check.impact || 'Ảnh hưởng đến trải nghiệm người dùng'
        });
      }
    }
  }
  
  // Từ expert perspective
  for (const category of expertResults) {
    for (const check of category.checks) {
      if (check.status === 'fail' || check.status === 'partial') {
        recommendations.push({
          priority: check.severity === 'high' ? 'major' : 'minor',
          category: 'UI/UX Design',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần cải thiện theo best practices',
          impact: check.impact || 'Ảnh hưởng đến chất lượng thiết kế'
        });
      }
    }
  }
  
  // Sắp xếp theo priority
  const priorityOrder = { critical: 0, major: 1, minor: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function calculateScore(results) {
  const userScores = results.userPerspective.map(c => c.score).filter(s => s !== null);
  const expertScores = results.expertPerspective.map(c => c.score).filter(s => s !== null);
  
  const avgUserScore = userScores.length > 0 
    ? userScores.reduce((a, b) => a + b, 0) / userScores.length 
    : 0;
    
  const avgExpertScore = expertScores.length > 0 
    ? expertScores.reduce((a, b) => a + b, 0) / expertScores.length 
    : 0;
  
  // Trọng số: user 60%, expert 40%
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
  console.log('📊 KẾT QUẢ PHÂN TÍCH');
  console.log('='.repeat(60));
  
  if (results.score) {
    console.log(`\n🎯 Điểm tổng thể: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
    console.log(`   - Góc nhìn người dùng: ${results.score.breakdown.userPerspective}/100`);
    console.log(`   - Góc nhìn chuyên gia: ${results.score.breakdown.expertPerspective}/100`);
  }
  
  console.log('\n📋 TÓM TẮT VẤN ĐỀ:');
  console.log(`   Tổng số vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  console.log(`   🟡 Nhỏ: ${results.summary.minor}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT CẢI THIỆN (Top 5):');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      const icon = r.priority === 'critical' ? '🔴' : r.priority === 'major' ? '🟠' : '🟡';
      console.log(`   ${i + 1}. ${icon} ${r.issue}`);
      console.log(`      💡 ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

// Export để sử dụng như module
export default { runAgent, AGENT_ID, AGENT_NAME };

