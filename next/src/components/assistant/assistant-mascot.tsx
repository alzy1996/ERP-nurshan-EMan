"use client";

// components/assistant/assistant-mascot.tsx
// ============================================================================
// SWAPPABLE MASCOT SLOT.
// This is a placeholder "live" orb so the assistant already feels alive today.
// When the custom moving/waving robot art arrives, replace ONLY the inside of
// this component (e.g. a Lottie <Player>, an animated <img> GIF/WebP, or a
// <video> loop). Nothing else in the app needs to change — the size + `thinking`
// props stay the same.
//   Lottie:  npm i @lottiefiles/react-lottie-player  → <Player autoplay loop src={...} />
//   GIF/WebP: <img src="/assistant/robot.webp" className="size-full" alt="" />
//   Video:    <video autoPlay loop muted playsInline className="size-full" .../>
// ============================================================================
import { cn } from "@/lib/utils";

export function AssistantMascot({
  size = 40,
  thinking = false,
  className,
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {/* soft aura */}
      <span
        className={cn(
          "absolute inset-0 rounded-full blur-md",
          thinking ? "animate-ping" : "animate-pulse"
        )}
        style={{ background: "radial-gradient(circle, rgba(139,120,247,0.65), transparent 70%)" }}
      />
      {/* the orb — gentle float/breathe */}
      <span
        className="assistant-orb relative rounded-full"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          background: "linear-gradient(135deg, oklch(0.66 0.19 285), oklch(0.6 0.16 305))",
          boxShadow: "inset 0 2px 6px rgba(255,255,255,0.45), 0 4px 14px rgba(90,60,220,0.45)",
        }}
      >
        {/* two "eyes" so it reads as a friendly bot */}
        <span className="absolute left-[26%] top-[38%] size-[10%] rounded-full bg-white/90" />
        <span className="absolute right-[26%] top-[38%] size-[10%] rounded-full bg-white/90" />
        {/* little smile */}
        <span className="absolute bottom-[26%] left-1/2 h-[8%] w-[34%] -translate-x-1/2 rounded-full border-b-2 border-white/80" />
      </span>
    </span>
  );
}
