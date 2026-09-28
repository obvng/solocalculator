import { describe, expect, it } from "vitest";
import { makeBlobPath } from "./blob";

describe("makeBlobPath", () => {
  it("creates a media path without preserving unsafe filename characters", () => {
    expect(makeBlobPath("My photo (1).PNG", "fixed-id", new Date("2026-09-28T12:00:00.000Z"))).toBe("media/2026-09-28/fixed-id.png");
  });
});
