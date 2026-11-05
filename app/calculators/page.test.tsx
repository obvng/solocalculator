import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tools } from "@/lib/tools/catalog";
import { getDefaultPageSeo } from "@/lib/seo/defaults";
vi.mock("@/lib/content/repository", () => ({
  getPageSeo: vi.fn(async () => ({ ...getDefaultPageSeo("calculators"), title: "All Calculators: Age, Percentage, Loan, Date and More", description: "The description saved through the admin." })),
  getPublicSettings: vi.fn(async () => null),
}));
import CalculatorsPage, { generateMetadata } from "./page";

describe("calculator directory", () => {
  it("uses the saved directory SEO rather than hardcoded metadata", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe("All Calculators: Age, Percentage, Loan, Date and More");
    expect(metadata.description).toBe("The description saved through the admin.");
    expect(metadata.alternates?.canonical).toBe("https://www.solocalculator.com/calculators");
  });
  it("links to every calculator page", () => {
    const { container } = render(<CalculatorsPage />);
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
    for (const tool of tools) expect(hrefs).toContain(`/${tool.slug}`);
    const directoryHrefs = [...container.querySelectorAll('[aria-label="Calculator directory"] a')].map((link) => link.getAttribute("href"));
    expect(directoryHrefs).toHaveLength(tools.length);
    expect(new Set(directoryHrefs).size).toBe(directoryHrefs.length);
    expect(screen.getByRole("heading", { name: "All calculators" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    const schemas = JSON.parse(container.querySelector('script[type="application/ld+json"]')!.textContent!);
    expect(schemas.map((record: { "@type": string }) => record["@type"])).toEqual(["CollectionPage", "BreadcrumbList"]);
  });

  it("does not link to the retired singular calculator URL", () => {
    const { container } = render(<CalculatorsPage />);
    expect(container.querySelector('a[href="/calculator"]')).not.toBeInTheDocument();
  });
});
