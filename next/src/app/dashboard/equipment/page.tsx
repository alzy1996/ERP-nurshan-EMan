"use client";

import { useEffect, useMemo, useState } from "react";
import { Fuel, Gauge, Loader2, Plus, Search, Trash2, Truck, Wrench } from "lucide-react";
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

type Asset = {
  id: string;
  name?: string;
  type?: string;
  assetTag?: string;
  location?: string;
  operatingHours?: string | number;
  fuelLevel?: string | number;
  status?: string;
  nextService?: string;
  siteId?: string;
  createdBy?: string;
};

type Draft = {
  site: string;
  name: string;
  type: string;
  assetTag: string;
  location: string;
  operatingHours: string;
  fuelLevel: string;
  status: string;
  nextService: string;
};

const STATUSES = ["healthy", "service_due", "down"] as const;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  healthy: { label: "Healthy", cls: "bg-chart-3/15 text-chart-3" },
  service_due: { label: "Service due", cls: "bg-chart-4/15 text-chart-4" },
  down: { label: "Down", cls: "bg-destructive/15 text-destructive" },
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const emptyDraft: Draft = {
  site: "",
  name: "",
  type: "",
  assetTag: "",
  location: "",
  operatingHours: "",
  fuelLevel: "",
  status: "healthy",
  nextService: "",
};

export default function EquipmentPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Asset>("equipment", app.asSession());
      data.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setRows(data);
    } catch {
      toast.error("Could not load the fleet");
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
      [r.name, r.type, r.assetTag, r.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const operational = rows.filter((r) => (r.status || "healthy") === "healthy").length;
    const critical = rows.filter((r) => r.status === "service_due" || r.status === "down").length;
    return { total: rows.length, operational, critical };
  }, [rows]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.name.trim()) return toast.error("Enter an equipment name");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then add equipment"
          : "Pick a site / project for this asset"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "equipment",
        {
          name: form.name.trim(),
          type: form.type.trim() || null,
          assetTag: form.assetTag.trim() || null,
          location: form.location.trim() || null,
          operatingHours: num(form.operatingHours),
          fuelLevel: form.fuelLevel === "" ? null : clampPct(num(form.fuelLevel)),
          status: form.status,
          nextService: form.nextService.trim() || null,
        },
        app.asSession(),
        siteId
      );
      toast.success("Equipment added");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  // Cycle Healthy → Service due → Down → Healthy in one tap.
  async function cycleStatus(a: Asset) {
    const cur = (a.status || "healthy") as (typeof STATUSES)[number];
    const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length];
    try {
      await updateScoped("equipment", a.id, { status: next }, app.asSession());
      setRows((r) => r.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
    } catch {
      toast.error("Could not update status");
    }
  }

  async function remove(a: Asset) {
    if (!window.confirm(`Remove ${a.name} from the fleet?`)) return;
    try {
      await removeScoped("equipment", a.id);
      setRows((r) => r.filter((x) => x.id !== a.id));
      toast.success("Equipment removed");
    } catch {
      toast.error("Could not remove");
    }
  }

  const canUpdate = perms.can("equipment", "update");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fleet &amp; plant — {rows.length} asset{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fleet"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("equipment", "create") ? (
            <AssetSheet
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
            <div className="text-xs text-muted-foreground">Assets</div>
            <div className="mt-1 text-xl font-semibold">{stats.total}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Operational</div>
            <div className="mt-1 text-xl font-semibold text-chart-3">{stats.operational}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Needs service</div>
            <div className={`mt-1 text-xl font-semibold ${stats.critical > 0 ? "text-destructive" : ""}`}>
              {stats.critical}
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
              <Truck className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No equipment yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add plant and machinery to track operating hours and maintenance.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const st = STATUS_META[a.status || "healthy"] ?? STATUS_META.healthy;
            const hours = num(a.operatingHours);
            const fuel = a.fuelLevel == null || a.fuelLevel === "" ? null : clampPct(num(a.fuelLevel));
            return (
              <div key={a.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("equipment", "delete") ? (
                  <button
                    onClick={() => remove(a)}
                    aria-label="Remove"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start gap-3 pr-7">
                  <span className="glass-subtle grid size-11 shrink-0 place-items-center rounded-2xl">
                    <Truck className="size-5 text-chart-1" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.type || "—"}
                      {a.location ? ` · ${a.location}` : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={canUpdate ? () => cycleStatus(a) : undefined}
                    disabled={!canUpdate}
                    title={canUpdate ? "Tap to change status" : undefined}
                    className={canUpdate ? "cursor-pointer" : "cursor-default"}
                  >
                    <Badge variant="secondary" className={st.cls}>
                      {st.label}
                    </Badge>
                  </button>
                  {a.assetTag ? (
                    <span className="ml-auto text-[11px] text-muted-foreground">{a.assetTag}</span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {hours > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <Gauge className="size-3.5" /> {hours.toLocaleString()} hrs
                    </div>
                  ) : null}
                  {fuel != null ? (
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <Fuel className="size-3.5" /> Fuel {fuel}%
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${fuel <= 20 ? "bg-destructive" : "bg-chart-3"}`}
                          style={{ width: `${fuel}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {a.nextService ? (
                    <div className="flex items-center gap-1.5">
                      <Wrench className="size-3.5" /> Next service: {a.nextService}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssetSheet({
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
          <Plus className="size-4" /> Add equipment
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add equipment</SheetTitle>
          <SheetDescription>Plant or machinery on this site.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="eq-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="eq-site"
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
          <Field label="Equipment name *" htmlFor="eq-name">
            <Input
              id="eq-name"
              value={form.name}
              onChange={set("name")}
              placeholder="Caterpillar 320 Excavator"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type" htmlFor="eq-type">
              <Input
                id="eq-type"
                value={form.type}
                onChange={set("type")}
                placeholder="Excavator, Crane…"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Asset tag" htmlFor="eq-tag">
              <Input
                id="eq-tag"
                value={form.assetTag}
                onChange={set("assetTag")}
                placeholder="EX-320-01"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Location / zone" htmlFor="eq-location">
            <Input
              id="eq-location"
              value={form.location}
              onChange={set("location")}
              placeholder="Zone A – Foundation"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Operating hours" htmlFor="eq-hours">
              <Input
                id="eq-hours"
                type="number"
                value={form.operatingHours}
                onChange={set("operatingHours")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Fuel level (%)" htmlFor="eq-fuel">
              <Input
                id="eq-fuel"
                type="number"
                value={form.fuelLevel}
                onChange={set("fuelLevel")}
                placeholder="0–100"
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
          <Field label="Next service" htmlFor="eq-service" hint="Date or milestone, e.g. 24 Oct or 5,000 hrs">
            <Input
              id="eq-service"
              value={form.nextService}
              onChange={set("nextService")}
              placeholder="24 Oct"
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save equipment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
