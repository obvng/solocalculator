import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db/client";
import { media } from "../lib/db/schema";
import { putMediaBlob, removeMediaBlob } from "../lib/media/blob";
import { ImageSecurityError, MEDIA_MAX_BYTES, sanitizeImage, type SanitizedImage } from "../lib/media/image-security";

export type RebuildMode = "dry-run" | "apply";
export interface LegacyMediaRow {
  id: string;
  storagePath: string;
  publicUrl: string;
  processingVersion: number;
}
export interface RebuildDependencies {
  fetchBytes(url: string): Promise<Uint8Array>;
  sanitize(bytes: Uint8Array): Promise<SanitizedImage>;
  put(image: SanitizedImage): Promise<{ pathname: string; url: string }>;
  update(id: string, values: {
    storagePath: string; publicUrl: string; mimeType: SanitizedImage["mimeType"]; width: number; height: number;
    byteSize: number; sha256: string; processingVersion: 1; updatedAt: Date;
  }): Promise<void>;
  remove(pathname: string): Promise<void>;
}

export type RebuildEntry = {
  id: string;
  status: "skipped" | "safe" | "replaced" | "rejected" | "failed";
  reasonCode?: string;
  orphanCleanupFailure?: boolean;
};

export function assertPublicBlobUrl(value: string) {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("untrusted_blob_url"); }
  if (
    url.protocol !== "https:"
    || url.port
    || url.username
    || url.password
    || !url.hostname.endsWith(".public.blob.vercel-storage.com")
  ) throw new Error("untrusted_blob_url");
}

export async function readResponseBytes(response: Response) {
  if (!response.ok) throw new Error("fetch_failed");
  if (!response.body) throw new Error("fetch_failed");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MEDIA_MAX_BYTES) throw new Error("too_large");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function rebuildMediaRow(row: LegacyMediaRow, dependencies: RebuildDependencies, mode: RebuildMode): Promise<RebuildEntry> {
  if (row.processingVersion === 1) return { id: row.id, status: "skipped" };

  let source: Uint8Array;
  try { source = await dependencies.fetchBytes(row.publicUrl); }
  catch { return { id: row.id, status: "failed", reasonCode: "fetch_failed" }; }

  let image: SanitizedImage;
  try { image = await dependencies.sanitize(source); }
  catch (error) {
    return error instanceof ImageSecurityError
      ? { id: row.id, status: "rejected", reasonCode: error.code }
      : { id: row.id, status: "failed", reasonCode: "processing_failed" };
  }
  if (mode === "dry-run") return { id: row.id, status: "safe" };

  let uploaded: { pathname: string; url: string };
  try { uploaded = await dependencies.put(image); }
  catch { return { id: row.id, status: "failed", reasonCode: "storage_failed" }; }

  try {
    await dependencies.update(row.id, {
      storagePath: uploaded.pathname,
      publicUrl: uploaded.url,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      byteSize: image.byteSize,
      sha256: image.sha256,
      processingVersion: image.processingVersion,
      updatedAt: new Date(),
    });
  } catch {
    await dependencies.remove(uploaded.pathname).catch(() => undefined);
    return { id: row.id, status: "failed", reasonCode: "database_failed" };
  }

  try {
    await dependencies.remove(row.storagePath);
    return { id: row.id, status: "replaced" };
  } catch {
    return { id: row.id, status: "replaced", orphanCleanupFailure: true };
  }
}

function summarize(entries: RebuildEntry[]) {
  return {
    scanned: entries.length,
    safe: entries.filter((entry) => entry.status === "safe" || entry.status === "skipped").length,
    replaced: entries.filter((entry) => entry.status === "replaced").length,
    rejected: entries.filter((entry) => entry.status === "rejected").length,
    failed: entries.filter((entry) => entry.status === "failed").length,
    orphanCleanupFailures: entries.filter((entry) => entry.orphanCleanupFailure).length,
    entries,
  };
}

async function main() {
  const mode: RebuildMode = process.argv.includes("--apply") ? "apply" : "dry-run";
  if (mode === "apply" && process.env.MEDIA_REBUILD_CONFIRM !== "solocalculator-media-v1") {
    process.stderr.write("Refusing to apply: set MEDIA_REBUILD_CONFIRM=solocalculator-media-v1 after reviewing a dry-run report.\n");
    process.exitCode = 2;
    return;
  }
  const rows = await getDb().select({
    id: media.id,
    storagePath: media.storagePath,
    publicUrl: media.publicUrl,
    processingVersion: media.processingVersion,
  }).from(media);
  const dependencies: RebuildDependencies = {
    fetchBytes: async (url) => {
      assertPublicBlobUrl(url);
      return readResponseBytes(await fetch(url, { redirect: "error", cache: "no-store" }));
    },
    sanitize: sanitizeImage,
    put: putMediaBlob,
    update: async (id, values) => { await getDb().update(media).set(values).where(eq(media.id, id)); },
    remove: removeMediaBlob,
  };
  const entries: RebuildEntry[] = [];
  for (const row of rows) entries.push(await rebuildMediaRow(row, dependencies, mode));
  process.stdout.write(`${JSON.stringify(summarize(entries), null, 2)}\n`);
  if (entries.some((entry) => entry.status === "failed")) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write("Media inventory failed. Check the server logs and configuration.\n");
    process.exitCode = 1;
  });
}
