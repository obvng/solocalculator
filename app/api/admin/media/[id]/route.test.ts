import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaServiceError } from "@/lib/media/media-service";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  consumeUploadAllowance: vi.fn(),
  replaceSanitizedMedia: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/auth/owner", () => ({ requireOwner: mocks.requireOwner }));
vi.mock("@/lib/security/request-origin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security/request-origin")>()),
  assertTrustedOrigin: mocks.assertTrustedOrigin,
}));
vi.mock("@/lib/security/upload-rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security/upload-rate-limit")>()),
  consumeUploadAllowance: mocks.consumeUploadAllowance,
}));
vi.mock("@/lib/media/media-service", () => ({
  replaceSanitizedMedia: mocks.replaceSanitizedMedia,
  MediaServiceError: class MediaServiceError extends Error {
    constructor(readonly code: string, readonly publicMessage: string, readonly status: number) { super(code); }
  },
}));
vi.mock("@/lib/security/security-audit", () => ({ recordSecurityEvent: mocks.recordSecurityEvent }));
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn(() => ({})) }));

import { DELETE, PATCH, PUT } from "./route";

const context = { params: Promise.resolve({ id: "media-1" }) };

function replacement(headers: Record<string, string> = {}) {
  const form = new FormData();
  const upload = new File([Uint8Array.from([1, 2, 3])], "replacement.gif", { type: "image/gif" });
  Object.defineProperty(upload, "arrayBuffer", { value: vi.fn(async () => Uint8Array.from([1, 2, 3]).buffer) });
  form.set("file", upload);
  const request = new Request("https://www.solocalculator.com/api/admin/media/media-1", { method: "PUT", headers });
  Object.defineProperty(request, "formData", { configurable: true, value: vi.fn(async () => form) });
  return request;
}

describe("individual media routes", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.requireOwner.mockResolvedValue({ id: "owner-1", email: "owner@example.com" });
    mocks.consumeUploadAllowance.mockResolvedValue({ count: 1, ipHash: "a".repeat(64) });
    mocks.replaceSanitizedMedia.mockResolvedValue({ id: "media-1", processingVersion: 1 });
    mocks.recordSecurityEvent.mockResolvedValue(undefined);
  });

  it("requires authentication before each state-changing method", async () => {
    mocks.requireOwner.mockRejectedValue(new Error("redirect"));
    await expect(PUT(replacement(), context)).rejects.toThrow("redirect");
    await expect(PATCH(new Request("https://www.solocalculator.com/api/admin/media/media-1", { method: "PATCH", body: "{}" }), context)).rejects.toThrow("redirect");
    await expect(DELETE(new Request("https://www.solocalculator.com/api/admin/media/media-1", { method: "DELETE" }), context)).rejects.toThrow("redirect");
    expect(mocks.assertTrustedOrigin).not.toHaveBeenCalled();
  });

  it("applies origin and rate-limit controls to replacement uploads", async () => {
    const response = await PUT(replacement(), context);
    expect(response.status).toBe(200);
    expect(mocks.assertTrustedOrigin).toHaveBeenCalledTimes(1);
    expect(mocks.consumeUploadAllowance).toHaveBeenCalledTimes(1);
    expect(mocks.replaceSanitizedMedia).toHaveBeenCalledWith("media-1", expect.objectContaining({
      bytes: expect.any(Uint8Array),
      originalFilename: "replacement.gif",
    }), expect.any(Object));
  });

  it("rejects an oversized declared replacement before parsing", async () => {
    const request = replacement({ "content-length": String(10 * 1024 * 1024 + 1) });
    const formData = vi.spyOn(request, "formData");
    const response = await PUT(request, context);
    expect(response.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
  });

  it("maps replacement service errors", async () => {
    mocks.replaceSanitizedMedia.mockRejectedValue(new MediaServiceError("animated", "Animated or multi-page images are not allowed.", 400));
    const response = await PUT(replacement(), context);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Animated or multi-page images are not allowed." });
  });

  it("checks origin but not upload allowance for metadata and delete requests", async () => {
    const patchRequest = new Request("https://www.solocalculator.com/api/admin/media/media-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ altText: "Updated" }),
    });
    await PATCH(patchRequest, context).catch(() => undefined);
    await DELETE(new Request("https://www.solocalculator.com/api/admin/media/media-1", { method: "DELETE" }), context).catch(() => undefined);
    expect(mocks.assertTrustedOrigin).toHaveBeenCalledTimes(2);
    expect(mocks.consumeUploadAllowance).not.toHaveBeenCalled();
  });
});
