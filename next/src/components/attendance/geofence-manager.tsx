"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Loader2, LocateFixed, MapPin, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import {
  loadAllGeofences,
  saveGeofence,
  clearGeofence,
  getCurrentPosition,
  DEFAULT_RADIUS,
  MAX_RADIUS,
  MIN_RADIUS,
  type Geofence,
  type LatLng,
} from "@/lib/geo";
import { useApp } from "@/context/app-context";
import { LocationPicker } from "@/components/map/location-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type U = { id: string; name?: string; username?: string };

export function GeofenceManager() {
  const app = useApp();
  const [users, setUsers] = useState<U[]>([]);
  const [fences, setFences] = useState<Record<string, Geofence>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<U | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [snap, gf] = await Promise.all([
        getDocs(collection(db, "nexus_users")),
        loadAllGeofences(),
      ]);
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<U, "id">) }));
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(list);
      setFences(gf);
    } catch {
      toast.error("Could not load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) =>
      [u.name, u.username].filter(Boolean).some((v) => String(v).toLowerCase().includes(t))
    );
  }, [users, q]);

  return (
    <div className="glass glass-specular rounded-3xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Check-in locations</h2>
          <p className="text-xs text-muted-foreground">
            Set where each person may check in (max {MAX_RADIUS} m).
          </p>
        </div>
        <div className="glass-subtle flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-32 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((u) => {
            const g = fences[u.id];
            return (
              <div key={u.id} className="glass-subtle flex items-center gap-3 rounded-2xl px-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                  {(u.name || u.username || "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name || u.username || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">@{u.username || "—"}</div>
                </div>
                {g ? (
                  <Badge variant="secondary" className="gap-1 bg-chart-3/15 text-chart-3">
                    <MapPin className="size-3" /> {g.radius} m
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Anywhere
                  </Badge>
                )}
                <Button variant="glass" size="sm" className="rounded-full" onClick={() => setEditing(u)}>
                  {g ? "Edit" : "Set"}
                </Button>
              </div>
            );
          })}
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No users.</p>
          ) : null}
        </div>
      )}

      <GeofenceSheet
        user={editing}
        current={editing ? fences[editing.id] || null : null}
        setBy={app.session?.username}
        onClose={() => setEditing(null)}
        onSaved={(uid, g) => setFences((f) => ({ ...f, [uid]: g }))}
        onCleared={(uid) =>
          setFences((f) => {
            const n = { ...f };
            delete n[uid];
            return n;
          })
        }
      />
    </div>
  );
}

function GeofenceSheet({
  user,
  current,
  setBy,
  onClose,
  onSaved,
  onCleared,
}: {
  user: U | null;
  current: Geofence | null;
  setBy?: string;
  onClose: () => void;
  onSaved: (uid: string, g: Geofence) => void;
  onCleared: (uid: string) => void;
}) {
  const [value, setValue] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (user) {
      setValue(current ? { lat: current.lat, lng: current.lng } : null);
      setRadius(current?.radius || DEFAULT_RADIUS);
    }
  }, [user, current]);

  async function useMyLocation() {
    setLocating(true);
    try {
      const p = await getCurrentPosition();
      setValue({ lat: p.lat, lng: p.lng });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not get location");
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!user) return;
    if (!value) return toast.error("Drop a pin on the map first");
    setSaving(true);
    try {
      const g: Geofence = { lat: value.lat, lng: value.lng, radius };
      await saveGeofence(user.id, g, setBy);
      onSaved(user.id, g);
      toast.success(`Location set for ${user.name || user.username}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save location");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!user) return;
    setSaving(true);
    try {
      await clearGeofence(user.id);
      onCleared(user.id);
      toast.success("Location cleared — can check in anywhere");
      onClose();
    } catch {
      toast.error("Could not clear location");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Check-in location</SheetTitle>
          <SheetDescription>
            {user ? `Where ${user.name || user.username} may check in.` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <Button variant="glass" className="w-full rounded-full" onClick={useMyLocation} disabled={locating}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            Use my current location
          </Button>

          {user ? <LocationPicker value={value} radius={radius} onChange={setValue} /> : null}

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">Allowed radius</span>
              <span className="tabular-nums text-muted-foreground">{radius} m</span>
            </div>
            <input
              type="range"
              min={MIN_RADIUS}
              max={MAX_RADIUS}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{MIN_RADIUS} m</span>
              <span>{MAX_RADIUS} m max</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {value
              ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
              : "Tap the map to drop a pin, or use your current location."}
          </p>
        </div>

        <SheetFooter className="flex-row gap-2">
          {current ? (
            <Button variant="glass" className="rounded-full text-destructive" onClick={clear} disabled={saving}>
              <Trash2 className="size-4" /> Clear
            </Button>
          ) : (
            <SheetClose asChild>
              <Button variant="glass" className="flex-1 rounded-full">
                Cancel
              </Button>
            </SheetClose>
          )}
          <Button variant="glassPrimary" className="flex-1 rounded-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save location"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
