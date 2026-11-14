import { errorResponse } from '../utils/response.js';

/**
 * Distributed Sliding-Window Rate Limiter (Cloudflare D1 + Native Rate Limiting Binding)
 *
 * Production Order of Precedence:
 *   1. Cloudflare Native Rate Limiting binding (`env.RATE_LIMITER.limit({ key })`), if bound.
 *   2. Cloudflare D1 Distributed `rate_limits` table (`env.DB`), shared across all Worker isolates.
 *   3. Local in-memory Map fallback (used only when `env.DB` is unavailable).
 */

const memoryBuckets = new Map();
const initializedDbs = new WeakSet();

export const RATE_LIMIT_POLICIES = {
  authLogin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  publicSubmission: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 25,
    message: 'Submission rate limit exceeded. Please wait a few minutes before submitting again.',
  },
  generalApi: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 240,
    message: 'Too many requests. Please slow down.',
  },
};

export function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('X-Real-IP') ||
    '127.0.0.1'
  );
}

async function ensureRateLimitsTable(db) {
  if (!db || initializedDbs.has(db)) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS rate_limits (
         rate_key TEXT PRIMARY KEY,
         window_start INTEGER NOT NULL,
         request_count INTEGER NOT NULL DEFAULT 1,
         expires_at INTEGER NOT NULL
       )`
    )
    .run();
  initializedDbs.add(db);
}

function buildRateLimitResponse(policy, resetSeconds) {
  return {
    allowed: false,
    response: errorResponse(
      policy.message,
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfterSeconds: resetSeconds },
      {
        'Retry-After': String(resetSeconds),
        'X-RateLimit-Limit': String(policy.maxRequests),
        'X-RateLimit-Remaining': '0',
      }
    ),
  };
}

export async function checkRateLimit(
  request,
  policyName = 'generalApi',
  env = null,
  customKeySuffix = ''
) {
  const policy = RATE_LIMIT_POLICIES[policyName] || RATE_LIMIT_POLICIES.generalApi;
  const ip = getClientIp(request);
  const key = `${policyName}:${ip}${customKeySuffix ? `:${customKeySuffix}` : ''}`;
  const now = Date.now();

  // 1. Optional Cloudflare Native Rate Limiting Binding
  if (env?.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
    const outcome = await env.RATE_LIMITER.limit({ key });
    if (outcome && outcome.success === false) {
      const resetSeconds = Math.ceil(policy.windowMs / 1000);
      return buildRateLimitResponse(policy, resetSeconds);
    }
  }

  // 2. Distributed Cloudflare D1 Rate Limiting across Worker isolates
  if (env?.DB) {
    try {
      await ensureRateLimitsTable(env.DB);
      const expiresAt = now + policy.windowMs;

      // Probabilistic pruning of expired rows (~2% of requests)
      if (Math.random() < 0.02) {
        await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at <= ?')
          .bind(now)
          .run()
          .catch(() => {});
      }

      const existing = await env.DB.prepare(
        'SELECT window_start, request_count, expires_at FROM rate_limits WHERE rate_key = ?'
      )
        .bind(key)
        .first();

      let windowStart = now;
      let count = 1;

      if (!existing || Number(existing.expires_at) <= now) {
        await env.DB.prepare(
          `INSERT INTO rate_limits (rate_key, window_start, request_count, expires_at)
           VALUES (?, ?, 1, ?)
           ON CONFLICT(rate_key) DO UPDATE SET
             window_start = excluded.window_start,
             request_count = 1,
             expires_at = excluded.expires_at`
        )
          .bind(key, now, expiresAt)
          .run();
      } else {
        windowStart = Number(existing.window_start);
        count = Number(existing.request_count) + 1;
        await env.DB.prepare(
          'UPDATE rate_limits SET request_count = ? WHERE rate_key = ?'
        )
          .bind(count, key)
          .run();
      }

      const remaining = Math.max(0, policy.maxRequests - count);
      const resetSeconds = Math.max(1, Math.ceil((windowStart + policy.windowMs - now) / 1000));

      if (count > policy.maxRequests) {
        return buildRateLimitResponse(policy, resetSeconds);
      }

      return {
        allowed: true,
        headers: {
          'X-RateLimit-Limit': String(policy.maxRequests),
          'X-RateLimit-Remaining': String(remaining),
        },
      };
    } catch {
      // Fall through to in-memory limiter if D1 is temporarily unavailable
    }
  }

  // 3. In-memory fallback
  let record = memoryBuckets.get(key);
  if (!record || now - record.windowStart >= policy.windowMs) {
    record = { windowStart: now, count: 0 };
  }

  record.count += 1;
  memoryBuckets.set(key, record);

  if (memoryBuckets.size > 5000) {
    for (const [k, v] of memoryBuckets.entries()) {
      if (now - v.windowStart > 30 * 60 * 1000) {
        memoryBuckets.delete(k);
      }
    }
  }

  const remaining = Math.max(0, policy.maxRequests - record.count);
  const resetSeconds = Math.max(1, Math.ceil((record.windowStart + policy.windowMs - now) / 1000));

  if (record.count > policy.maxRequests) {
    return buildRateLimitResponse(policy, resetSeconds);
  }

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': String(policy.maxRequests),
      'X-RateLimit-Remaining': String(remaining),
    },
  };
}

export async function resetRateLimiter(env = null) {
  memoryBuckets.clear();
  if (env?.DB) {
    try {
      await env.DB.prepare('DELETE FROM rate_limits').run();
    } catch {
      // Ignore if table not yet created
    }
  }
}
