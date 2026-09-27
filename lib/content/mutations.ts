import { sanitizeArticleHtml } from "./sanitize";
import { postInputSchema } from "./validation";
import type { ContentStatus, PostRecord, RedirectRecord } from "./types";

const transitions: Record<ContentStatus, ContentStatus[]> = {
  draft: ["draft", "scheduled", "published", "archived"],
  scheduled: ["draft", "scheduled", "published", "archived"],
  published: ["draft", "scheduled", "published", "archived"],
  archived: ["draft", "archived"],
};

export function canTransition(from: ContentStatus, to: ContentStatus) {
  return transitions[from].includes(to);
}

export interface PostMutationDependencies {
  saveDraft(post: PostRecord): Promise<PostRecord>;
  savePublishedRevision(post: PostRecord): Promise<void>;
  createRedirect(redirect: Omit<RedirectRecord, "id" | "createdAt" | "updatedAt">): Promise<void>;
}

export type MutationResult<T> =
  | { ok: true; data: T; warnings: string[] }
  | { ok: false; fieldErrors: Record<string, string[]>; formError: string };

export async function savePostRecord(
  current: PostRecord,
  input: PostRecord,
  createSlugRedirect: boolean,
  dependencies: PostMutationDependencies,
): Promise<MutationResult<PostRecord>> {
  if (!canTransition(current.status, input.status)) {
    return { ok: false, fieldErrors: { status: ["Restore this article to draft before publishing it."] }, formError: "The status change is not allowed." };
  }
  const sanitizedHtml = sanitizeArticleHtml(input.sanitizedHtml || input.sourceHtml || "");
  const parsed = postInputSchema.safeParse({ ...input, sanitizedHtml });
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return { ok: false, fieldErrors: flattened.fieldErrors, formError: "Fix the marked fields and save again." };
  }

  const now = new Date().toISOString();
  const next: PostRecord = {
    ...input,
    sanitizedHtml,
    version: current.version + 1,
    publishedAt: input.status === "published" ? input.publishedAt ?? now : input.publishedAt,
    updatedAt: now,
  };
  const saved = await dependencies.saveDraft(next);

  if (next.status === "published") await dependencies.savePublishedRevision(saved);
  if (current.status === "published" && current.slug !== saved.slug && createSlugRedirect) {
    await dependencies.createRedirect({ sourcePath: `/blog/${current.slug}`, destination: `/blog/${saved.slug}`, statusCode: 308, enabled: true });
  }
  return { ok: true, data: saved, warnings: [] };
}
