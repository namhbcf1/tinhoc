import { getApiBaseUrl } from './api-base-url.js';

export function resolveImageUrl(url) {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  if (url.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const accountHash = import.meta.env.VITE_CLOUDFLARE_IMAGES_ACCOUNT_HASH;
    if (accountHash) {
      return `https://imagedelivery.net/${accountHash}/${url}/public`;
    }
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const imagePath = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${imagePath}`;
}
