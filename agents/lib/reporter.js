/**
 * Reporter Library
 * Tạo báo cáo từ kết quả phân tích
 */

import fs from 'fs';
import path from 'path';

/**
 * Generate report in specified format
 * @param {Object} results - Agent results
 * @param {Object} options - Report options
 * @returns {string} Formatted report
 */
export function generateReport(results, options = {}) {
  const format = options.format || 'json';

  switch (format) {
    case 'json':
      return generateJSONReport(results);
    case 'html':
      return generateHTMLReport(results);
    case 'markdown':
      return generateMarkdownReport(results);
    default:
      return generateJSONReport(results);
  }
}

function generateJSONReport(results) {
  return JSON.stringify(results, null, 2);
}

function generateHTMLReport(results) {
  const scoreClass = results.score?.label?.toLowerCase() || 'average';

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Analysis Report - ${results.agentName || 'Analysis'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 2rem; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .score-card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .score { font-size: 3rem; font-weight: bold; }
    .score.excellent { color: #10B981; }
    .score.good { color: #3B82F6; }
    .score.average { color: #F59E0B; }
    .score.poor { color: #EF4444; }
    .summary { display: flex; gap: 20px; flex-wrap: wrap; }
    .summary-item { padding: 15px 20px; background: #f8fafc; border-radius: 8px; flex: 1; min-width: 150px; }
    .summary-item.critical { border-left: 4px solid #EF4444; }
    .summary-item.major { border-left: 4px solid #F59E0B; }
    .summary-item.minor { border-left: 4px solid #3B82F6; }
    .recommendations { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .recommendation { padding: 15px; border-bottom: 1px solid #eee; }
    .recommendation:last-child { border-bottom: none; }
    .priority { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-right: 10px; }
    .priority.critical { background: #FEE2E2; color: #991B1B; }
    .priority.major { background: #FEF3C7; color: #92400E; }
    .priority.minor { background: #DBEAFE; color: #1E40AF; }
    .footer { text-align: center; padding: 20px; color: #666; }
    .breakdown { display: flex; gap: 20px; margin-top: 10px; }
    .breakdown-item { flex: 1; text-align: center; padding: 10px; background: #f8fafc; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Web Analysis Report</h1>
      <p>URL: ${results.url}</p>
      <p>Thời gian: ${new Date(results.timestamp).toLocaleString('vi-VN')}</p>
      <p>Agent: ${results.agentName}</p>
    </div>

    ${results.score ? `
    <div class="score-card">
      <h2>Điểm tổng thể</h2>
      <div class="score ${scoreClass}">${results.score.score}/100</div>
      <p>Đánh giá: <strong>${results.score.label}</strong></p>
      ${results.score.breakdown ? `
      <div class="breakdown">
        <div class="breakdown-item">
          <strong>User Perspective</strong><br>
          ${results.score.breakdown.userPerspective}/100
        </div>
        <div class="breakdown-item">
          <strong>Expert Perspective</strong><br>
          ${results.score.breakdown.expertPerspective}/100
        </div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${results.summary ? `
    <div class="summary">
      <div class="summary-item">
        <strong>Tổng vấn đề</strong><br>
        ${results.summary.totalIssues}
      </div>
      <div class="summary-item critical">
        <strong>Nghiêm trọng</strong><br>
        ${results.summary.critical}
      </div>
      <div class="summary-item major">
        <strong>Lớn</strong><br>
        ${results.summary.major}
      </div>
      <div class="summary-item minor">
        <strong>Nhỏ</strong><br>
        ${results.summary.minor}
      </div>
    </div>
    ` : ''}

    ${results.recommendations?.length > 0 ? `
    <div class="recommendations" style="margin-top: 20px;">
      <h2>Đề xuất cải thiện</h2>
      ${results.recommendations.map(r => `
        <div class="recommendation">
          <span class="priority ${r.priority}">${r.priority.toUpperCase()}</span>
          <h3>${r.issue}</h3>
          <p><strong>${r.category}</strong> - ${r.area}</p>
          <p>💡 ${r.suggestion}</p>
          ${r.impact ? `<p>Impact: ${r.impact}</p>` : ''}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      Generated by Web Analysis Agent System
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function generateMarkdownReport(results) {
  let md = `# Web Analysis Report\n\n`;
  md += `**URL:** ${results.url}\n`;
  md += `**Thời gian:** ${new Date(results.timestamp).toLocaleString('vi-VN')}\n`;
  md += `**Agent:** ${results.agentName}\n\n`;

  if (results.score) {
    md += `## Điểm tổng thể\n\n`;
    md += `- **Điểm:** ${results.score.score}/100\n`;
    md += `- **Đánh giá:** ${results.score.label}\n`;
    if (results.score.breakdown) {
      md += `- User Perspective: ${results.score.breakdown.userPerspective}/100\n`;
      md += `- Expert Perspective: ${results.score.breakdown.expertPerspective}/100\n`;
    }
    md += `\n`;
  }

  if (results.summary) {
    md += `## Tóm tắt\n\n`;
    md += `- Tổng vấn đề: ${results.summary.totalIssues}\n`;
    md += `- 🔴 Nghiêm trọng: ${results.summary.critical}\n`;
    md += `- 🟠 Lớn: ${results.summary.major}\n`;
    md += `- 🟡 Nhỏ: ${results.summary.minor}\n\n`;
  }

  if (results.recommendations?.length > 0) {
    md += `## Đề xuất cải thiện\n\n`;
    results.recommendations.forEach((r, i) => {
      md += `### ${i + 1}. ${r.issue}\n`;
      md += `- **Priority:** ${r.priority}\n`;
      md += `- **Category:** ${r.category}\n`;
      md += `- **Area:** ${r.area}\n`;
      md += `- **Suggestion:** ${r.suggestion}\n`;
      if (r.impact) {
        md += `- **Impact:** ${r.impact}\n`;
      }
      md += `\n`;
    });
  }

  return md;
}

/**
 * Save report to file
 * @param {Object} results - Agent results
 * @param {string} filepath - Output file path
 * @param {Object} options - Report options
 * @returns {string} Saved file path
 */
export function saveReport(results, filepath, options = {}) {
  const report = generateReport(results, options);
  fs.writeFileSync(filepath, report, 'utf-8');
  return filepath;
}

/**
 * Save multiple reports to directory
 * @param {Array} resultsArray - Array of agent results
 * @param {string} outputDir - Output directory
 * @param {Object} options - Report options
 * @returns {Array} Array of saved file paths
 */
export function saveReports(resultsArray, outputDir, options = {}) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const saved = [];
  resultsArray.forEach(results => {
    const filename = `${results.agentId}-report.${options.format || 'json'}`;
    const filepath = path.join(outputDir, filename);
    saveReport(results, filepath, options);
    saved.push(filepath);
  });

  return saved;
}

export default { generateReport, saveReport, saveReports };
