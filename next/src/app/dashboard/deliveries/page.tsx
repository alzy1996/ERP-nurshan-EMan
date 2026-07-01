"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Loader2, PackageCheck, Plus, Search, Trash2, Truck } from "lucide-react";
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

type Delivery = {
  id: string;
  material?: string;
  supplier?: string;
  poNumber?: string;
  quantity?: string | number;
  unit?: string;
  eta?: string;
  vehicle?: string;
  driver?: string;
  status?: string;
  receivedBy?: string;
  siteId?: string;
  createdBy?: string;
};

type Draft = {
  site: string;
  material: string;
  supplier: string;
  poNumber: string;
  quantity: string;
  unit: string;
  eta: string;
  vehicle: string;
  driver: string;
  status: string;
};

const FLOW = ["scheduled", "in_transit", "arrived", "received"] as const;

const STATUS_META: Record<
  string,
  { label: string; cls: string; next?: string; action?: string }
> = {
  scheduled: { label: "Scheduled", cls: "bg-muted text-muted-foreground", next: "in_transit", action: "Dispatch" },
  in_transit: { label: "In transit", cls: "bg-chart-1/15 text-chart-1", next: "arrived", action: "Mark arrived" },
  arrived: { label: "Arrived", cls: "bg-chart-4/15 text-chart-4", next: "received", action: "Confirm receipt" },
  received: { label: "Received", cls: "bg-chart-3/15 text-chart-3" },
};

const emptyDraft: Draft = {
  site: "",
  material: "",
  supplier: "",
  poNumber: "",
  quantity: "",
  unit: "",
  eta: "",
  vehicle: "",
  driver: "",
  status: "scheduled",
};

