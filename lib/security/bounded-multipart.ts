import { MEDIA_MAX_BYTES } from "@/lib/media/image-security";

export const MAX_MULTIPART_BYTES = MEDIA_MAX_BYTES + 64 * 1024;

export class MultipartBodyError extends Error {
  readonly status = 413;
  readonly publicMessage = "Images must be smaller than 10 MB.";

  constructor() {
    super("multipart_body_too_large");
    this.name = "MultipartBodyError";
  }
}

function declaredLength(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new MultipartBodyError();
  return Number(value);
}

export async function readBoundedMultipart(request: Request) {
  const declared = declaredLength(request);
  if (declared !== null && declared > MAX_MULTIPART_BYTES) throw new MultipartBodyError();
  if (!request.body) return request.formData();

  const reader = request.body.getReader();
  let total = 0;
  const boundedBody = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        total += value.byteLength;
        if (total > MAX_MULTIPART_BYTES) {
          await reader.cancel();
          controller.error(new MultipartBodyError());
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  const boundedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: boundedBody,
    duplex: "half",
  } as RequestInit);
  return boundedRequest.formData();
}
