/**
 * Agent 6: Mobile Experience Agent
 * Phân tích trải nghiệm di động
 * 
 * Góc nhìn: Người dùng mobile & Chuyên gia Mobile UX
 */

const AGENT_ID = '06-mobile';
const AGENT_NAME = 'Mobile Experience Agent';

const ANALYSIS_CRITERIA = {
  userPerspective: [
    {
      category: 'Sử dụng cơ bản',
      checks: [
        'Trang có hiển thị đúng trên điện thoại không?',
        'Có thể đọc text không cần zoom?',
        'Buttons có đủ lớn để tap không?',
        'Có bị zoom out không?'
      ]
    },
    {
      category: 'Tương tác',
      checks: [
        'Scroll có mượt không?',
        'Có thể đăng ký được không?',
        'Form có dễ điền không?'
      ]
    },
    {
      category: 'Hiệu năng',
      checks: [
        'Tải nhanh trên 4G?',
        'Có app-like feel không?'
      ]
    }
  ],
  
  expertPerspective: [
    {
      category: 'Viewport & Responsive',
      checks: [
        'Meta viewport set?',
        'Responsive breakpoints?',
        'Fluid typography?',
        'Fluid images?'
      ]
    },
    {
      category: 'Touch Optimization',
      checks: [
        'Touch targets 44x44px?',
        'No hover-dependent content?',
        'Swipe gestures supported?',
        'Active states visible?'
      ]
    },
    {
      category: 'Performance',
      checks: [
        'Mobile-first CSS?',
        'Images optimized for mobile?',
        'Lazy load implemented?',
        'Above-fold < 14KB?'
      ]
    },
    {
      category: 'PWA Features',
      checks: [
        'Manifest.json?',
        'Service worker?',
        'Add to home screen?',
        'Offline support?'
      ]
    }
  ]
};

