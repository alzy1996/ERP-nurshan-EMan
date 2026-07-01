// lib/density.ts
// ============================================================================
// Interface density / size. The whole UI is built with rem units (Tailwind),
// so scaling the root font-size scales BOTH text and spacing together — that's
// how "Compact" fits more on screen and "Large" makes everything bigger.
// The preference is stored per device (localStorage) and applied before paint
// via DENSITY_INIT_SCRIPT so there is no flash on load.
// ============================================================================

export type Density = "compact" | "comfortable" | "large";

export const DENSITY_KEY = "nexus_density";

const PX: Record<Density, number> = {
  compact: 14,
  comfortable: 16,
  large: 18,
};

export const DENSITIES: { key: Density; label: string; hint: string }[] = [
  { key: "compact", label: "Compact", hint: "More on screen" },
  { key: "comfortable", label: "Comfortable", hint: "Default" },
  { key: "large", label: "Large", hint: "Bigger text" },
];

export function densityPx(d: Density): number {
  return PX[d] ?? PX.comfortable;
}

export function getDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  const v = window.localStorage.getItem(DENSITY_KEY) as Density | null;
  return v && v in PX ? v : "comfortable";
}

export function applyDensity(d: Density) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = `${densityPx(d)}px`;
}

export function setDensity(d: Density) {
  if (typeof window !== "undefined") window.localStorage.setItem(DENSITY_KEY, d);
  applyDensity(d);
}

// Runs before first paint (inlined in the root layout) so the saved size is
// applied with no flash. Kept in sync with PX above.
export const DENSITY_INIT_SCRIPT = `
try {
  var d = localStorage.getItem('${DENSITY_KEY}');
  var px = d === 'compact' ? 14 : d === 'large' ? 18 : 16;
  document.documentElement.style.fontSize = px + 'px';
} catch (e) {}
`;
