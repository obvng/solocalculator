import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tools } from "@/lib/tools/catalog";
import CalculatorsPage from "./page";

describe("calculator directory", () => {
  it("links to every calculator page", () => {
    const { container } = render(<CalculatorsPage />);
    const hrefs = [...container.querySelectorAll("a")].map((link) => link.getAttribute("href"));
    for (const tool of tools) expect(hrefs).toContain(`/${tool.slug}`);
    expect(screen.getByRole("heading", { name: "All calculators" })).toBeInTheDocument();
  });
});
