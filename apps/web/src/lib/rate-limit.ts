import { readRuntimeConfig } from "@ai-swarm-qa/config";
import { createConnection } from "node:net";
import { connect as createTlsConnection } from "node:tls";

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
    { status: 429, headers: { "retry-after": String(Math.max(1, Math.ceil((error.resetAt.getTime() - Date.now()) / 1000))) } }
  );
}

export async function assertRateLimit(request: Request, scope: string, limit: number) {
  const config = readRuntimeConfig();
  if (!config.rateLimitEnabled) return;
  const key = `${scope}:${clientKey(request)}`;
  const redisKey = `aiswarmqa:rate-limit:${key}`;
  const redisResult = await incrementRedisBucket(config.redisUrl, redisKey, config.rateLimitWindowMs).catch(() => null);
  if (redisResult) {
    if (redisResult.count > limit) {
      throw new RateLimitError(limit, new Date(Date.now() + Math.max(redisResult.ttlMs, 1000)));
    }
    return;
  }

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

async function incrementRedisBucket(redisUrl: string, key: string, windowMs: number) {
  const url = new URL(redisUrl);
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") return null;
  const commands: string[][] = [];
  if (url.username || url.password) {
    commands.push(["AUTH", decodeURIComponent(url.username || "default"), decodeURIComponent(url.password)]);
  }
  commands.push(["INCR", key], ["PEXPIRE", key, String(windowMs), "NX"], ["PTTL", key]);
  const replies = await sendRedisCommands(url, commands);
  const count = Number(replies[commands.length - 3]);
  const ttlMs = Number(replies[commands.length - 1]);
  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) return null;
  return { count, ttlMs: ttlMs > 0 ? ttlMs : windowMs };
}

function sendRedisCommands(url: URL, commands: string[][]): Promise<Array<string | number>> {
  return new Promise((resolve, reject) => {
    const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379));
    const host = url.hostname;
    const socket = url.protocol === "rediss:" ? createTlsConnection({ host, port }) : createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    const replies: Array<string | number> = [];
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Redis rate limit request timed out."));
    }, 1500);

    socket.on("connect", () => {
      socket.write(commands.map(encodeRedisCommand).join(""));
    });
    socket.on("data", (chunk) => {
      try {
        const bytes = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
        buffer = Buffer.concat([buffer, bytes]);
        while (buffer.length > 0) {
          const parsed = parseRedisReply(buffer);
          if (!parsed) break;
          replies.push(parsed.value);
          buffer = buffer.subarray(parsed.offset);
        }
        if (replies.length >= commands.length) {
          clearTimeout(timeout);
          socket.end();
          resolve(replies);
        }
      } catch (error) {
        clearTimeout(timeout);
        socket.destroy();
        reject(error);
      }
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on("close", () => clearTimeout(timeout));
  });
}

function encodeRedisCommand(parts: string[]) {
  return `*${parts.length}\r\n${parts.map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`).join("")}`;
}

function parseRedisReply(buffer: Buffer): { value: string | number; offset: number } | null {
  const lineEnd = buffer.indexOf("\r\n");
  if (lineEnd < 0) return null;
  const prefix = String.fromCharCode(buffer[0] ?? 0);
  const line = buffer.subarray(1, lineEnd).toString("utf8");
  if (prefix === ":" || prefix === "+" || prefix === "-") {
    if (prefix === "-") throw new Error(`Redis error: ${line}`);
    return { value: prefix === ":" ? Number(line) : line, offset: lineEnd + 2 };
  }
  if (prefix === "$") {
    const length = Number(line);
    if (length < 0) return { value: "", offset: lineEnd + 2 };
    const end = lineEnd + 2 + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.subarray(lineEnd + 2, end).toString("utf8"), offset: end + 2 };
  }
  throw new Error("Unsupported Redis reply.");
}
