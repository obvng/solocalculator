export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel><title>SoloCalculator</title><link>https://solocalculator.com</link><description>Helpful calculators for everyday life.</description><language>en</language></channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
