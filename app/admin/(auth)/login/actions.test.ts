import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ allowance: vi.fn(), db: vi.fn(), verify: vi.fn(), session: vi.fn(), allowed: vi.fn() }));
vi.mock("@/lib/security/login-rate-limit", async (original) => ({ ...await original<object>(), consumeLoginAllowance: mocks.allowance }));
vi.mock("@/lib/auth/owner", () => ({ isAllowedOwner: mocks.allowed }));
vi.mock("@/lib/auth/password", () => ({ verifyOwnerPassword: mocks.verify }));
vi.mock("@/lib/auth/session", () => ({ createOwnerSession: mocks.session }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { login } from "./actions";
import { LoginRateLimitError } from "@/lib/security/login-rate-limit";
const form = (email = "owner@example.com", password = "password") => { const data = new FormData(); data.set("email", email); data.set("password", password); return data; };
describe("login action security", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.allowed.mockReturnValue(true); });
  it.each(["rate_limited", "unavailable"] as const)("blocks %s before password work or session creation", async (code) => {
    mocks.allowance.mockRejectedValue(new LoginRateLimitError(code));
    await expect(login(form())).rejects.toThrow(`error=${code}`);
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("rejects oversized passwords before expensive work", async () => {
    await expect(login(form("owner@example.com", "x".repeat(1025)))).rejects.toThrow("error=credentials");
    expect(mocks.allowance).not.toHaveBeenCalled();
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("rejects a lookalike email with the same public credential error", async () => {
    mocks.allowed.mockReturnValue(false);
    await expect(login(form("оwner@example.com"))).rejects.toThrow("error=credentials");
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("creates a session only after the shared budget and valid password", async () => {
    const limit = vi.fn(async () => [{ id: "owner", passwordHash: "hash" }]);
    mocks.db.mockReturnValue({ select: () => ({ from: () => ({ where: () => ({ limit }) }) }) });
    mocks.verify.mockResolvedValue(true);
    await expect(login(form())).rejects.toThrow("redirect:/admin");
    expect(mocks.allowance).toHaveBeenCalledOnce();
    expect(mocks.session).toHaveBeenCalledWith("owner");
    expect(mocks.allowance.mock.invocationCallOrder[0]).toBeLessThan(mocks.verify.mock.invocationCallOrder[0]);
  });
});
