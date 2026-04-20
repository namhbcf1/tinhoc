import { expect, test } from '@playwright/test';
import { fulfillJson, installApiMock } from './helpers/api';
import { seedAdminSession, seedStudentSession } from './helpers/session';

const TOUR_SCENARIO_IDS = [
  'admin-desktop-dashboard',
  'admin-mobile-dashboard',
  'student-desktop-dashboard',
  'student-mobile-dashboard',
  'public-desktop-main',
  'public-mobile-main',
];

async function disableOnboardingTour(page: Parameters<typeof test>[0]['page']) {
  const keys = TOUR_SCENARIO_IDS.map((id) => `vt:onboarding:${id}:v4`);
  await page.addInitScript((nextKeys) => {
    for (const key of nextKeys) {
      window.localStorage.setItem(key, 'completed');
    }
  }, keys);
}

test.describe('attendance role flows', () => {
  test('student dashboard shows synced online attendance alongside offline attendance', async ({ page }) => {
    await disableOnboardingTour(page);

    const student = {
      id: 123,
      cccd: '123456789012',
      ho_ten_full: 'Nguyen Van Student',
      registrations: [
        {
          registration_id: 900,
          class_id: 77,
          class_type: 'class',
        },
      ],
    };

    await seedStudentSession(page, {
      cccd: student.cccd,
      studentData: student,
    });

    await installApiMock(page, [
      {
        method: 'GET',
        pathname: `/api/students/${student.cccd}`,
        handle: ({ route }) => fulfillJson(route, { success: true, data: student }),
      },
      {
        method: 'GET',
        pathname: '/api/classes',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [{ id: 77, ten_lop: 'Lá»›p offline A' }],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/attendance/registration/900',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [
              {
                date: '2026-03-28',
                status: 'present',
                notes: 'CÃ³ máº·t Ä‘áº§y Ä‘á»§',
              },
            ],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/attendance/student/123/online',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [
              {
                online_class_id: 501,
                class_name: 'Lá»›p Zoom IELTS',
                teacher_name: 'CÃ´ Lan',
                present_count: 1,
                total_sessions: 1,
                records: [
                  {
                    date: '2026-03-30',
                    status: 'present',
                    checked_in_at: '2026-03-30T12:30:00.000Z',
                    join_source: 'zoom_click',
                  },
                ],
              },
            ],
          }),
      },
    ]);

    await page.goto('/dashboard/attendance');

    await expect(page.getByText('Lá»›p offline A')).toBeVisible();
    await expect(page.getByText('Lá»›p Zoom IELTS')).toBeVisible();
    await expect(page.getByText(/online/i)).toBeVisible();
    await expect(page.getByText('CÃ´ Lan')).toBeVisible();

    await page.locator('button').filter({ hasText: 'Lá»›p Zoom IELTS' }).click();
    await expect(page.getByText('30/3/2026').first()).toBeVisible();
  });

  test('admin attendance page submits normalized batch payload and reloads history', async ({ page }) => {
    await disableOnboardingTour(page);

    await seedAdminSession(page, {
      admin: {
        id: 1,
        username: 'admin',
        full_name: 'Admin Attendance',
        role: 'super_admin',
        teacher_code: 'GV001',
      },
    });

    let saved = false;
    let batchPayload: any = null;

    await installApiMock(page, [
      {
        method: 'GET',
        pathname: '/api/teachers/my-classes',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [{ class_id: 11, ten_lop: 'Lá»›p 11A' }],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/exam-schedules',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
            items: [],
            total: 0,
          }),
      },
      {
        method: 'GET',
        pathname: '/api/exam-categories',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/exam-types',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/program-organizers',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/programs',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/program-levels',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/templates',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/registrations/class/11',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: [
              { registration_id: 1, ho_ten_full: 'Nguyen A', cccd: '001' },
              { registration_id: 2, ho_ten_full: 'Tran B', cccd: '002' },
            ],
          }),
      },
      {
        method: 'GET',
        pathname: '/api/attendance/class/11',
        handle: ({ route }) =>
          fulfillJson(route, {
            success: true,
            data: saved
              ? [
                  {
                    id: 1,
                    student_id: 1,
                    student_name: 'Nguyen A',
                    date: '2026-03-30',
                    status: 'present',
                    note: null,
                  },
                  {
                    id: 2,
                    student_id: 2,
                    student_name: 'Tran B',
                    date: '2026-03-30',
                    status: 'absent',
                    note: null,
                  },
                ]
              : [],
          }),
      },
      {
        method: 'POST',
        pathname: '/api/attendance/batch',
        handle: ({ route, json }) => {
          batchPayload = json;
          saved = true;
          return fulfillJson(route, { success: true, data: { saved: 2 } });
        },
      },
    ]);

    await page.goto('/admin/dashboard?tab=attendance#attendance');

    await page.locator('select').selectOption('11');
    await expect(page.getByText('Nguyen A')).toBeVisible();
    await page.locator('tbody input[type="checkbox"]').first().check();
    await page.locator('button').filter({ hasText: /danh/i }).last().click();

    await expect.poll(() => Boolean(batchPayload)).toBe(true);
    expect(batchPayload.records).toHaveLength(2);
    expect(batchPayload.records[0]).toMatchObject({
      registration_id: 1,
      class_id: 11,
      status: 'present',
    });
    expect(batchPayload.records[1]).toMatchObject({
      registration_id: 2,
      class_id: 11,
      status: 'absent',
    });
    expect(batchPayload.records[0].attendance_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(batchPayload.records[1].attendance_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await expect(page.getByText('30/03/2026').first()).toBeVisible();
    await expect(page.getByText('30/03/2026').nth(1)).toBeVisible();
  });
});
