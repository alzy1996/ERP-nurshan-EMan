"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PackageMinus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Usage = {
  id: string;
  material?: string;
  quantity?: string | number;
  unit?: string;
  date?: string;
  usedFor?: string;
  notes?: string;
  recordedBy?: string;
  siteId?: string;
  createdBy?: string;
  createdAt?: number;
};

type Draft = {
  site: string;
  material: string;
  quantity: string;
  unit: string;
  date: string;
  usedFor: string;
  notes: string;
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

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

const emptyDraft: Draft = {
  site: "",
  material: "",
  quantity: "",
  unit: "",
  date: "",
  usedFor: "",
  notes: "",
};

export default function MaterialUsagePage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Usage>("material_usage", app.asSession());
      data.sort(
        (a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")) ||
          (b.createdAt || 0) - (a.createdAt || 0)
      );
      setRows(data);
    } catch {
      toast.error("Could not load material usage");
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
      [r.material, r.usedFor, r.recordedBy, r.date]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const todayCount = useMemo(() => {
    const t = todayStr();
    return rows.filter((r) => r.date === t).length;
  }, [rows]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.material.trim()) return toast.error("Enter the material used");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then log usage"
          : "Pick a site / project for this entry"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "material_usage",
        {
          material: form.material.trim(),
          quantity: num(form.quantity),
          unit: form.unit.trim() || null,
          date: form.date || todayStr(),
          usedFor: form.usedFor.trim() || null,
          notes: form.notes.trim() || null,
          recordedBy: app.session?.name || "—",
        },
        app.asSession(),
        siteId
      );
      toast.success("Usage logged");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: Usage) {
    if (!window.confirm("Delete this usage entry?")) return;
    try {
      await removeScoped("material_usage", u.id);
      setRows((r) => r.filter((x) => x.id !== u.id));
      toast.success("Entry deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Material Usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily consumption — {rows.length} entr{rows.length === 1 ? "y" : "ies"}
            {todayCount > 0 ? ` · ${todayCount} today` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search usage"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("material_usage", "create") ? (
            <UsageSheet
              open={open}
              setOpen={setOpen}
              form={form}
              set={set}
              sites={app.sites}
              onSite={(id) => setForm((f) => ({ ...f, site: id }))}
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
              <PackageMinus className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No usage logged yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Record what materials are consumed each day to track burn-down against stock.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const qty = num(u.quantity);
            return (
              <div key={u.id} className="glass glass-specular group relative rounded-2xl p-4">
                {perms.can("material_usage", "delete") ? (
                  <button
                    onClick={() => remove(u)}
                    aria-label="Delete"
                    className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-center justify-between gap-3 pr-7">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{u.material}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {fmtDate(u.date)}
                      {u.usedFor ? ` · ${u.usedFor}` : ""}
                      {u.recordedBy ? ` · ${u.recordedBy}` : ""}
                    </div>
                  </div>
                  {qty > 0 ? (
                    <div className="shrink-0 text-right text-sm font-semibold">
                      {qty.toLocaleString()}
                      {u.unit ? <span className="ml-1 text-xs text-muted-foreground">{u.unit}</span> : null}
                    </div>
                  ) : null}
                </div>
                {u.notes ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{u.notes}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsageSheet({
  open,
  setOpen,
  form,
  set,
  sites,
  onSite,
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
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Log usage
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log material usage</SheetTitle>
          <SheetDescription>What was consumed on site today.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="mu-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="mu-site"
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
          <Field label="Material *" htmlFor="mu-material">
            <Input
              id="mu-material"
              value={form.material}
              onChange={set("material")}
              placeholder="Cement (OPC 42.5)"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity used" htmlFor="mu-qty">
              <Input
                id="mu-qty"
                type="number"
                value={form.quantity}
                onChange={set("quantity")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Unit" htmlFor="mu-unit">
              <Input
                id="mu-unit"
                value={form.unit}
                onChange={set("unit")}
                placeholder="bags, m³, ton…"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="mu-date">
              <Input
                id="mu-date"
                type="date"
                value={form.date}
                onChange={set("date")}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Used for" htmlFor="mu-usedfor">
              <Input
                id="mu-usedfor"
                value={form.usedFor}
                onChange={set("usedFor")}
                placeholder="Zone A slab pour"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="mu-notes">
            <Textarea
              id="mu-notes"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any detail on the usage…"
              className="glass-subtle min-h-16 rounded-xl border-0"
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save entry"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
