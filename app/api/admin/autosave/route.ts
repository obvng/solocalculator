import { requireOwner } from "@/lib/auth/owner";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { postInputSchema } from "@/lib/content/validation";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) { await requireOwner(); const body = await request.json(); const sanitizedHtml = sanitizeArticleHtml(String(body.sourceHtml ?? "")); const parsed = postInputSchema.safeParse({ ...body, status: "draft", sanitizedHtml }); if (!parsed.success) return Response.json({ fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 }); const supabase = await createServerClient(); const { data, error } = await supabase.from("posts").update({ title: body.title, slug: body.slug, source_html: body.sourceHtml, sanitized_html: sanitizedHtml, version: body.version + 1 }).eq("id", body.id).eq("version", body.version).select("id,version,updated_at").maybeSingle(); if (error) return Response.json({ error: "Autosave failed." }, { status: 500 }); if (!data) return Response.json({ error: "This draft changed in another tab." }, { status: 409 }); return Response.json(data); }
