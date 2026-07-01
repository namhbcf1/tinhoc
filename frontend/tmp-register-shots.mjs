import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'tmp-register-audit';
mkdirSync(OUT, { recursive: true });

const URL = 'https://vantrangedu.com/register';

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

async function capture(name, contextOpts, viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${name}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => pageErrors.push(`[${name}] ${err.message}`));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    failedRequests.push(`[${name}] ${req.url()} — ${f ? f.errorText : 'unknown'}`);
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  // Full page screenshot
  await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
  // Above-the-fold
  await page.screenshot({ path: `${OUT}/${name}-fold.png`, fullPage: false });

  // Scroll to the upload section and shoot it
  const uploadSection = page.locator('.upload-grid').first();
  if (await uploadSection.count()) {
    await uploadSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await uploadSection.screenshot({ path: `${OUT}/${name}-uploads.png` }).catch(() => {});
  }

  await browser.close();
}

// Desktop 1440x900
await capture('desktop', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
// Mobile iPhone 13
await capture('mobile', { ...devices['iPhone 13'] });
// Tablet
await capture('tablet', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 });

console.log('=== CONSOLE ERRORS ===');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)');
console.log('\n=== PAGE ERRORS ===');
console.log(pageErrors.length ? pageErrors.join('\n') : '(none)');
console.log('\n=== FAILED REQUESTS ===');
console.log(failedRequests.length ? failedRequests.join('\n') : '(none)');
console.log('\nScreenshots saved to', OUT);
