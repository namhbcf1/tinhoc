import { expect, test } from '@playwright/test';
import { fulfillJson } from './helpers/api';
import { seedAdminSession } from './helpers/session';

test.describe('admin student birthplace flows', () => {
  test('admin can add a student with domestic birthplace selection', async ({ page }) => {
    const students: Array<Record<string, unknown>> = [];
    let createdPayload: Record<string, unknown> | null = null;

    await seedAdminSession(page, {
      admin: {
        id: 1,
        username: 'admin',
        full_name: 'Admin',
        role: 'super_admin',
      },
    });

    await page.route('**/api/**', async (route, request) => {
      const url = new URL(request.url());

      if (request.method() === 'GET' && url.pathname === '/api/students') {
        await fulfillJson(route, {
          success: true,
          data: students,
          meta: {
            total: students.length,
            stats: {
              total: students.length,
              active: students.length,
              pending: 0,
              certified: 0,
            },
          },
        });
        return;
      }

      if (request.method() === 'POST' && url.pathname === '/api/students/admin') {
        createdPayload = JSON.parse(request.postData() || '{}');
        students.push({
          id: 1,
          ...createdPayload,
          ho_ten_full: 'Pham Van B',
          registrations: [],
        });
        await fulfillJson(route, { success: true, data: students[0] });
        return;
      }

      throw new Error(`Unhandled API request: ${request.method()} ${url.pathname}${url.search}`);
    });

    await page.goto('/admin/dashboard?tab=students#students');
    await expect(page.getByText('Quản lý Học viên')).toBeVisible();
    await page.getByRole('button', { name: 'Thêm học viên' }).click();

    const modal = page.locator('.admin-modal-content');
    await modal.getByLabel('Họ').fill('Pham');
    await modal.getByLabel('Tên', { exact: true }).fill('B');
    await modal.getByLabel('Số CCCD/CMND').fill('123456789012');
    await modal.getByLabel('Mật khẩu').fill('Password123');
    await modal.getByTestId('birth-place-select').selectOption('Hà Nội');
    await modal.getByRole('button', { name: 'Thêm học viên' }).click();

    await expect.poll(() => createdPayload?.noi_sinh).toBe('Hà Nội');
    await expect(modal).toBeHidden();
  });

  test('admin can edit a student and switch birthplace to foreign text mode', async ({ page }) => {
    let student = {
      id: 1,
      ho: 'Tran',
      ten_dem: 'Thi',
      ten: 'C',
      ho_ten_full: 'Tran Thi C',
      cccd: '123456789012',
      ngay_sinh: '2000-01-01',
      gioi_tinh: 'Nữ',
      email: 'tran@example.com',
      sdt: '0912345678',
      dia_chi: 'Ha Noi',
      noi_sinh: 'Hà Nội',
      dan_toc: 'Kinh',
      quoc_tich: 'Việt Nam',
      ngay_cap_cccd: '2021-04-14',
      don_vi_cong_tac: 'PTIT',
      registrations: [],
    };
    let updatedPayload: Record<string, unknown> | null = null;

    await seedAdminSession(page, {
      admin: {
        id: 1,
        username: 'admin',
        full_name: 'Admin',
        role: 'super_admin',
      },
    });

    await page.route('**/api/**', async (route, request) => {
      const url = new URL(request.url());

      if (request.method() === 'GET' && url.pathname === '/api/students') {
        await fulfillJson(route, {
          success: true,
          data: [student],
          meta: {
            total: 1,
            stats: {
              total: 1,
              active: 1,
              pending: 0,
              certified: 0,
            },
          },
        });
        return;
      }

      if (request.method() === 'PUT' && url.pathname === '/api/students/1') {
        updatedPayload = JSON.parse(request.postData() || '{}');
        student = {
          ...student,
          ...updatedPayload,
        };
        await fulfillJson(route, { success: true, data: student });
        return;
      }

      throw new Error(`Unhandled API request: ${request.method()} ${url.pathname}${url.search}`);
    });

    await page.goto('/admin/dashboard?tab=students#students');
    await expect(page.getByText('Tran Thi C')).toBeVisible();
    await page.getByTitle('Chỉnh sửa').click();

    const modal = page.locator('.admin-modal-content');
    const birthPlaceField = modal.getByTestId('birth-place-field');
    await birthPlaceField.locator('input[value="nuoc_ngoai"]').check({ force: true });
    const birthPlaceInput = modal.getByTestId('birth-place-input');
    await expect(birthPlaceInput).toBeVisible();
    await birthPlaceInput.fill('Seoul, Han Quoc');
    await expect(birthPlaceInput).toHaveValue('Seoul, Han Quoc');
    await modal.getByRole('button', { name: 'Lưu thay đổi' }).click();

    await expect.poll(() => updatedPayload?.noi_sinh).toBe('Seoul, Han Quoc');
    await expect(modal).toBeHidden();
  });
});
