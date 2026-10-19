import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Strict integrity: TypeScript and lint errors must never be silently
  // ignored at build time (risk R-12 remediation — no green-by-suppression).
  reactStrictMode: true,
};

export default nextConfig;
