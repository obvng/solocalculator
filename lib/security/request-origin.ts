export class RequestSecurityError extends Error {
  readonly status = 403;
  readonly publicMessage = "Request origin was rejected.";

  constructor() {
    super("untrusted_origin");
    this.name = "RequestSecurityError";
  }
}

interface OriginEnvironment {
  nodeEnv?: string;
  vercelUrl?: string;
  vercelProjectProductionUrl?: string;
}

function vercelOrigin(host: string | undefined) {
  if (!host) return null;
  try {
    return new URL(host.includes("://") ? host : `https://${host}`).origin;
  } catch {
    return null;
  }
}

export function assertTrustedOrigin(request: Request, environment: OriginEnvironment = {}) {
  const originHeader = request.headers.get("origin");
  let suppliedOrigin: string;
  try {
    if (!originHeader || originHeader === "null") throw new Error("missing");
    suppliedOrigin = new URL(originHeader).origin;
    if (suppliedOrigin !== originHeader) throw new Error("non-canonical");
  } catch {
    throw new RequestSecurityError();
  }

  const nodeEnv = environment.nodeEnv ?? process.env.NODE_ENV;
  const trusted = new Set(["https://www.solocalculator.com", "https://solocalculator.com"]);
  const configuredVercelOrigins = [
    vercelOrigin(environment.vercelUrl ?? process.env.VERCEL_URL),
    vercelOrigin(environment.vercelProjectProductionUrl ?? process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ];
  configuredVercelOrigins.forEach((origin) => { if (origin) trusted.add(origin); });

  if (nodeEnv !== "production") trusted.add(new URL(request.url).origin);
  if (!trusted.has(suppliedOrigin)) throw new RequestSecurityError();
}
