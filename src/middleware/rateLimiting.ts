import { Context, Next } from "hono";

interface RateLimitConfig {
  windowMs: number; 
  maxRequests: number; 
  keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, 
  maxRequests: 100,
  keyPrefix: "ratelimit:",
};

function getClientIp(c: Context): string {
  const cfConnectingIp = c.req.header("CF-Connecting-IP");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const xForwardedFor = c.req.header("X-Forwarded-For");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

export function rateLimiting(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next) => {
    const clientIp = getClientIp(c);
    const now = Date.now();

    let record = requestCounts.get(clientIp);

    if (!record) {
      record = {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      };
      requestCounts.set(clientIp, record);
    } else if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + finalConfig.windowMs;
    } else {
      record.count++;
    }

    const remaining = Math.max(0, finalConfig.maxRequests - record.count);
    const resetTime = Math.ceil(record.resetTime / 1000);

    c.res.headers.append("X-RateLimit-Limit", String(finalConfig.maxRequests));
    c.res.headers.append("X-RateLimit-Remaining", String(remaining));
    c.res.headers.append("X-RateLimit-Reset", String(resetTime));

    if (record.count > finalConfig.maxRequests) {
      return c.json(
        {
          error: {
            message: "Too many requests, please try again later",
            code: "RATE_LIMIT_EXCEEDED",
          },
        },
        429,
      );
    }

    if (Math.random() < 0.01) {
      for (const [ip, data] of requestCounts.entries()) {
        if (now > data.resetTime) {
          requestCounts.delete(ip);
        }
      }
    }

    await next();
  };
}

export function authRateLimiting() {
  return rateLimiting({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  });
}

export function publicRateLimiting() {
  return rateLimiting({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  });
}

export function apiRateLimiting() {
  return rateLimiting({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  });
}
