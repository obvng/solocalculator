import { basename } from "node:path";
import { ImageSecurityError, type ImageSecurityCode, type SanitizedImage } from "./image-security";

export interface NewMediaValues {
  storagePath: string;
  publicUrl: string;
  originalFilename: string;
  mimeType: SanitizedImage["mimeType"];
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  processingVersion: 1;
  altText: string;
  caption: string;
}

export interface MediaServiceDependencies {
  sanitize(bytes: Uint8Array): Promise<SanitizedImage>;
  put(image: SanitizedImage): Promise<{ pathname: string; url: string }>;
  remove(pathname: string): Promise<void>;
  insert(values: NewMediaValues): Promise<unknown>;
  update(id: string, values: NewMediaValues): Promise<unknown | null>;
  find(id: string): Promise<{ storagePath: string } | null>;
  audit(reasonCode: string): Promise<void>;
}

export interface MediaServiceInput {
  bytes: Uint8Array;
  originalFilename: string;
  altText?: string;
  caption?: string;
}

export class MediaServiceError extends Error {
  constructor(
    readonly code: ImageSecurityCode | "storage_failed" | "database_failed" | "not_found",
    readonly publicMessage: string,
    readonly status: 400 | 404 | 413 | 500,
  ) {
    super(code);
    this.name = "MediaServiceError";
  }
}

const imageErrors: Record<ImageSecurityCode, { publicMessage: string; status: 400 | 413 }> = {
  empty: { publicMessage: "The file is not a valid image.", status: 400 },
  too_large: { publicMessage: "Images must be smaller than 10 MB.", status: 413 },
  unsupported: { publicMessage: "Upload a JPEG, PNG or WebP image.", status: 400 },
  corrupt: { publicMessage: "The file is not a valid image.", status: 400 },
  dimensions: { publicMessage: "Image dimensions are too large.", status: 400 },
  animated: { publicMessage: "Animated or multi-page images are not allowed.", status: 400 },
};

export function mapImageSecurityError(error: ImageSecurityError) {
  const mapped = imageErrors[error.code];
  return new MediaServiceError(error.code, mapped.publicMessage, mapped.status);
}

function displayFilename(filename: string) {
  return basename(filename.replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 255) || "upload";
}

function valuesFor(input: MediaServiceInput, image: SanitizedImage, uploaded: { pathname: string; url: string }): NewMediaValues {
  return {
    storagePath: uploaded.pathname,
    publicUrl: uploaded.url,
    originalFilename: displayFilename(input.originalFilename),
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    byteSize: image.byteSize,
    sha256: image.sha256,
    processingVersion: image.processingVersion,
    altText: String(input.altText ?? "").slice(0, 500),
    caption: String(input.caption ?? "").slice(0, 1_000),
  };
}

async function sanitized(input: MediaServiceInput, dependencies: MediaServiceDependencies) {
  try {
    return await dependencies.sanitize(input.bytes);
  } catch (error) {
    if (error instanceof ImageSecurityError) throw mapImageSecurityError(error);
    throw new MediaServiceError("corrupt", "The file is not a valid image.", 400);
  }
}

async function cleanupNewBlob(pathname: string, dependencies: MediaServiceDependencies) {
  try {
    await dependencies.remove(pathname);
  } catch {
    await dependencies.audit("orphan_cleanup_failed").catch(() => undefined);
  }
}

export async function createSanitizedMedia(input: MediaServiceInput, dependencies: MediaServiceDependencies) {
  const image = await sanitized(input, dependencies);
  let uploaded: { pathname: string; url: string };
  try {
    uploaded = await dependencies.put(image);
  } catch {
    await dependencies.audit("storage_failed").catch(() => undefined);
    throw new MediaServiceError("storage_failed", "The image upload failed.", 500);
  }

  try {
    return await dependencies.insert(valuesFor(input, image, uploaded));
  } catch {
    await cleanupNewBlob(uploaded.pathname, dependencies);
    await dependencies.audit("database_failed").catch(() => undefined);
    throw new MediaServiceError("database_failed", "The media record could not be saved.", 500);
  }
}

export async function replaceSanitizedMedia(id: string, input: MediaServiceInput, dependencies: MediaServiceDependencies) {
  const current = await dependencies.find(id);
  if (!current) throw new MediaServiceError("not_found", "Media not found.", 404);

  const image = await sanitized(input, dependencies);
  let uploaded: { pathname: string; url: string };
  try {
    uploaded = await dependencies.put(image);
  } catch {
    await dependencies.audit("storage_failed").catch(() => undefined);
    throw new MediaServiceError("storage_failed", "The image upload failed.", 500);
  }

  let updated: unknown | null;
  try {
    updated = await dependencies.update(id, valuesFor(input, image, uploaded));
    if (!updated) throw new Error("missing media row");
  } catch {
    await cleanupNewBlob(uploaded.pathname, dependencies);
    await dependencies.audit("database_failed").catch(() => undefined);
    throw new MediaServiceError("database_failed", "Replacement could not be saved.", 500);
  }

  try {
    await dependencies.remove(current.storagePath);
  } catch {
    await dependencies.audit("orphan_cleanup_failed").catch(() => undefined);
  }
  return updated;
}
