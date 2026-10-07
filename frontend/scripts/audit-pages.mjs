/**
 * Audit layout tự động cho nhiều URL (tìm lỗi thị giác một cách KHÁCH QUAN thay vì soi ảnh).
 *
 * Phát hiện:
 *  1. Tràn ngang (scrollWidth > viewportWidth)  → lỗi bố cục thật.
 *  2. Trang gần như trống (nội dung chữ quá ít) → khả năng render lỗi / sai route.
 *  3. Lỗi console / request thất bại.
 *  4. "Vùng phải bỏ trống": trong 900px đầu, mép phải xa nhất của phần tử CÓ CHỮ < 62% chiều rộng
 *     (đây chính là lỗi hero nửa phải trống đã gặp ở /training).
 *
 * Dùng: node scripts/audit-pages.mjs <url1> <url2> ... [--width=1440]
 */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';

const CHROME_CANDIDATES = [
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1181\\chrome-win64\\chrome.exe`,
];
const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Không thấy chromium');
  process.exit(1);
}

const args = process.argv.slice(2);
const widthArg = args.find((a) => a.startsWith('--width='));
const width = widthArg ? Number(widthArg.split('=')[1]) : 1440;
const urls = args.filter((a) => !a.startsWith('--'));

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const rows = [];

for (const url of urls) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  const httpErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 120));
  });
  page.on('requestfailed', (r) => errors.push(`REQ FAIL ${r.url().slice(0, 90)}`));
  page.on('response', (r) => {
    if (r.status() >= 400) httpErrors.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 110)}`);
  });

  let status = 'ERR';
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    status = resp ? String(resp.status()) : '?';
  } catch {
    status = 'TIMEOUT';
  }
  await page.waitForTimeout(2200);

  const data = await page.evaluate(() => {
    const de = document.documentElement;
    const vw = window.innerWidth;
    const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim();

    // mép phải xa nhất của phần tử có chữ trong 900px đầu
    let maxRight = 0;
    let sample = '';
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 12) continue;
      if (r.top > 900 || r.bottom < 90) continue;
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join('');
      if (!own) continue;
      if (r.right > maxRight) {
        maxRight = r.right;
        sample = own.slice(0, 60);
      }
    }

    return {
      title: document.title,
      scrollH: de.scrollHeight,
      overflowX: de.scrollWidth - vw,
      textLen: text.length,
      maxRight: Math.round(maxRight),
      vw,
      sample,
      h1: (document.querySelector('h1')?.innerText || '').replace(/\s+/g, ' ').slice(0, 70),
    };
  });

  rows.push({ url: url.replace('http://localhost:', ':'), status, ...data, errors: errors.length, firstErr: errors[0] || '', httpErrors });
  await page.close();
}
await browser.close();

console.log(`viewport ${width}px\n`);
for (const r of rows) {
  const flags = [];
  if (r.status !== '200') flags.push(`HTTP ${r.status}`);
  if (r.overflowX > 2) flags.push(`TRÀN NGANG +${r.overflowX}px`);
  if (r.textLen < 400) flags.push(`NỘI DUNG ÍT (${r.textLen} ký tự)`);
  if (r.errors > 0) flags.push(`${r.errors} lỗi console/req`);
  if (r.maxRight < r.vw * 0.62) flags.push(`PHẢI TRỐNG (mép chữ ${r.maxRight}/${r.vw})`);
  console.log(`${flags.length ? '⚠️ ' : '✅ '}${r.url}`);
  console.log(`     h1: "${r.h1}"  | cao ${r.scrollH}px | chữ ${r.textLen} | mép phải ${r.maxRight}`);
  if (flags.length) console.log(`     → ${flags.join(' · ')}`);
  if (r.firstErr) console.log(`     lỗi đầu: ${r.firstErr}`);
  if (r.httpErrors?.length) {
    for (const h of [...new Set(r.httpErrors)].slice(0, 4)) console.log(`     HTTP: ${h}`);
  }
}
