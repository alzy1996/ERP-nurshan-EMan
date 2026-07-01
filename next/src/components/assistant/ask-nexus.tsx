"use client";

// components/assistant/ask-nexus.tsx
// ============================================================================
// The Ask Nexus chat panel. "Neon Kinetic" glass look, with a user-chosen SIZE
// and COLOUR theme (quick picker in the header, or Settings → Assistant). The
// live robot mascot sits in the header; a mic lets the user speak; and the
// assistant can OPEN screens (navigate) on request. The engine lives in
// lib/assistant and doesn't change with the skin.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Mic, Palette, RefreshCw, Send, Settings2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { askNexus, getConfig, sourceLabel, SUGGESTIONS, type ChatMsg } from "@/lib/assistant";
import {
  getSize,
  getTheme,
  onStyleChange,
  setSize as saveSize,
  setThemeKey,
  SIZES,
  THEMES,
  type ChatSize,
  type ChatTheme,
} from "@/lib/assistant/chat-style";
import { AssistantMascot } from "@/components/assistant/assistant-mascot";
import { Textarea } from "@/components/ui/textarea";

const FONT = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';

// Speak-to-it (browser speech recognition). Language follows the app language.
const SPEECH_LANG: Record<string, string> = { en: "en-US", ar: "ar-SA", tr: "tr-TR", fa: "fa-IR" };
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { length: number; [i: number]: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecCtor = new () => SpeechRec;

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

export function AskNexus({ onClose, pos }: { onClose: () => void; pos?: { left: number; top: number } }) {
  const app = useApp();
  const perms = usePermissions();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [source, setSource] = useState("Free mode");
  const scrollRef = useRef<HTMLDivElement>(null);
  const counter = useRef(0);
  const [listening, setListening] = useState(false);
  const [micOK, setMicOK] = useState(false);
  const recogRef = useRef<SpeechRec | null>(null);

  // Appearance (size + colour theme), live-updating.
  const [theme, setThemeState] = useState<ChatTheme>(() => getTheme());
  const [size, setSizeState] = useState<ChatSize>(() => getSize());
  const [showAppearance, setShowAppearance] = useState(false);
  useEffect(
    () =>
      onStyleChange(() => {
        setThemeState(getTheme());
        setSizeState(getSize());
      }),
    []
  );

  // Detect speech-recognition support; stop it if the panel closes.
  useEffect(() => {
    const W = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
    setMicOK(!!(W.SpeechRecognition || W.webkitSpeechRecognition));
    return () => {
      try {
        recogRef.current?.stop();
      } catch {}
    };
  }, []);

  function toggleMic() {
    if (listening) {
      try {
        recogRef.current?.stop();
      } catch {}
      setListening(false);
      return;
    }
    const W = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = SPEECH_LANG[app.lang] || "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  // Load the Plus Jakarta Sans font once.
  useEffect(() => {
    const id = "nexus-font-jakarta";
    if (typeof document !== "undefined" && !document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id;
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => setSource(sourceLabel(getConfig())), []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const nextId = () => `m${Date.now()}_${counter.current++}`;

  const greeting = useMemo(
    () => `Hi${app.session?.name ? " " + app.session.name.split(" ")[0] : ""} — I'm Ask Nexus. Ask me anything, or tell me to open a screen.`,
    [app.session?.name]
  );

  // Derived theme colours (8-digit hex = colour + alpha).
  const accent = theme.accent;
  const ring = `${accent}73`;
  const chipBorder = `${accent}59`;
  const aiBorder = `${accent}33`;
  const userBg = `linear-gradient(135deg, ${theme.from}, ${theme.to})`;
  const userShadow = `0 6px 18px ${theme.to}47`;
  const dim = SIZES[size];

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
        navigate: (route) => router.push(route),
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
      className={cn(
        "glass-strong animate-panel-in fixed z-50 flex flex-col overflow-hidden rounded-[28px]",
        !pos && "bottom-24 right-6"
      )}
      style={{
        fontFamily: FONT,
        width: `min(93vw, ${dim.w}px)`,
        height: `min(80vh, ${dim.h}px)`,
        boxShadow: `0 24px 70px ${accent}1f, 0 10px 34px rgba(20,20,40,0.28)`,
        ...(pos ? { left: pos.left, top: pos.top } : {}),
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <AssistantMascot size={40} thinking={busy} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight">Ask Nexus</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 6px ${accent}`, animation: "orb-breathe 1.6s ease-in-out infinite" }}
            />
            {busy ? "Thinking…" : source}
          </div>
        </div>
        <button
          onClick={() => setShowAppearance((v) => !v)}
          aria-label="Chat size & colour"
          title="Size & colour"
          className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <Palette className="size-4" />
        </button>
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

      {/* Appearance quick picker */}
      {showAppearance ? (
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.key}
                onClick={() => setThemeKey(t.key)}
                aria-label={t.label}
                title={t.label}
                className="size-6 rounded-full transition-transform hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${t.accent}, ${t.to})`,
                  outline: t.key === theme.key ? `2px solid ${t.accent}` : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {(Object.keys(SIZES) as ChatSize[]).map((k) => (
              <button
                key={k}
                onClick={() => saveSize(k)}
                className={cn(
                  "grid size-7 place-items-center rounded-lg text-xs font-semibold uppercase transition-colors",
                  k === size ? "text-white" : "text-muted-foreground hover:bg-foreground/5"
                )}
                style={k === size ? { background: accent } : {}}
                title={SIZES[k].label}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="glass-subtle flex items-start gap-2.5 rounded-2xl rounded-bl-md p-3 text-sm" style={{ borderColor: aiBorder }}>
              <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
              <p className="text-muted-foreground">{greeting}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass-subtle rounded-full px-3 py-1.5 text-xs font-medium transition-transform hover:-translate-y-px"
                  style={{ color: accent, border: `1px solid ${chipBorder}` }}
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
                  "max-w-[86%] whitespace-pre-wrap px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "rounded-2xl rounded-br-md text-white" : "glass-subtle rounded-2xl rounded-bl-md text-foreground"
                )}
                style={m.role === "user" ? { background: userBg, boxShadow: userShadow } : { borderColor: aiBorder }}
              >
                {m.pending ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="size-3.5 animate-spin" style={{ color: accent }} /> thinking…
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
        <div
          className="glass-subtle flex items-end gap-2 rounded-2xl p-1.5 transition-shadow"
          style={focused ? { boxShadow: `0 0 0 2px ${ring}` } : {}}
        >
          {micOK ? (
            <button
              onClick={toggleMic}
              aria-label={listening ? "Stop listening" : "Speak"}
              title={listening ? "Stop" : "Speak in any language"}
              className="grid size-9 shrink-0 place-items-center rounded-xl transition-colors"
              style={
                listening
                  ? { background: "#ef4444", color: "#fff", animation: "orb-breathe 1s ease-in-out infinite" }
                  : { color: accent }
              }
            >
              <Mic className="size-4" />
            </button>
          ) : null}
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask, or say “open suppliers”…"
            className="max-h-28 min-h-9 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            style={{ fontFamily: FONT }}
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:opacity-40"
            style={{ background: userBg }}
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-center text-[10px] text-muted-foreground">
          Ask Nexus reads your data &amp; opens screens — it won&apos;t change your records.
        </p>
      </div>
    </div>
  );
}
