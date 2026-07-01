// lib/recency.ts
// Small shared helpers for organizing collections by date — a quick "by day"
// range filter and a compact date formatter. Used by the Purchase Requests and
// Purchase Orders views (and reusable anywhere with a createdAt timestamp).

export const RANGES: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

const DAY = 86400000;

export function inRange(createdAt: number | undefined, key: string): boolean {
  if (key === "all" || !createdAt) return true;
  const now = Date.now();
  if (key === "today") return new Date(createdAt).toDateString() === new Date().toDateString();
  if (key === "7d") return createdAt >= now - 7 * DAY;
  if (key === "30d") return createdAt >= now - 30 * DAY;
  return true;
}

export function fmtDay(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
