"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Entry = { id: string; user?: string; action?: string; at?: number };

export default function AttendancePage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Entry>("attendance", app.asSession());
      setRows(data);
    } catch {
      toast.error("Could not load attendance");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  // Today's log: only entries punched today, newest first.
  const todays = useMemo(() => {
    const stamp = new Date().toDateString();
    return rows
      .filter((r) => typeof r.at === "number" && new Date(r.at).toDateString() === stamp)
      .sort((a, b) => (b.at || 0) - (a.at || 0));
  }, [rows]);

  async function punch() {
    const action = checkedIn ? "out" : "in";
    setSaving(true);
    try {
      await addScoped(
        "attendance",
        {
          user: app.session?.name || app.session?.username,
          action,
          at: Date.now(),
        },
        app.asSession(),
        app.resolveSite()
      );
      setCheckedIn(action === "in");
      toast.success(action === "in" ? "Checked in" : "Checked out");
      await load();
    } catch {
      toast.error("Could not save check-in");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Check in &amp; today&apos;s log</p>
      </div>

      {/* Check in / Check out card */}
      {/* TODO: GPS geofence + map (Leaflet) — deferred */}
      <div className="glass-strong glass-specular rounded-3xl p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="glass glass-specular grid size-14 place-items-center rounded-2xl">
            {checkedIn ? (
              <LogIn className="size-6 text-chart-3" />
            ) : (
              <Clock className="size-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
              Current status
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {checkedIn ? "Checked in" : "Checked out"}
            </p>
          </div>
          {perms.can("attendance", "create") ? (
            <Button
              variant="glassPrimary"
              size="lg"
              className="w-full max-w-xs rounded-full text-base"
              onClick={punch}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-5 animate-spin" />
              ) : checkedIn ? (
                <>
                  <LogOut className="size-5" /> Check out
                </>
              ) : (
                <>
                  <LogIn className="size-5" /> Check in
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Today's log */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
          Today&apos;s log
        </h2>
        {loading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : todays.length === 0 ? (
          <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
            <div className="max-w-xs">
              <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
                <MapPin className="size-5" />
              </div>
              <p className="mt-4 text-sm font-medium">No check-ins today</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {todays.map((e) => {
              const isIn = e.action === "in";
              return (
                <div key={e.id} className="glass flex items-center gap-3 rounded-2xl p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
                    {(e.user || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {e.user || "Unknown"}
                  </span>
                  <Badge
                    variant="secondary"
                    className={isIn ? "bg-chart-3/15 text-chart-3" : "bg-muted text-muted-foreground"}
                  >
                    {isIn ? "in" : "out"}
                  </Badge>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {e.at ? new Date(e.at).toLocaleTimeString() : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
