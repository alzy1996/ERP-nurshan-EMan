"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Printer, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/field";

type POItem = { desc: string; unit: string; qty: number; unitPrice: number; lineTotal: number };
type PO = {
  id: string;
  poNumber?: string;
  supplier?: string;
  status?: string;
  paymentTerms?: string;
  deliveryPeriod?: string;
  notes?: string;
  items?: POItem[];
  subtotal?: number;
  vat?: number;
  total?: number;
  fromPrId?: string;
  fromPrDesc?: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  issued: { label: "Issued", cls: "bg-chart-1/15 text-chart-1" },
  received: { label: "Received", cls: "bg-chart-3/15 text-chart-3" },
};

const fmt = (n: number) => `${(n || 0).toFixed(3)} OMR`;
const emptyItem = (): POItem => ({ desc: "", unit: "", qty: 0, unitPrice: 0, lineTotal: 0 });
const NO_SUPPLIER = "__none__";

function printPO(po: PO) {
  const w = window.open("", "_blank", "width=820,height=920");
  if (!w) return;
  const rows = (po.items || [])
    .map(
      (it) =>
        `<tr><td>${it.desc}</td><td>${it.unit}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${(it.unitPrice || 0).toFixed(3)}</td><td style="text-align:right">${(it.lineTotal || 0).toFixed(3)}</td></tr>`
    )
    .join("");
  w.document.write(
    `<html><head><title>${po.poNumber || "PO"}</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}.tot{margin-top:16px;text-align:right;font-size:14px}.tot b{font-size:18px}</style></head><body><h1>Purchase Order ${po.poNumber || ""}</h1><div>Supplier: ${po.supplier || "—"} &nbsp;•&nbsp; Terms: ${po.paymentTerms || "—"} &nbsp;•&nbsp; Delivery: ${po.deliveryPeriod || "—"}</div><table><thead><tr><th>Description</th><th>Unit</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>${rows}</tbody></table><div class="tot">Subtotal: ${(po.subtotal || 0).toFixed(3)} OMR<br/>VAT 5%: ${(po.vat || 0).toFixed(3)} OMR<br/><b>Total: ${(po.total || 0).toFixed(3)} OMR</b></div><div style="margin-top:16px;color:#666">${po.notes || ""}</div></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}

export default function PurchaseOrdersPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  // Sheet form state
  const [poNumber, setPoNumber] = useState(`PO-${Date.now()}`);
  const [supplier, setSupplier] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryPeriod, setDeliveryPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([emptyItem()]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const session = app.asSession();
      const [data, sups] = await Promise.all([
        fetchScoped<PO>("purchase_orders", session),
        fetchScoped<{ name?: string }>("suppliers", session),
      ]);
      setRows(data.sort((a, b) => (b.poNumber || "").localeCompare(a.poNumber || "")));
      setSuppliers(
        sups
          .map((s) => ({ id: s.id, name: (s.name || "").trim() }))
          .filter((s) => s.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      toast.error("Could not load purchase orders");
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
      [r.poNumber, r.supplier]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const computed = useMemo(
    () => items.map((it) => ({ ...it, lineTotal: (it.qty || 0) * (it.unitPrice || 0) })),
    [items]
  );
  const subtotal = useMemo(() => computed.reduce((s, it) => s + it.lineTotal, 0), [computed]);
  const vat = subtotal * 0.05;
  const total = subtotal + vat;

  function setItem(i: number, key: keyof POItem, value: string) {
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== i) return it;
        const next: POItem =
          key === "qty" || key === "unitPrice"
            ? { ...it, [key]: Number(value) || 0 }
            : { ...it, [key]: value };
        next.lineTotal = (next.qty || 0) * (next.unitPrice || 0);
        return next;
      })
    );
  }

  function addLine() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeLine(i: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function resetForm() {
    setPoNumber(`PO-${Date.now()}`);
    setSupplier("");
    setPaymentTerms("");
    setDeliveryPeriod("");
    setNotes("");
    setItems([emptyItem()]);
  }

  async function save() {
    if (!poNumber.trim()) return toast.error("Enter a PO number");
    const validItems = computed.filter((it) => it.desc.trim());
    if (validItems.length === 0) return toast.error("Add at least one line item with a description");
    setSaving(true);
    try {
      await addScoped(
        "purchase_orders",
        {
          poNumber,
          supplier,
          paymentTerms,
          deliveryPeriod,
          notes,
          status: "draft",
          items: validItems,
          subtotal,
          vat,
          total,
        },
        app.asSession(),
        app.resolveSite()
      );
      toast.success(`${poNumber} saved`);
      setOpen(false);
      resetForm();
      await load();
    } catch {
      toast.error("Could not save purchase order");
    } finally {
      setSaving(false);
    }
  }

  async function remove(po: PO) {
    if (!window.confirm(`Delete purchase order "${po.poNumber}"?`)) return;
    try {
      await removeScoped("purchase_orders", po.id);
      setRows((r) => r.filter((x) => x.id !== po.id));
      toast.success("Purchase order deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} PO{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search POs"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("purchase_orders", "create") ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="glassPrimary" className="rounded-full">
                <Plus className="size-4" /> New PO
              </Button>
            </SheetTrigger>
            <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>New purchase order</SheetTitle>
                <SheetDescription>Line items, terms and live VAT.</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-4">
                {/* Header fields */}
                <section className="grid grid-cols-2 gap-3">
                  <Field label="PO number *" htmlFor="poNumber">
                    <Input
                      id="poNumber"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      placeholder="PO-…"
                      className="glass-subtle rounded-xl border-0"
                    />
                  </Field>
                  <Field
                    label="Supplier"
                    hint={
                      suppliers.length === 0
                        ? "No suppliers yet — you can still save this PO"
                        : "Optional — pick from your suppliers"
                    }
                  >
                    {suppliers.length === 0 ? (
                      <div className="glass-subtle rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
                        No suppliers available
                      </div>
                    ) : (
                      <Select
                        value={supplier ? supplier : NO_SUPPLIER}
                        onValueChange={(v) => setSupplier(v === NO_SUPPLIER ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_SUPPLIER}>— No supplier —</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </Field>
                  <Field label="Payment terms" htmlFor="paymentTerms">
                    <Input
                      id="paymentTerms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="Net 30"
                      className="glass-subtle rounded-xl border-0"
                    />
                  </Field>
                  <Field label="Delivery period" htmlFor="deliveryPeriod">
                    <Input
                      id="deliveryPeriod"
                      value={deliveryPeriod}
                      onChange={(e) => setDeliveryPeriod(e.target.value)}
                      placeholder="2 weeks"
                      className="glass-subtle rounded-xl border-0"
                    />
                  </Field>
                  <Field label="Notes" htmlFor="notes" className="col-span-2">
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Internal notes…"
                    />
                  </Field>
                </section>

                {/* Line items */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Line items
                    </h3>
                    <Button variant="glass" size="sm" className="rounded-full" onClick={addLine}>
                      <Plus className="size-3.5" /> Add line
                    </Button>
                  </div>

                  <div className="grid grid-cols-[1fr_4.5rem_4rem_5.5rem_5.5rem_1.75rem] items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    <span>Description</span>
                    <span>Unit</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Price</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>

                  <div className="space-y-2">
                    {computed.map((it, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_4.5rem_4rem_5.5rem_5.5rem_1.75rem] items-center gap-2"
                      >
                        <Input
                          value={it.desc}
                          onChange={(e) => setItem(i, "desc", e.target.value)}
                          placeholder="Item description"
                          className="glass-subtle rounded-xl border-0"
                        />
                        <Input
                          value={it.unit}
                          onChange={(e) => setItem(i, "unit", e.target.value)}
                          placeholder="ea"
                          className="glass-subtle rounded-xl border-0"
                        />
                        <Input
                          type="number"
                          value={it.qty || ""}
                          onChange={(e) => setItem(i, "qty", e.target.value)}
                          placeholder="0"
                          className="glass-subtle rounded-xl border-0 text-right"
                        />
                        <Input
                          type="number"
                          value={it.unitPrice || ""}
                          onChange={(e) => setItem(i, "unitPrice", e.target.value)}
                          placeholder="0.000"
                          className="glass-subtle rounded-xl border-0 text-right"
                        />
                        <span className="text-right text-sm tabular-nums">
                          {it.lineTotal.toFixed(3)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          aria-label="Remove line"
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="glass-subtle ml-auto mt-2 w-full max-w-xs space-y-1.5 rounded-2xl p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">{fmt(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">VAT 5%</span>
                      <span className="tabular-nums">{fmt(vat)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-1.5">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold tabular-nums">{fmt(total)}</span>
                    </div>
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
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Save PO"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          ) : null}
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
              <ShoppingCart className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No purchase orders yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first PO to send to a supplier and track delivery.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((po) => {
            const status = STATUS[po.status || "draft"] ?? STATUS.draft;
            return (
              <div key={po.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("purchase_orders", "delete") ? (
                  <button
                    onClick={() => remove(po)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}

                <div className="min-w-0 pr-7">
                  <div className="truncate font-semibold">{po.poNumber || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{po.supplier || "—"}</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge className={status.cls} variant="secondary">
                    {status.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {(po.items?.length || 0)} item{(po.items?.length || 0) === 1 ? "" : "s"}
                  </span>
                </div>

                {po.fromPrId ? (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-chart-1/10 px-2 py-0.5 text-[11px] font-medium text-chart-1">
                    From request: {po.fromPrDesc || po.fromPrId}
                  </div>
                ) : null}

                <div className="mt-4 flex items-end justify-between gap-2">
                  <span className="text-base font-bold tabular-nums">{fmt(po.total || 0)}</span>
                  <Button
                    variant="glass"
                    size="sm"
                    className="rounded-full"
                    onClick={() => printPO(po)}
                  >
                    <Printer className="size-3.5" /> Print
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
