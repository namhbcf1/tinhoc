import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { Hono } from 'hono';
import XLSX from 'xlsx-js-style';
import exportRoute from '../../routes/export.js';

function createTestApp(r2?: any) {
  const app = new Hono();

  app.use('*', async (c, next) => {
    c.env = {
      DB: env.DB,
      R2: r2 ?? {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
    } as any;
    await next();
  });

  app.route('/export', exportRoute);
  return app;
}

function createWorkbookBuffer(rows: Array<Array<string | number>>) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function setupDatabase() {
  const db = env.DB;

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS program_organizers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_name TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      location TEXT,
      exam_level TEXT,
      template_id INTEGER,
      organizer_uuid TEXT,
      program_uuid TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      approved_at DATETIME,
      approved_by INTEGER
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ho TEXT,
      ten_dem TEXT,
      ten TEXT,
      ho_ten_full TEXT,
      ngay_sinh TEXT,
      noi_sinh TEXT,
      gioi_tinh TEXT,
      dan_toc TEXT,
      quoc_tich TEXT,
      email TEXT,
      sdt TEXT,
      cccd TEXT,
      dia_chi TEXT,
      ngay_cap_cccd TEXT,
      don_vi_cong_tac TEXT,
      image_3x4 TEXT,
      photo_3x4_image_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS excel_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      file_key TEXT NOT NULL,
      header_rows INTEGER DEFAULT 8,
      data_start_row INTEGER DEFAULT 10,
      date_cell TEXT,
      column_mapping TEXT,
      is_active INTEGER DEFAULT 1
    )
  `).run();
}

async function cleanDatabase() {
  await env.DB.prepare('DELETE FROM exam_registrations').run();
  await env.DB.prepare('DELETE FROM students').run();
  await env.DB.prepare('DELETE FROM exam_schedules').run();
  await env.DB.prepare('DELETE FROM excel_templates').run();
  await env.DB.prepare('DELETE FROM program_organizers').run();
}

async function seedTemplate(id: number, name: string, fileKey: string, dataStartRow = 10) {
  await env.DB.prepare(`
    INSERT INTO excel_templates (id, name, display_name, file_key, data_start_row)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, name, name.toUpperCase(), fileKey, dataStartRow).run();
}

async function seedOrganizer(uuid: string, name: string, code: string) {
  await env.DB.prepare(`
    INSERT INTO program_organizers (uuid, name, code)
    VALUES (?, ?, ?)
  `).bind(uuid, name, code).run();
}

