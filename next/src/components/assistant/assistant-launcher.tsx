"use client";

// components/assistant/assistant-launcher.tsx
// ============================================================================
// The floating Ask Nexus button + panel. The button is DRAGGABLE — grab it and
// drop it anywhere; its position is remembered per device. A quick tap/click
// (no drag) opens the chat. The panel opens anchored next to the button.
// ============================================================================
import { useEffect, useRef, useState } from "react";

import { useApp } from "@/context/app-context";
import { AssistantMascot } from "@/components/assistant/assistant-mascot";
import { AskNexus } from "@/components/assistant/ask-nexus";

const POS_KEY = "nexus_assistant_pos";
const BTN = 48; // button size (px)

type Pos = { left: number; top: number };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Where to open the panel relative to the button — above if there's room,
// else below; kept fully on-screen.
function panelPlacement(pos: Pos): { left: number; top: number } {
  const w = Math.min(window.innerWidth * 0.93, 392);
  const h = Math.min(window.innerHeight * 0.72, 580);
  let top = pos.top - 12 - h; // prefer above the button
  if (top < 8) top = pos.top + BTN + 12; // otherwise below
  top = clamp(top, 8, window.innerHeight - h - 8);
  const left = clamp(pos.left + BTN - w, 8, window.innerWidth - w - 8); // right-align to button
  return { left, top };
}

export function AssistantLauncher() {
  const { session } = useApp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null); // null = default bottom-right
  const btnRef = useRef<HTMLButtonElement>(null);

  // Restore saved position.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) setPos(JSON.parse(raw));
    } catch {}
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!session) return null;

  function onPointerDown(e: React.PointerEvent) {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const start = { px: e.clientX, py: e.clientY, ox: rect.left, oy: rect.top };
    let moved = false;
    let last: Pos = { left: rect.left, top: rect.top };
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.px;
      const dy = ev.clientY - start.py;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) {
        last = {
          left: clamp(start.ox + dx, 8, window.innerWidth - BTN - 8),
          top: clamp(start.oy + dy, 8, window.innerHeight - BTN - 8),
        };
        setPos(last);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) {
        setOpen((o) => !o);
      } else {
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(last));
        } catch {}
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const wrapperStyle: React.CSSProperties = pos
    ? { left: pos.left, top: pos.top }
    : { right: 24, bottom: 24 };

  return (
    <>
      <div className="fixed z-40" style={wrapperStyle}>
        <button
          ref={btnRef}
          onPointerDown={onPointerDown}
          aria-label="Ask Nexus assistant — drag to move, tap to open"
          aria-expanded={open}
          title="Ask Nexus (drag to move)"
          className="glass glass-specular grid size-12 cursor-grab touch-none place-items-center rounded-2xl transition-transform hover:-translate-y-0.5 active:cursor-grabbing"
          style={{ boxShadow: "0 0 0 1.5px rgba(0,229,255,0.4), 0 8px 22px rgba(0,150,220,0.28)" }}
        >
          <AssistantMascot size={34} thinking={open} />
        </button>
      </div>
      {open ? <AskNexus onClose={() => setOpen(false)} pos={pos ? panelPlacement(pos) : undefined} /> : null}
    </>
  );
}
