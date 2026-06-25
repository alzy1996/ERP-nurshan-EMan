"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Notif = {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  category?: string;
  priority?: string;
  read?: boolean;
  createdAt?: number;
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-chart-4",
  low: "bg-chart-3",
};

function dotFor(priority?: string) {
  return PRIORITY_DOT[(priority || "").toLowerCase()] ?? "bg-muted-foreground/40";
}

function relativeTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function NotificationsPage() {
  const app = useApp();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Notif>("notifications", app.asSession());
      setRows(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch {
      toast.error("Could not load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const unread = useMemo(() => rows.filter((r) => !r.read).length, [rows]);

  const shown = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.category === filter)),
    [rows, filter]
  );

  function markRead(n: Notif) {
    setRows((r) => r.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  }

  async function remove(n: Notif) {
    try {
      await removeScoped("notifications", n.id);
      setRows((r) => r.filter((x) => x.id !== n.id));
      toast.success("Notification dismissed");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unread} unread
            </p>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          {["all", ...categories].map((c) => {
            const active = filter === c;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={
                  active
                    ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                    : "glass-subtle rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                }
              >
                {c === "all" ? "All" : c}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-20 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <Bell className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New alerts and updates will show up here as they arrive.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((n) => (
            <div
              key={n.id}
              className={
                n.read
                  ? "glass glass-specular group relative rounded-2xl p-4"
                  : "glass glass-specular group relative rounded-2xl p-4 ring-1 ring-chart-1/40"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${dotFor(n.priority)}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {n.title || "Notification"}
                    </span>
                    {!n.read ? (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-chart-1"
                        aria-label="Unread"
                      />
                    ) : null}
                  </div>
                  {n.body || n.message ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {n.body || n.message}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-2">
                    {n.category ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        {n.category}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(n.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!n.read ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => markRead(n)}
                      aria-label="Mark as read"
                    >
                      <Check className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    onClick={() => remove(n)}
                    aria-label="Dismiss"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
