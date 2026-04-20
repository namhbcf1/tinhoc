import { beforeEach, describe, expect, it, vi } from 'vitest';

const repoMocks = vi.hoisted(() => ({
  findStudentByCCCD: vi.fn(),
  updateStudent: vi.fn(),
  logStudentEditHistory: vi.fn(),
  getStudentRegistrations: vi.fn(),
}));

vi.mock('../../repositories/student-repository.js', () => repoMocks);
vi.mock('../../utils/cloudflare-images.js', () => ({
  generateMultipleSignedURLs: vi.fn(),
}));
vi.mock('../../lib/auth/session-broker.js', () => ({
  issueSessionToken: vi.fn(),
}));

import { updateStudentByCCCD } from '../../services/student-service.js';
import { issueSessionToken } from '../../lib/auth/session-broker.js';

function createContext() {
  return {
    env: { DB: {} },
    req: {
      url: 'https://example.com/students/update-by-cccd',
      header: vi.fn().mockReturnValue(null),
    },
  } as any;
}

function createStudent(overrides: Record<string, any> = {}) {
  return {
    id: 101,
    cccd: '012345678901',
    ho: 'Nguyễn',
    ten_dem: 'Văn',
    ten: 'An',
    ho_ten_full: 'Nguyễn Văn An',
    ho_ten_normalized: 'nguyen van an',
    ngay_sinh: '2002-09-05',
    gioi_tinh: 'Nam',
    noi_sinh: 'Hà Nội',
    dan_toc: 'Kinh',
    quoc_tich: 'Việt Nam',
    sdt: '0909123456',
    email: 'an@example.com',
    dia_chi: 'Hà Nội',
    ngay_cap_cccd: '2020-01-01',
    don_vi_cong_tac: 'PTIT',
    ...overrides,
  };
}

describe('student self profile update policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMocks.getStudentRegistrations.mockResolvedValue([]);
  });

  it('cho phép sinh viên cập nhật toàn bộ hồ sơ và chuẩn hóa email', async () => {
    const currentStudent = createStudent();
    const updatedStudent = createStudent({
      cccd: '098765432109',
      ho: 'Trần',
      ten_dem: 'Thị',
      ten: 'Bình',
      ho_ten_full: 'Trần Thị Bình',
      ho_ten_normalized: 'tran thi binh',
      gioi_tinh: 'Nữ',
      noi_sinh: 'Hải Phòng',
      dan_toc: 'Tày',
      quoc_tich: 'Việt Nam',
      sdt: '0988000111',
      email: 'new@example.com',
      dia_chi: 'Cầu Giấy, Hà Nội',
      don_vi_cong_tac: 'Công ty ABC',
      ngay_sinh: '2001-12-31',
      ngay_cap_cccd: '2024-02-15',
    });

    repoMocks.findStudentByCCCD
      .mockResolvedValueOnce(currentStudent)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(updatedStudent);
    repoMocks.updateStudent.mockResolvedValue(true);
    repoMocks.logStudentEditHistory.mockResolvedValue(undefined);
    vi.mocked(issueSessionToken).mockResolvedValue({
      token: 'token-moi',
      sid: 'sid-moi',
      expiresAt: '2026-12-31T00:00:00.000Z',
    } as any);

    const result = await updateStudentByCCCD(createContext(), {
      current_cccd: currentStudent.cccd,
      cccd: '098765432109',
      ho: 'Trần',
      ten_dem: 'Thị',
      ten: 'Bình',
      gioi_tinh: 'Nữ',
      noi_sinh: 'Hải Phòng',
      dan_toc: 'Tày',
      quoc_tich: 'Việt Nam',
      sdt: '0988000111',
      email: '  NEW@EXAMPLE.COM  ',
      dia_chi: 'Cầu Giấy, Hà Nội',
      don_vi_cong_tac: 'Công ty ABC',
      ngay_sinh: '31/12/2001',
      ngay_cap_cccd: '15/02/2024',
    });

    expect(repoMocks.updateStudent).toHaveBeenCalledWith(
      {},
      currentStudent.id,
      {
        cccd: '098765432109',
        ho: 'TRẦN',
        ten_dem: 'THỊ',
        ten: 'BÌNH',
        gioi_tinh: 'Nữ',
        noi_sinh: 'HẢI PHÒNG',
        dan_toc: 'TÀY',
        quoc_tich: 'VIỆT NAM',
        sdt: '0988000111',
        email: 'new@example.com',
        dia_chi: 'CẦU GIẤY, HÀ NỘI',
        don_vi_cong_tac: 'CÔNG TY ABC',
        ngay_sinh: '2001-12-31',
        ngay_cap_cccd: '2024-02-15',
        ho_ten_full: 'TRẦN THỊ BÌNH',
        ho_ten_normalized: 'tran thi binh',
      },
    );
    expect(repoMocks.logStudentEditHistory).toHaveBeenCalledTimes(14);
    expect(issueSessionToken).toHaveBeenCalledTimes(1);
    expect(result.data.cccd).toBe('098765432109');
    expect(result.token).toBe('token-moi');
    expect(result.data.email).toBe('new@example.com');
    expect(result.data.dia_chi).toBe('CẦU GIẤY, HÀ NỘI');
  });

  it('từ chối khi sinh viên đổi sang CCCD đã thuộc về học viên khác', async () => {
    const currentStudent = createStudent();
    repoMocks.findStudentByCCCD
      .mockResolvedValueOnce(currentStudent)
      .mockResolvedValueOnce(createStudent({ id: 202, cccd: '099999999999' }));

    await expect(
      updateStudentByCCCD(createContext(), {
        current_cccd: currentStudent.cccd,
        cccd: '099999999999',
      }),
    ).rejects.toThrow('đã được sử dụng');

    expect(repoMocks.updateStudent).not.toHaveBeenCalled();
    expect(repoMocks.logStudentEditHistory).not.toHaveBeenCalled();
  });

  it('từ chối khi sinh viên gửi CCCD mới rỗng', async () => {
    const currentStudent = createStudent();
    repoMocks.findStudentByCCCD.mockResolvedValue(currentStudent);

    await expect(
      updateStudentByCCCD(createContext(), {
        current_cccd: currentStudent.cccd,
        cccd: '   ',
      }),
    ).rejects.toThrow('CCCD/CMND không được để trống');

    expect(repoMocks.updateStudent).not.toHaveBeenCalled();
  });
});
