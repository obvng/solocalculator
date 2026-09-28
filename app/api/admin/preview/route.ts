import { requireOwner } from "@/lib/auth/owner";
import { getAdminPost } from "@/lib/admin/repository";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function GET(request: Request) { await requireOwner(); const id = new URL(request.url).searchParams.get("id"); if (!id) return new Response("Missing article.", { status: 400 }); const data = await getAdminPost(id); if (!data) return new Response("Article not found.", { status: 404 }); const title = escapeHtml(data.title); const html = `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head><body><main><h1>${title}</h1>${data.sanitizedHtml}</main></body></html>`; return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; frame-src https://www.youtube.com https://player.vimeo.com" } }); }
