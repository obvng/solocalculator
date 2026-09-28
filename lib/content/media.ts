export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export interface UploadDescription { name: string; type: string; size: number }
export interface MediaReference { type: "post" | "page" | "settings"; id: string; label: string }
export interface MediaDependencies {
  findReferences(id: string): Promise<MediaReference[]>;
  deleteRecord(id: string): Promise<void>;
  deleteObject(path: string): Promise<void>;
}

export function validateUpload(file: UploadDescription): { ok: true } | { ok: false; error: string } {
  if (!MEDIA_TYPES.includes(file.type as (typeof MEDIA_TYPES)[number])) return { ok: false, error: "Upload a JPEG, PNG, WebP or GIF image." };
  if (file.size <= 0 || file.size > MEDIA_MAX_BYTES) return { ok: false, error: "Images must be smaller than 10 MB." };
  return { ok: true };
}

export async function deleteMedia(id: string, storagePath: string, dependencies: MediaDependencies) {
  const references = await dependencies.findReferences(id);
  if (references.length) return { ok: false as const, references };
  await dependencies.deleteRecord(id);
  await dependencies.deleteObject(storagePath);
  return { ok: true as const };
}
