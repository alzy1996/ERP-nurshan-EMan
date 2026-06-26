"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped } from "@/lib/data";
import { loadGeofence, getCurrentPosition, distanceMeters, type Geofence } from "@/lib/geo";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { GeofenceManager } from "@/components/attendance/geofence-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Entry = { id: string; user?: string; action?: string; at?: number; lat?: number; lng?: number };

export default function AttendancePage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [myFence, setMyFence] = useState<Geofence | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Entry>("attendance", app.asSession());
      setRows(data);
      if (app.session?.uid) setMyFence(await loadGeofence(app.session.uid));
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
      const extra: Record<string, number> = {};
      // Geofence enforcement: if a location is assigned, GPS must be within range.
      if (myFence) {
        const pos = await getCurrentPosition();
        const dist = distanceMeters(pos, myFence);
        if (dist > myFence.radius) {
          const away = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;
          toast.error(`You're ${away} away — check in within ${myFence.radius} m of your location`);
          return;
        }
        extra.lat = pos.lat;
        extra.lng = pos.lng;
      }
      await addScoped(
        "attendance",
        {
          user: app.session?.name || app.session?.username,
          action,
          at: Date.now(),
          ...extra,
        },
        app.asSession(),
        app.resolveSite()
      );
      setCheckedIn(action === "in");
      toast.success(action === "in" ? "Checked in" : "Checked out");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save check-in");
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
          {myFence ? (
            <Badge variant="secondary" className="gap-1 bg-chart-1/15 text-chart-1">
              <MapPin className="size-3" /> Check in within {myFence.radius} m of your location
            </Badge>
          ) : null}
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

      {/* Manage check-in locations (admin / HR only) */}
      {perms.can("attendance", "delete") ? <GeofenceManager /> : null}

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
