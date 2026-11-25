import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDefaultPageSeo } from "@/lib/seo/defaults";
const mocks = vi.hoisted(() => ({ page: vi.fn() }));
vi.mock("@/lib/content/repository", () => ({ getPageSeo: mocks.page }));
import ToolPage from "./page";

describe("server-rendered calculator explanations", () => {
  it("renders saved copy and only marks up the FAQs visitors can read", async () => {
    mocks.page.mockResolvedValue({ ...getDefaultPageSeo("tip-calculator"),
      introductionHtml: "<p>Understand your bill.</p>",
      supportingSections: [{ heading: "How it works", html: '<p>Multiply by the tip rate.</p><script>unsafe()</script>' }],
      faqItems: [{ question: "Is the tip included?", answer: "Yes, in the total." }, { question: "Unfinished question", answer: "" }],
    });
    const html = renderToStaticMarkup(await ToolPage({ params: Promise.resolve({ slug: "tip-calculator" }) }));
    expect(html).toContain("Understand your bill.");
    expect(html).toContain("Multiply by the tip rate.");
    expect(html).not.toContain("unsafe()");
    expect(html).toContain("Is the tip included?");
    expect(html).not.toContain("Unfinished question");
    const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    const records = JSON.parse(script!);
    expect(records.find((record: Record<string, unknown>) => record["@type"] === "FAQPage").mainEntity).toEqual([
      { "@type": "Question", name: "Is the tip included?", acceptedAnswer: { "@type": "Answer", text: "Yes, in the total." } },
    ]);
  });
});
