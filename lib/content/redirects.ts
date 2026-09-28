import type { RedirectRecord } from "./types";

const isInternalPath = (value: string) => /^\/(?!\/)[^\s]*$/.test(value);
const isHttpsUrl = (value: string) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };

export function validateRedirectGraph(redirects: RedirectRecord[]) {
  const enabled = redirects.filter((redirect) => redirect.enabled);
  const sources = new Set<string>();
  for (const redirect of enabled) {
    if (!isInternalPath(redirect.sourcePath)) throw new Error("A redirect source must be a site path.");
    if (!isInternalPath(redirect.destination) && !isHttpsUrl(redirect.destination)) throw new Error("A redirect destination must be a site path or HTTPS URL.");
    if (sources.has(redirect.sourcePath)) throw new Error(`Duplicate redirect source: ${redirect.sourcePath}`);
    sources.add(redirect.sourcePath);
  }
  const bySource = new Map(enabled.map((redirect) => [redirect.sourcePath, redirect]));
  for (const start of enabled) {
    const visited = new Set<string>(); let current: RedirectRecord | undefined = start;
    while (current && isInternalPath(current.destination)) {
      if (visited.has(current.sourcePath)) throw new Error(`Redirect loop found at ${current.sourcePath}.`);
      visited.add(current.sourcePath); current = bySource.get(current.destination);
    }
  }
  return true;
}

export function resolveRedirect(pathname: string, redirects: RedirectRecord[]) {
  validateRedirectGraph(redirects);
  const bySource = new Map(redirects.filter((redirect) => redirect.enabled).map((redirect) => [redirect.sourcePath, redirect]));
  let current = bySource.get(pathname); if (!current) return null;
  while (isInternalPath(current.destination) && bySource.has(current.destination)) current = bySource.get(current.destination)!;
  return { destination: current.destination, permanent: current.statusCode === 301 || current.statusCode === 308, statusCode: current.statusCode };
}
