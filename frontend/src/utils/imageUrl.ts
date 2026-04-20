import { getApiBaseUrl } from './api-base-url.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ABSOLUTE_PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildStudentsImagePath(rawKey: string) {
  const decodedKey = safeDecodeURIComponent(rawKey).trim();
  if (!decodedKey) {
    return null;
  }
  return `/students/image/${encodeURIComponent(decodedKey)}`;
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pickInitials(name: string) {
  const tokens = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return 'HV';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] || ''}${tokens[tokens.length - 1][0] || ''}`.toUpperCase();
}

export function buildInitialsAvatarDataUrl(name = '') {
  const initials = escapeSvgText(pickInitials(name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#bfdbfe"/></linearGradient></defs><rect width="120" height="150" fill="url(#g)"/><text x="60" y="82" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1e3a8a">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function applyImageFallback(event: { currentTarget: HTMLImageElement }, name = '') {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === '1') return;
  target.dataset.fallbackApplied = '1';
  target.src = buildInitialsAvatarDataUrl(name);
}

export function resolveImageUrl(url) {
  const raw = typeof url === 'string' ? url.trim() : '';
  if (!raw) return null;

  if (
    ABSOLUTE_PROTOCOL_RE.test(raw) ||
    raw.startsWith('//')
  ) {
    return raw;
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');

  if (raw.startsWith('/students/image/')) {
    const key = raw.slice('/students/image/'.length);
    const normalizedPath = buildStudentsImagePath(key) || '/students/image/';
    return `${baseUrl}${normalizedPath}`;
  }

  if (raw.startsWith('students/image/')) {
    const key = raw.slice('students/image/'.length);
    const normalizedPath = buildStudentsImagePath(key) || '/students/image/';
    return `${baseUrl}${normalizedPath}`;
  }

  if (raw.startsWith('/')) {
    return `${baseUrl}${raw}`;
  }

  if (UUID_RE.test(raw)) {
    const accountHash =
      import.meta.env.VITE_CLOUDFLARE_IMAGES_ACCOUNT_HASH ||
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_HASH ||
      import.meta.env.VITE_CF_IMAGES_ACCOUNT_HASH;
    if (accountHash) {
      return `https://imagedelivery.net/${accountHash}/${raw}/public`;
    }
    return `${baseUrl}${buildStudentsImagePath(raw) || ''}`;
  }

  if (raw.includes('/') || raw.includes('%2F') || raw.includes('%2f')) {
    const normalizedPath = buildStudentsImagePath(raw);
    if (normalizedPath) return `${baseUrl}${normalizedPath}`;
  }

  const imagePath = `/${raw}`;
  return `${baseUrl}${imagePath}`;
}
