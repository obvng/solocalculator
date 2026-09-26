import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://solocalculator.com";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...tools.map(({ slug }) => ({ url: `${base}/${slug}`, changeFrequency: "monthly" as const, priority: .8 })),
  ];
}
