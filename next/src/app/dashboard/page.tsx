import { ArrowRight, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  {
    value: "workflows",
    title: "No workflows yet",
    desc: "Where your automations will appear, with live execution status.",
  },
  {
    value: "permissions",
    title: "No permission sets",
    desc: "Per-site, per-section access rules will be listed here.",
  },
  {
    value: "executions",
    title: "No executions logged",
    desc: "Every run, approval and offer event will stream into this view.",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All your workflows and permissions
          </p>
        </div>
        <div className="glass-subtle hidden items-center gap-2 rounded-full px-3.5 py-2 text-sm text-muted-foreground sm:flex">
          <Search className="size-4" />
          Search…
        </div>
      </div>

      {/* Executions stat card */}
      <div className="glass-strong glass-specular relative overflow-hidden rounded-3xl p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.7 0.16 280 / 0.35), transparent 70%)" }}
        />
        <p className="text-sm text-muted-foreground">Executions</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-6xl font-semibold leading-none tracking-tight">340</span>
          <span className="mb-1.5 rounded-full bg-chart-3/15 px-2.5 py-1 text-xs font-medium text-chart-3">
            ↑ 204%
          </span>
        </div>
        <Button variant="glass" size="sm" className="mt-6 rounded-full">
          See report <ArrowRight className="size-3.5" />
        </Button>
      </div>

      {/* Executions section */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Executions</h2>
        <Tabs defaultValue="workflows" className="mt-4 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="glass-subtle h-9 rounded-full">
              <TabsTrigger value="workflows" className="rounded-full">
                Workflows
              </TabsTrigger>
              <TabsTrigger value="permissions" className="rounded-full">
                Permissions
              </TabsTrigger>
              <TabsTrigger value="executions" className="rounded-full">
                Executions
              </TabsTrigger>
            </TabsList>
            <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-muted-foreground">
              <Search className="size-3.5" />
              Search
            </div>
          </div>

          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              <div className="glass-subtle grid min-h-[260px] place-items-center rounded-3xl p-8 text-center">
                <div className="max-w-xs">
                  <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl text-foreground">
                    <Plus className="size-5" />
                  </div>
                  <p className="mt-4 text-sm font-medium">{t.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
