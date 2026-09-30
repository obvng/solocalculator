import { describe, expect, it } from "vitest";
import { MEDIA_MAX_BYTES } from "@/lib/media/image-security";
import { MAX_MULTIPART_BYTES, MultipartBodyError, readBoundedMultipart } from "./bounded-multipart";

function multipartStream(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(chunk));
      controller.close();
    },
  });
}

describe("readBoundedMultipart", () => {
  it("rejects a streamed multipart body above the limit without Content-Length", async () => {
    const boundary = "upload-boundary";
    const prefix = new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="note"\r\n\r\n`);
    const request = new Request("https://www.solocalculator.com/api/admin/media", {
      method: "POST",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      body: multipartStream([prefix, new Uint8Array(MAX_MULTIPART_BYTES)]),
      duplex: "half",
    } as RequestInit);

    await expect(readBoundedMultipart(request)).rejects.toBeInstanceOf(MultipartBodyError);
  });

  it("allows multipart overhead around a file at the image byte limit", () => {
    expect(MAX_MULTIPART_BYTES).toBeGreaterThan(MEDIA_MAX_BYTES);
  });
});
