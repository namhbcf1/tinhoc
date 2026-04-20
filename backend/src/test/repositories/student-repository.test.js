import { beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { searchStudents } from '../../repositories/student-repository.js';
async function setupTables(db) {
    await db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cccd TEXT UNIQUE NOT NULL,
      ho TEXT NOT NULL,
      ten_dem TEXT NOT NULL,
      ten TEXT NOT NULL,
      ho_ten_full TEXT NOT NULL,
      ho_ten_normalized TEXT,
      ngay_sinh DATE NOT NULL,
      noi_sinh TEXT NOT NULL,
      gioi_tinh TEXT NOT NULL,
      dan_toc TEXT,
      quoc_tich TEXT,
      email TEXT NOT NULL,
      sdt TEXT NOT NULL,
      dia_chi TEXT NOT NULL,
      ngay_cap_cccd TEXT,
      don_vi_cong_tac TEXT,
      image_cccd_front TEXT,
      image_cccd_back TEXT,
      image_3x4 TEXT,
      cccd_front_image_id TEXT,
      cccd_back_image_id TEXT,
      photo_3x4_image_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}
async function seedStudent(db, overrides = {}) {
    const cccd = overrides.cccd ?? '012345678901';
    await db.prepare(`
    INSERT INTO students (
      cccd, ho, ten_dem, ten, ho_ten_full, ho_ten_normalized,
      ngay_sinh, noi_sinh, gioi_tinh, dan_toc, quoc_tich,
      email, sdt, dia_chi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(cccd, overrides.ho ?? 'Nguyen', overrides.ten_dem ?? 'Van', overrides.ten ?? 'A', overrides.ho_ten_full ?? 'Nguyen Van A', overrides.ho_ten_normalized ?? 'nguyen van a', overrides.ngay_sinh ?? '2000-01-01', overrides.noi_sinh ?? 'Ha Noi', overrides.gioi_tinh ?? 'Nam', overrides.dan_toc ?? 'Kinh', overrides.quoc_tich ?? 'Viet Nam', overrides.email ?? 'a@example.com', overrides.sdt ?? '0900000000', overrides.dia_chi ?? 'Ha Noi').run();
}
describe('student repository searchStudents', () => {
    beforeEach(async () => {
        await setupTables(env.DB);
        await env.DB.prepare('DELETE FROM students').run();
    });
    it('finds a student by phone number', async () => {
        await seedStudent(env.DB, {
            cccd: '017202000201',
            ho_ten_full: 'Nguyen Thanh Nam',
            ho_ten_normalized: 'nguyen thanh nam',
            sdt: '0836768597',
            email: 'nam@example.com',
        });
        await seedStudent(env.DB, {
            cccd: '099999999999',
            ho_ten_full: 'Nguoi Khac',
            ho_ten_normalized: 'nguoi khac',
            sdt: '0900000001',
            email: 'other@example.com',
        });
        const results = await searchStudents(env.DB, '0836768597');
        expect(results).toHaveLength(1);
        expect(results[0]?.cccd).toBe('017202000201');
    });
    it('finds a student by email', async () => {
        await seedStudent(env.DB, {
            cccd: '088888888888',
            ho_ten_full: 'Tran Thi B',
            ho_ten_normalized: 'tran thi b',
            sdt: '0911111111',
            email: 'bangachieu2@gmail.com',
        });
        const results = await searchStudents(env.DB, 'bangachieu2@gmail.com');
        expect(results).toHaveLength(1);
        expect(results[0]?.email).toBe('bangachieu2@gmail.com');
    });
});
