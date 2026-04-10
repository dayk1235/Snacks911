const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 12;

export const ADMIN_SESSION_COOKIE = 'snacks911_admin_session';

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'change-me-in-env';
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(input: string) {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(input: string) {
  return bytesToBase64(new TextEncoder().encode(input))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return new TextDecoder().decode(base64ToBytes(normalized + padding));
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  );

  return bytesToBase64(new Uint8Array(signature))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export async function createAdminSessionToken(username: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const payload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await signValue(payloadEncoded);
  return `${payloadEncoded}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) return null;

  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) return null;

  const expected = await signValue(payloadEncoded);
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded)) as { u?: string; exp?: number };
    if (!payload.u || !payload.exp) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'snacks911',
  };
}
