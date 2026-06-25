"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, FolderKanban, Tag, Users } from "lucide-react";

import { fetchScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";

type Counts = {
  prs: number;
  suppliers: number;
  materials: number;
  projects: number;
  offers: number;
};

export default function DashboardPage() {
  const app = useApp();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app.ready || !app.session) return;
    let active = true;
    setLoading(true);
    const s = app.asSession();
    Promise.allSettled([
      fetchScoped("prs", s),
      fetchScoped("suppliers", s),
      fetchScoped("materials", s),
      fetchScoped("sites", s),
      fetchScoped("offers", s),
    ]).then((res) => {
      if (!active) return;
      const len = (i: number) =>
        res[i].status === "fulfilled"
          ? (res[i] as PromiseFulfilledResult<unknown[]>).value.length
          : 0;
      setCounts({ prs: len(0), suppliers: len(1), materials: len(2), projects: len(3), offers: len(4) });
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite, app.session]);

  const show = (v: number | undefined) => (loading || v === undefined ? "—" : v);

  const kpis = [
    { label: "Suppliers", value: counts?.suppliers, icon: Users, href: "/dashboard/suppliers" },
    { label: "Materials", value: counts?.materials, icon: Boxes, href: "/dashboard/materials" },
    { label: "Projects", value: counts?.projects, icon: FolderKanban, href: "/dashboard/projects" },
    { label: "Offers", value: counts?.offers, icon: Tag, href: "/dashboard/offers" },
  ];

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
          {show(counts?.prs)}
        </div>
        <Button asChild variant="glass" size="sm" className="mt-6 rounded-full">
          <Link href="/dashboard/purchase-requests">
            {app.t("Purchase Requests")} <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* KPI chips — real counts */}
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
    </div>
  );
}
