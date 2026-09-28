import { eq, or, sql } from "drizzle-orm";
import { imageSize } from "image-size";
import { requireOwner } from "@/lib/auth/owner";
import { mapMedia } from "@/lib/content/mappers";
import { deleteMedia, validateUpload, type MediaReference } from "@/lib/content/media";
import { getDb } from "@/lib/db/client";
import { media, pageSeo, posts, siteSettings } from "@/lib/db/schema";
import { putMediaBlob, removeMediaBlob } from "@/lib/media/blob";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(); const { id } = await params; const body = await request.json();
  const [row] = await getDb().update(media).set({ altText: String(body.altText ?? ""), caption: String(body.caption ?? ""), updatedAt: new Date() }).where(eq(media.id, id)).returning();
  return row ? Response.json(mapMedia(row)) : Response.json({ error: "Media not found." }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(); const { id } = await params; const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a replacement image." }, { status: 400 });
  const validation = validateUpload(file); if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer()); const dimensions = imageSize(bytes);
  if (!dimensions.width || !dimensions.height) return Response.json({ error: "The image dimensions could not be read." }, { status: 400 });
  const [current] = await getDb().select().from(media).where(eq(media.id, id)).limit(1);
  if (!current) return Response.json({ error: "Media not found." }, { status: 404 });
  const uploaded = await putMediaBlob(file);
  try {
    const [row] = await getDb().update(media).set({ storagePath: uploaded.pathname, publicUrl: uploaded.url, originalFilename: file.name, mimeType: file.type, width: dimensions.width, height: dimensions.height, byteSize: file.size, updatedAt: new Date() }).where(eq(media.id, id)).returning();
    await removeMediaBlob(current.storagePath).catch(() => undefined);
    return Response.json(mapMedia(row));
  } catch {
    await removeMediaBlob(uploaded.pathname).catch(() => undefined);
    return Response.json({ error: "Replacement could not be saved." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(); const { id } = await params; const [item] = await getDb().select().from(media).where(eq(media.id, id)).limit(1);
  if (!item) return Response.json({ error: "Media not found." }, { status: 404 });
  const result = await deleteMedia(id, item.storagePath, {
    findReferences: async (mediaId) => {
      const references: MediaReference[] = [];
      const [postRows, pageRows, settingRows] = await Promise.all([
        getDb().select({ id: posts.id, title: posts.title }).from(posts).where(or(eq(posts.featuredImageId, mediaId), eq(posts.socialImageId, mediaId))),
        getDb().select({ id: pageSeo.id, pageKey: pageSeo.pageKey }).from(pageSeo).where(or(sql`${pageSeo.openGraph}::text like ${`%${mediaId}%`}`, sql`${pageSeo.xCard}::text like ${`%${mediaId}%`}`)),
        getDb().select({ id: siteSettings.id }).from(siteSettings).where(eq(siteSettings.defaultSocialImageId, mediaId)),
      ]);
      postRows.forEach((post) => references.push({ type: "post", id: post.id, label: post.title }));
      pageRows.forEach((page) => references.push({ type: "page", id: page.id, label: page.pageKey }));
      settingRows.forEach(() => references.push({ type: "settings", id: "site", label: "Site settings" }));
      return references;
    },
    deleteRecord: async (mediaId) => { await getDb().delete(media).where(eq(media.id, mediaId)); },
    deleteObject: removeMediaBlob,
  });
  return result.ok ? Response.json(result) : Response.json(result, { status: 409 });
}
