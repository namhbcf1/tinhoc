import { describe, expect, it } from 'vitest';
import app from '../../index.js';
function buildEnv(readOnlyMode) {
    return {
        READ_ONLY_MODE: readOnlyMode,
    };
}
describe('read-only mode middleware', () => {
    it('blocks mutating requests when read-only mode is enabled', async () => {
        const res = await app.fetch(new Request('http://localhost/__read-only-probe', { method: 'POST' }), buildEnv('true'));
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain('read-only');
    });
    it('allows GET requests while read-only mode is enabled', async () => {
        const res = await app.fetch(new Request('http://localhost/', { method: 'GET' }), buildEnv('true'));
        expect(res.status).toBe(200);
    });
    it('does not force 503 for mutating requests when read-only mode is disabled', async () => {
        const res = await app.fetch(new Request('http://localhost/__read-only-probe', { method: 'POST' }), buildEnv('false'));
        expect(res.status).toBe(404);
    });
});
