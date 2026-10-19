// Best-effort, per-instance fixed-window limiter. On serverless each instance
// keeps its own counters, so this slows abuse down rather than capping it hard;
// pair it with Vercel Firewall rules (or a shared store) for a strict limit.

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();
const MAX_TRACKED_KEYS = 5_000;

export type RateLimitRule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  article: { limit: 6, windowSeconds: 60 * 60 },
  idea: { limit: 20, windowSeconds: 60 * 60 },
  rewrite: { limit: 40, windowSeconds: 60 * 60 },
  cover: { limit: 15, windowSeconds: 60 * 60 },
  login: { limit: 8, windowSeconds: 15 * 60 },
  community: { limit: 4, windowSeconds: 24 * 60 * 60 },
  communityPublish: { limit: 2, windowSeconds: 24 * 60 * 60 },
} satisfies Record<string, RateLimitRule>;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns null when allowed, or a 429 response to send back. */
export function rateLimit(
  request: Request,
  scope: keyof typeof RATE_LIMITS
): Response | null {
  const rule = RATE_LIMITS[scope];
  const now = Date.now();
  const key = `${scope}:${clientIp(request)}`;

  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [storedKey, window] of buckets) {
      if (window.resetAt <= now) buckets.delete(storedKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return null;
  }

  current.count += 1;
  if (current.count <= rule.limit) return null;

  const retryAfter = Math.ceil((current.resetAt - now) / 1000);
  return new Response(
    `Has alcanzado el límite de uso. Vuelve a intentarlo en ${Math.ceil(retryAfter / 60)} min.`,
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "Content-Type": "text/plain; charset=utf-8" },
    }
  );
}
