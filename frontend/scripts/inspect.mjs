/**
 * Chẩn đoán nhanh một phần tử trên trang: textContent thật + font đang áp dụng.
 * Dùng để phân biệt "chữ trong source bị lỗi" vs "font thiếu glyph tiếng Việt".
 *
 * Dùng: node scripts/inspect.mjs <url> "<css selector>" [waitMs]
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`;
if (!existsSync(CHROME)) {
  console.error('Không thấy chromium:', CHROME);
  process.exit(1);
}

const [url, selector, waitMs = '3000'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(Number(waitMs));

  const result = await page.evaluate((sel) => {
    const nodes = Array.from(document.querySelectorAll(sel)).slice(0, 6);
    return nodes.map((el) => {
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        className: (el.className || '').toString().slice(0, 120),
        text: (el.textContent || '').trim().slice(0, 120),
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        textTransform: cs.textTransform,
        letterSpacing: cs.letterSpacing,
      };
    });
  }, selector);

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
