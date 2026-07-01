"use client";

// components/assistant/assistant-mascot.tsx
// ============================================================================
// The LIVE Ask Nexus mascot — the little construction-bunny robot.
// It plays the exact behaviour from the Stitch animation: an idle "look around"
// (left → centre → right → centre) plus a "surprised" face on hover. When the
// assistant is thinking it looks around faster.
//
// DROP-IN ART: put four transparent PNGs (or WebP) in next/public/assistant/ :
//     robot-center.png   robot-left.png   robot-right.png   robot-surprised.png
// Until those files exist it shows a friendly glowing orb, so nothing is broken;
// the moment the art is added it upgrades automatically — no code change.
// (To use .webp instead, change EXT below.)
// ============================================================================
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const EXT = "png";
const BASE = "/assistant/robot-";
type Pose = "center" | "left" | "right" | "surprised";
const POSES: Pose[] = ["center", "left", "right", "surprised"];
const LOOK = ["left", "center", "right", "center"] as Pose[];

export function AssistantMascot({
  size = 40,
  thinking = false,
  className,
}: {
  size?: number;
  thinking?: boolean;
  className?: string;
}) {
  const [ready, setReady] = useState(false); // real art loaded → show robot
  const [pose, setPose] = useState<Pose>("center");
  const [fade, setFade] = useState(false);
  const hovered = useRef(false);

  // Preload the four poses; only switch to robot mode once "center" loads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let live = true;
    POSES.forEach((p) => {
      const img = new window.Image();
      img.src = `${BASE}${p}.${EXT}`;
      if (p === "center") img.onload = () => live && setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // Idle "look around" loop (faster while thinking). Skipped while hovered.
  useEffect(() => {
    if (!ready) return;
    let i = 0;
    const period = thinking ? 1200 : 3200;
    const id = window.setInterval(() => {
      if (hovered.current) return;
      i = (i + 1) % LOOK.length;
      setFade(true);
      window.setTimeout(() => {
        if (!hovered.current) setPose(LOOK[i]);
        setFade(false);
      }, 240);
    }, period);
    return () => window.clearInterval(id);
  }, [ready, thinking]);

  const onEnter = () => {
    hovered.current = true;
    setFade(true);
    window.setTimeout(() => {
      setPose("surprised");
      setFade(false);
    }, 120);
  };
  const onLeave = () => {
    hovered.current = false;
    setFade(true);
    window.setTimeout(() => {
      setPose("center");
      setFade(false);
    }, 120);
  };

  return (
    <span
      aria-hidden
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {/* neon-blue aura */}
      <span
        className={cn("absolute inset-0 rounded-full blur-md", thinking ? "animate-ping" : "animate-pulse")}
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.55), transparent 70%)" }}
      />
      {ready ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic pose swap; next/image doesn't fit a static export mascot
        <img
          src={`${BASE}${pose}.${EXT}`}
          alt=""
          draggable={false}
          className="assistant-orb relative size-full object-contain transition-opacity duration-200"
          style={{ opacity: fade ? 0 : 1 }}
        />
      ) : (
        // Fallback orb (until the robot art is dropped in).
        <span
          className="assistant-orb relative rounded-full"
          style={{
            width: size * 0.72,
            height: size * 0.72,
            background: "linear-gradient(135deg, oklch(0.72 0.15 210), oklch(0.6 0.16 260))",
            boxShadow: "inset 0 2px 6px rgba(255,255,255,0.5), 0 4px 14px rgba(0,150,220,0.45)",
          }}
        >
          <span className="absolute left-[26%] top-[38%] size-[10%] rounded-full bg-white/90" />
          <span className="absolute right-[26%] top-[38%] size-[10%] rounded-full bg-white/90" />
          <span className="absolute bottom-[26%] left-1/2 h-[8%] w-[34%] -translate-x-1/2 rounded-full border-b-2 border-white/80" />
        </span>
      )}
    </span>
  );
}
