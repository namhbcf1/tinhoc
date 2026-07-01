import { chromium } from '@playwright/test';

const URL = process.argv[2] || 'https://66c08e2a.vantrangedu.pages.dev/register';
const FRONT = 'C:/Users/ADMIN/Desktop/vantrang/vantrangedu/Nguỵ Công  Kết_cccd_front.jpg';
const log = (...a) => console.log('[V]', ...a);

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Users/ADMIN/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
});
const page = await browser.newPage();
const cspErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && /Content Security|opencv/i.test(m.text())) cspErrors.push(m.text()); });

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  log('loaded', URL);
  await page.locator('input[type="file"]').first().setInputFiles(FRONT);
  await page.waitForTimeout(4000);
  const confirm = page.getByRole('button', { name: /Xác nhận vùng CCCD|Xác nhận/i });
  if (await confirm.count()) { await confirm.first().click(); log('clicked confirm'); }

  let ok = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const cccd = await page.locator('#cccd').inputValue().catch(() => '');
    if (cccd) { ok = true; break; }
  }
  const vals = {};
  for (const id of ['ho', 'ten_dem', 'ten', 'cccd', 'ngay', 'thang', 'nam']) {
    vals[id] = await page.locator('#' + id).inputValue().catch(() => '(n/a)');
  }
  log('FILLED:', ok);
  log('VALUES:', JSON.stringify(vals));
  log('CSP/opencv errors:', cspErrors.length === 0 ? 'NONE (opencv allowed)' : JSON.stringify(cspErrors.slice(0, 3)));
} catch (e) {
  log('FATAL', e.message);
} finally {
  await browser.close();
}
