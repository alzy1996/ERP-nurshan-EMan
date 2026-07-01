"use client";

import { useEffect, useMemo, useState } from "react";
import { HardHat, Loader2, Moon, Phone, Plus, Search, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, updateScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type Worker = {
  id: string;
  name?: string;
  trade?: string;
  company?: string;
  shift?: string;
  phone?: string;
  dayRate?: string | number;
  status?: string;
  siteId?: string;
  createdBy?: string;
};

type Draft = {
  site: string;
  name: string;
  trade: string;
  company: string;
  shift: string;
  phone: string;
  dayRate: string;
  status: string;
};

const SHIFTS = ["Day", "Night"] as const;
const STATUSES = ["active", "leave", "off"] as const;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-chart-3/15 text-chart-3" },
  leave: { label: "On leave", cls: "bg-chart-4/15 text-chart-4" },
  off: { label: "Off", cls: "bg-muted text-muted-foreground" },
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const fmtOMR = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })} OMR`;

const emptyDraft: Draft = {
  site: "",
  name: "",
  trade: "",
  company: "Own",
  shift: "Day",
  phone: "",
  dayRate: "",
  status: "active",
};

export default function WorkforcePage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Worker>("workforce", app.asSession());
      data.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setRows(data);
    } catch {
      toast.error("Could not load the workforce");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  useEffect(() => {
    if (open && !form.site) {
      const def = app.resolveSite() || (app.sites[0]?.id ?? "");
      if (def) setForm((f) => ({ ...f, site: def }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.name, r.trade, r.company, r.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => (r.status || "active") === "active").length;
    const day = rows.filter((r) => (r.shift || "Day") === "Day").length;
    const night = rows.filter((r) => r.shift === "Night").length;
    return { total: rows.length, active, day, night };
  }, [rows]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.name.trim()) return toast.error("Enter a worker name");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then add crew"
          : "Pick a site / project for this worker"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "workforce",
        {
          name: form.name.trim(),
          trade: form.trade.trim() || null,
          company: form.company.trim() || "Own",
          shift: form.shift,
          phone: form.phone.trim() || null,
          dayRate: num(form.dayRate),
          status: form.status,
        },
        app.asSession(),
        siteId
      );
      toast.success("Worker added");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  // Cycle Active → On leave → Off → Active, to update a roster in one tap.
  async function cycleStatus(w: Worker) {
    const cur = (w.status || "active") as (typeof STATUSES)[number];
    const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length];
    try {
      await updateScoped("workforce", w.id, { status: next }, app.asSession());
      setRows((r) => r.map((x) => (x.id === w.id ? { ...x, status: next } : x)));
    } catch {
      toast.error("Could not update status");
    }
  }

  async function remove(w: Worker) {
    if (!window.confirm(`Remove ${w.name} from the roster?`)) return;
    try {
      await removeScoped("workforce", w.id);
      setRows((r) => r.filter((x) => x.id !== w.id));
      toast.success("Worker removed");
    } catch {
      toast.error("Could not remove");
    }
  }

  const canUpdate = perms.can("workforce", "update");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workforce</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crew on site — {rows.length} worker{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search crew"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("workforce", "create") ? (
            <WorkerSheet
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
            <div className="text-xs text-muted-foreground">On roster</div>
            <div className="mt-1 text-xl font-semibold">{stats.total}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="mt-1 text-xl font-semibold text-chart-3">{stats.active}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Day / Night</div>
            <div className="mt-1 text-xl font-semibold">
              {stats.day} / {stats.night}
            </div>
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
              <HardHat className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No crew on the roster yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add workers to track trades, shifts and day rates per site.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => {
            const st = STATUS_META[w.status || "active"] ?? STATUS_META.active;
            const night = w.shift === "Night";
            const rate = num(w.dayRate);
            return (
              <div key={w.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("workforce", "delete") ? (
                  <button
                    onClick={() => remove(w)}
                    aria-label="Remove"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start gap-3 pr-7">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                    {(w.name || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{w.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {w.trade || "—"}
                      {w.company ? ` · ${w.company}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    {night ? <Moon className="size-3" /> : <Sun className="size-3" />}
                    {w.shift || "Day"}
                  </Badge>
                  <button
                    type="button"
                    onClick={canUpdate ? () => cycleStatus(w) : undefined}
                    disabled={!canUpdate}
                    title={canUpdate ? "Tap to change status" : undefined}
                    className={canUpdate ? "cursor-pointer" : "cursor-default"}
                  >
                    <Badge variant="secondary" className={st.cls}>
                      {st.label}
                    </Badge>
                  </button>
                  {rate > 0 ? (
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                      {fmtOMR(rate)}/day
                    </span>
                  ) : null}
                </div>

                {w.phone ? (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3.5" /> {w.phone}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkerSheet({
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
  set: (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => void;
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
          <Plus className="size-4" /> Add worker
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add to roster</SheetTitle>
          <SheetDescription>A worker or crew member on this site.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="wf-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="wf-site"
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
          <Field label="Full name *" htmlFor="wf-name">
            <Input
              id="wf-name"
              value={form.name}
              onChange={set("name")}
              placeholder="Rashid Al-Amri"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trade" htmlFor="wf-trade">
              <Input
                id="wf-trade"
                value={form.trade}
                onChange={set("trade")}
                placeholder="Mason, Electrician…"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Company / crew" htmlFor="wf-company">
              <Input
                id="wf-company"
                value={form.company}
                onChange={set("company")}
                placeholder="Own or subcontractor"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Shift">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {SHIFTS.map((sh) => {
                const Icon = sh === "Night" ? Moon : Sun;
                return (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => onField("shift", sh)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
                      form.shift === sh
                        ? "glass glass-specular text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" /> {sh}
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" htmlFor="wf-phone">
              <Input
                id="wf-phone"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+968 …"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Day rate (OMR)" htmlFor="wf-rate">
              <Input
                id="wf-rate"
                type="number"
                value={form.dayRate}
                onChange={set("dayRate")}
                placeholder="0.000"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save worker"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
