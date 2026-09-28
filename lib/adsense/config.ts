export interface AdSenseConfig { publisherId: string; code: string; enabled: boolean }

const publisherPattern = /^ca-pub-[0-9]+$/;
const loaderPattern = /^<script\b(?=[^>]*\basync\b)(?=[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=(ca-pub-[0-9]+)["'])(?=[^>]*\bcrossorigin=["']anonymous["'])[^>]*>\s*<\/script>$/i;

export function normalizeAdSenseInput(input: AdSenseConfig): AdSenseConfig {
  const publisherId = input.publisherId.trim();
  const code = input.code.trim();
  if (!input.enabled && !publisherId && !code) return { publisherId: "", code: "", enabled: false };
  const match = code.match(loaderPattern);
  const extracted = match?.[1] ?? "";
  const normalizedId = publisherId || extracted;
  if (!publisherPattern.test(normalizedId) || (code && !match) || (publisherId && extracted && publisherId !== extracted)) {
    throw new Error("Paste the official Google AdSense code or enter a valid ca-pub ID.");
  }
  return { publisherId: normalizedId, code, enabled: input.enabled };
}
