import { eq, or, sql } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/owner";
import { mapMedia } from "@/lib/content/mappers";
import { deleteMedia, type MediaReference } from "@/lib/content/media";
import { getDb } from "@/lib/db/client";
import { media, pageSeo, posts, siteSettings } from "@/lib/db/schema";
import { putMediaBlob, removeMediaBlob } from "@/lib/media/blob";
import { MEDIA_MAX_BYTES, sanitizeImage } from "@/lib/media/image-security";
import { MediaServiceError, replaceSanitizedMedia, type MediaServiceDependencies } from "@/lib/media/media-service";
import { assertTrustedOrigin, RequestSecurityError } from "@/lib/security/request-origin";
import { recordSecurityEvent, type SecurityReasonCode } from "@/lib/security/security-audit";
import { consumeUploadAllowance, UploadRateLimitError } from "@/lib/security/upload-rate-limit";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function originError(request: Request) {
  try { assertTrustedOrigin(request); return null; }
  catch (error) {
    if (error instanceof RequestSecurityError) return json({ error: error.publicMessage }, error.status);
    throw error;
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(); const rejected = originError(request); if (rejected) return rejected; const { id } = await params; const body = await request.json();
  const [row] = await getDb().update(media).set({ altText: String(body.altText ?? ""), caption: String(body.caption ?? ""), updatedAt: new Date() }).where(eq(media.id, id)).returning();
  return row ? json(mapMedia(row)) : json({ error: "Media not found." }, 404);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwner(); const rejected = originError(request); if (rejected) return rejected;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MEDIA_MAX_BYTES) return json({ error: "Images must be smaller than 10 MB." }, 413);
  let allowance: Awaited<ReturnType<typeof consumeUploadAllowance>>;
  try { allowance = await consumeUploadAllowance({ ownerId: owner.id, request }); }
  catch (error) {
    if (error instanceof UploadRateLimitError) return json({ error: error.code === "rate_limited" ? "Too many upload attempts. Try again later." : "Uploads are temporarily unavailable." }, error.status);
    throw error;
  }
  const { id } = await params; const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Choose a replacement image." }, 400);
  const audit = (reasonCode: string) => recordSecurityEvent({ ownerId: owner.id, eventType: "media_replacement_rejected", reasonCode: reasonCode as SecurityReasonCode, ipHash: allowance.ipHash });
  const dependencies: MediaServiceDependencies = {
    sanitize: sanitizeImage, put: putMediaBlob, remove: removeMediaBlob,
    insert: async () => { throw new Error("unused"); },
    update: async (mediaId, values) => { const [row] = await getDb().update(media).set({ ...values, updatedAt: new Date() }).where(eq(media.id, mediaId)).returning(); return row ?? null; },
    find: async (mediaId) => { const [row] = await getDb().select({ storagePath: media.storagePath }).from(media).where(eq(media.id, mediaId)).limit(1); return row ?? null; },
    audit,
  };
  try {
    const row = await replaceSanitizedMedia(id, { bytes: new Uint8Array(await file.arrayBuffer()), originalFilename: file.name, altText: String(form.get("altText") ?? ""), caption: String(form.get("caption") ?? "") }, dependencies);
    return json(mapMedia(row as Record<string, unknown>));
  } catch (error) {
    if (error instanceof MediaServiceError) { await audit(error.code as SecurityReasonCode).catch(() => undefined); return json({ error: error.publicMessage }, error.status); }
    return json({ error: "Replacement could not be saved." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner(); const rejected = originError(request); if (rejected) return rejected; const { id } = await params; const [item] = await getDb().select().from(media).where(eq(media.id, id)).limit(1);
  if (!item) return json({ error: "Media not found." }, 404);
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
  return result.ok ? json(result) : json(result, 409);
}
