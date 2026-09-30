import { describe, expect, it, vi } from "vitest";
import { recordSecurityEvent } from "./security-audit";

describe("recordSecurityEvent", () => {
  it("stores only fixed codes, owner ID, and a hashed IP", async () => {
    const insert = vi.fn(async () => undefined);
    await recordSecurityEvent({
      ownerId: "owner-1",
      eventType: "media_upload_rejected",
      reasonCode: "unsupported",
      ipHash: "a".repeat(64),
    }, { insert });

    expect(insert).toHaveBeenCalledWith({
      ownerId: "owner-1",
      eventType: "media_upload_rejected",
      reasonCode: "unsupported",
      ipHash: "a".repeat(64),
    });
    const serialized = JSON.stringify(insert.mock.calls);
    for (const secret of ["filename", "cookie", "authorization", "password", "BLOB_READ_WRITE_TOKEN", "DATABASE_URL", "203.0.113.7"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("rejects arbitrary event and reason strings", async () => {
    await expect(recordSecurityEvent({
      ownerId: null,
      eventType: "password=secret" as never,
      reasonCode: "DATABASE_URL=value" as never,
      ipHash: "a".repeat(64),
    }, { insert: vi.fn() })).rejects.toThrow("Invalid security event");
  });
});
