import { describe, expect, it } from "vitest";
import { toolBySlug } from "./catalog";

describe("tool worked examples", () => {
  it("calculates the age example against the supplied current date", () => {
    const age = toolBySlug.get("age-calculator");

    expect(age?.example("2026-10-14")).toBe(
      "Example: a birth date of 15 January 2000 is 26 years, 8 months and 29 days before 14 October 2026.",
    );
    expect(age?.example("2026-10-14")).not.toContain("26 September 2026");
  });
});
