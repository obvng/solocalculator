import { afterEach, describe, expect, it, vi } from "vitest";
const sessionMocks = vi.hoisted(() => ({ values: vi.fn(), set: vi.fn(), get: vi.fn(), returning: vi.fn(), update: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: sessionMocks.set, get: sessionMocks.get }) }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ({ insert: () => ({ values: sessionMocks.values }), update: sessionMocks.update }) }));
import { createOwnerSession, extendOwnerSession, hashSessionToken, isSessionExpired, ownerCookieOptions } from "./session";
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("owner sessions", () => {
  it("extends the current valid session and cookie together", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
    sessionMocks.get.mockReturnValue({ value: "A".repeat(43) });
    const set = vi.fn(() => ({ where: () => ({ returning: sessionMocks.returning }) }));
    sessionMocks.update.mockReturnValue({ set });
    sessionMocks.returning.mockResolvedValue([{ id: "session" }]);
    const expiry = await extendOwnerSession("owner");
    expect(expiry.getTime() - Date.now()).toBe(90 * 24 * 60 * 60 * 1000);
    expect(set).toHaveBeenCalledWith({ expiresAt: expiry });
    expect(sessionMocks.set).toHaveBeenCalledWith(expect.any(String), "A".repeat(43), expect.objectContaining({ expires: expiry }));
  });
  it("does not set a longer cookie when no valid database session is updated", async () => {
    sessionMocks.get.mockReturnValue({ value: "A".repeat(43) });
    sessionMocks.update.mockReturnValue({ set: () => ({ where: () => ({ returning: async () => [] }) }) });
    await expect(extendOwnerSession("owner")).rejects.toThrow("Session could not be renewed");
    expect(sessionMocks.set).not.toHaveBeenCalled();
  });
  it("gives the database session and browser cookie the same 90-day expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));
    await createOwnerSession("owner");
    const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    expect(sessionMocks.values).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: expires }));
    expect(sessionMocks.set).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/^[A-Za-z0-9_-]{43}$/), expect.objectContaining({ expires }));
  });
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

  it("uses a strict, HttpOnly owner cookie", () => {
    const expires = new Date("2026-10-07T12:00:00.000Z");
    expect(ownerCookieOptions(expires, "production")).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      expires,
    });
    expect(ownerCookieOptions(expires, "development")).toMatchObject({ secure: false, sameSite: "strict" });
  });
});
