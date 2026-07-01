"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, LogOut, ShieldCheck } from "lucide-react";

import { fetchScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { DensityControl } from "@/components/shell/density-control";

type Site = { id: string; name?: string };

function initials(value: string | undefined): string {
  return (value || "?").slice(0, 2).toUpperCase();
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace administration</p>
      </div>

      <Tabs defaultValue="general" className="gap-6">
        <TabsList className="glass-subtle h-10 w-full justify-start gap-1 rounded-full p-1">
          <TabsTrigger value="general" className="rounded-full">
            General
          </TabsTrigger>
          <TabsTrigger value="sites" className="rounded-full">
            Sites
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="sites">
          <SitesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab() {
  const app = useApp();
  const session = app.session;

  return (
    <div className="space-y-4">
      {/* Profile */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials(session?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{session?.name || "—"}</div>
            <div className="truncate text-xs text-muted-foreground">@{session?.username || "—"}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{session?.jobType || "—"}</div>
          </div>
          {session?.isAdmin ? (
            <Badge variant="secondary" className="ml-auto gap-1 bg-chart-1/15 text-chart-1">
              <ShieldCheck className="size-3" /> Admin
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Preferences */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Preferences</h2>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle className="glass-subtle grid size-10 place-items-center rounded-xl text-foreground" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">Language</span>
          <LanguageSwitcher className="glass-subtle grid size-10 place-items-center rounded-xl text-foreground" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm font-medium">Interface size</span>
            <p className="text-xs text-muted-foreground">Shrink or enlarge the whole app — text &amp; spacing.</p>
          </div>
          <DensityControl />
        </div>
      </div>

      {/* Sign out */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Session</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign out of this workspace on this device.
        </p>
        <Button variant="glass" className="mt-4 rounded-full" onClick={app.logout}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function SitesTab() {
  const app = useApp();
  const [rows, setRows] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app.ready) return;
    let active = true;
    setLoading(true);
    fetchScoped<Record<string, unknown>>("sites", app.asSession())
      .then((data) => {
        if (!active) return;
        const mapped = data.map((d) => ({ id: d.id, name: d.name as string | undefined }));
        mapped.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setRows(mapped);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
        <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
          <Building2 className="size-5" />
        </div>
        <p className="mt-4 text-sm font-medium">No sites yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((s) => (
        <div key={s.id} className="glass glass-specular flex items-center gap-3 rounded-2xl px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
            {initials(s.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{s.name || "Untitled site"}</div>
            <div className="truncate text-xs text-muted-foreground">{s.id}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
