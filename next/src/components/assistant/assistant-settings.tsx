"use client";

// components/assistant/assistant-settings.tsx
// ============================================================================
// Settings → Assistant. Choose the brain:
//   • Free — built-in, no key.
//   • Connect AI — Kimi (Moonshot), DeepSeek, a gatekeeper proxy, or custom.
// The key is stored only on this device. Honest note about the website (CORS).
// ============================================================================
import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getConfig,
  setConfig,
  resetConfig,
  PROVIDERS,
  type AssistantConfig,
  type AssistantProvider,
} from "@/lib/assistant";
import { testAI, AssistantError } from "@/lib/assistant/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssistantMascot } from "@/components/assistant/assistant-mascot";

const PROVIDER_ORDER: AssistantProvider[] = ["grok", "kimi", "claude", "deepseek", "gatekeeper", "custom"];

export function AssistantSettings() {
  const [cfg, setCfg] = useState<AssistantConfig>(() => getConfig());
  const [test, setTest] = useState<{ state: "idle" | "busy" | "ok" | "err"; msg?: string }>({ state: "idle" });
  const [saved, setSaved] = useState(false);

  const provider = PROVIDERS[cfg.provider];

  function patch(next: Partial<AssistantConfig>) {
    setCfg((c) => ({ ...c, ...next }));
    setSaved(false);
    setTest({ state: "idle" });
  }

  function pickProvider(p: AssistantProvider) {
    const preset = PROVIDERS[p];
    patch({ provider: p, endpoint: preset.endpoint, model: preset.model });
  }

  function save() {
    setConfig(cfg);
    setSaved(true);
  }

  function reset() {
    resetConfig();
    setCfg(getConfig());
    setSaved(false);
    setTest({ state: "idle" });
  }

  async function runTest() {
    setTest({ state: "busy" });
    try {
      const reply = await testAI(cfg);
      setTest({ state: "ok", msg: reply.slice(0, 120) });
    } catch (e) {
      setTest({ state: "err", msg: e instanceof AssistantError ? e.message : "Test failed." });
    }
  }

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="glass glass-specular rounded-3xl p-5">
        <div className="flex items-center gap-3">
          <AssistantMascot size={40} />
          <div>
            <h2 className="text-sm font-semibold">Ask Nexus assistant</h2>
            <p className="text-xs text-muted-foreground">
              Answers about the system and reads the data you already have access to.
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => patch({ mode: "free" })}
            className={cn(
              "rounded-2xl border p-3 text-left transition-colors",
              cfg.mode === "free" ? "border-primary bg-primary/10" : "border-white/10 hover:bg-foreground/5"
            )}
          >
            <div className="text-sm font-medium">Free mode</div>
            <div className="text-xs text-muted-foreground">Built-in. No key. Works everywhere.</div>
          </button>
          <button
            onClick={() => patch({ mode: "ai" })}
            className={cn(
              "rounded-2xl border p-3 text-left transition-colors",
              cfg.mode === "ai" ? "border-primary bg-primary/10" : "border-white/10 hover:bg-foreground/5"
            )}
          >
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-3.5 text-primary" /> Connect AI
            </div>
            <div className="text-xs text-muted-foreground">Kimi, DeepSeek or a proxy.</div>
          </button>
        </div>
      </div>

      {/* AI config */}
      {cfg.mode === "ai" ? (
        <div className="glass glass-specular space-y-4 rounded-3xl p-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Provider</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PROVIDER_ORDER.map((p) => (
                <button
                  key={p}
                  onClick={() => pickProvider(p)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    cfg.provider === p ? "border-primary bg-primary/10" : "border-white/10 hover:bg-foreground/5"
                  )}
                >
                  {PROVIDERS[p].label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{provider.note}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Endpoint (chat/completions URL)</label>
            <Input
              value={cfg.endpoint}
              onChange={(e) => patch({ endpoint: e.target.value })}
              placeholder="https://…/v1/chat/completions"
              className="mt-1.5"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Model</label>
            <Input
              value={cfg.model}
              onChange={(e) => patch({ model: e.target.value })}
              placeholder="moonshot-v1-8k"
              className="mt-1.5"
              spellCheck={false}
            />
          </div>

          {provider.needsKey ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground">API key (stored only on this device)</label>
              <Input
                type="password"
                value={cfg.apiKey}
                onChange={(e) => patch({ apiKey: e.target.value })}
                placeholder="sk-…"
                className="mt-1.5"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          ) : null}

          {/* Test result */}
          {test.state !== "idle" ? (
            <div
              className={cn(
                "flex items-start gap-2 rounded-xl px-3 py-2 text-xs",
                test.state === "ok" && "bg-emerald-500/10 text-emerald-500",
                test.state === "err" && "bg-red-500/10 text-red-500",
                test.state === "busy" && "text-muted-foreground"
              )}
            >
              {test.state === "busy" ? <Loader2 className="mt-px size-3.5 animate-spin" /> : null}
              {test.state === "ok" ? <CheckCircle2 className="mt-px size-3.5 shrink-0" /> : null}
              {test.state === "err" ? <XCircle className="mt-px size-3.5 shrink-0" /> : null}
              <span>{test.state === "busy" ? "Testing…" : test.msg}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="glass" className="rounded-full" onClick={runTest} disabled={test.state === "busy" || !cfg.endpoint}>
              Test connection
            </Button>
            <Button className="rounded-full" onClick={save}>
              {saved ? "Saved ✓" : "Save"}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={reset}>
              Reset to Free
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass glass-specular rounded-3xl p-5">
          <p className="text-sm text-muted-foreground">
            Free mode is on. It knows the whole system and can read your live data (counts, pending approvals,
            low stock, reports). Switch to <span className="font-medium text-foreground">Connect AI</span> to add
            free-form answers with your Kimi or DeepSeek key.
          </p>
          <Button className="mt-4 rounded-full" onClick={save}>
            {saved ? "Saved ✓" : "Save"}
          </Button>
        </div>
      )}

      {/* Honesty note */}
      <div className="glass-subtle rounded-3xl p-5 text-xs leading-relaxed text-muted-foreground">
        <p className="font-medium text-foreground">A note on the website vs the apps</p>
        <p className="mt-1">
          A pasted Kimi/DeepSeek key works directly inside the <span className="text-foreground">desktop</span> and{" "}
          <span className="text-foreground">phone</span> apps. On the <span className="text-foreground">website</span>,
          the browser may block the direct call (a rule called CORS). If that happens, deploy the free gatekeeper
          proxy (see <span className="text-foreground">/gatekeeper</span> in the project) and choose the “Gatekeeper”
          provider with its URL — that works on web, desktop and phone, and can hold one key for the whole company.
        </p>
        <p className="mt-2">
          <span className="text-foreground">Claude (Anthropic)</span> is the strongest option and often works on the
          website too, but it&apos;s <span className="text-foreground">paid per use</span> — and a Claude.ai Pro/Max
          subscription is <span className="text-foreground">not</span> the same as an API key. Get an API key (with
          its own billing) from the Anthropic console, or stay on free Kimi.
        </p>
      </div>
    </div>
  );
}
