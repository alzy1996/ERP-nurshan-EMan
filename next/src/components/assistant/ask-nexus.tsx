"use client";

// components/assistant/ask-nexus.tsx
// ============================================================================
// The Ask Nexus chat panel. This is the SKIN — kept simple on purpose so the
// custom UI + animated robot can drop in later. The engine (knowledge, tools,
// Kimi/DeepSeek wiring, free fallback) lives in lib/assistant and does not
// change when the look changes.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Send, Settings2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { askNexus, getConfig, sourceLabel, SUGGESTIONS, type ChatMsg } from "@/lib/assistant";
import { AssistantMascot } from "@/components/assistant/assistant-mascot";
import { Textarea } from "@/components/ui/textarea";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
  note?: string;
  pending?: boolean;
};

/** Tiny renderer: keeps line breaks and turns **bold** into real bold. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <span key={i} className="block">
          {line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
            seg.startsWith("**") && seg.endsWith("**") ? (
              <strong key={j}>{seg.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{seg}</span>
            )
          )}
        </span>
      ))}
    </>
  );
}

export function AskNexus({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const perms = usePermissions();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState("Free mode");
  const scrollRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  useEffect(() => setSource(sourceLabel(getConfig())), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const nextId = () => `m${Date.now()}_${counter.current++}`;

  const greeting = useMemo(
    () => `Hi${app.session?.name ? " " + app.session.name.split(" ")[0] : ""} — I'm Ask Nexus. Ask me about the system, or to read your live data.`,
    [app.session?.name]
  );

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const history: ChatMsg[] = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.text }));
    const userMsg: Msg = { id: nextId(), role: "user", text: q };
    const pendingMsg: Msg = { id: nextId(), role: "assistant", text: "", pending: true };
    setMessages((m) => [...m, userMsg, pendingMsg]);
    setBusy(true);
    try {
      const res = await askNexus({
        question: q,
        history,
        session: app.asSession(),
        name: app.session?.name,
        role: perms.role,
        isAdmin: app.isAdmin,
        sites: app.session?.sites || [],
        visibleModules: perms.nav,
        canSee: perms.canSee,
        lang: app.lang,
      });
      setSource(res.source);
      setMessages((m) =>
        m.map((x) =>
          x.id === pendingMsg.id
            ? { ...x, pending: false, text: res.text, source: res.source, note: res.fellBack ? res.note : undefined }
            : x
        )
      );
    } catch {
      setMessages((m) =>
        m.map((x) => (x.id === pendingMsg.id ? { ...x, pending: false, text: "Something went wrong. Please try again." } : x))
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Ask Nexus assistant"
      className="glass-strong animate-panel-in fixed bottom-24 right-6 z-50 flex h-[min(70vh,560px)] w-[min(92vw,384px)] flex-col overflow-hidden rounded-[26px] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <AssistantMascot size={38} thinking={busy} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Ask Nexus</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {busy ? "Thinking…" : source}
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          aria-label="Assistant settings"
          title="Assistant settings"
          className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <Settings2 className="size-4" />
        </Link>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="glass-subtle flex items-start gap-2.5 rounded-2xl p-3 text-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">{greeting}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass-subtle rounded-full px-3 py-1.5 text-xs text-foreground transition-transform hover:-translate-y-px"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "glass-subtle text-foreground"
                )}
              >
                {m.pending ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="size-3.5 animate-spin" /> thinking…
                  </span>
                ) : (
                  <Rich text={m.text} />
                )}
                {m.note ? (
                  <span className="mt-2 flex items-start gap-1.5 border-t border-white/10 pt-2 text-[11px] text-amber-500">
                    <AlertTriangle className="mt-px size-3 shrink-0" /> {m.note}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-white/10 p-3">
        <div className="glass-subtle flex items-end gap-2 rounded-2xl p-1.5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about the system or your data…"
            className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, oklch(0.62 0.19 260), oklch(0.6 0.16 300))" }}
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground">
          Ask Nexus can read data you already have access to. It doesn&apos;t change anything.
        </p>
      </div>
    </div>
  );
}
