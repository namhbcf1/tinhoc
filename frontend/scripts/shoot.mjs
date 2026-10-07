/**
 * Chụp ảnh màn hình các trang để kiểm tra thiết kế (không phải test tự động).
 *
 * Vì sao có script này: `npx playwright screenshot` đòi đúng bản browser 1228 trong khi máy
 * chỉ có 1243 ⇒ script trỏ thẳng `executablePath` vào chromium có sẵn, không cần tải thêm.
 *
 * Dùng:
 *   node scripts/shoot.mjs <url> <file.png> [width] [height] [waitMs] [--full]
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const CHROME_CANDIDATES = [
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1181\\chrome-win64\\chrome.exe`,
];

const [url, out, width = '1440', height = '900', waitMs = '2500', ...flags] = process.argv.slice(2);

if (!url || !out) {
  console.error('Dùng: node scripts/shoot.mjs <url> <file.png> [width] [height] [waitMs] [--full]');
  process.exit(1);
}

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Không tìm thấy chromium trong ms-playwright:', CHROME_CANDIDATES);
  process.exit(1);
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({
    viewport: { width: Number(width), height: Number(height) },
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(Number(waitMs));
  await page.screenshot({ path: out, fullPage: flags.includes('--full') });
  console.log(`OK ${out}`);
} finally {
  await browser.close();
}
