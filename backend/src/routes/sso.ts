import { Hono } from 'hono';
import type { Env, JWTPayload } from '../types/env.js';
import { errorResponse, jsonResponse, verifyPassword } from '../utils/helpers.js';
import { authMiddleware } from '../middleware/auth-middleware.js';
import {
  createSsoHandoff,
  exchangeSsoHandoff,
  getActiveSessionBySid,
  issueSessionToken,
  type SessionAudience,
} from '../lib/auth/session-broker.js';
import {
  findAdminByUsername,
  findAdminByTeacherCode,
  updateAdminLastLogin,
  promoteLegacyTeacherAdmin,
} from '../db/admin-queries.js';
import { isAcceptedStudentLoginSecret } from '../services/student-service.js';

const sso = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

function normalizeString(value: unknown) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhone(value: unknown) {
  const normalized = normalizeString(value);
  return normalized ? normalized.replace(/[\s\-\.]/g, '') : null;
}

function toTargetApp(value: unknown) {
  const normalized = normalizeString(value);
  if (normalized === 'edu' || normalized === 'exam') {
    return normalized as SessionAudience;
  }

  throw Object.assign(new Error('target_app không hợp lệ'), { statusCode: 400 });
}

sso.post('/handoffs', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const targetApp = toTargetApp(body?.target_app || body?.targetApp);

    if (!user?.sid) {
      return errorResponse('Phiên đăng nhập hiện tại chưa hỗ trợ SSO. Vui lòng đăng nhập lại.', 409);
    }

    const session = await getActiveSessionBySid(c.env.DB, user.sid);
    if (!session) {
      return errorResponse('Session hiện tại không còn hiệu lực', 401);
    }

    const handoff = await createSsoHandoff(
      c.env.DB,
      c.env,
      session,
      targetApp,
      body?.return_to || body?.returnTo,
    );

    return jsonResponse({
      success: true,
      ...handoff,
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Không thể tạo SSO handoff', error.statusCode || 500);
  }
});

sso.post('/exchange', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const ticket = normalizeString(body?.ticket);
    const targetApp = toTargetApp(body?.target_app || body?.targetApp);

    if (!ticket) {
      return errorResponse('Thiếu ticket SSO', 400);
    }

    const result = await exchangeSsoHandoff(c.env.DB, c.env, ticket, targetApp);
    return jsonResponse({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return errorResponse(error.message || 'Không thể đổi SSO ticket', error.statusCode || 500);
  }
});

