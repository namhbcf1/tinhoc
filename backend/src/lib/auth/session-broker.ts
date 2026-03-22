import type { Env, JWTPayload } from '../../types/env.js';
import { generateJWT } from '../../utils/helpers.js';

export type SessionAudience = 'edu' | 'exam';
export type SessionUserType = 'admin' | 'student';

export type SessionPrincipal = {
  id: number;
  userType: SessionUserType;
  role?: string | null;
  username?: string | null;
  cccd?: string | null;
  teacherCode?: string | null;
  phone?: string | null;
  email?: string | null;
  displayName?: string | null;
};

export type ActiveSessionRecord = {
  sid: string;
  subject_key: string;
  user_id: number;
  user_type: SessionUserType;
  role: string | null;
  username: string | null;
  cccd: string | null;
  teacher_code: string | null;
  phone: string | null;
  email: string | null;
  display_name: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
};

type HandoffRecord = {
  ticket: string;
  sid: string;
  target_app: SessionAudience;
  return_to: string | null;
  status: string;
  expires_at: string;
  used_at: string | null;
};

function normalizeString(value: unknown) {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function buildSubjectKey(principal: Pick<SessionPrincipal, 'id' | 'userType'>) {
  return `${principal.userType}:${principal.id}`;
}

function getAppBaseUrl(targetApp: SessionAudience, env: Env) {
  if (targetApp === 'exam') {
    return normalizeString(env.EXAM_APP_URL) || 'https://vantrangexam.pages.dev';
  }

  return normalizeString(env.EDU_APP_URL) || 'https://vantrangedu.com';
}

function sanitizeReturnTo(returnTo: string | null | undefined) {
  const normalized = normalizeString(returnTo);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized, 'https://placeholder.local');
    if (parsed.origin === 'https://placeholder.local') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function buildSessionUser(session: Pick<
  ActiveSessionRecord,
  'user_id' | 'user_type' | 'phone' | 'email' | 'display_name' | 'cccd' | 'teacher_code' | 'role'
>) {
  return {
    id: session.user_id,
    type: session.user_type,
    name: session.display_name || '',
    email: session.email || undefined,
    phone: session.phone || undefined,
    cccd: session.cccd || undefined,
    teacher_code: session.teacher_code || undefined,
    teacherCode: session.teacher_code || undefined,
    role: session.role || undefined,
  };
}

function buildJwtPayload(
  session: ActiveSessionRecord,
  audience: SessionAudience,
  expiresAtSeconds: number,
) {
  const payload: JWTPayload = {
    id: session.user_id,
    userId: `${session.user_type}-${session.user_id}`,
    sub: session.subject_key,
    sid: session.sid,
    aud: audience,
    type: session.user_type,
    user_type: session.user_type,
    role: session.role || undefined,
    username: session.username || undefined,
    cccd: session.cccd || undefined,
    teacher_code: session.teacher_code || undefined,
    teacherCode: session.teacher_code || undefined,
    phone: session.phone || undefined,
    email: session.email || undefined,
    ho_ten: session.display_name || undefined,
    display_name: session.display_name || undefined,
    iat: Math.floor(Date.now() / 1000),
    exp: expiresAtSeconds,
  };

  return payload;
}

async function insertSessionRecord(
  db: D1Database,
  principal: SessionPrincipal,
  sid: string,
) {
  const timestamp = nowIso();
  await db.prepare(
    `
      INSERT INTO auth_sessions (
        sid,
        subject_key,
        user_id,
        user_type,
        role,
        username,
        cccd,
        teacher_code,
        phone,
        email,
        display_name,
        status,
        created_at,
        updated_at,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `
  ).bind(
    sid,
    buildSubjectKey(principal),
    principal.id,
    principal.userType,
    normalizeString(principal.role),
    normalizeString(principal.username),
    normalizeString(principal.cccd),
    normalizeString(principal.teacherCode),
    normalizeString(principal.phone),
    normalizeString(principal.email),
    normalizeString(principal.displayName),
    timestamp,
    timestamp,
    timestamp,
  ).run();

  return getActiveSessionBySid(db, sid);
}

export async function getActiveSessionBySid(db: D1Database, sid: string) {
  const record = await db.prepare(
    `
      SELECT *
      FROM auth_sessions
      WHERE sid = ?
        AND status = 'active'
        AND revoked_at IS NULL
      LIMIT 1
    `
  ).bind(sid).first<ActiveSessionRecord>();

  return record || null;
}

export async function touchSession(db: D1Database, sid: string) {
  await db.prepare(
    `
      UPDATE auth_sessions
      SET updated_at = ?,
          last_seen_at = ?
      WHERE sid = ?
        AND status = 'active'
    `
  ).bind(nowIso(), nowIso(), sid).run();
}

export async function issueSessionToken(
  db: D1Database,
  env: Env,
  principal: SessionPrincipal,
  audience: SessionAudience,
  existingSid?: string | null,
) {
  let session = existingSid ? await getActiveSessionBySid(db, existingSid) : null;

  if (!session) {
    const sid = crypto.randomUUID();
    session = await insertSessionRecord(db, principal, sid);
  }

  if (!session) {
    throw new Error('Không thể tạo auth session');
  }

  const expiresAtSeconds = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const token = await generateJWT(buildJwtPayload(session, audience, expiresAtSeconds), env.JWT_SECRET);
  await touchSession(db, session.sid);

  return {
    sid: session.sid,
    token,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    session,
  };
}

export async function ensureSessionForPayload(
  db: D1Database,
  env: Env,
  payload: JWTPayload,
) {
  const currentSid = normalizeString(payload.sid);
  if (currentSid) {
    const existing = await getActiveSessionBySid(db, currentSid);
    if (existing) {
      await touchSession(db, existing.sid);
      return existing;
    }
  }

  const idValue =
    typeof payload.id === 'number'
      ? payload.id
      : Number.parseInt(String(payload.id ?? payload.userId ?? '0').replace(/^[a-z_:-]+/i, ''), 10);
  const userType = (payload.user_type || payload.type) as SessionUserType | undefined;

  if (!Number.isFinite(idValue) || !userType) {
    return null;
  }

  const principal: SessionPrincipal = {
    id: idValue,
    userType,
    role: payload.role || null,
    username: payload.username || null,
    cccd: payload.cccd || null,
    teacherCode: payload.teacher_code || payload.teacherCode || null,
    phone: payload.phone || null,
    email: payload.email || null,
    displayName: payload.ho_ten || payload.display_name || null,
  };

  const issued = await issueSessionToken(db, env, principal, (payload.aud as SessionAudience) || 'edu');
  return issued.session;
}

export async function createSsoHandoff(
  db: D1Database,
  env: Env,
  session: ActiveSessionRecord,
  targetApp: SessionAudience,
  returnTo?: string | null,
) {
  const ticket = crypto.randomUUID();
  const sanitizedReturnTo = sanitizeReturnTo(returnTo);
  const expiresAt = futureIso(5);

  await db.prepare(
    `
      INSERT INTO sso_handoffs (
        ticket,
        sid,
        target_app,
        return_to,
        status,
        expires_at,
        created_at
      )
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `
  ).bind(ticket, session.sid, targetApp, sanitizedReturnTo, expiresAt, nowIso()).run();

  const targetBase = getAppBaseUrl(targetApp, env).replace(/\/+$/, '');
  const loginPath = targetApp === 'exam' ? '/#/login' : '/login';
  const url = new URL(`${targetBase}${loginPath}`);
  url.searchParams.set('ticket', ticket);
  if (sanitizedReturnTo) {
    url.searchParams.set('return_to', sanitizedReturnTo);
  }

  return {
    ticket,
    redirect_url: url.toString(),
    expires_at: expiresAt,
  };
}

export async function exchangeSsoHandoff(
  db: D1Database,
  env: Env,
  ticket: string,
  targetApp: SessionAudience,
) {
  const handoff = await db.prepare(
    `
      SELECT *
      FROM sso_handoffs
      WHERE ticket = ?
      LIMIT 1
    `
  ).bind(ticket).first<HandoffRecord>();

  if (!handoff) {
    throw Object.assign(new Error('SSO ticket không tồn tại'), { statusCode: 404 });
  }

  if (handoff.target_app !== targetApp) {
    throw Object.assign(new Error('SSO ticket không đúng đích ứng dụng'), { statusCode: 400 });
  }

  if (handoff.status !== 'pending' || handoff.used_at) {
    throw Object.assign(new Error('SSO ticket đã được sử dụng'), { statusCode: 410 });
  }

  if (new Date(handoff.expires_at).getTime() <= Date.now()) {
    await db.prepare(
      `
        UPDATE sso_handoffs
        SET status = 'expired'
        WHERE ticket = ?
      `
    ).bind(ticket).run();
    throw Object.assign(new Error('SSO ticket đã hết hạn'), { statusCode: 410 });
  }

  const session = await getActiveSessionBySid(db, handoff.sid);
  if (!session) {
    throw Object.assign(new Error('Session đăng nhập không còn hiệu lực'), { statusCode: 401 });
  }

  const issued = await issueSessionToken(
    db,
    env,
    {
      id: session.user_id,
      userType: session.user_type,
      role: session.role,
      username: session.username,
      cccd: session.cccd,
      teacherCode: session.teacher_code,
      phone: session.phone,
      email: session.email,
      displayName: session.display_name,
    },
    targetApp,
    session.sid,
  );

  await db.prepare(
    `
      UPDATE sso_handoffs
      SET status = 'used',
          used_at = ?
      WHERE ticket = ?
    `
  ).bind(nowIso(), ticket).run();

  return {
    ticket,
    sid: issued.sid,
    token: issued.token,
    expires_at: issued.expiresAt,
    target_app: targetApp,
    return_to: handoff.return_to,
    user: buildSessionUser(session),
  };
}

export async function revokeSessionBySid(db: D1Database, sid: string) {
  await db.prepare(
    `
      UPDATE auth_sessions
      SET status = 'revoked',
          revoked_at = ?,
          updated_at = ?
      WHERE sid = ?
        AND status = 'active'
    `
  ).bind(nowIso(), nowIso(), sid).run();
}
