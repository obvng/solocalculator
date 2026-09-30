import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaServiceError } from "@/lib/media/media-service";
import { RequestSecurityError } from "@/lib/security/request-origin";
import { UploadRateLimitError } from "@/lib/security/upload-rate-limit";

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  assertTrustedOrigin: vi.fn(),
  consumeUploadAllowance: vi.fn(),
  createSanitizedMedia: vi.fn(),
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
  createSanitizedMedia: mocks.createSanitizedMedia,
  MediaServiceError: class MediaServiceError extends Error {
    constructor(readonly code: string, readonly publicMessage: string, readonly status: number) { super(code); }
  },
}));
vi.mock("@/lib/security/security-audit", () => ({ recordSecurityEvent: mocks.recordSecurityEvent }));

vi.mock("@/lib/db/client", () => ({
  getDb: vi.fn(() => ({ select: vi.fn() })),
}));

import * as mediaRoute from "./route";

const { GET, POST } = mediaRoute;

function uploadRequest(file = true, headers: Record<string, string> = {}) {
  const form = new FormData();
  if (file) {
    const upload = new File([Uint8Array.from([1, 2, 3])], "photo.jpg.php", { type: "text/html" });
    Object.defineProperty(upload, "arrayBuffer", { value: vi.fn(async () => Uint8Array.from([1, 2, 3]).buffer) });
    form.set("file", upload);
  }
  form.set("altText", "Alt");
  const request = new Request("https://www.solocalculator.com/api/admin/media", { method: "POST", headers });
  Object.defineProperty(request, "formData", { configurable: true, value: vi.fn(async () => form) });
  return request;
}

describe("POST /api/admin/media", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.requireOwner.mockResolvedValue({ id: "owner-1", email: "owner@example.com" });
    mocks.consumeUploadAllowance.mockResolvedValue({ count: 1, ipHash: "a".repeat(64) });
    mocks.createSanitizedMedia.mockResolvedValue({ id: "media-1", processingVersion: 1 });
    mocks.recordSecurityEvent.mockResolvedValue(undefined);
  });

  it("authenticates before reading multipart data", async () => {
    const request = uploadRequest();
    const formData = vi.spyOn(request, "formData");
    mocks.requireOwner.mockRejectedValue(new Error("redirect"));

    await expect(POST(request)).rejects.toThrow("redirect");
    expect(formData).not.toHaveBeenCalled();
  });

  it("keeps listing owner-only and leaves unsupported methods unexported", async () => {
    mocks.requireOwner.mockRejectedValue(new Error("redirect"));
    await expect(GET(new Request("https://www.solocalculator.com/api/admin/media"))).rejects.toThrow("redirect");
    expect("PUT" in mediaRoute).toBe(false);
    expect("DELETE" in mediaRoute).toBe(false);
  });

  it("rejects a declared body above 10 MiB before parsing", async () => {
    const request = uploadRequest(true, { "content-length": String(10 * 1024 * 1024 + 1) });
    const formData = vi.spyOn(request, "formData");
    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(formData).not.toHaveBeenCalled();
  });

  it("rejects a request without a file", async () => {
    const response = await POST(uploadRequest(false));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Choose an image." });
  });

  it("rejects cross-origin requests", async () => {
    mocks.assertTrustedOrigin.mockImplementation(() => { throw new RequestSecurityError(); });
    const response = await POST(uploadRequest());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Request origin was rejected." });
  });

  it.each([
    [new UploadRateLimitError("rate_limited", 429), 429, "Too many upload attempts. Try again later."],
    [new UploadRateLimitError("unavailable", 503), 503, "Uploads are temporarily unavailable."],
  ])("returns a generic limiter error", async (error, status, message) => {
    mocks.consumeUploadAllowance.mockRejectedValue(error);
    const response = await POST(uploadRequest());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });

  it("passes raw bytes and display-only text to the media service", async () => {
    const response = await POST(uploadRequest());
    expect(response.status).toBe(201);
    expect(mocks.createSanitizedMedia).toHaveBeenCalledWith(expect.objectContaining({
      bytes: expect.any(Uint8Array),
      originalFilename: "photo.jpg.php",
      altText: "Alt",
    }), expect.any(Object));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    [new MediaServiceError("unsupported", "Upload a JPEG, PNG or WebP image.", 400), 400, "Upload a JPEG, PNG or WebP image."],
    [new MediaServiceError("too_large", "Images must be smaller than 10 MB.", 413), 413, "Images must be smaller than 10 MB."],
    [new MediaServiceError("storage_failed", "The image upload failed.", 500), 500, "The image upload failed."],
  ])("returns mapped service errors without internal details", async (error, status, message) => {
    mocks.createSanitizedMedia.mockRejectedValue(error);
    const response = await POST(uploadRequest());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
