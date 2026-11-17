import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  distDir: process.env.SMENA_E2E === "1" ? ".next-e2e" : ".next",
  devIndicators: false,
};
export default config;
