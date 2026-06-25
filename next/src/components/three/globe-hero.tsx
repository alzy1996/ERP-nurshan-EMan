"use client";

import dynamic from "next/dynamic";

// WebGL scene is client-only; render a CSS frosted sphere until it loads (and as a fallback).
const GlobeScene = dynamic(() => import("./globe-scene"), {
  ssr: false,
  loading: () => <CssSphere />,
});

function CssSphere() {
  return (
    <div className="grid size-full place-items-center">
      <div className="animate-float-slow relative aspect-square w-[68%]">
        <div
          className="size-full rounded-full"
          style={{
            background:
              "radial-gradient(38% 35% at 35% 28%, #ffffff 0%, rgba(255,255,255,0.4) 24%, transparent 38%)," +
              "radial-gradient(120% 120% at 30% 22%, #f3f7ff 0%, #d7e2f7 38%, #aebdda 72%, #8ea0c4 100%)",
            boxShadow:
              "0 40px 90px -30px rgba(80,110,180,0.55), inset -22px -26px 60px rgba(120,140,190,0.5), inset 14px 16px 40px rgba(255,255,255,0.7)",
          }}
        />
      </div>
    </div>
  );
}

export function GlobeHero({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* Soft glow puddle behind the orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(150,180,255,0.45), rgba(220,200,255,0.25) 45%, transparent 70%)",
        }}
      />
      <GlobeScene />
    </div>
  );
}
