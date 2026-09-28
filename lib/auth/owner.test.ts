import { describe, expect, it } from "vitest";
import { isAllowedOwner } from "./owner";

describe("isAllowedOwner", () => {
  it("matches the configured owner after normalizing case and spaces", () => {
    expect(isAllowedOwner(" Owner@Example.com ", "owner@example.com")).toBe(true);
  });

  it("rejects missing and different users", () => {
    expect(isAllowedOwner(null, "owner@example.com")).toBe(false);
    expect(isAllowedOwner("writer@example.com", "owner@example.com")).toBe(false);
    expect(isAllowedOwner("owner@example.com", undefined)).toBe(false);
  });
});
