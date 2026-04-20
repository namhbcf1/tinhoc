import { expect, test } from '@playwright/test';
import { fulfillJson, installApiMock } from './helpers/api';
import { seedStudentSession } from './helpers/session';

async function disableOnboardingTour(page: import('@playwright/test').Page) {
  const keys = [
    'vt:onboarding:student-desktop-dashboard:v4',
    'vt:onboarding:public-desktop-main:v4',
  ];
  await page.addInitScript((nextKeys) => {
    for (const key of nextKeys) {
      window.localStorage.setItem(key, 'completed');
    }
  }, keys);
}

test.describe('feedback smoke', () => {
  test('public feedback page renders approved feedback and teacher response', async ({ page }) => {
    await disableOnboardingTour(page);

    await installApiMock(page, [
      {
        method: 'GET',
        pathname: '/api/public/student-feedbacks',
        handle: async ({ route }) => {
          await fulfillJson(route, {
            success: true,
            data: {
              items: [
                {
                  id: 101,
                  class_name: 'IELTS Intensive 7.0',
                  title: 'Lộ trình rõ ràng',
                  content: 'Giáo viên sửa bài kỹ và phản hồi đúng trọng tâm.',
                  rating: 5,
                  sentiment: 'positive',
                  student_name: 'N. V. A.',
                  public_at: '2026-04-03T08:00:00.000Z',
                  teacher_response: 'Trung tâm ghi nhận và sẽ tiếp tục giữ chuẩn phản hồi bài tập.',
                },
              ],
            },
          });
        },
      },
    ]);

    await page.goto('/feedback');

    await expect(page.getByText(/feedback thật từ học viên đã xác minh/i)).toBeVisible();
    await expect(page.getByText('IELTS Intensive 7.0')).toBeVisible();
    await expect(page.getByText('Lộ trình rõ ràng')).toBeVisible();
    await expect(page.getByText(/Trung tâm ghi nhận và sẽ tiếp tục giữ chuẩn phản hồi bài tập/i)).toBeVisible();
  });

  test('student feedback dashboard renders form and history', async ({ page }) => {
    await disableOnboardingTour(page);

    await seedStudentSession(page, {
      cccd: '123456789012',
      sdt: '0912345678',
      studentData: {
        cccd: '123456789012',
        ho_ten_full: 'Nguyen Van Feedback',
      },
    });

    await installApiMock(page, [
      {
        method: 'GET',
        pathname: /\/api\/students\/123456789012$/,
        handle: async ({ route }) => {
          await fulfillJson(route, {
            success: true,
            data: {
              cccd: '123456789012',
              ho_ten_full: 'Nguyen Van Feedback',
            },
          });
        },
      },
      {
        method: 'GET',
        pathname: '/api/student-feedbacks/my',
        handle: async ({ route }) => {
          await fulfillJson(route, {
            success: true,
            data: {
              available_classes: [
                {
                  online_class_id: 77,
                  class_name: 'TOEIC Sprint B2',
                  schedule_time: 'T2-T4-T6',
                  start_date: '2026-03-01',
                  end_date: '2026-05-30',
                },
              ],
              feedbacks: [
                {
                  id: 501,
                  online_class_id: 77,
                  class_name: 'TOEIC Sprint B2',
                  rating: 4,
                  title: 'Tốc độ học khá nhanh',
                  content: 'Bài tập nhiều nhưng hữu ích, cần thêm ví dụ speaking thực chiến.',
                  sentiment: 'mixed',
                  status: 'rejected',
                  teacher_response: null,
                  review_note_internal: 'Em bổ sung rõ hơn phần bài speaking cần hỗ trợ.',
                  created_at: '2026-04-01T08:00:00.000Z',
                  updated_at: '2026-04-02T08:00:00.000Z',
                  reviewed_at: '2026-04-02T08:30:00.000Z',
                },
              ],
            },
          });
        },
      },
    ]);

    await page.goto('/dashboard/feedback');

    await expect(page.getByRole('heading', { name: /phản hồi học viên/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TOEIC Sprint B2' })).toBeVisible();
    await expect(page.getByText('Tốc độ học khá nhanh')).toBeVisible();
    await expect(page.getByText(/Lý do cần chỉnh sửa/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /gửi phản hồi/i })).toBeVisible();
  });
});
