"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

import { fetchScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";

type Kpis = {
  suppliers: number;
  materials: number;
  openOffers: number;
  requests: number;
  requestValue: number;
};

type Offer = { id: string; status?: string };
type Pr = { id: string; amount?: number };

const ZERO: Kpis = {
  suppliers: 0,
  materials: 0,
  openOffers: 0,
  requests: 0,
  requestValue: 0,
};

const fmtOMR = (n: number) =>
  `${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} OMR`;

const fmtNum = (n: number) => (Number(n) || 0).toLocaleString();

// Static illustrative trends + series — this view is a presentation layer.
const CARDS: { key: keyof Kpis; label: string; trend: string; up: boolean; money?: boolean }[] = [
  { key: "suppliers", label: "Suppliers", trend: "+12%", up: true },
  { key: "materials", label: "Materials", trend: "+8%", up: true },
  { key: "openOffers", label: "Open offers", trend: "-4%", up: false },
  { key: "requestValue", label: "Request value", trend: "+23%", up: true, money: true },
];

const SERIES = [
  { label: "Jan", value: 34 },
  { label: "Feb", value: 52 },
  { label: "Mar", value: 41 },
  { label: "Apr", value: 67 },
  { label: "May", value: 58 },
  { label: "Jun", value: 80 },
  { label: "Jul", value: 72 },
];

const MAX_SERIES = Math.max(...SERIES.map((d) => d.value));

// Donut segments — static proportions summing to 100. chart-1..chart-5.
const DONUT: { label: string; pct: number; color: string }[] = [
  { label: "Submitted", pct: 38, color: "var(--chart-1)" },
  { label: "Approved", pct: 27, color: "var(--chart-3)" },
  { label: "Ordered", pct: 18, color: "var(--chart-4)" },
  { label: "Received", pct: 11, color: "var(--chart-2)" },
  { label: "Rejected", pct: 6, color: "var(--chart-5)" },
];

function buildConicGradient(segments: { pct: number; color: string }[]) {
  let acc = 0;
  const stops = segments.map((s) => {
    const from = acc;
    acc += s.pct;
    return `${s.color} ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function AnalyticsPage() {
  const app = useApp();
  const [kpis, setKpis] = useState<Kpis>(ZERO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app.ready) return;
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const session = app.asSession();
        const [suppliers, materials, offers, prs] = await Promise.all([
          fetchScoped("suppliers", session),
          fetchScoped("materials", session),
          fetchScoped<Offer>("offers", session),
          fetchScoped<Pr>("prs", session),
        ]);
        if (!active) return;
        const openOffers = offers.filter(
          (o) => (o.status || "").toLowerCase() !== "closed"
        ).length;
        const requestValue = prs.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        setKpis({
          suppliers: suppliers.length,
          materials: materials.length,
          openOffers,
          requests: prs.length,
          requestValue,
        });
      } catch {
        if (active) setKpis(ZERO);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Spend &amp; performance overview</p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((card) => {
              const raw = kpis[card.key];
              const value = card.money ? fmtOMR(raw) : fmtNum(raw);
              return (
                <div
                  key={card.key}
                  className="glass-strong glass-specular relative overflow-hidden rounded-3xl p-5"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-12 size-40 rounded-full blur-3xl"
                    style={{
                      background:
                        "radial-gradient(circle, oklch(0.7 0.16 280 / 0.3), transparent 70%)",
                    }}
                  />
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-4xl font-semibold leading-none tracking-tight">
                      {value}
                    </span>
                  </div>
                  <span
                    className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      card.up
                        ? "bg-chart-3/15 text-chart-3"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {card.up ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                    {card.trend}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Bar chart */}
            <div className="glass glass-specular rounded-3xl p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Requests over time</h2>
                <span className="text-xs text-muted-foreground">Last 7 months</span>
              </div>
              <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
                {SERIES.map((d) => (
                  <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max(6, (d.value / MAX_SERIES) * 100)}%`,
                          background:
                            "linear-gradient(180deg, oklch(0.62 0.19 260), oklch(0.6 0.16 300))",
                        }}
                        title={`${d.label}: ${d.value}`}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut chart */}
            <div className="glass glass-specular rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Offer status</h2>
              <div className="mt-5 flex items-center gap-6">
                <div
                  className="relative grid size-36 shrink-0 place-items-center rounded-full"
                  style={{ background: buildConicGradient(DONUT) }}
                >
                  <div className="glass-strong grid size-20 place-items-center rounded-full text-center">
                    <span className="text-base font-semibold leading-none">{fmtNum(kpis.openOffers)}</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">open</span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {DONUT.map((seg) => (
                    <li key={seg.label} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: seg.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {seg.label}
                      </span>
                      <span className="font-medium tabular-nums">{seg.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
