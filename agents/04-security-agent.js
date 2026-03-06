/**
 * Agent 4: Security Agent
 * Phân tích bảo mật và lỗ hổng
 * 
 * Góc nhìn: Người dùng & Chuyên gia Security
 */

import { fetchPage } from '../lib/fetcher.js';

const AGENT_ID = '04-security';
const AGENT_NAME = 'Security Agent';

const ANALYSIS_CRITERIA = {
  userPerspective: [
    {
      category: 'Bảo vệ tài khoản',
      checks: [
        'Có HTTPS không?',
        'Có thể đăng nhập an toàn không?',
        'Có quên mật khẩu không?',
        'Có xác thực 2 bước không?'
      ]
    },
    {
      category: 'Bảo vệ dữ liệu',
      checks: [
        'Thông tin cá nhân có được bảo vệ không?',
        'Có chính sách bảo mật không?',
        'Có cookie notice không?'
      ]
    }
  ],
  
  expertPerspective: [
    {
      category: 'Transport Security',
      checks: [
        'HTTPS enabled?',
        'HSTS enabled?',
        'TLS 1.2+ only?',
        'Secure cookies flags?'
      ]
    },
    {
      category: 'Headers Security',
      checks: [
        'Content-Security-Policy?',
        'X-Frame-Options?',
        'X-Content-Type-Options?',
        'Referrer-Policy?',
        'Permissions-Policy?'
      ]
    },
    {
      category: 'Input Security',
      checks: [
        'XSS protection?',
        'CSRF tokens?',
        'SQL injection prevention?',
        'Input validation?'
      ]
    },
    {
      category: 'Authentication',
      checks: [
        'Password policy strong?',
        'Session timeout?',
        'Brute force protection?',
        'JWT secure config?'
      ]
    }
  ]
};

