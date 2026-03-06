/**
 * AI Analysis Library
 * Phân tích nội dung với AI (sử dụng OpenAI hoặc Claude)
 * 
 * Fallback: Phân tích cục bộ nếu không có API key
 */

const ANALYSIS_TEMPLATES = {
  ux_ui: `
Bạn là chuyên gia UX/UI. Phân tích trang web sau và cho biết:
1. Trang có dễ sử dụng không?
2. Navigation có rõ ràng không?
3. Màu sắc và typography có nhất quán không?
4. Có vấn đề về layout không?

Trang: {{url}}
HTML: {{html}}
`,
  
  accessibility: `
Bạn là chuyên gia về Accessibility (WCAG). Phân tích trang web sau:
1. Có alt text cho images không?
2. Form labels có đầy đủ không?
3. Color contrast có đạt chuẩn không?
4. Có thể điều hướng bằng keyboard không?
5. ARIA labels có sử dụng đúng không?

Trang: {{url}}
HTML: {{html}}
`,
  
  performance: `
Bạn là chuyên gia về Web Performance. Phân tích:
1. Kích thước trang?
2. Số lượng requests?
3. Có lazy loading không?
4. Images có optimized không?
5. CSS/JS có blocking không?

Trang: {{url}}
Metrics: {{metrics}}
`,
  
  security: `
Bạn là chuyên gia Security. Phân tích:
1. Có HTTPS không?
2. CORS headers?
3. XSS protection?
4. Form security?
5. Sensitive data exposure?

Trang: {{url}}
Headers: {{headers}}
`,
  
  seo: `
Bạn là chuyên gia SEO. Phân tích:
1. Meta tags đầy đủ?
2. Heading hierarchy đúng?
3. Alt text cho images?
4. Internal links?
5. Mobile friendly?

Trang: {{url}}
Meta: {{meta}}
Headings: {{headings}}
`
};

/**
 * Phân tích với AI (OpenAI/Claude) hoặc fallback local
 */
export async function analyzeWithAI(check, pages, options = {}) {
  const template = ANALYSIS_TEMPLATES[options.template] || ANALYSIS_TEMPLATES.ux_ui;
  
  // Prepare context
  const context = {
    url: pages.home?.url || '',
    html: pages.home?.html?.substring(0, 5000) || '',
    meta: JSON.stringify(pages.home?.content?.meta || {}),
    headings: JSON.stringify(pages.home?.content?.headings || {}),
    metrics: JSON.stringify(pages.home?.metrics || {})
  };
  
  const prompt = template
    .replace('{{url}}', context.url)
    .replace('{{html}}', context.html)
    .replace('{{meta}}', context.meta)
    .replace('{{headings}}', context.headings)
    .replace('{{metrics}}', context.metrics);
  
  // Thử với AI API nếu có
  if (process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY) {
    try {
      const result = await analyzeWithAIAPI(prompt, check, options);
      if (result) return result;
    } catch (e) {
      console.log('AI API not available, using local analysis');
    }
  }
  
  // Fallback: phân tích cục bộ
  return localAnalysis(check, pages);
}

async function analyzeWithAIAPI(prompt, check, options) {
  const fullPrompt = `${prompt}\n\nCâu hỏi cụ thể: ${check}`;
  
  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: options.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Bạn là chuyên gia phân tích web. Trả lời ngắn gọn, có cấu trúc.' },
          { role: 'user', content: fullPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      return parseAIResponse(response.choices[0].message.content);
    } catch (e) {
      console.log('OpenAI error:', e.message);
    }
  }
  
  return null;
}

