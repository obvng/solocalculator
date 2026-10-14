export interface MediaReference { type: "post" | "page" | "settings"; id: string; label: string }
export interface MediaDependencies {
  findReferences(id: string): Promise<MediaReference[]>;
  deleteRecord(id: string): Promise<void>;
  deleteObject(path: string): Promise<void>;
}

export async function deleteMedia(id: string, storagePath: string, dependencies: MediaDependencies) {
  const references = await dependencies.findReferences(id);
  if (references.length) return { ok: false as const, references };
  await dependencies.deleteRecord(id);
  await dependencies.deleteObject(storagePath);
  return { ok: true as const };
}
