import { requireOwner } from "@/lib/auth/owner";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { postInputSchema } from "@/lib/content/validation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { posts } from "@/lib/db/schema";

export async function POST(request: Request) { await requireOwner(); const body = await request.json(); const sanitizedHtml = sanitizeArticleHtml(String(body.sourceHtml ?? "")); const parsed = postInputSchema.safeParse({ ...body, status: "draft", sanitizedHtml }); if (!parsed.success) return Response.json({ fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 }); try { const [data] = await getDb().update(posts).set({ title: body.title, slug: body.slug, sourceHtml: body.sourceHtml, sanitizedHtml, editorDocument: body.editorDocument, seo: body.seo, version: body.version + 1, updatedAt: new Date() }).where(and(eq(posts.id, body.id), eq(posts.version, body.version))).returning({ id: posts.id, version: posts.version, updatedAt: posts.updatedAt }); if (!data) return Response.json({ error: "This draft changed in another tab." }, { status: 409 }); return Response.json(data); } catch { return Response.json({ error: "Autosave failed." }, { status: 500 }); } }
