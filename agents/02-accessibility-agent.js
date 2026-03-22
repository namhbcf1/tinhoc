/**
 * Agent 2: Accessibility (a11y) Agent
 * Phân tích khả năng tiếp cận cho người khuyết tật
 * 
 * Góc nhìn: Người khuyết tật & Chuyên gia Accessibility (WCAG)
 */

import { analyzeWithAI } from '../lib/ai-analyzer.js';
import { fetchPage } from '../lib/fetcher.js';
import { generateReport } from '../lib/reporter.js';

const AGENT_ID = '02-accessibility';
const AGENT_NAME = 'Accessibility (a11y) Agent';

const ANALYSIS_CRITERIA = {
  // Góc nhìn người dùng có khuyết tật
  userPerspective: [
    {
      category: 'Người khiếm thị',
      checks: [
        'Screen reader có đọc được nội dung không?',
        'Alt text cho hình ảnh có mô tả không?',
        'Có thể điều hướng bằng keyboard không?',
        'Focus indicator có hiển thị không?',
        'Link text có mô tả không?'
      ]
    },
    {
      category: 'Người khiếm màu',
      checks: [
        'Màu sắc có phải là cách duy nhất để truyền tải thông tin không?',
        'Color contrast có đạt 4.5:1 cho text không?',
        'Có text alternatives cho thông tin màu không?'
      ]
    },
    {
      category: 'Người khuyết tật vận động',
      checks: [
        'Buttons có đủ lớn để click không? (min 44x44px)',
        'Có thể sử dụng mà không cần chuột không?',
        'Có keyboard traps không?'
      ]
    }
  ],
  
  // Góc nhìn chuyên gia Accessibility
  expertPerspective: [
    {
      category: 'WCAG 2.1 Level A',
      checks: [
        'Non-text content có text alternative?',
        'Info and relationships được xác định bằng semantics?',
        'Meaningful sequence đúng?',
        'Keyboard accessible?',
        'No keyboard trap?',
        'Focus visible?'
      ]
    },
    {
      category: 'WCAG 2.1 Level AA',
      checks: [
        'Language of page xác định?',
        'On Focus không thay đổi context?',
        'Contrast ratio tối thiểu 4.5:1?',
        'Text resize đến 200% mà không mất content?',
        'Reflow không horizontal scroll?',
        'Target size 44x44px minimum?'
      ]
    },
    {
      category: 'ARIA Best Practices',
      checks: [
        'Landmarks (header, nav, main, footer) được sử dụng?',
        'Live regions cho dynamic content?',
        'Form labels liên kết đúng?',
        'Error messages được thông báo?',
        'Modal có focus trap?'
      ]
    },
    {
      category: 'Screen Reader Compatibility',
      checks: [
        'Decorative images có empty alt?',
        'Headings hierarchy đúng (h1->h2->h3)?',
        'Table có proper headers?',
        'Links có descriptive text?'
      ]
    }
  ]
};

export async function runAgent(targetUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`♿ ${AGENT_NAME}`);
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
    score: null,
    wcagCompliance: {
      levelA: { passed: 0, failed: 0 },
      levelAA: { passed: 0, failed: 0 },
      levelAAA: { passed: 0, failed: 0 }
    }
  };
  
  try {
    const pages = await fetchMultiplePages(targetUrl);
    
    results.userPerspective = await analyzeUserPerspective(pages);
    results.expertPerspective = await analyzeExpertPerspective(pages);
    
    results.recommendations = generateRecommendations(
      results.userPerspective,
      results.expertPerspective
    );
    
    results.score = calculateScore(results);
    results.wcagCompliance = calculateWCAGCompliance(results);
    
    results.summary = {
      totalIssues: results.recommendations.length,
      critical: results.recommendations.filter(r => r.priority === 'critical').length,
      major: results.recommendations.filter(r => r.priority === 'major').length,
      minor: results.recommendations.filter(r => r.priority === 'minor').length,
      wcagLevelA: `${results.wcagCompliance.levelA.passed}/${results.wcagCompliance.levelA.passed + results.wcagCompliance.levelA.failed}`,
      wcagLevelAA: `${results.wcagCompliance.levelAA.passed}/${results.wcagCompliance.levelAA.passed + results.wcagCompliance.levelAA.failed}`
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    results.error = error.message;
  }
  
  printResults(results);
  return results;
}

