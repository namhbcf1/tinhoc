/**
 * Google Calendar Service (v2)
 * Xử lý tích hợp Google Calendar API với Service Account + Domain-wide Delegation
 *
 * IMPORTANT: Sử dụng Service Account impersonate admin email để tạo events
 * Meet link được tạo tự động và CỐ ĐỊNH - không thay đổi khi update event
 *
 * Yêu cầu:
 * - GOOGLE_CLIENT_EMAIL: Service Account email
 * - GOOGLE_PRIVATE_KEY: Private key (PEM format)
 * - GOOGLE_ADMIN_EMAIL: Email của admin để impersonate
 */

import type { Env } from '../types/env.js';

// ========================================
// JWT GENERATION FOR SERVICE ACCOUNT
// ========================================

/**
 * Base64URL encode (không có padding)
 */
function base64URLEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert ArrayBuffer to Base64URL
 */
function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64URLEncode(binary);
}

/**
 * Import PEM private key to CryptoKey
 */
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM header/footer and decode
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * Tạo JWT token cho Service Account với Domain-wide Delegation
 * @param clientEmail - Service Account email
 * @param privateKey - Private key (PEM format)
 * @param impersonateEmail - Email của user cần impersonate
 * @param scopes - OAuth scopes
 */
async function generateJWT(clientEmail: string, privateKey: string, impersonateEmail: string, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const payload = {
    iss: clientEmail,               // Service account email
    sub: impersonateEmail,          // User to impersonate (Domain-wide Delegation)
    scope: scopes.join(' '),        // OAuth scopes
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600                 // 1 hour expiry
  };

  const encodedHeader = base64URLEncode(JSON.stringify(header));
  const encodedPayload = base64URLEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with private key
  const cryptoKey = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = arrayBufferToBase64URL(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Exchange JWT for Access Token
 */
async function getAccessToken(env: Env): Promise<string> {
  const jwt = await generateJWT(
    env.GOOGLE_CLIENT_EMAIL,
    env.GOOGLE_PRIVATE_KEY,
    env.GOOGLE_ADMIN_EMAIL,
    [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data: any = await response.json();
  return data.access_token;
}

// ========================================
// RRULE BUILDERS
// ========================================

/**
 * Tạo RRULE từ schedule_rule
 * @param scheduleRule - VD: "WEEKLY:1,3,5" (Thứ 2, 4, 6)
 * @param endDate - Ngày kết thúc (optional)
 * @returns RRULE string hoặc null nếu single event
 */
function buildRRule(scheduleRule: string | null | undefined, endDate?: string | null): string | null {
  if (!scheduleRule) return null;

  const [frequency, days] = scheduleRule.split(':');

  if (frequency === 'DAILY') {
    let rrule = 'RRULE:FREQ=DAILY';
    if (endDate) {
      rrule += `;UNTIL=${endDate.replace(/-/g, '')}T235959Z`;
    }
    return rrule;
  }

  if (frequency === 'WEEKLY' && days) {
    const dayMap: Record<string, string> = {
      '0': 'SU', '1': 'MO', '2': 'TU', '3': 'WE',
      '4': 'TH', '5': 'FR', '6': 'SA'
    };
    const byDays = days.split(',').map(d => dayMap[d.trim()]).filter(Boolean);

    if (byDays.length === 0) return null;

    let rrule = `RRULE:FREQ=WEEKLY;BYDAY=${byDays.join(',')}`;
    if (endDate) {
      rrule += `;UNTIL=${endDate.replace(/-/g, '')}T235959Z`;
    }
    return rrule;
  }

  // Single event nếu không match
  return null;
}

/**
 * Parse schedule_time to start/end times
 * @param scheduleTime - VD: "19:00-21:00"
 * @param startDate - VD: "2026-01-22"
 * @param timezone - VD: "Asia/Ho_Chi_Minh"
 */
function parseScheduleTime(scheduleTime: string, startDate: string, timezone: string): {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
} {
  const [startTime, endTime] = scheduleTime.split('-').map(t => t.trim());

  return {
    start: {
      dateTime: `${startDate}T${startTime}:00`,
      timeZone: timezone
    },
    end: {
      dateTime: `${startDate}T${endTime}:00`,
      timeZone: timezone
    }
  };
}

// ========================================
// GOOGLE CALENDAR API - ONLINE CLASSES
// ========================================

export interface OnlineClassEventResult {
  eventId: string;
  meetLink: string | null;
  recurrence: string | null;
  htmlLink: string;
}

/**
 * Tạo Google Calendar Event với Google Meet cho Online Classes
 * @param env - Cloudflare env với secrets
 * @param classData - Thông tin lớp học
 * @returns { eventId, meetLink, recurrence, htmlLink }
 */
export async function createOnlineClassEvent(env: Env, classData: {
  class_name: string;
  description?: string;
  schedule_rule: string;
  schedule_time: string;
  timezone?: string;
  start_date: string;
  end_date?: string | null;
  teacher_name?: string;
}): Promise<OnlineClassEventResult> {
  const {
    class_name,
    description,
    schedule_rule,
    schedule_time,
    timezone = 'Asia/Ho_Chi_Minh',
    start_date,
    end_date,
    teacher_name
  } = classData;

  const accessToken = await getAccessToken(env);

  // Build event data
  const times = parseScheduleTime(schedule_time, start_date, timezone);
  const rrule = buildRRule(schedule_rule, end_date);

  const eventData: any = {
    summary: class_name,
    description: description || `Lớp học online: ${class_name}${teacher_name ? `\nGiáo viên: ${teacher_name}` : ''}`,
    start: times.start,
    end: times.end,
    // Tạo Google Meet tự động
    conferenceData: {
      createRequest: {
        requestId: `online-class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    },
    // Guests settings
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    guestsCanSeeOtherGuests: false,
    // Reminders
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  // Thêm recurrence nếu có
  if (rrule) {
    eventData.recurrence = [rrule];
  }

  // Gọi Google Calendar API - dùng calendar của admin
  const calendarId = env.GOOGLE_ADMIN_EMAIL;
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar API Error:', error);
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const event: any = await response.json();

  // Một số trường hợp Google trả về event nhưng Meet link chưa "ready" ngay lập tức.
  // Ta fallback bằng cách GET lại event vài lần để lấy hangoutLink / conferenceData.entryPoints.
  const extractMeetLink = (evt: any): string | null =>
    evt?.hangoutLink ||
    evt?.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
    evt?.conferenceData?.entryPoints?.[0]?.uri ||
    null;

  let meetLink = extractMeetLink(event);
  if (!meetLink && event?.id) {
    try {
      const calendarId = env.GOOGLE_ADMIN_EMAIL;
      for (let i = 0; i < 3; i++) {
        const getResp = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.id)}?conferenceDataVersion=1`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (!getResp.ok) break;
        const fresh: any = await getResp.json();
        meetLink = extractMeetLink(fresh);
        if (meetLink) break;
      }
    } catch (e: any) {
      // Don't fail creation if polling fails; will allow regenerate-meet later
      console.warn('Meet link not ready yet (polling failed):', e?.message || e);
    }
  }

  return {
    eventId: event.id,
    meetLink,
    recurrence: rrule,
    htmlLink: event.htmlLink
  };
}

/**
 * Lấy Meet link từ một Google Calendar Event đã tồn tại
 * @param env
 * @param eventId
 * @returns string | null
 */
export async function getMeetLinkFromEvent(env: Env, eventId: string): Promise<string | null> {
  if (!eventId) {
    console.log('[getMeetLinkFromEvent] No eventId provided');
    return null;
  }

  console.log(`[getMeetLinkFromEvent] Fetching event ${eventId}...`);
  const accessToken = await getAccessToken(env);
  const calendarId = env.GOOGLE_ADMIN_EMAIL;

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`;
  console.log(`[getMeetLinkFromEvent] URL:`, url);

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error(`[getMeetLinkFromEvent] ❌ Failed: ${resp.status} ${resp.statusText}`, t);
    return null;
  }

  const event: any = await resp.json();
  console.log(`[getMeetLinkFromEvent] Event data:`, {
    id: event.id,
    summary: event.summary,
    hangoutLink: event?.hangoutLink,
    conferenceData: event?.conferenceData ? {
      createRequest: event.conferenceData.createRequest,
      entryPoints: event.conferenceData.entryPoints?.map((ep: any) => ({
        entryPointType: ep.entryPointType,
        uri: ep.uri
      }))
    } : null
  });

  const meetLink = (
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
    event?.conferenceData?.entryPoints?.[0]?.uri ||
    null
  );

  console.log(`[getMeetLinkFromEvent] Extracted meet_link:`, meetLink);
  return meetLink;
}

/**
 * Cập nhật Calendar Event AN TOÀN - chỉ update summary/description
 *
 * ⚠️ QUAN TRỌNG: KHÔNG chạm vào conferenceData để tránh mất Meet link
 *
 * @param env - Cloudflare env
 * @param eventId - Google Calendar Event ID
 * @param updateData - Dữ liệu cần update (chỉ class_name, description)
 */
export async function updateCalendarEventSafe(env: Env, eventId: string, updateData: {
  class_name?: string;
  description?: string;
}): Promise<{ success: boolean; message?: string }> {
  const accessToken = await getAccessToken(env);

  // CHỈ cho phép update các field an toàn
  const safeUpdateData: Record<string, string> = {};

  if (updateData.class_name) {
    safeUpdateData.summary = updateData.class_name;
  }

  if (updateData.description !== undefined) {
    safeUpdateData.description = updateData.description;
  }

  // KHÔNG update start/end/recurrence/conferenceData
  // Để tránh làm mất Meet link

  if (Object.keys(safeUpdateData).length === 0) {
    return { success: true, message: 'No safe fields to update' };
  }

  const calendarId = env.GOOGLE_ADMIN_EMAIL;
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(safeUpdateData)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update calendar event: ${error}`);
  }

  return { success: true };
}

/**
 * Tìm event trong Google Calendar dựa trên class_name và start_date
 * Dùng khi DB không có calendar_event_id nhưng event đã tồn tại trong Calendar
 * @param env - Cloudflare env
 * @param className - Tên lớp học
 * @param startDate - Ngày bắt đầu (YYYY-MM-DD)
 * @returns { eventId, meetLink } hoặc null
 */
export async function findEventByClassName(env: Env, className: string, startDate: string): Promise<{ eventId: string; meetLink: string | null } | null> {
  const accessToken = await getAccessToken(env);
  const calendarId = env.GOOGLE_ADMIN_EMAIL;

  // Tìm events trong khoảng thời gian (startDate ± 1 ngày)
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const timeMin = start.toISOString();
  const timeMax = new Date(start);
  timeMax.setDate(timeMax.getDate() + 2);
  timeMax.setHours(23, 59, 59, 999);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
    `timeMin=${encodeURIComponent(timeMin)}&` +
    `timeMax=${encodeURIComponent(timeMax.toISOString())}&` +
    `q=${encodeURIComponent(className)}&` +
    `maxResults=20&` +
    `conferenceDataVersion=1`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    console.warn('findEventByClassName failed:', await response.text());
    return null;
  }

  const data: any = await response.json();
  if (!data.items || data.items.length === 0) {
    return null;
  }

  // Tìm event khớp nhất (summary giống class_name)
  const matched = data.items.find((event: any) =>
    event.summary && event.summary.trim() === className.trim()
  );

  if (!matched) {
    return null;
  }

  const meetLink: string | null = matched.hangoutLink ||
    matched.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
    matched.conferenceData?.entryPoints?.[0]?.uri ||
    null;

  return {
    eventId: matched.id,
    meetLink: meetLink
  };
}

/**
 * Xóa Calendar Event
 * ⚠️ CẢNH BÁO: Sẽ làm mất Meet link vĩnh viễn
 */
export async function deleteOnlineClassEvent(env: Env, eventId: string): Promise<{ success: boolean }> {
  const accessToken = await getAccessToken(env);
  const calendarId = env.GOOGLE_ADMIN_EMAIL;

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  // 204 No Content = success, 404 = already deleted
  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete calendar event: ${error}`);
  }

  return { success: true };
}

// ========================================
// LEGACY FUNCTIONS (for existing class-schedules)
// ========================================

/**
 * Legacy: Tạo Google Calendar Event (dùng GOOGLE_SERVICE_ACCOUNT_KEY)
 * Giữ lại để tương thích với class-schedules.js
 */
export async function createCalendarEvent(env: Env & { GOOGLE_SERVICE_ACCOUNT_KEY?: string; GOOGLE_CALENDAR_ID?: string }, eventData: any): Promise<any> {
  // Nếu dùng format cũ (GOOGLE_SERVICE_ACCOUNT_KEY)
  if ((env as any).GOOGLE_SERVICE_ACCOUNT_KEY) {
    return await createCalendarEventLegacy(env as any, eventData);
  }

  // Dùng format mới
  const { className, maLop, startTime, endTime, dayOfWeek, room, notes, isRecurring, startDate } = eventData;

  const accessToken = await getAccessToken(env);
  const calendarId = env.GOOGLE_ADMIN_EMAIL || (env as any).GOOGLE_CALENDAR_ID || 'primary';

  // Tính ngày bắt đầu
  const eventStartDate = getNextDateForDayOfWeek(startDate || new Date(), dayOfWeek);
  const eventStart = new Date(`${eventStartDate}T${startTime}:00+07:00`);
  const eventEnd = new Date(`${eventStartDate}T${endTime}:00+07:00`);

  const event: any = {
    summary: `${className} - ${maLop}`,
    description: `Lớp học: ${className}\nMã lớp: ${maLop}\n${notes ? `Ghi chú: ${notes}` : ''}`,
    location: room || 'Online',
    start: {
      dateTime: eventStart.toISOString(),
      timeZone: 'Asia/Ho_Chi_Minh'
    },
    end: {
      dateTime: eventEnd.toISOString(),
      timeZone: 'Asia/Ho_Chi_Minh'
    },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  if (isRecurring) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    event.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${days[dayOfWeek]}`];
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Google Calendar API Error:', error);
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const createdEvent: any = await response.json();

  return {
    eventId: createdEvent.id,
    meetLink: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri || null,
    htmlLink: createdEvent.htmlLink
  };
}

