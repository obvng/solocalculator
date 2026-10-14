import { describe, expect, it } from "vitest";
import { getDefaultPageSeo } from "@/lib/seo/defaults";
import { toolBySlug, tools } from "./catalog";

const expected = [
  ["percentage-increase-calculator", "Percentage Increase Calculator: Work Out % Change", "coral"],
  ["percentage-of-calculator", "Percentage Calculator: What Percent of What Number", "blue"],
  ["discount-calculator", "Discount Calculator: Sale Price and How Much You Save", "yellow"],
  ["time-duration-calculator", "Time Duration Calculator: Hours Between Two Times", "lilac"],
  ["business-days-calculator", "Business Days Calculator: Working Days Between Dates", "mint"],
] as const;

describe("Tier 1 tool catalog", () => {
  it.each(expected)("registers %s with its approved metadata", (slug, title, accent) => {
    const tool = toolBySlug.get(slug);

    expect(tool).toEqual(expect.objectContaining({ slug, title, accent }));
    expect(tool?.description.trim().length).toBeGreaterThan(40);
    expect(tool?.intro.trim().length).toBeGreaterThan(40);
    expect(tool?.example("2026-10-14").startsWith("Example:")).toBe(true);
    expect(tool?.relatedSlugs).toHaveLength(3);
    expect(getDefaultPageSeo(slug).title).toBe(title);
  });

  it("keeps every related calculator valid and different from its source", () => {
    for (const tool of tools) {
      for (const relatedSlug of tool.relatedSlugs) {
        expect(relatedSlug).not.toBe(tool.slug);
        expect(toolBySlug.has(relatedSlug)).toBe(true);
      }
    }
  });
});
