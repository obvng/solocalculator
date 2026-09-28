import { describe, expect, it } from "vitest";
import { hashSessionToken, isSessionExpired } from "./session";

describe("owner sessions", () => {
  it("hashes a session token without returning the token", () => {
    const digest = hashSessionToken("private-session-token");

    expect(digest).toHaveLength(64);
    expect(digest).not.toContain("private-session-token");
    expect(hashSessionToken("private-session-token")).toBe(digest);
  });

  it("rejects a session at or after its expiry", () => {
    const expiry = new Date("2026-09-28T12:00:00.000Z");

    expect(isSessionExpired(expiry, new Date("2026-09-28T11:59:59.000Z"))).toBe(false);
    expect(isSessionExpired(expiry, new Date("2026-09-28T12:00:00.000Z"))).toBe(true);
  });
});
