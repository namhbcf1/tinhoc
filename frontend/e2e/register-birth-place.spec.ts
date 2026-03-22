import { expect, test } from '@playwright/test';
import { createPngUpload } from './helpers/files';
import { createMockJwt } from './helpers/session';
import { fulfillJson, installApiMock } from './helpers/api';

test('register submits domestic birthplace from the 34-province selector', async ({ page }) => {
  let uploadedCount = 0;
  let registrationPayload: Record<string, unknown> | null = null;

  await installApiMock(page, [
    {
      method: 'POST',
      pathname: '/api/cccd-upload',
      handle: async ({ route }) => {
        uploadedCount += 1;
        await fulfillJson(route, { success: true, imageId: `img-${uploadedCount}` });
      },
    },
    {
      method: 'POST',
      pathname: '/api/cccd-upload/extract',
      handle: async ({ route }) => {
        await fulfillJson(route, { success: true, data: { prefill: {}, hasUsefulData: false } });
      },
    },
    {
      method: 'POST',
      pathname: '/api/students/register',
      handle: async ({ route, json }) => {
        registrationPayload = json as Record<string, unknown>;
        await fulfillJson(route, {
          success: true,
          token: createMockJwt({
            role: 'student',
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
          }),
          data: {
            id: 1,
            cccd: registrationPayload.cccd,
            ho_ten_full: 'Nguyen Van A',
            registrations: [],
          },
        });
      },
    },
  ]);

  await page.goto('/register');

  const fileInputs = page.locator('input[type="file"]');
  for (let index = 0; index < 3; index += 1) {
    await fileInputs.nth(index).setInputFiles(createPngUpload(`upload-${index + 1}.png`));
    const confirmButton = page.getByRole('button', { name: 'Xác nhận' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
    await expect(confirmButton).toBeHidden();
  }

  const selects = page.locator('form select');
  await page.getByPlaceholder('VÍ DỤ: NGUYỄN').fill('Nguyen');
  await page.getByPlaceholder('VÍ DỤ: A').fill('A');
  await selects.nth(0).selectOption('01');
  await selects.nth(1).selectOption('01');
  await selects.nth(2).selectOption('2000');
  await page.getByLabel('Nam').check();
  await page.getByPlaceholder('Nhập số CCCD').fill('012345678901');
  await selects.nth(3).selectOption('14');
  await selects.nth(4).selectOption('04');
  await selects.nth(5).selectOption('2021');
  await page.getByPlaceholder('09xxxxxxxx').fill('0912345678');
  await page.getByPlaceholder('email@example.com').fill('hocvien@example.com');
  await page.getByTestId('birth-place-select').selectOption('Hà Nội');
  await page.getByPlaceholder('Ví dụ: Sinh viên trường Đại học Công nghiệp').fill('PTIT');
  await page.getByPlaceholder('Ghi cụ thể: số nhà, tổ, khu phố, tên đường, ấp/xã/phường, tỉnh/TP...').fill('Ha Noi');
  await page.getByLabel('Tôi cam đoan và hoàn toàn chịu trách nhiệm về sự chính xác của ảnh và thông tin đã cung cấp trong Phiếu đăng ký dự thi.').check();
  await page.getByLabel('Tôi đồng ý việc VAN TRANG EDU sử dụng các thông tin cá nhân này vào mục đích phục vụ các công tác liên quan đến kỳ thi.').check();
  await page.getByRole('button', { name: 'Hoàn tất đăng ký' }).click();

  await expect.poll(() => registrationPayload?.noi_sinh).toBe('Hà Nội');
  await expect.poll(() => registrationPayload?.cccd_front_image_id).toBe('img-1');
  await expect.poll(() => registrationPayload?.cccd_back_image_id).toBe('img-2');
  await expect.poll(() => registrationPayload?.photo_3x4_image_id).toBe('img-3');
  await expect(page.getByText('Đăng ký thành công! Thông tin của bạn đã được ghi nhận.')).toBeVisible();
});

