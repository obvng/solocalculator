import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tools } from "@/lib/tools/catalog";
import CalculatorsPage from "./page";

describe("calculator directory", () => {
  it("links to every calculator page", () => {
    const { container } = render(<CalculatorsPage />);
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
    for (const tool of tools) expect(hrefs).toContain(`/${tool.slug}`);
    const directoryHrefs = [...container.querySelectorAll('[aria-label="Calculator directory"] a')].map((link) => link.getAttribute("href"));
    expect(directoryHrefs).toHaveLength(tools.length);
    expect(new Set(directoryHrefs).size).toBe(directoryHrefs.length);
    expect(screen.getByRole("heading", { name: "All calculators" })).toBeInTheDocument();
  });

  it("does not link to the retired singular calculator URL", () => {
    const { container } = render(<CalculatorsPage />);
    expect(container.querySelector('a[href="/calculator"]')).not.toBeInTheDocument();
  });
});
