import type { Page } from '@playwright/test';

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

export function createMockJwt(payload: Record<string, unknown>) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

export async function seedStudentSession(
  page: Page,
  {
    token,
    cccd,
    sdt,
    studentData,
  }: {
    token?: string;
    cccd: string;
    sdt?: string;
    studentData: Record<string, unknown>;
  },
) {
  const resolvedToken = token ?? createMockJwt({
    role: 'student',
    sub: cccd,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  await page.addInitScript(
    ({ nextToken, nextCCCD, nextPhone, nextStudentData }) => {
      window.localStorage.setItem('student_token', nextToken);
      window.localStorage.setItem('student_cccd', nextCCCD);
      window.localStorage.setItem('studentCCCD', nextCCCD);
      if (nextPhone) {
        window.localStorage.setItem('student_sdt', nextPhone);
      }
      window.localStorage.setItem('student_data', JSON.stringify(nextStudentData));
    },
    {
      nextToken: resolvedToken,
      nextCCCD: cccd,
      nextPhone: sdt ?? '',
      nextStudentData: studentData,
    },
  );
}

export async function seedAdminSession(
  page: Page,
  {
    token,
    admin,
  }: {
    token?: string;
    admin: Record<string, unknown>;
  },
) {
  const resolvedToken = token ?? createMockJwt({
    role: String(admin.role || 'super_admin'),
    sub: String(admin.id || 'admin'),
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  await page.addInitScript(
    ({ nextToken, nextAdmin }) => {
      window.localStorage.setItem('admin_token', nextToken);
      window.localStorage.setItem('admin', JSON.stringify(nextAdmin));
    },
    {
      nextToken: resolvedToken,
      nextAdmin: admin,
    },
  );
}

