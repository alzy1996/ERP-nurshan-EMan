"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  BadgeCheck,
  Building2,
  Loader2,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";

import { fetchScoped } from "@/lib/data";
import { db } from "@/lib/firebase";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/shell/theme-toggle";

type Site = { id: string; name?: string };

type UserRow = {
  id: string;
  name?: string;
  username?: string;
  jobType?: string;
  isAdmin?: boolean;
  status?: string;
};

const SECTION_KEYS = [
  "dashboard",
  "analytics",
  "materials",
  "suppliers",
  "offers",
  "purchaserequests",
  "contracts",
  "attendance",
  "notifications",
  "settings",
] as const;

function initials(value: string | undefined): string {
  return (value || "?").slice(0, 2).toUpperCase();
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
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
          <TabsTrigger value="users" className="rounded-full">
            Users
          </TabsTrigger>
          <TabsTrigger value="approvals" className="rounded-full">
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="sites">
          <SitesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="approvals">
          <ApprovalsTab />
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
            <div className="truncate text-xs text-muted-foreground">
              @{session?.username || "—"}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {session?.jobType || "—"}
            </div>
          </div>
          {session?.isAdmin ? (
            <Badge variant="secondary" className="ml-auto gap-1 bg-chart-1/15 text-chart-1">
              <ShieldCheck className="size-3" /> Admin
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Appearance */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle className="glass-subtle grid size-10 place-items-center rounded-xl" />
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
    // Sites mirror the Projects data (the `sites` collection).
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
        <div
          key={s.id}
          className="glass glass-specular flex items-center gap-3 rounded-2xl px-4 py-3"
        >
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

function UsersTab() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, "nexus_users"));
        const mapped = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserRow, "id">) }));
        mapped.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        if (active) setRows(mapped);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
          <Users className="size-5" />
        </div>
        <p className="mt-4 text-sm font-medium">No users yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((u) => {
        const activeUser = !u.status || u.status === "Active";
        return (
          <div
            key={u.id}
            className="glass glass-specular flex items-center gap-3 rounded-2xl px-4 py-3"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {initials(u.name || u.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{u.name || u.username || "—"}</div>
              <div className="truncate text-xs text-muted-foreground">
                @{u.username || "—"} · {u.jobType || "User"}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {u.isAdmin ? (
                <Badge variant="secondary" className="gap-1 bg-chart-1/15 text-chart-1">
                  <BadgeCheck className="size-3" /> Admin
                </Badge>
              ) : null}
              <Badge
                variant="secondary"
                className={
                  activeUser
                    ? "bg-chart-3/15 text-chart-3"
                    : "bg-muted text-muted-foreground"
                }
              >
                {u.status || "Active"}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApprovalsTab() {
  return (
    <div className="space-y-4">
      <div className="glass glass-specular rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <div className="glass-subtle grid size-10 shrink-0 place-items-center rounded-xl">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Approval matrix</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Per-section approval routing is coming soon. The toggles below preview which
              sections will participate in the workflow.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {SECTION_KEYS.map((key) => (
            <div
              key={key}
              className="glass-subtle flex items-center justify-between rounded-xl px-3.5 py-2.5"
            >
              <span className="text-sm font-medium capitalize">{key}</span>
              <Switch disabled aria-label={`Toggle ${key}`} />
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Editing coming soon</p>
      </div>
    </div>
  );
}
