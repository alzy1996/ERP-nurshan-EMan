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
        className="glass glass-specular grid size-12 place-items-center rounded-2xl transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: "0 0 0 1.5px rgba(0,229,255,0.4), 0 8px 22px rgba(0,150,220,0.28)" }}
      >
        <AssistantMascot size={34} thinking={open} />
      </button>
      {open ? <AskNexus onClose={() => setOpen(false)} /> : null}
    </>
  );
}
