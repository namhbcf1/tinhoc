/**
 * Utilities for Google Calendar Service
 */

/**
 * Base64URL encode (no padding)
 */
export function base64URLEncode(str) {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert ArrayBuffer to Base64URL
 */
export function arrayBufferToBase64URL(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64URLEncode(binary);
}

/**
 * Build RRULE from schedule_rule
 * @param {string} scheduleRule - e.g. "WEEKLY:1,3,5"
 * @param {string} endDate - e.g. "2026-12-31"
 */
export function buildRRule(scheduleRule, endDate) {
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
    const dayMap = {
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

  return null;
}

/**
 * Parse schedule_time to start/end times
 * @param {string} scheduleTime - e.g. "19:00-21:00"
 * @param {string} startDate - e.g. "2026-01-22"
 * @param {string} timezone - e.g. "Asia/Ho_Chi_Minh"
 */
export function parseScheduleTime(scheduleTime, startDate, timezone) {
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

/**
 * Helper: Get next date for a specific dayOfWeek
 */
export function getNextDateForDayOfWeek(fromDate, targetDayOfWeek) {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDay + 7) % 7;
  date.setDate(date.getDate() + daysUntilTarget);
  return date.toISOString().split('T')[0];
}