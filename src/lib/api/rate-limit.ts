interface RateLimitOptions {
  key: string;
  windowMs: number;
  limit: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

type BucketMap = Map<string, number[]>;

declare global {
  // eslint-disable-next-line no-var
  var __missionControlRateLimitBuckets: BucketMap | undefined;
}

const getBucketMap = (): BucketMap => {
  if (!globalThis.__missionControlRateLimitBuckets) {
    globalThis.__missionControlRateLimitBuckets = new Map();
  }

  return globalThis.__missionControlRateLimitBuckets;
};

export const rateLimit = ({ key, windowMs, limit }: RateLimitOptions): RateLimitResult => {
  const buckets = getBucketMap();
  const now = Date.now();
  const windowStart = now - windowMs;

  const entries = buckets.get(key) ?? [];
  const activeEntries = entries.filter((timestamp) => timestamp > windowStart);

  if (activeEntries.length >= limit) {
    const resetAt = activeEntries[0] + windowMs;
    buckets.set(key, activeEntries);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  activeEntries.push(now);
  buckets.set(key, activeEntries);

  return {
    allowed: true,
    remaining: Math.max(0, limit - activeEntries.length),
    resetAt: now + windowMs,
  };
};

