/**
 * Test: online-classes service - Per-category dedupe ("lọc trùng lớp")
 *
 * Luồng thật: Service → Repository → D1 DB thật (Miniflare in-memory).
 * Chỉ mock Google Calendar (external API).
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import * as service from '../../lib/services/online-classes.js';
import { classifyOnlineClass } from '../../lib/services/online-classes.js';
import { setupRealDB, clearRealDB } from '../setup-real-db.js';

vi.mock('../../services/google-calendar.js');

beforeAll(async () => {
  await setupRealDB(env.DB);
});

beforeEach(async () => {
  vi.resetAllMocks();
  await clearRealDB(env.DB);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO admins (id, username, password_hash, full_name)
     VALUES (1, 'admin_test', 'hashed', 'Admin Test')`
  ).run();
  await seedExamCategories(env.DB);
});

/**
 * Seed the shared `exam_categories` table with the PRODUCTION mapping
 * (vantrangexam/db/db.sql):
 *   id 1 = VSTEP        (code VSTEP)        -> english
 *   id 2 = Tin học      (code tin-hoc)      -> informatics
 *   id 3 = Ngôn ngữ Anh (code ngon-ngu-anh) -> english
 */
async function seedExamCategories(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS exam_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL
    )
  `).run();
  await db.prepare(`DELETE FROM exam_categories`).run();
  const rows: Array<[number, string, string]> = [
    [1, 'VSTEP', 'VSTEP'],
    [2, 'Tin học', 'tin-hoc'],
    [3, 'Ngôn ngữ Anh', 'ngon-ngu-anh'],
  ];
  for (const [id, name, code] of rows) {
    await db.prepare(
      `INSERT INTO exam_categories (id, name, code) VALUES (?, ?, ?)`
    ).bind(id, name, code).run();
  }
}

// Tạo class với category được suy ra từ program_uuid / class_name / exam_category_id.
async function seedClass(db: D1Database, opts: { name: string; programUuid?: string; examCategoryId?: number | null }) {
  const result = await db.prepare(`
    INSERT INTO online_classes
      (class_name, schedule_rule, schedule_time, start_date, max_students, status, created_by, program_uuid, exam_category_id)
    VALUES (?, 'Weekly', '19:00-21:00', '2025-01-01', 50, 'active', 1, ?, ?)
  `).bind(opts.name, opts.programUuid ?? null, opts.examCategoryId ?? null).run();
  return result.meta.last_row_id;
}

async function seedStudent(db: D1Database, suffix = '') {
  const result = await db.prepare(`
    INSERT INTO students (cccd, ho, ten_dem, ten, ho_ten_full, ngay_sinh, noi_sinh,
                          gioi_tinh, email, sdt, dia_chi)
    VALUES (?, 'Nguyen', 'Van', ?, ?, '2000-01-01', 'HN', 'Nam', ?, ?, 'HN')
  `).bind(
    `CCCD_${suffix}_${Date.now()}`,
    `Hoc Vien ${suffix}`,
    `Nguyen Van Hoc Vien ${suffix}`,
    `hv${suffix}@test.com`,
    `090000${suffix.slice(0, 4)}`
  ).run();
  return result.meta.last_row_id;
}

describe('Online Classes Service - Per-category dedupe (lọc trùng lớp)', () => {
  const db = env.DB;

  it('cho phép 1 lớp Tiếng Anh + 1 lớp Tin học (khác category)', async () => {
    const taId = await seedClass(db, { name: 'Lớp Tiếng Anh (VEPT)', programUuid: 'program-vept' });
    const thId = await seedClass(db, { name: 'Lớp Tin học (MOS)', programUuid: 'program-tinhoc' });
    const studentId = await seedStudent(db, 'mix');

    const r1 = await service.enrollStudent(db, taId, studentId);
    expect(r1.status).toBe('pending');

    const r2 = await service.enrollStudent(db, thId, studentId);
    expect(r2.status).toBe('pending');

    // Cả 2 enrollment tồn tại
    const rows = await db.prepare(
      `SELECT COUNT(*) AS c FROM online_class_enrollments WHERE student_id = ?`
    ).bind(studentId).first<any>();
    expect(rows.c).toBe(2);
  });

  it('chặn lớp Tiếng Anh thứ 2 (cùng category)', async () => {
    const taId = await seedClass(db, { name: 'Lớp Tiếng Anh 1 (VEPT)', programUuid: 'program-vept' });
    const ta2Id = await seedClass(db, { name: 'Lớp Tiếng Anh 2 (VEPT)', programUuid: 'program-vept' });
    const studentId = await seedStudent(db, 'dup_ta');

    await service.enrollStudent(db, taId, studentId);

    await expect(service.enrollStudent(db, ta2Id, studentId))
      .rejects
      .toThrow(/Tiếng Anh/);
  });

  it('chặn lớp Tin học thứ 2 (cùng category)', async () => {
    const thId = await seedClass(db, { name: 'Lớp Tin học 1 (MOS)', programUuid: 'program-tinhoc' });
    const th2Id = await seedClass(db, { name: 'Lớp Tin học 2 (IC3)', programUuid: 'program-tinhoc' });
    const studentId = await seedStudent(db, 'dup_th');

    await service.enrollStudent(db, thId, studentId);

    await expect(service.enrollStudent(db, th2Id, studentId))
      .rejects
      .toThrow(/Tin học/);
  });

  it('adminAddStudent cũng áp dụng lọc trùng theo category', async () => {
    const taId = await seedClass(db, { name: 'Lớp Tiếng Anh A (VEPT)', programUuid: 'program-vept' });
    const ta2Id = await seedClass(db, { name: 'Lớp Tiếng Anh B (VEPT)', programUuid: 'program-vept' });
    const studentId = await seedStudent(db, 'admin_dup');

    await service.adminAddStudent(db, taId, studentId);

    await expect(service.adminAddStudent(db, ta2Id, studentId))
      .rejects
      .toThrow(/Tiếng Anh/);
  });

  it('không ảnh hưởng lớp không xác định category (giữ nguyên behavior)', async () => {
    const c1 = await seedClass(db, { name: 'Lớp Kỹ năng mềm', programUuid: null });
    const c2 = await seedClass(db, { name: 'Lớp Kỹ năng mềm 2', programUuid: null });
    const studentId = await seedStudent(db, 'unknown_cat');

    await service.enrollStudent(db, c1, studentId);
    // Cùng category "unknown" -> không bị chặn (preserve old behavior)
    const r2 = await service.enrollStudent(db, c2, studentId);
    expect(r2.status).toBe('pending');
  });
});

describe('classifyOnlineClass - exam_category_id là tín hiệu AUTHORITATIVE', () => {
  it('id 2 (Tin học) thắng dù class_name chứa từ Tiếng Anh/VSTEP', () => {
    const cat = classifyOnlineClass(
      { exam_category_id: 2, class_name: 'Lớp ôn thi VSTEP 1', program_uuid: null, organizer_uuid: null },
      'Tin học tin-hoc'
    );
    expect(cat).toBe('informatics');
  });

  it('id 3 (Ngôn ngữ Anh) thắng dù program_uuid/class_name chứa từ Tin học', () => {
    const cat = classifyOnlineClass(
      { exam_category_id: 3, class_name: 'Lớp tin học căn bản', program_uuid: 'program-tinhoc', organizer_uuid: null },
      'Ngôn ngữ Anh ngon-ngu-anh'
    );
    expect(cat).toBe('english');
  });

  it('id 1 (VSTEP) phân loại là english', () => {
    const cat = classifyOnlineClass(
      { exam_category_id: 1, class_name: 'Lớp ôn tập', program_uuid: 'program-tinhoc', organizer_uuid: 'org-ptit' },
      'VSTEP VSTEP'
    );
    expect(cat).toBe('english');
  });

  it('id không nhận diện được -> rơi về fallback text', () => {
    const cat = classifyOnlineClass(
      { exam_category_id: 99, class_name: 'Lớp ôn VSTEP', program_uuid: null, organizer_uuid: null },
      null
    );
    expect(cat).toBe('english');
  });

  it('không có exam_category_id -> dùng fallback text (hỗ trợ lớp tạo tay)', () => {
    const cat = classifyOnlineClass(
      { class_name: 'Lớp Tin học MOS', program_uuid: 'program-tinhoc', organizer_uuid: 'org-ptit' },
      null
    );
    expect(cat).toBe('informatics');
  });
});

describe('classifyOnlineClass - fallback token (không phân biệt hoa thường / dấu)', () => {
  it('token Tiếng Anh -> english', () => {
    const englishCases: Array<[string, string]> = [
      ['LỚP ÔN THI VSTEP', 'vstep'],
      ['Lớp vEPT B1', 'vept'],
      ['ENGLISH FOR BEGINNERS', 'english'],
      ['TIẾNG ANH GIAO TIẾP', 'tieng anh'],
      ['NGÔN NGỮ ANH NÂNG CAO', 'ngon ngu anh'],
      ['NGOẠI NGỮ ỨNG DỤNG', 'ngoai ngu'],
      ['Luyện TOEIC 750', 'toeic'],
      ['TOEFL iBT Prep', 'toefl'],
      ['IELTS 6.5', 'ielts'],
    ];
    for (const [name, token] of englishCases) {
      expect(classifyOnlineClass({ class_name: name }, null), `${name} (${token})`).toBe('english');
    }
  });

  it('token Tin học -> informatics', () => {
    const infoCases: Array<[string, string]> = [
      ['lớp tin học căn bản', 'tin hoc'],
      ['TIN HỌC VĂN PHÒNG', 'tin hoc'],
      ['TINHOC NÂNG CAO', 'tinhoc'],
      ['PTIT CƠ BẢN', 'ptit'],
      ['MOS 2019', 'mos'],
      ['IC3 GS6', 'ic3'],
      ['CNTT CƠ BẢN', 'cntt'],
      ['COMPUTER SCIENCE', 'computer'],
    ];
    for (const [name, token] of infoCases) {
      expect(classifyOnlineClass({ class_name: name }, null), `${name} (${token})`).toBe('informatics');
    }
  });

  it('program_uuid / organizer_uuid cũng được scan (vd program-ptit, PTIT)', () => {
    expect(classifyOnlineClass({ class_name: 'Lớp ôn tập', program_uuid: 'program-ptit' }, null)).toBe('informatics');
    expect(classifyOnlineClass({ class_name: 'Lớp ôn tập', organizer_uuid: 'PTIT' }, null)).toBe('informatics');
    expect(classifyOnlineClass({ class_name: 'Lớp ôn tập', program_uuid: 'program-vept' }, null)).toBe('english');
  });

  it('ưu tiên english khi cả 2 họ token xuất hiện (ví dụ "Tiếng Anh tin học ứng dụng")', () => {
    expect(classifyOnlineClass({ class_name: 'Tiếng Anh tin học ứng dụng' }, null)).toBe('english');
    expect(classifyOnlineClass({ class_name: 'TIN HỌC - TIẾNG ANH CƠ BẢN' }, null)).toBe('english');
  });

  it('lớp không khớp token nào -> unknown', () => {
    expect(classifyOnlineClass({ class_name: 'Lớp Kỹ năng mềm' }, null)).toBe('unknown');
    expect(classifyOnlineClass({ class_name: 'Lớp ôn tập' }, null)).toBe('unknown');
    expect(classifyOnlineClass({ class_name: 'Lớp chứng chỉ kế toán' }, null)).toBe('unknown');
  });
});

describe('Online Classes Service - exam_category_id authoritative trong lọc trùng', () => {
  const db = env.DB;

  it('chặn lớp Tin học thứ 2 dù tên lớp chứa VSTEP (id thắng text)', async () => {
    const c1 = await seedClass(db, { name: 'Lớp ôn thi VSTEP 1', examCategoryId: 2 });
    const c2 = await seedClass(db, { name: 'Lớp ôn thi VSTEP 2', examCategoryId: 2 });
    const studentId = await seedStudent(db, 'auth_th');

    await service.enrollStudent(db, c1, studentId);

    await expect(service.enrollStudent(db, c2, studentId))
      .rejects
      .toThrow(/Tin học/);
  });

  it('chặn lớp Tiếng Anh thứ 2 (id 3 Ngôn ngữ Anh) dù tên lớp chứa Tin học', async () => {
    const c1 = await seedClass(db, { name: 'Lớp tin học căn bản 1', examCategoryId: 3 });
    const c2 = await seedClass(db, { name: 'Lớp tin học căn bản 2', examCategoryId: 3 });
    const studentId = await seedStudent(db, 'auth_ta');

    await service.enrollStudent(db, c1, studentId);

    await expect(service.enrollStudent(db, c2, studentId))
      .rejects
      .toThrow(/Tiếng Anh/);
  });

  it('không chặn khi 2 lớp khác bucket (id 2 Tin học + id 3 Ngôn ngữ Anh)', async () => {
    const thId = await seedClass(db, { name: 'Lớp ôn VSTEP', examCategoryId: 2 });
    const taId = await seedClass(db, { name: 'Lớp ôn VSTEP', examCategoryId: 3 });
    const studentId = await seedStudent(db, 'auth_mix');

    const r1 = await service.enrollStudent(db, thId, studentId);
    expect(r1.status).toBe('pending');

    const r2 = await service.enrollStudent(db, taId, studentId);
    expect(r2.status).toBe('pending');

    const rows = await db.prepare(
      `SELECT COUNT(*) AS c FROM online_class_enrollments WHERE student_id = ?`
    ).bind(studentId).first<any>();
    expect(rows.c).toBe(2);
  });
});
