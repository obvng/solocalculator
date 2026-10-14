import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getDefaultPageSeo } from "@/lib/seo/defaults";

vi.mock("@/lib/content/repository", () => ({
  getPageSeo: vi.fn().mockResolvedValue({ ...getDefaultPageSeo("home"), introductionHtml: "" }),
  getPublicSettings: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/content/sanitize", () => ({ sanitizeArticleHtml: (value: string) => value }));

import Home from "./page";

describe("homepage calculator links", () => {
  it("keeps the popular calculators and adds a separate Tier 1 section", async () => {
    const { container } = render(await Home());
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));

    expect(screen.getByRole("heading", { name: "Popular calculators" })).toBeInTheDocument();
    for (const href of ["/age-calculator", "/percentage-calculator", "/loan-calculator", "/date-calculator", "/unit-converter", "/currency-converter"]) {
      expect(hrefs).toContain(href);
    }

    expect(screen.getByRole("heading", { name: "New calculators" })).toBeInTheDocument();
    for (const href of ["/percentage-increase-calculator", "/percentage-of-calculator", "/discount-calculator", "/time-duration-calculator", "/business-days-calculator"]) {
      expect(hrefs).toContain(href);
    }
  });
});
