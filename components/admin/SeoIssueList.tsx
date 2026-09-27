import type { SeoAuditIssue } from "@/lib/seo/audit";

export function SeoIssueList({ issues }: { issues: SeoAuditIssue[] }) {
  if (!issues.length) return <p>No SEO issues found.</p>;
  return <ul>{issues.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{issue.severity === "error" ? "Fix" : "Review"}:</strong> {issue.message}</li>)}</ul>;
}
