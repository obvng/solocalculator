import { desc, ilike, or } from "drizzle-orm";
import { imageSize } from "image-size";
import { requireOwner } from "@/lib/auth/owner";
import { mapMedia } from "@/lib/content/mappers";
import { validateUpload } from "@/lib/content/media";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { putMediaBlob, removeMediaBlob } from "@/lib/media/blob";

export async function GET(request: Request) {
  await requireOwner();
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const query = getDb().select().from(media);
  const rows = q
    ? await query.where(or(ilike(media.originalFilename, `%${q}%`), ilike(media.altText, `%${q}%`))).orderBy(desc(media.createdAt)).limit(100)
    : await query.orderBy(desc(media.createdAt)).limit(100);
  return Response.json(rows.map(mapMedia));
}

export async function POST(request: Request) {
  await requireOwner();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose an image." }, { status: 400 });
  const validation = validateUpload(file);
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const dimensions = imageSize(bytes);
  if (!dimensions.width || !dimensions.height) return Response.json({ error: "The image dimensions could not be read." }, { status: 400 });
  let uploaded: Awaited<ReturnType<typeof putMediaBlob>>;
  try { uploaded = await putMediaBlob(file); }
  catch { return Response.json({ error: "The image upload failed." }, { status: 500 }); }
  try {
    const [row] = await getDb().insert(media).values({ storagePath: uploaded.pathname, publicUrl: uploaded.url, originalFilename: file.name, mimeType: file.type, width: dimensions.width, height: dimensions.height, byteSize: file.size, altText: String(form.get("altText") ?? ""), caption: String(form.get("caption") ?? "") }).returning();
    return Response.json(mapMedia(row), { status: 201 });
  } catch {
    await removeMediaBlob(uploaded.pathname).catch(() => undefined);
    return Response.json({ error: "The media record could not be saved." }, { status: 500 });
  }
}
