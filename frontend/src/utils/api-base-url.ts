const DEFAULT_API_BASE_URL = '/api';

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

export function buildApiUrl(path = '') {
  if (!path) return getApiBaseUrl();
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}
