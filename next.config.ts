import type { NextConfig } from "next";
import { securityHeaderEntries } from "./lib/security/headers";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return securityHeaderEntries;
  },
};

export default nextConfig;
