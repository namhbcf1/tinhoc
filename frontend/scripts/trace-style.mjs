/**
 * TRACE STYLE — tìm CHÍNH XÁC rule CSS đang áp cho một phần tử (thay vì grep mò).
 *
 * Cách dùng: node scripts/trace-style.mjs <url> "<selector>" [waitMs] [--click]
 *   --click: bấm vào phần tử trước khi đọc (để bắt trạng thái :focus)
 *
 * In ra: computed style các thuộc tính liên quan (outline/border/box-shadow/accent-color)
 * và mọi rule trong document.styleSheets khớp selector của phần tử (ưu tiên rule có 'focus'
 * hoặc có màu xanh/indigo).
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`;
if (!existsSync(CHROME)) {
  console.error('Không thấy chromium');
  process.exit(1);
}

const [url, selector, waitMs = '2500'] = process.argv.slice(2);
const doClick = process.argv.includes('--click');

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(Number(waitMs));
  if (doClick) {
    await page.click(selector).catch((e) => console.log('không bấm được:', String(e).slice(0, 80)));
    await page.waitForTimeout(600);
  }

  const out = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { error: `không thấy ${sel}` };
    el.focus?.();
    const cs = getComputedStyle(el);
    const computed = {
      matchesFocus: el.matches(':focus'),
      outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
      border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      boxShadow: cs.boxShadow,
      accentColor: cs.accentColor,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
    };

    const GREENISH = /(green|emerald|#0[0-9a-f]?[0-9a-f]{2}|#1d6f5f|#22c55e|#16a34a|#10b981|#059669|#4ade80|#86efac)/i;
    const found = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // stylesheet cross-origin
      }
      for (const rule of Array.from(rules || [])) {
        const text = rule.cssText || '';
        // rule lồng trong @media / @layer
        const inner = rule.cssRules ? Array.from(rule.cssRules) : [rule];
        for (const r of inner) {
          const sel2 = r.selectorText;
          if (!sel2) continue;
          let matches = false;
          try {
            matches = el.matches(sel2);
          } catch {
            continue;
          }
          if (!matches) continue;
          const t = r.cssText || '';
          const interesting = /focus|outline|accent-color|border-color|box-shadow/.test(t);
          const green = GREENISH.test(t);
          if (interesting || green) {
            found.push({
              sheet: (sheet.href || 'inline').split('/').pop().slice(0, 40),
              selector: sel2.slice(0, 90),
              green,
              text: t.slice(0, 220),
            });
          }
        }
      }
    }
    return { computed, found: found.slice(0, 25), total: found.length };
  }, selector);

  console.log(JSON.stringify(out, null, 2));
} finally {
  await browser.close();
}
