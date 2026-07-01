"use client";

// components/assistant/assistant-launcher.tsx
// ============================================================================
// The floating Ask Nexus button + panel. Mounted in the dashboard layout in
// place of the old (dead) AI button. Only shows when someone is signed in.
// ============================================================================
import { useEffect, useState } from "react";

import { useApp } from "@/context/app-context";
import { AssistantMascot } from "@/components/assistant/assistant-mascot";
import { AskNexus } from "@/components/assistant/ask-nexus";

export function AssistantLauncher() {
  const { session } = useApp();
  const [open, setOpen] = useState(false);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!session) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Ask Nexus assistant"
        aria-expanded={open}
        title="Ask Nexus"
        className="glass-specular grid size-12 place-items-center rounded-2xl text-white shadow-lg transition-transform hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg, oklch(0.62 0.19 260), oklch(0.6 0.16 300))" }}
      >
        <AssistantMascot size={30} thinking={open} />
      </button>
      {open ? <AskNexus onClose={() => setOpen(false)} /> : null}
    </>
  );
}
