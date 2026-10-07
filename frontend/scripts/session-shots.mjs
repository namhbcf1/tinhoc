/**
 * ĐĂNG NHẬP THẬT rồi chụp các trang SAU ĐĂNG NHẬP (student/teacher) — dùng tài khoản test.
 *
 * Vì sao cần script riêng: dev proxy trỏ `localhost:8787` (backend không chạy) nên login sẽ fail.
 * Script này chuyển MỌI request /api/* (cả POST) sang API production rồi fulfill, nên phiên đăng
 * nhập chạy được thật (chỉ đọc dữ liệu của chính tài khoản test).
 *
 * Dùng:
 *   node scripts/session-shots.mjs <cccd> <phone> <outDir> [route1 route2 ...]
 * Ví dụ:
 *   node scripts/session-shots.mjs 017202000201 0836768597 ../_design-shots "#/my-courses" "#/exam-history"
 */
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`;
if (!existsSync(CHROME)) {
  console.error('Không thấy chromium:', CHROME);
  process.exit(1);
}

const [cccd, phone, outDir, ...routes] = process.argv.slice(2);
if (!cccd || !phone || !outDir) {
  console.error('Dùng: node scripts/session-shots.mjs <cccd> <phone> <outDir> [route...]');
  process.exit(1);
}
const BASE = 'http://localhost:3000';
const API = 'https://vantrangexam.com';
const targets = routes.length ? routes : ['#/my-courses', '#/exam-history'];
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// Chuyển mọi request /api/* sang production (giữ method/body/headers) để login + phiên chạy thật.
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const u = new URL(req.url());
  try {
    const resp = await fetch(`${API}${u.pathname}${u.search}`, {
      method: req.method(),
      headers: { 'content-type': req.headers()['content-type'] || 'application/json', accept: 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData(),
    });
    await route.fulfill({
      status: resp.status,
      contentType: resp.headers.get('content-type') || 'application/json',
      body: await resp.text(),
    });
  } catch (err) {
    await route.fulfill({ status: 502, contentType: 'application/json', body: `{"error":"${String(err).slice(0, 60)}"}` });
  }
});

console.log('1) mở trang đăng nhập');
await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
await page.waitForTimeout(2500);

console.log('2) điền thông tin đăng nhập');
const inputs = await page.$$('input');
console.log(`   thấy ${inputs.length} input`);
if (inputs[0]) await inputs[0].fill(cccd);
if (inputs[1]) await inputs[1].fill(phone);

console.log('3) bấm đăng nhập');
const submit = await page.$('button:has-text("ĐĂNG NHẬP"), button:has-text("Đăng nhập")');
if (submit) await submit.click();
else console.log('   ⚠ không thấy nút đăng nhập');
await page.waitForTimeout(5000);

const afterLogin = page.url();
console.log(`4) sau đăng nhập: ${afterLogin}`);
await page.screenshot({ path: `${outDir}/exam-after-login.png` });

// Kiểm tra có token trong storage không (dấu hiệu đăng nhập thành công)
const hasToken = await page.evaluate(() => {
  const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
  return keys.filter((k) => /token|user/i.test(k)).map((k) => `${k}=${(localStorage.getItem(k) || sessionStorage.getItem(k) || '').slice(0, 24)}`);
});
console.log(`   storage auth: ${hasToken.length ? hasToken.join(' | ') : 'KHÔNG THẤY'}`);

for (const r of targets) {
  const name = r.replace(/[#/]/g, '_').replace(/^_/, '');
  console.log(`5) chụp ${r}`);
  await page.goto(`${BASE}/${r}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${outDir}/exam-${name}.png`, fullPage: true });
  console.log(`   -> ${outDir}/exam-${name}.png  (url: ${page.url()})`);
}

await browser.close();
