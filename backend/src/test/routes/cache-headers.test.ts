import { describe, expect, it } from 'vitest';
import { resolveDefaultCacheControl } from '../../index.js';

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { method: 'GET', headers });
}

describe('default cache-control policy', () => {
  it('keeps public caching for anonymous public GET endpoints', () => {
    const policy = resolveDefaultCacheControl(
      makeRequest('https://vantrangedu-api.example.com/posts'),
      false,
    );

    expect(policy).toBe('public, max-age=120, s-maxage=300, stale-while-revalidate=600');
  });

  it('disables caching for authenticated student profile GET endpoints', () => {
    const policy = resolveDefaultCacheControl(
      makeRequest('https://vantrangedu-api.example.com/students/012345678901', {
        Authorization: 'Bearer token',
      }),
      false,
    );

    expect(policy).toBe('private, no-store, max-age=0, must-revalidate');
  });

  it('does not override route-specific cache headers', () => {
    const policy = resolveDefaultCacheControl(
      makeRequest('https://vantrangedu-api.example.com/reports/summary'),
      true,
    );

    expect(policy).toBeNull();
  });
});
