import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("calculator page rendering mode", () => {
  it("server-renders tool pages at request time instead of querying the database during the build", () => {
    const source = readFileSync("app/[slug]/page.tsx", "utf8");
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).not.toContain("generateStaticParams");
  });
});
