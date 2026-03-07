/**
 * Test suite: Online Classes - Authentication Middleware
 * KHÔNG dùng vi.mock(). Dùng DB thật + JWT thật.
 * verifyJWT được gọi với token thật tạo bởi generateJWT.
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { generateJWT } from '../../utils/helpers.js';
import { setupDatabase, cleanDatabase, createTestApp } from './online-classes-test-setup.js';

const JWT_SECRET = 'test-secret-key-for-vitest';
let app;

beforeAll(async () => {
  await setupDatabase();
  app = createTestApp();
});

afterEach(async () => {
  await cleanDatabase();
});

describe('Online Classes Router - Xác thực & Phân quyền', () => {

  // ─── Không có token ───────────────────────────────────────────────────────

  describe('Authentication Middleware Rejections', () => {
    it('nên từ chối request không có token (401)', async () => {
      const res = await app.fetch(
        new Request('http://localhost/online-classes/1/available-students', {
          method: 'GET'
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      // helpers.errorResponse trả về { error: message }
      expect(json.error).toBe('Thiếu token xác thực');
    });

    it('nên từ chối token không hợp lệ (chữ ký sai) (401)', async () => {
      const res = await app.fetch(
        new Request('http://localhost/online-classes/1/available-students', {
          headers: { Authorization: 'Bearer token.sai.chu_ky' }
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Token không hợp lệ hoặc đã hết hạn');
    });

    it('nên từ chối token đã hết hạn (401)', async () => {
      // Tạo JWT thật với exp đã qua
      const expiredToken = await generateJWT(
        { id: 1, role: 'admin', exp: Date.now() - 1000 },
        JWT_SECRET
      );

      const res = await app.fetch(
        new Request('http://localhost/online-classes/1/available-students', {
          headers: { Authorization: `Bearer ${expiredToken}` }
        })
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Token không hợp lệ hoặc đã hết hạn');
    });

    it('nên chặn student truy cập route admin (403)', async () => {
      // Tạo JWT thật với role student
      const studentToken = await generateJWT(
        { id: 1, role: 'student', exp: Date.now() + 3600_000 },
        JWT_SECRET
      );

      const res = await app.fetch(
        new Request('http://localhost/online-classes/1/available-students', {
          headers: { Authorization: `Bearer ${studentToken}` }
        })
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Chỉ admin mới có quyền thực hiện');
    });

    it('nên cho phép admin truy cập route admin (200 hoặc 404)', async () => {
      // Tạo JWT thật với role admin
      const adminToken = await generateJWT(
        { id: 99, role: 'admin', exp: Date.now() + 3600_000 },
        JWT_SECRET
      );

      // Không có class id=1 trong DB — 200 với data rỗng hoặc 404
      const res = await app.fetch(
        new Request('http://localhost/online-classes/1/available-students', {
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );

      // Route trả 404 khi không tìm thấy class — điều này xác nhận auth pass
      expect([200, 404]).toContain(res.status);
      const json = await res.json();
      // Nếu 404 thì có error, nếu 200 thì có success
      if (res.status === 404) {
        expect(json.error).toBeDefined();
      } else {
        expect(json.success).toBe(true);
      }
    });
  });
});
