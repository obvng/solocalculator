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
  it("keeps a space between want and to in the main heading", async () => {
    render(await Home());
    const heading = screen.getByRole("heading", { level: 1, name: "What do you want to calculate?" });
    expect(heading.textContent).toBe("What do you want to calculate?");
  });

  it("keeps the popular calculators and adds a separate Tier 1 section", async () => {
    const { container } = render(await Home());
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));

    expect(screen.getByRole("heading", { name: "Popular calculators" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/calculators");
    for (const href of ["/age-calculator", "/percentage-calculator", "/loan-calculator", "/date-calculator", "/unit-converter", "/currency-converter"]) {
      expect(hrefs).toContain(href);
    }

    expect(screen.getByRole("heading", { name: "New calculators" })).toBeInTheDocument();
    expect(hrefs).not.toContain("/percentage-increase-calculator");
    expect(hrefs).not.toContain("/percentage-of-calculator");
    const cardHrefs = [...container.querySelectorAll('a')]
      .filter((link) => link.querySelector('strong'))
      .map((link) => link.getAttribute('href'));
    expect(cardHrefs.length).toBeGreaterThan(0);
    expect(new Set(cardHrefs).size).toBe(cardHrefs.length);
    expect(hrefs.filter((href) => href === "/percentage-calculator")).toHaveLength(1);
    for (const href of ["/percentage-calculator", "/discount-calculator", "/time-duration-calculator", "/business-days-calculator"]) {
      expect(hrefs).toContain(href);
    }
  });
});
