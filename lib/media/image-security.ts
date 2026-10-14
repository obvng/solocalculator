import { createHash } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_MAX_PIXELS = 40_000_000;
export const MEDIA_MAX_AXIS = 12_000;
export const MEDIA_PROCESSING_VERSION = 1 as const;

export type ImageSecurityCode = "empty" | "too_large" | "unsupported" | "corrupt" | "dimensions" | "animated";
export type SanitizedImageMimeType = "image/jpeg" | "image/png" | "image/webp";
export type SanitizedImageExtension = "jpg" | "png" | "webp";

export interface SanitizedImage {
  bytes: Uint8Array;
  mimeType: SanitizedImageMimeType;
  extension: SanitizedImageExtension;
  width: number;
  height: number;
  byteSize: number;
  sha256: string;
  processingVersion: typeof MEDIA_PROCESSING_VERSION;
}

export class ImageSecurityError extends Error {
  constructor(readonly code: ImageSecurityCode) {
    super(code);
    this.name = "ImageSecurityError";
  }
}

const acceptedTypes = {
  jpg: { mimeType: "image/jpeg", extension: "jpg" },
  png: { mimeType: "image/png", extension: "png" },
  webp: { mimeType: "image/webp", extension: "webp" },
} as const;

function assertDimensions(width: number | undefined, height: number | undefined) {
  if (!width || !height || width > MEDIA_MAX_AXIS || height > MEDIA_MAX_AXIS || width * height > MEDIA_MAX_PIXELS) {
    throw new ImageSecurityError("dimensions");
  }
}

function assertSinglePage(pages: number | undefined, pageHeight: number | undefined, height: number | undefined) {
  if ((pages ?? 1) !== 1 || (pageHeight !== undefined && height !== undefined && pageHeight !== height)) {
    throw new ImageSecurityError("animated");
  }
}

export async function sanitizeImage(input: Uint8Array): Promise<SanitizedImage> {
  if (input.byteLength === 0) throw new ImageSecurityError("empty");
  if (input.byteLength > MEDIA_MAX_BYTES) throw new ImageSecurityError("too_large");

  const sourceBytes = Uint8Array.from(input);
  const detected = await fileTypeFromBuffer(sourceBytes);
  const detectedExtension = detected?.ext;
  const accepted = detectedExtension ? acceptedTypes[detectedExtension as keyof typeof acceptedTypes] : undefined;
  if (!accepted) throw new ImageSecurityError("unsupported");

  try {
    const sourceMetadata = await sharp(sourceBytes, { animated: true, failOn: "error", limitInputPixels: false }).metadata();
    assertDimensions(sourceMetadata.width, sourceMetadata.height);
    assertSinglePage(sourceMetadata.pages, sourceMetadata.pageHeight, sourceMetadata.height);

    const decoder = sharp(sourceBytes, { animated: true, failOn: "error", limitInputPixels: MEDIA_MAX_PIXELS });
    const metadata = await decoder.metadata();
    assertDimensions(metadata.width, metadata.height);
    assertSinglePage(metadata.pages, metadata.pageHeight, metadata.height);

    const oriented = decoder.rotate();
    let output: Buffer;
    if (metadata.hasAlpha) {
      output = await oriented.png({ compressionLevel: 9 }).toBuffer();
    } else if (detectedExtension === "webp") {
      output = await oriented.webp({ quality: 88 }).toBuffer();
    } else {
      output = await oriented.removeAlpha().jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    }
    if (output.byteLength > MEDIA_MAX_BYTES) throw new ImageSecurityError("too_large");

    const rebuiltType = await fileTypeFromBuffer(Uint8Array.from(output));
    const rebuiltAccepted = rebuiltType?.ext ? acceptedTypes[rebuiltType.ext as keyof typeof acceptedTypes] : undefined;
    if (!rebuiltAccepted) throw new ImageSecurityError("corrupt");

    const rebuiltMetadata = await sharp(output, { animated: true, failOn: "error", limitInputPixels: MEDIA_MAX_PIXELS }).metadata();
    assertDimensions(rebuiltMetadata.width, rebuiltMetadata.height);
    assertSinglePage(rebuiltMetadata.pages, rebuiltMetadata.pageHeight, rebuiltMetadata.height);

    return {
      bytes: output,
      mimeType: rebuiltAccepted.mimeType,
      extension: rebuiltAccepted.extension,
      width: rebuiltMetadata.width!,
      height: rebuiltMetadata.height!,
      byteSize: output.byteLength,
      sha256: createHash("sha256").update(output).digest("hex"),
      processingVersion: MEDIA_PROCESSING_VERSION,
    };
  } catch (error) {
    if (error instanceof ImageSecurityError) throw error;
    throw new ImageSecurityError("corrupt");
  }
}
