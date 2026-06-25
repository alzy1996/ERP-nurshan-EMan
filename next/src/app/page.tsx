import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  FolderKanban,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlobeHero } from "@/components/three/globe-hero";

const features = [
  { icon: Boxes, title: "Workflows", desc: "Requests, offers & approvals in one flow" },
  { icon: ShieldCheck, title: "Permissions", desc: "Per-site, per-section access control" },
  { icon: Users, title: "Suppliers", desc: "Vendor intelligence & scoring" },
  { icon: FolderKanban, title: "Projects", desc: "Sites, documents & teams" },
];

const stats = [
  { value: "340", label: "Executions", trend: "+204%" },
  { value: "12", label: "Active sites" },
  { value: "OMR", label: "Native currency" },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Nav */}
        <header className="glass-strong glass-specular sticky top-4 z-30 mt-4 flex items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              N
            </span>
            <span className="text-sm font-semibold tracking-tight">ERP Nexus</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <span className="cursor-default transition-colors hover:text-foreground">Workflows</span>
            <span className="cursor-default transition-colors hover:text-foreground">Suppliers</span>
            <span className="cursor-default transition-colors hover:text-foreground">Projects</span>
            <span className="cursor-default transition-colors hover:text-foreground">Pricing</span>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="glass" size="sm" className="rounded-full">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="glassPrimary" size="sm" className="rounded-full">
              <Link href="/dashboard">
                Open app <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-6 py-10 lg:grid-cols-2 lg:gap-4 lg:py-16">
          <div className="order-2 lg:order-1">
            <span className="glass glass-specular inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-chart-1" />
              Procurement &amp; Construction Intelligence
            </span>
            <h1 className="text-balance mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              All your workflows &amp; permissions, beautifully in control.
            </h1>
            <p className="text-balance mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              A 2026-ready procurement ERP for construction — requests, offers, suppliers and
              approvals, in one calm, glass-clear workspace.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild variant="glassPrimary" size="lg" className="rounded-full px-6">
                <Link href="/dashboard">
                  Enter dashboard <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg" className="rounded-full px-6">
                <Link href="/dashboard">See report</Link>
              </Button>
            </div>

            <dl className="mt-10 flex flex-wrap gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="glass rounded-2xl px-4 py-3"
                >
                  <dd className="flex items-baseline gap-1.5 text-2xl font-semibold tracking-tight">
                    {s.value}
                    {s.trend ? (
                      <span className="text-xs font-medium text-chart-3">{s.trend}</span>
                    ) : null}
                  </dd>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Globe */}
          <div className="relative order-1 h-[320px] sm:h-[440px] lg:order-2 lg:h-[560px]">
            <GlobeHero className="absolute inset-0" />
          </div>
        </section>

        {/* Feature cards — gently tilted glass panels (reference image 3) */}
        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass glass-specular group rounded-3xl p-5 transition-transform duration-300 hover:-translate-y-1"
              style={{ transform: `rotate(${i % 2 === 0 ? "-1.2deg" : "1.2deg"})` }}
            >
              <span className="glass-subtle grid size-11 place-items-center rounded-2xl text-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </div>

      {/* Floating actions (reference images 1 & 3) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          aria-label="Expand"
          className="glass glass-specular grid size-12 place-items-center rounded-2xl text-foreground transition-transform hover:-translate-y-0.5"
        >
          <Maximize2 className="size-5" />
        </button>
        <button
          aria-label="AI assistant"
          className="glass-specular grid size-12 place-items-center rounded-2xl text-white shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, oklch(0.62 0.19 260), oklch(0.6 0.16 300))" }}
        >
          <Sparkles className="size-5" />
        </button>
      </div>
    </div>
  );
}
