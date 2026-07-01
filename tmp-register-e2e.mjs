import { chromium } from '@playwright/test';
import path from 'node:path';

const URL = 'https://vantrangedu.com/register';
const FRONT = 'C:/Users/ADMIN/Desktop/vantrang/vantrangedu/Nguỵ Công  Kết_cccd_front.jpg';

const log = (...a) => console.log('[E2E]', ...a);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));

try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  log('loaded', await page.title());

  // Find all file inputs (the 3 uploaders).
  const fileInputs = page.locator('input[type="file"]');
  const count = await fileInputs.count();
  log('file inputs found:', count);
  if (count === 0) { log('NO FILE INPUTS — UI may differ'); }

  // Upload front CCCD to the first file input.
  await fileInputs.first().setInputFiles(FRONT).catch((e) => log('setInputFiles err', e.message));
  log('uploaded front image, waiting for OCR...');

  // Wait up to 40s for the name field to become non-empty.
  let filled = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const ho = await page.locator('#ho').inputValue().catch(() => '');
    const cccd = await page.locator('#cccd').inputValue().catch(() => '');
    const ten = await page.locator('#ten').inputValue().catch(() => '');
    if (ho || cccd || ten) {
      log(`FILLED after ${i + 1}s -> ho="${ho}" ten="${ten}" cccd="${cccd}"`);
      filled = true;
      break;
    }
  }
  if (!filled) log('NOT FILLED after 40s');

  // Dump final values + any visible OCR message.
  for (const id of ['ho', 'ten_dem', 'ten', 'cccd', 'ngay', 'thang', 'nam', 'dan_toc']) {
    const v = await page.locator('#' + id).inputValue().catch(() => '(n/a)');
    log(`  ${id} = "${v}"`);
  }
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const ocrMsg = bodyText.split('\n').filter((l) => /OCR|tự điền|nhận diện|đọc thông tin|mặt trước/i.test(l)).slice(0, 6);
  log('OCR-related on-screen text:', JSON.stringify(ocrMsg));
  log('console errors:', JSON.stringify(consoleErrors.slice(0, 10)));
} catch (e) {
  log('FATAL', e.message);
} finally {
  await browser.close();
}
