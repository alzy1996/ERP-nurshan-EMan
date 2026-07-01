"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { fetchScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";

type Pr = { id: string; amount?: number; stage?: string; createdAt?: number };
type Po = { id: string; total?: number };
type Item = { stock?: number | string; reorder?: number | string };
type Safety = { status?: string; severity?: string };
type Site = { progress?: number | string };

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const fmtOMR = (n: number) =>
  `${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} OMR`;
const fmtNum = (n: number) => (Number(n) || 0).toLocaleString();

const STAGES = ["Submitted", "Approved", "Ordered", "Received", "Rejected"] as const;
const STAGE_COLOR: Record<string, string> = {
  Submitted: "var(--chart-1)",
  Approved: "var(--chart-3)",
  Ordered: "var(--chart-4)",
  Received: "var(--chart-2)",
  Rejected: "var(--chart-5)",
};

function buildConicGradient(segments: { pct: number; color: string }[]) {
  const nonZero = segments.filter((s) => s.pct > 0);
  if (!nonZero.length) return "var(--muted)";
  let acc = 0;
  const stops = nonZero.map((s) => {
    const from = acc;
    acc += s.pct;
    return `${s.color} ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

// Group purchase requests into the last 6 calendar months by creation time.
function monthlySeries(prs: Pr[]) {
  const now = new Date();
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString(undefined, { month: "short" }), key: `${d.getFullYear()}-${d.getMonth()}`, value: 0 };
  });
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  prs.forEach((p) => {
    if (!p.createdAt) return;
    const d = new Date(p.createdAt);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i != null) buckets[i].value += 1;
  });
  return buckets;
}

export default function AnalyticsPage() {
  const app = useApp();
  const perms = usePermissions();
  const [prs, setPrs] = useState<Pr[]>([]);
  const [pos, setPos] = useState<Po[]>([]);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [safety, setSafety] = useState<Safety[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app.ready) return;
    let active = true;
    (async () => {
      setLoading(true);
      const s = app.asSession();
      const res = await Promise.allSettled([
        fetchScoped<Pr>("prs", s),
        fetchScoped<Po>("purchase_orders", s),
        fetchScoped<Item>("inventory", s),
        fetchScoped<Safety>("safety", s),
        fetchScoped<Site>("sites", s),
      ]);
      if (!active) return;
      const val = <T,>(i: number): T[] =>
        res[i].status === "fulfilled" ? ((res[i] as PromiseFulfilledResult<T[]>).value ?? []) : [];
      setPrs(val<Pr>(0));
      setPos(val<Po>(1));
      setInventory(val<Item>(2));
      setSafety(val<Safety>(3));
      setSites(val<Site>(4));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  const kpis = useMemo(() => {
    const requestValue = prs.reduce((sum, p) => sum + num(p.amount), 0);
    const approvedValue = prs
      .filter((p) => ["Approved", "Ordered", "Received"].includes(p.stage || ""))
      .reduce((sum, p) => sum + num(p.amount), 0);
    const poValue = pos.reduce((sum, p) => sum + num(p.total), 0);
    return { requests: prs.length, requestValue, approvedValue, pos: pos.length, poValue };
  }, [prs, pos]);

  const pipeline = useMemo(() => {
    const counts = STAGES.map((st) => ({
      label: st,
      color: STAGE_COLOR[st],
      count: prs.filter((p) => (p.stage || "Submitted") === st).length,
    }));
    const total = counts.reduce((a, b) => a + b.count, 0) || 1;
    return counts.map((c) => ({ ...c, pct: Math.round((c.count / total) * 100) }));
  }, [prs]);

  const series = useMemo(() => monthlySeries(prs), [prs]);
  const maxSeries = Math.max(1, ...series.map((d) => d.value));

  const ops = useMemo(() => {
    const lowStock = inventory.filter((i) => num(i.reorder) > 0 && num(i.stock) <= num(i.reorder)).length;
    const safetyAlerts = safety.filter(
      (r) => (r.status || "open") !== "closed" && (r.severity === "high" || r.severity === "critical")
    ).length;
    const progressVals = sites
      .map((s) => (s.progress != null && String(s.progress).trim() !== "" ? num(s.progress) : null))
      .filter((v): v is number => v != null);
    const avgProgress = progressVals.length
      ? Math.round(progressVals.reduce((a, b) => a + b, 0) / progressVals.length)
      : null;
    return { lowStock, safetyAlerts, avgProgress };
  }, [inventory, safety, sites]);

  const cards = [
    { label: "Purchase requests", value: fmtNum(kpis.requests), sub: "all time" },
    { label: "Request value", value: fmtOMR(kpis.requestValue), sub: "submitted" },
    { label: "Approved value", value: fmtOMR(kpis.approvedValue), sub: "approved & beyond" },
    { label: "Purchase orders", value: fmtNum(kpis.pos), sub: kpis.poValue > 0 ? fmtOMR(kpis.poValue) : "—" },
  ];

  const opsTiles = [
    perms.canSee("inventory")
      ? { key: "low", label: "Low stock", value: ops.lowStock, alert: ops.lowStock > 0, hint: "items to reorder" }
      : null,
    perms.canSee("safety")
      ? { key: "safety", label: "Safety alerts", value: ops.safetyAlerts, alert: ops.safetyAlerts > 0, hint: "high / critical open" }
      : null,
    perms.canSee("projects") && ops.avgProgress != null
      ? { key: "progress", label: "Avg progress", value: `${ops.avgProgress}%`, alert: false, hint: "across projects" }
      : null,
  ].filter(Boolean) as { key: string; label: string; value: number | string; alert: boolean; hint: string }[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live spend &amp; performance overview</p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI row — real figures */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="glass-strong glass-specular relative overflow-hidden rounded-3xl p-5"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -top-12 size-40 rounded-full blur-3xl"
                  style={{ background: "radial-gradient(circle, oklch(0.7 0.16 280 / 0.3), transparent 70%)" }}
                />
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <div className="mt-2 text-3xl font-semibold leading-none tracking-tight">{card.value}</div>
                <p className="mt-3 text-xs text-muted-foreground">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Ops tiles — permission-gated live figures */}
          {opsTiles.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {opsTiles.map((o) => (
                <div key={o.key} className="glass-subtle rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">{o.label}</div>
                  <div className={`mt-1 text-2xl font-semibold ${o.alert ? "text-destructive" : ""}`}>
                    {o.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">{o.hint}</div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Charts — real data */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Bar chart: requests by month */}
            <div className="glass glass-specular rounded-3xl p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Requests over time</h2>
                <span className="text-xs text-muted-foreground">Last 6 months</span>
              </div>
              <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
                {series.map((d) => (
                  <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max(4, (d.value / maxSeries) * 100)}%`,
                          background: "linear-gradient(180deg, oklch(0.62 0.19 260), oklch(0.6 0.16 300))",
                        }}
                        title={`${d.label}: ${d.value}`}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut: request pipeline */}
            <div className="glass glass-specular rounded-3xl p-5">
              <h2 className="text-sm font-semibold">Request pipeline</h2>
              <div className="mt-5 flex items-center gap-6">
                <div
                  className="relative grid size-36 shrink-0 place-items-center rounded-full"
                  style={{ background: buildConicGradient(pipeline) }}
                >
                  <div className="glass-strong grid size-20 place-items-center rounded-full text-center">
                    <span className="text-base font-semibold leading-none">{fmtNum(kpis.requests)}</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">total</span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {pipeline.map((seg) => (
                    <li key={seg.label} className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{seg.label}</span>
                      <span className="tabular-nums text-muted-foreground/70">{seg.count}</span>
                      <span className="w-9 text-right font-medium tabular-nums">{seg.pct}%</span>
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
