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
    CREATE TABLE IF NOT EXISTS exam_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT
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
      don_vi_cong_tac TEXT
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

  it('exports PTIT template with expected header and mapped cells', async () => {
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

    expect(worksheet.A3?.v).toBe('Danh sách dự thi PTIT');
    expect(String(worksheet.F4?.v || '')).toContain('ngày 15 tháng 04 năm 2026');
    expect(worksheet.A9?.v).toBe(1);
    expect(worksheet.C9?.v).toBe('011302003580');
    expect(worksheet.D9?.v).toBe('Trần Khánh');
    expect(worksheet.E9?.v).toBe('Chi');
    expect(worksheet.F9?.v).toBe('05/09/2002');
    expect(worksheet.G9?.v).toBe('Điện Biên');
    expect(worksheet.H9?.v).toBe('Nữ');
  });

  it('exports VEPT template with expected mapped cells', async () => {
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

    expect(String(worksheet.A2?.v || '')).toContain('Tên Đơn vị/ Trường học đăng ký');
    expect(String(worksheet.A2?.v || '')).toContain('Edu Global');
    expect(worksheet.A5?.v).toBe(1);
    expect(worksheet.B5?.v).toBe('Lê Mai');
    expect(worksheet.C5?.v).toBe('Phương');
    expect(worksheet.D5?.v).toBe('Nữ');
    expect(worksheet.E5?.v).toBe(30);
    expect(worksheet.F5?.v).toBe(7);
    expect(worksheet.G5?.v).toBe(2005);
    expect(worksheet.H5?.v).toBe('019305009484');
    expect(worksheet.I5?.v).toBe('0988000111');
    expect(worksheet.J5?.v).toBe('phuong@example.com');
    expect(worksheet.K5?.v).toBe('PTIT');
    expect(worksheet.M5?.v).toBe('B2');
    expect(String(worksheet.N5?.v || '')).toContain('15/04/2026');
    expect(worksheet.T5?.v).toBe('Phòng A1');
  });

  it('falls back to default export when template file is missing', async () => {
    await seedOrganizer('org-ptit', 'Học viện Công nghệ Bưu Chính Viễn thông', 'PTIT');
    await seedTemplate(3, 'ptit', 'templates/MAUPTIT.xlsx', 9);
    await seedExam(303, 3, 'Fallback template test', 'B1', 'org-ptit');
    await seedStudentRegistration(303);

    const app = createTestApp({
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request('/export/exam/303/exam-list');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    expect(String(worksheet.A1?.v || '')).toContain('CHỨNG CHỈ ỨNG DỤNG CÔNG NGHỆ THÔNG TIN');
    expect(String(worksheet.A3?.v || '')).toContain('DANH SÁCH DỰ THI');
    expect(worksheet.A7?.v).toBe('STT');
  });
});
