// lib/assistant/chat-style.ts
// ============================================================================
// Look of the Ask Nexus chat — the user can pick a SIZE and a COLOUR theme.
// Stored per device; changing it fires a "nexus-chat-style" event so an open
// panel restyles live.
// ============================================================================

export type ChatSize = "s" | "m" | "l";

export const SIZES: Record<ChatSize, { label: string; w: number; h: number }> = {
  s: { label: "Small", w: 340, h: 500 },
  m: { label: "Medium", w: 392, h: 580 },
  l: { label: "Large", w: 460, h: 680 },
};

export type ChatTheme = {
  key: string;
  label: string;
  accent: string; // bright — AI accents, status dot, chips, mic, mascot aura
  from: string; // user-bubble gradient start
  to: string; // user-bubble gradient end
};

// The first entry (kinetic) preserves the current Neon-Kinetic look.
export const THEMES: ChatTheme[] = [
  { key: "kinetic", label: "Kinetic", accent: "#00e3fd", from: "#ff7043", to: "#ac3509" },
  { key: "ocean", label: "Ocean", accent: "#00e3fd", from: "#0891b2", to: "#075985" },
  { key: "sunset", label: "Sunset", accent: "#ff9a3c", from: "#ff7043", to: "#ac3509" },
  { key: "violet", label: "Violet", accent: "#a78bfa", from: "#7c5cf0", to: "#4c2fb0" },
  { key: "emerald", label: "Emerald", accent: "#34d399", from: "#0ea371", to: "#076046" },
  { key: "rose", label: "Rose", accent: "#fb7185", from: "#f43f6e", to: "#b01e4b" },
];

const SIZE_KEY = "nexus_chat_size";
const THEME_KEY = "nexus_chat_theme";
export const STYLE_EVENT = "nexus-chat-style";

export function getSize(): ChatSize {
  if (typeof window === "undefined") return "m";
  const v = window.localStorage.getItem(SIZE_KEY) as ChatSize | null;
  return v && v in SIZES ? v : "m";
}

export function themeFor(key: string | null | undefined): ChatTheme {
  return THEMES.find((t) => t.key === key) || THEMES[0];
}

export function getTheme(): ChatTheme {
  if (typeof window === "undefined") return THEMES[0];
  return themeFor(window.localStorage.getItem(THEME_KEY));
}

function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STYLE_EVENT));
}

export function setSize(s: ChatSize) {
  if (typeof window !== "undefined") window.localStorage.setItem(SIZE_KEY, s);
  announce();
}

export function setThemeKey(key: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, key);
  announce();
}

/** Subscribe an open panel to live style changes. Returns an unsubscribe fn. */
export function onStyleChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(STYLE_EVENT, cb);
  return () => window.removeEventListener(STYLE_EVENT, cb);
}
