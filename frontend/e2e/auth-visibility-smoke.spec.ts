import { devices, expect, test, type Page } from '@playwright/test';
import { fulfillJson } from './helpers/api';
import { seedAdminSession, seedStudentSession } from './helpers/session';

const { defaultBrowserType: _ignoredBrowserType, ...IPHONE_13_DEVICE } = devices['iPhone 13'];

const TOUR_SCENARIO_IDS = [
  'admin-desktop-dashboard',
  'admin-mobile-dashboard',
  'student-desktop-dashboard',
  'student-mobile-dashboard',
  'public-desktop-main',
  'public-mobile-main',
];

async function disableOnboardingTour(page: Page) {
  const keys = TOUR_SCENARIO_IDS.map((id) => `vt:onboarding:${id}:v4`);
  await page.addInitScript((nextKeys) => {
    for (const key of nextKeys) {
      window.localStorage.setItem(key, 'completed');
    }
  }, keys);
}

async function mockStudentProfileApi(page: Page, profile: Record<string, unknown>) {
  await page.route('**/api/students/**', async (route, request) => {
    if (request.method() !== 'GET') {
      throw new Error(`Unhandled student request: ${request.method()} ${request.url()}`);
    }
    await fulfillJson(route, { success: true, data: profile });
  });
}

async function mockLogoutApi(page: Page) {
  await page.route('**/api/auth/logout-all', async (route) => {
    await fulfillJson(route, { success: true });
  });
}

test.describe('auth visibility smoke (desktop)', () => {
  test('public header shows login/register when guest', async ({ page }) => {
    await disableOnboardingTour(page);
    await page.goto('/');

    await expect(page.locator('[data-tour="public-login"]')).toBeVisible();
    await expect(page.locator('[data-tour="public-register"]')).toBeVisible();
  });

  test('public header shows dashboard/logout when student is logged in', async ({ page }) => {
    await disableOnboardingTour(page);
    await mockLogoutApi(page);

    await page.addInitScript(() => {
      window.localStorage.setItem('student_token', 'mock-student-token');
      window.localStorage.setItem('student_cccd', '123456789012');
      window.localStorage.setItem('student_data', JSON.stringify({ cccd: '123456789012', ho_ten_full: 'Smoke Test' }));
    });

    await page.goto('/');

    await expect(page.locator('[data-tour="public-login"]')).toContainText(/dashboard/i);
    await expect(page.locator('[data-tour="public-logout"]')).toBeVisible();

    await page.locator('[data-tour="public-logout"]').click();
    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => page.evaluate(() => window.localStorage.getItem('student_token'))).toBeNull();
  });

  test('student desktop dashboard renders account + nav + logout', async ({ page }) => {
    await disableOnboardingTour(page);
    await seedStudentSession(page, {
      cccd: '123456789012',
      sdt: '0912345678',
      studentData: {
        cccd: '123456789012',
        ho_ten_full: 'Nguyen Van Test',
      },
    });
    await mockStudentProfileApi(page, {
      cccd: '123456789012',
      ho_ten_full: 'Nguyen Van Test',
    });

    await page.goto('/dashboard/profile');

    await expect(page.locator('[data-tour="student-desktop-profile"]')).toBeVisible();
    await expect(page.locator('[data-tour="student-desktop-nav-exams"]')).toBeVisible();
    await expect(page.locator('[data-tour="student-desktop-nav-study"]')).toBeVisible();
    await expect(page.locator('[data-tour="student-desktop-logout"]')).toBeVisible();
  });

  test('admin desktop dashboard renders nav + logout', async ({ page }) => {
    await disableOnboardingTour(page);
    await seedAdminSession(page, {
      admin: {
        id: 1,
        username: 'admin',
        full_name: 'Admin Smoke',
        role: 'super_admin',
      },
    });

    await page.goto('/admin/dashboard?tab=profile#profile');

    await expect(page.locator('[data-tour="admin-desktop-nav-exam-schedules"]')).toBeVisible();
    await expect(page.locator('[data-tour="admin-desktop-nav-students"]')).toBeVisible();
    await expect(page.locator('[data-tour="admin-desktop-nav-payments"]')).toBeVisible();
    await expect(page.locator('[data-tour="admin-desktop-logout"]')).toBeVisible();
  });
});

test.describe('auth visibility smoke (mobile)', () => {
  test.use(IPHONE_13_DEVICE);

  test('student mobile dashboard renders account + nav + logout', async ({ page }) => {
    await disableOnboardingTour(page);
    await seedStudentSession(page, {
      cccd: '123456789012',
      sdt: '0912345678',
      studentData: {
        cccd: '123456789012',
        ho_ten_full: 'Nguyen Van Mobile',
      },
    });
    await mockStudentProfileApi(page, {
      cccd: '123456789012',
      ho_ten_full: 'Nguyen Van Mobile',
    });

    await page.goto('/dashboard#profile');

    await expect(page.locator('[data-tour="student-mobile-nav-exams"]')).toBeVisible();
    await expect(page.locator('[data-tour="student-mobile-nav-study"]')).toBeVisible();

    await page.locator('[data-tour="student-mobile-menu"]').click();
    await expect(page.locator('[data-tour="student-mobile-drawer"]')).toBeVisible();
    await expect(page.locator('[data-tour="student-mobile-logout"]')).toBeVisible();
  });

  test('admin mobile dashboard renders nav + logout', async ({ page }) => {
    await disableOnboardingTour(page);
    await seedAdminSession(page, {
      admin: {
        id: 1,
        username: 'admin',
        full_name: 'Admin Mobile',
        role: 'super_admin',
      },
    });

    await page.goto('/admin/dashboard?tab=profile#profile');

    await expect(page.locator('[data-tour="admin-mobile-nav-exam-schedules"]')).toBeVisible();
    await expect(page.locator('[data-tour="admin-mobile-nav-students"]')).toBeVisible();
    await expect(page.locator('[data-tour="admin-mobile-nav-payments"]')).toBeVisible();

    await page.locator('[data-tour="admin-mobile-menu"]').click();
    await expect(page.locator('[data-tour="admin-mobile-drawer"]')).toBeVisible();
    await expect(page.locator('[data-tour="admin-mobile-logout"]')).toBeVisible();
  });
});
