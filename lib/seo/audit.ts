export type SeoIssueSeverity = "error" | "warning";

export interface SeoAuditIssue {
  code: string;
  severity: SeoIssueSeverity;
  message: string;
  field: string;
  href?: string;
}

export interface SeoAuditDocument {
  id: string;
  pathname: string;
  title: string;
  description: string;
  canonical: string;
  noIndex: boolean;
  includeInSitemap: boolean;
  html: string;
  imageAltTexts: string[];
  internalLinks: string[];
  validInternalPaths: string[];
  inboundLinkCount: number;
  schemaType: string;
  schemaProperties: Record<string, unknown>;
  duplicateTitle?: boolean;
  duplicateDescription?: boolean;
}

export function auditSeoDocument(document: SeoAuditDocument): SeoAuditIssue[] {
  const issues: SeoAuditIssue[] = [];
  const add = (code: string, severity: SeoIssueSeverity, message: string, field: string, href?: string) =>
    issues.push({ code, severity, message, field, ...(href ? { href } : {}) });

  if (!document.title.trim()) add("missing-title", "error", "Add an SEO title.", "title");
  if (document.duplicateTitle) add("duplicate-title", "warning", "Another page uses this SEO title.", "title");
  if (!document.description.trim()) add("missing-description", "error", "Add a meta description.", "description");
  if (document.duplicateDescription) add("duplicate-description", "warning", "Another page uses this description.", "description");
  if (!document.canonical.trim()) add("missing-canonical", "error", "Add a canonical URL.", "canonical");
  if (document.noIndex && document.includeInSitemap) add("indexing-conflict", "error", "A noindex page cannot stay in the sitemap.", "includeInSitemap");
  if (!/<h1(?:\s[^>]*)?>/i.test(document.html)) add("missing-h1", "error", "Add one H1 heading.", "content");

  const headings = [...document.html.matchAll(/<h([1-6])(?:\s[^>]*)?>/gi)].map((match) => Number(match[1]));
  if (headings.some((level, index) => index > 0 && level > headings[index - 1] + 1) || (headings[0] ?? 1) > 1) {
    add("heading-order", "warning", "Heading levels skip a step.", "content");
  }
  if (document.imageAltTexts.some((alt) => !alt.trim())) add("missing-alt", "error", "Add alt text to every content image.", "content");

  const words = document.html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  if (words < 80) add("thin-content", "warning", "The page has little supporting text.", "content");
  if (document.internalLinks.length === 0) add("missing-internal-links", "warning", "Add a useful internal link.", "content");
  document.internalLinks.filter((link) => !document.validInternalPaths.includes(link)).forEach((link) =>
    add("broken-link", "error", `The internal link ${link} does not resolve.`, "content", link),
  );
  if (document.pathname.startsWith("/blog/") && document.inboundLinkCount === 0) add("orphan-content", "warning", "No other page links to this article.", "content");

  const requiredSchemaField = document.schemaType === "Article" || document.schemaType === "BlogPosting" ? "headline" : "name";
  if (document.schemaType && !document.schemaProperties[requiredSchemaField]) {
    add("incomplete-schema", "error", `Add the ${requiredSchemaField} schema field.`, "schemaProperties");
  }
  return issues;
}