/**
 * Legacy: Dùng GOOGLE_SERVICE_ACCOUNT_KEY format cũ
 */
async function createCalendarEventLegacy(env: any, eventData: any): Promise<any> {
  const serviceAccountKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY);

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${claimB64}`;

  const privateKey = await importPrivateKey(serviceAccountKey.private_key);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData: any = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const calendarId = env.GOOGLE_CALENDAR_ID || 'primary';

  const { className, maLop, startTime, endTime, dayOfWeek, room, notes, isRecurring, startDate } = eventData;
  const eventStartDate = getNextDateForDayOfWeek(startDate || new Date(), dayOfWeek);
  const eventStart = new Date(`${eventStartDate}T${startTime}:00+07:00`);
  const eventEnd = new Date(`${eventStartDate}T${endTime}:00+07:00`);

  const event: any = {
    summary: `${className} - ${maLop}`,
    description: `Lớp học: ${className}\nMã lớp: ${maLop}\n${notes ? `Ghi chú: ${notes}` : ''}`,
    location: room || 'Online',
    start: { dateTime: eventStart.toISOString(), timeZone: 'Asia/Ho_Chi_Minh' },
    end: { dateTime: eventEnd.toISOString(), timeZone: 'Asia/Ho_Chi_Minh' },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    },
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 30 }, { method: 'popup', minutes: 10 }]
    }
  };

  if (isRecurring) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    event.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${days[dayOfWeek]}`];
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const createdEvent: any = await response.json();
  return {
    eventId: createdEvent.id,
    meetLink: createdEvent.hangoutLink || createdEvent.conferenceData?.entryPoints?.[0]?.uri || null,
    htmlLink: createdEvent.htmlLink
  };
}

