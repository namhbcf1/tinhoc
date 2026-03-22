import { expect, test } from '@playwright/test';
import { fulfillJson, installApiMock, ok } from './helpers/api';
import { seedStudentSession } from './helpers/session';

test('student profile saves birthplace from the shared selector', async ({ page }) => {
  const student = {
    id: 10,
    ho: 'Nguyen',
    ten_dem: 'Thi',
    ten: 'Lan',
    ho_ten_full: 'Nguyen Thi Lan',
    cccd: '012345678901',
    sdt: '0912345678',
    email: 'lan@example.com',
    gioi_tinh: 'Nữ',
    ngay_sinh: '2003-07-31',
    noi_sinh: 'Hải Phòng',
    dan_toc: 'Kinh',
    quoc_tich: 'Việt Nam',
    dia_chi: 'Ha Noi',
    registrations: [],
  };
  let updatePayload: Record<string, unknown> | null = null;

  await seedStudentSession(page, {
    cccd: student.cccd,
    sdt: student.sdt,
    studentData: student,
  });

  await installApiMock(page, [
    {
      method: 'GET',
      pathname: `/api/students/${student.cccd}`,
      handle: async ({ route }) => {
        await fulfillJson(route, ok(student));
      },
    },
    {
      method: 'PUT',
      pathname: '/api/students/update-by-cccd',
      handle: async ({ route, json }) => {
        updatePayload = json as Record<string, unknown>;
        await fulfillJson(route, ok({
          ...student,
          ...updatePayload,
          ho_ten_full: 'Nguyen Thi Lan',
        }));
      },
    },
  ]);

  await page.goto('/dashboard/profile');
  await expect(page.getByRole('button', { name: 'Cập nhật hồ sơ' })).toBeVisible();
  await page.getByRole('button', { name: 'Cập nhật hồ sơ' }).click();

  await expect(page.getByText('Chỉnh sửa hồ sơ sinh viên')).toBeVisible();
  await page.getByTestId('birth-place-select').selectOption('Huế');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

  await expect.poll(() => updatePayload?.noi_sinh).toBe('Huế');
  await expect(page.getByText('Thông tin cá nhân đã được cập nhật thành công.')).toBeVisible();
});