async function fetchMultiplePages(baseUrl) {
  const paths = ['', '/gioi-thieu', '/tuyen-sinh', '/lien-he'];
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
      const analysis = await analyzeWithAI(check, pages, { template: 'accessibility' });
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

async function analyzeExpertPerspective(pages) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.expertPerspective) {
    const categoryResult = {
      category: category.category,
      checks: [],
      score: null
    };
    
    for (const check of category.checks) {
      const analysis = await analyzeWithAI(check, pages, { template: 'accessibility' });
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
  
  const priorityMap = {
    'WCAG 2.1 Level A': 'critical',
    'WCAG 2.1 Level AA': 'major',
    'ARIA Best Practices': 'major',
    'Screen Reader Compatibility': 'major',
    'Người khiếm thị': 'critical',
    'Người khiếm màu': 'major',
    'Người khuyết tật vận động': 'major'
  };
  
  for (const category of [...userResults, ...expertResults]) {
    for (const check of category.checks) {
      if (check.status === 'fail' || check.status === 'partial') {
        recommendations.push({
          priority: priorityMap[category.category] || 'minor',
          category: 'Accessibility',
          area: category.category,
          issue: check.question,
          suggestion: check.suggestion || 'Cần cải thiện',
          impact: 'Người khuyết tật không thể sử dụng trang web',
          wcagCriteria: getWCAGCriteria(check.question)
        });
      }
    }
  }
  
  const priorityOrder = { critical: 0, major: 1, minor: 2 };
  return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function getWCAGCriteria(question) {
  const mapping = {
    'alt': '1.1.1',
    'keyboard': '2.1.1',
    'focus': '2.4.7',
    'contrast': '1.4.3',
    'language': '3.1.1',
    'heading': '1.3.1',
    'label': '1.3.1',
    'landmark': '1.3.1'
  };
  
  for (const [key, criteria] of Object.entries(mapping)) {
    if (question.toLowerCase().includes(key)) {
      return criteria;
    }
  }
  return 'N/A';
}

function calculateWCAGCompliance(results) {
  const compliance = {
    levelA: { passed: 0, failed: 0 },
    levelAA: { passed: 0, failed: 0 },
    levelAAA: { passed: 0, failed: 0 }
  };
  
  const levelACriteria = ['Non-text', 'Info and relationships', 'Meaningful sequence', 'Keyboard', 'No keyboard trap', 'Focus visible'];
  const levelAACriteria = ['Language', 'On Focus', 'Contrast', 'Text resize', 'Reflow', 'Target size'];
  
  for (const category of results.expertPerspective) {
    for (const check of category.checks) {
      const isLevelA = levelACriteria.some(c => check.question.includes(c));
      const isLevelAA = levelAACriteria.some(c => check.question.includes(c));
      
      if (isLevelA) {
        check.status === 'pass' ? compliance.levelA.passed++ : compliance.levelA.failed++;
      }
      if (isLevelAA) {
        check.status === 'pass' ? compliance.levelAA.passed++ : compliance.levelAA.failed++;
      }
    }
  }
  
  return compliance;
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
  
  const overallScore = Math.round(avgUserScore * 0.5 + avgExpertScore * 0.5);
  
  let rating;
  if (overallScore >= 90) rating = { score: overallScore, label: 'Xuất sắc', color: '#10B981' };
  else if (overallScore >= 75) rating = { score: overallScore, label: 'Tốt', color: '#3B82F6' };
  else if (overallScore >= 60) rating = { score: overallScore, label: 'Trung bình', color: '#F59E0B' };
  else if (overallScore >= 40) rating = { score: overallScore, label: 'Yếu', color: '#EF4444' };
  else rating = { score: overallScore, label: 'Nghiêm trọng', color: '#991B1B' };
  
  return {
    ...rating,
    breakdown: {
      userPerspective: Math.round(avgUserScore),
      expertPerspective: Math.round(avgExpertScore)
    }
  };
}

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('♿ KẾT QUẢ PHÂN TÍCH ACCESSIBILITY');
  console.log('='.repeat(60));
  
  if (results.score) {
    console.log(`\n🎯 Điểm tổng thể: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
  }
  
  console.log('\n📋 TUÂN THỦ WCAG:');
  console.log(`   Level A:   ${results.wcagCompliance.levelA.passed}/${results.wcagCompliance.levelA.passed + results.wcagCompliance.levelA.failed} passed`);
  console.log(`   Level AA:  ${results.wcagCompliance.levelAA.passed}/${results.wcagCompliance.levelAA.passed + results.wcagCompliance.levelAA.failed} passed`);
  
  console.log('\n📋 TÓM TẮT VẤN ĐỀ:');
  console.log(`   Tổng số vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  console.log(`   🟡 Nhỏ: ${results.summary.minor}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT CẢI THIỆN (Top 5):');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      const icon = r.priority === 'critical' ? '🔴' : r.priority === 'major' ? '🟠' : '🟡';
      console.log(`   ${i + 1}. ${icon} ${r.issue} [WCAG ${r.wcagCriteria}]`);
      console.log(`      💡 ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export default { runAgent, AGENT_ID, AGENT_NAME };

