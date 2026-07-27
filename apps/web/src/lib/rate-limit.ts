import { readRuntimeConfig } from "@ai-swarm-qa/config";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(
    readonly limit: number,
    readonly resetAt: Date
  ) {
    super("Rate limit exceeded.");
    this.name = "RateLimitError";
  }
}

export function rateLimitResponse(error: unknown) {
  if (!(error instanceof RateLimitError)) return null;
  return Response.json(
    {
      error: {
        code: "RATE_LIMIT_REACHED",
        message: "Too many requests. Please try again after the rate limit resets.",
        limit: error.limit,
        resetAt: error.resetAt.toISOString()
      }
    },
    { status: 429 }
  );
}

export function assertRateLimit(request: Request, scope: string, limit: number) {
  const config = readRuntimeConfig();
  if (!config.rateLimitEnabled) return;
  const key = `${scope}:${clientKey(request)}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.rateLimitWindowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > limit) {
    throw new RateLimitError(limit, new Date(existing.resetAt));
  }
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const actor = request.headers.get("authorization")?.slice(0, 24);
  return forwarded || actor || "anonymous";
}
