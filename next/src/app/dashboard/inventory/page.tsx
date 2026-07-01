"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Loader2,
  PackageMinus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  TrendingDown,
} from "lucide-react";
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

type Item = {
  id: string;
  name?: string;
  sku?: string;
  category?: string;
  unit?: string;
  stock?: string | number;
  reorder?: string | number;
  unitCost?: string | number;
  location?: string;
  siteId?: string;
  createdBy?: string;
};

type Draft = {
  site: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: string;
  reorder: string;
  unitCost: string;
  location: string;
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const fmtOMR = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })} OMR`;

const emptyDraft: Draft = {
  site: "",
  name: "",
  sku: "",
  category: "",
  unit: "",
  stock: "",
  reorder: "",
  unitCost: "",
  location: "",
};

function isLow(i: Item) {
  const r = num(i.reorder);
  return r > 0 && num(i.stock) <= r;
}

export default function InventoryPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Item>("inventory", app.asSession());
      data.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      setRows(data);
    } catch {
      toast.error("Could not load inventory");
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
      [r.name, r.sku, r.category, r.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const low = rows.filter(isLow).length;
    const value = rows.reduce((sum, i) => sum + num(i.stock) * num(i.unitCost), 0);
    return { total: rows.length, low, value };
  }, [rows]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.name.trim()) return toast.error("Enter an item name");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then add stock"
          : "Pick a site / project for this item"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "inventory",
        {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          category: form.category.trim() || null,
          unit: form.unit.trim() || null,
          stock: num(form.stock),
          reorder: num(form.reorder),
          unitCost: num(form.unitCost),
          location: form.location.trim() || null,
        },
        app.asSession(),
        siteId
      );
      toast.success("Item added");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save item — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  // Stock movement: add (received) or remove (issued). Keeps the running level
  // on the item so low-stock alerts stay live.
  async function adjust(item: Item, sign: 1 | -1) {
    const label = sign > 0 ? "received (stock in)" : "issued (stock out)";
    const raw = window.prompt(`Quantity ${label}`, "");
    if (raw == null) return;
    const qty = num(raw);
    if (qty <= 0) return toast.error("Enter a valid quantity");
    const next = Math.max(0, num(item.stock) + sign * qty);
    try {
      await updateScoped("inventory", item.id, { stock: next }, app.asSession());
      setRows((r) => r.map((x) => (x.id === item.id ? { ...x, stock: next } : x)));
      toast.success(sign > 0 ? `+${qty} in` : `-${qty} out`);
    } catch {
      toast.error("Could not update stock");
    }
  }

  async function remove(item: Item) {
    if (!window.confirm("Delete this inventory item?")) return;
    try {
      await removeScoped("inventory", item.id);
      setRows((r) => r.filter((x) => x.id !== item.id));
      toast.success("Item deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  const canUpdate = perms.can("inventory", "update");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock on hand — {rows.length} item{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search items"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("inventory", "create") ? (
            <ItemSheet
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

      {/* Summary */}
      {rows.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Items</div>
            <div className="mt-1 text-xl font-semibold">{stats.total}</div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Low stock</div>
            <div
              className={`mt-1 text-xl font-semibold ${stats.low > 0 ? "text-destructive" : ""}`}
            >
              {stats.low}
            </div>
          </div>
          <div className="glass-subtle rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Stock value</div>
            <div className="mt-1 truncate text-xl font-semibold">{fmtOMR(stats.value)}</div>
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
              <Boxes className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No inventory yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add materials and equipment to track stock levels and low-stock alerts.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((i) => {
            const stock = num(i.stock);
            const reorder = num(i.reorder);
            const low = isLow(i);
            return (
              <div key={i.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("inventory", "delete") ? (
                  <button
                    onClick={() => remove(i)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start justify-between gap-3 pr-7">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{i.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {i.sku ? `${i.sku} · ` : ""}
                      {i.category || "Uncategorised"}
                      {i.location ? ` · ${i.location}` : ""}
                    </div>
                  </div>
                  {low ? (
                    <Badge variant="secondary" className="gap-1 bg-destructive/15 text-destructive">
                      <TrendingDown className="size-3" /> Low
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold leading-none">
                      {stock.toLocaleString()}
                      {i.unit ? <span className="ml-1 text-sm text-muted-foreground">{i.unit}</span> : null}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {reorder > 0 ? `Reorder at ${reorder.toLocaleString()}` : "No reorder level"}
                      {num(i.unitCost) > 0 ? ` · ${fmtOMR(num(i.unitCost))}/unit` : ""}
                    </div>
                  </div>
                  {canUpdate ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => adjust(i, 1)}
                        aria-label="Stock in"
                        title="Stock in"
                        className="grid size-9 place-items-center rounded-xl bg-chart-3/15 text-chart-3 transition hover:bg-chart-3/25"
                      >
                        <PackagePlus className="size-4" />
                      </button>
                      <button
                        onClick={() => adjust(i, -1)}
                        aria-label="Stock out"
                        title="Stock out"
                        className="grid size-9 place-items-center rounded-xl bg-chart-4/15 text-chart-4 transition hover:bg-chart-4/25"
                      >
                        <PackageMinus className="size-4" />
                      </button>
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

function ItemSheet({
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
  set: (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  sites: { id: string; name?: string }[];
  onSite: (id: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> New item
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New inventory item</SheetTitle>
          <SheetDescription>Track stock on hand and set a low-stock reorder level.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="inv-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="inv-site"
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
          <Field label="Item name *" htmlFor="inv-name">
            <Input
              id="inv-name"
              value={form.name}
              onChange={set("name")}
              placeholder="Ready-mix concrete C30"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU / code" htmlFor="inv-sku">
              <Input
                id="inv-sku"
                value={form.sku}
                onChange={set("sku")}
                placeholder="CON-C30"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Category" htmlFor="inv-category">
              <Input
                id="inv-category"
                value={form.category}
                onChange={set("category")}
                placeholder="Concrete"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening stock" htmlFor="inv-stock">
              <Input
                id="inv-stock"
                type="number"
                value={form.stock}
                onChange={set("stock")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Unit" htmlFor="inv-unit">
              <Input
                id="inv-unit"
                value={form.unit}
                onChange={set("unit")}
                placeholder="m³, ton, pcs…"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reorder level" htmlFor="inv-reorder">
              <Input
                id="inv-reorder"
                type="number"
                value={form.reorder}
                onChange={set("reorder")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Unit cost (OMR)" htmlFor="inv-cost">
              <Input
                id="inv-cost"
                type="number"
                value={form.unitCost}
                onChange={set("unitCost")}
                placeholder="0.000"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Location / store" htmlFor="inv-location">
            <Input
              id="inv-location"
              value={form.location}
              onChange={set("location")}
              placeholder="Main store, Zone A…"
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save item"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
