import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeUploadAllowance, normalizeClientIp, UploadRateLimitError } from "./upload-rate-limit";

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

function uploadRequest(headers: Record<string, string> = {}) {
  return new Request("https://www.solocalculator.com/api/admin/media", { method: "POST", headers });
}

describe("upload rate limiting", () => {
  it("normalizes the first forwarded IPv4 or IPv6 address", () => {
    expect(normalizeClientIp(uploadRequest({ "x-forwarded-for": " 203.0.113.7, 198.51.100.2" }))).toBe("203.0.113.7");
    expect(normalizeClientIp(uploadRequest({ "x-forwarded-for": "2001:db8::1, forged-value" }))).toBe("2001:db8::1");
    expect(normalizeClientIp(uploadRequest({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it.each([1, 8])("allows atomic counter result %s", async (count) => {
    process.env.UPLOAD_RATE_LIMIT_SECRET = "s".repeat(32);
    const execute = vi.fn(async () => [{ count }]);
    await expect(consumeUploadAllowance({ ownerId: "owner-1", request: uploadRequest() }, { execute })).resolves.toMatchObject({ count });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(execute.mock.calls)).not.toContain("203.0.113");
  });

  it("denies the ninth attempt", async () => {
    process.env.UPLOAD_RATE_LIMIT_SECRET = "s".repeat(32);
    await expect(consumeUploadAllowance(
      { ownerId: "owner-1", request: uploadRequest({ "x-forwarded-for": "203.0.113.7" }) },
      { execute: vi.fn(async () => [{ count: 9 }]) },
    )).rejects.toMatchObject({ code: "rate_limited", status: 429 });
  });

  it.each([undefined, "short"])("fails closed when the limiter secret is %s", async (secret) => {
    if (secret === undefined) delete process.env.UPLOAD_RATE_LIMIT_SECRET;
    else process.env.UPLOAD_RATE_LIMIT_SECRET = secret;
    delete process.env.SESSION_SECRET;
    await expect(consumeUploadAllowance(
      { ownerId: "owner-1", request: uploadRequest() },
      { execute: vi.fn() },
    )).rejects.toBeInstanceOf(UploadRateLimitError);
  });

  it("fails closed when Neon cannot update the counter", async () => {
    process.env.UPLOAD_RATE_LIMIT_SECRET = "s".repeat(32);
    await expect(consumeUploadAllowance(
      { ownerId: "owner-1", request: uploadRequest() },
      { execute: vi.fn(async () => { throw new Error("database URL leaked"); }) },
    )).rejects.toMatchObject({ code: "unavailable", status: 503 });
  });
});
