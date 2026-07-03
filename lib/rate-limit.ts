import 'server-only';

// Fixed-window in-memory rate limiter. State is per server instance, so this
// is an abuse speed bump (bursts, naive scripts) rather than a hard global
// cap — the right tradeoff until there's shared infrastructure for limits.
type RateWindow = { count: number; resetAt: number };

const windows = new Map<string, RateWindow>();

function sweep(now: number) {
  if (windows.size <= 10_000) {
    return;
  }

  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) {
      windows.delete(key);
    }
  }
}

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    sweep(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  current.count += 1;

  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
  };
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');

  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}
