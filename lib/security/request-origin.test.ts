import { afterEach, describe, expect, it } from "vitest";
import { assertTrustedOrigin, RequestSecurityError } from "./request-origin";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function request(origin?: string, url = "https://preview.example/admin") {
  const headers = new Headers({ "Sec-Fetch-Site": "same-origin" });
  if (origin !== undefined) headers.set("Origin", origin);
  return new Request(url, { method: "POST", headers });
}

describe("assertTrustedOrigin", () => {
  it.each(["https://www.solocalculator.com", "https://solocalculator.com"])(
    "accepts the production origin %s",
    (origin) => expect(() => assertTrustedOrigin(request(origin), { nodeEnv: "production" })).not.toThrow(),
  );

  it("accepts the exact request origin and configured Vercel preview hosts outside production", () => {
    expect(() => assertTrustedOrigin(request("https://preview.example"), { nodeEnv: "development" })).not.toThrow();
    expect(() => assertTrustedOrigin(request("https://branch.example.vercel.app"), {
      nodeEnv: "development",
      vercelUrl: "branch.example.vercel.app",
    })).not.toThrow();
  });

  it.each(["https://evil.example", "null", "not a URL", "https://www.solocalculator.com.evil.example"])(
    "rejects the untrusted origin %s",
    (origin) => expect(() => assertTrustedOrigin(request(origin), { nodeEnv: "production" })).toThrow(RequestSecurityError),
  );

  it("rejects a state-changing request without an Origin header", () => {
    expect(() => assertTrustedOrigin(request(undefined), { nodeEnv: "production" })).toThrowError(
      expect.objectContaining({ status: 403, publicMessage: "Request origin was rejected." }),
    );
  });
});
