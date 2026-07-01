"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  FolderKanban,
  NotebookPen,
  Tag,
  TrendingDown,
  Users,
} from "lucide-react";

import { fetchScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";

type Pr = { stage?: string };
type Item = { stock?: number | string; reorder?: number | string };
type Site = { progress?: number | string };
type Log = { date?: string; weather?: string; summary?: string; author?: string; createdAt?: number };

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

export default function DashboardPage() {
  const app = useApp();
  const perms = usePermissions();
  const [prs, setPrs] = useState<Pr[]>([]);
  const [suppliers, setSuppliers] = useState<unknown[]>([]);
  const [materials, setMaterials] = useState<unknown[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [offers, setOffers] = useState<unknown[]>([]);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app.ready || !app.session) return;
    let active = true;
    setLoading(true);
    const s = app.asSession();
    Promise.allSettled([
      fetchScoped<Pr>("prs", s),
      fetchScoped("suppliers", s),
      fetchScoped("materials", s),
      fetchScoped<Site>("sites", s),
      fetchScoped("offers", s),
      fetchScoped<Item>("inventory", s),
      fetchScoped<Log>("site_logs", s),
    ]).then((res) => {
      if (!active) return;
      const val = <T,>(i: number): T[] =>
        res[i].status === "fulfilled" ? ((res[i] as PromiseFulfilledResult<T[]>).value ?? []) : [];
      setPrs(val<Pr>(0));
      setSuppliers(val(1));
      setMaterials(val(2));
      setSites(val<Site>(3));
      setOffers(val(4));
      setInventory(val<Item>(5));
      setLogs(val<Log>(6));
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite, app.session]);

  const show = (v: number | undefined) => (loading ? "—" : (v ?? 0));

  // Derived operational figures.
  const pendingPrs = useMemo(
    () => prs.filter((p) => (p.stage || "Submitted") === "Submitted").length,
    [prs]
  );
  const lowStock = useMemo(
    () => inventory.filter((i) => num(i.reorder) > 0 && num(i.stock) <= num(i.reorder)).length,
    [inventory]
  );
  const avgProgress = useMemo(() => {
    const vals = sites
      .map((s) => (s.progress != null && String(s.progress).trim() !== "" ? num(s.progress) : null))
      .filter((v): v is number => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [sites]);
  const latestLog = useMemo(() => {
    if (!logs.length) return null;
    return [...logs].sort(
      (a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")) ||
        (b.createdAt || 0) - (a.createdAt || 0)
    )[0];
  }, [logs]);

  const kpis = [
    { label: "Suppliers", value: suppliers.length, icon: Users, href: "/dashboard/suppliers", show: perms.canSee("suppliers") },
    { label: "Materials", value: materials.length, icon: Boxes, href: "/dashboard/materials", show: perms.canSee("materials") },
    { label: "Projects", value: sites.length, icon: FolderKanban, href: "/dashboard/projects", show: perms.canSee("projects") },
    { label: "Offers", value: offers.length, icon: Tag, href: "/dashboard/offers", show: perms.canSee("offers") },
  ].filter((k) => k.show);

  // Permission-gated operational widgets.
  const ops = [
    perms.canSee("purchase_requests")
      ? {
          key: "approvals",
          label: "Awaiting approval",
          value: pendingPrs,
          hint: pendingPrs === 1 ? "request" : "requests",
          icon: ClipboardCheck,
          href: "/dashboard/purchase-requests",
          alert: false,
        }
      : null,
    perms.canSee("inventory")
      ? {
          key: "lowstock",
          label: "Low stock",
          value: lowStock,
          hint: lowStock === 1 ? "item to reorder" : "items to reorder",
          icon: TrendingDown,
          href: "/dashboard/inventory",
          alert: lowStock > 0,
        }
      : null,
    perms.canSee("projects") && avgProgress != null
      ? {
          key: "progress",
          label: "Avg site progress",
          value: `${avgProgress}%`,
          hint: "across projects",
          icon: FolderKanban,
          href: "/dashboard/projects",
          alert: false,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: number | string;
    hint: string;
    icon: typeof ClipboardCheck;
    href: string;
    alert: boolean;
  }[];

  const showLatestLog = perms.canSee("site_logs") && latestLog;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{app.t("Dashboard")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {app.session?.name ? `${app.t("Welcome back")}, ${app.session.name}` : "All your workflows and permissions"}
        </p>
      </div>

      {/* Primary stat — real Purchase Requests count */}
      <div className="glass-strong glass-specular relative overflow-hidden rounded-3xl p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.16 280 / 0.35), transparent 70%)" }}
        />
        <p className="text-sm text-muted-foreground">{app.t("Purchase Requests")}</p>
        <div className="mt-2 text-6xl font-semibold leading-none tracking-tight">
          {show(prs.length)}
        </div>
        {!loading && pendingPrs > 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingPrs} {app.t("awaiting approval")}
          </p>
        ) : null}
        <Button asChild variant="glass" size="sm" className="mt-6 rounded-full">
          <Link href="/dashboard/purchase-requests">
            {app.t("Purchase Requests")} <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Operations — permission-gated live figures */}
      {ops.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {ops.map((o) => (
            <Link
              key={o.key}
              href={o.href}
              className="glass glass-specular rounded-3xl p-5 transition-transform hover:-translate-y-1"
            >
              <span
                className={`grid size-11 place-items-center rounded-2xl ${
                  o.alert ? "bg-destructive/15 text-destructive" : "glass-subtle text-foreground"
                }`}
              >
                <o.icon className="size-5" />
              </span>
              <div
                className={`mt-4 text-3xl font-semibold tracking-tight ${o.alert ? "text-destructive" : ""}`}
              >
                {loading ? "—" : o.value}
              </div>
              <div className="text-xs text-muted-foreground">
                {app.t(o.label)}
                <span className="text-muted-foreground/70"> · {o.hint}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Latest site log */}
      {showLatestLog ? (
        <Link
          href="/dashboard/site-logs"
          className="glass glass-specular block rounded-3xl p-5 transition-transform hover:-translate-y-1"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <NotebookPen className="size-4" /> {app.t("Latest site log")}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
            <span>{latestLog!.date || "—"}</span>
            {latestLog!.weather ? (
              <span className="text-xs font-normal text-muted-foreground">· {latestLog!.weather}</span>
            ) : null}
          </div>
          {latestLog!.summary ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{latestLog!.summary}</p>
          ) : null}
        </Link>
      ) : null}

      {/* KPI chips — real counts */}
      {kpis.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="glass glass-specular rounded-3xl p-5 transition-transform hover:-translate-y-1"
            >
              <span className="glass-subtle grid size-11 place-items-center rounded-2xl text-foreground">
                <k.icon className="size-5" />
              </span>
              <div className="mt-4 text-3xl font-semibold tracking-tight">{show(k.value)}</div>
              <div className="text-xs text-muted-foreground">{app.t(k.label)}</div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