sso.post('/direct-login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const type = normalizeString(body?.type);
    const targetApp = toTargetApp(body?.target_app || body?.targetApp || 'exam');

    if (!type) {
      return errorResponse('Thiếu type đăng nhập', 400);
    }

    if (type === 'student') {
      const loginSecret = normalizeString(body?.phone || body?.sdt || body?.identifier);
      const cccd = normalizeString(body?.cccd);
      if (!loginSecret || !cccd) {
        return errorResponse('Thiếu CCCD hoặc số điện thoại/email', 400);
      }

      const student = await c.env.DB.prepare(
        `
          SELECT id, cccd, ho_ten_full, email, sdt
          FROM students
          WHERE cccd = ?
          LIMIT 1
        `
      ).bind(cccd).first<{ id?: number; cccd?: string; ho_ten_full?: string; email?: string; sdt?: string }>();

      if (!student || !isAcceptedStudentLoginSecret(student.cccd, student.sdt, loginSecret, student.email)) {
        return errorResponse('Thông tin đăng nhập không chính xác', 401);
      }

      const issued = await issueSessionToken(
        c.env.DB,
        c.env,
        {
          id: Number(student.id),
          userType: 'student',
          cccd: student.cccd || null,
          phone: student.sdt || null,
          email: student.email || null,
          displayName: student.ho_ten_full || student.cccd || null,
        },
        targetApp,
      );

      return jsonResponse({
        success: true,
        token: issued.token,
        sid: issued.sid,
        expires_at: issued.expiresAt,
        target_app: targetApp,
        user: {
          id: student.id,
          name: student.ho_ten_full || '',
          email: student.email || undefined,
          type: 'student',
          phone: student.sdt || undefined,
        },
      });
    }

    if (type === 'teacher') {
      const phone = normalizePhone(body?.phone);
      const teacherCode = normalizeString(body?.teacherCode || body?.teacher_code);
      if (!phone || !teacherCode) {
        return errorResponse('Thiếu mã giáo viên hoặc số điện thoại', 400);
      }

      // Teaching staff is now stored as admin with teacher_code
      const teacher = await findAdminByTeacherCode(c.env.DB, teacherCode) as any;
      if (!teacher || teacher.status !== 'active' || normalizePhone(teacher.sdt || teacher.phone) !== phone) {
        return errorResponse('Thông tin đăng nhập không chính xác', 401);
      }

      await promoteLegacyTeacherAdmin(c.env.DB, Number(teacher.id));

      const issued = await issueSessionToken(
        c.env.DB,
        c.env,
        {
          id: Number(teacher.id),
          userType: 'admin',
          role: 'admin',
          teacherCode: teacher.teacher_code,
          phone: teacher.sdt || teacher.phone || null,
          email: teacher.email || null,
          displayName: teacher.ho_ten_full || teacher.full_name || teacher.teacher_code || null,
        },
        targetApp,
      );

      return jsonResponse({
        success: true,
        token: issued.token,
        sid: issued.sid,
        expires_at: issued.expiresAt,
        target_app: targetApp,
        user: {
          id: teacher.id,
          name: teacher.ho_ten_full || teacher.full_name || '',
          email: teacher.email || undefined,
          type: 'admin',
          phone: teacher.sdt || teacher.phone || undefined,
          role: 'admin',
          teacher_code: teacher.teacher_code || undefined,
        },
      });
    }

    if (type === 'admin') {
      const username = normalizeString(body?.username);
      const password = typeof body?.password === 'string' ? body.password : null;

      if (!username || !password) {
        return errorResponse('Thiếu username hoặc password', 400);
      }

      const admin = await findAdminByUsername(c.env.DB, username) as any;
      if (!admin) {
        return errorResponse('Thông tin đăng nhập không chính xác', 401);
      }

      const isValid = await verifyPassword(password, admin.password_hash);
      if (!isValid) {
        return errorResponse('Thông tin đăng nhập không chính xác', 401);
      }

      await promoteLegacyTeacherAdmin(c.env.DB, Number(admin.id));
      const sessionRole = admin.role === 'super_admin' ? 'super_admin' : 'admin';

      try {
        await updateAdminLastLogin(c.env.DB, Number(admin.id));
      } catch (error) {
        console.error('Error updating admin last login for SSO direct login:', error);
      }

      const issued = await issueSessionToken(
        c.env.DB,
        c.env,
        {
          id: Number(admin.id),
          userType: 'admin',
          role: sessionRole,
          username: admin.username || null,
          teacherCode: admin.teacher_code || null,
          phone: admin.phone || admin.sdt || null,
          email: admin.email || null,
          displayName: admin.ho_ten_full || admin.full_name || admin.username || null,
        },
        targetApp,
      );

      return jsonResponse({
        success: true,
        token: issued.token,
        sid: issued.sid,
        expires_at: issued.expiresAt,
        target_app: targetApp,
        user: {
          id: admin.id,
          name: admin.ho_ten_full || admin.full_name || admin.username || '',
          email: admin.email || undefined,
          type: 'admin',
          phone: admin.phone || admin.sdt || undefined,
          username: admin.username || undefined,
          role: sessionRole,
          teacher_code: admin.teacher_code || undefined,
        },
      });
    }

    return errorResponse('Loại tài khoản không hợp lệ', 400);
  } catch (error: any) {
    return errorResponse(error.message || 'Không thể đăng nhập qua SSO broker', error.statusCode || 500);
  }
});

export default sso;
