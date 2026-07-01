"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plus, Search, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, updateScoped, removeScoped } from "@/lib/data";
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

type Record_ = {
  id: string;
  title?: string;
  category?: string;
  severity?: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  actionTaken?: string;
  status?: string;
  reportedBy?: string;
  siteId?: string;
  createdBy?: string;
  createdAt?: number;
};

type Draft = {
  site: string;
  title: string;
  category: string;
  severity: string;
  date: string;
  time: string;
  location: string;
  description: string;
  actionTaken: string;
  status: string;
};

const CATEGORIES = ["Incident", "Near-miss", "Hazard", "Inspection"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["open", "investigating", "closed"] as const;

const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", cls: "bg-chart-1/15 text-chart-1" },
  high: { label: "High", cls: "bg-chart-4/15 text-chart-4" },
  critical: { label: "Critical", cls: "bg-destructive/15 text-destructive" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-chart-4/15 text-chart-4" },
  investigating: { label: "Investigating", cls: "bg-chart-1/15 text-chart-1" },
  closed: { label: "Closed", cls: "bg-chart-3/15 text-chart-3" },
};

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
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const emptyDraft: Draft = {
  site: "",
  title: "",
  category: "Incident",
  severity: "medium",
  date: "",
  time: "",
  location: "",
  description: "",
  actionTaken: "",
  status: "open",
};

export default function SafetyPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Record_>("safety", app.asSession());
      data.sort(
        (a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")) ||
          (b.createdAt || 0) - (a.createdAt || 0)
      );
      setRows(data);
    } catch {
      toast.error("Could not load safety records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        site: f.site || app.resolveSite() || (app.sites[0]?.id ?? ""),
        date: f.date || todayStr(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.title, r.category, r.location, r.reportedBy]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const open_ = rows.filter((r) => (r.status || "open") !== "closed").length;
    const alerts = rows.filter(
      (r) => (r.status || "open") !== "closed" && (r.severity === "high" || r.severity === "critical")
    ).length;
    const closed = rows.filter((r) => r.status === "closed").length;
    return { open: open_, alerts, closed };
  }, [rows]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.title.trim()) return toast.error("Enter what happened");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then report"
          : "Pick a site / project for this record"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "safety",
        {
          title: form.title.trim(),
          category: form.category,
          severity: form.severity,
          date: form.date || todayStr(),
          time: form.time || null,
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          actionTaken: form.actionTaken.trim() || null,
          status: form.status,
          reportedBy: app.session?.name || "—",
        },
        app.asSession(),
        siteId
      );
      toast.success("Safety record saved");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  // Cycle Open → Investigating → Closed in one tap.
  async function cycleStatus(r: Record_) {
    const cur = (r.status || "open") as (typeof STATUSES)[number];
    const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length];
    try {
      await updateScoped("safety", r.id, { status: next }, app.asSession());
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    } catch {
      toast.error("Could not update status");
    }
  }

  async function remove(r: Record_) {
    if (!window.confirm("Delete this safety record?")) return;
    try {
      await removeScoped("safety", r.id);
      setRows((rs) => rs.filter((x) => x.id !== r.id));
      toast.success("Record deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  const canUpdate = perms.can("safety", "update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Safety</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Incidents &amp; compliance — {rows.length} record{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search records"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("safety", "create") ? (
            <SafetySheet
              open={open}
              setOpen={setOpen}
              form={form}
              set={set}
              sites={app.sites}
              onSite={(id) => setForm((f) => ({ ...f, site: id }))}
              onField={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
              saving={saving}
              onSave={save}
            />
          ) : null}
        </div>
      </div>

      {/* Summary */}
      {rows.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Open</div>
            <div className="mt-1 text-xl font-semibold">{stats.open}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">High / critical open</div>
            <div className={`mt-1 text-xl font-semibold ${stats.alerts > 0 ? "text-destructive" : ""}`}>
              {stats.alerts}
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Closed</div>
            <div className="mt-1 text-xl font-semibold text-chart-3">{stats.closed}</div>
          </div>
        </div>
      ) : null}

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <ShieldAlert className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No safety records yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Report incidents, near-misses and hazards to track them to closure.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const sev = SEVERITY_META[r.severity || "medium"] ?? SEVERITY_META.medium;
            const st = STATUS_META[r.status || "open"] ?? STATUS_META.open;
            const critical = r.severity === "critical" || r.severity === "high";
            return (
              <div key={r.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("safety", "delete") ? (
                  <button
                    onClick={() => remove(r)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start gap-3 pr-7">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                      critical ? "bg-destructive/10 text-destructive" : "glass-subtle text-chart-4"
                    }`}
                  >
                    <TriangleAlert className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold leading-snug">{r.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.category || "—"} · {fmtDate(r.date)}
                      {r.time ? ` ${r.time}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={sev.cls}>
                    {sev.label}
                  </Badge>
                  <button
                    type="button"
                    onClick={canUpdate ? () => cycleStatus(r) : undefined}
                    disabled={!canUpdate}
                    title={canUpdate ? "Tap to change status" : undefined}
                    className={canUpdate ? "cursor-pointer" : "cursor-default"}
                  >
                    <Badge variant="secondary" className={st.cls}>
                      {st.label}
                    </Badge>
                  </button>
                  {r.location ? (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" /> {r.location}
                    </span>
                  ) : null}
                </div>

                {r.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>
                ) : null}
                {r.actionTaken ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Action: </span>
                    {r.actionTaken}
                  </p>
                ) : null}
                <div className="mt-3 text-[11px] text-muted-foreground">
                  Reported by {r.reportedBy || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SafetySheet({
  open,
  setOpen,
  form,
  set,
  sites,
  onSite,
  onField,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  set: (
    key: keyof Draft
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  sites: { id: string; name?: string }[];
  onSite: (id: string) => void;
  onField: (key: keyof Draft, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Report
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Report a safety record</SheetTitle>
          <SheetDescription>An incident, near-miss, hazard or inspection.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="sf-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="sf-site"
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
          <Field label="What happened *" htmlFor="sf-title">
            <Input
              id="sf-title"
              value={form.title}
              onChange={set("title")}
              placeholder="Scaffold guardrail missing on Level 3"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => onField("category", e.target.value)}
              className="glass-subtle h-10 w-full rounded-xl border-0 bg-transparent px-3 text-sm outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Severity">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onField("severity", s)}
                  className={`flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold capitalize transition ${
                    form.severity === s
                      ? `glass glass-specular ${SEVERITY_META[s].cls}`
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="sf-date">
              <Input
                id="sf-date"
                type="date"
                value={form.date}
                onChange={set("date")}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Time" htmlFor="sf-time">
              <Input
                id="sf-time"
                type="time"
                value={form.time}
                onChange={set("time")}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Location on site" htmlFor="sf-location">
            <Input
              id="sf-location"
              value={form.location}
              onChange={set("location")}
              placeholder="Zone A, North scaffolding"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Description" htmlFor="sf-desc">
            <Textarea
              id="sf-desc"
              value={form.description}
              onChange={set("description")}
              placeholder="What happened, immediate actions and personnel involved…"
              className="glass-subtle min-h-20 rounded-xl border-0"
            />
          </Field>
          <Field label="Action taken" htmlFor="sf-action">
            <Textarea
              id="sf-action"
              value={form.actionTaken}
              onChange={set("actionTaken")}
              placeholder="Corrective / preventive action…"
              className="glass-subtle min-h-16 rounded-xl border-0"
            />
          </Field>
          <Field label="Status">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onField("status", s)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                    form.status === s
                      ? `glass glass-specular ${STATUS_META[s].cls}`
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Submit report"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
