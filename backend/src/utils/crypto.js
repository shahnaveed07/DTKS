/**
 * Cryptographic utilities for DTKS Backend (Cloudflare Workers + Node.js compatible)
 *
 * Password Hashing Algorithm:
 *   - Uses Web Crypto API `PBKDF2` with `HMAC-SHA-512` (100,000 iterations, 16-byte CSPRNG salt, 32-byte key),
 *     serialized in the canonical PHC string format:
 *       `$pbkdf2-sha512$v=1$i=100000$<saltHex>$<hashHex>`
 *   - Includes a transparent migration verifier for legacy `$argon2id$v=19$...` hashes created by
 *     earlier versions of the repository, flagging `needsRehash: true` so existing administrator
 *     credentials are automatically upgraded to `$pbkdf2-sha512$v=1$...` upon login.
 */

const encoder = new TextEncoder();

export const PBKDF2_DEFAULT_ITERATIONS = 100000;
export const PBKDF2_SALT_BYTES = 16;
export const PBKDF2_KEY_BITS = 256;

function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const clean = String(hex).trim();
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) return new Uint8Array(0);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

function base64UrlEncode(input) {
  const bytes = typeof input === 'string' ? encoder.encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(str) {
  const padded = String(str)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(String(str).length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(str) {
  return new TextDecoder().decode(base64UrlDecodeToBytes(str));
}

export function timingSafeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function generateRandomId(prefix = 'id') {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}-${toHex(bytes)}`;
}

export function generateRandomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function sha256Hex(value) {
  const data = encoder.encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

async function derivePbkdf2Sha512Bytes(password, saltBytes, iterations = PBKDF2_DEFAULT_ITERATIONS) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-512',
    },
    keyMaterial,
    PBKDF2_KEY_BITS
  );
  return new Uint8Array(bits);
}

/**
 * Hashes a plaintext password using WebCrypto PBKDF2-HMAC-SHA512 (100,000 iterations,
 * 16-byte CSPRNG salt, 32-byte derived key) in canonical PHC format:
 *   `$pbkdf2-sha512$v=1$i=100000$<saltHex>$<hashHex>`
 */
export async function hashPassword(password, iterations = PBKDF2_DEFAULT_ITERATIONS) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const safeIterations = Math.max(10000, Math.min(100000, Number(iterations) || PBKDF2_DEFAULT_ITERATIONS));
  const salt = new Uint8Array(PBKDF2_SALT_BYTES);
  crypto.getRandomValues(salt);
  const derived = await derivePbkdf2Sha512Bytes(password, salt, safeIterations);
  return `$pbkdf2-sha512$v=1$i=${safeIterations}$${toHex(salt)}$${toHex(derived)}`;
}

/**
 * Verifies a plaintext password against a stored hash and indicates whether the stored hash
 * should be migrated to the current `$pbkdf2-sha512$v=1$i=100000$...` format.
 *
 * Supports:
 *   1. Canonical `$pbkdf2-sha512$v=1$i=<iterations>$<saltHex>$<hashHex>`
 *   2. Legacy `$argon2id$v=19$m=65536,t=<iterations>,p=4$<saltHex>$<hashHex>` (marks `needsRehash: true`)
 */
export async function verifyPasswordWithMigration(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') {
    return { valid: false, needsRehash: false };
  }

  const parts = storedHash.split('$').filter(Boolean);
  if (parts.length !== 5) {
    return { valid: false, needsRehash: false };
  }

  const [scheme, , paramsPart, saltHex, hashHex] = parts;
  const saltBytes = fromHex(saltHex);
  const expectedBytes = fromHex(hashHex);
  if (saltBytes.length === 0 || expectedBytes.length === 0) {
    return { valid: false, needsRehash: false };
  }

  // 1. Canonical PBKDF2-SHA512 format: $pbkdf2-sha512$v=1$i=100000$<saltHex>$<hashHex>
  if (scheme === 'pbkdf2-sha512') {
    const iMatch = /i=(\d+)/.exec(paramsPart);
    const iterations = iMatch ? Number.parseInt(iMatch[1], 10) : PBKDF2_DEFAULT_ITERATIONS;
    if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 500000) {
      return { valid: false, needsRehash: false };
    }
    const candidateBytes = await derivePbkdf2Sha512Bytes(password, saltBytes, iterations);
    const valid = timingSafeEqualBytes(candidateBytes, expectedBytes);
    return {
      valid,
      needsRehash: valid && iterations < PBKDF2_DEFAULT_ITERATIONS,
    };
  }

  // 2. Legacy mislabeled format from earlier repo commits: $argon2id$v=19$m=65536,t=100000,p=4$<saltHex>$<hashHex>
  if (scheme === 'argon2id') {
    const tMatch = /t=(\d+)/.exec(paramsPart);
    const iterations = tMatch ? Number.parseInt(tMatch[1], 10) : PBKDF2_DEFAULT_ITERATIONS;
    if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 500000) {
      return { valid: false, needsRehash: false };
    }
    const candidateBytes = await derivePbkdf2Sha512Bytes(password, saltBytes, iterations);
    const valid = timingSafeEqualBytes(candidateBytes, expectedBytes);
    return {
      valid,
      needsRehash: valid, // Always upgrade legacy hashes on successful verification
    };
  }

  return { valid: false, needsRehash: false };
}

/**
 * Boolean password verification wrapper.
 */
export async function verifyPassword(password, storedHash) {
  const result = await verifyPasswordWithMigration(password, storedHash);
  return result.valid;
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Signs a JWT payload using HS256.
 */
export async function signJwt(payload, secret, expiresInSeconds = 900) {
  if (!secret || String(secret).length < 16) {
    throw new Error('JWT secret must be configured and at least 16 characters.');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + Number(expiresInSeconds),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Verifies an HS256 JWT token and returns the decoded payload or throws an error.
 */
export async function verifyJwt(token, secret) {
  if (!secret || String(secret).length < 16) {
    const err = new Error('JWT secret is not properly configured.');
    err.code = 'SERVER_MISCONFIGURED';
    throw err;
  }
  if (typeof token !== 'string' || !token.includes('.')) {
    const err = new Error('Invalid authentication token format.');
    err.code = 'INVALID_TOKEN';
    throw err;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    const err = new Error('Malformed JWT token.');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header;
  try {
    header = JSON.parse(base64UrlDecodeToString(encodedHeader));
  } catch {
    const err = new Error('Malformed JWT header.');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  if (!header || header.alg !== 'HS256') {
    const err = new Error('Unsupported JWT algorithm.');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await importHmacKey(secret);
  const sigBytes = base64UrlDecodeToBytes(encodedSignature);
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    encoder.encode(signingInput)
  );

  if (!isValid) {
    const err = new Error('Invalid token signature.');
    err.code = 'INVALID_SIGNATURE';
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  } catch {
    const err = new Error('Invalid token payload.');
    err.code = 'INVALID_PAYLOAD';
    throw err;
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    const err = new Error('Authentication token has expired.');
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  return payload;
}
