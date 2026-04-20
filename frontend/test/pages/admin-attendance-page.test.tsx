import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminAttendancePage from '../../src/pages/admin/desktop/AdminAttendancePage';
import api from '../../src/services/api';

vi.mock('gsap', () => ({
  default: {
    fromTo: vi.fn(),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: (callback: () => void) => callback(),
}));

vi.mock('../../src/pages/admin/shared/useAdminAutoRefresh', () => ({
  useAdminAutoRefresh: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  default: {
    cachedRequest: vi.fn(),
    getAttendanceByClass: vi.fn(),
    getRegistrationsByClass: vi.fn(),
    markAttendanceBatch: vi.fn(),
  },
}));

describe('Admin attendance page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits normalized attendance batch payload for today', async () => {
    vi.mocked(api.cachedRequest).mockResolvedValue({
      success: true,
      data: [{ class_id: 11, ten_lop: 'Lớp 11A' }],
    } as any);
    vi.mocked(api.getAttendanceByClass).mockResolvedValue({
      success: true,
      data: [],
    } as any);
    vi.mocked(api.getRegistrationsByClass).mockResolvedValue({
      success: true,
      data: [
        { registration_id: 1, ho_ten_full: 'Nguyen A', cccd: '001' },
        { registration_id: 2, ho_ten_full: 'Tran B', cccd: '002' },
      ],
    } as any);
    vi.mocked(api.markAttendanceBatch).mockResolvedValue({
      success: true,
    } as any);

    render(<AdminAttendancePage toast={{}} />);

    const classSelect = await screen.findByRole('combobox');
    await userEvent.selectOptions(classSelect, '11');
    await screen.findByText('Nguyen A');

    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await userEvent.click(screen.getByRole('button', { name: /lưu điểm danh/i }));

    await waitFor(() => {
      expect(api.markAttendanceBatch).toHaveBeenCalledTimes(1);
    });

    const [records, tokenType] = vi.mocked(api.markAttendanceBatch).mock.calls[0];
    expect(tokenType).toBe('admin');
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      registration_id: 1,
      class_id: 11,
      status: 'present',
    });
    expect(records[1]).toMatchObject({
      registration_id: 2,
      class_id: 11,
      status: 'absent',
    });
    expect(records[0].attendance_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(records[1].attendance_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
