import { describe, expect, it } from "vitest";
import { hashOwnerPassword, verifyOwnerPassword } from "./password";

describe("owner password", () => {
  it("accepts the right password and rejects the wrong one", async () => {
    const hash = await hashOwnerPassword("test-password");

    expect(await verifyOwnerPassword(hash, "test-password")).toBe(true);
    expect(await verifyOwnerPassword(hash, "wrong-password")).toBe(false);
  });
});