export default function DeliveriesPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Delivery>("deliveries", app.asSession());
      // Open deliveries first, then by ETA.
      data.sort(
        (a, b) =>
          FLOW.indexOf((a.status || "scheduled") as (typeof FLOW)[number]) -
            FLOW.indexOf((b.status || "scheduled") as (typeof FLOW)[number]) ||
          String(a.eta || "").localeCompare(String(b.eta || ""))
      );
      setRows(data);
    } catch {
      toast.error("Could not load deliveries");
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
      [r.material, r.supplier, r.poNumber, r.vehicle, r.driver]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const inTransit = rows.filter((r) => r.status === "in_transit").length;
    const awaiting = rows.filter((r) => r.status === "arrived").length;
    const received = rows.filter((r) => r.status === "received").length;
    return { inTransit, awaiting, received };
  }, [rows]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.material.trim()) return toast.error("Enter the material / item");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then log a delivery"
          : "Pick a site / project for this delivery"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "deliveries",
        {
          material: form.material.trim(),
          supplier: form.supplier.trim() || null,
          poNumber: form.poNumber.trim() || null,
          quantity: Number(form.quantity) || null,
          unit: form.unit.trim() || null,
          eta: form.eta || null,
          vehicle: form.vehicle.trim() || null,
          driver: form.driver.trim() || null,
          status: form.status,
        },
        app.asSession(),
        siteId
      );
      toast.success("Delivery logged");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  // Advance one step through scheduled → in_transit → arrived → received.
  async function advance(d: Delivery) {
    const cur = STATUS_META[d.status || "scheduled"];
    if (!cur?.next) return;
    const patch: Record<string, unknown> = { status: cur.next };
    if (cur.next === "received") patch.receivedBy = app.session?.name || "—";
    try {
      await updateScoped("deliveries", d.id, patch, app.asSession());
      setRows((r) => r.map((x) => (x.id === d.id ? { ...x, ...patch } : x)));
      toast.success(cur.next === "received" ? "Receipt confirmed" : "Delivery updated");
    } catch {
      toast.error("Could not update delivery");
    }
  }

  async function remove(d: Delivery) {
    if (!window.confirm("Delete this delivery?")) return;
    try {
      await removeScoped("deliveries", d.id);
      setRows((r) => r.filter((x) => x.id !== d.id));
      toast.success("Delivery deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  const canUpdate = perms.can("deliveries", "update");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deliveries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Material delivery tracker — {rows.length} delivery{rows.length === 1 ? "" : "ies"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search deliveries"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("deliveries", "create") ? (
            <DeliverySheet
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
            <div className="text-xs text-muted-foreground">In transit</div>
            <div className="mt-1 text-xl font-semibold text-chart-1">{stats.inTransit}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Awaiting receipt</div>
            <div className={`mt-1 text-xl font-semibold ${stats.awaiting > 0 ? "text-chart-4" : ""}`}>
              {stats.awaiting}
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Received</div>
            <div className="mt-1 text-xl font-semibold text-chart-3">{stats.received}</div>
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
              <PackageCheck className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No deliveries tracked yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Log an inbound delivery to track it from dispatch to site receipt.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const st = STATUS_META[d.status || "scheduled"] ?? STATUS_META.scheduled;
            const qty = Number(d.quantity) || 0;
            return (
              <div key={d.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("deliveries", "delete") ? (
                  <button
                    onClick={() => remove(d)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start justify-between gap-3 pr-7">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{d.material}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {d.supplier || "—"}
                      {qty > 0 ? ` · ${qty}${d.unit ? ` ${d.unit}` : ""}` : ""}
                      {d.poNumber ? ` · ${d.poNumber}` : ""}
                    </div>
                  </div>
                  <Badge variant="secondary" className={`shrink-0 ${st.cls}`}>
                    {st.label}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {d.eta ? (
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" /> ETA {d.eta}
                    </span>
                  ) : null}
                  {d.vehicle || d.driver ? (
                    <span className="flex items-center gap-1.5">
                      <Truck className="size-3.5" />
                      {[d.vehicle, d.driver].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                  {d.status === "received" && d.receivedBy ? (
                    <span className="text-chart-3">Received by {d.receivedBy}</span>
                  ) : null}
                </div>

                {canUpdate && st.next ? (
                  <button
                    onClick={() => advance(d)}
                    className="mt-3 flex items-center gap-1 rounded-lg bg-chart-1/15 px-3 py-1.5 text-xs font-semibold text-chart-1 transition hover:bg-chart-1/25"
                  >
                    {st.action} <ArrowRight className="size-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeliverySheet({
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
          <Plus className="size-4" /> Log delivery
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Log a delivery</SheetTitle>
          <SheetDescription>Track an inbound material delivery to site.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="dl-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="dl-site"
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
          <Field label="Material / item *" htmlFor="dl-material">
            <Input
              id="dl-material"
              value={form.material}
              onChange={set("material")}
              placeholder="Grade A Rebar (50t)"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier" htmlFor="dl-supplier">
              <Input
                id="dl-supplier"
                value={form.supplier}
                onChange={set("supplier")}
                placeholder="Titan Steel Co."
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="PO number" htmlFor="dl-po">
              <Input
                id="dl-po"
                value={form.poNumber}
                onChange={set("poNumber")}
                placeholder="PO-2023-0892"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" htmlFor="dl-qty">
              <Input
                id="dl-qty"
                type="number"
                value={form.quantity}
                onChange={set("quantity")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Unit" htmlFor="dl-unit">
              <Input
                id="dl-unit"
                value={form.unit}
                onChange={set("unit")}
                placeholder="ton, pcs…"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="ETA" htmlFor="dl-eta">
            <Input
              id="dl-eta"
              type="date"
              value={form.eta}
              onChange={set("eta")}
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle" htmlFor="dl-vehicle">
              <Input
                id="dl-vehicle"
                value={form.vehicle}
                onChange={set("vehicle")}
                placeholder="Truck / plate"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Driver" htmlFor="dl-driver">
              <Input
                id="dl-driver"
                value={form.driver}
                onChange={set("driver")}
                placeholder="Driver name"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Status">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {FLOW.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onField("status", s)}
                  className={`flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition ${
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save delivery"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
