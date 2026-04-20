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
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      organizer_uuid TEXT,
      name TEXT,
      code TEXT
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
      dan_toc, quoc_tich, email, sdt, cccd, dia_chi, ngay_cap_cccd, don_vi_cong_tac,
      image_3x4, photo_3x4_image_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    overrides.don_vi_cong_tac ?? 'ĐH ABC',
    overrides.image_3x4 ?? null,
    overrides.photo_3x4_image_id ?? null
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

    expect(String(worksheet.A3?.v || '')).toContain('DANH SÁCH DỰ THI PTIT');
    expect(String(worksheet.F4?.v || '')).toContain('ngày 15 tháng 04 năm 2026');
    expect(worksheet.A9?.v).toBe(1);
    expect(worksheet.C9?.v).toBe('011302003580');
    expect(worksheet.D9?.v).toBe('TRẦN KHÁNH');
    expect(worksheet.E9?.v).toBe('CHI');
    expect(worksheet.F9?.v).toBe('05/09/2002');
    expect(worksheet.G9?.v).toBe('ĐIỆN BIÊN');
    expect(worksheet.H9?.v).toBe('NỮ');
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
    expect(worksheet.D9?.v).toBe('PHẠM GIA');
    expect(worksheet.E9?.v).toBe('MINH');
    expect(worksheet.C10?.v ?? '').toBe('');
    expect(worksheet.D10?.v ?? '').toBe('');
    expect(worksheet.E10?.v ?? '').toBe('');
    expect(flat.includes('OLD-CCCD-1')).toBe(false);
    expect(flat.includes('OLD-CCCD-2')).toBe(false);
    expect(r2.get).not.toHaveBeenCalled();
  });

  it('exports VEPT schedules with VEPT template columns including phone and email', async () => {
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

    const app = createTestApp({
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request('/export/exam/202/exam-list');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    expect(String(worksheet.A1?.v || '')).toContain('VERSANT ENGLISH PLACEMENT TEST');
    expect(worksheet.A5?.v).toBe(1);
    expect(worksheet.B5?.v).toBe('LÊ MAI');
    expect(worksheet.C5?.v).toBe('PHƯƠNG');
    expect(worksheet.D5?.v).toBe('NỮ');
    expect(worksheet.E5?.v).toBe(30);
    expect(worksheet.F5?.v).toBe(7);
    expect(worksheet.G5?.v).toBe(2005);
    expect(worksheet.H5?.v).toBe('019305009484');
    expect(worksheet.I5?.v).toBe('0988000111');
    expect(worksheet.J5?.v).toBe('phuong@example.com');
    expect(worksheet.K5?.v).toBe('PTIT');
    expect(worksheet.M5?.v).toBe('B2');
    expect(worksheet.N5?.v).toBe('15/04/2026');
    expect(worksheet.T5?.v).toBe('PHÒNG A1');
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

  it('still exports PTIT layout when template is configured', async () => {
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
    expect(String(worksheet.A3?.v || '')).toContain('FALLBACK TEMPLATE TEST');
    expect(worksheet.A7?.v).toBe('STT');
    expect(r2.get).not.toHaveBeenCalled();
  });

  it('exports VanTrang default template with full student information columns', async () => {
    await seedTemplate(4, 'vantrang_default', 'templates/VANTRANG.xlsx', 7);
    await seedExam(404, 4, 'SN06 B1 VEPT 10-11-12/04/2026', 'B1');
    await seedStudentRegistration(404, {
      ho: 'Ngô',
      ten_dem: 'Bảo',
      ten: 'Long',
      ho_ten_full: 'Ngô Bảo Long',
      gioi_tinh: 'Nam',
      cccd: '077201009999',
      sdt: '0911222333',
      email: 'long@example.com',
      noi_sinh: 'Đà Nẵng',
      dia_chi: '123 Đường A, Quận B, TP.HCM',
      don_vi_cong_tac: 'ĐH XYZ',
      image_3x4: 'https://cdn.example.com/images/long.jpg',
      photo_3x4_image_id: 'img_long_01',
      status: 'registered',
    });

    const app = createTestApp({
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request('/export/exam/404/exam-list');
    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    expect(String(worksheet.A1?.v || '')).toBe('DANH SÁCH THÍ SINH - SN06 B1 VEPT 10-11-12/04/2026');
    expect(worksheet.A6?.v).toBe('STT');
    expect(worksheet.I6?.v).toBe('CCCD');
    expect(worksheet.L6?.v).toBe('Email');
    expect(worksheet.N6?.v).toBe('Địa chỉ');
    expect(worksheet.O6?.v).toBe('Đơn vị công tác');

    expect(worksheet.E7?.v).toBe('NGÔ BẢO LONG');
    expect(worksheet.I7?.v).toBe('077201009999');
    expect(worksheet.K7?.v).toBe('0911222333');
    expect(worksheet.L7?.v).toBe('long@example.com');
    expect(worksheet.M7?.v).toBe('ĐÀ NẴNG');
    expect(worksheet.N7?.v).toBe('123 ĐƯỜNG A, QUẬN B, TP.HCM');
    expect(worksheet.O7?.v).toBe('ĐH XYZ');
  });

  it('returns server-side preview matching exam-list export format for VanTrang full template', async () => {
    await seedTemplate(5, 'vantrang_default', 'templates/VANTRANG.xlsx', 7);
    await seedExam(505, 5, 'TOEFL ITP A2 HCM G8', 'A2');
    await seedStudentRegistration(505, {
      ho: 'Nguyễn',
      ten_dem: 'Thị',
      ten: 'Ánh',
      ho_ten_full: 'Nguyễn Thị Ánh',
      gioi_tinh: 'Nữ',
      cccd: '079193000123',
      sdt: '0902340471',
      email: 'anh@example.com',
      noi_sinh: 'TP.HCM',
      dia_chi: '20 Đường 32, Hiệp Bình, TPHCM',
      don_vi_cong_tac: 'Sinh viên',
      status: 'approved',
    });

    const app = createTestApp({
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.request('/export/exam/505/exam-list/preview');
    expect(response.status).toBe(200);

    const payload = await response.json() as any;
    expect(payload?.success).toBe(true);
    expect(payload?.data?.kind).toBe('vantrang_full');
    expect(payload?.data?.sheetTitle).toBe('DANH SÁCH THÍ SINH - TOEFL ITP A2 HCM G8');
    expect(payload?.data?.headers?.[8]).toBe('CCCD');
    expect(payload?.data?.rows?.[0]?.[4]).toBe('NGUYỄN THỊ ÁNH');
    expect(payload?.data?.rows?.[0]?.[8]).toBe('079193000123');
    expect(payload?.data?.rows?.[0]?.[11]).toBe('anh@example.com');
  });

  it('keeps default exam-list export scoped to approved registrations only', async () => {
    await seedOrganizer('org-export-scope-default', 'Học viện Công nghệ Bưu chính Viễn thông', 'PTIT');
    await seedTemplate(61, 'ptit', 'templates/PTIT-SCOPE-DEFAULT.xlsx', 9);
    await seedExam(606, 61, 'PTIT scope default', 'B1', 'org-export-scope-default');
    await seedStudentRegistration(606, {
      ho: 'Lê',
      ten_dem: 'Minh',
      ten: 'Duyệt',
      ho_ten_full: 'Lê Minh Duyệt',
      cccd: '111111111111',
      status: 'approved',
    });
    await seedStudentRegistration(606, {
      ho: 'Lê',
      ten_dem: 'Minh',
      ten: 'Chờ',
      ho_ten_full: 'Lê Minh Chờ',
      cccd: '222222222222',
      status: 'pending',
    });

    const app = createTestApp();
    const response = await app.request('/export/exam/606/exam-list');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<string | number>>;
    const values = rows.flat().map((value) => String(value ?? ''));

    expect(values).toContain('111111111111');
    expect(values).not.toContain('222222222222');
  });

  it('includes pending registrations when exam-list export scope=all', async () => {
    await seedOrganizer('org-export-scope-all', 'Học viện Công nghệ Bưu chính Viễn thông', 'PTIT');
    await seedTemplate(62, 'ptit', 'templates/PTIT-SCOPE-ALL.xlsx', 9);
    await seedExam(607, 62, 'PTIT scope all', 'B1', 'org-export-scope-all');
    await seedStudentRegistration(607, {
      ho: 'Phạm',
      ten_dem: 'Ngọc',
      ten: 'Duyệt',
      ho_ten_full: 'Phạm Ngọc Duyệt',
      cccd: '333333333333',
      status: 'approved',
    });
    await seedStudentRegistration(607, {
      ho: 'Phạm',
      ten_dem: 'Ngọc',
      ten: 'Chờ',
      ho_ten_full: 'Phạm Ngọc Chờ',
      cccd: '444444444444',
      status: 'pending',
    });

    const app = createTestApp();
    const response = await app.request('/export/exam/607/exam-list?scope=all');

    expect(response.status).toBe(200);

    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as Array<Array<string | number>>;
    const values = rows.flat().map((value) => String(value ?? ''));

    expect(values).toContain('333333333333');
    expect(values).toContain('444444444444');
  });

  it('returns preview metadata and pending rows when scope=all', async () => {
    await seedOrganizer('org-preview-scope-all', 'Học viện Công nghệ Bưu chính Viễn thông', 'PTIT');
    await seedTemplate(63, 'ptit', 'templates/PTIT-PREVIEW-SCOPE-ALL.xlsx', 9);
    await seedExam(608, 63, 'PTIT preview scope all', 'B1', 'org-preview-scope-all');
    await seedStudentRegistration(608, {
      ho_ten_full: 'Nguyễn Văn Approved',
      ten: 'Approved',
      cccd: '555555555555',
      status: 'approved',
    });
    await seedStudentRegistration(608, {
      ho_ten_full: 'Nguyễn Văn Pending',
      ten: 'Pending',
      cccd: '666666666666',
      status: 'pending',
    });

    const app = createTestApp();
    const response = await app.request('/export/exam/608/exam-list/preview?scope=all');

    expect(response.status).toBe(200);

    const payload = await response.json() as any;
    expect(payload?.success).toBe(true);
    expect(payload?.data?.scope).toBe('all');
    expect(payload?.data?.scopeLabel).toBe('Tất cả');
    expect(payload?.data?.totalStudents).toBe(2);
    expect(payload?.data?.rows).toHaveLength(2);
  });

  it('rejects invalid exam export scope', async () => {
    await seedOrganizer('org-invalid-scope', 'Học viện Công nghệ Bưu chính Viễn thông', 'PTIT');
    await seedTemplate(64, 'ptit', 'templates/PTIT-INVALID-SCOPE.xlsx', 9);
    await seedExam(609, 64, 'PTIT invalid scope', 'B1', 'org-invalid-scope');
    await seedStudentRegistration(609, {
      cccd: '777777777777',
      status: 'approved',
    });

    const app = createTestApp();
    const response = await app.request('/export/exam/609/exam-list?scope=nope');

    expect(response.status).toBe(400);
  });
});