export async function runAgent(targetUrl) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📱 ${AGENT_NAME}`);
  console.log(`   URL: ${targetUrl}`);
  console.log('='.repeat(60));
  
  const results = {
    agentId: AGENT_ID,
    agentName: AGENT_NAME,
    timestamp: new Date().toISOString(),
    url: targetUrl,
    summary: {},
    mobileData: {},
    userPerspective: [],
    expertPerspective: [],
    recommendations: [],
    score: null
  };
  
  try {
    results.mobileData = await analyzeMobile(targetUrl);
    results.userPerspective = analyzeUserPerspective(results.mobileData);
    results.expertPerspective = analyzeExpertPerspective(results.mobileData);
    
    results.recommendations = generateRecommendations(results.mobileData);
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

async function analyzeMobile(url) {
  const data = { url, viewport: {}, responsive: {}, pwa: {} };
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Viewport
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["']/i);
    data.viewport.meta = viewportMatch ? viewportMatch[1] : null;
    
    // Responsive
    data.responsive.hasMediaQueries = html.includes('@media');
    data.responsive.breakpoints = [];
    const bpMatches = html.match(/@media[^{]+(\d+px)/g) || [];
    bpMatches.forEach(m => {
      const bp = m.match(/(\d+px)/);
      if (bp) data.responsive.breakpoints.push(parseInt(bp[1]));
    });
    
    // Touch
    data.touch.hasTouchEvents = html.includes('ontouchstart') || html.includes('touch-action');
    data.touch.hasHoverStyles = html.includes(':hover');
    
    // PWA
    data.pwa.hasManifest = html.includes('manifest.json') || html.includes('manifest.webmanifest');
    data.pwa.hasServiceWorker = html.includes('service-worker');
    data.pwa.hasViewportFit = html.includes('viewport-fit');
    
    // Performance
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    data.performance = {
      totalImages: imgMatches.length,
      lazyLoaded: (html.match(/loading=["']lazy["']/gi) || []).length,
      srcset: (html.match(/srcset=["'][^"']+["']/gi) || []).length
    };
    
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
  
  if (lower.includes('viewport') || lower.includes('zoom')) {
    result.status = data.viewport.meta ? 'pass' : 'fail';
    result.severity = 'critical';
    result.suggestion = data.viewport.meta ? 'Viewport configured' : 'Add viewport meta tag';
  }
  
  if (lower.includes('button') || lower.includes('tap')) {
    result.status = 'partial';
    result.suggestion = 'Kiểm tra touch target size';
  }
  
  if (lower.includes('scroll') || lower.includes('mượt')) {
    result.status = data.touch.hasTouchEvents ? 'pass' : 'partial';
    result.suggestion = 'Thêm touch event handlers';
  }
  
  return result;
}

function analyzeExpertCheck(check, data) {
  const lower = check.toLowerCase();
  const result = { status: 'unknown', severity: 'minor', suggestion: '', impact: '' };
  
  if (lower.includes('viewport')) {
    result.status = data.viewport.meta ? 'pass' : 'fail';
    result.severity = 'critical';
    result.suggestion = data.viewport.meta ? 'Viewport OK' : 'Add viewport meta tag';
  }
  
  if (lower.includes('responsive') || lower.includes('breakpoint')) {
    result.status = data.responsive.hasMediaQueries ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = data.responsive.hasMediaQueries 
      ? `${data.responsive.breakpoints.length} breakpoints found` 
      : 'Add responsive breakpoints';
  }
  
  if (lower.includes('touch') || lower.includes('44')) {
    result.status = 'partial';
    result.suggestion = 'Verify 44x44px touch targets';
  }
  
  if (lower.includes('lazy')) {
    const ratio = data.performance.totalImages > 0 
      ? data.performance.lazyLoaded / data.performance.totalImages 
      : 1;
    result.status = ratio > 0.5 ? 'pass' : 'fail';
    result.severity = 'major';
    result.suggestion = `${data.performance.lazyLoaded}/${data.performance.totalImages} lazy loaded`;
  }
  
  if (lower.includes('manifest') || lower.includes('pwa')) {
    result.status = data.pwa.hasManifest ? 'pass' : 'fail';
    result.severity = 'minor';
    result.suggestion = data.pwa.hasManifest ? 'PWA manifest found' : 'Add PWA manifest';
  }
  
  return result;
}

function generateRecommendations(data) {
  const recommendations = [];
  
  if (!data.viewport.meta) {
    recommendations.push({
      priority: 'critical', category: 'Mobile', area: 'Viewport',
      issue: 'Missing viewport meta', suggestion: 'Add <meta name="viewport">',
      impact: 'Cannot scale properly'
    });
  }
  
  if (!data.responsive.hasMediaQueries) {
    recommendations.push({
      priority: 'major', category: 'Mobile', area: 'Responsive',
      issue: 'No responsive design', suggestion: 'Add media queries',
      impact: 'Poor mobile experience'
    });
  }
  
  if (!data.pwa.hasManifest) {
    recommendations.push({
      priority: 'minor', category: 'Mobile', area: 'PWA',
      issue: 'No PWA manifest', suggestion: 'Add manifest.json for installability',
      impact: 'Cannot add to home screen'
    });
  }
  
  return recommendations;
}

function calculateScore(results) {
  const userScores = results.userPerspective.map(c => c.score).filter(s => s !== null);
  const expertScores = results.expertPerspective.map(c => c.score).filter(s => s !== null);
  
  const avgUserScore = userScores.length > 0 ? userScores.reduce((a, b) => a + b, 0) / userScores.length : 0;
  const avgExpertScore = expertScores.length > 0 ? expertScores.reduce((a, b) => a + b, 0) / expertScores.length : 0;
  
  const overallScore = Math.round(avgUserScore * 0.5 + avgExpertScore * 0.5);
  
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
  console.log('📱 KẾT QUẢ PHÂN TÍCH MOBILE');
  console.log('='.repeat(60));
  
  console.log('\n📊 MOBILE DATA:');
  console.log(`   Viewport: ${results.mobileData.viewport.meta ? '✓' : '✗'}`);
  console.log(`   Media Queries: ${results.mobileData.responsive.hasMediaQueries ? '✓' : '✗'}`);
  console.log(`   PWA Manifest: ${results.mobileData.pwa.hasManifest ? '✓' : '✗'}`);
  console.log(`   Lazy Loading: ${results.mobileData.performance?.lazyLoaded || 0}/${results.mobileData.performance?.totalImages || 0}`);
  
  if (results.score) {
    console.log(`\n🎯 Điểm tổng thể: ${results.score.score}/100`);
    console.log(`   Đánh giá: ${results.score.label}`);
  }
  
  console.log('\n📋 TÓM TẮT:');
  console.log(`   Tổng vấn đề: ${results.summary.totalIssues}`);
  console.log(`   🔴 Nghiêm trọng: ${results.summary.critical}`);
  console.log(`   🟠 Lớn: ${results.summary.major}`);
  
  if (results.recommendations.length > 0) {
    console.log('\n🔧 ĐỀ XUẤT:');
    results.recommendations.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.issue} - ${r.suggestion}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

export default { runAgent, AGENT_ID, AGENT_NAME };