function localAnalysis(check, pages) {
  // Fallback analysis không cần AI - pattern matching
  const html = pages.home?.html || '';
  
  const results = {
    status: 'unknown',
    severity: 'minor',
    suggestion: 'Cần kiểm tra thủ công',
    impact: 'Chưa xác định'
  };
  
  // Simple pattern matching
  if (check.toLowerCase().includes('alt')) {
    const imgWithoutAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
    const imgEmptyAlt = (html.match(/<img[^>]*alt=["']\s*["'][^>]*>/gi) || []).length;
    const totalIssues = imgWithoutAlt + imgEmptyAlt;
    
    if (totalIssues > 0) {
      results.status = 'fail';
      results.severity = 'major';
      results.suggestion = `Thêm alt text cho ${totalIssues} images`;
      results.impact = 'Ảnh hưởng đến accessibility và SEO';
    } else {
      results.status = 'pass';
      results.suggestion = 'Tất cả images có alt text';
    }
  }
  
  if (check.toLowerCase().includes('meta') || check.toLowerCase().includes('description')) {
    const hasMetaDesc = html.includes('name="description"');
    results.status = hasMetaDesc ? 'pass' : 'fail';
    results.severity = 'major';
    results.suggestion = hasMetaDesc ? 'Tốt' : 'Thêm meta description';
    results.impact = 'Ảnh hưởng đến SEO';
  }
  
  if (check.toLowerCase().includes('title')) {
    const hasTitle = html.includes('<title>');
    results.status = hasTitle ? 'pass' : 'fail';
    results.severity = 'major';
  }
  
  if (check.toLowerCase().includes('heading') || check.toLowerCase().includes('h1')) {
    const h1Count = (html.match(/<h1/gi) || []).length;
    results.status = h1Count === 1 ? 'pass' : 'fail';
    results.severity = h1Count === 0 ? 'critical' : 'major';
    results.suggestion = h1Count === 1 
      ? 'Tốt - có đúng 1 thẻ H1' 
      : `Cần có đúng 1 thẻ H1 (hiện tại: ${h1Count})`;
    results.impact = 'Ảnh hưởng đến SEO';
  }
  
  if (check.toLowerCase().includes('label') || check.toLowerCase().includes('form')) {
    const inputsWithoutLabels = (html.match(/<input(?![^>]*id=)[^>]*>/gi) || []).length;
    results.status = inputsWithoutLabels < 5 ? 'pass' : 'partial';
    results.severity = inputsWithoutLabels > 10 ? 'major' : 'minor';
    results.suggestion = inputsWithoutLabels > 0 
      ? `Kiểm tra labels cho ${inputsWithoutLabels} input elements` 
      : 'Form có labels đầy đủ';
  }
  
  if (check.toLowerCase().includes('contrast') || check.toLowerCase().includes('màu')) {
    results.status = 'partial';
    results.severity = 'minor';
    results.suggestion = 'Cần kiểm tra color contrast bằng công cụ chuyên dụng';
    results.impact = 'Ảnh hưởng đến accessibility';
  }
  
  if (check.toLowerCase().includes('lazy') || check.toLowerCase().includes('loading')) {
    const hasLazyLoad = html.includes('loading="lazy"') || html.includes('IntersectionObserver');
    results.status = hasLazyLoad ? 'pass' : 'fail';
    results.severity = 'minor';
    results.suggestion = hasLazyLoad ? 'Tốt' : 'Thêm lazy loading cho images';
    results.impact = 'Ảnh hưởng đến performance';
  }
  
  return results;
}

function parseAIResponse(response) {
  const lower = response.toLowerCase();
  
  return {
    rawResponse: response,
    status: lower.includes('tốt') || lower.includes('good') || lower.includes('pass') || lower.includes('có') && !lower.includes('không có')
      ? 'pass' 
      : lower.includes('không') || lower.includes('no') || lower.includes('fail') || lower.includes('lỗi')
        ? 'fail'
        : 'partial',
    severity: lower.includes('nghiêm trọng') || lower.includes('critical') || lower.includes('high')
      ? 'high'
      : lower.includes('trung bình') || lower.includes('medium') || lower.includes('average')
        ? 'medium'
        : 'low',
    suggestion: extractSuggestion(response),
    impact: extractImpact(response)
  };
}

function extractSuggestion(response) {
  const lines = response.split('\n').filter(l => l.trim());
  for (const line of lines) {
    if (line.includes('💡') || line.includes('Suggestion') || line.includes('Đề xuất') || line.includes('Nên') || line.includes('->')) {
      return line.replace(/^[💡\s\S]*?[\:\-]\s*/, '').trim();
    }
  }
  return lines[lines.length - 1] || 'Cần kiểm tra thủ công';
}

function extractImpact(response) {
  if (response.includes('SEO')) return 'Ảnh hưởng đến xếp hạng tìm kiếm';
  if (response.includes('accessibility') || response.includes('khuyết tật')) return 'Ảnh hưởng đến người khuyết tật';
  if (response.includes('performance') || response.includes('tốc độ')) return 'Ảnh hưởng đến trải nghiệm người dùng';
  if (response.includes('security') || response.includes('bảo mật')) return 'Rủi ro bảo mật';
  return 'Chưa xác định';
}

export async function batchAnalyze(checks, pages, options = {}) {
  return Promise.all(
    checks.map(check => analyzeWithAI(check, pages, options))
  );
}

export default { analyzeWithAI, batchAnalyze };
