import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";

export class LoginRateLimitError extends Error {
  constructor(readonly code: "rate_limited" | "unavailable") { super(code); }
}

// One owner, one shared budget. Neither rotating IPs nor forged headers reset it.
// Reuse the existing atomic counter table, with a separate namespace.
export async function consumeLoginAllowance(
  execute: (query: ReturnType<typeof sql>) => Promise<unknown> = (query) => getDb().execute(query),
) {
  try {
    const result = await execute(sql`
      insert into upload_rate_limits (key, window_started_at, count, updated_at)
      values ('auth:owner-login:v1', now(), 1, now())
      on conflict (key) do update set
        window_started_at = case when upload_rate_limits.window_started_at <= now() - interval '15 minutes' then now() else upload_rate_limits.window_started_at end,
        count = case when upload_rate_limits.window_started_at <= now() - interval '15 minutes' then 1 else least(upload_rate_limits.count + 1, 21) end,
        updated_at = now()
      returning count
    `);
    const rows = Array.isArray(result) ? result : (result as { rows?: unknown[] })?.rows;
    const count = Number((rows?.[0] as { count?: unknown })?.count);
    if (!Number.isInteger(count) || count < 1) throw new Error("invalid counter");
    if (count > 20) throw new LoginRateLimitError("rate_limited");
  } catch (error) {
    if (error instanceof LoginRateLimitError) throw error;
    throw new LoginRateLimitError("unavailable");
  }
}
