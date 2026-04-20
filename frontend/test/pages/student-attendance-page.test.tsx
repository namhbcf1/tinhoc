import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AttendancePage from '../../src/pages/student/desktop/AttendancePage';
import api from '../../src/services/api';

vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: (callback: () => void) => callback(),
}));

vi.mock('../../src/services/api', () => ({
  default: {
    getClass: vi.fn(),
    getAttendanceByRegistration: vi.fn(),
    getOnlineAttendanceByStudent: vi.fn(),
  },
}));

describe('Student attendance page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders offline and online attendance in the same dashboard view', async () => {
    vi.mocked(api.getClass).mockResolvedValue({
      success: true,
      data: {
        ten_lop: 'Lớp offline A',
      },
    } as any);
    vi.mocked(api.getAttendanceByRegistration).mockResolvedValue({
      success: true,
      data: [
        {
          date: '2026-03-28',
          status: 'present',
          notes: 'Có mặt đầy đủ',
        },
      ],
    } as any);
    vi.mocked(api.getOnlineAttendanceByStudent).mockResolvedValue({
      success: true,
      data: [
        {
          online_class_id: 501,
          class_name: 'Lớp Zoom IELTS',
          teacher_name: 'Cô Lan',
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
    } as any);

    render(
      <AttendancePage
        studentData={{
          id: 123,
          registrations: [
            {
              registration_id: 900,
              class_id: 77,
              class_type: 'class',
            },
          ],
        }}
      />,
    );

    await screen.findByText('Lớp offline A');
    await screen.findByText('Lớp Zoom IELTS');
    expect(screen.getByText('Lớp online')).toBeInTheDocument();
    expect(screen.getByText('Cô Lan')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /lớp zoom ielts/i }));

    await waitFor(() => {
      expect(screen.getByText(/điểm danh:/i)).toBeInTheDocument();
    });
  });
});
