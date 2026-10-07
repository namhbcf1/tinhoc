/**
 * Chụp ảnh màn hình các trang để kiểm tra thiết kế (không phải test tự động).
 *
 * Vì sao có script này: `npx playwright screenshot` đòi đúng bản browser 1228 trong khi máy
 * chỉ có 1243 ⇒ script trỏ thẳng `executablePath` vào chromium có sẵn, không cần tải thêm.
 *
 * Dùng:
 *   node scripts/shoot.mjs <url> <file.png> [width] [height] [waitMs] [--full] [--api=https://vantrangedu.com]
 *
 * --api=<origin>: chuyển mọi request /api/* sang API production để chụp được trang có DỮ LIỆU
 * THẬT (dev proxy trỏ localhost:8787 nên 500 khi backend chưa chạy). Chỉ đọc, không đụng repo.
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const CHROME_CANDIDATES = [
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1181\\chrome-win64\\chrome.exe`,
];

const [url, out, width = '1440', height = '900', waitMs = '2500', ...flags] = process.argv.slice(2);
const apiArg = flags.find((f) => f.startsWith('--api='));
const apiBase = apiArg ? apiArg.slice('--api='.length).replace(/\/$/, '') : null;

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
  if (apiBase) {
    // Không dùng route.continue({ url }) vì Playwright bắt buộc cùng protocol (http→https bị chặn).
    // Thay vào đó tự fetch rồi fulfill — vẫn là request ĐỌC ra ngoài, không sửa gì trong repo.
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      if (req.method() !== 'GET') return route.continue();
      const u = new URL(req.url());
      const target = `${apiBase}${u.pathname}${u.search}`;
      try {
        const resp = await fetch(target, { headers: { accept: 'application/json' } });
        const body = await resp.text();
        await route.fulfill({
          status: resp.status,
          contentType: resp.headers.get('content-type') || 'application/json',
          body,
        });
      } catch (err) {
        await route.fulfill({ status: 502, contentType: 'application/json', body: `{"success":false,"error":"${String(err).slice(0, 80)}"}` });
      }
    });
  }
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(Number(waitMs));

  // --click=<selector>: bấm trước khi chụp (để verify dropdown/tab/modal).
  // --click2=<selector>: bấm thêm một lần nữa (ví dụ mở modal rồi mở tiếp mục con).
  for (const name of ['--click=', '--click2=']) {
    const arg = flags.find((f) => f.startsWith(name));
    if (!arg) continue;
    const sel = arg.slice(name.length);
    try {
      await page.click(sel, { timeout: 6000 });
      await page.waitForTimeout(1200);
      console.log(`   đã bấm: ${sel}`);
    } catch (err) {
      console.log(`   ⚠ KHÔNG bấm được ${sel}: ${String(err).slice(0, 90)}`);
    }
  }

  await page.screenshot({ path: out, fullPage: flags.includes('--full') });
  console.log(`OK ${out}`);
} finally {
  await browser.close();
}
