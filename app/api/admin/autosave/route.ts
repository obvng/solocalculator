import { assertTrustedOrigin, RequestSecurityError } from "@/lib/security/request-origin";
import { readBoundedJson, JsonBodyError } from "@/lib/security/bounded-json";
import { requireOwner } from "@/lib/auth/owner";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { postInputSchema } from "@/lib/content/validation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";

export async function POST(request: Request) {
  try { assertTrustedOrigin(request); } catch (error) {
    if (error instanceof RequestSecurityError) return Response.json({ error: error.publicMessage }, { status: 403 });
    throw error;
  }
  await requireOwner();
  let body;
  try { body = await readBoundedJson(request); } catch (error) {
    if (error instanceof JsonBodyError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
  if (typeof body.id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.id)
    || typeof body.version !== "number" || !Number.isSafeInteger(body.version) || body.version < 1
    || body.version >= Number.MAX_SAFE_INTEGER || typeof body.sourceHtml !== "string") {
    return Response.json({ error: "Invalid draft data." }, { status: 400 });
  }
  const sanitizedHtml = sanitizeArticleHtml(body.sourceHtml);
  const parsed = postInputSchema.safeParse({ ...body, status: "draft", sanitizedHtml });
  if (!parsed.success) return Response.json({ fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const [data] = await getDb().update(posts).set({
      title: parsed.data.title, slug: parsed.data.slug, sourceHtml: body.sourceHtml, sanitizedHtml,
      editorDocument: body.editorDocument, seo: parsed.data.seo, version: body.version + 1, updatedAt: new Date(),
    }).where(and(eq(posts.id, body.id), eq(posts.version, body.version)))
      .returning({ id: posts.id, version: posts.version, updatedAt: posts.updatedAt });
    if (!data) return Response.json({ error: "This draft changed in another tab." }, { status: 409 });
    return Response.json(data);
  } catch { return Response.json({ error: "Autosave failed." }, { status: 500 }); }
}
