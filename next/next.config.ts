import type { NextConfig } from "next";

// Static export is OPT-IN via NEXT_EXPORT=true (used by CI to produce the
// Firebase-hosted build). Normal `next dev` / `next build` stay at root so the
// dev experience is unchanged. Served at /nx (the `next/` folder name is the
// source, so the export is hosted under a sibling path).
const isExport = process.env.NEXT_EXPORT === "true";
const BASE_PATH = "/nx";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  ...(isExport
    ? {
        output: "export",
        basePath: BASE_PATH,
        trailingSlash: true,
        env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
      }
    : {}),
};

export default nextConfig;
