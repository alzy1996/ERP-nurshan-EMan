"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudRain,
  Loader2,
  NotebookPen,
  Plus,
  Search,
  Sun,
  Trash2,
  TriangleAlert,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Field } from "@/components/forms/field";

type SiteLog = {
  id: string;
  date?: string;
  weather?: string;
  temperature?: string | number;
  workforce?: string | number;
  summary?: string;
  delays?: string;
  notes?: string;
  author?: string;
  siteId?: string;
  createdBy?: string;
  createdAt?: number;
};

type Draft = {
  site: string;
  date: string;
  weather: string;
  temperature: string;
  workforce: string;
  summary: string;
  delays: string;
  notes: string;
  author: string;
};

const WEATHER = ["Sunny", "Cloudy", "Rain", "Windy"] as const;

const WEATHER_ICON: Record<string, LucideIcon> = {
  Sunny: Sun,
  Cloudy: Cloud,
  Rain: CloudRain,
  Windy: Wind,
};

// A local YYYY-MM-DD (used to default a new log to "today").
function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const emptyDraft: Draft = {
  site: "",
  date: "",
  weather: "Sunny",
  temperature: "",
  workforce: "",
  summary: "",
  delays: "",
  notes: "",
  author: "",
};

export default function SiteLogsPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<SiteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<SiteLog>("site_logs", app.asSession());
      // Newest day first; fall back to creation time when dates tie.
      data.sort(
        (a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")) ||
          (b.createdAt || 0) - (a.createdAt || 0)
      );
      setRows(data);
    } catch {
      toast.error("Could not load site logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  // When the form opens, default the site, date and author so an entry is one tap
  // away and always attached to a project.
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        site: f.site || app.resolveSite() || (app.sites[0]?.id ?? ""),
        date: f.date || todayStr(),
        author: f.author || app.session?.name || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.summary, r.author, r.weather, r.date, r.delays]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set =
    (key: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.summary.trim()) return toast.error("Describe the work done");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then add a log"
          : "Pick a site / project for this log"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "site_logs",
        {
          date: form.date || todayStr(),
          weather: form.weather,
          temperature: Number(form.temperature) || null,
          workforce: Number(form.workforce) || null,
          summary: form.summary.trim(),
          delays: form.delays.trim() || null,
          notes: form.notes.trim() || null,
          author: form.author || app.session?.name || "—",
        },
        app.asSession(),
        siteId
      );
      toast.success("Site log added");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save log — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  async function remove(l: SiteLog) {
    if (!window.confirm("Delete this site log?")) return;
    try {
      await removeScoped("site_logs", l.id);
      setRows((r) => r.filter((x) => x.id !== l.id));
      toast.success("Log deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily site diary — {rows.length} entr{rows.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search logs"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("site_logs", "create") ? (
            <LogSheet
              open={open}
              setOpen={setOpen}
              form={form}
              set={set}
              sites={app.sites}
              onSite={(id) => setForm((f) => ({ ...f, site: id }))}
              onWeather={(w) => setForm((f) => ({ ...f, weather: w }))}
              saving={saving}
              onSave={save}
            />
          ) : null}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <NotebookPen className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No site logs yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Record the day’s weather, workforce and work done to build the site diary.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const Icon = WEATHER_ICON[l.weather || "Sunny"] ?? Sun;
            const temp = l.temperature != null && l.temperature !== "" ? `${l.temperature}°C` : "";
            const workforce = Number(l.workforce) || 0;
            return (
              <div key={l.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("site_logs", "delete") ? (
                  <button
                    onClick={() => remove(l)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start gap-3">
                  <div className="glass-subtle grid size-10 shrink-0 place-items-center rounded-2xl">
                    <Icon className="size-5 text-chart-1" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{fmtDate(l.date)}</span>
                      <span className="text-xs text-muted-foreground">
                        {l.weather || "—"}
                        {temp ? ` · ${temp}` : ""}
                      </span>
                      {workforce > 0 ? (
                        <Badge variant="secondary" className="ml-auto gap-1">
                          <Users className="size-3" /> {workforce}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-snug">{l.summary}</p>
                    {l.delays ? (
                      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{l.delays}</span>
                      </div>
                    ) : null}
                    {l.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{l.notes}</p>
                    ) : null}
                    <div className="mt-3 text-[11px] text-muted-foreground">
                      Logged by {l.author || "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogSheet({
  open,
  setOpen,
  form,
  set,
  sites,
  onSite,
  onWeather,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  set: (
    key: keyof Draft
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  sites: { id: string; name?: string }[];
  onSite: (id: string) => void;
  onWeather: (w: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> New log
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New site log</SheetTitle>
          <SheetDescription>Record the day’s conditions, workforce and work done.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="log-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="log-site"
                value={form.site}
                onChange={(e) => onSite(e.target.value)}
                className="glass-subtle h-10 w-full rounded-xl border-0 bg-transparent px-3 text-sm outline-none"
              >
                <option value="">— Choose a site / project —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Date" htmlFor="log-date">
            <Input
              id="log-date"
              type="date"
              value={form.date}
              onChange={set("date")}
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Weather">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {WEATHER.map((w) => {
                const Icon = WEATHER_ICON[w];
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onWeather(w)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                      form.weather === w
                        ? "glass glass-specular text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" /> {w}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Temperature (°C)" htmlFor="log-temp">
              <Input
                id="log-temp"
                type="number"
                value={form.temperature}
                onChange={set("temperature")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Workforce on site" htmlFor="log-workforce">
              <Input
                id="log-workforce"
                type="number"
                value={form.workforce}
                onChange={set("workforce")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Work done *" htmlFor="log-summary">
            <Textarea
              id="log-summary"
              value={form.summary}
              onChange={set("summary")}
              placeholder="Activities completed today…"
              className="glass-subtle min-h-24 rounded-xl border-0"
            />
          </Field>
          <Field label="Delays / issues" htmlFor="log-delays">
            <Textarea
              id="log-delays"
              value={form.delays}
              onChange={set("delays")}
              placeholder="Anything that held up work (weather, materials, access…)"
              className="glass-subtle min-h-16 rounded-xl border-0"
            />
          </Field>
          <Field label="Notes" htmlFor="log-notes">
            <Textarea
              id="log-notes"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Visitors, deliveries, safety observations…"
              className="glass-subtle min-h-16 rounded-xl border-0"
            />
          </Field>
          <Field label="Logged by" htmlFor="log-author">
            <Input
              id="log-author"
              value={form.author}
              onChange={set("author")}
              placeholder="defaults to you"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
        </div>

        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="glass" className="flex-1 rounded-full">
              Cancel
            </Button>
          </SheetClose>
          <Button
            variant="glassPrimary"
            className="flex-1 rounded-full"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save log"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
