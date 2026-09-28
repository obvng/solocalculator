import { serializeJsonLd } from "@/lib/seo/schema";

export function JsonLd({ records }: { records: Array<Record<string, unknown>> }) {
  if (!records.length) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(records) }} />;
}
