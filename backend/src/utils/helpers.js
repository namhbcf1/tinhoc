import bcrypt from 'bcryptjs';

// ========================================
// TEXT NORMALIZATION - Chuẩn hóa tên
// ========================================

/**
 * Bỏ dấu tiếng Việt
 */
export function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hóa tên để search/compare
 * "Nguyễn Văn A" → "nguyen van a"
 */
export function normalizeText(str) {
  return removeDiacritics(str.trim())
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Capitalize first letter of each word
 * "nguyễn văn a" → "Nguyễn Văn A"
 */
export function capitalizeFullName(ho, tenDem, ten) {
  const capitalize = (str) => {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const parts = [ho, tenDem, ten].filter(Boolean).map(capitalize);
  return parts.join(' ');
}

// ========================================
// PASSWORD HASHING
// ========================================

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ========================================
// JWT TOKEN (Simple implementation)
// ========================================

export async function generateJWT(payload, secret) {
  // Helper function to encode Unicode strings to base64
  const base64Encode = (str) => btoa(unescape(encodeURIComponent(str)));

  const header = base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Encode(JSON.stringify(payload));

  const encoder = new TextEncoder();
  const data = encoder.encode(`${header}.${body}`);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${header}.${body}.${signatureBase64}`;
}

export async function verifyJWT(token, secret) {
  try {
    // Helper function to decode base64 with Unicode support
    const base64Decode = (str) => decodeURIComponent(escape(atob(str)));

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;

    const encoder = new TextEncoder();
    const data = encoder.encode(`${header}.${body}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, data);

    if (!valid) return null;

    const payload = JSON.parse(base64Decode(body));

    // Check expiration - support both old (ms) and new (seconds) format
    if (payload.exp) {
      // Detect format: if exp > year 2100 in seconds (4102444800), it's milliseconds (old tokens)
      const expMs = payload.exp > 4102444800 ? payload.exp : payload.exp * 1000;
      if (expMs < Date.now()) {
        return null;
      }
    }

    return payload;
  } catch (error) {
    return null;
  }
}

// ========================================
// DATE HELPERS
// ========================================

export function formatDate(date) {
  if (!date) return null;

  try {
    // Nếu là định dạng dd/mm/yyyy
    if (typeof date === 'string' && date.includes('/')) {
      const parts = date.split('/');
      if (parts.length === 3) {
        let [day, month, year] = parts;
        // Ensure padding
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');

        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (isNaN(d.getTime())) {
          throw new Error(`Invalid date: ${date}`);
        }
        return `${year}-${month}-${day}`;
      }
    }

    // Nếu là Date object hoặc ISO string
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date: ${date}`);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    throw new Error(`Date format error: ${error.message}`);
  }
}

export function isDateInRange(checkDate, startDate, endDate) {
  const check = new Date(checkDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return check >= start && check <= end;
}

// ========================================
// RESPONSE HELPERS
// ========================================

export function jsonResponse(data, status = 200) {
  // Do NOT set Access-Control-Allow-Origin here.
  // CORS is enforced by the Hono cors() middleware in index.js (origin whitelist).
  // Hardcoding '*' here would bypass the whitelist for all origins.
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function successResponse(data, status = 200) {
  return jsonResponse({ success: true, data }, status);
}
