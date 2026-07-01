"use client";

import { useEffect, useState } from "react";

import { DENSITIES, getDensity, setDensity as persistDensity, type Density } from "@/lib/density";

export function DensityControl({ className }: { className?: string }) {
  const [density, setDensity] = useState<Density>("comfortable");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDensity(getDensity());
  }, []);

  function choose(d: Density) {
    setDensity(d);
    persistDensity(d);
  }

  return (
    <div className={className ?? "glass-subtle flex gap-1 rounded-xl p-1"}>
      {DENSITIES.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => choose(opt.key)}
          title={opt.hint}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            mounted && density === opt.key
              ? "glass glass-specular text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