export async function runAgent(targetUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔒 ${AGENT_NAME}`);
  console.log(`   URL: ${targetUrl}`);
  console.log('='.repeat(60));
  
  const results = {
    agentId: AGENT_ID,
    agentName: AGENT_NAME,
    timestamp: new Date().toISOString(),
    url: targetUrl,
    summary: {},
    headers: {},
    userPerspective: [],
    expertPerspective: [],
    recommendations: [],
    score: null
  };
  
  try {
    results.headers = await analyzeHeaders(targetUrl);
    results.userPerspective = analyzeUserPerspective(results.headers);
    results.expertPerspective = analyzeExpertPerspective(results.headers);
    
    results.recommendations = generateRecommendations(results.headers);
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

async function analyzeHeaders(url) {
  const analysis = {
    url,
    https: url.startsWith('https://'),
    headers: {}
  };
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    response.headers.forEach((value, key) => {
      analysis.headers[key.toLowerCase()] = value;
    });
    
    // Security headers
    analysis.securityHeaders = {
      csp: analysis.headers['content-security-policy'],
      hsts: analysis.headers['strict-transport-security'],
      xfo: analysis.headers['x-frame-options'],
      xcto: analysis.headers['x-content-type-options'],
      referrer: analysis.headers['referrer-policy'],
      permissions: analysis.headers['permissions-policy']
    };
    
  } catch (e) {
    analysis.error = e.message;
  }
  
  return analysis;
}

function analyzeUserPerspective(headersData) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.userPerspective) {
    const categoryResult = {
      category: category.category,
      checks: [],
      score: null
    };
    
    for (const check of category.checks) {
      const analysis = analyzeUserCheck(check, headersData);
      categoryResult.checks.push({ question: check, ...analysis });
    }
    
    const passed = categoryResult.checks.filter(c => c.status === 'pass').length;
    categoryResult.score = Math.round((passed / categoryResult.checks.length) * 100);
    results.push(categoryResult);
  }
  
  return results;
}

function analyzeExpertPerspective(headersData) {
  const results = [];
  
  for (const category of ANALYSIS_CRITERIA.expertPerspective) {
    const categoryResult = {
      category: category.category,
      checks: [],
      score: null
    };
    
    for (const check of category.checks) {
      const analysis = analyzeExpertCheck(check, headersData);
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
  
  if (lower.includes('https')) {
    result.status = data.https ? 'pass' : 'fail';
    result.severity = 'critical';
    result.suggestion = data.https ? 'Kết nối an toàn' : 'Cần chuyển sang HTTPS';
    result.impact = 'Dữ liệu có thể bị đánh cắp';
  }
  
  if (lower.includes('đăng nhập') || lower.includes('login')) {
    result.status = 'partial';
    result.suggestion = 'Cần kiểm tra form login';
  }
  
  if (lower.includes('2 bước') || lower.includes('2fa')) {
    result.status = 'partial';
    result.suggestion = 'Khuyến nghị bật 2FA';
  }
  
  if (lower.includes('cookie')) {
    result.status = data.headers['set-cookie'] ? 'pass' : 'partial';
    result.suggestion = 'Cần cookie notice';
  }
  
  return result;
}

function analyzeExpertCheck(check, data) {
  const lower = check.toLowerCase();
  const result = { status: 'unknown', severity: 'minor', suggestion: '', impact: '' };
  const sec = data.securityHeaders || {};
  
  if (lower.includes('https') || lower.includes('tls')) {
    result.status = data.https ? 'pass' : 'fail';
    result.severity = 'critical';
    result.suggestion = data.https ? 'HTTPS enabled' : 'Enable HTTPS';
  }
  
  if (lower.includes('hsts')) {
    result.status = sec.hsts ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = sec.hsts ? 'HSTS enabled' : 'Add Strict-Transport-Security header';
  }
  
  if (lower.includes('csp') || lower.includes('content-security')) {
    result.status = sec.csp ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = sec.csp ? 'CSP configured' : 'Add Content-Security-Policy header';
    result.impact = 'XSS attacks possible';
  }
  
  if (lower.includes('x-frame') || lower.includes('xfo')) {
    result.status = sec.xfo ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = sec.xfo ? 'X-Frame-Options set' : 'Add X-Frame-Options: DENY';
  }
  
  if (lower.includes('x-content') || lower.includes('xcto')) {
    result.status = sec.xcto ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = sec.xcto ? 'X-Content-Type-Options set' : 'Add X-Content-Type-Options: nosniff';
  }
  
  if (lower.includes('referrer')) {
    result.status = sec.referrer ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = sec.referrer ? 'Referrer-Policy set' : 'Add Referrer-Policy: strict-origin-when-cross-origin';
  }
  
  if (lower.includes('cookie') && lower.includes('secure')) {
    result.status = data.headers['set-cookie']?.includes('Secure') ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = 'Add Secure flag to cookies';
  }
  
  if (lower.includes('password') || lower.includes('policy')) {
    result.status = 'partial';
    result.suggestion = 'Kiểm tra backend password policy';
  }
  
  return result;
}

function generateRecommendations(headersData) {
  const recommendations = [];
  const sec = headersData.securityHeaders || {};
  
  if (!headersData.https) {
    recommendations.push({
      priority: 'critical',
      category: 'Security',
      area: 'Transport',
      issue: 'HTTPS not enabled',
      suggestion: 'Enable HTTPS with valid certificate',
      impact: 'Data can be intercepted'
    });
  }
  
  if (!sec.hsts) {
    recommendations.push({
      priority: 'major',
      category: 'Security',
      area: 'Transport',
      issue: 'HSTS not enabled',
      suggestion: 'Add Strict-Transport-Security header with max-age',
      impact: 'Downgrade attacks possible'
    });
  }
  
  if (!sec.csp) {
    recommendations.push({
      priority: 'major',
      category: 'Security',
      area: 'Headers',
      issue: 'Content-Security-Policy not set',
      suggestion: 'Configure CSP to prevent XSS',
      impact: 'XSS attacks possible'
    });
  }
  
  if (!sec.xfo) {
    recommendations.push({
      priority: 'major',
      category: 'Security',
      area: 'Headers',
      issue: 'X-Frame-Options not set',
      suggestion: 'Add X-Frame-Options: DENY or SAMEORIGIN',
      impact: 'Clickjacking attacks possible'
    });
  }
  
  if (!sec.xcto) {
    recommendations.push({
      priority: 'minor',
      category: 'Security',
      area: 'Headers',
      issue: 'X-Content-Type-Options not set',
      suggestion: 'Add X-Content-Type-Options: nosniff',
      impact: 'MIME sniffing possible'
    });
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
  
  return {
    ...rating,
    breakdown: {
      userPerspective: Math.round(avgUserScore),
      expertPerspective: Math.round(avgExpertScore),
      https: results.headers.https
    }
  };
}

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🔒 KẾT QUẢ PHÂN TÍCH BẢO MẬT');
  console.log('='.repeat(60));
  
  console.log('\n📊 SECURITY HEADERS:');
  console.log(`   HTTPS: ${results.headers.https ? '✓' : '✗'}`);
  console.log(`   HSTS: ${results.headers.securityHeaders?.hsts ? '✓' : '✗'}`);
  console.log(`   CSP: ${results.headers.securityHeaders?.csp ? '✓' : '✗'}`);
  console.log(`   X-Frame-Options: ${results.headers.securityHeaders?.xfo ? '✓' : '✗'}`);
  console.log(`   X-Content-Type-Options: ${results.headers.securityHeaders?.xcto ? '✓' : '✗'}`);
  
  if (results.score) {
    console.log(`\n🎯 Điểm tổng thể: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
  }
  
  console.log('\n📋 TÓM TẮT VẤN ĐỀ:');
  console.log(`   Tổng số vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  console.log(`   🟡 Nhỏ: ${results.summary.minor}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT BẢO MẬT:');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      const icon = r.priority === 'critical' ? '🔴' : r.priority === 'major' ? '🟠' : '🟡';
      console.log(`   ${i + 1}. ${icon} ${r.issue}`);
      console.log(`      💡 ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export default { runAgent, AGENT_ID, AGENT_NAME };

