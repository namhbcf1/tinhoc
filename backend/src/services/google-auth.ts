/**
 * Shared Google Service Account authentication for Cloudflare Workers.
 * Generates JWT → exchanges for OAuth2 access token.
 *
 * Used by: google-calendar.ts, google-vision-ocr.ts
 */

import type { Env } from '../types/env.js';

// ── Base64URL helpers ────────────────────────────────────────────

function base64URLEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayBufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64URLEncode(binary);
}

// ── PEM key import ───────────────────────────────────────────────

export async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

// ── JWT generation ───────────────────────────────────────────────

async function generateJWT(
  clientEmail: string,
  privateKey: string,
  scopes: string[],
  impersonateEmail?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload: Record<string, unknown> = {
    iss: clientEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  // Domain-wide Delegation: only needed for Calendar (impersonate user)
  if (impersonateEmail) {
    payload.sub = impersonateEmail;
  }

  const encodedHeader = base64URLEncode(JSON.stringify(header));
  const encodedPayload = base64URLEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput),
  );

  return `${encodedHeader}.${encodedPayload}.${arrayBufferToBase64URL(signature)}`;
}

// ── Access token exchange ────────────────────────────────────────

/**
 * Get an OAuth2 access token for the given scopes using the
 * project's Google Service Account credentials.
 */
export async function getGoogleAccessToken(
  env: Env,
  scopes: string[],
  impersonateEmail?: string,
): Promise<string> {
  const jwt = await generateJWT(
    env.GOOGLE_CLIENT_EMAIL,
    env.GOOGLE_PRIVATE_KEY,
    scopes,
    impersonateEmail,
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google OAuth token error: ${error}`);
  }

  const data: any = await response.json();
  return data.access_token;
}
