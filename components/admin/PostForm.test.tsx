import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PostForm } from "./PostForm";
import type { PostRecord } from "@/lib/content/types";

const post: PostRecord = {
  id: "post-1", title: "Percentage guide", slug: "percentage-guide", excerpt: "", editorDocument: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Start writing." }] }] },
  sanitizedHtml: "<p>Start writing.</p>", sourceHtml: "<p>Start writing.</p>", status: "draft", featuredImageId: null,
  socialImageId: null, authorDisplayName: "SoloCalculator", categoryIds: [], tagIds: [], relatedPageKeys: [], relatedPostIds: [],
  version: 1, scheduledAt: null, publishedAt: null, createdAt: "2026-09-28T08:00:00.000Z", updatedAt: "2026-09-28T08:00:00.000Z",
  seo: { title: "", description: "", slug: "percentage-guide", canonical: "", targetKeyword: "", supportingKeywords: [], noIndex: false, noFollow: false, includeInSitemap: true, sitemapPriority: .7, changeFrequency: "monthly", openGraph: { title: "", description: "", imageId: null }, xCard: { title: "", description: "", imageId: null }, schemaType: "Article", schemaProperties: {}, breadcrumbLabel: "", faqItems: [] },
};

describe("PostForm", () => {
  it("provides visual editing and source controls", () => {
    render(<PostForm post={post} />);
    expect(screen.getByRole("button", { name: "Heading 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HTML source" })).toBeInTheDocument();
  });

  it("shows SEO controls, previews, and non-blocking warnings", () => {
    render(<PostForm post={post} />);
    expect(screen.getByLabelText("SEO title")).toBeInTheDocument();
    expect(screen.getByLabelText("Meta description")).toBeInTheDocument();
    expect(screen.getByText("Search preview")).toBeInTheDocument();
    expect(screen.getByText("SEO title is missing.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });
});