/**
 * Legacy: Update Calendar Event
 */
export async function updateCalendarEvent(env: Env & { GOOGLE_CALENDAR_ID?: string }, eventId: string, eventData: any): Promise<any> {
  const accessToken = await getAccessToken(env);
  const calendarId = env.GOOGLE_ADMIN_EMAIL || (env as any).GOOGLE_CALENDAR_ID || 'primary';

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update calendar event: ${error}`);
  }

  return await response.json();
}

/**
 * Legacy: Delete Calendar Event
 */
export async function deleteCalendarEvent(env: Env & { GOOGLE_CALENDAR_ID?: string }, eventId: string): Promise<boolean> {
  const accessToken = await getAccessToken(env);
  const calendarId = env.GOOGLE_ADMIN_EMAIL || (env as any).GOOGLE_CALENDAR_ID || 'primary';

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete calendar event: ${error}`);
  }

  return true;
}

/**
 * Helper: Lấy ngày tiếp theo của dayOfWeek
 */
function getNextDateForDayOfWeek(fromDate: Date | string, targetDayOfWeek: number): string {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDay + 7) % 7;
  date.setDate(date.getDate() + daysUntilTarget);
  return date.toISOString().split('T')[0];
}

// ========================================
// EXPORTS
// ========================================

export default {
  // New Online Classes functions
  createOnlineClassEvent,
  updateCalendarEventSafe,
  deleteOnlineClassEvent,

  // Legacy functions (for class-schedules)
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,

  // Utilities
  buildRRule,
  parseScheduleTime
};
