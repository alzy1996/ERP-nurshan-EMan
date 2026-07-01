"use client";

import { LayoutGrid, List } from "lucide-react";

import { RANGES } from "@/lib/recency";

/** Quick "by day" date-range chips (All / Today / 7 days / 30 days). */
export function RangeChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="glass-subtle flex gap-1 rounded-full p-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value === r.key
              ? "glass glass-specular text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export type ViewMode = "grid" | "list";

/** Grid/Board ↔ List density toggle. */
export function ViewToggle({
  value,
  onChange,
  gridLabel = "Grid",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  gridLabel?: string;
}) {
  return (
    <div className="glass-subtle flex gap-1 rounded-full p-1">
      <button
        type="button"
        aria-label={gridLabel}
        title={gridLabel}
        onClick={() => onChange("grid")}
        className={`grid size-7 place-items-center rounded-full transition ${
          value === "grid"
            ? "glass glass-specular text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        aria-label="List"
        title="List"
        onClick={() => onChange("list")}
        className={`grid size-7 place-items-center rounded-full transition ${
          value === "list"
            ? "glass glass-specular text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="size-4" />
      </button>
    </div>
  );
}

/** Read/write a per-page view preference from localStorage (SSR-safe). */
export function loadView(key: string, fallback: ViewMode = "grid"): ViewMode {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return v === "grid" || v === "list" ? v : fallback;
}

export function saveView(key: string, v: ViewMode) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, v);
}