async function seedExam(
  id: number,
  templateId: number | null,
  examName: string,
  examLevel = 'B1',
  organizerUuid: string | null = null,
) {
  await env.DB.prepare(`
    INSERT INTO exam_schedules (id, exam_name, exam_date, location, exam_level, template_id, organizer_uuid)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, examName, '2026-04-15 08:30:00', 'Phòng A1', examLevel, templateId, organizerUuid).run();
}

async function seedStudentRegistration(examId: number, overrides: Partial<Record<string, any>> = {}) {
  const studentResult = await env.DB.prepare(`
    INSERT INTO students (
      ho, ten_dem, ten, ho_ten_full, ngay_sinh, noi_sinh, gioi_tinh,
      dan_toc, quoc_tich, email, sdt, cccd, dia_chi, ngay_cap_cccd, don_vi_cong_tac
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    overrides.ho ?? 'Nguyễn',
    overrides.ten_dem ?? 'Văn',
    overrides.ten ?? 'An',
    overrides.ho_ten_full ?? 'Nguyễn Văn An',
    overrides.ngay_sinh ?? '2002-09-05',
    overrides.noi_sinh ?? 'Hà Nội',
    overrides.gioi_tinh ?? 'Nam',
    overrides.dan_toc ?? 'Kinh',
    overrides.quoc_tich ?? 'Việt Nam',
    overrides.email ?? 'an@example.com',
    overrides.sdt ?? '0909123456',
    overrides.cccd ?? '012345678901',
    overrides.dia_chi ?? 'Hà Nội',
    overrides.ngay_cap_cccd ?? '2020-06-01',
    overrides.don_vi_cong_tac ?? 'ĐH ABC'
  ).run();

  const studentId = Number(studentResult.meta.last_row_id);

  await env.DB.prepare(`
    INSERT INTO exam_registrations (exam_id, student_id, status)
    VALUES (?, ?, ?)
  `).bind(examId, studentId, overrides.status ?? 'approved').run();
}

describe('export routes', () => {
  beforeEach(async () => {
    await setupDatabase();
    await cleanDatabase();
  });

  it('exports exam-list from live approved list and ignores saved template file', async () => {
    await seedOrganizer('org-ptit', 'Học viện Công nghệ Bưu Chính Viễn thông', 'PTIT');
    await seedTemplate(1, 'ptit', 'templates/MAUPTIT.xlsx', 9);
    await seedExam(101, 1, 'Danh sách dự thi PTIT', 'B1', 'org-ptit');
    await seedStudentRegistration(101, {
      ho: 'Trần',
      ten_dem: 'Khánh',
      ten: 'Chi',
      ho_ten_full: 'Trần Khánh Chi',
      ngay_sinh: '2002-09-05',
      noi_sinh: 'Điện Biên',
      gioi_tinh: 'Nữ',
      cccd: '011302003580',
    });

    const r2 = {
      get: vi.fn().mockResolvedValue({
        arrayBuffer: async () =>
          createWorkbookBuffer([
            ['CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO'],
            ['THEO THÔNG TƯ 03/2014/TT-BTTTT'],
            ['TEMPLATE TITLE'],
            ['', '', '', '', '', 'Ngày thi: template'],
            ['', '', '', '', '', 'Hội đồng thi: template'],
            [],
            ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'],
            ['', '', '', '', '', '', '', '', '', 'LT', 'TH'],
          ]),
      }),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const app = createTestApp(r2);

    const response = await app.request('/export/exam/101/exam-list');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    expect(String(worksheet.A3?.v || '')).toContain('DANH SÁCH DỰ THI');
    expect(String(worksheet.F4?.v || '')).toContain('ngày 15 tháng 04 năm 2026');
    expect(worksheet.A9?.v).toBe(1);
    expect(worksheet.C9?.v).toBe('011302003580');
    expect(worksheet.D9?.v).toBe('Trần Khánh');
    expect(worksheet.E9?.v).toBe('Chi');
    expect(worksheet.F9?.v).toBe('05/09/2002');
    expect(worksheet.G9?.v).toBe('Điện Biên');
    expect(worksheet.H9?.v).toBe('Nữ');
    expect(r2.get).not.toHaveBeenCalled();
  });

  it('does not include stale template sample rows in export output', async () => {
    await seedOrganizer('org-ptit-clear', 'Học viện Công nghệ Bưu Chính Viễn thông', 'PTIT');
    await seedTemplate(11, 'ptit', 'templates/PTIT-CLEAR.xlsx', 9);
    await seedExam(111, 11, 'PTIT clear stale rows', 'B1', 'org-ptit-clear');
    await seedStudentRegistration(111, {
      ho: 'Phạm',
      ten_dem: 'Gia',
      ten: 'Minh',
      ho_ten_full: 'Phạm Gia Minh',
      ngay_sinh: '2003-10-12',
      noi_sinh: 'Hà Nội',
      gioi_tinh: 'Nam',
      cccd: '039300011122',
    });

    const r2 = {
      get: vi.fn().mockResolvedValue({
        arrayBuffer: async () =>
          createWorkbookBuffer([
            ['CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN CƠ BẢN & NÂNG CAO'],
            ['THEO THÔNG TƯ 03/2014/TT-BTTTT'],
            ['TEMPLATE TITLE'],
            ['', '', '', '', '', 'Ngày thi: template'],
            ['', '', '', '', '', 'Hội đồng thi: template'],
            [],
            ['STT', 'SỐ PHÁCH', 'SỐ CMT', 'HỌ', 'TÊN', 'NGÀY SINH', 'NƠI SINH', 'GIỚI TÍNH', 'DÂN TỘC', 'MÔN THI', '', 'KÝ TÊN', 'GHI CHÚ'],
            ['', '', '', '', '', '', '', '', '', 'LT', 'TH'],
            [1, '', 'OLD-CCCD-1', 'OLD', 'USER', '01/01/2000', 'OLD', 'Nam', 'Kinh', '', '', '', ''],
            [2, '', 'OLD-CCCD-2', 'OLD', 'USER2', '02/02/2001', 'OLD', 'Nữ', 'Kinh', '', '', '', ''],
          ]),
      }),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const app = createTestApp(r2);

    const response = await app.request('/export/exam/111/exam-list');
    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<string | number>>;
    const flat = rows.flat().map((value) => String(value || ''));

    expect(worksheet.C9?.v).toBe('039300011122');
    expect(worksheet.D9?.v).toBe('Phạm Gia');
    expect(worksheet.E9?.v).toBe('Minh');
    expect(worksheet.C10?.v ?? '').toBe('');
    expect(worksheet.D10?.v ?? '').toBe('');
    expect(worksheet.E10?.v ?? '').toBe('');
    expect(flat.includes('OLD-CCCD-1')).toBe(false);
    expect(flat.includes('OLD-CCCD-2')).toBe(false);
    expect(r2.get).not.toHaveBeenCalled();
  });

  it('exports approved/registered students in default format', async () => {
    await seedOrganizer('org-edu', 'Edu Global', 'EDUGLOBAL');
    await seedTemplate(2, 'vept', 'templates/MAUVEPT.xlsx', 5);
    await seedExam(202, 2, 'Danh sách dự thi VEPT', 'B2', 'org-edu');
    await seedStudentRegistration(202, {
      ho: 'Lê',
      ten_dem: 'Mai',
      ten: 'Phương',
      ho_ten_full: 'Lê Mai Phương',
      ngay_sinh: '2005-07-30',
      gioi_tinh: 'Nữ',
      cccd: '019305009484',
      sdt: '0988000111',
      email: 'phuong@example.com',
      don_vi_cong_tac: 'PTIT',
    });

    const r2 = {
      get: vi.fn().mockResolvedValue({
        arrayBuffer: async () =>
          createWorkbookBuffer([
            ['DANH SÁCH ĐĂNG KÝ THI VERSANT ENGLISH PLACEMENT TEST (VEPT)'],
            ['Tên Đơn vị/ Trường học đăng ký: '],
            ['Đại diện đăng ký: ', '', '', '', 'Số điện thoại:'],
            ['STT', 'Họ và tên đệm', 'Tên', 'Giới tính', 'Ngày sinh', 'Tháng sinh', 'Năm sinh', 'Số CMND/ Hộ chiếu', 'Điện thoại', 'Email', 'Đơn vị công tác/ Trường học', 'Vị trí công tác', 'Nhu cầu đăng ký trình độ (A1, A2, B1, B2, C1, C2)', 'Nhu cầu đăng ký thi ngày', '', '', '', '', '', 'Địa điểm thi'],
          ]),
      }),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const app = createTestApp(r2);

    const response = await app.request('/export/exam/202/exam-list');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    expect(String(worksheet.A1?.v || '')).toContain('CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN');
    expect(worksheet.A9?.v).toBe(1);
    expect(worksheet.C9?.v).toBe('019305009484');
    expect(worksheet.D9?.v).toBe('Lê Mai');
    expect(worksheet.E9?.v).toBe('Phương');
    expect(worksheet.F9?.v).toBe('30/07/2005');
    expect(worksheet.G9?.v).toBe('Hà Nội');
    expect(worksheet.H9?.v).toBe('Nữ');
    expect(r2.get).not.toHaveBeenCalled();
  });

  it('excludes test student accounts from exam-list export', async () => {
    await seedExam(250, null, 'Danh sách lọc test', 'B1');
    await seedStudentRegistration(250, {
      ho: 'Lê',
      ten_dem: 'Thị',
      ten: 'Thật',
      ho_ten_full: 'Lê Thị Thật',
      cccd: '031200011122',
      email: 'that@example.com',
    });
    await seedStudentRegistration(250, {
      ho: 'Test',
      ten_dem: 'Hoc',
      ten: 'Vien',
      ho_ten_full: 'Test Hoc Vien 01',
      cccd: 'test-cccd-01',
      email: 'hv01@student.local',
    });
    await seedStudentRegistration(250, {
      ho: 'Mã',
      ten_dem: 'Test',
      ten: '0019',
      ho_ten_full: 'Mã Test 0019',
      cccd: '0019',
      email: 'ma0019@example.com',
    });

    const app = createTestApp({
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request('/export/exam/250/exam-list');
    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<string | number>>;
    const flat = rows.flat().map((value) => String(value || '').toLowerCase());

    expect(worksheet.A9?.v).toBe(1);
    expect(worksheet.C9?.v).toBe('031200011122');
    expect(worksheet.C10?.v ?? '').toBe('');
    expect(flat.some((value) => value.includes('test hoc vien'))).toBe(false);
    expect(flat.some((value) => value.includes('@student.local'))).toBe(false);
    expect(flat.some((value) => value.includes('test-cccd'))).toBe(false);
    expect(flat.includes('0019')).toBe(false);
  });

  it('uses exam name as exported xlsx filename', async () => {
    const examName = 'Kỳ thi: TIN HỌC PTIT 29/03/2026';
    await seedExam(260, null, examName, 'B1');
    await seedStudentRegistration(260, {
      cccd: '031200011123',
      email: 'valid260@example.com',
    });

    const app = createTestApp({
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request('/export/exam/260/exam-list');
    expect(response.status).toBe(200);

    const disposition = response.headers.get('content-disposition') || '';
    expect(disposition).toContain(`filename*=UTF-8''${encodeURIComponent(`${examName}.xlsx`)}`);
  });

  it('still exports default when template is configured', async () => {
    await seedOrganizer('org-ptit', 'Học viện Công nghệ Bưu Chính Viễn thông', 'PTIT');
    await seedTemplate(3, 'ptit', 'templates/MAUPTIT.xlsx', 9);
    await seedExam(303, 3, 'Fallback template test', 'B1', 'org-ptit');
    await seedStudentRegistration(303);

    const r2 = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const app = createTestApp(r2);

    const response = await app.request('/export/exam/303/exam-list');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    expect(String(worksheet.A1?.v || '')).toContain('CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN');
    expect(String(worksheet.A3?.v || '')).toContain('DANH SÁCH DỰ THI');
    expect(worksheet.A7?.v).toBe('STT');
    expect(r2.get).not.toHaveBeenCalled();
  });
});
