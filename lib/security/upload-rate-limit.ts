import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

export const UPLOAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const UPLOAD_RATE_LIMIT_MAX = 8;

export class UploadRateLimitError extends Error {
  constructor(readonly code: "rate_limited" | "unavailable", readonly status: 429 | 503) {
    super(code);
    this.name = "UploadRateLimitError";
  }
}

export function normalizeClientIp(request: Request) {
  const candidate = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
  return isIP(candidate) ? candidate.toLowerCase() : "unknown";
}

type ExecuteRateLimit = (query: ReturnType<typeof sql>) => Promise<unknown>;

function resultCount(result: unknown) {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === "object" && "rows" in result
      ? (result as { rows: unknown[] }).rows
      : [];
  const count = Number((rows[0] as { count?: unknown } | undefined)?.count);
  return Number.isInteger(count) ? count : NaN;
}

export async function consumeUploadAllowance(
  input: { ownerId: string; request: Request },
  dependencies: { execute: ExecuteRateLimit } = { execute: (query) => getDb().execute(query) },
) {
  const secret = process.env.UPLOAD_RATE_LIMIT_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new UploadRateLimitError("unavailable", 503);

  const ip = normalizeClientIp(input.request);
  const key = createHmac("sha256", secret).update(`${input.ownerId}\0${ip}`).digest("hex");
  const windowStartedAt = new Date(Date.now() - UPLOAD_RATE_LIMIT_WINDOW_MS);

  try {
    const result = await dependencies.execute(sql`
      insert into upload_rate_limits (key, window_started_at, count, updated_at)
      values (${key}, now(), 1, now())
      on conflict (key) do update set
        window_started_at = case when upload_rate_limits.window_started_at <= ${windowStartedAt} then now() else upload_rate_limits.window_started_at end,
        count = case when upload_rate_limits.window_started_at <= ${windowStartedAt} then 1 else upload_rate_limits.count + 1 end,
        updated_at = now()
      returning count
    `);
    const count = resultCount(result);
    if (!Number.isInteger(count)) throw new Error("invalid limiter result");
    if (count > UPLOAD_RATE_LIMIT_MAX) throw new UploadRateLimitError("rate_limited", 429);
    return { count, ipHash: key };
  } catch (error) {
    if (error instanceof UploadRateLimitError) throw error;
    throw new UploadRateLimitError("unavailable", 503);
  }
}
