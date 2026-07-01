// lib/assistant/config.ts
// ============================================================================
// Where the assistant gets its "brain". Two modes:
//   • free  — the built-in rules brain (no key, works everywhere, offline-ish).
//   • ai    — a real model (Kimi/Moonshot, DeepSeek, or a gatekeeper proxy).
//
// The key is stored ONLY on this device (localStorage) — it is never sent to our
// servers (we don't have any; the site is static). Honesty about the browser:
// calling Kimi/DeepSeek directly from the WEBSITE may be blocked by the browser's
// CORS rule. It works in the desktop & phone apps; for the website, point the
// endpoint at the tiny free "gatekeeper" proxy (see /gatekeeper) which adds the
// missing header and can hold the key for the whole company.
// ============================================================================

export type AssistantMode = "free" | "ai";
export type AssistantProvider = "grok" | "kimi" | "claude" | "deepseek" | "gatekeeper" | "custom";

export type AssistantConfig = {
  mode: AssistantMode;
  provider: AssistantProvider;
  endpoint: string; // full chat/completions URL
  model: string;
  apiKey: string; // device-only
};

export const PROVIDERS: Record<
  AssistantProvider,
  { label: string; endpoint: string; model: string; needsKey: boolean; note: string }
> = {
  grok: {
    label: "Grok (xAI)",
    endpoint: "https://api.x.ai/v1/chat/completions",
    model: "grok-4",
    needsKey: true,
    note: "OpenAI-compatible. Paid per use. Works in the desktop & phone apps; on the website use the gatekeeper (CORS). Change the model if grok-4 isn't on your plan (e.g. grok-3).",
  },
  kimi: {
    label: "Kimi (Moonshot)",
    endpoint: "https://api.moonshot.ai/v1/chat/completions",
    model: "moonshot-v1-8k",
    needsKey: true,
    note: "Free tier. Works in the desktop & phone apps. On the website the browser may block it (CORS) — use the gatekeeper there.",
  },
  claude: {
    label: "Claude (Anthropic)",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-opus-4-8",
    needsKey: true,
    note: "The strongest model, but paid (cheapest is claude-haiku-4-5). Works in the apps and often on the website too (Claude allows browser calls).",
  },
  deepseek: {
    label: "DeepSeek",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    needsKey: true,
    note: "Works in the desktop & phone apps. On the website the browser may block it (CORS) — use the gatekeeper there.",
  },
  gatekeeper: {
    label: "Gatekeeper proxy (works on the website too)",
    endpoint: "",
    model: "moonshot-v1-8k",
    needsKey: false,
    note: "Paste your free Cloudflare Worker URL. It holds the key for everyone and works on web, desktop and phone.",
  },
  custom: {
    label: "Custom (OpenAI-compatible)",
    endpoint: "",
    model: "",
    needsKey: true,
    note: "Any endpoint that accepts the OpenAI chat/completions format.",
  },
};

const KEY = "nexus_assistant_cfg";

const DEFAULT: AssistantConfig = {
  mode: "free",
  provider: "grok",
  endpoint: PROVIDERS.grok.endpoint,
  model: PROVIDERS.grok.model,
  apiKey: "",
};

export function getConfig(): AssistantConfig {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<AssistantConfig>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return { ...DEFAULT };
  }
}

export function setConfig(cfg: AssistantConfig) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function resetConfig() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}

/** Is the AI brain actually usable (mode on + endpoint + key when required)? */
export function isAIReady(cfg: AssistantConfig): boolean {
  if (cfg.mode !== "ai") return false;
  if (!cfg.endpoint) return false;
  const needsKey = PROVIDERS[cfg.provider]?.needsKey ?? true;
  return needsKey ? !!cfg.apiKey : true;
}

/** Friendly source label for the panel badge. */
export function sourceLabel(cfg: AssistantConfig): string {
  return isAIReady(cfg) ? PROVIDERS[cfg.provider]?.label || "AI" : "Free mode";
}

/** Claude uses the Anthropic Messages API shape, not the OpenAI one. */
export function isAnthropic(cfg: AssistantConfig): boolean {
  return cfg.provider === "claude" || /anthropic\.com/i.test(cfg.endpoint);
}
