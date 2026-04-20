import { expect, test } from '@playwright/test';
import { fulfillJson, installApiMock, ok } from './helpers/api';
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

test.describe('exam schedules google maps flow', () => {
  test('admin can edit exam schedule and save google maps url', async ({ page }) => {
    await disableOnboardingTour(page);
    await seedAdminSession(page, {
      admin: {
        id: 1,
        username: 'admin',
        full_name: 'Admin Maps',
        role: 'super_admin',
      },
    });

    const baseExam = {
      id: 101,
      exam_name: 'TOEFL ITP A2 HCM G8',
      exam_date: '2026-04-14T07:30:00.000Z',
      duration_minutes: null,
      location: 'IIG Vietnam',
      notes: 'Ghi chú lịch thi',
      exam_type: 'TOEFL ITP',
      exam_level: 'A2',
      organizer_uuid: 'org-1',
      program_uuid: 'prog-1',
      level_uuid: 'level-1',
      template_id: 1,
      class_seed_name: null,
      class_seed_description: null,
      class_seed_schedule_rule: null,
      class_seed_schedule_time: null,
      class_seed_timezone: null,
      class_seed_timezone_label: null,
      delivery_mode: 'internal',
      google_map_url: null,
      zoom_enabled: 0,
      zoom_link: null,
      zoom_link_backup: null,
      zoom_link_backup_2: null,
      zoom_link_backup_3: null,
      zoom_meeting_id: null,
      zoom_passcode: null,
      zoom_passcode_backup: null,
      zoom_notes: null,
      approved_students_count: 0,
      pending_students_count: 0,
    };

    let savedPayload: any = null;

    await installApiMock(page, [
      {
        method: 'GET',
        pathname: '/exam-schedules',
        handle: ({ route }) => fulfillJson(route, ok([baseExam])),
      },
      {
        method: 'GET',
        pathname: '/exam-categories',
        handle: ({ route }) => fulfillJson(route, ok([])),
      },
      {
        method: 'GET',
        pathname: '/program-organizers',
        handle: ({ route }) =>
          fulfillJson(route, ok([{ uuid: 'org-1', name: 'IIG VIETNAM' }])),
      },
      {
        method: 'GET',
        pathname: '/programs',
        handle: ({ route }) =>
          fulfillJson(
            route,
            ok([
              {
                uuid: 'prog-1',
                organizer_uuid: 'org-1',
                name: 'TOEFL ITP',
                mode: 'internal',
              },
            ]),
          ),
      },
      {
        method: 'GET',
        pathname: '/program-levels',
        handle: ({ route }) =>
          fulfillJson(
            route,
            ok([
              {
                uuid: 'level-1',
                program_uuid: 'prog-1',
                name: 'A2',
              },
            ]),
          ),
      },
      {
        method: 'GET',
        pathname: '/templates',
        handle: ({ route }) =>
          fulfillJson(route, ok([{ id: 1, name: 'VEPT', display_name: 'VEPT' }])),
      },
      {
        method: 'PUT',
        pathname: /\/exam-schedules\/\d+$/,
        handle: ({ route, json }) => {
          savedPayload = json;
          return fulfillJson(route, ok({ ...baseExam, ...(json as Record<string, unknown>) }));
        },
      },
      {
        method: 'GET',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok([])),
      },
      {
        method: 'POST',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok({})),
      },
      {
        method: 'PUT',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok({})),
      },
      {
        method: 'DELETE',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok({})),
      },
    ]);

    await page.goto('/admin/dashboard?tab=exam-schedules#exam-schedules');

    await expect(page.getByRole('button', { name: /tạo lịch thi/i })).toBeVisible();
    await page.locator('button[title="Chỉnh sửa lịch thi"]').first().click();

    const mapInput = page.getByLabel('Link Google Maps (tuỳ chọn)');
    await expect(mapInput).toBeVisible();

    const mapUrl = 'https://maps.app.goo.gl/iig-ho-chi-minh';
    await mapInput.fill(mapUrl);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    await expect.poll(() => savedPayload?.google_map_url).toBe(mapUrl);
  });

  test('student sees and can open google maps link from exams', async ({ page }) => {
    await disableOnboardingTour(page);
    await seedStudentSession(page, {
      cccd: '123456789012',
      studentData: {
        id: 8,
        cccd: '123456789012',
        ho_ten_full: 'Hoc vien test',
      },
    });

    const mapUrl = 'https://www.google.com/maps/place/The+Sun+Avenue';

    await installApiMock(page, [
      {
        method: 'GET',
        pathname: '/students/123456789012',
        handle: ({ route }) =>
          fulfillJson(
            route,
            ok({
              id: 8,
              cccd: '123456789012',
              ho_ten_full: 'Hoc vien test',
            }),
          ),
      },
      {
        method: 'GET',
        pathname: '/exam-schedules/my-exams',
        handle: ({ route }) =>
          fulfillJson(
            route,
            ok([
              {
                id: 101,
                exam_name: 'TOEFL ITP A2 HCM G8',
                exam_date: '2026-04-14T07:30:00.000Z',
                duration_minutes: 120,
                location: 'IIG Vietnam',
                exam_type: 'TOEFL ITP',
                registration_status: 'available',
                google_map_url: mapUrl,
              },
            ]),
          ),
      },
      {
        method: 'GET',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok([])),
      },
      {
        method: 'POST',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok({})),
      },
      {
        method: 'PUT',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok({})),
      },
      {
        method: 'DELETE',
        pathname: /.*/,
        handle: ({ route }) => fulfillJson(route, ok({})),
      },
    ]);

    await page.goto('/dashboard/exams');

    await expect(page.getByText('TOEFL ITP A2 HCM G8')).toBeVisible();

    const mapLink = page.getByRole('link', { name: 'Mở Google Maps' }).first();
    await expect(mapLink).toBeVisible();
    await expect(mapLink).toHaveAttribute('href', mapUrl);

    await page.getByRole('button', { name: 'Xem chi tiết' }).first().click();
    await expect(page.getByRole('link', { name: 'Mở trên Google Maps' })).toHaveAttribute('href', mapUrl);
  });
});
