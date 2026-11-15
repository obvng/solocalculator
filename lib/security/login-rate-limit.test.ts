import { describe, expect, it, vi } from "vitest";
import { consumeLoginAllowance } from "./login-rate-limit";

describe("persistent login budget", () => {
  it.each([1, 20])("allows attempt %s", async (count) => {
    const execute = vi.fn(async () => [{ count }]);
    await expect(consumeLoginAllowance(execute)).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledOnce();
  });
  it("rejects attempts beyond the shared budget", async () => {
    await expect(consumeLoginAllowance(async () => [{ count: 21 }])).rejects.toMatchObject({ code: "rate_limited" });
  });
  it.each([{ result: [] }, { result: [{ count: -1 }] }, { result: [{ count: "invalid" }] }])("fails closed for invalid counters", async ({ result }) => {
    await expect(consumeLoginAllowance(async () => result)).rejects.toMatchObject({ code: "unavailable" });
  });
  it("fails closed without leaking database errors", async () => {
    await expect(consumeLoginAllowance(async () => { throw new Error("secret"); })).rejects.toThrow("unavailable");
  });
});
