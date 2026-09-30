import { del, put } from "@vercel/blob";
import type { SanitizedImage, SanitizedImageExtension } from "./image-security";

const safeExtensions = new Set<SanitizedImageExtension>(["jpg", "png", "webp"]);

export function makeBlobPath(extension: SanitizedImageExtension, id = crypto.randomUUID(), now = new Date()) {
  if (!safeExtensions.has(extension)) throw new Error("Unsupported sanitized extension");
  return `media/${now.toISOString().slice(0, 10)}/${id}.${extension}`;
}

export async function putMediaBlob(image: SanitizedImage) {
  const pathname = makeBlobPath(image.extension);
  const blob = await put(pathname, Buffer.from(image.bytes), {
    access: "public",
    addRandomSuffix: false,
    contentType: image.mimeType,
  });
  return { pathname: blob.pathname, url: blob.url };
}

export async function removeMediaBlob(pathname: string) {
  await del(pathname);
}
