import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '..', '..');
const frontCccdPath = path.resolve(repoRoot, 'Nguỵ Công  Kết_cccd_front.jpg');
const backCccdPath = path.resolve(repoRoot, 'Nguỵ Công  Kết_cccd_back.jpg');
const photo34Path = path.resolve(repoRoot, 'frontend', 'public', 'photo-guides', 'photo-3x4-valid.jpg');

async function expectAnyVisible(page, names: RegExp | string, timeout = 120_000) {
  const locator = page.getByRole('button', { name: names });
  await expect(locator.first()).toBeVisible({ timeout });
  return locator.first();
}

async function uploadDocument(page, fileIndex: number, filePath: string, expectedPreviewCount: number) {
  const uploadCard = page.locator('.upload-card').nth(fileIndex);
  await uploadCard.locator('input[type="file"]').setInputFiles(filePath);
  const confirmButton = await expectAnyVisible(page, /Dùng ảnh này|Lưu ảnh đã chỉnh/, 120_000);
  await confirmButton.click();
  await expect(page.getByRole('button', { name: 'Xem' })).toHaveCount(expectedPreviewCount, { timeout: 120_000 });
}

async function uploadPhoto(page, fileIndex: number, filePath: string) {
  const uploadCard = page.locator('.upload-card').nth(fileIndex);
  await uploadCard.locator('input[type="file"]').setInputFiles(filePath);

  const imageEditorConfirm = page.getByRole('button', { name: 'Xác nhận' }).first();
  await expect(imageEditorConfirm).toBeVisible({ timeout: 120_000 });
  await imageEditorConfirm.click();

  const variantDialog = page.getByRole('dialog', { name: /Chon phuong an anh 3x4/i });
  const chooseVariantInDialog = variantDialog.getByRole('button', { name: /Dung anh nay|Dùng ảnh này|Giu anh goc|Giữ ảnh gốc|Dùng bản AI căn lại/ }).first();
  const openSelectionButton = page.getByRole('button', { name: /Mở bộ chọn ảnh|Mo bo chon anh/ }).first();
  const directPreviewButtons = page.getByRole('button', { name: 'Xem' });

  const dialogAppeared = await variantDialog.waitFor({ state: 'visible', timeout: 180_000 }).then(() => true).catch(() => false);
  if (dialogAppeared) {
    await expect(chooseVariantInDialog).toBeVisible({ timeout: 120_000 });
    await chooseVariantInDialog.click();
  } else {
    await openSelectionButton.waitFor({ state: 'visible', timeout: 180_000 });
    await openSelectionButton.click({ force: true });
    const chooseVariantButton = await expectAnyVisible(page, /Dùng ảnh này|Dung anh nay|Giữ ảnh gốc|Giu anh goc|Dùng bản AI căn lại/, 120_000);
    await chooseVariantButton.click();
  }

  await expect(directPreviewButtons).toHaveCount(3, { timeout: 180_000 });
}

test.describe.configure({ mode: 'serial' });

test('live production smoke: public routes render', async ({ page }) => {
  const routes = [
    { path: '/', text: /Trung Tâm Đào Tạo|Ngoại Ngữ & Tin Học/i },
    { path: '/register', text: /PHIẾU ĐĂNG KÝ DỰ THI/i },
    { path: '/login', text: /đăng nhập|login/i },
    { path: '/news', text: /Tin tức|Sự kiện/i },
    { path: '/guides', text: /Hướng Dẫn|Video hướng dẫn/i },
    { path: '/feedback', text: /Feedback thật|đánh giá/i },
    { path: '/contact', text: /Kênh Kết Nối|Liên hệ/i },
  ];

  for (const route of routes) {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(route.text);
  }
});

test('live production smoke: register flow submits with real uploads', async ({ page }) => {
  test.setTimeout(900_000);
  const suffix = Date.now().toString().slice(-8);
  const uniquePhone = `09${suffix}`.slice(0, 10);
  const uniqueCccd = `9988${suffix}`.slice(0, 12);
  const uniqueEmail = `live-test-${suffix}@example.com`;

  await page.goto('/register', { waitUntil: 'networkidle' });

  await uploadDocument(page, 0, frontCccdPath, 1);
  await uploadDocument(page, 1, backCccdPath, 2);
  await uploadPhoto(page, 2, photo34Path);

  const selects = page.locator('form select');
  await page.getByPlaceholder('VÍ DỤ: NGUYỄN').fill('LIVE');
  await page.getByPlaceholder('VÍ DỤ: A').fill('TEST');
  await selects.nth(0).selectOption('01');
  await selects.nth(1).selectOption('01');
  await selects.nth(2).selectOption('2000');
  await page.getByLabel('NAM').check();
  await page.getByPlaceholder('Nhập số CCCD').fill(uniqueCccd);
  await selects.nth(3).selectOption('14');
  await selects.nth(4).selectOption('04');
  await selects.nth(5).selectOption('2021');
  await page.getByPlaceholder('09xxxxxxxx').fill(uniquePhone);
  await page.getByPlaceholder('email@example.com').fill(uniqueEmail);
  await page.getByTestId('birth-place-select').selectOption('Hà Nội');
  await page.getByPlaceholder('Ví dụ: Sinh viên trường Đại học Công nghiệp').fill('LIVE PRODUCTION TEST');
  await page.getByPlaceholder('Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh/TP...').fill('Ha Noi - live production test');
  await page.getByLabel('Tôi cam đoan và hoàn toàn chịu trách nhiệm về sự chính xác của ảnh và thông tin đã cung cấp trong Phiếu đăng ký dự thi.').check();
  await page.getByLabel('Tôi đồng ý việc VAN TRANG EDU sử dụng các thông tin cá nhân này vào mục đích phục vụ các công tác liên quan đến kỳ thi.').check();
  await page.getByRole('button', { name: 'Hoàn tất đăng ký' }).click();

  const successText = page.getByText('Đăng ký thành công! Thông tin của bạn đã được ghi nhận.');
  await expect.poll(async () => {
    if (await successText.isVisible().catch(() => false)) {
      return 'success';
    }
    return new URL(page.url()).pathname;
  }, { timeout: 120_000 }).toMatch(/success|\/dashboard\/exams/);
});
