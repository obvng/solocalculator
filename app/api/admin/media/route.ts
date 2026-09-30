import { desc, ilike, or } from "drizzle-orm";
import { requireOwner } from "@/lib/auth/owner";
import { mapMedia } from "@/lib/content/mappers";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { putMediaBlob, removeMediaBlob } from "@/lib/media/blob";
import { MEDIA_MAX_BYTES, sanitizeImage } from "@/lib/media/image-security";
import { createSanitizedMedia, MediaServiceError, type MediaServiceDependencies } from "@/lib/media/media-service";
import { assertTrustedOrigin, RequestSecurityError } from "@/lib/security/request-origin";
import { recordSecurityEvent, type SecurityReasonCode } from "@/lib/security/security-audit";
import { consumeUploadAllowance, UploadRateLimitError } from "@/lib/security/upload-rate-limit";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  await requireOwner();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const query = getDb().select().from(media);
  const rows = q
    ? await query.where(or(ilike(media.originalFilename, `%${q}%`), ilike(media.altText, `%${q}%`))).orderBy(desc(media.createdAt)).limit(100)
    : await query.orderBy(desc(media.createdAt)).limit(100);
  return json(rows.map(mapMedia));
}

export async function POST(request: Request) {
  const owner = await requireOwner();
  try {
    assertTrustedOrigin(request);
  } catch (error) {
    if (error instanceof RequestSecurityError) return json({ error: error.publicMessage }, error.status);
    throw error;
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MEDIA_MAX_BYTES) return json({ error: "Images must be smaller than 10 MB." }, 413);
  let allowance: Awaited<ReturnType<typeof consumeUploadAllowance>>;
  try {
    allowance = await consumeUploadAllowance({ ownerId: owner.id, request });
  } catch (error) {
    if (error instanceof UploadRateLimitError) {
      const message = error.code === "rate_limited" ? "Too many upload attempts. Try again later." : "Uploads are temporarily unavailable.";
      return json({ error: message }, error.status);
    }
    throw error;
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Choose an image." }, 400);
  const audit = (reasonCode: string) => recordSecurityEvent({ ownerId: owner.id, eventType: "media_upload_rejected", reasonCode: reasonCode as SecurityReasonCode, ipHash: allowance.ipHash });
  const dependencies: MediaServiceDependencies = {
    sanitize: sanitizeImage, put: putMediaBlob, remove: removeMediaBlob,
    insert: async (values) => { const [row] = await getDb().insert(media).values(values).returning(); return row; },
    update: async () => { throw new Error("unused"); }, find: async () => null, audit,
  };
  try {
    const row = await createSanitizedMedia({ bytes: new Uint8Array(await file.arrayBuffer()), originalFilename: file.name, altText: String(form.get("altText") ?? ""), caption: String(form.get("caption") ?? "") }, dependencies);
    return json(mapMedia(row as Record<string, unknown>), 201);
  } catch (error) {
    if (error instanceof MediaServiceError) {
      await audit(error.code as SecurityReasonCode).catch(() => undefined);
      return json({ error: error.publicMessage }, error.status);
    }
    return json({ error: "The image upload failed." }, 500);
  }
}
