"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, Package, Plus, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
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

type Material = {
  id: string;
  name?: string;
  cat?: string;
  unit?: string;
  price?: number;
  stock?: number;
  reorder?: number;
  supplier?: string;
};

type Draft = Record<string, string>;

const FIELDS: { key: string; label: string; placeholder?: string; type?: string; required?: boolean; full?: boolean }[] = [
  { key: "name", label: "Material name", placeholder: "Bitumen 60/70", required: true, full: true },
  { key: "cat", label: "Category", placeholder: "Bitumen, Fuel, Stone…" },
  { key: "unit", label: "Unit", placeholder: "ton, m³, bag" },
  { key: "price", label: "Price (OMR)", placeholder: "0.000", type: "number" },
  { key: "stock", label: "Stock", placeholder: "0", type: "number" },
  { key: "reorder", label: "Reorder level", placeholder: "0", type: "number" },
  { key: "supplier", label: "Supplier", placeholder: "BRIGHT LIGHT Trading", full: true },
];

const emptyDraft: Draft = { name: "", cat: "", unit: "", price: "", stock: "", reorder: "", supplier: "" };

type Level = { label: string; barCls: string; badgeCls: string; pct: number };

function stockLevel(m: Material): Level {
  const stock = Number(m.stock) || 0;
  const reorder = Number(m.reorder) || 0;
  const pct = reorder > 0 ? Math.min(100, (stock / reorder) * 100) : 100;
  if (stock < reorder)
    return { label: "Critical", barCls: "bg-destructive", badgeCls: "bg-destructive/15 text-destructive", pct };
  if (stock < reorder * 1.4)
    return { label: "Low", barCls: "bg-chart-4", badgeCls: "bg-chart-4/15 text-chart-4", pct };
  return { label: "OK", barCls: "bg-chart-3", badgeCls: "bg-chart-3/15 text-chart-3", pct };
}

export default function MaterialsPage() {
  const app = useApp();
  const [rows, setRows] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Material>("materials", app.asSession());
      setRows(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch {
      toast.error("Could not load materials");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.name, r.cat, r.supplier]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!String(form.name || "").trim()) return toast.error("Enter a material name");
    setSaving(true);
    try {
      await addScoped(
        "materials",
        {
          ...form,
          price: Number(form.price) || 0,
          stock: Number(form.stock) || 0,
          reorder: Number(form.reorder) || 0,
        },
        app.asSession(),
        app.resolveSite()
      );
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save material");
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: Material) {
    if (!window.confirm(`Delete material "${m.name}"?`)) return;
    try {
      await removeScoped("materials", m.id);
      setRows((r) => r.filter((x) => x.id !== m.id));
      toast.success("Material deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} material{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search materials"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <MaterialSheet
            open={open}
            setOpen={setOpen}
            form={form}
            set={set}
            saving={saving}
            onSave={save}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-20 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <Boxes className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No materials yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first material to track pricing and stock levels.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const lv = stockLevel(m);
            return (
              <div key={m.id} className="glass glass-specular group relative rounded-3xl p-5">
                <button
                  onClick={() => remove(m)}
                  aria-label="Delete"
                  className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <Package className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {(m.cat || "—")} · {m.unit || "—"}
                    </div>
                  </div>
                  <Badge className={`${lv.badgeCls} ml-auto`} variant="secondary">
                    {lv.label}
                  </Badge>
                </div>

                <div className="mt-3 text-base font-semibold">
                  {(Number(m.price) || 0).toFixed(3)}{" "}
                  <span className="text-xs font-medium text-muted-foreground">
                    OMR/{m.unit || "unit"}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Stock {(Number(m.stock) || 0).toLocaleString()}</span>
                    <span>reorder {Number(m.reorder) || 0}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${lv.barCls}`} style={{ width: `${lv.pct}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="size-3.5" /> {m.supplier || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MaterialSheet({
  open,
  setOpen,
  form,
  set,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  set: (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Add material
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New material</SheetTitle>
          <SheetDescription>Pricing, stock and reorder levels.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={f.required ? `${f.label} *` : f.label}
                  htmlFor={f.key}
                  className={f.full ? "col-span-2" : ""}
                >
                  <Input
                    id={f.key}
                    type={f.type ?? "text"}
                    value={String(form[f.key] ?? "")}
                    onChange={set(f.key)}
                    placeholder={f.placeholder}
                    className="glass-subtle rounded-xl border-0"
                  />
                </Field>
              ))}
            </div>
          </section>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save material"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
