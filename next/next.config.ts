import type { NextConfig } from "next";

// Static export is OPT-IN via NEXT_EXPORT=true (used by CI to produce the
// Firebase-hosted build). Normal `next dev` / `next build` stay unchanged.
//
// The app is now served at the SITE ROOT (basePath empty). Set NEXT_BASE_PATH
// to host it under a sub-path again (e.g. "/nx") if ever needed.
const isExport = process.env.NEXT_EXPORT === "true";
const BASE_PATH = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isExport
    ? {
        output: "export",
        trailingSlash: true,
        ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
        env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
      }
    : {}),
};

export default nextConfig;
